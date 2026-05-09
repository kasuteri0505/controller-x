/* Stub — substituído por extras.js quando carregar */
if (typeof getConnectedWallet === 'undefined') {
  window.getConnectedWallet = function() {
    if (!session) return null;
    return stGet(session.user.uid + '_wallet_addr') || null;
  };
}

function buildTopNav() {
  const mods = (typeof modulesLoad === 'function') ? modulesLoad() : {};
  const show = id => mods[id] !== false;
  const item = (id, label) => {
    const icon = NAV_ICONS[id] ? `<span class="topnav-item-icon">${NAV_ICONS[id]}</span>` : '';
    return `<button class="topnav-item" id="nav-${id}" onclick="switchTab('${id}')">${icon}<span>${label}</span></button>`;
  };
  let html = '';
  if(show('dashboard'))      html += item('dashboard',       t('dashboard'));
  if(show('positions'))      html += item('positions',       t('positions'));
  if(show('wallet'))         html += item('wallet',          t('wallet_label'));
  if(show('finance'))        html += item('finance',         t('finance'));
  if(show('copytrading'))    html += item('copytrading',     t('copytrading'));
  if(show('comunidade'))     html += item('comunidade',      'Comunidade');
  // Ocultos temporariamente:
  // home, p2p, dp, dpjp, relatoriosbr, relatoriosjp, imovelvendas, imovellocation, consorcios, options
  return html;
}

function renderApp() {
  setTimeout(initFCM, 2000);
  const u    = session.user;
  const prof = stGet(u.uid+'_profile')||{};
  const sub  = subStatusLabel();

  try {
    const poolKeys = stKeys(u.uid + '_pool_');
    poolKeys.forEach(k => { const p = stGet(k); if (p && p.ts) syncPoolToWallet(p, k); });
  } catch(e) { console.warn('retroactive pool sync error', e); }

  const avatarHtml = prof.avatar
    ? `<img src="${prof.avatar}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">`
    : `<span style="font-size:12px;font-weight:700;color:var(--blue-text)">${getInitials(prof.name||u.name)}</span>`;

  R.innerHTML = `
  <!-- Aurora animated background -->
  <div class="aurora-bg">
    <div class="aurora-orb orb-1"></div>
    <div class="aurora-orb orb-2"></div>
    <div class="aurora-orb orb-3"></div>
    <div class="aurora-orb orb-4"></div>
  </div>

  <div class="app-shell-top">

    <!-- ══ TOPNAV ══ -->
    <header class="topnav" id="topnav">

      <!-- Logo -->
      <div class="topnav-logo" onclick="switchTab('dashboard')" style="cursor:pointer">
        <img src="/icon-192.png" style="width:32px;height:32px;border-radius:8px;object-fit:cover;flex-shrink:0">
        <span class="topnav-logo-text">ProfitFlow<span class="topnav-logo-sub"> Labs</span></span>
      </div>

      <!-- Nav items (desktop) -->
      <nav class="topnav-nav" id="topnav-nav">
        ${buildTopNav()}
      </nav>

      <!-- Right side -->
      <div class="topnav-right">
        ${maybeRenderTrialBanner()?`<button class="btn btn-sm" style="color:var(--amber);border-color:var(--amber);font-size:11px;padding:4px 10px" onclick="switchTab('settings');setTimeout(()=>document.getElementById('billing-section')?.scrollIntoView({behavior:'smooth'}),100)">⏰ Trial</button>`:''}

        <button class="topnav-icon-btn" onclick="openSuggestionBox()" title="${t('suggestions_bugs')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>

        <button class="topnav-icon-btn" onclick="applyTheme(appTheme==='dark'?'light':'dark');renderApp()" title="${t('theme')}">
          ${appTheme==='dark'?'🌙':'☀️'}
        </button>

        <!-- User menu -->
        <div class="user-menu-wrap">
          <button class="topnav-user-btn" id="user-menu-btn" onclick="toggleUserMenu()">
            <div class="topnav-avatar">${avatarHtml}</div>
            <span class="topnav-user-name">${prof.name||u.name}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="user-menu" id="user-menu" style="display:none;top:56px;right:0;left:auto;bottom:auto;min-width:200px">
            <div style="padding:10px 14px;border-bottom:1px solid var(--border)">
              <div style="font-size:13px;font-weight:600;color:var(--text)">${prof.name||u.name}</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px">${u.email}</div>
              <span class="sub-status-pill ${sub.cls}" style="font-size:10px;margin-top:6px;display:inline-block">${sub.label}</span>
            </div>
            <button class="user-menu-item" onclick="closeUserMenu();switchTab('profile')"><span style="font-size:15px">👤</span> Meu Perfil</button>
            <button class="user-menu-item" onclick="closeUserMenu();switchTab('settings')"><span style="font-size:15px">⚙</span> ${t('profile')}</button>
            ${prof.role==='admin'||prof.isAdmin?`<button class="user-menu-item" onclick="closeUserMenu();openAdminPanel()" style="color:#39ff8a;font-weight:700"><span style="font-size:15px">🛡️</span> Painel Admin</button>`:''}
            <hr class="user-menu-divider">
            <div style="padding:6px 14px">
              <div style="font-size:10px;color:var(--text3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em">${t('theme')} / ${t('language')}</div>
              <div style="display:flex;gap:5px;flex-wrap:wrap">
                <button class="lang-btn ${appTheme==='dark'?'active':''}" style="padding:4px 8px;font-size:12px" onclick="applyTheme('dark');renderApp()">🌙</button>
                <button class="lang-btn ${appTheme==='light'?'active':''}" style="padding:4px 8px;font-size:12px" onclick="applyTheme('light');renderApp()">☀</button>
                <span style="width:1px;background:var(--border);margin:0 3px"></span>
                <button class="lang-btn ${appLang==='pt'?'active':''}" style="padding:3px 6px;font-size:10px" onclick="applyLang('pt')">🇧🇷 BR</button>
                <button class="lang-btn ${appLang==='en'?'active':''}" style="padding:3px 6px;font-size:10px" onclick="applyLang('en')">🇺🇸 EN</button>
              </div>
            </div>
            <hr class="user-menu-divider">
            <button class="user-menu-item danger" onclick="closeUserMenu();doLogout()"><span style="font-size:15px">↩</span> ${t('logout')}</button>
          </div>
        </div>

        <!-- Hamburger (mobile) -->
        <button class="topnav-hamburger" id="topnav-hamburger" onclick="toggleMobileNav()">☰</button>
      </div>
    </header>

    <!-- Mobile nav drawer -->
    <div class="topnav-mobile-nav" id="topnav-mobile-nav">
      ${buildTopNav()}
    </div>
    <!-- Mobile overlay -->
    <div class="topnav-overlay" id="topnav-overlay" onclick="closeMobileNav()"></div>

    <!-- ══ MAIN LAYOUT COM SIDEBARS ══ -->
    <div class="topnav-main" id="main-content">
      <div class="app-layout">

        <!-- SIDEBAR ESQUERDA -->
        <aside class="sb-left" id="sb-left">
          <div class="sb-loading">
            <div class="sb-spinner"></div>
          </div>
        </aside>

        <!-- CONTEÚDO CENTRAL -->
        <div class="app-center">
          <div class="page-content">
            <div id="panel-dashboard"      class="panel active"></div>
            <div id="panel-wallet"         class="panel"></div>
            <div id="panel-finance"        class="panel"></div>
            <div id="panel-positions"      class="panel"></div>
            <div id="panel-copytrading"    class="panel"></div>
            <div id="panel-options"        class="panel"></div>
            <div id="panel-settings"       class="panel"></div>
            <div id="panel-profile"        class="panel"></div>
            <div id="panel-dp"             class="panel"></div>
            <div id="panel-dpjp"           class="panel"></div>
            <div id="panel-p2p"            class="panel"></div>
            <div id="panel-relatoriosbr"   class="panel"></div>
            <div id="panel-relatoriosjp"   class="panel"></div>
            <div id="panel-imovelvendas"   class="panel"></div>
            <div id="panel-imovellocation" class="panel"></div>
            <div id="panel-consorcios"     class="panel"></div>
            <div id="panel-comunidade"     class="panel"></div>
          </div>
        </div>

        <!-- SIDEBAR DIREITA -->
        <aside class="sb-right" id="sb-right">
          <div class="sb-loading">
            <div class="sb-spinner"></div>
          </div>
        </aside>

      </div>
    </div>

  </div>`;

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-dashboard')?.classList.add('active');
  renderDashboard();
  setActiveNav('dashboard');
  // Inicializa sidebars após DOM pronto
  setTimeout(() => document.dispatchEvent(new Event('sidebars:ready')), 100);
}



const NAV_ICONS = {
  home: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  dashboard:      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  comunidade:     '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  positions:      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M2 12c0 4.4 4.5 8 10 8s10-3.6 10-8"/><path d="M2 12c0-4.4 4.5-8 10-8s10 3.6 10 8"/></svg>',
  copytrading:    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  options:        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  p2p:            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3L4 7l4 4"/><path d="M4 7h16"/><path d="M16 21l4-4-4-4"/><path d="M20 17H4"/></svg>',
  wallet:         '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/><circle cx="17" cy="12" r="1"/></svg>',
  finance:        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  dp:             '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  dpjp:           '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12.01"/><path d="M8 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg>',
  relatoriosbr:   '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  relatoriosjp:   '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  imovelvendas:   '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/><line x1="12" y1="2" x2="12" y2="8"/><line x1="9" y1="5" x2="15" y2="5"/></svg>',
  imovellocation: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  consorcios:     '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  settings:       '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
};
function navItem(id, icon, label, badge='') {
  const svgIcon = NAV_ICONS[id] || `<span style="font-size:15px">${icon}</span>`;
  return `<button class="nav-item" id="nav-${id}" onclick="switchTab('${id}')">
    <span class="nav-icon">${svgIcon}</span>
    <span class="nav-label">${label}</span>
    ${badge?`<span class="nav-badge">${badge}</span>`:''}
  </button>`;
}

function setActiveNav(id) {
  document.querySelectorAll('.topnav-item, .topnav-mobile-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#nav-'+id).forEach(el => el.classList.add('active'));
  const titles = { dashboard:'Dashboard', wallet:t('wallet'), finance:t('finance'),
    positions:t('positions'), profile:'Meu Perfil', copytrading:'Copy Trading', options:t('options'), dp:'Depto. Pessoal', p2p:'P2P Cripto', dpjp:'人事部 Japan HR', settings:t('settings') };
  const tb = document.getElementById('topbar-title');
  if(tb) tb.textContent = titles[id]||id;
}

function toggleSidebar(e) {
  if(e) { e.stopPropagation(); e.preventDefault(); }
  const sb  = document.getElementById('sidebar');
  const mc  = document.getElementById('main-content');
  const ico = document.getElementById('sidebar-toggle-icon');
  const tab = document.getElementById('sidebar-tab');
  if(!sb) return;
  const isCollapsed = sb.classList.toggle('collapsed');
  if(mc) mc.classList.toggle('collapsed', isCollapsed);
  if(ico) ico.textContent = isCollapsed ? '›' : '‹';
  if(tab) tab.style.left = isCollapsed ? '48px' : '228px';
  localStorage.setItem('cashflow_sidebar', isCollapsed?'1':'0');
}

function openSidebarMobile() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('sidebar-overlay').classList.add('show');
}
function closeSidebarMobile() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

function toggleUserMenu() {
  const m = document.getElementById('user-menu');
  if(!m) return;
  m.style.display = m.style.display==='none' ? 'block' : 'none';
}
function closeUserMenu() {
  const m = document.getElementById('user-menu');
  if(m) m.style.display='none';
}
document.addEventListener('click', e=>{
  if(!e.target.closest('.user-menu-wrap')) closeUserMenu();
});

function switchTab(t) {
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  const panel = document.getElementById('panel-'+t);
  if(panel) panel.classList.add('active');
  setActiveNav(t);
  closeMobileNav();
  if(t==='positions')   loadPositions();
  if(t==='dashboard')   renderDashboard();
  if(t==='wallet')      renderWallet();
  if(t==='finance')     renderFinance();
  if(t==='settings')    renderSettings();
  if(t==='profile')     renderProfile();
  if(t==='copytrading') renderCopyTrading();
  if(t==='options')     renderOptions();
  if(t==='dp')          renderDP();
  if(t==='dpjp')        renderDPJP();
  if(t==='p2p')         renderP2P();
  if(t==='relatoriosbr') renderRelatoriosBR();
  if(t==='relatoriosjp') renderRelatoriosJP();
  if(t==='imovelvendas') renderImovelVendas();
  if(t==='imovellocation') renderImovelLocacao();
  if(t==='consorcios') renderConsorcios();
  if(t==='comunidade') renderComunidade();
}

// Accordion menu - expand only one group at a time

function toggleMobileNav() {
  const nav = document.getElementById('topnav-mobile-nav');
  const ov  = document.getElementById('topnav-overlay');
  if (!nav) return;
  const open = nav.classList.toggle('open');
  if (ov) ov.classList.toggle('show', open);
}
function closeMobileNav() {
  const nav = document.getElementById('topnav-mobile-nav');
  const ov  = document.getElementById('topnav-overlay');
  if (nav) nav.classList.remove('open');
  if (ov)  ov.classList.remove('show');
}
function toggleSidebarGroup(event, groupIdx) {
  event.preventDefault();
  event.stopPropagation();
  
  const btn = event.currentTarget;
  const container = btn.parentElement;
  const items = container.querySelector(`[data-group="${groupIdx}"]`);
  
  if(!items) return;
  
  const isExpanded = btn.classList.contains('expanded');
  
  // Close all groups
  document.querySelectorAll('.sidebar-group-toggle').forEach(toggle => {
    toggle.classList.remove('expanded');
  });
  document.querySelectorAll('.sidebar-group-items').forEach(group => {
    group.classList.add('collapsed');
  });
  
  // Open clicked group if it wasn't open
  if(!isExpanded) {
    btn.classList.add('expanded');
    items.classList.remove('collapsed');
  }
}



/* ═══════════════════════════════════════════════════════════════
   SIDEBARS — Left (Holdings) & Right (Market + Alerts)
   Chamadas após renderApp(), atualizam via refreshSidebars()
   ═══════════════════════════════════════════════════════════════ */

// Cores por símbolo de ativo
const ASSET_COLORS = {
  BTC:'rgba(247,147,26,0.18)', ETH:'rgba(98,126,234,0.18)', SOL:'rgba(153,69,255,0.18)',
  BNB:'rgba(240,185,11,0.18)', ADA:'rgba(0,51,173,0.18)',   XRP:'rgba(0,170,228,0.18)',
  AVAX:'rgba(232,65,66,0.18)', DOT:'rgba(230,0,122,0.18)',  MATIC:'rgba(130,71,229,0.18)',
  LINK:'rgba(55,91,210,0.18)', ARB:'rgba(28,163,255,0.18)', OP:'rgba(255,4,32,0.18)',
  USDC:'rgba(39,117,202,0.18)',USDT:'rgba(38,161,123,0.18)',DEFAULT:'rgba(139,92,246,0.18)'
};
function assetColor(sym='') { return ASSET_COLORS[sym.toUpperCase()] || ASSET_COLORS.DEFAULT; }

// Formatar números
function fmtUSD(v, digits=2) {
  if(v == null || isNaN(v)) return '—';
  return '$' + Number(v).toLocaleString('en-US', {minimumFractionDigits:digits, maximumFractionDigits:digits});
}
function fmtPct(v) {
  if(v == null || isNaN(v)) return '—';
  const n = Number(v);
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

/* ── BUILD SIDEBAR ESQUERDA ── */
function buildSidebarLeft(assets=[]) {
  const totalValue = assets.reduce((s,a) => s + (Number(a.value)||0), 0);

  const assetRows = assets.length === 0
    ? `<div style="padding:20px;font-size:12px;color:var(--text3);text-align:center">Nenhum ativo encontrado</div>`
    : assets.map(a => {
        const sym   = (a.symbol || a.ticker || '').toUpperCase();
        const name  = a.name  || sym;
        const qty   = a.qty   != null ? Number(a.qty)   : (a.quantity != null ? Number(a.quantity) : null);
        const price = a.price != null ? Number(a.price) : null;
        const val   = a.value != null ? Number(a.value) : (qty && price ? qty*price : null);
        const chg   = a.change24h != null ? Number(a.change24h) : (a.pct24h != null ? Number(a.pct24h) : null);
        const chgColor = chg == null ? 'var(--text3)' : chg >= 0 ? 'var(--green2)' : 'var(--red)';
        const letter = sym.charAt(0) || '?';
        return `
        <div class="sb-asset-item">
          <div class="sb-ai-icon" style="background:${assetColor(sym)}">${letter}</div>
          <div class="sb-ai-info">
            <div class="sb-ai-name">${name}</div>
            <div class="sb-ai-sub">${qty != null ? qty.toLocaleString('en-US',{maximumFractionDigits:4}) + ' ' + sym : sym}</div>
          </div>
          <div class="sb-ai-right">
            <div class="sb-ai-price">${val != null ? fmtUSD(val) : (price != null ? fmtUSD(price) : '—')}</div>
            <div class="sb-ai-chg" style="color:${chgColor}">${chg != null ? fmtPct(chg) : ''}</div>
          </div>
        </div>`;
      }).join('');

  return `
    <div class="sb-portfolio">
      <div class="sb-port-label">Valor Total do Portfólio</div>
      <div class="sb-port-value">${fmtUSD(totalValue, 0)}</div>
    </div>
    <div class="sb-section-head">
      <span>Holdings</span>
      <span class="sb-head-action" onclick="switchTab('wallet')">Ver carteira →</span>
    </div>
    <div class="sb-assets-list">${assetRows}</div>`;
}

/* ── BUILD SIDEBAR DIREITA ── */
function buildSidebarRight(market={}, alerts=[]) {

  // Métricas de mercado
  const mkRows = [
    { label:'Market Cap', value: market.total_market_cap ? fmtUSD(market.total_market_cap/1e12,2)+'T' : '—', cls:''},
    { label:'Volume 24h',  value: market.total_volume    ? fmtUSD(market.total_volume/1e9,1)+'B'      : '—', cls:''},
    { label:'Dominância BTC', value: market.btc_dominance ? market.btc_dominance.toFixed(1)+'%'       : '—', cls:'accent'},
    { label:'Fear & Greed',   value: market.fear_greed   ? market.fear_greed + ' · ' + (market.fear_greed_label||'') : '—', cls:'amber'},
  ].map(r => `
    <div class="sb-defi-row">
      <span class="sb-dr-label">${r.label}</span>
      <span class="sb-dr-value ${r.cls}">${r.value}</span>
    </div>`).join('');

  // Tickers topo (BTC/ETH/SOL)
  const tickers = (market.tickers||[]).map(tk => {
    const chgColor = tk.pct >= 0 ? 'var(--green2)' : 'var(--red)';
    return `<div class="sb-ticker-item">
      <span class="sb-ticker-sym">${tk.sym}</span>
      <span class="sb-ticker-price">${fmtUSD(tk.price)}</span>
      <span class="sb-ticker-chg" style="color:${chgColor}">${fmtPct(tk.pct)}</span>
    </div>`;
  }).join('');

  // Alertas
  const ALERT_COLORS = { price:'var(--amber)', pool:'var(--violet)', gas:'var(--green2)', default:'var(--blue)' };
  const alertRows = alerts.length === 0
    ? `<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px 0">Nenhum alerta ativo</div>`
    : alerts.map(al => {
        const type = (al.type||'default').toLowerCase();
        const barColor = ALERT_COLORS[type] || ALERT_COLORS.default;
        return `
        <div class="sb-alert-item">
          <div class="sb-al-bar" style="background:${barColor}"></div>
          <div class="sb-al-body">
            <div class="sb-al-type" style="color:${barColor}">${al.label || type}</div>
            <div class="sb-al-desc">${al.description || al.desc || ''}</div>
          </div>
        </div>`;
      }).join('');

  return `
    ${tickers.length ? `<div class="sb-tickers">${tickers}</div>` : ''}

    <div class="rp-card">
      <div class="rpc-title">Mercado Global</div>
      ${mkRows || '<div style="font-size:12px;color:var(--text3)">Carregando...</div>'}
    </div>

    <div class="rp-card">
      <div class="rpc-title">Alertas Ativos
        <span class="rpc-action" onclick="switchTab('settings')">+ Criar</span>
      </div>
      ${alertRows}
    </div>`;
}

/* ── FETCH COINGECKO (mercado global + tickers) ── */
async function fetchMarketData() {
  try {
    const [globalRes, tickerRes] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/global'),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true')
    ]);
    const globalJson  = await globalRes.json();
    const tickerJson  = await tickerRes.json();
    const gd = globalJson.data || {};
    const tickers = [
      { sym:'BTC', price: tickerJson.bitcoin?.usd,     pct: tickerJson.bitcoin?.usd_24h_change },
      { sym:'ETH', price: tickerJson.ethereum?.usd,    pct: tickerJson.ethereum?.usd_24h_change },
      { sym:'SOL', price: tickerJson.solana?.usd,      pct: tickerJson.solana?.usd_24h_change },
    ].filter(t => t.price != null);
    return {
      total_market_cap: Object.values(gd.total_market_cap||{})[0] || null,
      total_volume:     Object.values(gd.total_volume||{})[0]     || null,
      btc_dominance:    gd.market_cap_percentage?.btc             || null,
      tickers
    };
  } catch(e) {
    console.warn('[Sidebar] CoinGecko fetch failed:', e);
    return {};
  }
}

/* ── FETCH ALERTAS DO FIRESTORE ── */
async function fetchUserAlerts() {
  try {
    if(!window.db || !session?.uid) return [];
    const snap = await db.collection('users').doc(session.uid)
      .collection('alerts').where('active','==',true).limit(5).get();
    return snap.docs.map(d => d.data());
  } catch(e) {
    console.warn('[Sidebar] Alerts fetch failed:', e);
    return [];
  }
}

/* ── REFRESH SIDEBARS (chamado após renderApp e quando dados mudam) ── */
async function refreshSidebars() {
  const sbL = document.getElementById('sb-left');
  const sbR = document.getElementById('sb-right');
  if(!sbL || !sbR) return;

  // Pega ativos já carregados no wallet (window.walletAssets definido em wallet.js)
  const assets = window.walletAssets || [];

  // Busca mercado e alertas em paralelo
  const [market, alerts] = await Promise.all([
    fetchMarketData(),
    fetchUserAlerts()
  ]);

  if(sbL) sbL.innerHTML = buildSidebarLeft(assets);
  if(sbR) sbR.innerHTML = buildSidebarRight(market, alerts);
}

// Expõe para outros módulos chamarem quando os dados mudarem
window.refreshSidebars = refreshSidebars;

// Inicia após renderApp ter montado o DOM
document.addEventListener('sidebars:ready', () => refreshSidebars());

// Auto-refresh de mercado a cada 60s
setInterval(() => {
  if(document.getElementById('sb-right')) refreshSidebars();
}, 60000);
