/**
 * Assessment Wizard Coordinator for CarbonLens SME
 * Smooth step panel slide-fade transitions & live input validation
 */

const Assessment = {
  currentStep: 1,

  init() {
    this.bindStepEvents();
    this.updateStep2PeriodLabels();
  },

  bindStepEvents() {
    // Period select change listener
    const periodSelect = document.getElementById('input-period');
    if (periodSelect) {
      periodSelect.addEventListener('change', () => this.updateStep2PeriodLabels());
    }

    // Step 1 Live Validation
    const facNameEl = document.getElementById('input-facility-name');
    const facNameErr = document.getElementById('error-facility-name');
    if (facNameEl && window.Validators) {
      ['input', 'blur'].forEach(evt => {
        facNameEl.addEventListener(evt, () => Validators.validateFacilityName(facNameEl, facNameErr));
      });
    }

    // Step 2 Live Validation
    if (window.Validators) {
      const gridEl = document.getElementById('input-grid-kwh');
      const gridErr = document.getElementById('error-grid-kwh');
      const dieselEl = document.getElementById('input-diesel-l');
      const dieselErr = document.getElementById('error-diesel-l');
      const totalMatEl = document.getElementById('input-total-material-kg');
      const totalMatErr = document.getElementById('error-total-material-kg');
      const virginPctEl = document.getElementById('input-virgin-pct');
      const virginPctErr = document.getElementById('error-virgin-pct');
      const recycledPctEl = document.getElementById('input-recycled-pct');
      const prodEl = document.getElementById('input-production-output-kg');
      const prodErr = document.getElementById('error-production-output-kg');
      const scrapEl = document.getElementById('input-scrap-kg');
      const scrapErr = document.getElementById('error-scrap-kg');

      const virginCostEl = document.getElementById('input-virgin-cost');
      const virginCostErr = document.getElementById('error-virgin-cost');
      const recycledCostEl = document.getElementById('input-recycled-cost');
      const recycledCostErr = document.getElementById('error-recycled-cost');
      const elecCostEl = document.getElementById('input-elec-cost');
      const elecCostErr = document.getElementById('error-elec-cost');

      if (gridEl) ['input', 'blur'].forEach(e => gridEl.addEventListener(e, () => Validators.validateNonNegativeNumber(gridEl, gridErr, 'Grid Electricity')));
      if (dieselEl) ['input', 'blur'].forEach(e => dieselEl.addEventListener(e, () => Validators.validateNonNegativeNumber(dieselEl, dieselErr, 'Diesel Fuel')));
      if (totalMatEl) ['input', 'blur'].forEach(e => totalMatEl.addEventListener(e, () => {
        Validators.validateNonNegativeNumber(totalMatEl, totalMatErr, 'Total Material');
        if (scrapEl && scrapEl.value) Validators.validateScrapVsProduction(scrapEl, totalMatEl, scrapErr);
      }));
      if (virginPctEl) ['input', 'blur'].forEach(e => virginPctEl.addEventListener(e, () => Validators.validateVirginPct(virginPctEl, recycledPctEl, virginPctErr)));
      if (prodEl) ['input', 'blur'].forEach(e => prodEl.addEventListener(e, () => Validators.validateNonNegativeNumber(prodEl, prodErr, 'Finished Production')));
      if (scrapEl) ['input', 'blur'].forEach(e => scrapEl.addEventListener(e, () => Validators.validateScrapVsProduction(scrapEl, totalMatEl, scrapErr)));

      if (virginCostEl) ['input', 'blur'].forEach(e => virginCostEl.addEventListener(e, () => Validators.validateNonNegativeNumber(virginCostEl, virginCostErr, 'Virgin Cost')));
      if (recycledCostEl) ['input', 'blur'].forEach(e => recycledCostEl.addEventListener(e, () => Validators.validateNonNegativeNumber(recycledCostEl, recycledCostErr, 'PCR Cost')));
      if (elecCostEl) ['input', 'blur'].forEach(e => elecCostEl.addEventListener(e, () => Validators.validateNonNegativeNumber(elecCostEl, elecCostErr, 'Electricity Tariff')));
    }

    // Step navigation buttons
    document.querySelectorAll('.wizard-next').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const current = parseInt(btn.getAttribute('data-step'), 10);
        if (this.validateStep(current)) {
          this.goToStep(current + 1);
        }
      });
    });

    document.querySelectorAll('.wizard-prev').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const current = parseInt(btn.getAttribute('data-step'), 10);
        if (current > 1) this.goToStep(current - 1);
      });
    });

    // Submit calculation trigger
    const submitBtn = document.getElementById('btn-submit-assessment');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitAssessmentForm());
    }
  },

  validateStep(stepNum) {
    if (stepNum === 1) {
      const facNameEl = document.getElementById('input-facility-name');
      const facNameErr = document.getElementById('error-facility-name');
      if (window.Validators && facNameEl) {
        const valid = Validators.validateFacilityName(facNameEl, facNameErr);
        if (!valid) {
          facNameEl.focus();
          return false;
        }
      }
    }

    if (stepNum === 2) {
      if (window.Validators) {
        const gridEl = document.getElementById('input-grid-kwh');
        const gridErr = document.getElementById('error-grid-kwh');
        const dieselEl = document.getElementById('input-diesel-l');
        const dieselErr = document.getElementById('error-diesel-l');
        const totalMatEl = document.getElementById('input-total-material-kg');
        const totalMatErr = document.getElementById('error-total-material-kg');
        const virginPctEl = document.getElementById('input-virgin-pct');
        const virginPctErr = document.getElementById('error-virgin-pct');
        const recycledPctEl = document.getElementById('input-recycled-pct');
        const prodEl = document.getElementById('input-production-output-kg');
        const prodErr = document.getElementById('error-production-output-kg');
        const scrapEl = document.getElementById('input-scrap-kg');
        const scrapErr = document.getElementById('error-scrap-kg');

        const virginCostEl = document.getElementById('input-virgin-cost');
        const virginCostErr = document.getElementById('error-virgin-cost');
        const recycledCostEl = document.getElementById('input-recycled-cost');
        const recycledCostErr = document.getElementById('error-recycled-cost');
        const elecCostEl = document.getElementById('input-elec-cost');
        const elecCostErr = document.getElementById('error-elec-cost');

        let valid = true;

        if (gridEl && !Validators.validateNonNegativeNumber(gridEl, gridErr, 'Grid Electricity')) valid = false;
        if (dieselEl && !Validators.validateNonNegativeNumber(dieselEl, dieselErr, 'Diesel Fuel')) valid = false;
        if (totalMatEl && !Validators.validateNonNegativeNumber(totalMatEl, totalMatErr, 'Total Material')) valid = false;
        if (virginPctEl && !Validators.validateVirginPct(virginPctEl, recycledPctEl, virginPctErr)) valid = false;
        if (prodEl && !Validators.validateNonNegativeNumber(prodEl, prodErr, 'Finished Production')) valid = false;
        if (scrapEl && !Validators.validateScrapVsProduction(scrapEl, totalMatEl, scrapErr)) valid = false;

        if (virginCostEl && !Validators.validateNonNegativeNumber(virginCostEl, virginCostErr, 'Virgin Cost')) valid = false;
        if (recycledCostEl && !Validators.validateNonNegativeNumber(recycledCostEl, recycledCostErr, 'PCR Cost')) valid = false;
        if (elecCostEl && !Validators.validateNonNegativeNumber(elecCostEl, elecCostErr, 'Electricity Tariff')) valid = false;

        if (!valid) {
          const firstInvalid = document.querySelector('#step-2-panel input[aria-invalid="true"]');
          if (firstInvalid) firstInvalid.focus();
          return false;
        }
      }
    }

    return true;
  },

  goToStep(stepNum) {
    for (let i = 1; i <= 4; i++) {
      const panel = document.getElementById(`wizard-step-${i}`);
      const indicator = document.getElementById(`step-indicator-${i}`);
      if (panel) panel.classList.add('hidden');
      if (indicator) {
        if (i === stepNum) {
          indicator.className = 'stepper-circle stepper-active';
        } else if (i < stepNum) {
          indicator.className = 'stepper-circle stepper-completed';
        } else {
          indicator.className = 'stepper-circle stepper-upcoming';
        }
      }
    }

    const targetPanel = document.getElementById(`wizard-step-${stepNum}`);
    if (targetPanel) {
      targetPanel.classList.remove('hidden');
      targetPanel.classList.add('animate-tab-content');
    }
    this.currentStep = stepNum;

    if (stepNum === 2) {
      this.updateStep2PeriodLabels();
    }

    if (stepNum === 3) {
      this.renderReviewSummary();
    }
  },

  updateStep2PeriodLabels() {
    const period = document.getElementById('input-period')?.value || 'Monthly';
    let periodText = 'Monthly';
    let suffix = '/mo';

    if (period.includes('Quarterly')) {
      periodText = 'Quarterly';
      suffix = '/quarter';
    } else if (period.includes('Annual')) {
      periodText = 'Annual';
      suffix = '/yr';
    }

    const heading = document.getElementById('step-2-heading');
    if (heading) heading.textContent = `Enter ${periodText} Activity Data`;

    const subHeading = document.getElementById('step-2-subheading');
    if (subHeading) subHeading.textContent = `Provide operational data for your selected ${periodText.toLowerCase()} period. Unrecorded fields will be marked as Partial Estimate without blocking.`;

    const labelGrid = document.getElementById('label-grid-kwh');
    if (labelGrid) labelGrid.textContent = `Grid Electricity (kWh${suffix})`;

    const labelDiesel = document.getElementById('label-diesel-l');
    if (labelDiesel) labelDiesel.textContent = `Diesel Fuel (liters${suffix})`;

    const labelPolymer = document.getElementById('label-total-material-kg');
    if (labelPolymer) labelPolymer.textContent = `Total Material Input (kg${suffix})`;

    const labelOutput = document.getElementById('label-output-kg');
    if (labelOutput) labelOutput.textContent = `Finished Goods Output (kg${suffix})`;

    const labelLandfill = document.getElementById('label-scrap-kg');
    if (labelLandfill) labelLandfill.textContent = `Landfill Scrap Waste (kg${suffix})`;
  },

  getFormData() {
    const activeFac = API.getFacility();
    const facilityId = activeFac ? activeFac.id : null;

    const facilityName = document.getElementById('input-facility-name')?.value || (activeFac ? activeFac.facility_name : 'Apex Plastics Facility');
    const industry = document.getElementById('input-industry')?.value || (activeFac ? activeFac.industry : 'Plastic & Packaging Manufacturing');
    const reportingPeriod = document.getElementById('input-period')?.value || 'Monthly (Aug 2026)';
    const polymerType = document.getElementById('input-polymer')?.value || 'HDPE';

    const elecKwh = parseFloat(document.getElementById('input-grid-kwh')?.value) || null;
    const dieselL = parseFloat(document.getElementById('input-diesel-l')?.value) || null;
    const totalMatKg = parseFloat(document.getElementById('input-total-material-kg')?.value) || null;
    const virginPct = parseFloat(document.getElementById('input-virgin-pct')?.value) || 100;
    
    let virginKg = null;
    let recycledKg = null;
    if (totalMatKg !== null && totalMatKg > 0) {
      virginKg = (totalMatKg * virginPct) / 100.0;
      recycledKg = totalMatKg - virginKg;
    }

    const prodKg = parseFloat(document.getElementById('input-production-output-kg')?.value) || null;
    const scrapKg = parseFloat(document.getElementById('input-scrap-kg')?.value) || null;
    const virginCost = parseFloat(document.getElementById('input-virgin-cost')?.value) || null;
    const recycledCost = parseFloat(document.getElementById('input-recycled-cost')?.value) || null;
    const elecCost = parseFloat(document.getElementById('input-elec-cost')?.value) || null;

    return {
      facility_id: facilityId,
      facility_name: facilityName,
      industry: industry,
      reporting_period: reportingPeriod,
      city: activeFac ? activeFac.city : 'Ahmedabad',
      polymer_type: polymerType,
      virgin_material_kg: virginKg,
      recycled_material_kg: recycledKg,
      grid_electricity_kwh: elecKwh,
      diesel_liters: dieselL,
      production_output_kg: prodKg,
      scrap_landfilled_kg: scrapKg,
      custom_virgin_cost_inr_per_kg: virginCost,
      custom_recycled_cost_inr_per_kg: recycledCost,
      custom_electricity_cost_inr_per_kwh: elecCost
    };
  },

  renderReviewSummary() {
    const container = document.getElementById('review-summary-container');
    if (!container) return;

    const data = this.getFormData();
    let rows = [];

    rows.push(`
      <div class="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center text-xs">
        <div><strong class="text-gray-900">Facility:</strong> ${data.facility_name} (${data.industry})</div>
        <span class="text-gray-500 font-mono">${data.reporting_period}</span>
      </div>
    `);

    if (data.grid_electricity_kwh !== null) {
      rows.push(`<div class="p-3.5 bg-white rounded-xl border border-gray-200 text-xs font-mono flex justify-between">
        <span>⚡ Electricity:</span><strong>${data.grid_electricity_kwh.toLocaleString()} kWh</strong>
      </div>`);
    } else {
      rows.push(`<div class="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs font-mono text-amber-800">
        ⚡ Electricity: <em>Unrecorded / Excluded</em>
      </div>`);
    }

    if (data.virgin_material_kg !== null) {
      const totMat = (data.virgin_material_kg || 0) + (data.recycled_material_kg || 0);
      const vPct = ((data.virgin_material_kg / totMat) * 100).toFixed(0);
      rows.push(`<div class="p-3.5 bg-white rounded-xl border border-gray-200 text-xs font-mono flex justify-between">
        <span>📦 Polymer Feedstock (${data.polymer_type}):</span>
        <strong>${totMat.toLocaleString()} kg (${vPct}% Virgin / ${100 - vPct}% Recycled)</strong>
      </div>`);
    } else {
      rows.push(`<div class="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs font-mono text-amber-800">
        📦 Material Feedstock: <em>Unrecorded / Excluded</em>
      </div>`);
    }

    if (data.production_output_kg !== null) {
      rows.push(`<div class="p-3.5 bg-white rounded-xl border border-gray-200 text-xs font-mono flex justify-between">
        <span>🏭 Finished Production:</span><strong>${data.production_output_kg.toLocaleString()} kg</strong>
      </div>`);
    }

    if (data.scrap_landfilled_kg !== null) {
      rows.push(`<div class="p-3.5 bg-white rounded-xl border border-gray-200 text-xs font-mono flex justify-between">
        <span>🗑️ Landfill Scrap:</span><strong>${data.scrap_landfilled_kg.toLocaleString()} kg</strong>
      </div>`);
    }

    container.innerHTML = rows.join('');
    if (window.Animations) {
      window.Animations.revealContainer(container);
    }
  },

  async submitAssessmentForm() {
    this.goToStep(4); // Show calculation spinner step
    const payload = this.getFormData();

    try {
      if (window.UI) window.UI.showToast('Executing calculation engine...', 'info');
      const result = await API.submitAssessment(payload);
      setTimeout(() => {
        window.CarbonLensApp.onAssessmentResultLoaded(result);
        this.goToStep(1); // Reset wizard back to step 1 for future runs
        if (window.UI) window.UI.showToast('Carbon footprint assessment completed!', 'success');
      }, 1000);
    } catch (err) {
      if (window.UI) window.UI.showToast(`Calculation error: ${err.message}`, 'error');
      this.goToStep(3);
    }
  }

};
