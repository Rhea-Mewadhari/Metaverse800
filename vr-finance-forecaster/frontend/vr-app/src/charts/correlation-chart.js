/* global AFRAME */
(function () {
  const THREE = AFRAME.THREE;
  const COLOR_POS = 0xe34948;  // red — positive correlation
  const COLOR_NEG = 0x2a78d6;  // blue — negative correlation
  const COLOR_MID = 0xc3c2b7;  // neutral — near zero

  function divergingColor(v) {
    const mid = new THREE.Color(COLOR_MID);
    return v >= 0
      ? mid.clone().lerp(new THREE.Color(COLOR_POS), Math.min(v, 1))
      : mid.clone().lerp(new THREE.Color(COLOR_NEG), Math.min(-v, 1));
  }

  AFRAME.registerComponent('correlation-chart', {
    schema: {
      src: { type: 'string' },
      cellSize: { type: 'number', default: 0.5 },
      gap: { type: 'number', default: 0.04 },
    },

    init: function () {
      fetch(this.data.src)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          return res.json();
        })
        .then((data) => this.build(data))
        .catch((err) => {
          console.error(`correlation-chart: could not load ${this.data.src}`, err);
          this.showError(String(err));
        });
    },

    build: function (data) {
      const { tickers, matrix } = data;
      const { cellSize, gap } = this.data;
      const n = tickers.length;
      const step = cellSize + gap;
      const totalSize = n * step - gap;

      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          this.addCell(col * step, totalSize - row * step, cellSize, matrix[row][col]);
        }
      }

      tickers.forEach((t, row) => this.addLabel(t, -cellSize / 2 - 0.15, totalSize - row * step, 'right', 2.5));
      tickers.forEach((t, col) => this.addLabel(t, col * step, totalSize + cellSize / 2 + 0.15, 'center', 2.5));

      this.addLabel(`Correlation of daily returns: ${tickers.join(', ')}`, totalSize / 2, totalSize + 0.5, 'center', 4, '#0b0b0b');
      this.addLabel(
        'How to read this: +1.00 means two stocks moved together perfectly; -1.00 means exact ' +
        'opposite directions; 0 means no relationship. Red = positive, blue = negative. Low or ' +
        'negative correlation between holdings is the whole point of diversification.',
        totalSize / 2, -0.45, 'center', 5, '#898781', 48
      );
    },

    addCell: function (x, y, size, value) {
      const color = divergingColor(value);
      const plane = document.createElement('a-plane');
      plane.setAttribute('width', size);
      plane.setAttribute('height', size);
      plane.setAttribute('color', `#${color.getHexString()}`);
      plane.setAttribute('position', `${x} ${y} 0`);
      this.el.appendChild(plane);

      this.addLabel(value.toFixed(2), x, y, 'center', 2.2, '#0b0b0b', null, 0.01);
    },

    addLabel: function (value, x, y, align, width, color, wrapCount, z) {
      const el = document.createElement('a-text');
      el.setAttribute('value', value);
      el.setAttribute('color', color || '#0b0b0b');
      el.setAttribute('align', align);
      el.setAttribute('width', width);
      if (wrapCount) el.setAttribute('wrap-count', wrapCount);
      el.setAttribute('position', `${x} ${y} ${z || 0}`);
      this.el.appendChild(el);
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