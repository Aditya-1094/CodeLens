/**
 * CarbonLens SME - Live Validation Utility Module
 * Real-time field validation for Login, Register, Facility Setup, Assessment, and Simulator.
 */

window.Validators = {
  // Regex rules
  emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  nameRegex: /^[a-zA-Z\s\-\.']{2,80}$/,
  facilityNameRegex: /^.{2,100}$/,
  companyNameRegex: /^.{0,150}$/,
  cityRegex: /^[a-zA-Z0-9\s\-\.,']{2,80}$/,

  /**
   * Password strength checklist test
   */
  checkPasswordRules(password) {
    const val = password || '';
    return {
      minLength: val.length >= 8,
      hasUpper: /[A-Z]/.test(val),
      hasLower: /[a-z]/.test(val),
      hasNumber: /[0-9]/.test(val),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val)
    };
  },

  isPasswordValid(password) {
    const rules = this.checkPasswordRules(password);
    return rules.minLength && rules.hasUpper && rules.hasLower && rules.hasNumber && rules.hasSpecial;
  },

  /**
   * Set field UI state (Neutral / Valid / Invalid)
   */
  setFieldState(inputEl, msgEl, isValid, message = '') {
    if (!inputEl) return;
    
    // Clear custom styling
    inputEl.classList.remove('border-gray-300', 'border-[#18583f]', 'border-red-500', 'border-emerald-500', 'bg-red-50/30', 'bg-emerald-50/30');

    if (isValid === null || isValid === undefined) {
      // Neutral / untouched state
      inputEl.classList.add('border-gray-300');
      inputEl.removeAttribute('aria-invalid');
      if (msgEl) {
        msgEl.textContent = '';
        msgEl.classList.add('hidden');
      }
      return;
    }

    if (isValid) {
      // Valid State (Green border, subtle green background)
      inputEl.classList.add('border-emerald-500', 'bg-emerald-50/30');
      inputEl.setAttribute('aria-invalid', 'false');
      if (msgEl) {
        msgEl.textContent = message || '';
        if (message) {
          msgEl.className = 'text-emerald-700 text-[11px] font-semibold mt-1 block flex items-center gap-1';
          msgEl.classList.remove('hidden');
        } else {
          msgEl.classList.add('hidden');
        }
      }
    } else {
      // Invalid State (Red border, red background hint)
      inputEl.classList.add('border-red-500', 'bg-red-50/30');
      inputEl.setAttribute('aria-invalid', 'true');
      if (msgEl) {
        msgEl.textContent = message || 'Invalid input';
        msgEl.className = 'text-red-600 text-[11px] font-semibold mt-1 block flex items-center gap-1';
        msgEl.classList.remove('hidden');
        if (inputEl.id) {
          inputEl.setAttribute('aria-describedby', msgEl.id || `${inputEl.id}-error`);
        }
      }
    }
  },

  /**
   * Register Form Validation
   */
  validateRegisterName(inputEl, msgEl) {
    const val = inputEl.value.trim();
    if (!val) {
      this.setFieldState(inputEl, msgEl, false, 'Full Name is required');
      return false;
    }
    if (val.length < 2 || val.length > 80) {
      this.setFieldState(inputEl, msgEl, false, 'Name must be between 2 and 80 characters');
      return false;
    }
    if (!this.nameRegex.test(val)) {
      this.setFieldState(inputEl, msgEl, false, 'Name contains invalid characters');
      return false;
    }
    this.setFieldState(inputEl, msgEl, true, 'Looks good!');
    return true;
  },

  validateRegisterEmail(inputEl, msgEl) {
    const val = inputEl.value.trim();
    if (!val) {
      this.setFieldState(inputEl, msgEl, false, 'Work Email is required');
      return false;
    }
    if (!this.emailRegex.test(val)) {
      this.setFieldState(inputEl, msgEl, false, 'Please enter a valid email address (e.g. user@company.com)');
      return false;
    }
    this.setFieldState(inputEl, msgEl, true, 'Valid email format');
    return true;
  },

  validateRegisterPassword(inputEl, msgEl, checklistEl) {
    const val = inputEl.value;
    const rules = this.checkPasswordRules(val);

    // Update checklist UI if checklist element is provided
    if (checklistEl) {
      const items = {
        'pwd-rule-length': rules.minLength,
        'pwd-rule-upper': rules.hasUpper,
        'pwd-rule-lower': rules.hasLower,
        'pwd-rule-number': rules.hasNumber,
        'pwd-rule-special': rules.hasSpecial
      };

      for (const [id, isMet] of Object.entries(items)) {
        const el = document.getElementById(id);
        if (el) {
          if (isMet) {
            el.className = 'text-emerald-700 font-semibold flex items-center gap-1';
            const icon = el.querySelector('.rule-icon');
            if (icon) icon.textContent = '✓';
          } else {
            el.className = 'text-gray-400 flex items-center gap-1';
            const icon = el.querySelector('.rule-icon');
            if (icon) icon.textContent = '○';
          }
        }
      }
    }

    if (!val) {
      this.setFieldState(inputEl, msgEl, false, 'Password is required');
      return false;
    }

    const isValid = this.isPasswordValid(val);
    if (!isValid) {
      this.setFieldState(inputEl, msgEl, false, 'Password does not meet all security requirements');
      return false;
    }

    this.setFieldState(inputEl, msgEl, true, 'Strong password!');
    return true;
  },

  validateRegisterConfirmPassword(passInputEl, confirmInputEl, msgEl) {
    const passVal = passInputEl.value;
    const confirmVal = confirmInputEl.value;

    if (!confirmVal) {
      this.setFieldState(confirmInputEl, msgEl, false, 'Please confirm your password');
      return false;
    }

    if (passVal !== confirmVal) {
      this.setFieldState(confirmInputEl, msgEl, false, 'Passwords do not match');
      return false;
    }

    this.setFieldState(confirmInputEl, msgEl, true, 'Passwords match');
    return true;
  },

  validateRegisterTerms(termsEl, msgEl) {
    if (!termsEl.checked) {
      if (msgEl) {
        msgEl.textContent = 'You must accept the terms & privacy policy to register';
        msgEl.className = 'text-red-600 text-[11px] font-semibold mt-1 block';
        msgEl.classList.remove('hidden');
      }
      return false;
    } else {
      if (msgEl) {
        msgEl.textContent = '';
        msgEl.classList.add('hidden');
      }
      return true;
    }
  },

  /**
   * Login Form Validation
   */
  validateLoginEmail(inputEl, msgEl) {
    const val = inputEl.value.trim();
    if (!val) {
      this.setFieldState(inputEl, msgEl, false, 'Email is required');
      return false;
    }
    if (!this.emailRegex.test(val)) {
      this.setFieldState(inputEl, msgEl, false, 'Please enter a valid email format');
      return false;
    }
    this.setFieldState(inputEl, msgEl, true, '');
    return true;
  },

  validateLoginPassword(inputEl, msgEl) {
    const val = inputEl.value;
    if (!val) {
      this.setFieldState(inputEl, msgEl, false, 'Password is required');
      return false;
    }
    this.setFieldState(inputEl, msgEl, true, '');
    return true;
  },

  /**
   * Facility Setup & Profile Validation
   */
  validateFacilityName(inputEl, msgEl) {
    const val = inputEl.value.trim();
    if (!val) {
      this.setFieldState(inputEl, msgEl, false, 'Facility name is required');
      return false;
    }
    if (val.length < 2 || val.length > 100) {
      this.setFieldState(inputEl, msgEl, false, 'Facility name must be 2-100 characters');
      return false;
    }
    this.setFieldState(inputEl, msgEl, true, '');
    return true;
  },

  validateCompanyName(inputEl, msgEl) {
    const val = inputEl.value.trim();
    if (val.length > 150) {
      this.setFieldState(inputEl, msgEl, false, 'Company name max length is 150 characters');
      return false;
    }
    this.setFieldState(inputEl, msgEl, val ? true : null, '');
    return true;
  },

  validateCity(inputEl, msgEl) {
    const val = inputEl.value.trim();
    if (!val) {
      this.setFieldState(inputEl, msgEl, false, 'City / GIDC estate is required');
      return false;
    }
    if (val.length < 2 || val.length > 80) {
      this.setFieldState(inputEl, msgEl, false, 'City name must be 2-80 characters');
      return false;
    }
    this.setFieldState(inputEl, msgEl, true, '');
    return true;
  },

  validateState(inputEl, msgEl) {
    const val = inputEl.value.trim();
    if (!val) {
      this.setFieldState(inputEl, msgEl, false, 'State is required');
      return false;
    }
    this.setFieldState(inputEl, msgEl, true, '');
    return true;
  },

  validateSelectRequired(selectEl, msgEl, fieldName = 'Field') {
    if (!selectEl.value) {
      this.setFieldState(selectEl, msgEl, false, `${fieldName} selection is required`);
      return false;
    }
    this.setFieldState(selectEl, msgEl, true, '');
    return true;
  },

  /**
   * Assessment Numerical Fields Validation
   */
  validateNonNegativeNumber(inputEl, msgEl, fieldName = 'Value') {
    const valStr = inputEl.value.trim();
    if (valStr === '') {
      // Empty numbers are allowed as unrecorded partial estimates
      this.setFieldState(inputEl, msgEl, null, '');
      return true;
    }
    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0) {
      this.setFieldState(inputEl, msgEl, false, `${fieldName} cannot be negative`);
      return false;
    }
    this.setFieldState(inputEl, msgEl, true, '');
    return true;
  },

  validateVirginPct(virginInputEl, recycledInputEl, msgEl) {
    const valStr = virginInputEl.value.trim();
    if (valStr === '') {
      this.setFieldState(virginInputEl, msgEl, false, 'Virgin Material % is required');
      return false;
    }
    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0 || val > 100) {
      this.setFieldState(virginInputEl, msgEl, false, 'Percentage must be between 0 and 100');
      return false;
    }
    // Auto-calculate Recycled PCR %
    if (recycledInputEl) {
      recycledInputEl.value = (100 - val).toFixed(0);
    }
    this.setFieldState(virginInputEl, msgEl, true, '');
    return true;
  },

  validateScrapVsProduction(scrapInputEl, totalInputEl, msgEl) {
    const scrapVal = parseFloat(scrapInputEl.value.trim());
    const totalVal = parseFloat(totalInputEl ? totalInputEl.value.trim() : '');

    if (!isNaN(scrapVal) && scrapVal < 0) {
      this.setFieldState(scrapInputEl, msgEl, false, 'Scrap waste cannot be negative');
      return false;
    }

    if (!isNaN(scrapVal) && !isNaN(totalVal) && totalVal > 0 && scrapVal > totalVal) {
      this.setFieldState(scrapInputEl, msgEl, false, 'Scrap waste cannot exceed total material input');
      return false;
    }

    if (scrapInputEl.value.trim() !== '') {
      this.setFieldState(scrapInputEl, msgEl, true, '');
    } else {
      this.setFieldState(scrapInputEl, msgEl, null, '');
    }
    return true;
  },

  /**
   * Bind Show / Hide Password toggle buttons
   */
  bindPasswordToggle(passwordInputId, toggleBtnId) {
    const inputEl = document.getElementById(passwordInputId);
    const btnEl = document.getElementById(toggleBtnId);
    if (!inputEl || !btnEl) return;

    btnEl.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = inputEl.getAttribute('type') === 'password';
      inputEl.setAttribute('type', isPassword ? 'text' : 'password');
      btnEl.innerHTML = isPassword
        ? `<i data-lucide="eye-off" class="w-4 h-4 text-gray-500"></i>`
        : `<i data-lucide="eye" class="w-4 h-4 text-gray-500"></i>`;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    });
  }
};
