/* global AFRAME */
(function () {
  const THREE = AFRAME.THREE;

  const CHARTS = [
    { id: 'trend', label: 'Trend', viewpoint: new THREE.Vector3(-7, 1.6, 0) },
    { id: 'forecast', label: 'Forecast', viewpoint: new THREE.Vector3(0, 1.6, 0) },
    { id: 'monte-carlo', label: 'Monte Carlo', viewpoint: new THREE.Vector3(7, 1.6, 0) },
    { id: 'volatility', label: 'Volatility', viewpoint: new THREE.Vector3(-7, 1.6, -7) },
    { id: 'correlation', label: 'Correlation', viewpoint: new THREE.Vector3(0, 1.6, -7) },
  ];
  const NEARBY_RADIUS = 4; // meters — inside this, we're confident about which chart you're at

  AFRAME.registerComponent('current-chart-tracker', {
    init: function () {
      this.currentChart = null; // the AI assistant component will read this directly
      this.camPos = new THREE.Vector3();

      const label = document.createElement('a-text');
      label.setAttribute('value', '');
      label.setAttribute('color', '#0b0b0b');
      label.setAttribute('align', 'center');
      label.setAttribute('width', 1.2);
      label.setAttribute('wrap-count', 30);
      label.setAttribute('position', '0 0.22 -1');
      this.el.appendChild(label);
      this.hud = label;
    },

    tick: function () {
      this.el.object3D.getWorldPosition(this.camPos);

      let nearest = null;
      let nearestDist = Infinity;
      CHARTS.forEach((chart) => {
        const dist = this.camPos.distanceTo(chart.viewpoint);
        if (dist < nearestDist) { nearestDist = dist; nearest = chart; }
      });

      const inRange = nearest && nearestDist <= NEARBY_RADIUS;
      this.currentChart = inRange ? nearest : null;
      this.hud.setAttribute('value', inRange ? `Viewing: ${nearest.label}` : '');
    },
  });
})();