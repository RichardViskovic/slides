(function (global) {
  const REGISTRY_KEY = 'SlideyPluginRegistry';
  const EVENT_NAME = 'slideyplugins:registryupdate';

  function ensureArray() {
    if (!Array.isArray(global[REGISTRY_KEY])) {
      global[REGISTRY_KEY] = [];
    }
    return global[REGISTRY_KEY];
  }

  function dispatch(action, plugin, previous) {
    if (typeof global.dispatchEvent === 'function' && typeof global.CustomEvent === 'function') {
      try {
        const detail = { action, plugin, previous };
        global.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
      } catch (error) {
        /* noop */
      }
    }
  }

  function normalizeHotkey(hotkey) {
    if (!hotkey) {
      return '';
    }
    return String(hotkey).trim().toUpperCase();
  }

  function register(meta) {
    if (!meta || !meta.id) {
      throw new Error('Slidey plugin registration requires an id.');
    }

    const registry = ensureArray();
    const hotkey = normalizeHotkey(meta.hotkey);

    if (hotkey) {
      const conflict = registry.find(
        (entry) => entry.id !== meta.id && normalizeHotkey(entry.hotkey) === hotkey,
      );
      if (conflict) {
        console.warn(
          `[slidey] Plugin "${meta.id}" hotkey "${hotkey}" collides with "${conflict.id}".`,
        );
      }
    }

    const nextEntry = {
      ...meta,
      hotkey,
      registeredAt: Date.now(),
    };

    const index = registry.findIndex((entry) => entry.id === meta.id);
    const previous = index >= 0 ? registry[index] : null;

    if (index >= 0) {
      registry[index] = { ...previous, ...nextEntry };
    } else {
      registry.push(nextEntry);
    }

    dispatch('register', nextEntry, previous);
    return nextEntry;
  }

  function unregister(id) {
    if (!id) {
      return null;
    }

    const registry = ensureArray();
    const index = registry.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return null;
    }

    const [removed] = registry.splice(index, 1);
    dispatch('unregister', null, removed);
    return removed;
  }

  function getAll() {
    return ensureArray().slice();
  }

  const api = {
    register,
    unregister,
    getAll,
    EVENT_NAME,
  };

  global.SlideyPlugins = Object.assign({}, global.SlideyPlugins, { registry: api });
  ensureArray();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
