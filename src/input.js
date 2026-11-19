// Gestures and keyboard, mapped to the same game actions.
// Actions: aimLeft, aimRight, lane0..lane4, fire (selected main weapon), fireLight (F),
// fireLightUp (F released), fireHeavy (B), fireMortar (M), fireAA (A), switchWeapon, oil,
// mgStart / mgStop (holding one finger, industrial era on), status, repeat, pause

const SWIPE_MIN = 35;   // pixels
const TAP_MAX_MOVE = 18;
const TAP_MAX_TIME = 450; // ms
const HOLD_TIME = 500;    // ms: hold one finger still to pour oil (castle eras)
const MG_HOLD_TIME = 250; // ms: hold one finger still to start the machine gun (industrial era on)

export class Input {
  constructor(surface, onAction) {
    this.surface = surface;
    this.onAction = onAction;
    this.enabled = false;
    this.touch = null;
    this.holdMode = 'oil'; // 'oil' or 'mg', set by the battle for its era

    this._onKey = this._onKey.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onStart = this._onStart.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onEnd = this._onEnd.bind(this);

    document.addEventListener('keydown', this._onKey);
    document.addEventListener('keyup', this._onKeyUp);
    surface.addEventListener('touchstart', this._onStart, { passive: false });
    surface.addEventListener('touchmove', this._onMove, { passive: false });
    surface.addEventListener('touchend', this._onEnd, { passive: false });
    surface.addEventListener('touchcancel', () => { this._endHold(); this.touch = null; });
  }

  enable() { this.enabled = true; }
  disable() { this._endHold(); this.enabled = false; this.touch = null; }

  _onKeyUp(e) {
    if (!this.enabled) return;
    if (e.key === 'f' || e.key === 'F') this._emit('fireLightUp');
  }

  _endHold() {
    if (this.touch && this.touch.holdTimer) clearTimeout(this.touch.holdTimer);
    if (this.touch && this.touch.mgOn) this._emit('mgStop');
  }

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
    else if (k === 'f' || k === 'F') action = e.repeat ? null : 'fireLight';
    else if (k === 'm' || k === 'M') action = e.repeat ? null : 'fireMortar';
    else if (k === ' ') action = e.repeat ? null : 'fire';
    else if (k === 'b' || k === 'B') action = e.repeat ? null : 'fireHeavy';
    else if (k === 'o' || k === 'O') action = e.repeat ? null : 'oil';
    else if (k === 'a' || k === 'A') action = e.repeat ? null : 'fireAA';
    else if (k === 's' || k === 'S') action = e.repeat ? null : 'status';
    else if (k === 'r' || k === 'R') action = e.repeat ? null : 'repeat';
    else if (k === 'Escape' || k === 'p' || k === 'P') action = e.repeat ? null : 'pause';
    else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); return; }
    if ('fFbBoOmMaA '.includes(k) || k === 'ArrowLeft' || k === 'ArrowRight') e.preventDefault();
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
      if (this.holdMode === 'mg') {
        // Machine gun: holding one finger still starts firing, lifting it stops.
        const touch = this.touch;
        touch.holdTimer = setTimeout(() => {
          if (this.touch === touch && touch.maxFingers === 1 &&
              Math.hypot(touch.lastX - touch.x, touch.lastY - touch.y) <= TAP_MAX_MOVE * 1.5) {
            touch.mgOn = true;
            this._emit('mgStart');
          }
        }, MG_HOLD_TIME);
      }
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
    if (s.holdTimer) clearTimeout(s.holdTimer);
    if (s.mgOn) { this.touch = null; this._emit('mgStop'); return; }
    this.touch = null;
    const ct = e.changedTouches[0];
    const x = ct ? ct.clientX : s.lastX;
    const y = ct ? ct.clientY : s.lastY;
    const dx = x - s.x, dy = y - s.y;
    const dist = Math.hypot(dx, dy);
    const dt = performance.now() - s.time;

    if (s.maxFingers >= 4) {
      if (dist < 100) this._emit('fireAA');
      return;
    }
    if (s.maxFingers >= 3) {
      if (dist < 80) this._emit('fireMortar');
      return;
    }
    if (s.maxFingers >= 2) {
      if (dist < 60) this._emit('pause');
      else if (Math.abs(dy) > Math.abs(dx)) this._emit('switchWeapon');
      return;
    }
    if (dist <= TAP_MAX_MOVE && dt <= TAP_MAX_TIME) { this._emit('fire'); return; }
    if (this.holdMode === 'oil' && dist <= TAP_MAX_MOVE * 1.5 && dt >= HOLD_TIME) { this._emit('oil'); return; }
    if (dist >= SWIPE_MIN) {
      if (Math.abs(dx) > Math.abs(dy)) this._emit(dx < 0 ? 'aimLeft' : 'aimRight');
      else this._emit(dy < 0 ? 'status' : 'repeat');
    }
  }
}
