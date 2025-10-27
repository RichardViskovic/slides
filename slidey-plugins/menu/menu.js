(function () {
  const STYLE_ID = 'slidey-menu-style';
  const MENU_ID = 'slidey-menu';
  const TOGGLE_ID = 'slidey-menu-toggle';
  const HOTKEY = 'M';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .reveal #${TOGGLE_ID} {
        position: absolute;
        bottom: 16px;
        left: 16px;
        z-index: 70;
        border: none;
        border-radius: 999px;
        background: rgba(34, 34, 34, 0.85);
        color: #fff;
        font-size: 22px;
        line-height: 1;
        padding: 12px 20px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(3px);
        transition: opacity 200ms ease;
      }

      .reveal #${TOGGLE_ID} .hotkey {
        font-size: 12px;
        opacity: 0.7;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .reveal #${TOGGLE_ID}:hover,
      .reveal #${TOGGLE_ID}:focus-visible {
        opacity: 0.9;
      }

      .reveal #${MENU_ID} {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        top: 24px;
        z-index: 65;
        min-width: min(80vw, 680px);
        max-width: 90vw;
        padding: 12px 18px 14px;
        border-radius: 16px;
        background: rgba(16, 16, 16, 0.88);
        color: #f6f6f6;
        box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(6px);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .reveal #${MENU_ID}[data-hidden="true"] {
        display: none;
      }

      .reveal #${MENU_ID} .menu-title {
        font-size: 18px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        opacity: 0.75;
      }

      .reveal #${MENU_ID} .menu-items {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .reveal #${MENU_ID} .menu-item {
        border: none;
        border-radius: 12px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.92);
        color: #111;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.25);
        transition: transform 120ms ease, box-shadow 120ms ease;
      }

      .reveal #${MENU_ID} .menu-item .menu-hotkey {
        font-size: 13px;
        line-height: 1;
        padding: 3px 6px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.08);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(0, 0, 0, 0.65);
      }

      .reveal #${MENU_ID} .menu-item:hover,
      .reveal #${MENU_ID} .menu-item:focus-visible {
        transform: translateY(-1px);
        box-shadow: 0 14px 24px rgba(0, 0, 0, 0.25);
      }

      .reveal #${MENU_ID} .menu-empty {
        font-size: 14px;
        opacity: 0.7;
      }
    `;
    document.head.appendChild(style);
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

  class SlideyMenu {
    constructor(deck) {
      this.deck = deck;
      this.root = deck.getRevealElement();
      this.toggleButton = null;
      this.menu = null;
      this.itemsContainer = null;
      this.isVisible = false;
      this.boundHotkeys = new Map();
      this.pluginGlobalHotkeys = new Map();
      this.globalHotkeyHandlers = new Map();
      this.globalKeydownHandler = null;
      this.menuKeyBinding = null;
      this.menuFallbackKey = null;
      this.registry = resolveRegistry();
      this.onToggleClick = this.toggleVisibility.bind(this);
      this.onRegistryUpdate = this.onRegistryUpdate.bind(this);
      this.originalRootPosition = '';
      this.adjustedRootPosition = false;
    }

    init() {
      injectStyles();
      this.ensureRootPositioning();
      this.createToggleButton();
      this.createMenu();
      this.attachKeyBindings();
      this.renderItems();
      this.hide(false);
      if (typeof window !== 'undefined') {
        window.addEventListener('slideyplugins:registryupdate', this.onRegistryUpdate);
      }
    }

    destroy() {
      this.hide();
      this.detachKeyBindings();
      this.unbindPluginHotkeys();
      this.unbindPluginFallbackHotkeys();
      this.clearGlobalHotkeys();

      if (typeof window !== 'undefined') {
        window.removeEventListener('slideyplugins:registryupdate', this.onRegistryUpdate);
      }

      if (this.toggleButton) {
        this.toggleButton.removeEventListener('click', this.onToggleClick);
        this.toggleButton.remove();
        this.toggleButton = null;
      }

      if (this.menu) {
        this.menu.remove();
        this.menu = null;
      }

      this.itemsContainer = null;

      if (this.adjustedRootPosition) {
        if (this.originalRootPosition) {
          this.root.style.position = this.originalRootPosition;
        } else {
          this.root.style.removeProperty('position');
        }
      }
    }

    ensureRootPositioning() {
      const computed = window.getComputedStyle(this.root);
      if (computed.position === 'static') {
        this.originalRootPosition = this.root.style.position;
        this.root.style.position = 'relative';
        this.adjustedRootPosition = true;
      }
    }

    createToggleButton() {
      if (this.toggleButton) {
        return;
      }
      const button = document.createElement('button');
      button.id = TOGGLE_ID;
      button.type = 'button';
      button.setAttribute('aria-controls', MENU_ID);
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = `☰ Menu <span class="hotkey">${HOTKEY}</span>`;
      button.addEventListener('click', this.onToggleClick);
      this.toggleButton = button;
      this.root.appendChild(button);
    }

    createMenu() {
      if (this.menu) {
        return;
      }

      const menu = document.createElement('div');
      menu.id = MENU_ID;
      menu.setAttribute('role', 'region');
      menu.setAttribute('data-hidden', 'true');
      menu.setAttribute('aria-hidden', 'true');
      menu.setAttribute('aria-label', 'Slidey plugins menu');

      const title = document.createElement('div');
      title.className = 'menu-title';
      title.textContent = 'Apps';

      const items = document.createElement('div');
      items.className = 'menu-items';

      menu.appendChild(title);
      menu.appendChild(items);

      this.root.appendChild(menu);

      this.menu = menu;
      this.itemsContainer = items;
    }

    attachKeyBindings() {
      const handler = () => this.toggleVisibility();
      const descriptor = {
        keyCode: HOTKEY.toUpperCase().charCodeAt(0),
        key: HOTKEY,
        description: 'Toggle Slidey menu',
      };

      if (typeof this.deck.addKeyBinding === 'function') {
        this.deck.addKeyBinding(descriptor, handler);
        this.menuKeyBinding = descriptor;
      } else {
        this.registerGlobalHotkey(HOTKEY, handler, 'menu');
      }
    }

    detachKeyBindings() {
      if (this.menuKeyBinding && typeof this.deck.removeKeyBinding === 'function') {
        this.deck.removeKeyBinding(this.menuKeyBinding.keyCode);
        this.menuKeyBinding = null;
      }

      if (this.menuFallbackKey) {
        this.unregisterGlobalHotkey(this.menuFallbackKey);
        this.menuFallbackKey = null;
      }
    }

    registerGlobalHotkey(key, handler, scope) {
      if (typeof window === 'undefined') {
        return;
      }

      const normalized = key.toUpperCase();

      if (this.globalHotkeyHandlers.has(normalized)) {
        return;
      }

      this.globalHotkeyHandlers.set(normalized, handler);
      if (scope === 'plugin') {
        this.pluginGlobalHotkeys.set(normalized, handler);
      } else if (scope === 'menu') {
        this.menuFallbackKey = normalized;
      }

      this.ensureGlobalKeydownListener();
    }

    unregisterGlobalHotkey(key) {
      if (!key) {
        return;
      }
      const normalized = key.toUpperCase();
      this.globalHotkeyHandlers.delete(normalized);
      this.pluginGlobalHotkeys.delete(normalized);
      if (this.menuFallbackKey === normalized) {
        this.menuFallbackKey = null;
      }
      this.pruneGlobalKeydownListener();
    }

    ensureGlobalKeydownListener() {
      if (this.globalKeydownHandler || typeof window === 'undefined') {
        return;
      }

      this.globalKeydownHandler = (event) => {
        if (!event.key) {
          return;
        }
        const handler = this.globalHotkeyHandlers.get(event.key.toUpperCase());
        if (typeof handler === 'function') {
          handler(event);
        }
      };

      window.addEventListener('keydown', this.globalKeydownHandler);
    }

    pruneGlobalKeydownListener() {
      if (!this.globalHotkeyHandlers.size && this.globalKeydownHandler && typeof window !== 'undefined') {
        window.removeEventListener('keydown', this.globalKeydownHandler);
        this.globalKeydownHandler = null;
      }
    }

    clearGlobalHotkeys() {
      if (typeof window !== 'undefined' && this.globalKeydownHandler) {
        window.removeEventListener('keydown', this.globalKeydownHandler);
      }
      this.globalKeydownHandler = null;
      this.globalHotkeyHandlers.clear();
      this.pluginGlobalHotkeys.clear();
      this.menuFallbackKey = null;
    }

    unbindPluginHotkeys() {
      if (typeof this.deck.removeKeyBinding !== 'function') {
        this.boundHotkeys.clear();
        return;
      }

      for (const entry of this.boundHotkeys.values()) {
        if (entry && typeof entry.keyCode === 'number') {
          this.deck.removeKeyBinding(entry.keyCode);
        }
      }
      this.boundHotkeys.clear();
    }

    unbindPluginFallbackHotkeys() {
      if (!this.pluginGlobalHotkeys.size) {
        return;
      }
      for (const key of this.pluginGlobalHotkeys.keys()) {
        this.unregisterGlobalHotkey(key);
      }
      this.pluginGlobalHotkeys.clear();
    }

    renderItems() {
      if (!this.itemsContainer) {
        return;
      }
      this.itemsContainer.innerHTML = '';

      if (!this.registry) {
        const empty = document.createElement('div');
        empty.className = 'menu-empty';
        empty.textContent = 'Registry unavailable.';
        this.itemsContainer.appendChild(empty);
        return;
      }

      const entries = this.registry
        .getAll()
        .filter((entry) => entry && entry.id !== 'slideyMenu')
        .map((entry) => ({
          ...entry,
          title: entry.title || entry.id,
          hotkey: entry.hotkey ? String(entry.hotkey).toUpperCase() : '',
        }))
        .sort((a, b) => a.title.localeCompare(b.title));

      this.unbindPluginHotkeys();
      this.unbindPluginFallbackHotkeys();

      if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = 'menu-empty';
        empty.textContent = 'No apps registered.';
        this.itemsContainer.appendChild(empty);
        return;
      }

      entries.forEach((entry) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'menu-item';
        button.dataset.pluginId = entry.id;
        button.textContent = entry.title;

        if (entry.hotkey) {
          const hotkey = document.createElement('span');
          hotkey.className = 'menu-hotkey';
          hotkey.textContent = entry.hotkey;
          button.appendChild(hotkey);
          this.bindPluginHotkey(entry);
        }

        button.addEventListener('click', () => {
          if (typeof entry.toggle === 'function') {
            entry.toggle();
          }
        });

        this.itemsContainer.appendChild(button);
      });
    }

    bindPluginHotkey(entry) {
      if (!entry.hotkey || entry.keyBindingManaged) {
        return;
      }

      const key = entry.hotkey.toUpperCase();
      if (this.boundHotkeys.has(key) || this.pluginGlobalHotkeys.has(key)) {
        return;
      }

      const handler = () => {
        if (typeof entry.toggle === 'function') {
          entry.toggle();
        }
      };

      if (typeof this.deck.addKeyBinding === 'function') {
        const descriptor = {
          keyCode: key.charCodeAt(0),
          key,
          description: entry.description || `Toggle ${entry.title || entry.id}`,
        };
        this.deck.addKeyBinding(descriptor, handler);
        this.boundHotkeys.set(key, { keyCode: descriptor.keyCode });
      } else {
        this.registerGlobalHotkey(key, handler, 'plugin');
      }
    }

    onRegistryUpdate() {
      this.registry = this.registry || resolveRegistry();
      this.renderItems();
    }

    show() {
      this.isVisible = true;
      this.menu?.setAttribute('data-hidden', 'false');
      this.menu?.setAttribute('aria-hidden', 'false');
      this.menu?.style.removeProperty('display');
      this.toggleButton?.setAttribute('aria-expanded', 'true');
    }

    hide(updateToggle = true) {
      this.isVisible = false;
      this.menu?.setAttribute('data-hidden', 'true');
      this.menu?.setAttribute('aria-hidden', 'true');
      this.menu?.style.setProperty('display', 'none', 'important');
      if (updateToggle) {
        this.toggleButton?.setAttribute('aria-expanded', 'false');
      }
    }

    toggleVisibility() {
      if (this.isVisible) {
        this.hide();
      } else {
        this.show();
      }
    }
  }

  const SlideyMenuPlugin = {
    id: 'slideyMenu',
    init(deck) {
      const menu = new SlideyMenu(deck);
      menu.init();
      return {
        show: () => menu.show(),
        hide: () => menu.hide(),
        toggle: () => menu.toggleVisibility(),
        destroy: () => menu.destroy(),
      };
    },
  };

  if (typeof window !== 'undefined') {
    window.RevealSlideyMenu = SlideyMenuPlugin;
    if (window.Reveal && typeof window.Reveal.registerPlugin === 'function') {
      window.Reveal.registerPlugin('slideyMenu', SlideyMenuPlugin);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SlideyMenuPlugin;
  }
})();
