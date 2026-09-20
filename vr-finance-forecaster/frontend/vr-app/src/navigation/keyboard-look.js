/* global AFRAME */
(function () {
  const THREE = AFRAME.THREE;
  const MOUSE_SENSITIVITY = 0.15; // degrees per pixel dragged

  AFRAME.registerComponent('keyboard-look', {
    schema: {
      rotationSpeed: { type: 'number', default: 90 }, // degrees per second, keyboard
    },

    init: function () {
      this.keys = {};
      this.isDragging = false;
      this.lastX = 0;
      this.lastY = 0;

      this.onKeyDown = (e) => { this.keys[e.code] = true; };
      this.onKeyUp = (e) => { this.keys[e.code] = false; };
      this.onMouseDown = (e) => {
        this.isDragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      };
      this.onMouseUp = () => { this.isDragging = false; };
      this.onMouseMove = (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.yaw -= dx * MOUSE_SENSITIVITY;
        this.pitch = THREE.MathUtils.clamp(this.pitch - dy * MOUSE_SENSITIVITY, -89, 89);
      };

      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      window.addEventListener('mousedown', this.onMouseDown);
      window.addEventListener('mouseup', this.onMouseUp);
      window.addEventListener('mousemove', this.onMouseMove);

      const rot = this.el.object3D.rotation;
      this.yaw = THREE.MathUtils.radToDeg(rot.y);
      this.pitch = THREE.MathUtils.radToDeg(rot.x);
    },

    tick: function (time, delta) {
      const dt = delta / 1000;
      const speed = this.data.rotationSpeed;

      if (this.keys['ArrowLeft']) this.yaw += speed * dt;
      if (this.keys['ArrowRight']) this.yaw -= speed * dt;
      if (this.keys['ArrowUp']) this.pitch = Math.min(this.pitch + speed * dt, 89);
      if (this.keys['ArrowDown']) this.pitch = Math.max(this.pitch - speed * dt, -89);

      this.el.object3D.rotation.set(
        THREE.MathUtils.degToRad(this.pitch),
        THREE.MathUtils.degToRad(this.yaw),
        0
      );
    },

    remove: function () {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      window.removeEventListener('mousedown', this.onMouseDown);
      window.removeEventListener('mouseup', this.onMouseUp);
      window.removeEventListener('mousemove', this.onMouseMove);
    },
  });
})();