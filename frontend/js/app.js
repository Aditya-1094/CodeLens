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
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      const existing = document.getElementById('file-protocol-warning-banner');
      if (!existing) {
        const banner = document.createElement('div');
        banner.id = 'file-protocol-warning-banner';
        banner.className = 'bg-amber-600 text-white text-xs font-bold p-3 text-center fixed top-0 left-0 right-0 z-[9999] shadow-xl flex items-center justify-center gap-3';
        banner.innerHTML = `
          <span>⚠️ <strong>Backend Server Connection Required</strong>: You opened <code>index.html</code> directly from file explorer. Run <code>start.bat</code> and open <a href="http://127.0.0.1:8000" class="underline font-extrabold text-white ml-1">http://127.0.0.1:8000</a> in your browser.</span>
          <button onclick="this.parentElement.remove()" class="ml-4 bg-amber-800 hover:bg-amber-900 text-white px-2.5 py-1 rounded text-[11px] font-bold">Dismiss</button>
        `;
        document.body.appendChild(banner);
      }
    }

    this.bindNavigation();
    this.bindAuthEvents();
    this.bindDemoMode();
    this.bindMethodologyModal();
    this.bindHistoryModal();
    this.bindLiveValidation();
    this.bindPdfDownloadButtons();
    Assessment.init();

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    // Initialize Hero Ecosystem Animation Canvas
    if (window.Animations && typeof window.Animations.initEcosystemCanvas === 'function') {
      window.Animations.initEcosystemCanvas('ecosystem-canvas');
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
      if (latestAsm) {
        this.onAssessmentResultLoaded(latestAsm, latestAsm.is_demo || false);
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

    // Toggle view containers with smooth entrance animation
    document.querySelectorAll('.app-view').forEach(container => {
      if (container.id === `view-${viewId}`) {
        container.classList.remove('hidden');
        container.classList.add('animate-tab-content');
        if (window.Animations) window.Animations.initScrollReveals(container);
        if (viewId === 'overview' && window.Charts) {
          window.Charts._donutAnimated = false;
        }
      } else {
        container.classList.add('hidden');
      }
    });

    this.activeView = viewId;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // If assessment is not in memory, attempt restoration from localStorage
    if (!this.currentAssessment) {
      const rawLatest = localStorage.getItem('carbonlens_latest_assessment');
      if (rawLatest) {
        try {
          const parsed = JSON.parse(rawLatest);
          if (parsed && parsed.id) {
            this.onAssessmentResultLoaded(parsed, parsed.is_demo || false);
          }
        } catch (e) {}
      }
    }

    if (viewId === 'overview') {
      const emptyState = document.getElementById('dash-empty-state');
      const activeState = document.getElementById('dash-active-state');
      if (!this.currentAssessment && !this.isDemoMode) {
        if (!API.getUser()) {
          // Guest exploring platform: auto-load demo baseline
          this.loadDemo();
        } else {
          if (emptyState) emptyState.classList.remove('hidden');
          if (activeState) activeState.classList.add('hidden');
        }
      } else {
        if (emptyState) emptyState.classList.add('hidden');
        if (activeState) activeState.classList.remove('hidden');
      }
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    if (!this.currentAssessment && !this.isDemoMode && ['analysis', 'leakpoints', 'recommendations', 'simulator'].includes(viewId)) {
      if (!API.getUser()) {
        this.loadDemo();
      } else {
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
    }

    if (viewId === 'facility-setup') {
      this.populateFacilityProfileForm();
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
          if (window.UI) window.UI.showToast('Successfully logged in!', 'success');
          await this.restoreSession();
        } catch (err) {
          if (errEl) {
            errEl.textContent = err.message || 'Account services are currently unavailable.';
            errEl.classList.remove('hidden');
          }
          if (window.UI) window.UI.showToast(err.message || 'Login failed', 'error');
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
        if (passInput) passInput.value = 'password123';
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

          if (window.UI) window.UI.showToast('Account registered successfully!', 'success');
          this.renderAuthenticatedHeader({ full_name: name, email: email });
          this.switchView('facility-setup');
        } catch (err) {
          if (errEl) {
            errEl.className = 'p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-200 block';
            errEl.textContent = err.message || 'Account services are currently unavailable.';
          }
          if (window.UI) window.UI.showToast(err.message || 'Registration failed', 'error');
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
        const existingFac = API.getFacility();

        try {
          if (errEl) errEl.classList.add('hidden');
          let fac;
          if (existingFac && existingFac.id) {
            fac = await API.updateFacility(existingFac.id, facData);
            this.updateHeaderFacilityInfo(fac);
            if (window.UI) window.UI.showToast('Facility profile updated successfully!', 'success');
          } else {
            fac = await API.createFacility(facData);
            this.updateHeaderFacilityInfo(fac);
            this.renderEmptyStateOverview(API.getUser() || { full_name: 'Partner' }, fac);
            if (window.UI) window.UI.showToast('Facility profile created successfully!', 'success');
          }
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

  /**
   * Pre-populates Facility Profile form with current active facility details
   */
  async populateFacilityProfileForm() {
    let facility = API.getFacility();
    if (!facility && API.getUser()) {
      try {
        const facs = await API.getUserFacilities();
        if (facs && facs.length > 0) {
          facility = facs[0];
          localStorage.setItem('carbonlens_facility', JSON.stringify(facility));
        }
      } catch (e) {}
    }

    const badgeEl = document.getElementById('fac-setup-badge');
    const titleEl = document.getElementById('fac-setup-title');
    const subtitleEl = document.getElementById('fac-setup-subtitle');
    const submitBtn = document.getElementById('btn-submit-facility');
    const errEl = document.getElementById('facility-setup-error');
    if (errEl) errEl.classList.add('hidden');

    // Reset validation error text and red outlines
    ['error-fac-name', 'error-fac-company', 'error-fac-industry', 'error-fac-city', 'error-fac-state', 'error-fac-period'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('hidden');
        el.textContent = '';
      }
    });
    ['fac-name', 'fac-company', 'fac-industry', 'fac-city', 'fac-state', 'fac-period'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('border-red-500');
    });

    const facName = document.getElementById('fac-name');
    const facCompany = document.getElementById('fac-company');
    const facIndustry = document.getElementById('fac-industry');
    const facCity = document.getElementById('fac-city');
    const facState = document.getElementById('fac-state');
    const facPeriod = document.getElementById('fac-period');

    if (facility && facility.facility_name) {
      if (badgeEl) badgeEl.textContent = 'Facility Profile & Settings';
      if (titleEl) titleEl.textContent = 'Manage Manufacturing Facility';
      if (subtitleEl) subtitleEl.textContent = 'View and update plant profile, sector, and operational location details.';
      if (submitBtn) submitBtn.innerHTML = '<span>Update Facility Profile ✓</span>';

      if (facName) facName.value = facility.facility_name || '';
      if (facCompany) facCompany.value = facility.company_name || '';
      if (facIndustry) facIndustry.value = facility.industry || 'Plastic & Packaging Manufacturing';
      if (facCity) facCity.value = facility.city || '';
      if (facState) facState.value = facility.state || 'Gujarat';
      if (facPeriod) facPeriod.value = facility.default_reporting_period || 'Monthly (Aug 2026)';
    } else {
      if (badgeEl) badgeEl.textContent = 'Facility Onboarding';
      if (titleEl) titleEl.textContent = 'Set Up Your Manufacturing Facility';
      if (subtitleEl) subtitleEl.textContent = 'Provide basic plant details to personalize carbon emission tracking.';
      if (submitBtn) submitBtn.innerHTML = '<span>Save Facility & Start Assessment →</span>';

      if (facName) facName.value = '';
      if (facCompany) facCompany.value = '';
      if (facIndustry) facIndustry.value = 'Plastic & Packaging Manufacturing';
      if (facCity) facCity.value = '';
      if (facState) facState.value = 'Gujarat';
      if (facPeriod) facPeriod.value = 'Monthly (Aug 2026)';
    }
  },

  logout() {
    API.clearSession();
    this.currentAssessment = null;
    this.isDemoMode = false;
    this.toggleDemoBadges(false);
    this.renderGuestHeader();
    if (window.UI) window.UI.showToast('Logged out successfully', 'info');
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
      if (window.UI) window.UI.showToast('Hackathon Demo assessment loaded!', 'success');
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
    if (totalEl) {
      if (window.Animations && typeof window.Animations.animateCounter === 'function') {
        window.Animations.animateCounter(totalEl, result.total_co2e_tonnes, 1000, 2, ` tCO₂e${periodSuffix}`);
      } else {
        totalEl.innerHTML = `${result.total_co2e_tonnes.toFixed(2)} <span class="text-base font-semibold text-gray-500">tCO₂e${periodSuffix}</span>`;
      }
    }

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

    this.bindLinkedCategoryHovers();
    this.switchView('overview');
  },

  renderOverviewLeakPoints(leakPoints, periodLabel = 'Monthly') {
    const container = document.getElementById('dash-leakpoints-list');
    if (!container) return;

    if (!leakPoints || leakPoints.length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-xs text-gray-400 font-mono">No leak points detected</div>`;
      return;
    }

    container.innerHTML = leakPoints.slice(0, 4).map(lp => `
      <div class="arenius-card p-4 flex justify-between items-center reveal ${lp.severity === 'High Priority' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-amber-500'}" data-category="${lp.category}">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold font-mono text-emerald-900">#${lp.rank}</span>
            <h4 class="font-bold text-sm text-gray-900">${lp.source_name}</h4>
          </div>
          <p class="text-xs text-gray-600 font-sans max-w-lg">${lp.root_cause_explanation}</p>
        </div>
        <div class="text-right font-mono text-xs">
          <span class="block font-extrabold text-gray-900 text-sm">${lp.co2e_tonnes.toFixed(2)} t</span>
          <span class="font-bold text-emerald-900">${lp.percentage.toFixed(1)}% share</span>
        </div>
      </div>
    `).join('');
    if (window.Animations) window.Animations.initScrollReveals(container);
  },

  getScopeInfo(source) {
    const key = (source.source_key || '').toLowerCase();
    const cat = (source.category || '').toLowerCase();
    if (key.includes('diesel') || key.includes('natural_gas') || cat.includes('fuel') || cat.includes('thermal')) {
      return { name: 'Scope 1', label: 'Direct Combustion', badgeClass: 'bg-orange-50 text-orange-900 border-orange-200' };
    }
    if (key.includes('grid') || key.includes('electricity') || cat.includes('elec') || cat.includes('power')) {
      return { name: 'Scope 2', label: 'Purchased Electricity', badgeClass: 'bg-blue-50 text-blue-900 border-blue-200' };
    }
    if (key.includes('material') || key.includes('polymer') || key.includes('hdpe') || key.includes('pp') || key.includes('ldpe') || key.includes('pet') || cat.includes('material')) {
      return { name: 'Scope 3', label: 'Cat 1: Purchased Materials', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
    }
    if (key.includes('waste') || key.includes('scrap') || key.includes('landfill') || cat.includes('waste')) {
      return { name: 'Scope 3', label: 'Cat 5: Operational Waste', badgeClass: 'bg-purple-50 text-purple-900 border-purple-200' };
    }
    return { name: 'Scope 3', label: 'Value Chain', badgeClass: 'bg-gray-100 text-gray-800 border-gray-200' };
  },

  renderAnalysisView(result) {
    const summaryGrid = document.getElementById('analysis-summary-grid');
    const tableBody = document.getElementById('analysis-table-body');
    if (!result || !result.sources) return;

    // 1. Calculate Scope Totals
    let scope1Tonnes = 0, scope2Tonnes = 0, scope3Tonnes = 0;
    result.sources.forEach(s => {
      const info = this.getScopeInfo(s);
      if (info.name === 'Scope 1') scope1Tonnes += s.co2e_tonnes;
      else if (info.name === 'Scope 2') scope2Tonnes += s.co2e_tonnes;
      else scope3Tonnes += s.co2e_tonnes;
    });

    const totalCo2 = result.total_co2e_tonnes || 1;
    const s1Pct = ((scope1Tonnes / totalCo2) * 100).toFixed(1);
    const s2Pct = ((scope2Tonnes / totalCo2) * 100).toFixed(1);
    const s3Pct = ((scope3Tonnes / totalCo2) * 100).toFixed(1);

    // Dominant (#1) and Secondary (#2) Sources
    const sortedSources = [...result.sources].sort((a, b) => b.co2e_tonnes - a.co2e_tonnes);
    const top1 = sortedSources[0] || { source_name: 'N/A', co2e_tonnes: 0, percentage: 0 };
    const top2 = sortedSources[1] || { source_name: 'N/A', co2e_tonnes: 0, percentage: 0 };

    // Production Output Intensity
    const outputKg = result.input_snapshot?.production_output_kg || 41500;
    const outputTonnes = outputKg / 1000;
    const intensity = outputTonnes > 0 ? (totalCo2 / outputTonnes).toFixed(2) : '0.00';

    if (summaryGrid) {
      summaryGrid.innerHTML = `
        <div class="arenius-card p-4 space-y-2 spotlight-card border-l-4 border-l-[#18583f] shadow-xs">
          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Assessed Footprint</div>
          <div class="text-2xl font-extrabold text-gray-900 font-mono tracking-tight">
            ${totalCo2.toFixed(2)} <span class="text-xs font-semibold text-gray-500 font-sans">tCO₂e</span>
          </div>
          <div class="pt-2 border-t border-gray-100 flex items-center gap-1.5 font-mono text-[10px] text-gray-600">
            <span class="px-1.5 py-0.5 rounded bg-orange-50 text-orange-900 border border-orange-200" title="Scope 1 Direct">S1: ${s1Pct}%</span>
            <span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200" title="Scope 2 Electricity">S2: ${s2Pct}%</span>
            <span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200" title="Scope 3 Supply Chain">S3: ${s3Pct}%</span>
          </div>
        </div>

        <div class="arenius-card p-4 space-y-2 spotlight-card border-l-4 border-l-red-500 shadow-xs" data-category="${top1.category}">
          <div class="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <span>Dominant Hotspot (#1)</span>
            <span class="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-mono">#1</span>
          </div>
          <div class="text-sm font-bold text-gray-900 truncate" title="${top1.source_name}">${top1.source_name}</div>
          <div class="pt-2 border-t border-gray-100 flex justify-between items-center font-mono text-[11px]">
            <span class="font-extrabold text-red-700">${top1.co2e_tonnes.toFixed(2)} tCO₂e</span>
            <span class="font-bold text-gray-600">${top1.percentage}% share</span>
          </div>
        </div>

        <div class="arenius-card p-4 space-y-2 spotlight-card border-l-4 border-l-amber-500 shadow-xs" data-category="${top2.category}">
          <div class="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <span>Secondary Driver (#2)</span>
            <span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono">#2</span>
          </div>
          <div class="text-sm font-bold text-gray-900 truncate" title="${top2.source_name}">${top2.source_name}</div>
          <div class="pt-2 border-t border-gray-100 flex justify-between items-center font-mono text-[11px]">
            <span class="font-extrabold text-amber-800">${top2.co2e_tonnes.toFixed(2)} tCO₂e</span>
            <span class="font-bold text-gray-600">${top2.percentage}% share</span>
          </div>
        </div>

        <div class="arenius-card p-4 space-y-2 spotlight-card border-l-4 border-l-emerald-600 shadow-xs">
          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Production Carbon Intensity</div>
          <div class="text-2xl font-extrabold text-gray-900 font-mono tracking-tight">
            ${intensity} <span class="text-xs font-semibold text-gray-500 font-sans">tCO₂e / t</span>
          </div>
          <div class="pt-2 border-t border-gray-100 text-[11px] text-gray-600 font-sans">
            Normalized across <strong>${outputTonnes.toFixed(1)} t</strong> finished output
          </div>
        </div>
      `;
    }

    if (tableBody) {
      tableBody.innerHTML = result.sources.map(s => {
        const scope = this.getScopeInfo(s);
        return `
          <tr class="hover:bg-emerald-50/40 transition-colors border-b border-gray-100" data-category="${s.category}">
            <td class="p-3.5">
              <div class="font-bold text-gray-900 text-xs">${s.source_name}</div>
              <div class="text-[11px] text-gray-500 font-sans">${s.category}</div>
            </td>
            <td class="p-3.5">
              <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${scope.badgeClass}">
                ${scope.name} • ${scope.label}
              </span>
            </td>
            <td class="p-3.5 font-mono text-gray-700 text-xs">
              ${s.activity_amount.toLocaleString()} <span class="text-gray-500 text-[11px]">${s.unit}</span>
            </td>
            <td class="p-3.5 font-mono text-gray-600 text-xs">
              ${s.emission_factor} <span class="text-gray-500 text-[10px]">${s.factor_unit}</span>
            </td>
            <td class="p-3.5 font-bold text-gray-900 font-mono text-xs">
              ${s.co2e_tonnes.toFixed(3)} tCO₂e
            </td>
            <td class="p-3.5 font-mono text-xs">
              <div class="flex items-center gap-2">
                <span class="font-bold text-emerald-900">${s.percentage}%</span>
                <div class="w-12 bg-gray-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                  <div class="bg-emerald-600 h-full rounded-full" style="width: ${Math.min(100, s.percentage)}%"></div>
                </div>
              </div>
            </td>
            <td class="p-3.5 text-right">
              <button type="button" onclick="window.CarbonLensApp.showAuditFormula('${s.source_key}')" class="btn-secondary text-[11px] px-2.5 py-1 text-emerald-900 hover:text-emerald-950 font-semibold inline-flex items-center gap-1 shadow-xs hover:border-emerald-300">
                <i data-lucide="calculator" class="w-3 h-3 text-emerald-700"></i>
                <span>Audit Math →</span>
              </button>
            </td>
          </tr>
        `;
      }).join('') || `<tr><td colspan="7" class="p-6 text-center text-xs text-gray-400 font-mono">No emission sources available</td></tr>`;
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  },

  renderLeakPointsView(leakPoints) {
    const container = document.getElementById('leakpoints-view-list');
    if (!container) return;

    if (!leakPoints || leakPoints.length === 0) {
      container.innerHTML = `<div class="arenius-card p-8 text-center text-xs text-gray-500 font-mono">No leak points detected for this facility profile.</div>`;
      return;
    }

    container.innerHTML = leakPoints.map((lp, index) => {
      const isDominant = (index === 0 || lp.rank === 1);
      if (isDominant) {
        return `
          <div class="arenius-card p-6 space-y-4 border-l-4 border-l-red-500 bg-gradient-to-r from-red-50/30 to-white spotlight-card reveal shadow-sm" data-category="${lp.category}">
            <div class="flex flex-wrap justify-between items-start gap-2">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-xl bg-red-100 text-red-800 font-black text-sm flex items-center justify-center font-mono shadow-xs">#${lp.rank}</span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded bg-red-100 text-red-900 text-[10px] font-extrabold uppercase tracking-wider border border-red-200">👑 DOMINANT LEAK POINT</span>
                    <span class="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold border border-red-200 uppercase">${lp.severity}</span>
                  </div>
                  <h3 class="font-extrabold text-base text-gray-900 mt-1">${lp.source_name}</h3>
                </div>
              </div>
              <div class="text-right font-mono">
                <span class="block font-black text-xl text-gray-900">${lp.co2e_tonnes.toFixed(2)} <span class="text-xs text-gray-500 font-bold">tCO₂e</span></span>
                <span class="font-bold text-red-700 text-xs">${lp.percentage.toFixed(1)}% of total facility footprint</span>
              </div>
            </div>

            <!-- Proportional progress bar -->
            <div class="space-y-1">
              <div class="flex justify-between text-[11px] text-gray-500 font-mono">
                <span>Contribution Share</span>
                <span class="font-bold text-gray-800">${lp.percentage.toFixed(1)}%</span>
              </div>
              <div class="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-gray-200">
                <div class="bg-gradient-to-r from-red-500 to-amber-500 h-full rounded-full transition-all duration-700" style="width: ${Math.min(100, Math.max(5, lp.percentage))}%"></div>
              </div>
            </div>

            <div class="p-3.5 bg-white/90 rounded-xl border border-gray-200 space-y-1.5">
              <div class="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <i data-lucide="activity" class="w-3.5 h-3.5 text-red-600"></i>
                <span>Root Cause Diagnostic:</span>
              </div>
              <p class="text-xs text-gray-700 leading-relaxed font-sans">${lp.root_cause_explanation}</p>
            </div>

            <div class="pt-2 flex justify-end">
              <button type="button" data-target-view="recommendations" class="trigger-view btn-primary text-xs flex items-center gap-1.5 shadow-sm">
                <span>Explore Circular Interventions →</span>
              </button>
            </div>
          </div>
        `;
      }

      return `
        <div class="arenius-card p-5 space-y-3.5 border-l-4 ${lp.severity === 'High Priority' ? 'border-l-red-500' : 'border-l-amber-500'} spotlight-card reveal shadow-xs" data-category="${lp.category}">
          <div class="flex flex-wrap justify-between items-start gap-2">
            <div class="flex items-center gap-2.5">
              <span class="w-7 h-7 rounded-lg bg-gray-100 text-gray-800 font-bold text-xs flex items-center justify-center font-mono">#${lp.rank}</span>
              <div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${lp.severity === 'High Priority' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'} uppercase">${lp.severity}</span>
                <h3 class="font-bold text-sm text-gray-900 mt-0.5">${lp.source_name}</h3>
              </div>
            </div>
            <div class="text-right font-mono">
              <span class="block font-bold text-base text-gray-900">${lp.co2e_tonnes.toFixed(2)} tCO₂e</span>
              <span class="text-xs font-semibold text-gray-600">${lp.percentage.toFixed(1)}% share</span>
            </div>
          </div>

          <!-- Proportional progress bar -->
          <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div class="bg-amber-500 h-full rounded-full transition-all duration-700" style="width: ${Math.min(100, Math.max(3, lp.percentage))}%"></div>
          </div>

          <p class="text-xs text-gray-600 leading-relaxed font-sans">${lp.root_cause_explanation}</p>

          <div class="pt-2 border-t border-gray-100 flex justify-end">
            <button type="button" data-target-view="recommendations" class="trigger-view text-xs font-bold text-[#18583f] hover:underline flex items-center gap-1">
              <span>Matched Circular Interventions →</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.Animations) window.Animations.initScrollReveals(container);
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  },

  renderRecommendationsView(recs) {
    const container = document.getElementById('recommendations-view-list');
    if (!container) return;

    if (!recs || recs.length === 0) {
      container.innerHTML = `<div class="col-span-full arenius-card p-8 text-center text-xs text-gray-500 font-mono">No circular recommendations available.</div>`;
      return;
    }

    const totalCount = recs.length;
    const hasOddLast = (totalCount % 2 === 1);

    container.innerHTML = recs.map((r, index) => {
      const isLastOdd = hasOddLast && (index === totalCount - 1);
      const cutBadgeText = `-${r.typical_co2e_reduction_pct.toFixed(0)}% Cut`;

      if (isLastOdd) {
        return `
        <div class="lg:col-span-2 arenius-card p-6 spotlight-card reveal shadow-sm border border-gray-200">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <!-- Left 7 cols: Category, Title, Subtitle, Description, Tech -->
            <div class="lg:col-span-7 space-y-3.5">
              <div class="flex flex-wrap justify-between items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-[10px] uppercase tracking-wider">
                  ${r.category}
                </span>
                <span class="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold font-mono">
                  Addresses: ${r.addresses_hotspot}
                </span>
              </div>

              <div>
                <h3 class="font-extrabold text-base text-gray-900 leading-snug">${r.title}</h3>
                <p class="text-xs font-semibold text-emerald-800 font-mono mt-0.5">${r.subtitle}</p>
                <p class="text-xs text-gray-600 mt-2 leading-relaxed font-sans">${r.description}</p>
              </div>

              <div class="text-[11px] text-gray-600 bg-gray-50/80 p-2.5 rounded-lg border border-gray-200">
                <strong class="text-gray-900 font-sans">Applicable Technologies:</strong> <span class="font-sans">${r.example_technologies}</span>
              </div>
            </div>

            <!-- Right 5 cols: Quantified Impact Box & Action CTA -->
            <div class="lg:col-span-5 space-y-4">
              <div class="p-4 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-xl border border-emerald-200 space-y-2.5">
                <div class="flex justify-between items-end">
                  <div>
                    <span class="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block">Estimated Monthly Impact</span>
                    <span class="text-2xl font-black text-emerald-950 font-mono">-${r.projected_co2e_savings_tonnes.toFixed(2)} <span class="text-xs font-bold text-emerald-800">tCO₂e/mo</span></span>
                  </div>
                  <div class="text-right">
                    <span class="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-black text-xs font-mono shadow-xs">
                      ${cutBadgeText}
                    </span>
                  </div>
                </div>
                <div class="pt-2 border-t border-emerald-200/60 flex flex-wrap justify-between items-center text-[11px] font-mono text-emerald-900 gap-2">
                  <span><strong>Financial Shift:</strong> ${r.financial_impact_text}</span>
                  <span class="px-2 py-0.5 rounded bg-white/80 border border-emerald-300 text-[10px] font-semibold text-emerald-800">
                    ${r.implementation_difficulty}
                  </span>
                </div>
              </div>

              <div class="flex justify-end">
                <button type="button" onclick="window.CarbonLensApp.triggerSimulatorHandoff('${r.default_sim_lever}')" class="btn-primary text-xs flex items-center gap-1.5 shadow-sm w-full sm:w-auto justify-center">
                  <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
                  <span>Simulate This in What-If Engine →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        `;
      }

      return `
      <div class="arenius-card p-6 space-y-4 flex flex-col justify-between spotlight-card reveal shadow-sm border border-gray-200">
        <div class="space-y-3.5">
          <!-- Header: Hotspot + Category -->
          <div class="flex flex-wrap justify-between items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-[10px] uppercase tracking-wider">
              ${r.category}
            </span>
            <span class="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold font-mono">
              Addresses: ${r.addresses_hotspot}
            </span>
          </div>

          <!-- Title & Description -->
          <div>
            <h3 class="font-extrabold text-base text-gray-900 leading-snug">${r.title}</h3>
            <p class="text-xs font-semibold text-emerald-800 font-mono mt-0.5">${r.subtitle}</p>
            <p class="text-xs text-gray-600 mt-2 leading-relaxed font-sans">${r.description}</p>
          </div>

          <!-- Example Technologies -->
          <div class="text-[11px] text-gray-600 bg-gray-50/80 p-2.5 rounded-lg border border-gray-200">
            <strong class="text-gray-900 font-sans">Applicable Technologies:</strong> <span class="font-sans">${r.example_technologies}</span>
          </div>

          <!-- Hero Quantified Impact Box -->
          <div class="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-xl border border-emerald-200 space-y-2">
            <div class="flex justify-between items-end">
              <div>
                <span class="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block">Estimated Monthly Impact</span>
                <span class="text-2xl font-black text-emerald-950 font-mono">-${r.projected_co2e_savings_tonnes.toFixed(2)} <span class="text-xs font-bold text-emerald-800">tCO₂e/mo</span></span>
              </div>
              <div class="text-right">
                <span class="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-black text-xs font-mono shadow-xs">
                  ${cutBadgeText}
                </span>
              </div>
            </div>
            <div class="pt-2 border-t border-emerald-200/60 flex flex-wrap justify-between items-center text-[11px] font-mono text-emerald-900 gap-2">
              <span><strong>Financial Shift:</strong> ${r.financial_impact_text}</span>
              <span class="px-2 py-0.5 rounded bg-white/80 border border-emerald-300 text-[10px] font-semibold text-emerald-800">
                ${r.implementation_difficulty}
              </span>
            </div>
          </div>
        </div>

        <!-- Simulation Handoff CTA -->
        <div class="pt-3 border-t border-gray-100 flex justify-end">
          <button type="button" onclick="window.CarbonLensApp.triggerSimulatorHandoff('${r.default_sim_lever}')" class="btn-primary text-xs flex items-center gap-1.5 shadow-sm">
            <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
            <span>Simulate This in What-If Engine →</span>
          </button>
        </div>
      </div>
      `;
    }).join('');

    if (window.Animations) window.Animations.initScrollReveals(container);
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  },

  bindLinkedCategoryHovers() {
    document.querySelectorAll('[data-category]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        const cat = el.getAttribute('data-category');
        if (window.Charts) Charts.highlightCategory(cat);
      });
      el.addEventListener('mouseleave', () => {
        if (window.Charts) Charts.clearCategoryHighlight();
      });
    });
  },

  bindPdfDownloadButtons() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-download-pdf');
      if (!btn) return;
      
      e.preventDefault();
      if (!this.currentAssessment) {
        if (window.UI) window.UI.showToast('Please complete an assessment or load demo mode first.', 'warning');
        return;
      }

      const origText = btn.innerHTML;
      try {
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-spin inline-block mr-1">⌛</span> Generating Report...`;
        if (window.UI) window.UI.showToast('Generating publication-grade PDF report...', 'info');
        
        const asmId = this.currentAssessment.id;
        const facName = this.currentAssessment.facility_name || 'Facility';
        const cleanName = facName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const filename = `CarbonLens_Assessment_${cleanName}.pdf`;

        await API.downloadAssessmentPdf(asmId, filename);
        if (window.UI) window.UI.showToast('PDF Report downloaded successfully!', 'success');
      } catch (err) {
        console.error('PDF download error:', err);
        if (window.UI) window.UI.showToast('Failed to generate PDF report', 'error');
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

    container.innerHTML = `<div class="p-8 text-center text-xs text-gray-500 font-mono"><span class="animate-spin inline-block mr-2">📍</span> Discovering nearby recyclers in ${city}, ${state}...</div>`;

    const res = await API.getPartnerSuggestions({ city, state });
    const partners = res.partners || [];
    const searchStatus = res.search_status || `Showing partners around ${city}, ${state}`;
    const isFallback = res.is_fallback || false;
    const centerLat = res.center_lat || 23.0225;
    const centerLng = res.center_lng || 72.5714;

    // Render Search Radius & Source Status Banner
    const bannerEl = document.getElementById('partner-search-status-banner');
    if (bannerEl) {
      bannerEl.innerHTML = `
        <div class="p-3.5 ${isFallback ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-950'} rounded-xl border text-xs font-mono flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span>${isFallback ? '⚠️ CURATED PROTOTYPE DATA' : '✅ OPENSTREETMAP LIVE SEARCH'}</span>
            <span class="text-gray-600">— ${searchStatus}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${isFallback ? 'bg-amber-100/90 border-amber-300 text-amber-950' : 'bg-emerald-100/90 border-emerald-300 text-emerald-950'} cursor-default select-none">
              ${isFallback ? 'Directory Fallback' : 'Live Results'}
            </span>
            <button type="button" id="btn-retry-partner-search" class="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1.5 shadow-sm bg-white hover:bg-gray-50 border border-gray-300 rounded-lg">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-[#18583f]"></i>
              <span class="font-sans font-semibold">Retry Search</span>
            </button>
          </div>
        </div>
      `;

      const retryBtn = document.getElementById('btn-retry-partner-search');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          if (window.UI) window.UI.showToast('Re-querying OpenStreetMap GIS servers...', 'info');
          this.loadPartnersView();
        });
      }

      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }

    if (partners.length === 0) {
      container.innerHTML = `<div class="arenius-card p-8 text-center text-xs text-gray-500 font-mono">No recycler facilities located around ${city}.</div>`;
      return;
    }

    container.innerHTML = partners.map((p) => `
      <div id="partner-card-${p.id}" class="partner-card arenius-card p-5 space-y-3 cursor-pointer transition-all hover:border-[#18583f] hover:shadow-md spotlight-card" data-partner-id="${p.id}">
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
    if (window.Animations) window.Animations.initScrollReveals(container);

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
    if (!mapContainer || !window.L) return;

    if (this._partnerMap) {
      this._partnerMap.remove();
      this._partnerMap = null;
    }

    this._partnerMarkers = {};

    const map = L.map('partner-map').setView([centerLat, centerLng], 10);
    this._partnerMap = map;

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
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
      html: `<div style="display:inline-flex;align-items:center;gap:4px;background-color:#18583f;color:white;padding:5px 10px;border-radius:12px;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);white-space:nowrap;cursor:pointer;">🏢 ${facName}</div>`,
      iconSize: null,
      iconAnchor: [20, 15]
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

      const marker = L.marker([p.lat, p.lng]).addTo(map).bindPopup(popupContent);
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

    setTimeout(() => { map.invalidateSize(); }, 300);
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
    if (this.currentAssessment) {
      const simInputs = this.currentAssessment.input_snapshot || {
        facility_name: this.currentAssessment.facility_name,
        industry: this.currentAssessment.industry,
        reporting_period: this.currentAssessment.reporting_period,
        polymer_type: 'HDPE',
        grid_electricity_kwh: this.currentAssessment.sources?.find(s => s.source_key === 'grid_electricity')?.activity_amount || null,
        virgin_material_kg: this.currentAssessment.sources?.find(s => s.source_key === 'virgin_polymer')?.activity_amount || null,
        recycled_material_kg: this.currentAssessment.sources?.find(s => s.source_key === 'recycled_polymer')?.activity_amount || null,
        diesel_liters: this.currentAssessment.sources?.find(s => s.source_key === 'diesel_genset')?.activity_amount || null,
        scrap_landfilled_kg: this.currentAssessment.sources?.find(s => s.source_key === 'scrap_landfill')?.activity_amount || null
      };
      if (window.Simulator) window.Simulator.init(simInputs);
    }

    this.switchView('simulator');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    setTimeout(() => {
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
    }, 100);
  },

  bindMethodologyModal() {
    this.setupModalDismissal('modal-audit', ['close-audit-modal']);
  },

  bindHistoryModal() {
    const btnOpen = document.getElementById('btn-open-history');
    if (btnOpen) {
      btnOpen.addEventListener('click', () => this.openAssessmentHistory());
    }
    this.setupModalDismissal('modal-history', ['close-history-modal']);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    const content = modal.querySelector('#audit-modal-content, #history-modal-content');
    if (content) content.scrollTop = 0;
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');
    const anyModalOpen = Array.from(document.querySelectorAll('#modal-audit, #modal-history')).some(m => !m.classList.contains('hidden'));
    if (!anyModalOpen) {
      document.body.classList.remove('overflow-hidden');
    }
  },

  setupModalDismissal(modalId, closeBtnIds = []) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // 1. Close buttons inside this modal
    closeBtnIds.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.closeModal(modalId));
    });

    const closeBtns = modal.querySelectorAll('.close-modal-btn');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => this.closeModal(modalId));
    });

    // 2. Click on dark backdrop outside modal card closes it
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal(modalId);
      }
    });

    // 3. Escape key closes active modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        this.closeModal(modalId);
      }
    });
  },

  async openAssessmentHistory() {
    const modal = document.getElementById('modal-history');
    const content = document.getElementById('history-modal-content');
    if (!modal || !content) return;

    this.openModal('modal-history');
    content.innerHTML = `<div class="p-8 text-center text-xs text-gray-500 font-mono"><span class="animate-spin inline-block mr-2">⌛</span> Fetching assessment history...</div>`;

    try {
      const fac = API.getFacility();
      const facilityId = fac ? fac.id : null;
      let history = await API.getUserAssessmentHistory(facilityId);

      if (!history) history = [];

      // Fallback: If server returns empty list but local active assessment exists, present active assessment
      if (history.length === 0 && this.currentAssessment) {
        history = [this.currentAssessment];
      }

      if (history.length === 0) {
        content.innerHTML = `<div class="p-8 text-center text-xs text-gray-500 font-mono">No previous assessments found for this facility. Complete an assessment to start your history log.</div>`;
        return;
      }

      content.innerHTML = history.map((asm, idx) => {
        const isCurrent = (this.currentAssessment && this.currentAssessment.id === asm.id);
        const dateStr = asm.created_at ? new Date(asm.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
        const totalCo2 = typeof asm.total_co2e_tonnes === 'number' ? asm.total_co2e_tonnes.toFixed(2) : '0.00';
        return `
          <div class="p-4 rounded-xl border ${isCurrent ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400' : 'bg-white border-gray-200 hover:border-gray-300'} flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-all">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <strong class="text-gray-900 text-sm font-extrabold">#${history.length - idx} ${asm.facility_name || 'Manufacturing Facility'}</strong>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${asm.is_demo ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}">${asm.reporting_period || 'Monthly'}</span>
                ${isCurrent ? '<span class="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold text-[10px]">ACTIVE REPORT</span>' : ''}
              </div>
              <div class="text-gray-500 font-mono text-[11px]">
                Assessed: ${dateStr} • Data Confidence: <strong>${asm.confidence_breakdown?.confidence_score || 88}%</strong>
              </div>
            </div>
            <div class="flex items-center gap-3 font-mono">
              <div class="text-right pr-2 border-r border-gray-200">
                <span class="text-gray-400 text-[10px] block">TOTAL CO₂e</span>
                <strong class="text-base text-gray-900 font-bold">${totalCo2} t</strong>
              </div>
              <button type="button" onclick="window.CarbonLensApp.loadHistoricalAssessment('${asm.id}')" class="btn-primary text-xs px-3 py-1.5 ${isCurrent ? 'opacity-60 cursor-default' : ''}">
                ${isCurrent ? 'Active View' : 'Load Report →'}
              </button>
            </div>
          </div>
        `;
      }).join('');

      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    } catch (err) {
      console.error('Error fetching assessment history:', err);
      if (this.currentAssessment) {
        content.innerHTML = `
          <div class="p-4 rounded-xl border bg-emerald-50/70 border-emerald-300 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <strong class="text-gray-900 text-sm font-extrabold">${this.currentAssessment.facility_name}</strong>
                <span class="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold text-[10px]">ACTIVE REPORT</span>
              </div>
              <div class="text-gray-500 font-mono text-[11px]">Reporting Period: ${this.currentAssessment.reporting_period}</div>
            </div>
            <div class="font-mono text-base font-bold text-gray-900">${this.currentAssessment.total_co2e_tonnes?.toFixed(2)} tCO₂e</div>
          </div>
        `;
      } else {
        content.innerHTML = `<div class="p-8 text-center text-xs text-gray-500 font-mono">No previous assessments found for this facility. Complete an assessment to start your history log.</div>`;
      }
    }
  },

  async loadHistoricalAssessment(asmId) {
    if (!asmId) return;
    if (this.currentAssessment && this.currentAssessment.id === asmId) {
      this.closeModal('modal-history');
      this.switchView('overview');
      return;
    }
    try {
      const asm = await API.getAssessment(asmId);
      if (asm) {
        this.onAssessmentResultLoaded(asm, asm.is_demo);
        this.closeModal('modal-history');
        if (window.UI) window.UI.showToast(`Loaded assessment: ${asm.facility_name || 'Facility'} (${asm.reporting_period || 'Monthly'})`, 'success');
        this.switchView('overview');
      } else {
        if (window.UI) window.UI.showToast('Could not find requested historical assessment', 'warning');
      }
    } catch (err) {
      console.error('Failed to load historical assessment:', err);
    }
  },

  showAuditFormula(sourceKey) {
    if (!this.currentAssessment) return;
    const source = this.currentAssessment.sources.find(s => s.source_key === sourceKey);
    if (!source) return;

    const scope = this.getScopeInfo(source);
    const modal = document.getElementById('modal-audit');
    const content = document.getElementById('audit-modal-content');
    if (modal && content) {
      content.innerHTML = `
        <div class="space-y-4 text-xs font-sans">
          <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
            <div class="flex justify-between items-start">
              <h4 class="font-extrabold text-sm text-gray-900">${source.source_name}</h4>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono ${scope.badgeClass}">${scope.name} • ${scope.label}</span>
            </div>
            <p class="text-xs text-gray-600">Category: <strong class="text-gray-800 font-mono">${source.category}</strong></p>
          </div>

          <div class="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 font-mono">
            <div class="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-sans">Step-by-Step Arithmetic Substitution</div>
            <div class="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
              <div class="text-gray-500 text-[11px]">Formula Model:</div>
              <div class="font-bold text-gray-900 text-xs">${source.calculation_formula}</div>
              <div class="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-2 text-xs">
                <span class="bg-gray-100 px-2 py-1 rounded text-gray-800 font-bold">${source.activity_amount.toLocaleString()} ${source.unit}</span>
                <span class="text-gray-400">×</span>
                <span class="bg-gray-100 px-2 py-1 rounded text-gray-800 font-bold">${source.emission_factor} ${source.factor_unit}</span>
                <span class="text-gray-400">=</span>
                <span class="bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded font-black">${source.co2e_tonnes.toFixed(3)} tCO₂e</span>
              </div>
            </div>
          </div>

          <div class="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 font-mono text-[11px]">
            <div class="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-sans">Standards & Traceability Governance</div>
            <div class="grid grid-cols-2 gap-2 pt-1 text-gray-700">
              <div><strong>Authoritative Reference:</strong><br><span class="text-gray-900 font-sans">${source.source_reference}</span></div>
              <div><strong>Benchmark Year:</strong><br><span class="text-gray-900 font-sans">${source.reference_year}</span></div>
            </div>
            <div class="pt-2 border-t border-gray-200 text-gray-500 font-sans text-[11px]">
              Calculated automatically using CarbonLens deterministic rule engine aligned with GHG Protocol Corporate Standard and India CEA CO2 Database.
            </div>
          </div>
        </div>
      `;
      this.openModal('modal-audit');
      if (window.Animations) window.Animations.revealContainer(content);
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  }

};

document.addEventListener('DOMContentLoaded', () => {
  window.CarbonLensApp.init();
});
