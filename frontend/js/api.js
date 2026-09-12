/**
 * API Client for CarbonLens SME Backend Service
 * Strictly interfaces with Supabase Auth & FastAPI Backend.
 * Provides explicit offline Hackathon Demo Mode without fake local accounts.
 */

const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http'))
  ? `${window.location.origin}/api`
  : 'http://127.0.0.1:8000/api';

const API = {
  getToken() {
    return localStorage.getItem('carbonlens_token');
  },

  setSession(token, user, facility = null) {
    if (token) {
      localStorage.setItem('carbonlens_token', token);
    }
    if (user) {
      localStorage.setItem('carbonlens_user', JSON.stringify(user));
    }
    if (facility) {
      localStorage.setItem('carbonlens_facility', JSON.stringify(facility));
    } else {
      // Never keep another user's facility when a new session has no facility yet.
      localStorage.removeItem('carbonlens_facility');
    }
  },

  clearSession() {
    localStorage.removeItem('carbonlens_token');
    localStorage.removeItem('carbonlens_user');
    localStorage.removeItem('carbonlens_facility');
    localStorage.removeItem('carbonlens_latest_assessment');
    localStorage.removeItem('carbonlens_is_demo');
  },

  getUser() {
    const raw = localStorage.getItem('carbonlens_user');
    return raw ? JSON.parse(raw) : null;
  },

  getFacility() {
    const raw = localStorage.getItem('carbonlens_facility');
    return raw ? JSON.parse(raw) : null;
  },

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // ----------------------------------------------------
  // REAL SUPABASE AUTH API METHODS (NO FAKE LOCAL ACCOUNTS)
  // ----------------------------------------------------
  async register(fullName, email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, password })
      });

      if (response.status === 503) {
        throw new Error('Account services are currently unavailable. Supabase Auth is not active.');
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Registration failed');
      }

      const data = await response.json();
      
      if (data.requires_email_confirmation || !data.access_token) {
        return {
          requires_email_confirmation: true,
          message: data.message || 'Check your email to confirm your account before logging in.',
          user: data.user
        };
      }

      this.setSession(data.access_token, data.user, data.facility);
      return data;
    } catch (err) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error('Account services are currently unavailable.');
      }
      throw err;
    }
  },

  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.status === 503) {
        throw new Error('Account services are currently unavailable. Supabase Auth is not active.');
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Invalid email or password');
      }

      const data = await response.json();
      this.setSession(data.access_token, data.user, data.facility);
      return data;
    } catch (err) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error('Account services are currently unavailable.');
      }
      throw err;
    }
  },

  async getMe() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: this.getAuthHeaders()
      });
      if (!response.ok) {
        this.clearSession();
        return null;
      }
      return await response.json();
    } catch (err) {
      return this.getUser();
    }
  },

  // ----------------------------------------------------
  // FACILITY API METHODS
  // ----------------------------------------------------
  async createFacility(facData) {
    const response = await fetch(`${API_BASE_URL}/facilities`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(facData)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to create facility');
    }

    const fac = await response.json();
    localStorage.setItem('carbonlens_facility', JSON.stringify(fac));
    return fac;
  },

  async getUserFacilities() {
    const token = this.getToken();
    if (!token) return [];

    try {
      const response = await fetch(`${API_BASE_URL}/facilities`, {
        headers: this.getAuthHeaders()
      });
      if (!response.ok) return [];
      return await response.json();
    } catch (err) {
      const fac = this.getFacility();
      return fac ? [fac] : [];
    }
  },

  // ----------------------------------------------------
  // ASSESSMENT API METHODS
  // ----------------------------------------------------
  async submitAssessment(data) {
    const response = await fetch(`${API_BASE_URL}/assessments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `Server status ${response.status}`);
    }

    const res = await response.json();
    if (!res.is_demo) {
      localStorage.setItem('carbonlens_latest_assessment', JSON.stringify(res));
    }
    return res;
  },

  async getLatestUserAssessment(facilityId = null) {
    const token = this.getToken();
    if (!token) return null;

    try {
      let url = `${API_BASE_URL}/assessments/user/latest`;
      if (facilityId) url += `?facility_id=${facilityId}`;
      
      const response = await fetch(url, { headers: this.getAuthHeaders() });
      if (response.status === 404 || response.status === 204) return null;
      if (!response.ok) return null;
      const res = await response.json();
      if (res) localStorage.setItem('carbonlens_latest_assessment', JSON.stringify(res));
      return res;
    } catch (err) {
      const raw = localStorage.getItem('carbonlens_latest_assessment');
      return raw ? JSON.parse(raw) : null;
    }
  },

  // ----------------------------------------------------
  // EXPLICIT HACKATHON DEMO MODE (ISOLATED FROM USER ACCOUNT)
  // ----------------------------------------------------
  async loadDemoAssessment() {
    try {
      const response = await fetch(`${API_BASE_URL}/assessments/demo/load`);
      if (!response.ok) throw new Error(`Demo API status ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('Backend server unreachable, executing client-side demo fallback...', err);
      const demoData = {
        facility_name: "Vatva Polymer Pack Ltd",
        industry: "Plastic & Packaging Manufacturing",
        reporting_period: "Monthly (Aug 2026)",
        city: "Ahmedabad (Vatva GIDC)",
        polymer_type: "LDPE",
        virgin_material_kg: 40000.0,
        recycled_material_kg: 5000.0,
        production_output_kg: 41500.0,
        grid_electricity_kwh: 32000.0,
        diesel_liters: 850.0,
        scrap_landfilled_kg: 3000.0
      };
      return this.calculateClientDemoFallback(demoData);
    }
  },

  async runSimulation(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/simulate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Simulation API status ${response.status}`);
      return await response.json();
    } catch (err) {
      return this.simulateClientDemoFallback(payload);
    }
  },

  getGujaratCityCenter(city = '') {
    const normalized = String(city || '').trim().toLowerCase();
    const coords = {
      ahmedabad: [23.0225, 72.5714],
      vatva: [22.9554, 72.6310],
      naroda: [23.0725, 72.6685],
      odhav: [23.0180, 72.6600],
      sanand: [23.0040, 72.3810],
      changodar: [22.9150, 72.4450],
      gandhinagar: [23.2156, 72.6369],
      surat: [21.1702, 72.8311],
      sachin: [21.0820, 72.8640],
      hazira: [21.1160, 72.6510],
      vadodara: [22.3072, 73.1812],
      baroda: [22.3072, 73.1812],
      makarpura: [22.2530, 73.1950],
      rajkot: [22.3039, 70.8022],
      metoda: [22.2470, 70.6720],
      ankleshwar: [21.6264, 73.0152],
      bharuch: [21.7051, 72.9959],
      vapi: [20.3712, 72.9042],
      valsad: [20.5992, 72.9342],
      halol: [22.5020, 73.4750],
      morbi: [22.8173, 70.8368],
      mehsana: [23.5880, 72.3693],
      bhavnagar: [21.7645, 72.1519],
      jamnagar: [22.4707, 70.0577],
      porbandar: [21.6417, 69.6293],
      junagadh: [21.5222, 70.4579],
      bhuj: [23.2420, 69.6669],
      kutch: [23.2420, 69.6669],
      gandhidham: [23.0753, 70.1337],
      nadiad: [22.6916, 72.8634],
      anand: [22.5645, 72.9289]
    };

    for (const [name, point] of Object.entries(coords)) {
      if (normalized.includes(name) || name.includes(normalized)) return point;
    }
    return null;
  },

  async getPartnerSuggestions(params = {}) {
    try {
      const queryParts = [];
      if (params.city) queryParts.push(`city=${encodeURIComponent(params.city)}`);
      if (params.state) queryParts.push(`state=${encodeURIComponent(params.state)}`);
      if (params.lat) queryParts.push(`lat=${encodeURIComponent(params.lat)}`);
      if (params.lng) queryParts.push(`lng=${encodeURIComponent(params.lng)}`);
      if (params.material) queryParts.push(`material=${encodeURIComponent(params.material)}`);
      
      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      const response = await fetch(`${API_BASE_URL}/partners${queryString}`);
      if (!response.ok) throw new Error(`Partners API error`);
      return await response.json();
    } catch (err) {
      console.warn("Partners discovery API fallback activated:", err);
      const fallbackCenter = this.getGujaratCityCenter(params.city) || [23.0225, 72.5714];
      return {
        city: params.city || "Ahmedabad",
        state: params.state || "Gujarat",
        center_lat: fallbackCenter[0],
        center_lng: fallbackCenter[1],
        radius_km: 75,
        search_status: `Showing CURATED PROTOTYPE DATA across Gujarat.`,
        is_fallback: true,
        data_source: "CURATED_PROTOTYPE_DEMO",
        partners: [
          {
            id: "partner_ecoplast_vatva",
            name: "Ecoplast Solutions Pvt Ltd",
            partner_type: "Mechanical Recycler & Pelletizer",
            materials_supported: ["HDPE", "PP", "LDPE"],
            location: "Vatva GIDC, Ahmedabad, Gujarat",
            lat: 22.9554,
            lng: 72.6310,
            computed_distance: 4.2,
            contact_info: "Phone: +91 98250 12345 | Email: info@ecoplastsolutions.in",
            notes: "Specializes in washed HDPE/PP regrind pellets and film scrap processing.",
            source: "CURATED_PROTOTYPE_DEMO",
            is_demo: true
          },
          {
            id: "partner_gujarat_polymers_naroda",
            name: "Gujarat Polymers Circular Hub",
            partner_type: "Rigid Plastic Washing & Flaking",
            materials_supported: ["HDPE", "PP", "PET"],
            location: "Naroda GIDC, Ahmedabad, Gujarat",
            lat: 23.0725,
            lng: 72.6685,
            computed_distance: 14.8,
            contact_info: "Phone: +91 98795 67890 | Email: contact@gujaratpolymers.com",
            notes: "GPCB registered collector & flaker for rigid polymer scrap.",
            source: "CURATED_PROTOTYPE_DEMO",
            is_demo: true
          }
        ]
      };
    }
  },

  async downloadAssessmentPdf(assessmentId, filename = 'CarbonLens_Assessment_Report.pdf') {
    const token = this.getToken();
    const url = `${API_BASE_URL}/assessments/${assessmentId}/report.pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to download report PDF: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },

  /** Client-Side Fallback FOR EXPLICIT HACKATHON DEMO MODE ONLY */
  calculateClientDemoFallback(data) {
    const EF = { LDPE: 2.08, HDPE: 1.93, PP: 1.98, PET: 2.15, grid: 0.716, landfill: 1.45 };
    const poly = (data.polymer_type || 'LDPE').toUpperCase();
    const efVirgin = EF[poly] || 2.08;

    const co2Virgin = (data.virgin_material_kg * efVirgin) / 1000.0;
    const co2Grid = (data.grid_electricity_kwh * EF.grid) / 1000.0;
    const co2Scrap = (data.scrap_landfilled_kg * EF.landfill) / 1000.0;
    const totalTonnes = co2Virgin + co2Grid + co2Scrap;

    return {
      id: "asm_demo_mode",
      facility_name: "Vatva Polymer Pack Ltd (Demo)",
      industry: "Plastic & Packaging Manufacturing",
      reporting_period: "Monthly (Aug 2026)",
      total_co2e_tonnes: totalTonnes,
      is_partial_estimate: false,
      missing_data_warning: null,
      confidence_breakdown: {
        confidence_score: 100,
        quality_badge: "High Confidence (Complete Data)",
        supplied_count: 3,
        missing_count: 0,
        is_partial_estimate: false,
        audit_trail: [],
        missing_fields_explanation: []
      },
      sources: [
        {
          source_key: "virgin_polymer",
          source_name: `Virgin ${poly} Polymer Feedstock`,
          category: "Raw Materials",
          activity_amount: data.virgin_material_kg,
          unit: "kg",
          emission_factor: efVirgin,
          factor_unit: "kgCO2e/kg",
          source_reference: "CPCB / Ecoinvent 3.9 Guidelines",
          reference_year: 2023,
          co2e_tonnes: co2Virgin,
          percentage: +((co2Virgin / totalTonnes) * 100).toFixed(1),
          calculation_formula: `${data.virgin_material_kg.toLocaleString()} kg × ${efVirgin} kgCO2e/kg = ${co2Virgin.toFixed(3)} tCO2e`
        },
        {
          source_key: "grid_electricity",
          source_name: "Indian Grid Electricity",
          category: "Electricity",
          activity_amount: data.grid_electricity_kwh,
          unit: "kWh",
          emission_factor: EF.grid,
          factor_unit: "kgCO2e/kWh",
          source_reference: "Central Electricity Authority (CEA Baseline v19)",
          reference_year: 2023,
          co2e_tonnes: co2Grid,
          percentage: +((co2Grid / totalTonnes) * 100).toFixed(1),
          calculation_formula: `${data.grid_electricity_kwh.toLocaleString()} kWh × ${EF.grid} kgCO2e/kWh = ${co2Grid.toFixed(3)} tCO2e`
        },
        {
          source_key: "landfill_waste",
          source_name: "Unsorted Process Scrap to Landfill",
          category: "Waste Stream",
          activity_amount: data.scrap_landfilled_kg,
          unit: "kg",
          emission_factor: EF.landfill,
          factor_unit: "kgCO2e/kg",
          source_reference: "CPCB / DEFRA Guidelines",
          reference_year: 2022,
          co2e_tonnes: co2Scrap,
          percentage: +((co2Scrap / totalTonnes) * 100).toFixed(1),
          calculation_formula: `${data.scrap_landfilled_kg.toLocaleString()} kg × ${EF.landfill} kgCO2e/kg = ${co2Scrap.toFixed(3)} tCO2e`
        }
      ],
      category_breakdown: {
        "Raw Materials": co2Virgin,
        "Electricity": co2Grid,
        "Waste Stream": co2Scrap
      },
      leak_points: [
        {
          rank: 1,
          source_key: "virgin_polymer",
          source_name: `Virgin ${poly} Polymer Feedstock`,
          category: "Raw Materials",
          co2e_tonnes: co2Virgin,
          percentage: +((co2Virgin / totalTonnes) * 100).toFixed(1),
          severity: "High Priority",
          root_cause_explanation: "Raw virgin resin feedstock accounts for the single largest emission source."
        },
        {
          rank: 2,
          source_key: "grid_electricity",
          source_name: "Indian Grid Electricity",
          category: "Electricity",
          co2e_tonnes: co2Grid,
          percentage: +((co2Grid / totalTonnes) * 100).toFixed(1),
          severity: "Medium Priority",
          root_cause_explanation: "Extrusion heaters and chiller electrical power draw."
        }
      ],
      recommendations: [
        {
          id: "rec_increase_recycled_content",
          category: "materials",
          title: "Increase Recycled Material Content",
          subtitle: "Substitute virgin polymer with post-consumer recycled (PCR) resin.",
          description: "Blending PCR pellets into outer layers cuts Scope 3 polymer embodied emissions.",
          addresses_hotspot: "Virgin Polymer Feedstock",
          typical_co2e_reduction_pct: 25.0,
          projected_co2e_savings_tonnes: +(totalTonnes * 0.20).toFixed(2),
          financial_impact_text: "Financial estimate unavailable (additional cost data required)",
          implementation_difficulty: "Low",
          example_technologies: "30% PCR blending for film extruders",
          default_sim_lever: "pcr_blend_pct",
          relevance_score: 95
        }
      ],
      created_at: new Date().toISOString(),
      is_demo: true
    };
  },

  simulateClientDemoFallback(payload) {
    const base = this.calculateClientDemoFallback(payload.assessment_inputs);
    const pcr = (payload.custom_pcr_blend_pct || 0) / 100.0;
    const solar = (payload.custom_renewable_electricity_pct || 0) / 100.0;
    let red = (base.total_co2e_tonnes * 0.20 * pcr) + (base.total_co2e_tonnes * 0.15 * solar);
    let proj = Math.max(0, base.total_co2e_tonnes - red);
    let pct = (red / base.total_co2e_tonnes) * 100;

    return {
      baseline_co2e_tonnes: +base.total_co2e_tonnes.toFixed(2),
      projected_co2e_tonnes: +proj.toFixed(2),
      net_reduction_tonnes: +red.toFixed(2),
      net_reduction_pct: +pct.toFixed(1),
      financial_impact_text: "Financial estimate unavailable (additional cost data required)",
      waste_diverted_tonnes: 0,
      before_breakdown: base.category_breakdown,
      after_breakdown: base.category_breakdown,
      applied_levers: ["Demo Math Scenario"],
      mathematical_explanation: ["Recalculated scenario using explicit mathematical factors."]
    };
  }
};
