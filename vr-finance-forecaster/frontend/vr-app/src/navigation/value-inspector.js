/* global AFRAME */
(function () {
  const THREE = AFRAME.THREE;
  const CLICK_MOVE_THRESHOLD = 6; // px of mouse movement — more than this counts as a drag, not a click

  AFRAME.registerComponent('value-inspector', {
    init: function () {
      this.raycaster = new THREE.Raycaster();
      this.raycaster.far = 20;
      this.forward = new THREE.Vector3();
      this.origin = new THREE.Vector3();
      this.lastHit = null;
      this.pinGroup = null;
      this.pinLabel = null;

      this.mouseDownPos = null;
      this.onMouseDown = (e) => { this.mouseDownPos = { x: e.clientX, y: e.clientY }; };
      this.onMouseUp = (e) => {
        if (!this.mouseDownPos) return;
        const dx = e.clientX - this.mouseDownPos.x;
        const dy = e.clientY - this.mouseDownPos.y;
        this.mouseDownPos = null;
        if (Math.hypot(dx, dy) < CLICK_MOVE_THRESHOLD) this.handleClick();
      };
      window.addEventListener('mousedown', this.onMouseDown);
      window.addEventListener('mouseup', this.onMouseUp);

      const ring = document.createElement('a-ring');
      ring.setAttribute('radius-inner', 0.004);
      ring.setAttribute('radius-outer', 0.007);
      ring.setAttribute('color', '#ffffff');
      ring.setAttribute('material', 'shader: flat; opacity: 0.8');
      ring.setAttribute('position', '0 0 -0.5');
      this.el.appendChild(ring);

      const text = document.createElement('a-text');
      text.setAttribute('value', '');
      text.setAttribute('color', '#ffffff');
      text.setAttribute('align', 'center');
      text.setAttribute('width', 1.2);
      text.setAttribute('position', '0 -0.08 -0.5');
      this.el.appendChild(text);
      this.tooltip = text;
    },

    tick: function () {
      const camera = this.el.object3D;
      camera.getWorldDirection(this.forward);
      camera.getWorldPosition(this.origin);
      this.raycaster.set(this.origin, this.forward);

      const allHits = this.raycaster.intersectObjects(this.el.sceneEl.object3D.children, true);
      const nearest = allHits[0];

      // only show a value if the CLOSEST thing you're looking at is a tagged
      // data line — if anything else (a panel, a floor, another chart's
      // background) is in the way, that's what you're actually seeing, so show nothing
      if (!nearest || !nearest.object.userData || !nearest.object.userData.isDataSeries) {
        this.tooltip.setAttribute('value', '');
        this.lastHit = null;
        return;
      }

      const { object: mesh, point } = nearest;
      const { label, values, dates, unit, xStart, xEnd } = mesh.userData;
      const local = mesh.worldToLocal(point.clone());
      const t = THREE.MathUtils.clamp((local.x - xStart) / (xEnd - xStart), 0, 1);
      const idx = Math.round(t * (values.length - 1));
      const date = dates ? dates[idx] : null;
      const valueText = `${label}: ${unit || ''}${values[idx].toFixed(2)}${date ? '\n' + date : ''}`;

      this.tooltip.setAttribute('value', valueText);
      this.lastHit = { point: point.clone(), text: valueText };
    },
    
    handleClick: function () {
      console.log('click fired, lastHit:', this.lastHit);
      if (!this.lastHit) return;
      this.setPin(this.lastHit.point, this.lastHit.text);
    },

    setPin: function (worldPoint, text) {
      if (!this.pinGroup) {
        this.pinGroup = new THREE.Group();
        this.el.sceneEl.object3D.add(this.pinGroup);

        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        this.pinGroup.add(sphere);

        this.pinLabel = document.createElement('a-text');
        this.pinLabel.setAttribute('color', '#ffffff');
        this.pinLabel.setAttribute('align', 'left');
        this.pinLabel.setAttribute('width', 2);
        this.el.sceneEl.appendChild(this.pinLabel);
      }

      this.pinGroup.position.copy(worldPoint);
      this.pinLabel.setAttribute('value', text);
      this.pinLabel.setAttribute('position', `${worldPoint.x + 0.08} ${worldPoint.y + 0.08} ${worldPoint.z}`);
    },

    remove: function () {
      window.removeEventListener('mousedown', this.onMouseDown);
      window.removeEventListener('mouseup', this.onMouseUp);
    },
  });
})();