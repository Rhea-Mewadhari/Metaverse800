/* global AFRAME */
(function () {
  const THREE = AFRAME.THREE;

  const CHARTS = [
    { id: 'trend', label: 'Trend', viewpoint: '-7 1.6 0' },
    { id: 'forecast', label: 'Forecast', viewpoint: '0 1.6 0' },
    { id: 'monte-carlo', label: 'Monte Carlo', viewpoint: '7 1.6 0' },
    { id: 'volatility', label: 'Volatility', viewpoint: '-7 1.6 -7' },
    { id: 'correlation', label: 'Correlation', viewpoint: '0 1.6 -7' },
  ];

  AFRAME.registerComponent('nav-menu', {
    init: function () {
      this.panel = null;

      this.onKeyDown = (e) => { if (e.code === 'KeyM') this.toggle(); };
      window.addEventListener('keydown', this.onKeyDown);

      // voice-commands.js emits these on this same entity — same code path
      // as clicking, so there's one source of truth for navigation
      this.el.addEventListener('voice-navigate', (e) => {
        const chart = CHARTS.find((c) => c.id === e.detail.chartId);
        if (chart) this.goTo(chart);
      });
      this.el.addEventListener('voice-toggle-menu', () => this.toggle());
    },

    toggle: function () {
      if (this.panel) {
        this.el.sceneEl.removeChild(this.panel);
        this.panel = null;
        return;
      }
      this.buildMenu();
    },

    buildMenu: function () {
      const camera = this.el.object3D;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      const panelPos = camPos.clone().addScaledVector(forward, 2);

      this.panel = document.createElement('a-entity');
      this.el.sceneEl.appendChild(this.panel);
      this.panel.object3D.position.copy(panelPos);
      this.panel.object3D.lookAt(camPos);

      const bg = document.createElement('a-plane');
      bg.setAttribute('width', 1.2);
      bg.setAttribute('height', 0.16 * (CHARTS.length + 1));
      bg.setAttribute('color', '#1a1a19');
      bg.setAttribute('opacity', 0.9);
      bg.setAttribute('position', '0 0 -0.01');
      this.panel.appendChild(bg);

      const title = document.createElement('a-text');
      title.setAttribute('value', 'Look at a chart, hold gaze to select');
      title.setAttribute('align', 'center');
      title.setAttribute('color', '#ffffff');
      title.setAttribute('width', 2.2);
      title.setAttribute('position', `0 ${0.08 * CHARTS.length} 0`);
      this.panel.appendChild(title);

      CHARTS.forEach((chart, i) => {
        const y = 0.08 * (CHARTS.length - 1 - i * 2);
        const button = document.createElement('a-plane');
        button.classList.add('nav-button');
        button.setAttribute('width', 1.0);
        button.setAttribute('height', 0.14);
        button.setAttribute('color', '#2a78d6');
        button.setAttribute('position', `0 ${y} 0`);

        const label = document.createElement('a-text');
        label.setAttribute('value', chart.label);
        label.setAttribute('align', 'center');
        label.setAttribute('color', '#ffffff');
        label.setAttribute('width', 2.5);
        label.setAttribute('position', '0 0 0.01');
        button.appendChild(label);

        button.addEventListener('click', () => this.goTo(chart));
        button.addEventListener('mouseenter', () => button.setAttribute('color', '#eb6834'));
        button.addEventListener('mouseleave', () => button.setAttribute('color', '#2a78d6'));

        this.panel.appendChild(button);
      });
    },

    goTo: function (chart) {
      this.el.setAttribute('position', chart.viewpoint);
      this.toggle(); // close the menu once a destination is chosen
    },

    remove: function () {
      window.removeEventListener('keydown', this.onKeyDown);
    },
  });
})();