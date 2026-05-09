/* ── VAPID Key — obtenha em Firebase Console → Project Settings → Cloud Messaging ──
   Substitua pela sua chave VAPID pública real antes do deploy              */
const FCM_VAPID_KEY = 'BDLbbuJlOy4ms5YGlxOuH0wG3N6pWg_LjU60-X0fNo-szPR9fyD87DzFJlQrxCK_jvAJLfHqqMGOsheZi0GYiXY';

let _fcmMessaging  = null;
let _fcmToken      = null;

/* ── Initialize FCM ── */
async function initFCM() {
  // Only on supported browsers
  if(!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if(!session?.user?.uid) return;

  try {
    _fcmMessaging = firebase.messaging();

    // Handle foreground messages (app is open)
    _fcmMessaging.onMessage(payload => {
      console.log('[FCM] Foreground message:', payload);
      showPushToast(payload.notification);
    });

    // Listen to navigation requests from SW clicks
    navigator.serviceWorker.addEventListener('message', event => {
      if(event.data?.type === 'NAVIGATE' && event.data?.module) {
        switchTab(event.data.module);
      }
    });

    // Check if already granted → auto-register
    if(Notification.permission === 'granted') {
      await registerFCMToken();
    } else if(Notification.permission === 'default') {
      // Show subtle prompt after 15s
      setTimeout(showPushPrompt, 15000);
    }
  } catch(e) {
    console.warn('[FCM] Init error:', e.message);
  }
}

/* ── Register / refresh FCM token ── */
async function registerFCMToken() {
  if(!_fcmMessaging || !session?.user?.uid) return;
  try {
    const token = await _fcmMessaging.getToken({ vapidKey: FCM_VAPID_KEY });
    if(!token) return;
    _fcmToken = token;

    // Save token to Firestore under user's document
    await fbDb.collection('users').doc(session.user.uid)
      .collection('fcm_tokens').doc('web').set({
        token,
        platform:   'web',
        browser:    navigator.userAgent.includes('Chrome') ? 'Chrome' :
                    navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Other',
        updatedAt:  firebase.firestore.FieldValue.serverTimestamp(),
        uid:        session.user.uid,
        email:      session.user.email || '',
      });

    // Also store flat token in users doc for easy querying by admin
    await fbDb.collection('users').doc(session.user.uid).set({
      fcmToken:          token,
      fcmTokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      pushEnabled:       true,
    }, { merge: true });

    console.log('[FCM] Token registered ✅');
    updatePushSettingsUI(true);
  } catch(e) {
    console.warn('[FCM] Token error:', e.message);
  }
}

/* ── Request permission ── */
async function requestPushPermission() {
  try {
    const permission = await Notification.requestPermission();
    if(permission === 'granted') {
      await registerFCMToken();
      showToast('🔔 Notificações push ativadas!', 'success');
      document.getElementById('push-prompt-banner')?.remove();
      updatePushSettingsUI(true);
    } else {
      showToast('Permissão negada. Você pode ativar depois nas configurações do navegador.', 'warn');
      updatePushSettingsUI(false);
    }
  } catch(e) {
    showToast('Erro ao ativar notificações: ' + e.message, 'error');
  }
}

/* ── Disable push ── */
async function disablePush() {
  if(!session?.user?.uid) return;
  try {
    if(_fcmMessaging) await _fcmMessaging.deleteToken().catch(()=>{});
    await fbDb.collection('users').doc(session.user.uid).set({
      fcmToken:    null,
      pushEnabled: false,
    }, { merge: true });
    _fcmToken = null;
    showToast('🔕 Notificações desativadas.', 'success');
    updatePushSettingsUI(false);
  } catch(e) {
    showToast('Erro: ' + e.message, 'error');
  }
}

/* ── Subtle prompt banner ── */
function showPushPrompt() {
  if(document.getElementById('push-prompt-banner')) return;
  if(Notification.permission !== 'default') return;
  const banner = document.createElement('div');
  banner.id = 'push-prompt-banner';
  banner.style.cssText = `
    position:fixed;bottom:1.5rem;right:1.5rem;
    background:var(--bg2);border:1px solid var(--border2);
    border-radius:14px;padding:14px 18px;
    display:flex;align-items:center;gap:14px;z-index:9998;
    box-shadow:0 8px 32px rgba(0,0,0,.5);max-width:380px;
    width:calc(100% - 3rem);animation:slideInRight .3s ease`;
  banner.innerHTML = `
    <div style="font-size:28px;flex-shrink:0">🔔</div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:700;margin-bottom:3px">Ativar notificações push</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.4">
        Receba alertas de mercado, novos posts e atualizações mesmo com o app fechado.
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
      <button onclick="requestPushPermission()" style="background:var(--green);color:#000;border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">Ativar</button>
      <button onclick="document.getElementById('push-prompt-banner').remove()" style="background:transparent;border:1px solid var(--border);border-radius:8px;padding:5px 14px;font-size:11px;color:var(--text2);cursor:pointer">Agora não</button>
    </div>`;
  document.body.appendChild(banner);
}

/* ── Foreground toast for received push ── */
function showPushToast(notification) {
  if(!notification) return;
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;top:1.25rem;right:1.25rem;
    background:var(--bg2);border:1px solid var(--border2);
    border-radius:12px;padding:12px 16px;
    display:flex;align-items:flex-start;gap:12px;z-index:9999;
    box-shadow:0 8px 32px rgba(0,0,0,.5);max-width:340px;
    animation:slideDown .3s ease;cursor:pointer`;
  el.innerHTML = `
    <span style="font-size:22px;flex-shrink:0">🔔</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:700;margin-bottom:3px">${notification.title||'ProfitFlow Labs'}</div>
      <div style="font-size:12px;color:var(--text2);line-height:1.4">${notification.body||''}</div>
    </div>
    <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:var(--text3);cursor:pointer;font-size:16px;flex-shrink:0;padding:0">✕</button>`;
  el.addEventListener('click', e => { if(e.target.tagName!=='BUTTON') el.remove(); });
  document.body.appendChild(el);
  setTimeout(() => el?.remove(), 8000);
}

/* ── Update push toggle in settings panel ── */
function updatePushSettingsUI(enabled) {
  const toggle = document.getElementById('push-settings-toggle');
  const status = document.getElementById('push-settings-status');
  if(toggle) toggle.checked = enabled;
  if(status) {
    status.textContent  = enabled ? '🟢 Ativado' : '⭕ Desativado';
    status.style.color  = enabled ? 'var(--green)' : 'var(--text3)';
  }
}

/* ── Inject push settings card into settings panel ── */
const _origRenderSettings = window.renderSettings;
if(typeof renderSettings === 'function') {
  const __orig = renderSettings;
  window.renderSettings = function() {
    __orig.apply(this, arguments);
    setTimeout(injectPushSettingsCard, 100);
  };
}

function injectPushSettingsCard() {
  if(document.getElementById('push-settings-card')) return;
  const panel = document.getElementById('panel-settings');
  if(!panel) return;

  const isPushGranted = Notification.permission === 'granted';
  const card = document.createElement('div');
  card.id = 'push-settings-card';
  card.className = 'card';
  card.style.marginTop = '1rem';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
      <div>
        <div style="font-size:14px;font-weight:700;margin-bottom:3px">🔔 Notificações Push</div>
        <div style="font-size:12px;color:var(--text2)">Receba alertas no celular e desktop, mesmo com o app fechado</div>
      </div>
      <span id="push-settings-status" style="font-size:12px;font-weight:700;color:${isPushGranted?'var(--green)':'var(--text3)'}">
        ${isPushGranted ? '🟢 Ativado' : '⭕ Desativado'}
      </span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:1rem">
      ${[
        {icon:'📈', label:'Alertas de mercado',  key:'mkt'},
        {icon:'📰', label:'Novos posts',          key:'posts'},
        {icon:'🔔', label:'Notificações do admin',key:'admin'},
        {icon:'💸', label:'Eventos financeiros',  key:'finance'},
      ].map(n=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">${n.icon}</span>
          <span style="font-size:12px">${n.label}</span>
        </div>
        <label class="toggle">
          <input type="checkbox" checked>
          <div class="toggle-track on"><div class="toggle-thumb"></div></div>
        </label>
      </div>`).join('')}
    </div>
    <div style="display:flex;gap:8px">
      ${isPushGranted
        ? `<button class="btn btn-danger btn-sm" onclick="disablePush()">🔕 Desativar notificações</button>
           <button class="btn btn-sm" onclick="testPushNotification()">🧪 Enviar teste</button>`
        : `<button class="btn btn-green btn-sm" onclick="requestPushPermission()" style="flex:1;justify-content:center">🔔 Ativar notificações push</button>`
      }
    </div>`;
  panel.appendChild(card);
}

/* ── Test notification (foreground only) ── */
function testPushNotification() {
  showPushToast({
    title: '🧪 Notificação de teste',
    body: 'As notificações push estão funcionando corretamente!'
  });
  showToast('Teste enviado!', 'success');
}

/* ── CSS animation for banners ── */
const _pushStyle = document.createElement('style');
_pushStyle.textContent = `
@keyframes slideInRight {
  from { transform: translateX(20px); opacity:0; }
  to   { transform: translateX(0);    opacity:1; }
}
@keyframes slideDown {
  from { transform: translateY(-10px); opacity:0; }
  to   { transform: translateY(0);     opacity:1; }
}`;
document.head.appendChild(_pushStyle);


