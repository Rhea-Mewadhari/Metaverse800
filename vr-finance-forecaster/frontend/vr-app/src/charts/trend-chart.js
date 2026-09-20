/* global AFRAME */
(function () {
  const THREE = AFRAME.THREE;

  const COLOR_CLOSE = 0x2a78d6;
  const COLOR_SMA = 0xeb6834;

  AFRAME.registerComponent('trend-chart', {
    schema: {
      src: { type: 'string' },
      width: { type: 'number', default: 4 },   // meters along the time axis
      height: { type: 'number', default: 2 },  // meters at the highest price point
    },

    init: function () {
      fetch(this.data.src)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          return res.json();
        })
        .then((data) => this.build(data))
        .catch((err) => {
          console.error(`trend-chart: could not load ${this.data.src}`, err);
          this.showError(String(err));
        });
    },

    addLine: function (points, color, name, meta) {
      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, points.length * 2, 0.015, 6, false);
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
      const mesh = new THREE.Mesh(geometry, material);
      if (meta) Object.assign(mesh.userData, { isDataSeries: true, ...meta });
      this.el.setObject3D(name, mesh);
    },

    build: function (data) {
      const { dates, close, sma, ticker, window } = data;
      const { width, height } = this.data;
      const n = close.length;

      // both series share one scale — never a second, independent y-axis
      const all = close.concat(sma);
      const minV = Math.min(...all);
      const maxV = Math.max(...all);
      const range = maxV - minV || 1;

      const toPoint = (i, v) => new THREE.Vector3(
        (i / (n - 1)) * width,
        ((v - minV) / range) * height,
        0
      );

      this.addLine(close.map((v, i) => toPoint(i, v)), COLOR_CLOSE, 'close-line',
        { label: 'Close price', values: close, dates, unit: '$', xStart: 0, xEnd: width });
      this.addLine(sma.map((v, i) => toPoint(i, v)), COLOR_SMA, 'sma-line',
        { label: `${window}-day average`, values: sma, dates, unit: '$', xStart: 0, xEnd: width });
      this.addFloor(width, height);
      this.addLabels(ticker, window, dates, minV, maxV, width, height);
    },

    // A THREE.Line renders 1px regardless of distance — invisible from a few
    // meters away in a headset. A thin tube stays legible at VR viewing range.
    addLine: function (points, color, name) {
      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, points.length * 2, 0.015, 6, false);
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
      this.el.setObject3D(name, new THREE.Mesh(geometry, material));
    },

    addFloor: function (width, height) {
      const grid = new THREE.GridHelper(Math.max(width, height) * 1.4, 14, 0x898781, 0xc3c2b7);
      grid.position.set(width / 2, 0, 0);
      this.el.setObject3D('floor-grid', grid);
    },

    addLabels: function (ticker, window, dates, minV, maxV, width, height) {
      const makeText = (value, x, y, z, color, alignOrOpts) => {
      const opts = typeof alignOrOpts === 'string' ? { align: alignOrOpts } : (alignOrOpts || {});
      const el = document.createElement('a-text');
      el.setAttribute('value', value);
      el.setAttribute('color', color);
      el.setAttribute('align', opts.align || 'left');
      el.setAttribute('width', opts.width || 3);
      if (opts.wrapCount) el.setAttribute('wrap-count', opts.wrapCount);
      el.setAttribute('position', `${x} ${y} ${z}`);
      this.el.appendChild(el);
    };

      makeText(`${ticker} — Close vs ${window}-day average`, 0, height + 0.35, 0, '#0b0b0b');
      makeText(`$${maxV.toFixed(0)}`, -0.3, height, 0, '#52514e', 'right');
      makeText(`$${minV.toFixed(0)}`, -0.3, 0, 0, '#52514e', 'right');
      makeText(dates[0], 0, -0.25, 0, '#898781');
      makeText(dates[dates.length - 1], width, -0.25, 0, '#898781', 'right');
      makeText(
        'How to read this: blue is the actual daily closing price; orange smooths it into ' +
        `a ${window}-day moving average, filtering short-term noise to reveal the underlying ` +
        'trend. Blue crossing above orange signals short-term upward momentum; below signals downward.',
        0, -0.55, 0, '#898781', { width: 4, wrapCount: 44 }
      );

      // legend — identity is never color-alone, so every line gets a labeled swatch
      this.addLegendItem('Close price', COLOR_CLOSE, width + 0.6, height, 0);
      this.addLegendItem(`${window}-day average`, COLOR_SMA, width + 0.6, height - 0.3, 0);
    },

    addLegendItem: function (label, color, x, y, z) {
      const swatch = document.createElement('a-box');
      swatch.setAttribute('width', 0.08);
      swatch.setAttribute('height', 0.08);
      swatch.setAttribute('depth', 0.02);
      swatch.setAttribute('color', `#${color.toString(16).padStart(6, '0')}`);
      swatch.setAttribute('position', `${x} ${y} ${z}`);
      this.el.appendChild(swatch);

      const text = document.createElement('a-text');
      text.setAttribute('value', label);
      text.setAttribute('color', '#0b0b0b');
      text.setAttribute('align', 'left');
      text.setAttribute('width', 3);
      text.setAttribute('position', `${x + 0.15} ${y} ${z}`);
      this.el.appendChild(text);
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