/**
 * CarbonLens SME - Main Frontend Coordinator
 * Manages Real Supabase Authentication, Session Restoration, Facility Onboarding,
 * Empty State Overview, Navigation Routing, and Explicit Hackathon Demo Mode.
 */

window.CarbonLensApp = {
  currentAssessment: null,
  activeView: 'landing',
  isDemoMode: false,

  async init() {
    this.bindNavigation();
    this.bindAuthEvents();
    this.bindDemoMode();
    this.bindMethodologyModal();
    this.bindLiveValidation();
    this.bindPdfDownloadButtons();
    Assessment.init();

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    // Check user session
    await this.restoreSession();
  },

  async restoreSession() {
    const token = API.getToken();
    const user = API.getUser();

    if (token && user) {
      // Authenticated User State
      this.isDemoMode = false;
      this.renderAuthenticatedHeader(user);

      // Check user facilities
      let facility = API.getFacility();
      if (!facility) {
        const facs = await API.getUserFacilities();
        if (facs && facs.length > 0) {
          facility = facs[0];
          localStorage.setItem('carbonlens_facility', JSON.stringify(facility));
        }
      }

      if (!facility) {
        // Redirect new user to facility setup
        this.switchView('facility-setup');
        return;
      }

      // Update Header with Facility Name
      this.updateHeaderFacilityInfo(facility);

      // Check if user has an existing saved assessment
      const latestAsm = await API.getLatestUserAssessment(facility.id);
      if (latestAsm && !latestAsm.is_demo) {
        this.onAssessmentResultLoaded(latestAsm, false);
      } else {
        // Display Empty State Dashboard for this account (ZERO results)
        this.renderEmptyStateOverview(user, facility);
        this.switchView('overview');
      }
    } else {
      // Guest / Unauthenticated State
      this.renderGuestHeader();
      this.switchView('landing');
    }
  },

  renderAuthenticatedHeader(user) {
    const userMenu = document.getElementById('header-user-menu');
    const guestMenu = document.getElementById('header-guest-menu');
    const nameEl = document.getElementById('header-user-name');
    const emailEl = document.getElementById('header-user-email');
    const avatarEl = document.getElementById('user-avatar-initials');

    if (userMenu) userMenu.classList.remove('hidden');
    if (guestMenu) guestMenu.classList.add('hidden');

    if (nameEl) nameEl.textContent = user.full_name || user.email;
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) {
      const parts = (user.full_name || user.email).split(' ');
      const initials = parts.length >= 2 
        ? (parts[0][0] + parts[1][0]).toUpperCase() 
        : (user.email[0] + user.email[1]).toUpperCase();
      avatarEl.textContent = initials;
    }
  },

  renderGuestHeader() {
    const userMenu = document.getElementById('header-user-menu');
    const guestMenu = document.getElementById('header-guest-menu');
    if (userMenu) userMenu.classList.add('hidden');
    if (guestMenu) guestMenu.classList.remove('hidden');

    const nameEl = document.getElementById('dash-facility-name');
    const periodEl = document.getElementById('dash-reporting-period');
    if (nameEl) nameEl.textContent = "CarbonLens";
    if (periodEl) periodEl.textContent = "";
  },

  updateHeaderFacilityInfo(facility) {
    const nameEl = document.getElementById('dash-facility-name');
    const periodEl = document.getElementById('dash-reporting-period');
    if (nameEl) nameEl.textContent = facility.facility_name;
    if (periodEl) periodEl.textContent = `${facility.city}, ${facility.state || 'Gujarat'}`;
  },

  renderEmptyStateOverview(user, facility) {
    this.currentAssessment = null;
    this.isDemoMode = false;

    const emptyState = document.getElementById('dash-empty-state');
    const activeState = document.getElementById('dash-active-state');
    const titleEl = document.getElementById('empty-state-title');
    const subTitleEl = document.getElementById('empty-state-subtitle');

    if (emptyState) emptyState.classList.remove('hidden');
    if (activeState) activeState.classList.add('hidden');

    if (titleEl) titleEl.textContent = `Welcome, ${user.full_name || 'Partner'}! No Assessment Yet`;
    if (subTitleEl) subTitleEl.textContent = `No carbon footprint assessment has been completed yet for ${facility.facility_name}. Start your first assessment to calculate emissions, identify leak-points, and evaluate circular alternatives.`;
    
    // Auto populate facility name & industry into assessment input step 1
    const facNameInput = document.getElementById('input-facility-name');
    if (facNameInput) facNameInput.value = facility.facility_name;

    const facIndInput = document.getElementById('input-industry');
    if (facIndInput) facIndInput.value = facility.industry || 'Plastic & Packaging Manufacturing';

    // Reset sub-views to empty states for accounts with no assessment completed yet
    const analysisBody = document.getElementById('analysis-table-body');
    if (analysisBody) {
      analysisBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-xs text-gray-500 font-mono">No emissions assessment completed yet for ${facility.facility_name}. <button type="button" data-view="assessment" class="nav-link font-bold text-[#18583f] underline ml-1">Start New Assessment →</button></td></tr>`;
    }

    const leakPointsContainer = document.getElementById('leakpoints-view-list');
    if (leakPointsContainer) {
      leakPointsContainer.innerHTML = `<div class="col-span-full arenius-card p-8 text-center text-xs text-gray-500 font-mono">No leak points available yet for ${facility.facility_name}. <button type="button" data-view="assessment" class="nav-link font-bold text-[#18583f] underline ml-1">Start New Assessment →</button></div>`;
    }

    const recsContainer = document.getElementById('recommendations-view-list');
    if (recsContainer) {
      recsContainer.innerHTML = `<div class="col-span-full arenius-card p-8 text-center text-xs text-gray-500 font-mono">No circular recommendations available yet for ${facility.facility_name}. <button type="button" data-view="assessment" class="nav-link font-bold text-[#18583f] underline ml-1">Start New Assessment →</button></div>`;
    }

    // Ensure all badges are hidden
    this.toggleDemoBadges(false);
  },

  bindNavigation() {
    // Global Event Delegation for data-view and data-target-view clicks
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('[data-view]');
      if (navItem) {
        e.preventDefault();
        const view = navItem.getAttribute('data-view');
        if (view) this.switchView(view);
        return;
      }

      const triggerItem = e.target.closest('[data-target-view]');
      if (triggerItem) {
        e.preventDefault();
        const targetView = triggerItem.getAttribute('data-target-view');
        if (targetView) this.switchView(targetView);
        return;
      }
    });
  },

  switchView(viewId) {
    if (!viewId) return;

    // Highlight active nav item
    document.querySelectorAll('.nav-link').forEach(item => {
      const view = item.getAttribute('data-view');
      if (view === viewId) {
        item.classList.add('nav-item-active');
      } else {
        item.classList.remove('nav-item-active');
      }
    });

    // Toggle view containers
    document.querySelectorAll('.app-view').forEach(container => {
      if (container.id === `view-${viewId}`) {
        container.classList.remove('hidden');
        container.classList.add('animate-tab-content');
      } else {
        container.classList.add('hidden');
      }
    });

    this.activeView = viewId;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    if (!this.currentAssessment && !this.isDemoMode && ['analysis', 'leakpoints', 'recommendations', 'simulator'].includes(viewId)) {
      const facility = API.getFacility();
      const facName = facility ? facility.facility_name : 'your facility';

      const analysisBody = document.getElementById('analysis-table-body');
      if (analysisBody) {
        analysisBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-xs text-gray-500 font-mono">No emissions assessment completed yet for ${facName}. <button type="button" data-view="assessment" class="nav-link font-bold text-[#18583f] underline ml-1">Start New Assessment →</button></td></tr>`;
      }

      const leakPointsContainer = document.getElementById('leakpoints-view-list');
      if (leakPointsContainer) {
        leakPointsContainer.innerHTML = `<div class="col-span-full arenius-card p-8 text-center text-xs text-gray-500 font-mono">No leak points available yet for ${facName}. <button type="button" data-view="assessment" class="nav-link font-bold text-[#18583f] underline ml-1">Start New Assessment →</button></div>`;
      }

      const recsContainer = document.getElementById('recommendations-view-list');
      if (recsContainer) {
        recsContainer.innerHTML = `<div class="col-span-full arenius-card p-8 text-center text-xs text-gray-500 font-mono">No circular recommendations available yet for ${facName}. <button type="button" data-view="assessment" class="nav-link font-bold text-[#18583f] underline ml-1">Start New Assessment →</button></div>`;
      }
    }

    if (viewId === 'assessment') {
      const facility = API.getFacility();
      if (facility) {
        const facNameInput = document.getElementById('input-facility-name');
        if (facNameInput) facNameInput.value = facility.facility_name;
        const facIndInput = document.getElementById('input-industry');
        if (facIndInput) facIndInput.value = facility.industry || 'Plastic & Packaging Manufacturing';
      }
    }

    if (viewId === 'partners') {
      this.loadPartnersView();
    }
  },

  bindLiveValidation() {
    if (!window.Validators) return;

    // Show / Hide Password Toggles
    Validators.bindPasswordToggle('login-password', 'toggle-login-password');
    Validators.bindPasswordToggle('reg-password', 'toggle-reg-password');
    Validators.bindPasswordToggle('reg-confirm-password', 'toggle-reg-confirm-password');

    // --- LOGIN FORM LIVE VALIDATION ---
    const loginEmail = document.getElementById('login-email');
    const loginEmailErr = document.getElementById('error-login-email');
    const loginPass = document.getElementById('login-password');
    const loginPassErr = document.getElementById('error-login-password');

    if (loginEmail) {
      ['input', 'blur'].forEach(evt => {
        loginEmail.addEventListener(evt, () => Validators.validateLoginEmail(loginEmail, loginEmailErr));
      });
    }
    if (loginPass) {
      ['input', 'blur'].forEach(evt => {
        loginPass.addEventListener(evt, () => Validators.validateLoginPassword(loginPass, loginPassErr));
      });
    }

    // --- REGISTER FORM LIVE VALIDATION ---
    const regName = document.getElementById('reg-name');
    const regNameErr = document.getElementById('error-reg-name');
    const regEmail = document.getElementById('reg-email');
    const regEmailErr = document.getElementById('error-reg-email');
    const regPass = document.getElementById('reg-password');
    const regPassErr = document.getElementById('error-reg-password');
    const regPassChecklist = document.getElementById('reg-password-checklist');
    const regConfirm = document.getElementById('reg-confirm-password');
    const regConfirmErr = document.getElementById('error-reg-confirm-password');
    const regTerms = document.getElementById('reg-terms');
    const regTermsErr = document.getElementById('error-reg-terms');

    if (regName) {
      ['input', 'blur'].forEach(evt => {
        regName.addEventListener(evt, () => Validators.validateRegisterName(regName, regNameErr));
      });
    }
    if (regEmail) {
      ['input', 'blur'].forEach(evt => {
        regEmail.addEventListener(evt, () => Validators.validateRegisterEmail(regEmail, regEmailErr));
      });
    }
    if (regPass) {
      ['input', 'blur'].forEach(evt => {
        regPass.addEventListener(evt, () => {
          Validators.validateRegisterPassword(regPass, regPassErr, regPassChecklist);
          if (regConfirm && regConfirm.value) {
            Validators.validateRegisterConfirmPassword(regPass, regConfirm, regConfirmErr);
          }
        });
      });
    }
    if (regConfirm) {
      ['input', 'blur'].forEach(evt => {
        regConfirm.addEventListener(evt, () => Validators.validateRegisterConfirmPassword(regPass, regConfirm, regConfirmErr));
      });
    }
    if (regTerms) {
      regTerms.addEventListener('change', () => Validators.validateRegisterTerms(regTerms, regTermsErr));
    }

    // --- FACILITY SETUP FORM LIVE VALIDATION ---
    const facName = document.getElementById('fac-name');
    const facNameErr = document.getElementById('error-fac-name');
    const facCompany = document.getElementById('fac-company');
    const facCompanyErr = document.getElementById('error-fac-company');
    const facCity = document.getElementById('fac-city');
    const facCityErr = document.getElementById('error-fac-city');
    const facState = document.getElementById('fac-state');
    const facStateErr = document.getElementById('error-fac-state');
    const facIndustry = document.getElementById('fac-industry');
    const facIndustryErr = document.getElementById('error-fac-industry');

    if (facName) {
      ['input', 'blur'].forEach(evt => {
        facName.addEventListener(evt, () => Validators.validateFacilityName(facName, facNameErr));
      });
    }
    if (facCompany) {
      ['input', 'blur'].forEach(evt => {
        facCompany.addEventListener(evt, () => Validators.validateCompanyName(facCompany, facCompanyErr));
      });
    }
    if (facCity) {
      ['input', 'blur'].forEach(evt => {
        facCity.addEventListener(evt, () => Validators.validateCity(facCity, facCityErr));
      });
    }
    if (facState) {
      ['input', 'blur'].forEach(evt => {
        facState.addEventListener(evt, () => Validators.validateState(facState, facStateErr));
      });
    }
    if (facIndustry) {
      facIndustry.addEventListener('change', () => Validators.validateSelectRequired(facIndustry, facIndustryErr, 'Industry'));
    }
  },

  bindAuthEvents() {
    // Login form
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('login-email');
        const emailErr = document.getElementById('error-login-email');
        const passInput = document.getElementById('login-password');
        const passErr = document.getElementById('error-login-password');
        const errEl = document.getElementById('auth-login-error');

        if (window.Validators) {
          const emailValid = Validators.validateLoginEmail(emailInput, emailErr);
          const passValid = Validators.validateLoginPassword(passInput, passErr);
          if (!emailValid || !passValid) {
            if (!emailValid) emailInput.focus();
            else if (!passValid) passInput.focus();
            return;
          }
        }

        const email = emailInput.value;
        const pass = passInput.value;

        try {
          if (errEl) errEl.classList.add('hidden');
          await API.login(email, pass);
          await this.restoreSession();
        } catch (err) {
          if (errEl) {
            errEl.textContent = err.message || 'Account services are currently unavailable.';
            errEl.classList.remove('hidden');
          }
        }
      });
    }

    // Instant 1-Click Demo Login Handler
    const demoFillBtn = document.getElementById('btn-fill-demo-login');
    if (demoFillBtn) {
      demoFillBtn.addEventListener('click', async () => {
        const emailInput = document.getElementById('login-email');
        const passInput = document.getElementById('login-password');
        if (emailInput) emailInput.value = 'demo@sme.local';
        if (passInput) passInput.value = 'demo1234';
        if (loginForm) loginForm.dispatchEvent(new Event('submit'));
      });
    }

    // Register form
    const regForm = document.getElementById('form-register');
    if (regForm) {
      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const regName = document.getElementById('reg-name');
        const regNameErr = document.getElementById('error-reg-name');
        const regEmail = document.getElementById('reg-email');
        const regEmailErr = document.getElementById('error-reg-email');
        const regPass = document.getElementById('reg-password');
        const regPassErr = document.getElementById('error-reg-password');
        const regPassChecklist = document.getElementById('reg-password-checklist');
        const regConfirm = document.getElementById('reg-confirm-password');
        const regConfirmErr = document.getElementById('error-reg-confirm-password');
        const regTerms = document.getElementById('reg-terms');
        const regTermsErr = document.getElementById('error-reg-terms');
        const errEl = document.getElementById('auth-register-error');

        if (window.Validators) {
          const nameValid = Validators.validateRegisterName(regName, regNameErr);
          const emailValid = Validators.validateRegisterEmail(regEmail, regEmailErr);
          const passValid = Validators.validateRegisterPassword(regPass, regPassErr, regPassChecklist);
          const confirmValid = Validators.validateRegisterConfirmPassword(regPass, regConfirm, regConfirmErr);
          const termsValid = Validators.validateRegisterTerms(regTerms, regTermsErr);

          if (!nameValid || !emailValid || !passValid || !confirmValid || !termsValid) {
            if (!nameValid) regName.focus();
            else if (!emailValid) regEmail.focus();
            else if (!passValid) regPass.focus();
            else if (!confirmValid) regConfirm.focus();
            else if (!termsValid) regTerms.focus();
            return;
          }
        }

        const name = regName.value;
        const email = regEmail.value;
        const pass = regPass.value;

        try {
          if (errEl) errEl.classList.add('hidden');
          const res = await API.register(name, email, pass);
          
          if (res.requires_email_confirmation) {
            if (errEl) {
              errEl.className = 'p-4 bg-amber-50 text-amber-900 text-xs font-semibold rounded-lg border border-amber-300 space-y-1 block';
              errEl.innerHTML = `
                <strong class="block text-sm">✉️ Email Confirmation Required</strong>
                <p>${res.message}</p>
              `;
            }
            return;
          }

          this.renderAuthenticatedHeader({ full_name: name, email: email });
          this.switchView('facility-setup');
        } catch (err) {
          if (errEl) {
            errEl.className = 'p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-200 block';
            errEl.textContent = err.message || 'Account services are currently unavailable.';
          }
        }
      });
    }

    // Facility Setup Form
    const facForm = document.getElementById('form-facility-setup');
    if (facForm) {
      facForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const facName = document.getElementById('fac-name');
        const facNameErr = document.getElementById('error-fac-name');
        const facCompany = document.getElementById('fac-company');
        const facCompanyErr = document.getElementById('error-fac-company');
        const facCity = document.getElementById('fac-city');
        const facCityErr = document.getElementById('error-fac-city');
        const facState = document.getElementById('fac-state');
        const facStateErr = document.getElementById('error-fac-state');
        const facIndustry = document.getElementById('fac-industry');
        const facIndustryErr = document.getElementById('error-fac-industry');

        if (window.Validators) {
          const nameValid = Validators.validateFacilityName(facName, facNameErr);
          const compValid = Validators.validateCompanyName(facCompany, facCompanyErr);
          const cityValid = Validators.validateCity(facCity, facCityErr);
          const stateValid = Validators.validateState(facState, facStateErr);

          if (!nameValid || !compValid || !cityValid || !stateValid) {
            if (!nameValid) facName.focus();
            else if (!cityValid) facCity.focus();
            else if (!stateValid) facState.focus();
            return;
          }
        }

        const facData = {
          facility_name: facName.value,
          company_name: facCompany ? facCompany.value : '',
          industry: facIndustry ? facIndustry.value : 'Plastic & Packaging Manufacturing',
          city: facCity.value,
          state: facState ? facState.value : 'Gujarat',
          default_reporting_period: document.getElementById('fac-period')?.value || 'Monthly (Aug 2026)'
        };
        const errEl = document.getElementById('facility-setup-error');

        try {
          if (errEl) errEl.classList.add('hidden');
          const fac = await API.createFacility(facData);
          this.updateHeaderFacilityInfo(fac);
          this.renderEmptyStateOverview(API.getUser() || { full_name: 'Partner' }, fac);
          this.switchView('overview');
        } catch (err) {
          if (errEl) {
            errEl.textContent = err.message || 'Failed to save facility details.';
            errEl.classList.remove('hidden');
          }
        }
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }
  },

  logout() {
    API.clearSession();
    this.currentAssessment = null;
    this.isDemoMode = false;
    this.toggleDemoBadges(false);
    this.renderGuestHeader();
    this.switchView('landing');
  },

  bindDemoMode() {
    document.addEventListener('click', (e) => {
      const demoBtn = e.target.closest('.trigger-demo-mode');
      if (demoBtn) {
        e.preventDefault();
        this.loadDemo();
      }
    });
  },

  async loadDemo() {
    try {
      this.isDemoMode = true;
      const result = await API.loadDemoAssessment();
      this.onAssessmentResultLoaded(result, true);
    } catch (err) {
      console.error('Failed to load demo assessment:', err);
    }
  },

  toggleDemoBadges(showDemo) {
    const badges = document.querySelectorAll('.badge-demo');
    badges.forEach(b => {
      if (showDemo) b.classList.remove('hidden');
      else b.classList.add('hidden');
    });
  },

  onAssessmentResultLoaded(result, isDemo = false) {
    this.currentAssessment = result;
    this.isDemoMode = isDemo || result.is_demo || false;

    // Toggle Empty State vs Active State
    const emptyState = document.getElementById('dash-empty-state');
    const activeState = document.getElementById('dash-active-state');
    if (emptyState) emptyState.classList.add('hidden');
    if (activeState) activeState.classList.remove('hidden');

    // Show/hide Demo Badges on all views
    this.toggleDemoBadges(this.isDemoMode);

    const partialBadge = document.getElementById('badge-partial-status');
    if (partialBadge) {
      if (result.is_partial_estimate) partialBadge.classList.remove('hidden');
      else partialBadge.classList.add('hidden');
    }

    // Update Header Facility Labels
    const nameEl = document.getElementById('dash-facility-name');
    const periodEl = document.getElementById('dash-reporting-period');
    if (nameEl) nameEl.textContent = result.facility_name;
    if (periodEl) periodEl.textContent = `${result.reporting_period}`;

    // Dynamic Timeframe Unit Suffix
    let periodSuffix = '/mo';
    let periodLabel = 'Monthly';
    if (result.reporting_period) {
      if (result.reporting_period.includes('Annual')) {
        periodSuffix = '/yr';
        periodLabel = 'Annual';
      } else if (result.reporting_period.includes('Quarterly')) {
        periodSuffix = '/quarter';
        periodLabel = 'Quarterly';
      }
    }

    // Overview KPIs
    const totalEl = document.getElementById('dash-total-co2');
    if (totalEl) totalEl.innerHTML = `${result.total_co2e_tonnes.toFixed(2)} <span class="text-base font-semibold text-gray-500">tCO₂e${periodSuffix}</span>`;

    const confScoreEl = document.getElementById('dash-confidence-score');
    const confBadgeEl = document.getElementById('dash-confidence-badge');
    if (confScoreEl) confScoreEl.textContent = `${result.confidence_breakdown.confidence_score}%`;
    if (confBadgeEl) confBadgeEl.textContent = result.confidence_breakdown.quality_badge;

    // Render Treemap & Donut Chart
    Charts.renderTreemap('dash-treemap-container', result.category_breakdown, result.total_co2e_tonnes);
    Charts.renderOverviewDonut('dashDonutChart', result.category_breakdown);

    // Overview Ranked Leak Points
    this.renderOverviewLeakPoints(result.leak_points, periodLabel);

    // Emission Analysis View
    this.renderAnalysisView(result);

    // Leak Points View
    this.renderLeakPointsView(result.leak_points);

    // Recommendations View
    this.renderRecommendationsView(result.recommendations);

    // Initialize Simulator with baseline inputs
    Simulator.init({
      facility_name: result.facility_name,
      industry: result.industry,
      reporting_period: result.reporting_period,
      polymer_type: result.sources.find(s => s.source_key === 'virgin_polymer')?.source_name.split(' ')[1] || 'HDPE',
      virgin_material_kg: result.sources.find(s => s.source_key === 'virgin_polymer')?.activity_amount || null,
      recycled_material_kg: result.sources.find(s => s.source_key === 'recycled_polymer')?.activity_amount || null,
      grid_electricity_kwh: result.sources.find(s => s.source_key === 'grid_electricity')?.activity_amount || null,
      diesel_liters: result.sources.find(s => s.source_key === 'diesel_fuel')?.activity_amount || null,
      scrap_landfilled_kg: result.sources.find(s => s.source_key === 'landfill_waste')?.activity_amount || null
    });

    this.switchView('overview');
  },

  renderOverviewLeakPoints(leakPoints, periodLabel = 'Monthly') {
    const container = document.getElementById('dash-leakpoints-list');
    if (!container) return;

    if (!leakPoints || leakPoints.length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-xs text-gray-400 font-mono">No leak points detected</div>`;
      return;
    }

    container.innerHTML = leakPoints.map(lp => `
      <div class="p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-bold text-xs text-gray-900 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center">#${lp.rank}</span>
            ${lp.source_name}
          </span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${lp.severity === 'High Priority' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">${lp.severity}</span>
        </div>
        <p class="text-xs text-gray-600 leading-relaxed font-sans">${lp.root_cause_explanation}</p>
        <div class="flex justify-between items-center text-xs font-mono pt-2 border-t border-gray-100">
          <span class="text-gray-500">${periodLabel} CO₂e: <strong>${lp.co2e_tonnes.toFixed(2)} t</strong></span>
          <span class="font-bold text-emerald-900">${lp.percentage.toFixed(1)}% share</span>
        </div>
      </div>
    `).join('');
  },

  renderAnalysisView(result) {
    const tableBody = document.getElementById('analysis-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = result.sources.map(s => `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="p-4 font-bold text-gray-900">${s.source_name}</td>
        <td class="p-4 font-mono text-gray-700">${s.activity_amount.toLocaleString()} ${s.unit}</td>
        <td class="p-4 font-mono text-gray-600">${s.emission_factor} ${s.factor_unit}</td>
        <td class="p-4 font-bold text-gray-900 font-mono">${s.co2e_tonnes.toFixed(3)} tCO₂e</td>
        <td class="p-4 font-bold text-emerald-900 font-mono">${s.percentage}%</td>
        <td class="p-4">
          <button onclick="window.CarbonLensApp.showAuditFormula('${s.source_key}')" class="text-xs font-semibold text-emerald-800 hover:underline">
            View Calculation →
          </button>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="6" class="p-4 text-center text-xs text-gray-400">No emission sources available</td></tr>`;
  },

  renderLeakPointsView(leakPoints) {
    const container = document.getElementById('leakpoints-view-list');
    if (!container) return;

    container.innerHTML = leakPoints.map(lp => `
      <div class="arenius-card p-6 space-y-4 border-l-4 ${lp.severity === 'High Priority' ? 'border-l-red-500' : 'border-l-amber-500'}">
        <div class="flex justify-between items-start">
          <span class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 font-bold text-sm flex items-center justify-center">#${lp.rank}</span>
          <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase ${lp.severity === 'High Priority' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">${lp.severity}</span>
        </div>
        <div>
          <h3 class="font-bold text-base text-gray-900">${lp.source_name}</h3>
          <p class="text-xs text-gray-600 mt-2 leading-relaxed font-sans">${lp.root_cause_explanation}</p>
        </div>
        <div class="pt-3 border-t border-gray-100 flex justify-between items-center text-xs font-mono">
          <span class="text-gray-500">Contribution:</span>
          <span class="font-bold text-gray-900 text-sm">${lp.co2e_tonnes.toFixed(2)} tCO₂e (${lp.percentage.toFixed(1)}%)</span>
        </div>
      </div>
    `).join('');
  },

  renderRecommendationsView(recs) {
    const container = document.getElementById('recommendations-view-list');
    if (!container) return;

    container.innerHTML = recs.map(r => `
      <div class="arenius-card p-6 space-y-4 flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex justify-between items-start">
            <span class="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-[11px] uppercase">${r.category}</span>
            <span class="text-xs font-bold text-gray-500 font-mono">Addresses: ${r.addresses_hotspot}</span>
          </div>
          <div>
            <h3 class="font-bold text-base text-gray-900">${r.title}</h3>
            <p class="text-xs text-gray-600 mt-1 leading-relaxed">${r.description}</p>
          </div>
          <div class="p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono text-xs space-y-1">
            <div class="flex justify-between text-gray-700">
              <span>Potential CO₂e Savings:</span>
              <strong class="text-emerald-900">-${r.projected_co2e_savings_tonnes} tCO₂e/mo</strong>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Financial Impact:</span>
              <span>${r.financial_impact_text}</span>
            </div>
          </div>
        </div>
        <div class="pt-3 border-t border-gray-100 flex justify-end">
          <button onclick="window.CarbonLensApp.triggerSimulatorHandoff('${r.default_sim_lever}')" class="btn-primary text-xs flex items-center gap-1.5">
            Simulate Change →
          </button>
        </div>
      </div>
    `).join('');
  },

  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  bindPdfDownloadButtons() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-download-pdf');
      if (!btn) return;
      
      e.preventDefault();
      if (!this.currentAssessment) {
        alert('Please complete an assessment or load demo mode first to download the report.');
        return;
      }

      const origText = btn.innerHTML;
      try {
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-spin inline-block mr-1">⌛</span> Generating Report...`;
        
        const asmId = this.currentAssessment.id;
        const facName = this.currentAssessment.facility_name || 'Facility';
        const cleanName = facName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const filename = `CarbonLens_Assessment_${cleanName}.pdf`;

        await API.downloadAssessmentPdf(asmId, filename);
      } catch (err) {
        console.error('PDF download error:', err);
        alert('Failed to generate PDF report. Please try again.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });
  },

  async loadPartnersView() {
    const container = document.getElementById('partners-list');
    if (!container) return;

    const facility = API.getFacility();
    const city = facility ? facility.city : 'Ahmedabad';
    const state = facility ? (facility.state || 'Gujarat') : 'Gujarat';

    container.innerHTML = `<div class="col-span-full p-8 text-center text-xs text-gray-500 font-mono"><span class="animate-spin inline-block mr-2">📍</span> Discovering nearby recyclers in ${city}, ${state}...</div>`;

    const res = await API.getPartnerSuggestions({ city, state });
    const partners = res.partners || [];
    const searchStatus = res.search_status || `Showing partners around ${city}, ${state}`;
    const isFallback = res.is_fallback || false;
    // The facility city is the source of truth for the user's map pin.
    // If the live discovery API fails, keep the user in their actual Gujarat city
    // instead of silently falling back to central Ahmedabad.
    const localCenter = API.getGujaratCityCenter(city);
    const apiLat = Number(res.center_lat);
    const apiLng = Number(res.center_lng);
    const centerLat = Number.isFinite(apiLat) ? apiLat : (localCenter ? localCenter[0] : 23.0225);
    const centerLng = Number.isFinite(apiLng) ? apiLng : (localCenter ? localCenter[1] : 72.5714);

    console.info('[Partner Map]', { city, state, centerLat, centerLng, source: res.data_source, partners: partners.length });

    // Render Search Radius & Source Status Banner
    const bannerEl = document.getElementById('partner-search-status-banner');
    if (bannerEl) {
      bannerEl.innerHTML = `
        <div class="p-3.5 ${isFallback ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-950'} rounded-xl border text-xs font-mono flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>${isFallback ? '⚠️ CURATED PROTOTYPE DATA' : '✅ OPENSTREETMAP LIVE SEARCH'}</span>
            <span class="text-gray-600">— ${searchStatus}</span>
          </div>
          <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isFallback ? 'bg-amber-200 text-amber-950' : 'bg-emerald-200 text-emerald-950'}">${isFallback ? 'Fallback Data' : 'Live Results'}</span>
        </div>
      `;
    }

    if (partners.length === 0) {
      container.innerHTML = `<div class="col-span-full arenius-card p-8 text-center text-xs text-gray-500 font-mono">No recycler facilities located around ${city}.</div>`;
      return;
    }

    container.innerHTML = partners.map((p) => `
      <div id="partner-card-${p.id}" class="partner-card arenius-card p-5 space-y-3 cursor-pointer transition-all hover:border-[#18583f] hover:shadow-md" data-partner-id="${p.id}">
        <div class="flex justify-between items-start">
          <span class="px-2 py-0.5 text-[10px] font-bold rounded ${p.is_demo ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'}">
            ${p.is_demo ? 'CURATED PROTOTYPE DATA' : 'REAL API RESULT'}
          </span>
          <span class="text-xs font-bold text-emerald-900 font-mono">📍 ${p.computed_distance} km away</span>
        </div>
        <h3 class="font-bold text-base text-gray-900">${p.name}</h3>
        <p class="text-xs text-gray-500 font-mono">${p.partner_type} • ${p.location}</p>
        <p class="text-xs text-gray-600 leading-relaxed font-sans">${p.notes}</p>
        <div class="pt-3 border-t border-gray-100 text-xs font-mono text-gray-600 flex justify-between items-center">
          <span><strong>Contact:</strong> ${p.contact_info}</span>
        </div>
      </div>
    `).join('');

    this.renderPartnersMap(partners, centerLat, centerLng);

    // Bind card click -> map marker focus
    container.querySelectorAll('.partner-card').forEach(card => {
      card.addEventListener('click', () => {
        const pId = card.getAttribute('data-partner-id');
        this.highlightPartnerMarker(pId);
      });
    });
  },

  renderPartnersMap(partners, centerLat, centerLng) {
    const mapContainer = document.getElementById('partner-map');
    if (!mapContainer) return;
    if (!window.L) {
      mapContainer.innerHTML = '<div class="p-6 text-center text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">Map library could not be loaded. Please check your internet connection and reload the page.</div>';
      console.error('Leaflet failed to load; partner map cannot be rendered.');
      return;
    }

    if (this._partnerMap) {
      this._partnerMap.remove();
      this._partnerMap = null;
    }

    this._partnerMarkers = {};

    const map = L.map('partner-map').setView([centerLat, centerLng], 10);
    this._partnerMap = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const featureGroup = L.featureGroup();

    // 1. User Facility Location Pin
    const facility = API.getFacility();
    const facName = facility ? facility.facility_name : 'Your Manufacturing Facility';
    const facLocation = facility ? `${facility.city}, ${facility.state || 'Gujarat'}` : 'Gujarat Industrial Zone';

    const userIcon = L.divIcon({
      className: 'custom-user-facility-pin',
      html: `<div style="background-color:#18583f;color:white;padding:5px 9px;border-radius:12px;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);white-space:nowrap;cursor:pointer;">🏢 ${facName}</div>`,
      iconSize: [160, 30],
      iconAnchor: [80, 15]
    });

    const userMarker = L.marker([centerLat, centerLng], { icon: userIcon }).addTo(map);
    userMarker.bindPopup(`
      <div style="font-family:sans-serif;padding:4px;width:220px;">
        <div style="font-size:10px;background:#18583f;color:white;padding:2px 6px;border-radius:4px;font-weight:bold;display:inline-block;margin-bottom:4px;">YOUR INDUSTRIAL FACILITY</div>
        <div style="font-weight:bold;font-size:13px;color:#111;">${facName}</div>
        <div style="font-size:11px;color:#666;font-family:monospace;margin-top:2px;">${facLocation}</div>
        <div style="font-size:11px;color:#18583f;margin-top:6px;font-weight:bold;">📍 Primary Origin Hub</div>
      </div>
    `);
    featureGroup.addLayer(userMarker);

    // 2. Partner Markers
    partners.forEach((p) => {
      const isLive = !p.is_demo;
      const popupContent = `
        <div style="font-family:sans-serif;width:230px;padding:4px;" class="space-y-1">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-weight:bold;color:#18583f;font-size:11px;">📍 ${p.computed_distance} km away</span>
            <span style="font-size:9px;background:${isLive ? '#d1fae5' : '#fef3c7'};color:${isLive ? '#065f46' : '#92400e'};padding:2px 6px;border-radius:4px;font-weight:bold;">${isLive ? 'REAL API RESULT' : 'CURATED PROTOTYPE DATA'}</span>
          </div>
          <div style="font-weight:bold;font-size:13px;color:#111;margin-top:2px;">${p.name}</div>
          <div style="font-size:11px;color:#555;font-family:monospace;margin-top:1px;">${p.partner_type} • ${p.location}</div>
          <div style="font-size:11px;color:#333;margin-top:4px;line-height:1.3;">${p.notes}</div>
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid #eee;font-size:11px;color:#18583f;">
            <strong>Contact:</strong> ${p.contact_info}
          </div>
        </div>
      `;

      const pLat = Number(p.lat);
      const pLng = Number(p.lng);
      if (!Number.isFinite(pLat) || !Number.isFinite(pLng) || pLat < -90 || pLat > 90 || pLng < -180 || pLng > 180) {
        console.warn('Skipping partner with invalid coordinates:', p.id, p.lat, p.lng);
        return;
      }

      const recyclerIcon = L.divIcon({
        className: 'carbonlens-recycler-pin',
        html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#2f7d5a;color:white;border:2px solid white;box-shadow:0 2px 7px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:15px;transform:rotate(-45deg);"><span style="transform:rotate(45deg);">♻</span></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 28],
        popupAnchor: [0, -26]
      });

      const marker = L.marker([pLat, pLng], { icon: recyclerIcon }).addTo(map).bindPopup(popupContent);
      this._partnerMarkers[p.id] = marker;

      marker.on('click', () => {
        this.highlightPartnerCard(p.id);
      });

      featureGroup.addLayer(marker);
    });

    if (partners.length > 0) {
      try {
        map.fitBounds(featureGroup.getBounds().pad(0.12));
      } catch (e) {}
    }

    [100, 300, 600].forEach((delay) => {
      setTimeout(() => {
        if (this._partnerMap) this._partnerMap.invalidateSize();
      }, delay);
    });
  },

  highlightPartnerMarker(pId) {
    if (this._partnerMarkers && this._partnerMarkers[pId]) {
      const marker = this._partnerMarkers[pId];
      if (this._partnerMap) {
        this._partnerMap.setView(marker.getLatLng(), 12, { animate: true });
      }
      marker.openPopup();
    }
  },

  highlightPartnerCard(pId) {
    document.querySelectorAll('.partner-card').forEach(c => c.classList.remove('ring-2', 'ring-[#18583f]', 'bg-emerald-50/50'));
    const targetCard = document.getElementById(`partner-card-${pId}`);
    if (targetCard) {
      targetCard.classList.add('ring-2', 'ring-[#18583f]', 'bg-emerald-50/50');
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  triggerSimulatorHandoff(leverKey) {
    this.switchView('simulator');
    if (leverKey === 'pcr_blend_pct') {
      const slider = document.getElementById('sim-slider-pcr');
      if (slider) { slider.value = 30; slider.dispatchEvent(new Event('input')); }
    } else if (leverKey === 'regrind_recovery_pct') {
      const slider = document.getElementById('sim-slider-regrind');
      if (slider) { slider.value = 70; slider.dispatchEvent(new Event('input')); }
    } else if (leverKey === 'renewable_electricity_pct') {
      const slider = document.getElementById('sim-slider-solar');
      if (slider) { slider.value = 30; slider.dispatchEvent(new Event('input')); }
    }
  },

  bindMethodologyModal() {
    const modal = document.getElementById('modal-audit');
    const closeBtn = document.getElementById('close-audit-modal');
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }
  },

  showAuditFormula(sourceKey) {
    if (!this.currentAssessment) return;
    const source = this.currentAssessment.sources.find(s => s.source_key === sourceKey);
    if (!source) return;

    const modal = document.getElementById('modal-audit');
    const content = document.getElementById('audit-modal-content');
    if (modal && content) {
      content.innerHTML = `
        <div class="p-4 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2 font-mono text-xs text-emerald-950">
          <div class="font-bold text-sm">${source.source_name}</div>
          <div><strong>Calculation Formula:</strong></div>
          <div class="p-2 bg-white rounded border border-emerald-300 font-bold">${source.calculation_formula}</div>
          <div class="pt-2 text-gray-700">
            <strong>Emission Factor Value:</strong> ${source.emission_factor} ${source.factor_unit}<br>
            <strong>Traceable Source:</strong> ${source.source_reference}<br>
            <strong>Reference Year:</strong> ${source.reference_year}
          </div>
        </div>
      `;
      modal.classList.remove('hidden');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.CarbonLensApp.init();
});
