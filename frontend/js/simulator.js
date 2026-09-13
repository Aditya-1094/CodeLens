/**
 * What-If Simulator Module for CarbonLens SME
 * Connects scenario sliders to Python backend simulation engine with interactive value bubbles,
 * smooth rolling counters, dynamic scenario status badges, and non-flickering chart updates.
 */

const Simulator = {
  currentInputs: null,
  activeLevers: {
    pcrBlendPct: 0,
    regrindRecoveryPct: 0,
    renewableElecPct: 0
  },
  _debounceTimer: null,

  init(assessmentInputs) {
    this.currentInputs = assessmentInputs;
    this.bindControls();
  },

  bindControls() {
    const sliderPcr = document.getElementById('sim-slider-pcr');
    const sliderRegrind = document.getElementById('sim-slider-regrind');
    const sliderSolar = document.getElementById('sim-slider-solar');

    const updateSliderUI = (slider, valEl) => {
      if (!slider || !valEl) return;
      const val = parseFloat(slider.value);
      valEl.textContent = `${val}%`;
      valEl.style.transform = 'scale(1.15)';
      valEl.style.color = '#18583f';
      setTimeout(() => { valEl.style.transform = 'scale(1)'; }, 150);

      const max = parseFloat(slider.max) || 100;
      const pct = (val / max) * 100;
      slider.style.background = `linear-gradient(to right, #10b981 0%, #10b981 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`;
    };

    const handleSliderChange = (slider, valEl, leverKey) => {
      updateSliderUI(slider, valEl);
      this.activeLevers[leverKey] = parseFloat(slider.value);
      this.debouncedSimulation();
    };

    if (sliderPcr) {
      sliderPcr.addEventListener('input', () => {
        handleSliderChange(sliderPcr, document.getElementById('sim-val-pcr'), 'pcrBlendPct');
      });
      updateSliderUI(sliderPcr, document.getElementById('sim-val-pcr'));
    }

    if (sliderRegrind) {
      sliderRegrind.addEventListener('input', () => {
        handleSliderChange(sliderRegrind, document.getElementById('sim-val-regrind'), 'regrindRecoveryPct');
      });
      updateSliderUI(sliderRegrind, document.getElementById('sim-val-regrind'));
    }

    if (sliderSolar) {
      sliderSolar.addEventListener('input', () => {
        handleSliderChange(sliderSolar, document.getElementById('sim-val-solar'), 'renewableElecPct');
      });
      updateSliderUI(sliderSolar, document.getElementById('sim-val-solar'));
    }

    const btnUseScenario = document.getElementById('btn-use-scenario');
    if (btnUseScenario) {
      btnUseScenario.addEventListener('click', () => this.applyFinalActionSummary());
    }
  },

  debouncedSimulation() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      this.triggerSimulation();
    }, 100);
  },

  async triggerSimulation() {
    if (!this.currentInputs) return;

    const payload = {
      assessment_inputs: this.currentInputs,
      custom_pcr_blend_pct: this.activeLevers.pcrBlendPct > 0 ? this.activeLevers.pcrBlendPct : null,
      custom_regrind_recovery_pct: this.activeLevers.regrindRecoveryPct > 0 ? this.activeLevers.regrindRecoveryPct : null,
      custom_renewable_electricity_pct: this.activeLevers.renewableElecPct > 0 ? this.activeLevers.renewableElecPct : null
    };

    try {
      const response = await API.runSimulation(payload);
      this.renderSimulationResults(response);
    } catch (err) {
      console.error('Simulation calculation failed:', err);
    }
  },

  renderSimulationResults(res) {
    const baseEl = document.getElementById('sim-metric-baseline');
    const projEl = document.getElementById('sim-metric-projected');
    const projBox = document.getElementById('sim-box-projected');
    const redAbsEl = document.getElementById('sim-metric-red-abs');
    const redPctEl = document.getElementById('sim-metric-red-pct');
    const finTextEl = document.getElementById('sim-metric-financial');
    const explanationEl = document.getElementById('sim-explanation-list');
    const scenarioStatusEl = document.getElementById('sim-scenario-status');
    const statusBadgeEl = document.getElementById('sim-status-badge');
    const deltaLabelEl = document.getElementById('sim-chart-delta-label');

    const hasReduction = res.net_reduction_tonnes > 0.005;

    // 1. Update Baseline & Projected Counters
    if (baseEl) baseEl.textContent = `${res.baseline_co2e_tonnes.toFixed(2)} t`;
    
    if (projEl) {
      if (window.Animations && typeof window.Animations.animateCounter === 'function') {
        window.Animations.animateCounter(projEl, res.projected_co2e_tonnes, 350, 2, ' t');
      } else {
        projEl.textContent = `${res.projected_co2e_tonnes.toFixed(2)} t`;
      }
    }

    if (projBox) {
      projBox.classList.remove('flash-metric-change');
      void projBox.offsetWidth;
      projBox.classList.add('flash-metric-change');
    }

    // 2. Reduction Stats
    if (redAbsEl) {
      redAbsEl.textContent = `-${res.net_reduction_tonnes.toFixed(2)} tCO₂e/mo`;
    }
    if (redPctEl) {
      redPctEl.textContent = `-${res.net_reduction_pct.toFixed(1)}%`;
    }
    if (finTextEl) {
      finTextEl.textContent = res.financial_impact_text;
    }

    // 3. Status Badges
    if (scenarioStatusEl) {
      if (hasReduction) {
        scenarioStatusEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 font-mono shadow-xs';
        scenarioStatusEl.innerHTML = `<span>🌱 Active Scenario: -${res.net_reduction_pct.toFixed(1)}% (${res.net_reduction_tonnes.toFixed(2)} tCO₂e/mo cut)</span>`;
      } else {
        scenarioStatusEl.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 font-mono';
        scenarioStatusEl.innerHTML = `<span>⚖️ Baseline Footprint</span>`;
      }
    }

    if (statusBadgeEl) {
      if (hasReduction) {
        statusBadgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono';
        statusBadgeEl.textContent = `Scenario Active (-${res.net_reduction_pct.toFixed(1)}%)`;
      } else {
        statusBadgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 font-mono';
        statusBadgeEl.textContent = 'Current Baseline';
      }
    }

    // 4. Chart Delta Label
    if (deltaLabelEl) {
      if (hasReduction) {
        deltaLabelEl.textContent = `-${res.net_reduction_tonnes.toFixed(2)} tCO₂e/mo saved (-${res.net_reduction_pct.toFixed(1)}%)`;
        deltaLabelEl.className = 'font-bold text-emerald-800 font-mono';
      } else {
        deltaLabelEl.textContent = 'Baseline scenario';
        deltaLabelEl.className = 'text-gray-500 font-mono';
      }
    }

    // 5. Mathematical Explanation List
    if (explanationEl) {
      explanationEl.innerHTML = (res.mathematical_explanation || []).map(exp => `
        <li class="flex items-start gap-2 text-xs font-mono text-gray-800 bg-white p-2 rounded-lg border border-gray-100 shadow-2xs">
          <span class="text-emerald-700 font-bold shrink-0">✓</span>
          <span class="leading-relaxed font-sans">${exp}</span>
        </li>
      `).join('') || `<li class="text-xs text-gray-500 font-mono p-2">Move levers above to test scenario reduction strategies.</li>`;
      if (window.Animations) window.Animations.initScrollReveals(explanationEl);
    }

    // 6. Smooth Bar Chart Update
    Charts.renderSimulatorComparisonBar('simBarChart', res.baseline_co2e_tonnes, res.projected_co2e_tonnes);
  },

  applyFinalActionSummary() {
    const projVal = document.getElementById('sim-metric-projected')?.textContent || '0 t';
    const redVal = document.getElementById('sim-metric-red-abs')?.textContent || '0 t';
    const redPct = document.getElementById('sim-metric-red-pct')?.textContent || '0%';
    
    const container = document.getElementById('final-action-container');
    if (container) {
      const activeLeverNames = [];
      if (this.activeLevers.pcrBlendPct > 0) activeLeverNames.push(`${this.activeLevers.pcrBlendPct}% PCR Resin Blend`);
      if (this.activeLevers.regrindRecoveryPct > 0) activeLeverNames.push(`${this.activeLevers.regrindRecoveryPct}% In-House Scrap Recovery`);
      if (this.activeLevers.renewableElecPct > 0) activeLeverNames.push(`${this.activeLevers.renewableElecPct}% Rooftop Solar`);

      container.innerHTML = `
        <div class="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-300 space-y-3 font-mono text-xs shadow-xs animate-fade-in">
          <div class="font-bold text-emerald-950 text-sm flex items-center justify-between">
            <span class="flex items-center gap-1.5 font-sans">
              <i data-lucide="check-circle" class="w-4 h-4 text-emerald-700"></i>
              <span>Adopted Decarbonization Roadmap</span>
            </span>
            <span class="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold text-[10px]">${redPct} Cut</span>
          </div>
          <div class="text-emerald-900 font-sans text-xs leading-relaxed">
            <strong>Active Policy Levers:</strong> ${activeLeverNames.join(' • ') || 'Standard Baseline Operation'}
          </div>
          <div class="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-200">
            <div class="p-2.5 bg-white rounded-lg border border-emerald-200">
              <span class="text-[10px] text-gray-500 block">Projected Target:</span>
              <strong class="text-gray-900 text-sm">${projVal}</strong>
            </div>
            <div class="p-2.5 bg-white rounded-lg border border-emerald-200">
              <span class="text-[10px] text-gray-500 block">Monthly Avoided Carbon:</span>
              <strong class="text-emerald-800 text-sm">${redVal}</strong>
            </div>
          </div>
        </div>
      `;
      container.classList.remove('hidden');
      if (window.Animations) window.Animations.initScrollReveals(container);
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
      if (window.UI) window.UI.showToast('Scenario roadmap committed to facility decarbonization strategy!', 'success');
    }
  }
};
