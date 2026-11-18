// Gestures and keyboard, mapped to the same game actions.
// Actions: aimLeft, aimRight, lane0..lane4, fire, status, repeat, pause

const SWIPE_MIN = 35;   // pixels
const TAP_MAX_MOVE = 18;
const TAP_MAX_TIME = 450; // ms

export class Input {
  constructor(surface, onAction) {
    this.surface = surface;
    this.onAction = onAction;
    this.enabled = false;
    this.touch = null;

    this._onKey = this._onKey.bind(this);
    this._onStart = this._onStart.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onEnd = this._onEnd.bind(this);

    document.addEventListener('keydown', this._onKey);
    surface.addEventListener('touchstart', this._onStart, { passive: false });
    surface.addEventListener('touchmove', this._onMove, { passive: false });
    surface.addEventListener('touchend', this._onEnd, { passive: false });
    surface.addEventListener('touchcancel', () => { this.touch = null; });
  }

  enable() { this.enabled = true; }
  disable() { this.enabled = false; this.touch = null; }

  _emit(action) { if (this.enabled) this.onAction(action); }

  _onKey(e) {
    if (!this.enabled || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    // On a menu button (for example while paused), only Escape and P reach the game.
    const onControl = e.target && e.target !== this.surface && /^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(e.target.tagName);
    if (onControl && !(k === 'Escape' || k === 'p' || k === 'P')) return;
    let action = null;
    if (k === 'ArrowLeft') action = 'aimLeft';
    else if (k === 'ArrowRight') action = 'aimRight';
    else if (k >= '1' && k <= '5') action = 'lane' + (Number(k) - 1);
    else if (k === 'f' || k === 'F' || k === ' ') action = e.repeat ? null : 'fire';
    else if (k === 's' || k === 'S') action = e.repeat ? null : 'status';
    else if (k === 'r' || k === 'R') action = e.repeat ? null : 'repeat';
    else if (k === 'Escape' || k === 'p' || k === 'P') action = e.repeat ? null : 'pause';
    else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); return; }
    if (k === 'f' || k === 'F' || k === ' ' || k === 'ArrowLeft' || k === 'ArrowRight') e.preventDefault();
    if (action) { e.preventDefault(); this._emit(action); }
  }

  _onStart(e) {
    if (!this.enabled) return;
    // A single finger on a button (the pause menu) works as a normal button press.
    if (!this.touch && e.touches.length === 1 && e.target.closest && e.target.closest('button')) return;
    e.preventDefault();
    const t = e.touches[0];
    if (!this.touch) {
      this.touch = { x: t.clientX, y: t.clientY, time: performance.now(), maxFingers: e.touches.length, lastX: t.clientX, lastY: t.clientY };
    } else {
      this.touch.maxFingers = Math.max(this.touch.maxFingers, e.touches.length);
    }
  }

  _onMove(e) {
    if (!this.enabled || !this.touch) return;
    e.preventDefault();
    const t = e.touches[0];
    this.touch.lastX = t.clientX;
    this.touch.lastY = t.clientY;
  }

  _onEnd(e) {
    if (!this.enabled || !this.touch) return;
    e.preventDefault();
    if (e.touches.length > 0) return; // wait until every finger is up
    const s = this.touch;
    this.touch = null;
    const ct = e.changedTouches[0];
    const x = ct ? ct.clientX : s.lastX;
    const y = ct ? ct.clientY : s.lastY;
    const dx = x - s.x, dy = y - s.y;
    const dist = Math.hypot(dx, dy);
    const dt = performance.now() - s.time;

    if (s.maxFingers >= 2) {
      if (dist < 60) this._emit('pause');
      return;
    }
    if (dist <= TAP_MAX_MOVE && dt <= TAP_MAX_TIME) { this._emit('fire'); return; }
    if (dist >= SWIPE_MIN) {
      if (Math.abs(dx) > Math.abs(dy)) this._emit(dx < 0 ? 'aimLeft' : 'aimRight');
      else this._emit(dy < 0 ? 'status' : 'repeat');
    }
  }
}
