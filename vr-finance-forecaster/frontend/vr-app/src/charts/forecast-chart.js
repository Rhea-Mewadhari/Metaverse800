/* global AFRAME */
(function () {
  const THREE = AFRAME.THREE;

  const COLOR_HISTORY = 0x2a78d6;   // slot 1 blue
  const COLOR_PREDICTED = 0xeb6834; // slot 2 orange
  const COLOR_ACTUAL = 0x1baf7a;    // slot 3 aqua

  AFRAME.registerComponent('forecast-chart', {
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
          console.error(`forecast-chart: could not load ${this.data.src}`, err);
          this.showError(String(err));
        });
    },

    build: function (data) {
      const {
        ticker, trained_on_days, forecast_days, history_dates,
        history_close, predicted, actual_future, mean_absolute_error,
      } = data;
      const { width, height } = this.data;

      const totalPoints = trained_on_days + forecast_days;
      const allValues = history_close.concat(predicted, actual_future || []);
      const minV = Math.min(...allValues);
      const maxV = Math.max(...allValues);
      const range = maxV - minV || 1;

      const toPoint = (i, v) => new THREE.Vector3(
        (i / (totalPoints - 1)) * width,
        ((v - minV) / range) * height,
        0
      );

      const historyPoints = history_close.map((v, i) => toPoint(i, v));
      const historyXEnd = historyPoints[historyPoints.length - 1].x;

      this.addLine(historyPoints, COLOR_HISTORY, 'history-line',
        { label: 'Historical price', values: history_close, dates: history_dates, unit: '$', xStart: 0, xEnd: historyXEnd });

      // predicted starts exactly where history ends, so the lines visually connect
      const predictedPoints = predicted.map((v, i) => toPoint(trained_on_days - 1 + i, v));
      predictedPoints.unshift(historyPoints[historyPoints.length - 1]);
      this.addLine(predictedPoints, COLOR_PREDICTED, 'predicted-line',
        { label: 'Predicted forecast', values: predicted, dates: null, unit: '$', xStart: historyXEnd, xEnd: width });

      if (actual_future) {
        const actualPoints = actual_future.map((v, i) => toPoint(trained_on_days - 1 + i, v));
        actualPoints.unshift(historyPoints[historyPoints.length - 1]);
        this.addLine(actualPoints, COLOR_ACTUAL, 'actual-line',
          { label: 'What actually happened', values: actual_future, dates: null, unit: '$', xStart: historyXEnd, xEnd: width });
      }

      this.addDivider(trained_on_days, totalPoints, width, height);
      this.addFloor(width, height);
      this.addLabels(ticker, forecast_days, mean_absolute_error, minV, maxV, width, height, !!actual_future);
    },

    addLine: function (points, color, name, meta) {
      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, points.length * 2, 0.015, 6, false);
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
      const mesh = new THREE.Mesh(geometry, material);
      if (meta) Object.assign(mesh.userData, { isDataSeries: true, ...meta });
      this.el.setObject3D(name, mesh);
    },

    addDivider: function (trainedOnDays, totalPoints, width, height) {
      const x = ((trainedOnDays - 1) / (totalPoints - 1)) * width;
      const geometry = new THREE.PlaneGeometry(0.01, height);
      const material = new THREE.MeshBasicMaterial({ color: 0xc3c2b7, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const plane = new THREE.Mesh(geometry, material);
      plane.position.set(x, height / 2, 0);
      this.el.setObject3D('today-divider', plane);

      const label = document.createElement('a-text');
      label.setAttribute('value', 'forecast starts here');
      label.setAttribute('color', '#898781');
      label.setAttribute('align', 'center');
      label.setAttribute('width', 2);
      label.setAttribute('position', `${x} ${height + 0.15} 0`);
      this.el.appendChild(label);
    },

    addFloor: function (width, height) {
      const grid = new THREE.GridHelper(Math.max(width, height) * 1.4, 14, 0x898781, 0xc3c2b7);
      grid.position.set(width / 2, 0, 0);
      this.el.setObject3D('floor-grid', grid);
    },

    addLabels: function (ticker, forecastDays, mae, minV, maxV, width, height, hasActual) {
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

      makeText(`${ticker} — ${forecastDays}-day linear regression forecast`, 0, height + 0.35, 0, '#0b0b0b');
      makeText(`$${maxV.toFixed(0)}`, -0.3, height, 0, '#52514e', { align: 'right' });
      makeText(`$${minV.toFixed(0)}`, -0.3, 0, 0, '#52514e', { align: 'right' });

      this.addLegendItem('Historical price', COLOR_HISTORY, width + 0.6, height, 0);
      this.addLegendItem('Predicted forecast', COLOR_PREDICTED, width + 0.6, height - 0.3, 0);
      if (hasActual) this.addLegendItem('What actually happened', COLOR_ACTUAL, width + 0.6, height - 0.6, 0);

      const caption = hasActual && mae != null
        ? `This forecast missed by $${mae.toFixed(2)} on average (MAE) — a straight-line ` +
          'regression is the simplest possible model, and this is roughly how wrong it gets.'
        : 'How to read this: blue is known history, orange is where a simple straight-line ' +
          'regression projects the price forward from that point.';
      makeText(caption, 0, -0.4, 0, '#898781', { width: 4, wrapCount: 44 });
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