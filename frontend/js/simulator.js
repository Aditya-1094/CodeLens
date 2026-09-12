/**
 * What-If Simulator Module for CarbonLens SME
 * Connects scenario sliders to Python backend simulation engine
 */

const Simulator = {
  currentInputs: null,
  activeLevers: {
    pcrBlendPct: 0,
    regrindRecoveryPct: 0,
    renewableElecPct: 0
  },

  init(assessmentInputs) {
    this.currentInputs = assessmentInputs;
    this.bindControls();
  },

  bindControls() {
    const sliderPcr = document.getElementById('sim-slider-pcr');
    const sliderRegrind = document.getElementById('sim-slider-regrind');
    const sliderSolar = document.getElementById('sim-slider-solar');

    if (sliderPcr) {
      sliderPcr.addEventListener('input', () => {
        const val = parseFloat(sliderPcr.value);
        document.getElementById('sim-val-pcr').textContent = `${val}%`;
        this.activeLevers.pcrBlendPct = val;
        this.triggerSimulation();
      });
    }

    if (sliderRegrind) {
      sliderRegrind.addEventListener('input', () => {
        const val = parseFloat(sliderRegrind.value);
        document.getElementById('sim-val-regrind').textContent = `${val}%`;
        this.activeLevers.regrindRecoveryPct = val;
        this.triggerSimulation();
      });
    }

    if (sliderSolar) {
      sliderSolar.addEventListener('input', () => {
        const val = parseFloat(sliderSolar.value);
        document.getElementById('sim-val-solar').textContent = `${val}%`;
        this.activeLevers.renewableElecPct = val;
        this.triggerSimulation();
      });
    }

    const btnUseScenario = document.getElementById('btn-use-scenario');
    if (btnUseScenario) {
      btnUseScenario.addEventListener('click', () => this.applyFinalActionSummary());
    }
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
    // Update metric cards
    const baseEl = document.getElementById('sim-metric-baseline');
    const projEl = document.getElementById('sim-metric-projected');
    const redAbsEl = document.getElementById('sim-metric-red-abs');
    const redPctEl = document.getElementById('sim-metric-red-pct');
    const finTextEl = document.getElementById('sim-metric-financial');
    const explanationEl = document.getElementById('sim-explanation-list');

    if (baseEl) baseEl.textContent = `${res.baseline_co2e_tonnes.toFixed(2)} t`;
    if (projEl) projEl.textContent = `${res.projected_co2e_tonnes.toFixed(2)} t`;
    if (redAbsEl) redAbsEl.textContent = `-${res.net_reduction_tonnes.toFixed(2)} tCO₂e/mo`;
    if (redPctEl) redPctEl.textContent = `-${res.net_reduction_pct.toFixed(1)}%`;
    if (finTextEl) finTextEl.textContent = res.financial_impact_text;

    if (explanationEl) {
      explanationEl.innerHTML = (res.mathematical_explanation || []).map(exp => `
        <li class="flex items-start gap-2 text-xs font-mono text-gray-700">
          <span class="text-emerald-800 font-bold">✓</span> ${exp}
        </li>
      `).join('') || `<li class="text-xs text-gray-400 font-mono">Move sliders above to test scenario reduction levers.</li>`;
    }

    // Re-render Bar Chart
    Charts.renderSimulatorComparisonBar('simBarChart', res.baseline_co2e_tonnes, res.projected_co2e_tonnes);
  },

  applyFinalActionSummary() {
    const projVal = document.getElementById('sim-metric-projected')?.textContent || '0 t';
    const redVal = document.getElementById('sim-metric-red-abs')?.textContent || '0 t';
    
    const container = document.getElementById('final-action-container');
    if (container) {
      container.innerHTML = `
        <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3 font-mono text-xs">
          <div class="font-bold text-emerald-950 text-sm flex items-center gap-2">
            <span>✅ Recommended Action Roadmap</span>
          </div>
          <div class="text-emerald-900">
            <strong>Active Scenario Levers:</strong> ${Object.keys(this.activeLevers).filter(k => this.activeLevers[k] > 0).join(', ') || 'Baseline Standard'}
          </div>
          <div class="grid grid-cols-2 gap-4 pt-2 border-t border-emerald-200">
            <div><strong>Projected Emissions:</strong> ${projVal}</div>
            <div><strong>Total Monthly Cut:</strong> ${redVal}</div>
          </div>
        </div>
      `;
      container.classList.remove('hidden');
    }
  }
};
