/**
 * Visualization & Chart Engine for CarbonLens SME
 * Arenius-inspired proportional distribution treemap & Chart.js visualizers
 */

const Charts = {
  overviewDonut: null,
  simulatorBar: null,

  /**
   * Renders Arenius-Style Proportional Stacked Treemap Bar
   */
  renderTreemap(containerId, categoryBreakdown, totalCO2e) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!categoryBreakdown || totalCO2e <= 0) {
      container.innerHTML = `<div class="p-4 text-center text-xs text-gray-400 font-mono">No emission distribution data available</div>`;
      return;
    }

    const colors = {
      'Raw Materials': '#18583f',      // Deep Forest Green
      'Electricity': '#2e7d5b',        // Medium Green
      'Thermal Energy': '#529d79',     // Sage Green
      'Waste Stream': '#8fb9a4'        // Muted Soft Green
    };

    let segmentsHtml = '';
    Object.keys(categoryBreakdown).forEach(cat => {
      const co2 = categoryBreakdown[cat];
      const pct = (co2 / totalCO2e) * 100;
      if (pct > 0) {
        const color = colors[cat] || '#18583f';
        segmentsHtml += `
          <div class="treemap-segment" style="width: ${pct}%; background-color: ${color};" title="${cat}: ${co2.toFixed(2)} tCO₂e (${pct.toFixed(1)}%)">
            <span>${cat} (${pct.toFixed(0)}%)</span>
          </div>
        `;
      }
    });

    container.innerHTML = `<div class="treemap-bar-container">${segmentsHtml}</div>`;
  },

  /**
   * Renders Overview Donut Chart via Chart.js
   */
  renderOverviewDonut(canvasId, categoryBreakdown) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.overviewDonut) {
      this.overviewDonut.destroy();
    }

    const labels = Object.keys(categoryBreakdown || {});
    const data = labels.map(k => categoryBreakdown[k]);
    const palette = ['#18583f', '#2e7d5b', '#529d79', '#8fb9a4', '#b6d5c6'];

    this.overviewDonut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: palette.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { family: 'Inter', size: 12 }, usePointStyle: true, boxWidth: 8 }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.label}: ${context.raw} tCO₂e/mo`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
  },

  /**
   * Renders Baseline vs Projected Comparison Bar Chart
   */
  renderSimulatorComparisonBar(canvasId, baselineVal, projectedVal) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.simulatorBar) {
      this.simulatorBar.destroy();
    }

    this.simulatorBar = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Current Footprint', 'Projected Footprint'],
        datasets: [{
          label: 'Monthly CO₂e (Tonnes)',
          data: [baselineVal, projectedVal],
          backgroundColor: ['#6b7280', '#18583f'],
          borderRadius: 6,
          barThickness: 36
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f3f4f6' },
            ticks: { font: { family: 'Inter', size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 } }
          }
        }
      }
    });
  }
};
