// 應用骨架與模式管理（繁體中文註釋）
(function (global) {
  'use strict';

  const PPApp = {
    _root: null,
    _db: null,
    _modes: new Map(),
    _current: null,

    init({ rootId, db }) {
      this._root = document.getElementById(rootId);
      if (!this._root) throw new Error('找不到根元素 #' + rootId);
      this._db = db;
    },

    registerMode(name, factory) {
      // factory: (ctx) => { mount(root), unmount() }
      this._modes.set(name, factory);
    },

    start(name, params) {
      if (this._current && this._current.unmount) {
        try { this._current.unmount(); } catch (e) { console.warn(e); }
      }
      this._root.innerHTML = '';
      const factory = this._modes.get(name);
      if (!factory) throw new Error('未註冊模式：' + name);
      this._current = factory({ root: this._root, db: this._db, params });
      if (this._current && this._current.mount) this._current.mount();
    }
  };

  global.PPApp = PPApp;
})(window);
