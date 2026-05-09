/* ══════════════════════════════════════════════════════════════════════
   FEATURE 7 — PWA: Service Worker Registration
   ══════════════════════════════════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('✅ SW registrado:', reg.scope))
      .catch(err => console.warn('SW erro:', err));
  });
}

/* PWA install banner removed */


/* ══════════════════════════════════════════════════════════════
   PLATFORM MODULES — Admin-controlled global visibility
   Reads from Firestore platform/modules and overrides user prefs
   ══════════════════════════════════════════════════════════════ */
let _platformModuleConfig = null;

async function loadPlatformModules() {
  try {
    const doc = await fbDb.collection('platform').doc('modules').get();
    if(doc.exists) {
      _platformModuleConfig = doc.data() || {};
    }
  } catch(e) {
    console.warn('Platform modules load error:', e.message);
    _platformModuleConfig = {};
  }
}

/* Override modulesLoad — executado só após pools.js carregar via boot.js */
window._applyPlatformModules = function() {
  if (typeof modulesLoad !== 'function' || !_platformModuleConfig) return;
  const _orig = modulesLoad;
  window.modulesLoad = function() {
    const userMods = _orig();
    const result = {};
    Object.keys(userMods).forEach(id => {
      result[id] = _platformModuleConfig[id] !== false ? userMods[id] : false;
    });
    return result;
  };
};

/* Show maintenance banner when a module is disabled by admin */
const _origSwitchTab = window.switchTab;
if(typeof switchTab === 'function') {
  const __orig = switchTab;
  window.switchTab = function(tab) {
    if(_platformModuleConfig && _platformModuleConfig[tab] === false) {
      // Show maintenance overlay instead of module
      const panel = document.getElementById('panel-' + tab);
      if(panel) {
        panel.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center">
          <div style="font-size:48px;margin-bottom:1rem">🔧</div>
          <h2 style="font-size:22px;font-weight:800;margin-bottom:.75rem">Em manutenção</h2>
          <p style="font-size:14px;color:var(--text2);max-width:400px;line-height:1.6;margin-bottom:1.5rem">
            Este módulo está temporariamente indisponível. Nossa equipe está trabalhando para reativá-lo em breve.
          </p>
          <div style="padding:12px 20px;background:var(--amber-bg);border:1px solid rgba(255,183,77,.3);border-radius:10px;font-size:13px;color:var(--amber-text)">
            ⏳ Módulo desativado pelo administrador
          </div>
        </div>`;
      }
      // Still switch visually but show maintenance
      __orig.apply(this, [tab]);
      return;
    }
    __orig.apply(this, [tab]);
  };
}


/* ══════════════════════════════════════════════════════════════════════
   FEATURE 1 — NOTIFICAÇÕES PUSH (Firebase Cloud Messaging)
   ══════════════════════════════════════════════════════════════════════ */

