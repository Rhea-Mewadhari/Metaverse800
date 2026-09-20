/* global AFRAME */
(function () {
  const THREE = AFRAME.THREE;

  const RAMP_LOW = new THREE.Color(0x9ec5f4);
  const RAMP_HIGH = new THREE.Color(0x104281);
  const START_COLOR = 0x0b0b0b;

  AFRAME.registerComponent('monte-carlo-chart', {
    schema: {
      src: { type: 'string' },
      width: { type: 'number', default: 4 },
      height: { type: 'number', default: 2 },
      depth: { type: 'number', default: 2 },  // lateral spread so paths are walkable, not a flat fan
    },

    init: function () {
      fetch(this.data.src)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          return res.json();
        })
        .then((data) => this.build(data))
        .catch((err) => {
          console.error(`monte-carlo-chart: could not load ${this.data.src}`, err);
          this.showError(String(err));
        });
    },

    build: function (data) {
      const { paths, last_known_price, last_known_date, ticker, n_days } = data;
      const { width, height, depth } = this.data;

      const allValues = paths.flat();
      const minV = Math.min(...allValues);
      const maxV = Math.max(...allValues);
      const range = maxV - minV || 1;

      const finals = paths.map((p) => p[p.length - 1]);
      const minFinal = Math.min(...finals);
      const maxFinal = Math.max(...finals);
      const finalRange = maxFinal - minFinal || 1;

      // rank by final simulated price so we can call out representative scenarios
      // instead of making the viewer parse all 40 lines individually
      const ranked = paths
        .map((path, i) => ({ path, i, final: finals[i] }))
        .sort((a, b) => a.final - b.final);
      const pick = (pct) => ranked[Math.floor(pct * (ranked.length - 1))];
      const pessimistic = pick(0.1);
      const median = pick(0.5);
      const optimistic = pick(0.9);
      const highlighted = new Set([pessimistic.i, median.i, optimistic.i]);

      // background cloud: thin + faint, conveys the shape of the spread only
      paths.forEach((path, i) => {
        if (highlighted.has(i)) return;
        const t = (finals[i] - minFinal) / finalRange;
        const color = RAMP_LOW.clone().lerp(RAMP_HIGH, t);
        const zOffset = (i / (paths.length - 1) - 0.5) * depth;
        const points = path.map((v, day) => new THREE.Vector3(
          (day / (path.length - 1)) * width,
          ((v - minV) / range) * height,
          zOffset
        ));
        this.addPath(points, color.getHex(), `path-${i}`, { radius: 0.004, opacity: 0.18 });
      });

      // three bold, labeled scenario lines drawn down the centerline (z: 0) so
      // they're easy to follow without tracking lateral jitter
      this.addScenarioPath(pessimistic, minV, range, width, height, 0xd03b3b, 'Pessimistic (10th %ile)');
      this.addScenarioPath(median, minV, range, width, height, 0x52514e, 'Median');
      this.addScenarioPath(optimistic, minV, range, width, height, 0x0ca30c, 'Optimistic (90th %ile)');

      const startY = ((last_known_price - minV) / range) * height;
      this.addStartMarker(startY);
      this.addLabels(ticker, last_known_date, last_known_price, minV, maxV, n_days, height);
    },

    addPath: function (points, color, name, { radius = 0.008, opacity = 0.85, meta = null } = {}) {
      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, points.length, radius, 5, false);
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.5, transparent: true, opacity });
      const mesh = new THREE.Mesh(geometry, material);
      if (meta) Object.assign(mesh.userData, { isDataSeries: true, ...meta });
      this.el.setObject3D(name, mesh);
    },

    addScenarioPath: function (entry, minV, range, width, height, color, label) {
      const points = entry.path.map((v, day) => new THREE.Vector3(
        (day / (entry.path.length - 1)) * width,
        ((v - minV) / range) * height,
        0
      ));
      this.addPath(points, color, `scenario-${label}`, {
        radius: 0.02, opacity: 1,
        meta: { label, values: entry.path, dates: null, unit: '$', xStart: 0, xEnd: width },
      });

      const end = points[points.length - 1];
      const finalPrice = entry.path[entry.path.length - 1];
      const text = document.createElement('a-text');
      text.setAttribute('value', `${label}: $${finalPrice.toFixed(0)}`);
      text.setAttribute('color', `#${color.toString(16).padStart(6, '0')}`);
      text.setAttribute('align', 'left');
      text.setAttribute('width', 3);
      text.setAttribute('position', `${end.x + 0.1} ${end.y} ${end.z}`);
      this.el.appendChild(text);
    },

    addLabels: function (ticker, lastDate, lastPrice, minV, maxV, nDays, height) {
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

      makeText(
        `${ticker} — ${nDays}-day simulated futures from ${lastDate} ($${lastPrice.toFixed(2)})`,
        0, height + 0.35, 0, '#0b0b0b'
      );
      makeText(`$${maxV.toFixed(0)}`, -0.3, height, 0, '#52514e', { align: 'right' });
      makeText(`$${minV.toFixed(0)}`, -0.3, 0, 0, '#52514e', { align: 'right' });

      makeText(
        "How to read this: each faint line is one possible future, simulated from this " +
        "stock's own historical volatility. All start from today's known price and fan " +
        "out — a wider spread means less certainty at that point in time. Ignore the " +
        "faint lines individually; follow the three bold ones instead (median, most " +
        "optimistic, most pessimistic) and notice how far apart they end up.",
        0, -0.4, 0, '#898781', { width: 4, wrapCount: 44 }
      );
    },

    addStartMarker: function (startY) {
      // every path starts from the same known price by construction — mark it once
      const geometry = new THREE.SphereGeometry(0.05, 12, 12);
      const material = new THREE.MeshStandardMaterial({ color: START_COLOR });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(0, startY, 0);
      this.el.setObject3D('start-marker', sphere);
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