// 簡易路由/畫面管理，與模式管理分離（繁體中文註釋）
(function (global) {
  'use strict';

  const Screens = new Map();

  function registerScreen(name, factory) {
    Screens.set(name, factory);
  }

  let current = null;
  function go(name, params) {
    if (current && current.unmount) {
      try { current.unmount(); } catch (e) { console.warn(e); }
    }
    const root = PPApp._root; // 從 PPApp 取得根
    root.innerHTML = '';
    const factory = Screens.get(name);
    if (!factory) throw new Error('未註冊畫面：' + name);
    current = factory({ root, db: PPApp._db, params });
    if (current && current.mount) current.mount();
  }

  // 擴充 PPApp 的畫面能力
  (function extendApp() {
    const _init = PPApp.init.bind(PPApp);
    PPApp.init = function (...args) { _init(...args); };
    PPApp.registerScreen = registerScreen;
    PPApp.go = go;
  })();

})(window);
