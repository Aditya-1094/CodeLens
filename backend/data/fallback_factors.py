"""
Central Traceable Emission Factors & Seed Data Store for CarbonLens SME.
Phase-1 Focus: Plastic & Packaging Manufacturing.

Every emission factor is traceable to a recognized authority source reference, document, and reference year.
"""

EMISSION_FACTORS = [
    # ----------------------------------------------------
    # MATERIALS (Scope 3 - Category 1: Purchased Goods)
    # ----------------------------------------------------
    {
        "id": "ef_virgin_hdpe",
        "category": "materials",
        "activity_type": "HDPE",
        "sub_type": "virgin",
        "source_name": "Virgin High-Density Polyethylene (HDPE)",
        "factor_value": 1.93,
        "factor_unit": "kgCO2e/kg",
        "source_organization": "CPCB / Ecoinvent",
        "document_reference": "Ecoinvent 3.9 Database & CPCB Polymer LCA Guidelines",
        "reference_year": 2023,
        "notes": "Granule feedstock production embodied carbon"
    },
    {
        "id": "ef_virgin_ldpe",
        "category": "materials",
        "activity_type": "LDPE",
        "sub_type": "virgin",
        "source_name": "Virgin Low-Density Polyethylene (LDPE)",
        "factor_value": 2.08,
        "factor_unit": "kgCO2e/kg",
        "source_organization": "CPCB / Ecoinvent",
        "document_reference": "Ecoinvent 3.9 Database & CPCB Polymer LCA Guidelines",
        "reference_year": 2023,
        "notes": "Film-grade resin production embodied carbon"
    },
    {
        "id": "ef_virgin_pp",
        "category": "materials",
        "activity_type": "PP",
        "sub_type": "virgin",
        "source_name": "Virgin Polypropylene (PP)",
        "factor_value": 1.98,
        "factor_unit": "kgCO2e/kg",
        "source_organization": "CPCB / Ecoinvent",
        "document_reference": "Ecoinvent 3.9 Database & CPCB Polymer LCA Guidelines",
        "reference_year": 2023,
        "notes": "Molding and woven sack resin feedstock"
    },
    {
        "id": "ef_virgin_pet",
        "category": "materials",
        "activity_type": "PET",
        "sub_type": "virgin",
        "source_name": "Virgin Polyethylene Terephthalate (PET)",
        "factor_value": 2.15,
        "factor_unit": "kgCO2e/kg",
        "source_organization": "CPCB / Ecoinvent",
        "document_reference": "Ecoinvent 3.9 Database & CPCB Polymer LCA Guidelines",
        "reference_year": 2023,
        "notes": "Bottle & sheet grade PET resin"
    },
    {
        "id": "ef_recycled_hdpe",
        "category": "materials",
        "activity_type": "HDPE",
        "sub_type": "recycled",
        "source_name": "Recycled HDPE (Post-Consumer PCR)",
        "factor_value": 0.58,
        "factor_unit": "kgCO2e/kg",
        "source_organization": "Plastics Recyclers India / Association of Plastic Recyclers",
        "document_reference": "APR Post-Consumer Resin LCA Study",
        "reference_year": 2022,
        "notes": "Washed and re-pelletized PCR resin"
    },
    {
        "id": "ef_recycled_ldpe",
        "category": "materials",
        "activity_type": "LDPE",
        "sub_type": "recycled",
        "source_name": "Recycled LDPE (Post-Consumer PCR)",
        "factor_value": 0.62,
        "factor_unit": "kgCO2e/kg",
        "source_organization": "Plastics Recyclers India / APR",
        "document_reference": "APR Post-Consumer Resin LCA Study",
        "reference_year": 2022,
        "notes": "Recycled film-grade PCR pellets"
    },
    {
        "id": "ef_recycled_pp",
        "category": "materials",
        "activity_type": "PP",
        "sub_type": "recycled",
        "source_name": "Recycled PP (Post-Consumer PCR)",
        "factor_value": 0.55,
        "factor_unit": "kgCO2e/kg",
        "source_organization": "Plastics Recyclers India / APR",
        "document_reference": "APR Post-Consumer Resin LCA Study",
        "reference_year": 2022,
        "notes": "Recycled PP regrind / pellets"
    },
    {
        "id": "ef_recycled_pet",
        "category": "materials",
        "activity_type": "PET",
        "sub_type": "recycled",
        "source_name": "Recycled PET (Post-Consumer rPET)",
        "factor_value": 0.68,
        "factor_unit": "kgCO2e/kg",
        "source_organization": "Plastics Recyclers India / APR",
        "document_reference": "APR Post-Consumer Resin LCA Study",
        "reference_year": 2022,
        "notes": "rPET flakes / regrind"
    },

    # ----------------------------------------------------
    # ENERGY - ELECTRICITY (Scope 2)
    # ----------------------------------------------------
    {
        "id": "ef_grid_electricity",
        "category": "energy",
        "activity_type": "grid_electricity",
        "sub_type": "grid",
        "source_name": "Indian National Grid Electricity",
        "factor_value": 0.716,
        "factor_unit": "kgCO2e/kWh",
        "source_organization": "Central Electricity Authority (CEA), Govt. of India",
        "document_reference": "CO2 Baseline Database for the Indian Power Sector, Version 19",
        "reference_year": 2023,
        "notes": "Grid weighted average emission factor including T&D losses"
    },

    # ----------------------------------------------------
    # ENERGY - FUEL (Scope 1)
    # ----------------------------------------------------
    {
        "id": "ef_fuel_diesel",
        "category": "energy",
        "activity_type": "diesel",
        "sub_type": "fuel",
        "source_name": "High Speed Diesel (Gensets / Heating)",
        "factor_value": 2.687,
        "factor_unit": "kgCO2e/liter",
        "source_organization": "IPCC",
        "document_reference": "2006 IPCC Guidelines for National Greenhouse Gas Inventories",
        "reference_year": 2006,
        "notes": "Stationary combustion of commercial diesel"
    },
    {
        "id": "ef_fuel_png",
        "category": "energy",
        "activity_type": "natural_gas",
        "sub_type": "fuel",
        "source_name": "Piped Natural Gas (PNG)",
        "factor_value": 1.92,
        "factor_unit": "kgCO2e/m3",
        "source_organization": "GSPC / Gujarat Gas & IPCC",
        "document_reference": "IPCC Stationary Combustion Guidelines & Industrial Gas Benchmarks",
        "reference_year": 2021,
        "notes": "Industrial fuel gas combustion"
    },

    # ----------------------------------------------------
    # WASTE (Scope 3 - Category 5: Waste Generated)
    # ----------------------------------------------------
    {
        "id": "ef_waste_landfill",
        "category": "waste",
        "activity_type": "landfill",
        "sub_type": "disposal",
        "source_name": "Plastic Process Waste sent to Municipal Landfill",
        "factor_value": 1.45,
        "factor_unit": "kgCO2e/kg",
        "source_organization": "CPCB / UK DEFRA",
        "document_reference": "CPCB Municipal Solid Waste Guidelines & DEFRA Waste Factors",
        "reference_year": 2022,
        "notes": "Unmanaged disposal of mixed polymer scrap"
    },
    {
        "id": "ef_waste_incineration",
        "category": "waste",
        "activity_type": "incineration",
        "sub_type": "disposal",
        "source_name": "Plastic Process Waste Sent to Thermal Incineration",
        "factor_value": 1.20,
        "factor_unit": "kgCO2e/kg",
        "source_organization": "IPCC / CPCB",
        "document_reference": "2006 IPCC Guidelines for Waste Incineration",
        "reference_year": 2006,
        "notes": "Thermal destruction without energy recovery"
    },
    {
        "id": "ef_waste_recycling",
        "category": "waste",
        "activity_type": "recycled",
        "sub_type": "circular",
        "source_name": "Plastic Waste Diverted to Mechanical Recycling / Regrind",
        "factor_value": 0.10,
        "factor_unit": "kgCO2e/kg",
        "source_organization": "CPCB / APR",
        "document_reference": "CPCB Circular Waste Management Benchmarks",
        "reference_year": 2022,
        "notes": "Sorting, granulation, and mechanical processing transport"
    }
]

# ----------------------------------------------------
# REPORT-ALIGNED CIRCULAR RECOMMENDATION RULES
# ----------------------------------------------------
RECOMMENDATION_RULES = [
    {
        "id": "rec_increase_recycled_content",
        "category": "materials",
        "title": "Increase Recycled Material Content",
        "subtitle": "Substitute virgin fossil polymer with certified post-consumer recycled (PCR) resin.",
        "description": "Blending post-consumer recycled (PCR) pellets into non-food outer packaging or rigid containers significantly reduces Scope 3 embodied carbon from primary polymer synthesis.",
        "trigger_condition": "virgin_ratio >= 0.50 or top_hotspot == 'materials'",
        "addresses_hotspot": "Virgin Polymer Feedstock",
        "implementation_difficulty": "Low",
        "example_technologies": "30% PCR blending for film extruders, layer co-extrusion",
        "default_sim_lever": "pcr_blend_pct"
    },
    {
        "id": "rec_improve_internal_scrap_recovery",
        "category": "waste",
        "title": "Improve Internal Production Scrap Recovery",
        "subtitle": "Capture and re-feed edge trims, sprues, and runners directly back into production.",
        "description": "Granulating production trim and purgings immediately in-plant prevents raw material loss, avoids landfill tipping fees, and offsets virgin polymer purchasing.",
        "trigger_condition": "scrap_ratio >= 0.05 or top_hotspot == 'waste'",
        "addresses_hotspot": "Process Scrap & Landfill Waste",
        "implementation_difficulty": "Low",
        "example_technologies": "Beside-the-press granulators, closed-loop regrind loops",
        "default_sim_lever": "regrind_recovery_pct"
    },
    {
        "id": "rec_evaluate_renewable_electricity",
        "category": "energy",
        "title": "Evaluate Renewable Electricity / Rooftop Solar",
        "subtitle": "Transition daytime machine power load to clean on-site solar generation.",
        "description": "Installing net-metered rooftop solar PV panels on factory sheds replaces high-emission coal grid power during peak production hours.",
        "trigger_condition": "electricity_kwh >= 15000 or top_hotspot == 'energy_electricity'",
        "addresses_hotspot": "Grid Electricity Consumption",
        "implementation_difficulty": "Moderate",
        "example_technologies": "Captive rooftop solar PV (50–100 kWp), green tariff power purchase",
        "default_sim_lever": "renewable_electricity_pct"
    },
    {
        "id": "rec_improve_energy_efficiency",
        "category": "energy",
        "title": "Improve Energy Efficiency",
        "subtitle": "Optimize electrical drives, compressed air, and heating barrel insulation.",
        "description": "Systematic energy efficiency upgrades eliminate idle thermal losses, reduce electrical demand spikes, and lower per-kg specific energy consumption.",
        "trigger_condition": "electricity_kwh >= 10000",
        "addresses_hotspot": "Operational Energy Load",
        "implementation_difficulty": "Low",
        "example_technologies": "VFD inverter controls on hydraulic pumps, ceramic barrel insulation blankets",
        "default_sim_lever": "energy_efficiency_pct"
    },
    {
        "id": "rec_improve_recycling_recovery",
        "category": "waste",
        "title": "Improve Recycling & Offsite Offtake",
        "subtitle": "Divert un-regrindable plastic scrap to certified mechanical recyclers.",
        "description": "Formalizing offtake agreements with registered plastic recyclers ensures non-recirculated waste streams avoid open landfills and qualify for EPR credit benefits.",
        "trigger_condition": "landfill_kg >= 200",
        "addresses_hotspot": "Landfill Scrap Waste",
        "implementation_difficulty": "Low",
        "example_technologies": "Segregated waste sorting bins, authorized recycler offtake agreements",
        "default_sim_lever": "recycling_offtake_pct"
    }
]

# ----------------------------------------------------
# CURATED AHMEDABAD / GUJARAT SAMPLE RECYCLERS & VENDORS
# ----------------------------------------------------
CURATED_PARTNERS = [
    {
        "id": "partner_ecoplast_vatva",
        "name": "Ecoplast Solutions Pvt Ltd",
        "partner_type": "Mechanical Recycler & Pelletizer",
        "materials_supported": ["HDPE", "PP", "LDPE"],
        "location": "Vatva GIDC, Ahmedabad, Gujarat",
        "distance_km": 4.2,
        "contact_info": "Phone: +91 98250 12345 | Email: info@ecoplastsolutions.in",
        "notes": "Specializes in washed HDPE/PP regrind pellets and film scrap processing.",
        "is_demo": True
    },
    {
        "id": "partner_gujarat_polymers_naroda",
        "name": "Gujarat Polymers Circular Hub",
        "partner_type": "Rigid Plastic Washing & Flaking",
        "materials_supported": ["HDPE", "PP", "PET"],
        "location": "Naroda GIDC, Ahmedabad, Gujarat",
        "distance_km": 14.8,
        "contact_info": "Phone: +91 98795 67890 | Email: contact@gujaratpolymers.com",
        "notes": "GPCB registered collector & flaker for rigid polymer scrap.",
        "is_demo": True
    },
    {
        "id": "partner_green_vatva",
        "name": "GreenVatva Regrind & Compounding",
        "partner_type": "Toll Granulation & Granulator Supplier",
        "materials_supported": ["HDPE", "LDPE", "LLDPE"],
        "location": "Phase IV, Vatva GIDC, Ahmedabad",
        "distance_km": 5.1,
        "contact_info": "Phone: +91 94260 55443 | Email: sales@greenvatva.in",
        "notes": "Provides beside-the-press granulator equipment and toll grinding services.",
        "is_demo": True
    },
    {
        "id": "partner_sanand_ecopellets",
        "name": "Sanand EcoPellets Industries",
        "partner_type": "PCR Pellet Supplier",
        "materials_supported": ["PP", "HDPE", "PET"],
        "location": "Sanand GIDC II, Gujarat",
        "distance_km": 28.5,
        "contact_info": "Phone: +91 99099 88123 | Email: orders@sanandecopellets.com",
        "notes": "Supplies certified post-consumer recycled pellets (rPP, rHDPE, rPET).",
        "is_demo": True
    },
    {
        "id": "partner_changodar_recovery",
        "name": "Changodar Plastic Recovery Corp",
        "partner_type": "Film Scrap Offtake & EPR Partner",
        "materials_supported": ["LDPE", "LLDPE", "BOPP"],
        "location": "Changodar Industrial Zone, Ahmedabad",
        "distance_km": 19.3,
        "contact_info": "Phone: +91 98244 33211 | Email: connect@changodarcircular.com",
        "notes": "Aggregates flexible film scrap under CPCB EPR registration framework.",
        "is_demo": True
    },
    {
        "id": "partner_shreeji_solar",
        "name": "Shreeji CleanTech Solar & EPC",
        "partner_type": "Rooftop Solar & Energy EPC",
        "materials_supported": ["Solar PV", "Net Metering", "VFD Drives"],
        "location": "Odhav GIDC, Ahmedabad, Gujarat",
        "distance_km": 9.5,
        "contact_info": "Phone: +91 98980 11223 | Email: projects@shreejisolar.in",
        "notes": "Turnkey rooftop solar installations and energy audit services for MSMEs.",
        "is_demo": True
    },
    {
        "id": "partner_vadodara_ecopolymers",
        "name": "Vadodara Circular Polymer Hub",
        "partner_type": "Mechanical Recycler & Toll Compounding",
        "materials_supported": ["HDPE", "PP", "LDPE"],
        "location": "Makarpura GIDC, Vadodara, Gujarat",
        "distance_km": 3.5,
        "contact_info": "Phone: +91 98251 77665 | Email: info@vadodarapolymers.in",
        "notes": "Specializes in rigid polymer scrap flaking & compounding for Central Gujarat industrial belt.",
        "is_demo": True
    },
    {
        "id": "partner_ankleshwar_clean",
        "name": "Ankleshwar Industrial Circular Waste Corp",
        "partner_type": "Hazardous & Polymer Recovery Unit",
        "materials_supported": ["HDPE", "PP", "Industrial Scrap"],
        "location": "Ankleshwar GIDC, Bharuch, Gujarat",
        "distance_km": 12.0,
        "contact_info": "Phone: +91 98252 88990 | Email: recycle@ankleshwarcircular.in",
        "notes": "Authorized GPCB partner for industrial polymer scrap & chemical container recycling.",
        "is_demo": True
    },
    {
        "id": "partner_surat_sachin_polymers",
        "name": "Surat Sachin PCR Granulation Hub",
        "partner_type": "Film & Woven Scrap Recycler",
        "materials_supported": ["LDPE", "LLDPE", "PP"],
        "location": "Sachin GIDC, Surat, Gujarat",
        "distance_km": 8.4,
        "contact_info": "Phone: +91 98791 44332 | Email: sales@sachinpcr.com",
        "notes": "Large-scale pelletizer for flexible film scrap & packaging waste across South Gujarat.",
        "is_demo": True
    },
    {
        "id": "partner_rajkot_metoda_regrind",
        "name": "Rajkot Metoda Engineering Regrind Hub",
        "partner_type": "Rigid Molded Scrap Recycler",
        "materials_supported": ["PP", "HDPE", "ABS"],
        "location": "Metoda GIDC, Rajkot, Gujarat",
        "distance_km": 6.8,
        "contact_info": "Phone: +91 94272 11009 | Email: contact@metodaregrind.in",
        "notes": "Toll granulator serving Saurashtra auto-ancillary & rigid molding units.",
        "is_demo": True
    },
    {
        "id": "partner_vapi_circular_pack",
        "name": "Vapi Paper & Polymer Circular Recovery",
        "partner_type": "Multi-Layer Packaging Recycler",
        "materials_supported": ["PET", "LDPE", "Laminated Packaging"],
        "location": "Vapi GIDC, Valsad, Gujarat",
        "distance_km": 15.2,
        "contact_info": "Phone: +91 98240 66554 | Email: info@vapicircular.org",
        "notes": "Specializes in multi-layer flexible barrier scrap & paper-poly foil separation.",
        "is_demo": True
    },
    {
        "id": "partner_halol_polypellets",
        "name": "Halol Auto-Polymer PCR Compounding",
        "partner_type": "Engineering Polymer Compounder",
        "materials_supported": ["PP", "HDPE", "PET"],
        "location": "Halol GIDC, Panchmahal, Gujarat",
        "distance_km": 11.5,
        "contact_info": "Phone: +91 99044 33221 | Email: ops@halolcompounding.in",
        "notes": "Compounding facility converting automotive plastic scrap into reinforced PCR granules.",
        "is_demo": True
    }
]

# ----------------------------------------------------
# PREDEFINED HACKATHON DEMO INPUT PRESETS
# ----------------------------------------------------
DEMO_INPUT_PRESET = {
    "facility_name": "Vatva Polymer Pack Ltd",
    "industry": "Plastic & Packaging Manufacturing",
    "reporting_period": "Monthly (Aug 2026)",
    "city": "Ahmedabad (Vatva GIDC)",
    "polymer_type": "LDPE",
    "virgin_material_kg": 40000.0,
    "recycled_material_kg": 5000.0,
    "production_output_kg": 41500.0,
    "grid_electricity_kwh": 32000.0,
    "diesel_liters": 850.0,
    "natural_gas_m3": 0.0,
    "scrap_generated_kg": 3500.0,
    "scrap_recycled_internal_kg": 500.0,
    "scrap_landfilled_kg": 3000.0
}
