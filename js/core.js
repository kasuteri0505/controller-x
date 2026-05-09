const R = document.getElementById('root');
let session  = null;
let ilChart  = null;
let yChart   = null;

function stGet(key)        { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch(e) { return null; } }
function stSet(key, val)   { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch(e) { return false; } }
function stDel(key)        { try { localStorage.removeItem(key); } catch(e) {} }
function stKeys(prefix)    { try { return Object.keys(localStorage).filter(k => k.startsWith(prefix)); } catch(e) { return []; } }

firebase.initializeApp(firebaseConfig);
const fbAuth         = firebase.auth();
const fbDb           = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
const githubProvider = new firebase.auth.GithubAuthProvider();
githubProvider.addScope('user:email');
githubProvider.addScope('read:user');

async function fsGet(path) {
  try {
    const parts = path.split('/');
    let ref;
    if (parts.length === 2)      ref = fbDb.collection(parts[0]).doc(parts[1]);
    else if (parts.length === 4) ref = fbDb.collection(parts[0]).doc(parts[1]).collection(parts[2]).doc(parts[3]);
    else return null;
    const snap = await ref.get();
    return snap.exists ? snap.data() : null;
  } catch(e) { console.warn('fsGet error', e); return null; }
}

async function fsSet(path, data) {
  try {
    const parts = path.split('/');
    let ref;
    if (parts.length === 2)      ref = fbDb.collection(parts[0]).doc(parts[1]);
    else if (parts.length === 4) ref = fbDb.collection(parts[0]).doc(parts[1]).collection(parts[2]).doc(parts[3]);
    else return false;
    await ref.set(data, { merge: true });
    return true;
  } catch(e) { console.warn('fsSet error', e); return false; }
}

async function fsDel(path) {
  try {
    const parts = path.split('/');
    let ref;
    if (parts.length === 2)      ref = fbDb.collection(parts[0]).doc(parts[1]);
    else if (parts.length === 4) ref = fbDb.collection(parts[0]).doc(parts[1]).collection(parts[2]).doc(parts[3]);
    else return;
    await ref.delete();
  } catch(e) { console.warn('fsDel error', e); }
}

async function fsGetAll(path) {
  try {
    const parts = path.split('/');
    let ref;
    if (parts.length === 3) ref = fbDb.collection(parts[0]).doc(parts[1]).collection(parts[2]);
    else return [];
    const snap = await ref.get();
    return snap.docs.map(d => ({ _fsId: d.id, ...d.data() }));
  } catch(e) { console.warn('fsGetAll error', e); return []; }
}

function userPath(sub)      { return 'users/' + session.user.uid + (sub ? '/' + sub : ''); }
function userDoc()          { return fsGet(userPath()); }
function userSave(data)     { return fsSet(userPath(), data); }
function colPath(col, id)   { return userPath(col + '/' + id); }
function colGet(col, id)    { return fsGet(colPath(col, id)); }
function colSet(col, id, d) { return fsSet(colPath(col, id), d); }
function colDel(col, id)    { return fsDel(colPath(col, id)); }
function colAll(col)        { return fsGetAll(userPath(col)); }

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;')
    .replace(/`/g,  '&#96;')
    .replace(/\//g, '&#47;');
}

function stripTags(str) {
  if (str == null) return '';
  return String(str).replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim();
}

function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(String(email || '').trim());
}

function checkPasswordStrength(pass) {
  if (!pass || pass.length < 8) return { ok: false, msg: 'Senha deve ter mínimo 8 caracteres.' };
  if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(pass))
    return { ok: false, msg: 'Senha deve conter ao menos 1 número ou símbolo especial.' };
  return { ok: true, msg: '' };
}

const _loginAttempts   = {};
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS         = 15 * 60 * 1000;
const ATTEMPT_WINDOW_MS  = 10 * 60 * 1000;

function checkLoginRateLimit(uid) {
  const now = Date.now();
  const rec = _loginAttempts[uid] || { count: 0, firstTs: now, lockUntil: 0 };
  if (rec.lockUntil > now) {
    const remaining = Math.ceil((rec.lockUntil - now) / 60000);
    return { allowed: false, msg: `Conta bloqueada por excesso de tentativas. Tente novamente em ${remaining} min.` };
  }
  if (now - rec.firstTs > ATTEMPT_WINDOW_MS) {
    _loginAttempts[uid] = { count: 0, firstTs: now, lockUntil: 0 };
  }
  return { allowed: true, msg: '' };
}

function recordFailedLogin(uid) {
  const now = Date.now();
  const rec = _loginAttempts[uid] || { count: 0, firstTs: now, lockUntil: 0 };
  if (now - rec.firstTs > ATTEMPT_WINDOW_MS) {
    _loginAttempts[uid] = { count: 1, firstTs: now, lockUntil: 0 };
  } else {
    rec.count++;
    if (rec.count >= MAX_LOGIN_ATTEMPTS) {
      rec.lockUntil = now + LOCKOUT_MS;
      console.warn('[Security] Login bloqueado para', uid);
    }
    _loginAttempts[uid] = rec;
  }
}

function clearLoginAttempts(uid) { delete _loginAttempts[uid]; }

function generateSessionToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function validateSessionToken(session) {
  if (!session || !session._token || !session._ts) return false;
  if (Date.now() - session._ts > 86400000) return false;
  const stored = sessionStorage.getItem('_cf_token');
  return stored === session._token;
}

function issueSessionToken(sessionObj) {
  const token = generateSessionToken();
  sessionStorage.setItem('_cf_token', token);
  sessionObj._token = token;
  sessionObj._ts    = Date.now();
  attachFingerprintToSession(sessionObj).catch(() => {});
  return sessionObj;
}

function safeStGet(key) {
  if (!session) return null;
  const uid = session.user?.uid;
  if (!uid) return null;
  const isUidKey = /^u_[0-9a-f]+_/.test(key) || key.startsWith(uid);
  if (isUidKey && !key.startsWith(uid) && !key.startsWith('u_' + hash32(session.user.email))) return null;
  return stGet(key);
}

const HASH_SALT = 'ProfitFlowLabs$2025#Security';

async function hashPasswordAsync(password, email) {
  const data = new TextEncoder().encode(password + ':' + email.toLowerCase() + ':' + HASH_SALT);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return h.toString(16);
}

const hash = hash32;

const LIMITS = {
  name: 80, email: 120, password: 128, bio: 300, tags: 200,
  notes: 500, url: 500, symbol: 20, ticker: 12, walletAddr: 100,
};

function limitInput(value, field) {
  const max = LIMITS[field] || 200;
  return String(value || '').slice(0, max);
}

let _lastActivity      = Date.now();
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;
let _autoLockTimer     = null;

function resetActivityTimer() { _lastActivity = Date.now(); }

function startAutoLock() {
  if (_autoLockTimer) clearInterval(_autoLockTimer);
  _autoLockTimer = setInterval(() => {
    if (!session) return;
    if (Date.now() - _lastActivity > SESSION_TIMEOUT_MS) {
      console.info('[Security] Auto-lock por inatividade');
      doLogout();
      showToast('Sessão encerrada por inatividade.');
    }
  }, 60000);
}

['click', 'keydown', 'mousemove', 'touchstart'].forEach(ev => {
  document.addEventListener(ev, resetActivityTimer, { passive: true });
});

function checkStorageQuota() {
  try {
    localStorage.setItem('_quota_test', 'x'.repeat(1024));
    localStorage.removeItem('_quota_test');
    return true;
  } catch(e) {
    console.warn('[Security] localStorage quota exceeded or unavailable');
    return false;
  }
}

function redactForExport(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitive = ['passHash', 'password', '_token', 'cvv', 'cardNumber', 'pix'];
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    if (sensitive.includes(k)) out[k] = '[REDACTED]';
    else if (typeof obj[k] === 'object') out[k] = redactForExport(obj[k]);
    else out[k] = obj[k];
  }
  return out;
}

const _secLog = [];
function secLog(event, detail = '') {
  const entry = { ts: new Date().toISOString(), event, detail };
  _secLog.push(entry);
  if (_secLog.length > 100) _secLog.shift();
}

const CFL_BUILD = Object.freeze({
  id:        'CFL-2025-A7F3E9D2',
  version:   '1.0.0',
  product:   'ProfitFlow Labs',
  copyright: '© 2025 ProfitFlow Labs. Todos os direitos reservados.',
  legal:     'Uso não autorizado constitui violação da Lei 9.610/98 (BR)',
  contact:   'legal@profitflowlabs.io',
  builtAt:   '2025-04-18T00:00:00Z',
});

(function patchLicenseComment() {
  try {
    const it = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT);
    let node;
    while ((node = it.nextNode())) {
      if (node.nodeValue.includes('CFL-2025-${BUILD_HASH}')) {
        node.nodeValue = node.nodeValue.replace('CFL-2025-${BUILD_HASH}', CFL_BUILD.id);
        break;
      }
    }
  } catch(_) {}
})();

async function buildDeviceFingerprint() {
  try {
    const nav  = window.navigator;
    const scr  = window.screen;
    const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = nav.language || '';
    const plat = nav.platform || '';
    const cores= nav.hardwareConcurrency || 0;
    const mem  = nav.deviceMemory || 0;
    const res  = `${scr.width}x${scr.height}x${scr.colorDepth}`;

    let canvasFp = '';
    try {
      const cvs = document.createElement('canvas');
      cvs.width = 200; cvs.height = 50;
      const ctx2 = cvs.getContext('2d');
      ctx2.font = '14px Arial';
      ctx2.fillStyle = '#638eff';
      ctx2.fillText('ProfitFlow Labs FP 🔒', 10, 30);
      ctx2.strokeStyle = '#39ff8a';
      ctx2.strokeRect(1, 1, 198, 48);
      canvasFp = cvs.toDataURL().slice(-32);
    } catch(_) {}

    let glFp = '';
    try {
      const gl  = document.createElement('canvas').getContext('webgl');
      const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
      if (dbg) glFp = (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '').slice(0, 20);
    } catch(_) {}

    const raw = [lang, plat, tz, res, `${cores}`, `${mem}`, canvasFp, glFp].join('|');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw + CFL_BUILD.id));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
  } catch(_) {
    return 'fp-fallback-' + Date.now().toString(36);
  }
}

async function getOrCreateDeviceFp() {
  const stored = localStorage.getItem('_cfl_dfp');
  if (stored) return stored;
  const fp = await buildDeviceFingerprint();
  localStorage.setItem('_cfl_dfp', fp);
  return fp;
}

async function attachFingerprintToSession(sessionObj) {
  const fp  = await getOrCreateDeviceFp();
  const ts  = Date.now();
  sessionObj._dfp      = fp;
  sessionObj._dfp_ts   = ts;
  sessionObj._build_id = CFL_BUILD.id;
  sessionObj._fp_payload = btoa(JSON.stringify({
    fp, ts, build: CFL_BUILD.id,
    uid: sessionObj.user?.uid || '',
    v: CFL_BUILD.version,
  }));
  secLog('fp_attached', fp.slice(0, 8) + '…');
  return sessionObj;
}

function detectSessionClone(sessionObj) {
  if (!sessionObj?._dfp) return false;
  const current = localStorage.getItem('_cfl_dfp');
  if (!current) return false;
  if (current !== sessionObj._dfp) {
    secLog('fp_mismatch', `stored=${sessionObj._dfp?.slice(0,8)} current=${current?.slice(0,8)}`);
    return true;
  }
  return false;
}

const CFL_ALLOWED_ORIGINS = [
  'profitflowlabs.io', 'www.profitflowlabs.io', 'app.profitflowlabs.io',
  'controller-x.com', 'www.controller-x.com',
  'cashflow-ae591.web.app', 'cashflow-ae591.firebaseapp.com',
  'localhost', '127.0.0.1', '',
];

function checkOriginIntegrity() {
  const host = window.location.hostname || '';
  const isAllowed = CFL_ALLOWED_ORIGINS.some(o => host === o || host.endsWith('.' + o));
  if (!isAllowed && host) {
    secLog('origin_violation', host);
    console.warn(
      `%c⛔ ProfitFlow Labs — Cópia não autorizada detectada\n` +
      `%cEste software é protegido por direitos autorais (Lei 9.610/98).\n` +
      `Domínio não autorizado: ${host}\nContato: ${CFL_BUILD.contact}`,
      'color:#ff5370;font-size:14px;font-weight:bold',
      'color:#ffb74d;font-size:12px'
    );
    return false;
  }
  return true;
}

function getCflWatermark(format = 'text') {
  const uid   = session?.user?.uid || 'anon';
  const ts    = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const build = CFL_BUILD.id;
  const dfp   = localStorage.getItem('_cfl_dfp')?.slice(0, 8) || '--------';

  if (format === 'text') {
    return [
      '',
      `─────────────────────────────────`,
      `📊 ${CFL_BUILD.product} ${CFL_BUILD.version}`,
      `${CFL_BUILD.copyright}`,
      `Gerado em: ${ts} UTC`,
      `Ref: ${build} · ${dfp}`,
      `─────────────────────────────────`,
    ].join('\n');
  }
  if (format === 'html') {
    return `<div style="margin-top:1.5rem;padding:.75rem 1rem;border-top:1px solid rgba(255,255,255,.1);
      font-size:10px;color:rgba(255,255,255,.35);text-align:center;letter-spacing:.03em;line-height:1.8">
      <strong style="color:rgba(255,255,255,.55)">${CFL_BUILD.product}</strong> ${CFL_BUILD.version} ·
      ${CFL_BUILD.copyright}<br>
      Gerado: ${ts} UTC · Ref: <code style="font-size:9px">${build}·${dfp}</code>
    </div>`;
  }
  if (format === 'csv') {
    return `\n# ${CFL_BUILD.product} ${CFL_BUILD.version} — ${CFL_BUILD.copyright}\n# Gerado: ${ts} UTC | Ref: ${build}.${dfp}\n`;
  }
  if (format === 'canvas') {
    return { text: `${CFL_BUILD.product} · ${ts} · Ref:${dfp}`, color: 'rgba(99,142,255,0.35)', size: 10 };
  }
  return `${CFL_BUILD.product} © 2025 | ${ts}`;
}

function injectShareWatermark() {
  const card = document.getElementById('share-preview-card');
  if (!card) return;
  card.querySelector('#cfl-wm')?.remove();
  const wm = document.createElement('div');
  wm.id = 'cfl-wm';
  wm.innerHTML = getCflWatermark('html');
  card.appendChild(wm);
}

function watermarkShareText(text)       { return text + getCflWatermark('text'); }
function watermarkExport(dataObj)       {
  return {
    ...dataObj,
    _cfl_meta: {
      product:   CFL_BUILD.product,
      version:   CFL_BUILD.version,
      copyright: CFL_BUILD.copyright,
      build_id:  CFL_BUILD.id,
      exported:  new Date().toISOString(),
      ref:       localStorage.getItem('_cfl_dfp')?.slice(0, 8) || '—',
    }
  };
}

function watermarkChart(chartInstance) {
  if (!chartInstance) return;
  const orig = chartInstance.draw?.bind(chartInstance);
  if (!orig) return;
  const wm = getCflWatermark('canvas');
  chartInstance.draw = function() {
    orig();
    const ctx2 = this.ctx;
    if (!ctx2) return;
    ctx2.save();
    ctx2.font      = `${wm.size}px -apple-system, sans-serif`;
    ctx2.fillStyle = wm.color;
    ctx2.textAlign = 'right';
    ctx2.fillText(wm.text, this.width - 8, this.height - 6);
    ctx2.restore();
  };
}

(function cflConsoleBranding() {
  console.log(
    '%c⬡ ProfitFlow Labs%c v' + CFL_BUILD.version + '\n' +
    '%c' + CFL_BUILD.copyright + '\n' +
    'Build: ' + CFL_BUILD.id + '\n' +
    'Este código é protegido por direitos autorais.\n' +
    'Uso não autorizado é crime (Lei 9.610/98).',
    'color:#39ff8a;font-size:18px;font-weight:800;',
    'color:#638eff;font-size:12px;',
    'color:#7d8590;font-size:11px;'
  );
})();

checkOriginIntegrity();

function init() {
  applyTheme(appTheme);
  fbAuth.onAuthStateChanged(async (fbUser) => {
    if (fbUser) {
      const profile = await fsGet('users/' + fbUser.uid) || {};
      session = {
        user: {
          uid:     fbUser.uid,
          email:   fbUser.email,
          name:    profile.name || fbUser.displayName || fbUser.email.split('@')[0],
          _fbUser: fbUser,
        }
      };
      await syncFromFirestore(fbUser.uid, profile);
      await loadPlatformModules();
      await syncYieldFromFirestore(fbUser.uid);
      startAutoLock();
      checkAccess() ? renderApp() : renderPaywall();
    } else {
      session = null;
      renderAuth('login');
    }
  });
}

async function syncFromFirestore(uid, profile) {
  try {
    if (profile && Object.keys(profile).length) {
      const existing = stGet(uid + '_profile') || {};
      stSet(uid + '_profile', Object.assign(existing, profile));
    }
    if (profile.wallet_assets)  stSet(uid + '_wallet_assets', profile.wallet_assets);
    if (profile.finance_txs)    stSet(uid + '_finance_txs',   profile.finance_txs);
    if (profile.modules)        stSet(uid + '_modules',        profile.modules);
    if (profile.walletAddress)  stSet(uid + '_wallet_addr',    profile.walletAddress);
    if (profile.googleLinked)   stSet(uid + '_google_linked',  profile.googleLinked);

    const poolSnap = await fbDb.collection('users').doc(uid).collection('pools').get();
    poolSnap.docs.forEach(d => { const data = d.data(); if (data.key) stSet(data.key, data); });

    const optSnap = await fbDb.collection('users').doc(uid).collection('options').get();
    optSnap.docs.forEach(d => { const data = d.data(); if (data.key) stSet(data.key, data); });

    const posSnap = await fbDb.collection('users').doc(uid).collection('positions').get();
    posSnap.docs.forEach(d => { const data = d.data(); if (data.key) stSet(data.key, data); });
  } catch(e) {
    console.warn('syncFromFirestore error (offline?):', e.message);
  }
}

function fsPersistKey(key, data) {
  if (!session?.user?.uid) return;
  const uid = session.user.uid;
  let col = null;
  if (key.includes('_pool_'))     col = 'pools';
  else if (key.includes('_opt_')) col = 'options';
  else if (key.includes('_pos_')) col = 'positions';
  if (!col || !data) return;
  const docId = key.replace(/\//g, '_');
  fbDb.collection('users').doc(uid).collection(col).doc(docId)
    .set({ ...data, key }, { merge: true })
    .catch(e => console.warn('fsPersistKey error', e));
}

function fsDeleteKey(key) {
  if (!session?.user?.uid) return;
  const uid = session.user.uid;
  let col = null;
  if (key.includes('_pool_'))     col = 'pools';
  else if (key.includes('_opt_')) col = 'options';
  else if (key.includes('_pos_')) col = 'positions';
  if (!col) return;
  const docId = key.replace(/\//g, '_');
  fbDb.collection('users').doc(uid).collection(col).doc(docId)
    .delete()
    .catch(e => console.warn('fsDeleteKey error', e));
}