(function () {
  const DEFAULT_MINUTES = 10;
  const DEFAULT_SECONDS = DEFAULT_MINUTES * 60;
  const STYLE_ID = 'slidey-countdown-style';
  const TIMER_ID = 'slidey-countdown';
  const MIN_WIDTH = 220;
  const MIN_HEIGHT = 140;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .reveal #${TIMER_ID} {
        position: absolute;
        z-index: 55;
        top: 7vh;
        left: 5vw;
        width: min(40vw, 520px);
        min-width: ${MIN_WIDTH}px;
        height: min(30vh, 260px);
        min-height: ${MIN_HEIGHT}px;
        padding: 16px 20px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        border-radius: 16px;
        background: rgba(16, 16, 16, 0.86);
        color: #f8f8f8;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(6px);
        user-select: none;
      }

      .reveal #${TIMER_ID}[data-hidden="true"] {
        display: none;
      }

      .reveal #${TIMER_ID} .timer-header,
      .reveal #${TIMER_ID} .timer-controls,
      .reveal #${TIMER_ID} .timer-resize-handle {
        transition: opacity 160ms ease, transform 160ms ease;
      }

      .reveal #${TIMER_ID}.is-collapsed .timer-header,
      .reveal #${TIMER_ID}.is-collapsed .timer-controls,
      .reveal #${TIMER_ID}.is-collapsed .timer-resize-handle {
        opacity: 0;
        pointer-events: none;
        transform: translateY(-6px);
      }

      .reveal #${TIMER_ID}.is-dragging {
        cursor: grabbing;
      }

      .reveal #${TIMER_ID} .timer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        cursor: grab;
      }

      .reveal #${TIMER_ID} .timer-header .timer-title {
        font-size: 16px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.8;
      }

      .reveal #${TIMER_ID} .timer-header button {
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 20px;
        opacity: 0.75;
        padding: 4px;
      }

      .reveal #${TIMER_ID} .timer-header button:hover,
      .reveal #${TIMER_ID} .timer-header button:focus-visible {
        opacity: 1;
      }

      .reveal #${TIMER_ID} .timer-display {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: clamp(48px, 12vw, 120px);
        line-height: 1;
        letter-spacing: 0.04em;
        border-radius: 12px;
        border: 2px dashed rgba(255, 255, 255, 0.18);
        padding: 12px 18px;
        text-align: center;
        outline: none;
        user-select: text;
        cursor: text;
        transition: background-color 180ms ease, color 180ms ease;
      }

      .reveal #${TIMER_ID} .timer-display:focus-visible {
        border-color: rgba(255, 255, 255, 0.45);
        background-color: rgba(255, 255, 255, 0.04);
      }

      .reveal #${TIMER_ID} .timer-display.is-warning {
        color: #ffb347;
      }

      .reveal #${TIMER_ID} .timer-display.is-expired {
        color: #ff6b6b;
      }

      .reveal #${TIMER_ID} .timer-controls {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .reveal #${TIMER_ID} .timer-controls button {
        border: none;
        border-radius: 10px;
        padding: 10px 16px;
        font-size: 16px;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.9);
        color: #111;
        font-weight: 600;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }

      .reveal #${TIMER_ID} .timer-controls button:hover,
      .reveal #${TIMER_ID} .timer-controls button:focus-visible {
        transform: translateY(-1px);
        box-shadow: 0 10px 18px rgba(0, 0, 0, 0.2);
      }

      .reveal #${TIMER_ID} .timer-controls button.is-primary {
        background: rgba(52, 199, 89, 0.92);
        color: #fff;
      }

      .reveal #${TIMER_ID} .timer-resize-handle {
        position: absolute;
        width: 18px;
        height: 18px;
        right: 8px;
        bottom: 8px;
        cursor: nwse-resize;
        border-bottom: 3px solid rgba(255, 255, 255, 0.35);
        border-right: 3px solid rgba(255, 255, 255, 0.35);
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function parseTimeToSeconds(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parts = trimmed.split(':');

    if (parts.length === 1) {
      const minutes = Number.parseInt(parts[0], 10);
      if (Number.isNaN(minutes) || minutes < 0) {
        return null;
      }
      return minutes * 60;
    }

    if (parts.length === 2) {
      const minutes = Number.parseInt(parts[0], 10);
      const seconds = Number.parseInt(parts[1], 10);

      if (
        Number.isNaN(minutes) ||
        Number.isNaN(seconds) ||
        minutes < 0 ||
        seconds < 0 ||
        seconds >= 60
      ) {
        return null;
      }

      return minutes * 60 + seconds;
    }

    return null;
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  function resolveRegistry() {
    if (typeof window !== 'undefined' && window.SlideyPlugins && window.SlideyPlugins.registry) {
      return window.SlideyPlugins.registry;
    }

    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try {
        return require('../core/registry.js');
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  class CountdownTimer {
    constructor(deck) {
      this.deck = deck;
      this.root = deck.getRevealElement();
      this.container = null;
      this.display = null;
      this.startPauseButton = null;
      this.resetButton = null;
      this.closeButton = null;
      this.resizeHandle = null;
      this.header = null;
      this.intervalId = null;
      this.isRunning = false;
      this.remainingSeconds = DEFAULT_SECONDS;
      this.initialSeconds = DEFAULT_SECONDS;
      this.isVisible = false;
      this.dragState = null;
      this.resizeState = null;
      this.lastValueBeforeEdit = null;
      this.isUiExpanded = false;
      this.collapseTimeoutId = null;
      this.boundUpdateDisplayScale = this.updateDisplayScale.bind(this);
      this.handleFocusOut = this.handleFocusOut.bind(this);
      this.keyBindingDescriptor = null;
      this.dragHandlers = null;
      this.resizeHandlers = null;
      this.onContainerPointerDown = null;
      this.onContainerFocusIn = null;
      this.onCloseClick = null;
      this.onDisplayFocus = null;
      this.onDisplayBlur = null;
      this.onDisplayKeydown = null;
      this.originalRootPosition = '';
      this.adjustedRootPosition = false;
    }

    init() {
      injectStyles();
      this.ensureRootPositioning();
      this.createTimer();
      this.attachKeyboardShortcut();
      this.updateDisplay();
      this.hide();
    }

    ensureRootPositioning() {
      const computed = window.getComputedStyle(this.root);
      if (computed.position === 'static') {
        this.originalRootPosition = this.root.style.position;
        this.root.style.position = 'relative';
        this.adjustedRootPosition = true;
      }
    }

    createTimer() {
      if (this.container) {
        return;
      }

      const container = document.createElement('div');
      container.id = TIMER_ID;
      container.setAttribute('role', 'region');
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('data-hidden', 'true');
      container.setAttribute('aria-hidden', 'true');
      container.classList.add('is-collapsed');

      const header = document.createElement('div');
      header.className = 'timer-header';

      const title = document.createElement('span');
      title.className = 'timer-title';
      title.textContent = 'Countdown';

      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.setAttribute('aria-label', 'Hide countdown timer');
      closeButton.innerHTML = '×';
      this.onCloseClick = () => {
        this.hide();
      };
      closeButton.addEventListener('click', this.onCloseClick);

      header.appendChild(title);
      header.appendChild(closeButton);

      const display = document.createElement('div');
      display.className = 'timer-display';
      display.contentEditable = 'true';
      display.spellcheck = false;
      display.textContent = formatTime(this.remainingSeconds);

      this.onDisplayFocus = () => {
        this.pause();
        this.lastValueBeforeEdit = display.textContent.trim();
        this.expandUi();
      };
      display.addEventListener('focus', this.onDisplayFocus);

      this.onDisplayBlur = () => {
        const parsed = parseTimeToSeconds(display.textContent);
        if (parsed === null) {
          display.textContent = formatTime(this.remainingSeconds);
          return;
        }
        this.initialSeconds = parsed;
        this.remainingSeconds = parsed;
        this.updateDisplay();
      };
      display.addEventListener('blur', this.onDisplayBlur);

      this.onDisplayKeydown = (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          display.blur();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          display.textContent = this.lastValueBeforeEdit ?? formatTime(this.remainingSeconds);
          display.blur();
        }
      };
      display.addEventListener('keydown', this.onDisplayKeydown);

      const controls = document.createElement('div');
      controls.className = 'timer-controls';

      const startPause = document.createElement('button');
      startPause.type = 'button';
      startPause.className = 'is-primary';
      startPause.textContent = 'Start';
      startPause.addEventListener('click', () => {
        if (this.isRunning) {
          this.pause();
        } else {
          this.start();
        }
      });

      const reset = document.createElement('button');
      reset.type = 'button';
      reset.textContent = 'Reset';
      reset.addEventListener('click', () => {
        this.reset();
      });

      controls.appendChild(startPause);
      controls.appendChild(reset);

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'timer-resize-handle';

      container.appendChild(header);
      container.appendChild(display);
      container.appendChild(controls);
      container.appendChild(resizeHandle);

      this.root.appendChild(container);

      this.onContainerPointerDown = () => this.expandUi();
      this.onContainerFocusIn = () => this.expandUi();

      container.addEventListener('pointerdown', this.onContainerPointerDown);
      container.addEventListener('focusin', this.onContainerFocusIn);
      container.addEventListener('focusout', this.handleFocusOut);

      window.addEventListener('resize', this.boundUpdateDisplayScale);

      this.container = container;
      this.display = display;
      this.startPauseButton = startPause;
      this.resetButton = reset;
      this.resizeHandle = resizeHandle;
      this.header = header;
      this.closeButton = closeButton;

      this.attachDragHandlers();
      this.attachResizeHandlers();
      this.updateDisplayScale();
      this.collapseUi(true);
    }

    attachKeyboardShortcut() {
      if (typeof this.deck.addKeyBinding === 'function') {
        const descriptor = { keyCode: 84, key: 'T', description: 'Toggle countdown timer' };
        this.deck.addKeyBinding(descriptor, () => this.toggleVisibility());
        this.keyBindingDescriptor = descriptor;
      }
    }

    attachDragHandlers() {
      const onPointerDown = (event) => {
        if (event.button !== 0) {
          return;
        }
        this.dragState = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startLeft: this.container.offsetLeft,
          startTop: this.container.offsetTop,
        };
        this.container.classList.add('is-dragging');
        this.header.setPointerCapture(event.pointerId);
      };

      const onPointerMove = (event) => {
        if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
          return;
        }

        const dx = event.clientX - this.dragState.startX;
        const dy = event.clientY - this.dragState.startY;

        const revealRect = this.root.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();

        const maxLeft = revealRect.width - containerRect.width;
        const maxTop = revealRect.height - containerRect.height;

        const nextLeft = clamp(this.dragState.startLeft + dx, 0, Math.max(0, maxLeft));
        const nextTop = clamp(this.dragState.startTop + dy, 0, Math.max(0, maxTop));

        this.container.style.left = `${nextLeft}px`;
        this.container.style.top = `${nextTop}px`;
      };

      const onPointerUp = (event) => {
        if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
          return;
        }
        this.container.classList.remove('is-dragging');
        this.header.releasePointerCapture(event.pointerId);
        this.dragState = null;
      };

      this.header.addEventListener('pointerdown', onPointerDown);
      this.header.addEventListener('pointermove', onPointerMove);
      this.header.addEventListener('pointerup', onPointerUp);
      this.header.addEventListener('pointercancel', onPointerUp);

      this.dragHandlers = { onPointerDown, onPointerMove, onPointerUp };
    }

    attachResizeHandlers() {
      const onPointerDown = (event) => {
        if (event.button !== 0) {
          return;
        }
        this.expandUi();
        this.resizeState = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startWidth: this.container.offsetWidth,
          startHeight: this.container.offsetHeight,
        };
        this.resizeHandle.setPointerCapture(event.pointerId);
      };

      const onPointerMove = (event) => {
        if (!this.resizeState || event.pointerId !== this.resizeState.pointerId) {
          return;
        }

        const dx = event.clientX - this.resizeState.startX;
        const dy = event.clientY - this.resizeState.startY;

        const nextWidth = clamp(this.resizeState.startWidth + dx, MIN_WIDTH, this.root.offsetWidth);
        const nextHeight = clamp(this.resizeState.startHeight + dy, MIN_HEIGHT, this.root.offsetHeight);

        this.container.style.width = `${nextWidth}px`;
        this.container.style.height = `${nextHeight}px`;
        this.updateDisplayScale();
      };

      const onPointerUp = (event) => {
        if (!this.resizeState || event.pointerId !== this.resizeState.pointerId) {
          return;
        }
        this.resizeHandle.releasePointerCapture(event.pointerId);
        this.updateDisplayScale();
        this.resizeState = null;
      };

      this.resizeHandle.addEventListener('pointerdown', onPointerDown);
      this.resizeHandle.addEventListener('pointermove', onPointerMove);
      this.resizeHandle.addEventListener('pointerup', onPointerUp);
      this.resizeHandle.addEventListener('pointercancel', onPointerUp);

      this.resizeHandlers = { onPointerDown, onPointerMove, onPointerUp };
    }

    handleFocusOut(event) {
      if (!this.container) {
        return;
      }
      const nextTarget = event.relatedTarget || null;
      if (nextTarget && this.container.contains(nextTarget)) {
        return;
      }
      this.collapseUi();
    }

    expandUi() {
      if (!this.container) {
        return;
      }
      if (this.collapseTimeoutId) {
        if (typeof window !== 'undefined' && typeof window.clearTimeout === 'function') {
          window.clearTimeout(this.collapseTimeoutId);
        } else {
          clearTimeout(this.collapseTimeoutId);
        }
        this.collapseTimeoutId = null;
      }
      if (!this.isUiExpanded) {
        this.container.classList.remove('is-collapsed');
        this.isUiExpanded = true;
      }
    }

    collapseUi(immediate = false) {
      if (!this.container) {
        return;
      }
      const performCollapse = () => {
        this.container.classList.add('is-collapsed');
        this.isUiExpanded = false;
      };

      if (this.collapseTimeoutId) {
        if (typeof window !== 'undefined' && typeof window.clearTimeout === 'function') {
          window.clearTimeout(this.collapseTimeoutId);
        } else {
          clearTimeout(this.collapseTimeoutId);
        }
        this.collapseTimeoutId = null;
      }

      if (immediate) {
        performCollapse();
        return;
      }

      this.collapseTimeoutId = window.setTimeout(() => {
        if (this.container && !this.container.matches(':focus-within')) {
          performCollapse();
        }
        this.collapseTimeoutId = null;
      }, 120);
    }

    updateDisplayScale() {
      if (!this.container || !this.display) {
        return;
      }
      const rect = this.container.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      const base = Math.min(rect.width * 0.5, rect.height * 0.7);
      const fontSize = clamp(base, 36, 240);
      this.display.style.fontSize = `${fontSize}px`;
    }

    updateDisplay() {
      if (!this.display) {
        return;
      }

      this.display.textContent = formatTime(this.remainingSeconds);

      this.display.classList.remove('is-warning', 'is-expired');
      if (this.remainingSeconds <= 0) {
        this.display.classList.add('is-expired');
      } else if (this.remainingSeconds <= 60) {
        this.display.classList.add('is-warning');
      }

      if (this.startPauseButton) {
        this.startPauseButton.textContent = this.isRunning ? 'Pause' : 'Start';
      }
    }

    tick() {
      if (!this.isRunning) {
        return;
      }
      this.remainingSeconds -= 1;
      if (this.remainingSeconds <= 0) {
        this.remainingSeconds = 0;
        this.updateDisplay();
        this.pause();
        return;
      }
      this.updateDisplay();
    }

    start() {
      if (this.isRunning) {
        return;
      }
      if (this.remainingSeconds <= 0) {
        this.reset();
      }
      this.isRunning = true;
      this.updateDisplay();
      this.intervalId = window.setInterval(() => this.tick(), 1000);
    }

    pause() {
      if (!this.isRunning) {
        return;
      }
      this.isRunning = false;
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      this.updateDisplay();
    }

    reset() {
      this.pause();
      this.remainingSeconds = this.initialSeconds;
      this.updateDisplay();
    }

    show() {
      if (this.isVisible) {
        return;
      }
      this.isVisible = true;
      if (this.remainingSeconds === undefined || this.remainingSeconds === null) {
        this.remainingSeconds = DEFAULT_SECONDS;
        this.initialSeconds = DEFAULT_SECONDS;
      }
      this.container.setAttribute('data-hidden', 'false');
      this.container.setAttribute('aria-hidden', 'false');
      this.container.style.removeProperty('display');
      this.collapseUi(true);
      const updateScale = () => this.updateDisplayScale();
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(updateScale);
      } else {
        updateScale();
      }
      this.updateDisplay();
    }

    hide() {
      if (!this.isVisible) {
        this.container?.setAttribute('data-hidden', 'true');
        this.container?.setAttribute('aria-hidden', 'true');
        this.container?.style.setProperty('display', 'none', 'important');
        this.collapseUi(true);
        return;
      }
      this.isVisible = false;
      this.pause();
      this.container.setAttribute('data-hidden', 'true');
      this.container.setAttribute('aria-hidden', 'true');
      this.container.style.setProperty('display', 'none', 'important');
      this.collapseUi(true);
    }

    toggleVisibility() {
      if (!this.isVisible) {
        this.show();
      } else {
        this.hide();
      }
    }

    destroy() {
      this.hide();
      this.pause();

      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', this.boundUpdateDisplayScale);
      }

      if (this.keyBindingDescriptor && typeof this.deck.removeKeyBinding === 'function') {
        this.deck.removeKeyBinding(this.keyBindingDescriptor.keyCode);
      }
      this.keyBindingDescriptor = null;

      if (this.header && this.dragHandlers) {
        this.header.removeEventListener('pointerdown', this.dragHandlers.onPointerDown);
        this.header.removeEventListener('pointermove', this.dragHandlers.onPointerMove);
        this.header.removeEventListener('pointerup', this.dragHandlers.onPointerUp);
        this.header.removeEventListener('pointercancel', this.dragHandlers.onPointerUp);
      }

      if (this.resizeHandle && this.resizeHandlers) {
        this.resizeHandle.removeEventListener('pointerdown', this.resizeHandlers.onPointerDown);
        this.resizeHandle.removeEventListener('pointermove', this.resizeHandlers.onPointerMove);
        this.resizeHandle.removeEventListener('pointerup', this.resizeHandlers.onPointerUp);
        this.resizeHandle.removeEventListener('pointercancel', this.resizeHandlers.onPointerUp);
      }

      if (this.container) {
        if (this.onContainerPointerDown) {
          this.container.removeEventListener('pointerdown', this.onContainerPointerDown);
        }
        if (this.onContainerFocusIn) {
          this.container.removeEventListener('focusin', this.onContainerFocusIn);
        }
        this.container.removeEventListener('focusout', this.handleFocusOut);
      }

      if (this.closeButton && this.onCloseClick) {
        this.closeButton.removeEventListener('click', this.onCloseClick);
      }
      this.closeButton = null;

      if (this.display) {
        if (this.onDisplayFocus) {
          this.display.removeEventListener('focus', this.onDisplayFocus);
        }
        if (this.onDisplayBlur) {
          this.display.removeEventListener('blur', this.onDisplayBlur);
        }
        if (this.onDisplayKeydown) {
          this.display.removeEventListener('keydown', this.onDisplayKeydown);
        }
      }

      if (this.container) {
        this.container.remove();
      }

      if (this.adjustedRootPosition) {
        if (this.originalRootPosition) {
          this.root.style.position = this.originalRootPosition;
        } else {
          this.root.style.removeProperty('position');
        }
      }

      if (this.collapseTimeoutId) {
        window.clearTimeout(this.collapseTimeoutId);
        this.collapseTimeoutId = null;
      }

      this.container = null;
      this.display = null;
      this.startPauseButton = null;
      this.resetButton = null;
      this.resizeHandle = null;
      this.header = null;
      this.dragHandlers = null;
      this.resizeHandlers = null;
      this.onContainerPointerDown = null;
      this.onContainerFocusIn = null;
      this.onCloseClick = null;
      this.onDisplayFocus = null;
      this.onDisplayBlur = null;
      this.onDisplayKeydown = null;
    }
  }

  const CountdownTimerPlugin = {
    id: 'countdownTimer',
    init: function (deck) {
      const timer = new CountdownTimer(deck);
      timer.init();

      const registry = resolveRegistry();
      if (registry && typeof registry.register === 'function') {
        registry.register({
          id: 'countdownTimer',
          title: 'Countdown Timer',
          hotkey: 'T',
          toggle: () => timer.toggleVisibility(),
          description: 'Toggle countdown timer',
          keyBindingManaged: true,
        });
      }

      const cleanup = () => {
        timer.destroy();
        if (registry && typeof registry.unregister === 'function') {
          registry.unregister('countdownTimer');
        }
      };

      return {
        show: () => timer.show(),
        hide: () => timer.hide(),
        toggle: () => timer.toggleVisibility(),
        start: () => timer.start(),
        pause: () => timer.pause(),
        reset: () => timer.reset(),
        destroy: cleanup,
      };
    },
  };

  CountdownTimerPlugin.__internals = {
    parseTimeToSeconds,
    formatTime,
  };

  if (typeof window !== 'undefined') {
    window.RevealCountdownTimer = CountdownTimerPlugin;
    if (window.Reveal && typeof window.Reveal.registerPlugin === 'function') {
      window.Reveal.registerPlugin('countdownTimer', CountdownTimerPlugin);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CountdownTimerPlugin;
    module.exports.__internals = CountdownTimerPlugin.__internals;
  }
})();
