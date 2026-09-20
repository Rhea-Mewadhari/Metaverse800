/* global AFRAME */
(function () {
  const THREE = AFRAME.THREE;
  const COLOR_VOL = 0xeb6834; // orange — visually distinct from trend/forecast's blue
  const COLOR_AVG = 0x898781; // muted — reference line, not a data series

  AFRAME.registerComponent('volatility-chart', {
    schema: {
      src: { type: 'string' },
      width: { type: 'number', default: 4 },
      height: { type: 'number', default: 2 },
    },

    init: function () {
      fetch(this.data.src)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          return res.json();
        })
        .then((data) => this.build(data))
        .catch((err) => {
          console.error(`volatility-chart: could not load ${this.data.src}`, err);
          this.showError(String(err));
        });
    },

    build: function (data) {
      const { ticker, window, dates, annualized_volatility_pct } = data;
      const { width, height } = this.data;
      const n = annualized_volatility_pct.length;
      const minV = Math.min(...annualized_volatility_pct);
      const maxV = Math.max(...annualized_volatility_pct);
      const range = maxV - minV || 1;
      const avg = annualized_volatility_pct.reduce((a, b) => a + b, 0) / n;

      const toPoint = (i, v) => new THREE.Vector3((i / (n - 1)) * width, ((v - minV) / range) * height, 0);
      this.addLine(annualized_volatility_pct.map((v, i) => toPoint(i, v)), COLOR_VOL, 'volatility-line',
        { label: `${window}-day volatility`, values: annualized_volatility_pct, dates, unit: '%', xStart: 0, xEnd: width });
      this.addAverageLine(avg, minV, range, width, height);
      this.addFloor(width, height);
      this.addLabels(ticker, window, dates, minV, maxV, avg, width, height);
    },

    addLine: function (points, color, name, meta) {
      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, points.length * 2, 0.015, 6, false);
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
      const mesh = new THREE.Mesh(geometry, material);
      if (meta) Object.assign(mesh.userData, { isDataSeries: true, ...meta });
      this.el.setObject3D(name, mesh);
    },

    addAverageLine: function (avg, minV, range, width, height) {
      const y = ((avg - minV) / range) * height;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, y, 0), new THREE.Vector3(width, y, 0)]);
      const geometry = new THREE.TubeGeometry(curve, 2, 0.005, 4, false);
      const material = new THREE.MeshBasicMaterial({ color: COLOR_AVG, transparent: true, opacity: 0.6 });
      this.el.setObject3D('average-line', new THREE.Mesh(geometry, material));

      const label = document.createElement('a-text');
      label.setAttribute('value', `avg: ${avg.toFixed(1)}%`);
      label.setAttribute('color', '#898781');
      label.setAttribute('width', 2);
      label.setAttribute('position', `${width + 0.1} ${y} 0`);
      this.el.appendChild(label);
    },

    addFloor: function (width, height) {
      const grid = new THREE.GridHelper(Math.max(width, height) * 1.4, 14, 0x898781, 0xc3c2b7);
      grid.position.set(width / 2, 0, 0);
      this.el.setObject3D('floor-grid', grid);
    },

    addLabels: function (ticker, window, dates, minV, maxV, avg, width, height) {
      const makeText = (value, x, y, z, color, opts = {}) => {
        const el = document.createElement('a-text');
        el.setAttribute('value', value);
        el.setAttribute('color', color);
        el.setAttribute('align', opts.align || 'left');
        el.setAttribute('width', opts.width || 3);
        if (opts.wrapCount) el.setAttribute('wrap-count', opts.wrapCount);
        el.setAttribute('position', `${x} ${y} ${z}`);
        this.el.appendChild(el);
      };

      makeText(`${ticker} — ${window}-day rolling annualized volatility`, 0, height + 0.35, 0, '#0b0b0b');
      makeText(`${maxV.toFixed(1)}%`, -0.3, height, 0, '#52514e', { align: 'right' });
      makeText(`${minV.toFixed(1)}%`, -0.3, 0, 0, '#52514e', { align: 'right' });
      makeText(dates[0], 0, -0.25, 0, '#898781');
      makeText(dates[dates.length - 1], width, -0.25, 0, '#898781', { align: 'right' });
      makeText(
        'How to read this: this line is how much the price has been swinging, not which ' +
        'direction — higher means bigger daily moves recently, not bigger gains. The flat ' +
        `average line (${avg.toFixed(1)}%) is this stock's typical turbulence; spikes above it ` +
        'are when the forecast and Monte Carlo charts should be trusted less.',
        0, -0.55, 0, '#898781', { width: 4, wrapCount: 44 }
      );
    },

    showError: function (message) {
      const text = document.createElement('a-text');
      text.setAttribute('value', `Failed to load chart data:\n${message}`);
      text.setAttribute('color', '#d03b3b');
      text.setAttribute('width', 3);
      this.el.appendChild(text);
    },
  });
})();