/* ══ Firebase Config ══ */
const firebaseConfig = {
  apiKey:            "AIzaSyDOpo4jZJXL3GtoXJ7tbswfUJu01UerSJ8",
  authDomain:        "cashflow-ae591.firebaseapp.com",
  projectId:         "cashflow-ae591",
  storageBucket:     "cashflow-ae591.firebasestorage.app",
  messagingSenderId: "976016511064",
  appId:             "1:976016511064:web:d09bf315ebc80c68187a2d"
};
firebase.initializeApp(firebaseConfig);
const fbAuth = firebase.auth();
const fbDb   = firebase.firestore();

/* ══ State ══ */
let adminUser = null;
let allUsers  = [];
let allPosts  = [];
let filteredUsers = [];
let usersCurrentPage = 1;
const USERS_PER_PAGE = 15;
const adminLogs = JSON.parse(localStorage.getItem('admin_logs') || '[]');

/* ══ Topbar date ══ */
function updateTopbarDate() {
  const el = document.getElementById('topbar-date');
  if(el) el.textContent = new Date().toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'});
}
updateTopbarDate();
setInterval(updateTopbarDate, 30000);

/* ══ Toast ══ */
let _toastTimer;
function showToast(msg, type='default') {
  const el = document.getElementById('toast');
  const colors = { success:'#39ff8a', error:'#ff4757', warn:'#ffb74d', default:'#e6edf3' };
  el.style.color = colors[type] || colors.default;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>el.classList.remove('show'), 3500);
}

/* ══ Log ══ */
function addLog(action, detail='') {
  const entry = {
    ts: new Date().toISOString(),
    admin: adminUser?.email || '?',
    action, detail
  };
  adminLogs.unshift(entry);
  if(adminLogs.length > 200) adminLogs.pop();
  localStorage.setItem('admin_logs', JSON.stringify(adminLogs));
}

/* ══ Panel routing ══ */
const PANEL_TITLES = {
  dashboard:     'Dashboard',
  analytics:     'Analytics',
  users:         'Usuários',
  subscriptions: 'Assinaturas',
  posts:         'Posts & Artigos',
  notifications: 'Notificações',
  settings:      'Configurações',
  logs:          'Logs de Acesso',
};

/* Panel cache — avoids reloading same data within 30s */
const _panelCache = {};
const PANEL_CACHE_TTL = 30000;

function switchPanel(id, forceRefresh=false) {
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('panel-'+id)?.classList.add('active');
  document.querySelector(`[data-panel="${id}"]`)?.classList.add('active');
  document.getElementById('topbar-title').textContent = PANEL_TITLES[id] || id;

  const now = Date.now();
  const fresh = !forceRefresh && _panelCache[id] && (now - _panelCache[id]) < PANEL_CACHE_TTL;
  if(fresh) return;
  _panelCache[id] = now;

  if(id==='users')         loadUsers();
  if(id==='posts')         loadPosts();
  if(id==='analytics')     loadAnalytics();
  if(id==='notifications') loadNotifications();
  if(id==='subscriptions') loadSubscriptions();
  if(id==='settings')      loadSettings();
  if(id==='modules')       loadModules();
  if(id==='push')          loadPushPanel();
  if(id==='logs')          renderLogs();
}

function refreshPanel() {
  const active = document.querySelector('[data-panel].active')?.dataset?.panel;
  if(active) { _panelCache[active] = 0; switchPanel(active, true); }
  showToast('↻ Dados atualizados', 'success');
}


/* ══ Auth ══ */
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-err');
  const btn   = document.getElementById('login-btn');
  errEl.style.display = 'none';
  if(!email || !pass) {
    errEl.textContent = 'Preencha e-mail e senha.'; errEl.style.display = 'block'; return;
  }
  btn.textContent = 'Verificando...'; btn.disabled = true;
  try {
    const cred = await fbAuth.signInWithEmailAndPassword(email, pass);
    const uid  = cred.user.uid;
    // Check admin role in Firestore
    const userDoc = await fbDb.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const isAdmin = userData.role === 'admin' || userData.isAdmin === true;
    if(!isAdmin) {
      await fbAuth.signOut();
      errEl.textContent = '⛔ Acesso negado. Esta conta não tem permissões de administrador.';
      errEl.style.display = 'block';
      btn.textContent = 'Acessar Painel'; btn.disabled = false;
      return;
    }
    adminUser = cred.user;
    enterAdmin(adminUser, userData);
  } catch(e) {
    errEl.textContent = '❌ ' + (e.code === 'auth/invalid-credential' ? 'E-mail ou senha incorretos.' : e.message);
    errEl.style.display = 'block';
    btn.textContent = 'Acessar Painel'; btn.disabled = false;
  }
}

document.getElementById('login-pass').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });

function enterAdmin(user, userData) {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-shell').classList.add('visible');
  const name = userData.displayName || user.displayName || user.email?.split('@')[0] || 'Admin';
  const initial = name[0]?.toUpperCase() || 'A';
  document.getElementById('sidebar-avatar').textContent = initial;
  document.getElementById('sidebar-name').textContent   = name;
  addLog('login', `Admin login: ${user.email}`);
  loadDashboard();
  startRealtimeListeners();
}

function doLogout() {
  if(!confirm('Sair do painel admin?')) return;
  addLog('logout', `Admin logout: ${adminUser?.email}`);
  fbAuth.signOut().then(()=>{
    document.getElementById('app-shell').classList.remove('visible');
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('login-btn').textContent = 'Acessar Painel';
    document.getElementById('login-btn').disabled = false;
  });
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ══ Dashboard ══ */
/* ── Helpers ── */
function tsToMs(ts) {
  if(!ts) return 0;
  if(ts.seconds) return ts.seconds * 1000;
  if(ts._seconds) return ts._seconds * 1000;
  return new Date(ts).getTime() || 0;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  return d.getTime();
}

let _realtimeUnsub = null;

