/**
 * Visualization & Chart Engine for CarbonLens SME
 * Proportional Treemap & Upgraded Chart.js Visualizers with Linked Hover & Center Morphing
 */

const Charts = {
  overviewDonut: null,
  simulatorBar: null,
  activeCategory: null,

  /**
   * Renders Proportional Stacked Treemap Bar
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
          <div class="treemap-segment" data-category="${cat}" style="width: ${pct}%; background-color: ${color};" title="${cat}: ${co2.toFixed(2)} tCO₂e (${pct.toFixed(1)}%)">
            <span>${cat} (${pct.toFixed(0)}%)</span>
          </div>
        `;
      }
    });

    container.innerHTML = `<div class="treemap-bar-container">${segmentsHtml}</div>`;

    // Bind linked hover listeners on treemap segments
    container.querySelectorAll('.treemap-segment').forEach(seg => {
      seg.addEventListener('mouseenter', () => {
        const cat = seg.getAttribute('data-category');
        this.highlightCategory(cat);
      });
      seg.addEventListener('mouseleave', () => {
        this.clearCategoryHighlight();
      });
    });
  },

  _donutObserver: null,
  _donutAnimated: false,

  /**
   * Attaches IntersectionObserver to Donut Chart canvas so animation triggers
   * live the exact moment the user scrolls down to the chart section.
   */
  setupDonutScrollObserver(canvas) {
    if (!('IntersectionObserver' in window)) return;
    if (this._donutObserver) {
      this._donutObserver.disconnect();
    }
    this._donutAnimated = false;

    this._donutObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this._donutAnimated) {
          this._donutAnimated = true;
          this.animateOverviewDonut();
        }
      });
    }, { threshold: 0.15 });

    this._donutObserver.observe(canvas);
  },

  /**
   * Re-triggers Overview Donut Chart Animation live when scrolled into view
   */
  animateOverviewDonut() {
    const canvas = document.getElementById('dashDonutChart');
    if (!this.overviewDonut) return;

    if (canvas && canvas.parentElement) {
      canvas.parentElement.classList.remove('animate-donut-pop');
      void canvas.parentElement.offsetWidth;
      canvas.parentElement.classList.add('animate-donut-pop');
    }

    // Enable smooth 360 sweep and scale animation live on scroll
    this.overviewDonut.options.animation = {
      animateScale: true,
      animateRotate: true,
      duration: 1400,
      easing: 'easeOutQuart',
      delay: (context) => {
        let delay = 0;
        if (context.type === 'data' && context.mode === 'default') {
          delay = context.dataIndex * 180;
        }
        return delay;
      }
    };

    this.overviewDonut.reset();
    this.overviewDonut.update('default');
  },

  /**
   * Upgraded Donut Chart with Center Text Morphing & Scroll-Triggered Sweep Draw
   */
  renderOverviewDonut(canvasId, categoryBreakdown) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.overviewDonut) {
      this.overviewDonut.destroy();
    }

    const labels = Object.keys(categoryBreakdown || {});
    const data = labels.map(k => categoryBreakdown[k]);
    const totalCO2 = data.reduce((a, b) => a + b, 0);
    const palette = ['#18583f', '#2e7d5b', '#529d79', '#8fb9a4', '#b6d5c6'];

    const centerPlugin = {
      id: 'donutCenterText',
      beforeDraw: (chart) => {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;

        // Accurately compute donut center point regardless of legend position
        const meta = chart.getDatasetMeta(0);
        let centerX = (chartArea.left + chartArea.right) / 2;
        let centerY = (chartArea.top + chartArea.bottom) / 2;

        if (meta && meta.data && meta.data.length > 0 && typeof meta.data[0].x === 'number') {
          centerX = meta.data[0].x;
          centerY = meta.data[0].y;
        }

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (this.activeCategory && categoryBreakdown[this.activeCategory] !== undefined) {
          const val = categoryBreakdown[this.activeCategory];
          const pct = totalCO2 > 0 ? ((val / totalCO2) * 100).toFixed(1) : '0.0';
          
          // Truncate category name if too long for center cutout
          const catLabel = this.activeCategory.length > 13 
            ? this.activeCategory.substring(0, 11).toUpperCase() + '..' 
            : this.activeCategory.toUpperCase();

          ctx.font = '600 10px Inter';
          ctx.fillStyle = '#6B7280';
          ctx.fillText(catLabel, centerX, centerY - 14);

          ctx.font = 'bold 15px Roboto Mono';
          ctx.fillStyle = '#111827';
          ctx.fillText(`${val.toFixed(2)} t`, centerX, centerY + 2);

          ctx.font = '600 11px Roboto Mono';
          ctx.fillStyle = '#10B981';
          ctx.fillText(`${pct}%`, centerX, centerY + 18);
        } else {
          ctx.font = '600 9.5px Inter';
          ctx.fillStyle = '#9CA3AF';
          ctx.fillText('TOTAL FOOTPRINT', centerX, centerY - 10);

          ctx.font = 'bold 15px Roboto Mono';
          ctx.fillStyle = '#111827';
          ctx.fillText(`${totalCO2.toFixed(2)} t`, centerX, centerY + 8);
        }
        ctx.restore();
      }
    };

    // Instantiate with animation: false so it doesn't play off-screen before scrolling
    this.overviewDonut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: palette.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverBorderColor: '#18583f',
          hoverBorderWidth: 3,
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        onHover: (event, activeElements) => {
          if (activeElements && activeElements.length > 0) {
            const index = activeElements[0].index;
            this.activeCategory = labels[index];
            this.highlightCategory(this.activeCategory);
          } else {
            this.activeCategory = null;
            this.clearCategoryHighlight();
          }
          this.overviewDonut.draw();
        },
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { family: 'Inter', size: 11 }, usePointStyle: true, boxWidth: 8 }
          },
          tooltip: {
            backgroundColor: '#111827',
            titleFont: { family: 'Inter', size: 12, weight: 'bold' },
            bodyFont: { family: 'Roboto Mono', size: 11 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const val = context.raw;
                const pct = ((val / totalCO2) * 100).toFixed(1);
                return ` ${context.label}: ${val.toFixed(2)} tCO₂e (${pct}%)`;
              }
            }
          }
        },
        cutout: '72%'
      },
      plugins: [centerPlugin]
    });

    this.setupDonutScrollObserver(canvas);
  },

  /**
   * Renders Baseline vs Projected Comparison Bar Chart with smooth data transition
   */
  renderSimulatorComparisonBar(canvasId, baselineVal, projectedVal) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const deltaSaved = Math.max(0, baselineVal - projectedVal);
    const deltaLabelEl = document.getElementById('sim-chart-delta-label');
    if (deltaLabelEl) {
      deltaLabelEl.textContent = deltaSaved > 0 ? `-${deltaSaved.toFixed(2)} tCO₂e avoided` : 'Baseline strategy';
      deltaLabelEl.className = deltaSaved > 0 ? 'font-bold text-emerald-800 font-mono' : 'text-gray-500 font-mono';
    }

    if (this.simulatorBar && this.simulatorBar.canvas && this.simulatorBar.canvas.id === canvasId) {
      this.simulatorBar.data.datasets[0].data = [baselineVal, projectedVal];
      this.simulatorBar.data.datasets[0].backgroundColor = [
        '#94A3B8',
        projectedVal < baselineVal ? '#10B981' : '#18583F'
      ];
      this.simulatorBar.update();
      return;
    }

    if (this.simulatorBar) {
      this.simulatorBar.destroy();
    }

    this.simulatorBar = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Current Footprint', 'Projected Scenario'],
        datasets: [{
          label: 'Monthly CO₂e (Tonnes)',
          data: [baselineVal, projectedVal],
          backgroundColor: ['#94A3B8', projectedVal < baselineVal ? '#10B981' : '#18583F'],
          hoverBackgroundColor: ['#64748B', '#047857'],
          borderRadius: 8,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 500,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827',
            titleFont: { family: 'Inter', size: 12, weight: 'bold' },
            bodyFont: { family: 'Roboto Mono', size: 11 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw.toFixed(2)} tCO₂e/mo`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#F1F5F9' },
            ticks: { font: { family: 'Roboto Mono', size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11, weight: '600' } }
          }
        }
      }
    });
  },

  /**
   * Category Canonical Normalizer for High-Precision Cross-Component Linking
   */
  normalizeCategory(cat) {
    if (!cat) return '';
    const c = String(cat).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (c.includes('material') || c.includes('polymer') || c.includes('hdpe') || c.includes('pp') || c.includes('ldpe') || c.includes('pet') || c.includes('resin')) {
      return 'materials';
    }
    if (c.includes('elec') || c.includes('grid') || c.includes('power') || c.includes('energy') && !c.includes('diesel')) {
      return 'electricity';
    }
    if (c.includes('diesel') || c.includes('thermal') || c.includes('fuel') || c.includes('gas') || c.includes('png')) {
      return 'thermal';
    }
    if (c.includes('waste') || c.includes('scrap') || c.includes('landfill') || c.includes('incinerat')) {
      return 'waste';
    }
    return c;
  },

  /**
   * Linked UI Category Highlight Engine:
   * Coordinated highlighting across Treemap, Donut, Priority Leak-Points, and Analysis Table
   */
  highlightCategory(categoryName) {
    if (!categoryName) return;
    const targetNorm = this.normalizeCategory(categoryName);
    this.activeCategory = categoryName;

    // 1. Treemap linked highlight
    document.querySelectorAll('#dash-treemap-container .treemap-segment').forEach(seg => {
      const segCat = seg.getAttribute('data-category') || seg.textContent;
      const segNorm = this.normalizeCategory(segCat);
      if (segNorm === targetNorm) {
        seg.classList.add('is-highlighted');
        seg.classList.remove('is-dimmed');
      } else {
        seg.classList.add('is-dimmed');
        seg.classList.remove('is-highlighted');
      }
    });

    // 2. Donut Chart linked active slice
    if (this.overviewDonut && this.overviewDonut.data && this.overviewDonut.data.labels) {
      const labels = this.overviewDonut.data.labels;
      const idx = labels.findIndex(l => this.normalizeCategory(l) === targetNorm);
      if (idx !== -1) {
        this.overviewDonut.setActiveElements([{ datasetIndex: 0, index: idx }]);
        this.overviewDonut.tooltip?.setActiveElements([{ datasetIndex: 0, index: idx }], { x: 0, y: 0 });
      }
      this.overviewDonut.draw();
    }

    // 3. Priority Leak-Points linked highlight
    document.querySelectorAll('#dash-leakpoints-list > div, #leakpoints-view-list > div').forEach(card => {
      const cardCat = card.getAttribute('data-category') || card.textContent;
      const cardNorm = this.normalizeCategory(cardCat);
      if (cardNorm === targetNorm) {
        card.classList.add('is-highlighted');
      } else {
        card.classList.remove('is-highlighted');
      }
    });

    // 4. Analysis Table Rows linked highlight
    document.querySelectorAll('#analysis-table-body tr').forEach(row => {
      const rowCat = row.getAttribute('data-category') || row.textContent;
      const rowNorm = this.normalizeCategory(rowCat);
      if (rowNorm === targetNorm) {
        row.classList.add('is-highlighted');
      } else {
        row.classList.remove('is-highlighted');
      }
    });
  },

  clearCategoryHighlight() {
    this.activeCategory = null;

    // Reset Treemap
    document.querySelectorAll('#dash-treemap-container .treemap-segment').forEach(seg => {
      seg.classList.remove('is-highlighted', 'is-dimmed');
    });

    // Reset Donut
    if (this.overviewDonut) {
      this.overviewDonut.setActiveElements([]);
      this.overviewDonut.tooltip?.setActiveElements([], { x: 0, y: 0 });
      this.overviewDonut.draw();
    }

    // Reset Leak-Point Cards
    document.querySelectorAll('#dash-leakpoints-list > div, #leakpoints-view-list > div').forEach(card => {
      card.classList.remove('is-highlighted', 'is-dimmed');
    });

    // Reset Analysis Table
    document.querySelectorAll('#analysis-table-body tr').forEach(row => {
      row.classList.remove('is-highlighted', 'is-dimmed');
    });
  }
};
