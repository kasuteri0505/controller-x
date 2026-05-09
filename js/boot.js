/* ══════════════════════════════════════════════════════════════
   boot.js — ProfitFlow Labs
   Inicializa o app e carrega módulos pesados em background
   ══════════════════════════════════════════════════════════════ */

/* Módulos lazy — carregam em background após o app inicializar
   Divididos em 2 grupos por prioridade */
const LAZY_HIGH = [
  '/js/wallet.js?v=4', '/js/finance.js?v=4',
  '/js/billing.js?v=4', '/js/settings.js?v=4',
  '/js/export.js?v=4', '/js/notifications.js?v=4', '/js/yield.js?v=4',
];

const LAZY_LOW = [
  '/js/trading.js?v=4', '/js/p2p.js?v=4',
  '/js/home.js?v=4', '/js/extras.js?v=4',
  '/js/notif_board.js?v=4', '/js/charts.js?v=4',
];

/* Carrega um script dinamicamente e retorna uma Promise */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(); return; /* já carregado */
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload  = resolve;
    s.onerror = () => { console.warn('[boot] Falha ao carregar:', src); resolve(); };
    document.head.appendChild(s);
  });
}

/* Carrega uma lista de scripts em paralelo */
async function loadGroup(scripts) {
  await Promise.all(scripts.map(loadScript));
}

/* Boot principal */
document.addEventListener('DOMContentLoaded', async () => {
  /* 1. Inicializa o app (login, Firebase auth, renderApp) */
  init();

  /* 2. Após 1s — carrega módulos de alta prioridade em background */
  setTimeout(async () => {
    await loadGroup(LAZY_HIGH);
    console.log('[boot] Módulos principais carregados');
  }, 1000);

  /* 3. Após 4s — carrega módulos de baixa prioridade */
  setTimeout(async () => {
    await loadGroup(LAZY_LOW);
    console.log('[boot] Todos os módulos carregados');
  }, 4000);
});
