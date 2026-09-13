/**
 * CarbonLens SME - Motion Engine & Interactive Ecosystem Visualizer
 * Hero SVG/Canvas Circular Carbon Ecosystem, Custom Desktop Cursor, Spotlight Tracker,
 * Scroll Reveals & Animated Number Counters.
 */

window.Animations = {
  canvas: null,
  ctx: null,
  animationFrameId: null,
  particles: [],
  nodes: [],
  mouse: { x: 0, y: 0, hoverNode: null },
  
  // Custom Cursor variables
  cursorPos: { x: -100, y: -100 },
  ringPos: { x: -100, y: -100 },
  cursorDot: null,
  cursorRing: null,
  _observer: null,

  init() {
    this.initCustomCursor();
    this.initSpotlightTracker();
    this.initScrollReveals();
  },

  /**
   * Cleans up custom cursor trailing ring elements (uses crisp native OS cursor)
   */
  initCustomCursor() {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (dot) dot.remove();
    if (ring) ring.remove();
    document.body.style.cursor = 'default';
  },

  /**
   * Spotlight Card Mouse Tracker (Cards only, strictly avoids map/marker elements)
   */
  initSpotlightTracker() {
    document.addEventListener('mousemove', (e) => {
      const elements = document.querySelectorAll('.spotlight-card, .hero-metric-box');
      elements.forEach(el => {
        if (el.closest('.leaflet-container')) return;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        el.style.setProperty('--mouse-x', `${x}px`);
        el.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  },

  initMagneticButtons() {
    // Disabled to guarantee 100% stability and prevent overriding coordinates of Leaflet GIS map pins
  },


  /**
   * Animated Rolling Number Counter
   */
  animateCounter(targetEl, targetValue, duration = 1000, decimals = 2, suffix = '') {
    const el = typeof targetEl === 'string' ? document.getElementById(targetEl) : targetEl;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = `${targetValue.toFixed(decimals)}${suffix}`;
      return;
    }

    const startValue = 0;
    const startTime = performance.now();

    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (targetValue - startValue) * easeProgress;

      el.textContent = `${current.toFixed(decimals)}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = `${targetValue.toFixed(decimals)}${suffix}`;
      }
    };

    requestAnimationFrame(update);
  },

  /**
   * Scroll Reveal Observer (Supports dynamic container initialization & instant reveal)
  /**
   * True Scroll-Driven Lazy Reveal Engine
   * Reveals ONLY elements in active viewport top; reveals below-the-fold elements progressively as user scrolls down.
   */
  initScrollReveals(parentEl = document) {
    const root = typeof parentEl === 'string' ? document.getElementById(parentEl) : parentEl;
    if (!root) return;

    if (!('IntersectionObserver' in window)) {
      this.revealContainer(root);
      return;
    }

    if (!this._observer) {
      this._observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            this._observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -30px 0px', threshold: 0.05 });
    }

    const elements = root.querySelectorAll ? root.querySelectorAll('.reveal, .reveal-up, .reveal-stagger') : [];
    elements.forEach(el => {
      if (!el.classList.contains('revealed')) {
        this._observer.observe(el);
      }
    });

    // Double RAF layout recalculation: Only reveal items strictly inside current visible viewport
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const vh = window.innerHeight || document.documentElement.clientHeight;
        elements.forEach((el, index) => {
          const rect = el.getBoundingClientRect();
          // Strictly reveal only elements currently visible on screen; keep off-screen items hidden until scrolled
          if (rect.top >= 0 && rect.top < vh - 40 && rect.bottom > 0) {
            setTimeout(() => {
              el.classList.add('revealed');
            }, Math.min(index * 50, 200));
          }
        });
      });
    });
  },

  revealContainer(containerIdOrEl) {
    const container = typeof containerIdOrEl === 'string' ? document.getElementById(containerIdOrEl) : containerIdOrEl;
    if (!container) return;
    const elements = container.querySelectorAll ? container.querySelectorAll('.reveal, .reveal-up, .reveal-stagger') : [];
    elements.forEach(el => el.classList.add('revealed'));
  },

  /**
   * Interactive Circular Carbon Ecosystem Canvas Visualizer
   */
  initEcosystemCanvas(canvasId = 'ecosystem-canvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      this.setupNodes(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    // Track mouse for light parallax & hover node
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      } else {
        this.loop();
      }
    });

    this.loop();
  },

  setupNodes(w, h) {
    const isMobile = w < 440;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = Math.min(w, h) * (isMobile ? 0.32 : 0.36);

    const centerRadius = isMobile ? 24 : 36;
    const nodeRadius = isMobile ? 12 : 18;

    this.nodes = [
      { id: 'center', label: 'CARBONLENS', x: cx, y: cy, radius: centerRadius, isCenter: true, color: '#18583F' },
      { id: 'virgin', label: 'Virgin Polymer', angle: -Math.PI * 0.75, color: '#6B7280' },
      { id: 'grid', label: 'Grid Electricity', angle: -Math.PI * 0.25, color: '#3B82F6' },
      { id: 'plant', label: 'Factory Unit', angle: 0, color: '#10B981' },
      { id: 'waste', label: 'Landfill Waste', angle: Math.PI * 0.35, color: '#EF4444' },
      { id: 'regrind', label: 'In-House Regrind', angle: Math.PI * 0.7, color: '#059669' },
      { id: 'pcr', label: 'Recycled PCR', angle: Math.PI * 1.1, color: '#18583F' },
      { id: 'solar', label: 'Rooftop Solar', angle: -Math.PI * 0.5, color: '#F59E0B' }
    ];

    this.nodes.forEach(n => {
      if (!n.isCenter) {
        n.x = cx + r * Math.cos(n.angle);
        n.y = cy + r * Math.sin(n.angle);
        n.radius = nodeRadius;
      }
    });

    // Particle flow paths
    this.particles = [];
    for (let i = 0; i < (isMobile ? 14 : 24); i++) {
      this.particles.push({
        from: this.nodes[1 + (i % 6)],
        to: this.nodes[0],
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.004,
        size: isMobile ? 2 : 3
      });
    }
  },

  loop() {
    if (!this.canvas || !this.ctx) return;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.clearRect(0, 0, w, h);

    // Draw connection flow lines
    this.nodes.forEach(n => {
      if (!n.isCenter) {
        const center = this.nodes[0];
        this.ctx.beginPath();
        this.ctx.moveTo(n.x, n.y);
        this.ctx.quadraticCurveTo(w * 0.5, h * 0.5, center.x, center.y);
        this.ctx.strokeStyle = 'rgba(24, 88, 63, 0.15)';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([4, 4]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    });

    // Draw animated moving flow particles
    this.particles.forEach(p => {
      p.progress += p.speed;
      if (p.progress >= 1) p.progress = 0;

      const px = p.from.x + (p.to.x - p.from.x) * p.progress;
      const py = p.from.y + (p.to.y - p.from.y) * p.progress;

      this.ctx.beginPath();
      this.ctx.arc(px, py, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.from.color;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.from.color;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });

    // Draw Nodes
    const isMobile = w < 440;
    this.nodes.forEach(n => {
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = n.isCenter ? '#18583F' : '#FFFFFF';
      this.ctx.strokeStyle = n.color;
      this.ctx.lineWidth = isMobile ? 2 : 3;
      this.ctx.shadowBlur = n.isCenter ? 14 : 5;
      this.ctx.shadowColor = n.color;
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;

      // Draw Node Labels
      this.ctx.font = n.isCenter ? (isMobile ? 'bold 9px Inter' : 'bold 11px Inter') : (isMobile ? '8.5px Inter' : '10px Inter');
      this.ctx.fillStyle = n.isCenter ? '#FFFFFF' : '#111827';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(n.label, n.x, n.isCenter ? n.y : n.y + n.radius + (isMobile ? 9 : 12));
    });

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.Animations.init();
});
