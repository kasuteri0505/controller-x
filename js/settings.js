async function renderSettings() {
  const panel = document.getElementById('panel-settings');
  const u = session.user;

  // Sync profile from Firestore → localStorage cache
  try {
    const fsProfile = await fbDb.collection('users').doc(u.uid).get();
    if (fsProfile.exists) {
      const fsData = fsProfile.data();
      const merged = Object.assign(stGet(PROF_KEY()) || {}, fsData);
      stSet(PROF_KEY(), merged);
      // Update session name if changed
      if (fsData.name) session.user.name = fsData.name;
    }
  } catch(e) { /* offline — use cache */ }

  const p = profLoad();
  const notif = p.notifications || {};

  panel.innerHTML = `
  <div style="max-width:640px;margin:0 auto">
    <div style="margin-bottom:1.5rem">
      <h2>${t('profile')}</h2>
      <p class="sub">${t('language')==='Language'?'Manage your personal information and system preferences':'Gerencie suas informações pessoais e preferências do sistema'}</p>
    </div>

    <!-- ── AVATAR + NOME ── -->
    <div class="card settings-section">
      <div class="settings-section-title">${t('photo_identity')}</div>
      <div style="display:flex;align-items:center;gap:1.25rem;margin-bottom:1.25rem;flex-wrap:wrap">
        <div class="avatar-upload" id="avatar-preview" onclick="document.getElementById('avatar-file').click()" title="Clique para alterar">
          ${p.avatar
            ? `<img src="${p.avatar}" id="avatar-img">`
            : `<span style="font-size:28px;color:var(--text3)">${getInitials(u.name)}</span>`}
        </div>
        <input type="file" id="avatar-file" accept="image/*" style="display:none" onchange="handleAvatarUpload(event)">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--text)">${p.name||u.name}</div>
          <div style="font-size:13px;color:var(--text2);margin-top:2px">${u.email}</div>
          <button class="btn btn-sm" style="margin-top:8px;font-size:12px" onclick="document.getElementById('avatar-file').click()">${t('change_photo')}</button>
          ${p.avatar?`<button class="btn btn-sm btn-danger" style="margin-top:8px;margin-left:6px;font-size:12px" onclick="removeAvatar()">${t('remove')}</button>`:''}
        </div>
      </div>
      <div class="grid2">
        <div class="field"><label>${t('full_name')}</label><input id="prf-name" value="${p.name||u.name||''}"></div>
        <div class="field"><label>${t('nickname')}</label><input id="prf-nick" value="${p.nickname||''}" placeholder="@seunome"></div>
        <div class="field"><label>${t('email')}</label><input value="${u.email}" readonly style="opacity:.5"></div>
        <div class="field">
          <label>${t('phone')}</label>
          <div style="display:flex;gap:6px">
            <select id="prf-ddi" style="width:90px;height:38px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);padding:0 6px">
              <option value="+55" ${(p.ddi||'+55')==='+55'?'selected':''}>🇧🇷 +55</option>
              <option value="+1"  ${p.ddi==='+1'?'selected':''}>🇺🇸 +1</option>
              <option value="+351"${p.ddi==='+351'?'selected':''}>🇵🇹 +351</option>
              <option value="+54" ${p.ddi==='+54'?'selected':''}>🇦🇷 +54</option>
              <option value="+52" ${p.ddi==='+52'?'selected':''}>🇲🇽 +52</option>
              <option value="+34" ${p.ddi==='+34'?'selected':''}>🇪🇸 +34</option>
              <option value="+44" ${p.ddi==='+44'?'selected':''}>🇬🇧 +44</option>
              <option value="+49" ${p.ddi==='+49'?'selected':''}>🇩🇪 +49</option>
              <option value="+81" ${p.ddi==='+81'?'selected':''}>🇯🇵 +81</option>
            </select>
            <input id="prf-phone" type="tel" value="${p.phone||''}" placeholder="(11) 99999-9999" style="flex:1">
          </div>
        </div>
        <div class="field"><label>${t('country')}</label>
          <select id="prf-country">${COUNTRIES.map(c=>`<option ${(p.country||'Brasil')===c?'selected':''}>${c}</option>`).join('')}</select>
        </div>
        <div class="field"><label>${t('timezone')}</label>
          <select id="prf-tz">${TIMEZONES.map(z=>`<option ${(p.timezone||'America/Sao_Paulo')===z?'selected':''}>${z}</option>`).join('')}</select>
        </div>
      </div>
      <div class="field" style="margin-top:12px"><label>${t('bio')}</label>
        <textarea id="prf-bio" rows="2" style="width:100%;padding:8px 12px;font-size:14px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);resize:vertical;font-family:inherit;outline:none" placeholder="${t('bio_placeholder')}">${p.bio||''}</textarea>
      </div>
      <div style="margin-top:1rem;display:flex;gap:8px">
        <button class="btn btn-primary" onclick="saveProfile()">${t('save_profile')}</button>
        <span id="prf-saved" style="font-size:13px;color:var(--green);align-self:center;display:none">${t('saved_ok')}</span>
      </div>
    </div>

    <!-- ── APARÊNCIA ── -->
    <div class="card settings-section">
      <div class="settings-section-title">${t('appearance')}</div>
      <div class="settings-row">
        <div><div class="settings-row label">${t('theme')}</div><div class="hint">${t('theme_hint')}</div></div>
        <div style="display:flex;gap:8px">
          <button class="lang-btn ${appTheme==='dark'?'active':''}" onclick="applyTheme('dark');renderSettings()">🌙 ${t('dark')}</button>
          <button class="lang-btn ${appTheme==='light'?'active':''}" onclick="applyTheme('light');renderSettings()">☀ ${t('light')}</button>
        </div>
      </div>
      <div class="settings-row">
        <div><div class="settings-row label">${t('language')}</div><div class="hint">${t('language_hint')}</div></div>
        <div style="display:flex;gap:8px">
          <button class="lang-btn ${appLang==='pt'?'active':''}" onclick="applyLang('pt')">🇧🇷 Português BR</button>
          <button class="lang-btn ${appLang==='en'?'active':''}" onclick="applyLang('en')">🇺🇸 English</button>
        </div>
      </div>
      <div class="settings-row">
        <div><div class="settings-row label">${t('display_currency')}</div><div class="hint">${t('currency_hint')}</div></div>
        <select id="prf-currency" onchange="saveCurrency(this.value)" style="height:34px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);padding:0 10px">
          ${CURRENCIES.map(c=>`<option ${(p.currency||'USD')===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- ── NOTIFICAÇÕES ── -->
    <div class="card settings-section">
      <div class="settings-section-title">Notificações</div>
      ${[
        ['notif_price',   'Alertas de preço',        'Notificar quando tokens mudarem mais de 10%'],
        ['notif_il',      'Alerta de IL',             'Notificar quando o IL ultrapassar 5%'],
        ['notif_fees',    'Lembrete de taxas',        'Lembrar de coletar taxas semanalmente'],
        ['notif_monthly', 'Resumo mensal',            'Relatório de desempenho ao final do mês'],
      ].map(([key,label,hint])=>`
      <div class="settings-row">
        <div><div class="settings-row label">${label}</div><div class="hint">${hint}</div></div>
        <label class="toggle">
          <input type="checkbox" ${notif[key]?'checked':''} onchange="saveNotifPref('${key}',this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>`).join('')}
    </div>

    <!-- ── CONEXÕES ── -->
    <div class="card settings-section" id="connections-section">
      <div class="settings-section-title">Conexões & Carteira P2P</div>

      <!-- Polygon Wallet -->
      <div class="settings-row" style="align-items:flex-start;padding-bottom:1rem;border-bottom:1px solid var(--border);margin-bottom:1rem">
        <div style="flex:1">
          <div class="settings-row label" style="display:flex;align-items:center;gap:8px">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:rgba(130,80,255,.15);border-radius:8px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="12,2 22,7 22,17 12,22 2,17 2,7" stroke="#a78bfa" stroke-width="2" fill="none"/><polygon points="12,6 18,9.5 18,16.5 12,20 6,16.5 6,9.5" fill="rgba(130,80,255,.25)"/></svg>
            </span>
            Carteira Polygon (MATIC)
            ${getConnectedWallet()?`<span style="font-size:9px;background:var(--green-bg);color:var(--green-text);border:1px solid rgba(57,255,138,.25);padding:2px 8px;border-radius:99px;font-weight:700">CONECTADA</span>`:`<span style="font-size:9px;background:var(--bg4);color:var(--text3);padding:2px 8px;border-radius:99px;font-weight:600">DESCONECTADA</span>`}
          </div>
          <div class="hint">Conecte sua carteira MetaMask ou compatível para habilitar depósitos e negociações P2P na rede Polygon.</div>
          ${getConnectedWallet()?`<div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <code style="font-size:11px;background:var(--bg);border:1px solid var(--border);padding:3px 10px;border-radius:6px;color:var(--green-text);letter-spacing:.04em">${getConnectedWallet()}</code>
            <span style="font-size:11px;color:var(--text3)">Rede: <strong style="color:var(--text2)">Polygon Mainnet</strong></span>
            <span style="font-size:11px;background:var(--blue-bg);color:var(--blue-text);padding:2px 8px;border-radius:99px;border:1px solid rgba(99,142,255,.2)">Chain ID: 137</span>
          </div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0;margin-left:12px">
          ${getConnectedWallet()
            ? `<button class="btn btn-sm btn-danger" onclick="disconnectWallet()">Desconectar</button>`
            : `<button class="btn btn-sm" style="background:rgba(130,80,255,.12);border-color:rgba(130,80,255,.4);color:#a78bfa;white-space:nowrap" onclick="openWalletConnectModal()">
                <span style="display:inline-flex;align-items:center;gap:5px">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Conectar Carteira
                </span>
              </button>`}
        </div>
      </div>

      <!-- Google Account -->
      <div class="settings-row" style="align-items:flex-start">
        <div style="flex:1">
          <div class="settings-row label" style="display:flex;align-items:center;gap:8px">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:rgba(66,133,244,.15);border-radius:8px">
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            </span>
            Conta Google
            ${getLinkedGoogle()?`<span style="font-size:9px;background:rgba(52,168,83,.15);color:#34a853;border:1px solid rgba(52,168,83,.3);padding:2px 8px;border-radius:99px;font-weight:700">VINCULADA</span>`:`<span style="font-size:9px;background:var(--bg4);color:var(--text3);padding:2px 8px;border-radius:99px;font-weight:600">NÃO VINCULADA</span>`}
          </div>
          <div class="hint">Vincule sua conta Google para facilitar o login e identificação nos negócios P2P da plataforma.</div>
          ${getLinkedGoogle()?`<div style="margin-top:8px;display:flex;align-items:center;gap:8px">
            <div style="display:flex;align-items:center;gap:6px">
              <img src="https://www.google.com/favicon.ico" style="width:14px;height:14px;border-radius:2px">
              <span style="font-size:12px;color:var(--text2)">${getLinkedGoogle()}</span>
            </div>
          </div>`:''}
        </div>
        <div style="flex-shrink:0;margin-left:12px">
          ${getLinkedGoogle()
            ? `<button class="btn btn-sm btn-danger" onclick="unlinkGoogle()">Desvincular</button>`
            : `<button class="btn btn-sm" style="background:rgba(66,133,244,.1);border-color:rgba(66,133,244,.4);color:#7aabff;white-space:nowrap" onclick="linkGoogleAccount()">
                <span style="display:inline-flex;align-items:center;gap:5px">
                  <svg width="12" height="12" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Vincular Google
                </span>
              </button>`}
        </div>
      </div>
    </div>

    <!-- ── SEGURANÇA ── -->
    <div class="card settings-section">
      <div class="settings-section-title">Segurança</div>
      <div class="settings-row">
        <div><div class="settings-row label">Alterar senha</div><div class="hint">Redefina sua senha de acesso</div></div>
        <button class="btn btn-sm" onclick="openChangePasswordModal()">Alterar</button>
      </div>
      <div class="settings-row">
        <div><div class="settings-row label">Exportar dados</div><div class="hint">Baixe todos os seus dados em JSON</div></div>
        <button class="btn btn-sm" onclick="exportAllData()">Exportar</button>
      </div>
      <div class="settings-row">
        <div><div class="settings-row label" style="color:var(--red)">Apagar conta</div><div class="hint">Remove todos os dados permanentemente</div></div>
        <button class="btn btn-sm btn-danger" onclick="confirmDeleteAccount()">Apagar</button>
      </div>
    </div>

    <!-- ── MÓDULOS ── -->
    ${renderModulesSection()}

    <!-- ── ASSINATURA ── -->
    ${renderBillingSection()}

    <!-- ── SOBRE ── -->
    <div class="card">
      <div class="settings-section-title">Sobre</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--text2)">
        <div style="display:flex;justify-content:space-between"><span>Versão</span><span style="color:var(--text);font-weight:500">1.0.0</span></div>
        <div style="display:flex;justify-content:space-between"><span>Plataforma</span><span style="color:var(--text);font-weight:500">ProfitFlow Labs</span></div>
        <div style="display:flex;justify-content:space-between"><span>Dados de preços</span><span style="color:var(--text);font-weight:500">CoinGecko API</span></div>
        <div style="display:flex;justify-content:space-between"><span>Armazenamento</span><span style="color:var(--text);font-weight:500">Firebase Firestore</span></div>
      </div>
    </div>
    
    <div class="card" style="background: var(--blue-bg); border-color: var(--blue); margin-top: 2rem;">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 20px; flex-shrink: 0;">💡</span>
        <div>
          <h3 style="color: var(--blue-text); margin-bottom: 8px;">Dicas de Uso - Configurações</h3>
          <ul style="list-style: none; padding: 0; margin: 0; color: var(--text2); font-size: 13px; line-height: 1.6;">
            <li>👤 <strong>Perfil:</strong> Atualize suas informações pessoais, foto de perfil e descrição bio.</li>
            <li>🎨 <strong>Aparência:</strong> Escolha tema escuro/claro, idioma preferido e moeda de exibição.</li>
            <li>🔔 <strong>Notificações:</strong> Configure alertas de preço, impermanent loss, taxas e resumos mensais.</li>
            <li>🔐 <strong>Segurança:</strong> Conecte sua carteira Polygon e vincule conta Google para P2P.</li>
            <li>💾 <strong>Dados:</strong> Exporte seus dados em JSON ou exclua permanentemente sua conta.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>`;
}

function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 2*1024*1024) { showToast('Imagem muito grande. Máximo 2MB.'); return; }
  const reader = new FileReader();
  reader.onload = e=>{
    const p = profLoad();
    p.avatar = e.target.result;
    profSave(p);
    renderSettings();
    renderApp();
  };
  reader.readAsDataURL(file);
}

function removeAvatar() {
  const p = profLoad(); delete p.avatar; profSave(p);
  renderSettings(); renderApp();
}

function saveProfile() {
  const p = profLoad();
  p.name     = document.getElementById('prf-name').value.trim() || session.user.name;
  p.nickname = document.getElementById('prf-nick').value.trim();
  p.ddi      = document.getElementById('prf-ddi').value;
  p.phone    = document.getElementById('prf-phone').value.trim();
  p.country  = document.getElementById('prf-country').value;
  p.timezone = document.getElementById('prf-tz').value;
  p.bio      = document.getElementById('prf-bio').value.trim();
  profSave(p);
  const ok = document.getElementById('prf-saved');
  ok.style.display='inline'; setTimeout(()=>ok.style.display='none', 2500);
  renderApp();
}

function saveCurrency(cur) { const p=profLoad(); p.currency=cur; profSave(p); showToast('Moeda atualizada para '+cur); }

function saveNotifPref(key, val) { const p=profLoad(); p.notifications=p.notifications||{}; p.notifications[key]=val; profSave(p); }

function exportAllData() {
  const uid = session.user.uid;
  const data = {
    profile:  profLoad(),
    pools:    stKeys(uid+'_pool_').map(k=>stGet(k)),
    wallet:   wLoad(),
    finance:  fLoad(),
    positions:stKeys(uid+'_pos_').map(k=>stGet(k)),
    exported: new Date().toISOString()
  };
  // Redact sensitive fields before export
  const safe = redactForExport(data);
  // Inject watermark metadata
  const watermarked = watermarkExport(safe);
  const blob = new Blob([JSON.stringify(watermarked, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'cashflowlabs-data-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  secLog('data_exported', uid);
  showToast('Dados exportados com sucesso!');
}

async function confirmDeleteAccount() {
  if(!confirm('Tem certeza? Todos os seus dados serão apagados permanentemente e não poderão ser recuperados.')) return;
  const uid = session.user.uid;
  const fbUser = fbAuth.currentUser;
  try {
    // Delete Firestore data first
    const userRef = fbDb.collection('users').doc(uid);
    const subcols = ['pools','assets','transactions','options','positions'];
    for (const col of subcols) {
      const snap = await userRef.collection(col).get();
      const batch = fbDb.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      if (!snap.empty) await batch.commit();
    }
    await userRef.delete();
    // Clear localStorage
    ['pool_session', PROF_KEY(), WALLET_KEY(), FIN_KEY()]
      .concat(stKeys(uid+'_'))
      .forEach(k => stDel(k));
    // Delete Firebase Auth user
    if (fbUser) await fbUser.delete();
    session = null;
    showToast('Conta apagada com sucesso.');
    renderAuth('login');
  } catch(err) {
    if (err.code === 'auth/requires-recent-login') {
      showToast('Por segurança, faça login novamente antes de apagar a conta.');
      await doLogout();
    } else {
      showToast('Erro ao apagar conta: ' + err.message);
    }
  }
}

function openChangePasswordModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'change-pw-overlay';
  overlay.innerHTML = `
  <div class="modal" style="max-width:400px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <h3>Alterar senha</h3>
      <button class="btn btn-sm" onclick="document.getElementById('change-pw-overlay').remove()">✕</button>
    </div>
    <div class="field" style="margin-bottom:12px"><label>Senha atual</label><input type="password" id="pw-old" placeholder="••••••••"></div>
    <div class="field" style="margin-bottom:12px"><label>Nova senha</label><input type="password" id="pw-new" placeholder="••••••••"></div>
    <div class="field" style="margin-bottom:16px"><label>Confirmar nova senha</label><input type="password" id="pw-confirm" placeholder="••••••••"></div>
    <div id="pw-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="doChangePassword()">Alterar senha</button>
      <button class="btn" onclick="document.getElementById('change-pw-overlay').remove()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function doChangePassword() {
  const oldPass = document.getElementById('pw-old').value;
  const novo    = document.getElementById('pw-new').value;
  const conf    = document.getElementById('pw-confirm').value;
  const errEl   = document.getElementById('pw-err');

  if (!oldPass || !novo || !conf) {
    errEl.textContent = 'Preencha todos os campos.'; errEl.style.display = 'block'; return;
  }
  const pwCheck = checkPasswordStrength(novo);
  if (!pwCheck.ok) { errEl.textContent = pwCheck.msg; errEl.style.display = 'block'; return; }
  if (novo !== conf) { errEl.textContent = 'As senhas não conferem.'; errEl.style.display = 'block'; return; }
  if (novo === oldPass) { errEl.textContent = 'A nova senha deve ser diferente da atual.'; errEl.style.display = 'block'; return; }

  const btn = document.querySelector('#change-pw-overlay .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Alterando...'; }

  try {
    // Re-authenticate first (Firebase requires recent login for sensitive ops)
    const cred = firebase.auth.EmailAuthProvider.credential(session.user.email, oldPass);
    await fbAuth.currentUser.reauthenticateWithCredential(cred);
    await fbAuth.currentUser.updatePassword(novo);
    secLog('pw_changed', session.user.email);
    document.getElementById('change-pw-overlay').remove();
    showToast('✓ Senha alterada com sucesso!');
  } catch(err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Alterar senha'; }
    const msgs = {
      'auth/wrong-password':       'Senha atual incorreta.',
      'auth/invalid-credential':   'Senha atual incorreta.',
      'auth/weak-password':        'Nova senha muito fraca.',
      'auth/too-many-requests':    'Muitas tentativas. Aguarde.',
      'auth/requires-recent-login':'Faça login novamente antes de alterar a senha.',
    };
    errEl.textContent = msgs[err.code] || 'Erro: ' + err.message;
    errEl.style.display = 'block';
  }
}

