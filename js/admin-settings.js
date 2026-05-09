async function loadSettings() {
  // Load admins
  try {
    const snap = await fbDb.collection('users').where('role','==','admin').get();
    const admins = snap.docs.map(d=>({id:d.id,...d.data()}));
    const el = document.getElementById('admins-list');
    if(!admins.length) { el.innerHTML = `<div style="font-size:12px;color:var(--text2)">Nenhum admin encontrado.</div>`; return; }
    el.innerHTML = admins.map(a=>`
    <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
      <div style="width:28px;height:28px;border-radius:6px;background:var(--blue);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff">${(a.displayName||a.email||'A')[0].toUpperCase()}</div>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:600">${escHtml(a.displayName||a.name||'—')}</div>
        <div style="font-size:11px;color:var(--text2);font-family:var(--font-mono)">${escHtml(a.email||a.id)}</div>
      </div>
      ${a.id!==adminUser?.uid?`<button class="btn btn-xs btn-danger" onclick="demoteAdmin('${a.id}')">Revogar</button>`:'<span style="font-size:10px;color:var(--green)">VOCÊ</span>'}
    </div>`).join('');
  } catch(e) {
    document.getElementById('admins-list').innerHTML = `<div style="font-size:12px;color:var(--text2)">Erro ao carregar admins.</div>`;
  }
  // Load platform config
  try {
    const cfg = await fbDb.collection('platform').doc('config').get();
    if(cfg.exists) {
      const d = cfg.data();
      if(document.getElementById('cfg-maintenance')) document.getElementById('cfg-maintenance').checked = !!d.maintenanceMode;
      if(document.getElementById('cfg-registrations')) document.getElementById('cfg-registrations').checked = d.registrationsEnabled!==false;
      if(document.getElementById('cfg-trial')) document.getElementById('cfg-trial').checked = d.trialEnabled!==false;
    }
  } catch(e) {}
}

async function promoteAdmin() {
  const email = document.getElementById('new-admin-email')?.value.trim();
  if(!email) { showToast('Informe o e-mail.','warn'); return; }
  try {
    // Find user by email
    const snap = await fbDb.collection('users').where('email','==',email).limit(1).get();
    if(snap.empty) { showToast('❌ Usuário não encontrado.','error'); return; }
    const uid = snap.docs[0].id;
    await fbDb.collection('users').doc(uid).update({role:'admin'});
    addLog('promote_admin', `Promoveu ${email} a admin`);
    showToast('✅ Usuário promovido a admin!','success');
    document.getElementById('new-admin-email').value = '';
    loadSettings();
  } catch(e) { showToast('❌ '+e.message,'error'); }
}

async function demoteAdmin(uid) {
  if(!confirm('Revogar permissões de admin deste usuário?')) return;
  try {
    await fbDb.collection('users').doc(uid).update({role:'user'});
    addLog('demote_admin', `Revogou admin de uid:${uid}`);
    showToast('✅ Permissões revogadas.','success');
    loadSettings();
  } catch(e) { showToast('❌ '+e.message,'error'); }
}

async function saveSettings() {
  const data = {
    maintenanceMode:       document.getElementById('cfg-maintenance')?.checked || false,
    registrationsEnabled:  document.getElementById('cfg-registrations')?.checked !== false,
    trialEnabled:          document.getElementById('cfg-trial')?.checked !== false,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminUser?.email,
  };
  try {
    await fbDb.collection('platform').doc('config').set(data, {merge:true});
    addLog('settings_save', 'Salvou configurações da plataforma');
    showToast('✅ Configurações salvas!','success');
  } catch(e) { showToast('❌ '+e.message,'error'); }
}

/* ══ Logs ══ */
function renderLogs() {
  const el = document.getElementById('logs-container');
  if(!adminLogs.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Sem logs</div></div>`;
    return;
  }
  el.innerHTML = adminLogs.map(l=>`
  <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 1.25rem;border-bottom:1px solid var(--border)">
    <div style="font-size:10px;color:var(--text3);font-family:var(--font-mono);white-space:nowrap;min-width:140px">${new Date(l.ts).toLocaleString('pt-BR')}</div>
    <div style="flex:1">
      <span style="font-size:12px;font-weight:700;color:var(--text)">${escHtml(l.action)}</span>
      ${l.detail?`<span style="font-size:11px;color:var(--text2);margin-left:6px">${escHtml(l.detail)}</span>`:''}
    </div>
    <div style="font-size:10px;color:var(--text3);font-family:var(--font-mono)">${escHtml(l.admin)}</div>
  </div>`).join('');
}

function clearLogs() {
  if(!confirm('Limpar todos os logs?')) return;
  adminLogs.length = 0;
  localStorage.removeItem('admin_logs');
  showToast('🗑 Logs limpos.','success');
  renderLogs();
}

/* ══ Export CSV ══ */
function exportUsersCSV() {
  if(!allUsers.length) { showToast('Sem usuários para exportar.','warn'); return; }
  const header = ['UID','Nome','Email','Plano','Role','Cadastro','Último Login','Status'];
  const rows = allUsers.map(u => [
    u.id,
    u.displayName||u.name||'',
    u.email||'',
    u.plan||'free',
    u.role||'user',
    u.createdAt ? new Date(u.createdAt.seconds ? u.createdAt.seconds*1000 : u.createdAt).toISOString() : '',
    u.lastLogin  ? new Date(u.lastLogin.seconds  ? u.lastLogin.seconds*1000  : u.lastLogin).toISOString()  : '',
    u.status||'active',
  ].map(v => `"${String(v).replace(/"/g,'""')}"`));
  const csv = [header.map(h=>`"${h}"`).join(','), ...rows.map(r=>r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `profitflow_users_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
  addLog('export_csv', `Exportou ${allUsers.length} usuários em CSV`);
  showToast(`📥 ${allUsers.length} usuários exportados.`,'success');
}

function exportPostsCSV() {
  if(!allPosts.length) { showToast('Sem posts para exportar.','warn'); return; }
  const header = ['ID','Título','Tag','Autor','Data','Status','Destaque'];
  const rows = allPosts.map(p => [
    p.id, p.title||'', p.tag||'', p.author||'',
    p.date||'', p.published!==false?'publicado':'rascunho',
    p.featured?'sim':'não'
  ].map(v=>`"${String(v).replace(/"/g,'""')}"`));
  const csv = [header.map(h=>`"${h}"`).join(','), ...rows.map(r=>r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `profitflow_posts_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
  addLog('export_posts_csv', `Exportou ${allPosts.length} posts em CSV`);
  showToast(`📥 ${allPosts.length} posts exportados.`,'success');
}

/* ══ User Detail Explorer ══ */
async function openUserDetail(uid) {
  const u = allUsers.find(x=>x.id===uid);
  if(!u) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'user-detail-modal';
  overlay.style.cssText = 'align-items:flex-start;overflow-y:auto;padding:1.5rem 1rem';
  overlay.innerHTML = `
  <div class="modal" style="max-width:680px;margin:auto">
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,var(--blue),var(--green));display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff">
          ${(u.displayName||u.name||u.email||'?')[0].toUpperCase()}
        </div>
        <div>
          <div style="font-size:17px;font-weight:700">${escHtml(u.displayName||u.name||'—')}</div>
          <div style="font-size:12px;color:var(--text2);font-family:var(--font-mono)">${escHtml(u.email||u.id)}</div>
        </div>
      </div>
      <button class="modal-close" onclick="document.getElementById('user-detail-modal').remove()">✕</button>
    </div>

    <!-- Quick info grid -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1.25rem">
      ${[
        ['Plano', u.plan||'free', 'var(--green)'],
        ['Role',  u.role||'user', 'var(--blue)'],
        ['Status',u.status||'active','var(--amber)'],
      ].map(([l,v,c])=>`
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:.75rem;text-align:center">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;font-family:var(--font-mono);margin-bottom:4px">${l}</div>
        <div style="font-size:15px;font-weight:700;color:${c}">${v.toUpperCase()}</div>
      </div>`).join('')}
    </div>

    <!-- Tabs -->
    <div style="display:flex;border-bottom:1px solid var(--border);margin-bottom:1.25rem">
      <button class="ud-tab active" onclick="udTab(this,'ud-profile')" style="padding:8px 16px;font-size:12px;font-weight:700;border:none;background:none;color:var(--green);cursor:pointer;border-bottom:2px solid var(--green)">Perfil</button>
      <button class="ud-tab" onclick="udTab(this,'ud-data')" style="padding:8px 16px;font-size:12px;font-weight:600;border:none;background:none;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent">Dados Firestore</button>
      <button class="ud-tab" onclick="udTab(this,'ud-collections')" style="padding:8px 16px;font-size:12px;font-weight:600;border:none;background:none;color:var(--text2);cursor:pointer;border-bottom:2px solid transparent">Coleções</button>
    </div>

    <!-- Profile tab -->
    <div id="ud-profile">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${[
          ['UID',u.id], ['E-mail',u.email], ['Nome',u.displayName||u.name],
          ['Bio',u.bio], ['País',u.country], ['Fuso',u.timezone],
          ['Telefone',u.phone], ['Cadastro', u.createdAt ? new Date(u.createdAt.seconds?u.createdAt.seconds*1000:u.createdAt).toLocaleString('pt-BR') : '—'],
        ].map(([k,v])=>`
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:.625rem .875rem">
          <div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;font-family:var(--font-mono);margin-bottom:3px">${k}</div>
          <div style="font-size:12px;color:var(--text);word-break:break-all">${escHtml(String(v||'—').slice(0,80))}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Raw data tab -->
    <div id="ud-data" style="display:none">
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;max-height:320px;overflow-y:auto">
        <pre style="font-size:11px;font-family:var(--font-mono);color:var(--text2);white-space:pre-wrap;word-break:break-all">${escHtml(JSON.stringify({...u, id:undefined}, null, 2))}</pre>
      </div>
    </div>

    <!-- Collections tab -->
    <div id="ud-collections" style="display:none">
      <div id="ud-collections-content" class="loading"><div class="spinner"></div> Carregando coleções...</div>
    </div>

    <hr class="divider">
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="document.getElementById('user-detail-modal').remove();openUserModal('${uid}')">✏️ Editar usuário</button>
      <button class="btn btn-sm" onclick="sendPasswordResetEmail('${u.email||''}')">🔑 Reset de senha</button>
      ${u.role!=='admin'?`<button class="btn btn-sm btn-danger" onclick="document.getElementById('user-detail-modal').remove();deleteUser('${uid}','${escAttr(u.email||'')}')">🗑 Deletar conta</button>`:''}
    </div>
  </div>`;
  document.body.appendChild(overlay);
  // Load collections when tab is clicked
  overlay.querySelector('[onclick*="ud-collections"]').addEventListener('click', () => loadUserCollections(uid));
}

function udTab(btn, targetId) {
  btn.closest('.modal').querySelectorAll('.ud-tab').forEach(t=>{
    t.style.color='var(--text2)'; t.style.borderBottom='2px solid transparent';
  });
  btn.style.color='var(--green)'; btn.style.borderBottom='2px solid var(--green)';
  ['ud-profile','ud-data','ud-collections'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.style.display = id===targetId ? 'block' : 'none';
  });
}

async function loadUserCollections(uid) {
  const el = document.getElementById('ud-collections-content');
  if(!el) return;
  el.innerHTML = '<div class="loading"><div class="spinner"></div> Buscando...</div>';
  const collections = ['pools','options','positions'];
  const results = await Promise.all(collections.map(async col => {
    try {
      const snap = await fbDb.collection('users').doc(uid).collection(col).get();
      return {col, count: snap.size, docs: snap.docs.slice(0,3).map(d=>({id:d.id,...d.data()}))};
    } catch(e) { return {col, count:0, docs:[]}; }
  }));
  el.innerHTML = results.map(r => `
  <div style="margin-bottom:.875rem">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">
      <span style="font-size:12px;font-weight:700;color:var(--text);font-family:var(--font-mono)">${r.col}</span>
      <span class="badge badge-blue">${r.count} docs</span>
    </div>
    ${r.docs.length ? r.docs.map(d=>`
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:.5rem .75rem;margin-bottom:4px;font-size:11px;font-family:var(--font-mono);color:var(--text2)">
      <span style="color:var(--green)">${d.id}</span> · ${d.name||d.key||JSON.stringify(d).slice(0,60)}…
    </div>`).join('') : `<div style="font-size:12px;color:var(--text3)">Sem documentos.</div>`}
  </div>`).join('');
}

async function sendPasswordResetEmail(email) {
  if(!email) { showToast('E-mail não disponível.','warn'); return; }
  try {
    await fbAuth.sendPasswordResetEmail(email);
    addLog('password_reset', `Enviou reset de senha para ${email}`);
    showToast(`📧 E-mail de reset enviado para ${email}!`,'success');
  } catch(e) { showToast('❌ '+e.message,'error'); }
}

/* ══ Real-time dashboard listener ══ */
let _dashListener = null;
function startRealtimeListeners() {
  if(_dashListener) return;
  _dashListener = fbDb.collection('users').onSnapshot(snap => {
    const count = snap.size;
    const el = document.getElementById('stat-users');
    if(el && el.textContent !== String(count)) {
      el.textContent = count;
      el.style.transition = 'color .3s';
      el.style.color = 'var(--green)';
      setTimeout(()=>{ el.style.color = 'var(--blue)'; }, 1000);
      document.getElementById('nav-users-count').textContent = count;
      allUsers = snap.docs.map(d=>({id:d.id,...d.data()}));
    }
  }, ()=>{});
}

/* ══ Bulk user actions ══ */
function openBulkModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'bulk-modal';
  overlay.innerHTML = `
  <div class="modal" style="max-width:480px">
    <div class="modal-header">
      <div>
        <div class="modal-title">Ações em Massa</div>
        <div class="modal-sub">Aplica ação em todos os ${filteredUsers.length} usuários filtrados</div>
      </div>
      <button class="modal-close" onclick="document.getElementById('bulk-modal').remove()">✕</button>
    </div>
    <div class="info-box info-amber">⚠️ Estas ações são irreversíveis e afetam múltiplos usuários.</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:1rem">
      <button class="btn btn-sm" onclick="bulkSetPlan('trial')">⚡ Definir plano Trial para todos</button>
      <button class="btn btn-sm" onclick="bulkSetPlan('free')">🆓 Reverter para Free (todos)</button>
      <button class="btn btn-sm btn-primary" onclick="bulkSetPlan('pro')">🌟 Ativar Pro (todos)</button>
      <button class="btn btn-sm btn-danger" onclick="bulkDeleteAll()">🗑 Deletar todos os filtrados</button>
    </div>
    <hr class="divider">
    <button class="btn btn-ghost" onclick="document.getElementById('bulk-modal').remove()" style="width:100%;justify-content:center">Cancelar</button>
  </div>`;
  document.body.appendChild(overlay);
}

async function bulkSetPlan(plan) {
  if(!confirm(`Definir plano "${plan}" para ${filteredUsers.length} usuários?`)) return;
  document.getElementById('bulk-modal')?.remove();
  let ok = 0;
  const batch = fbDb.batch();
  filteredUsers.forEach(u => {
    if(u.role !== 'admin') {
      batch.update(fbDb.collection('users').doc(u.id), {plan});
      ok++;
    }
  });
  try {
    await batch.commit();
    addLog('bulk_plan', `Definiu plano "${plan}" para ${ok} usuários`);
    showToast(`✅ Plano "${plan}" aplicado a ${ok} usuários.`,'success');
    loadUsers();
  } catch(e) { showToast('❌ '+e.message,'error'); }
}

async function bulkDeleteAll() {
  const nonAdmins = filteredUsers.filter(u=>u.role!=='admin');
  if(!confirm(`⚠️ DELETAR ${nonAdmins.length} usuários? Esta ação é IRREVERSÍVEL!`)) return;
  document.getElementById('bulk-modal')?.remove();
  const batch = fbDb.batch();
  nonAdmins.forEach(u => batch.delete(fbDb.collection('users').doc(u.id)));
  try {
    await batch.commit();
    addLog('bulk_delete', `Deletou ${nonAdmins.length} usuários em massa`);
    showToast(`🗑 ${nonAdmins.length} usuários removidos.`,'success');
    loadUsers();
  } catch(e) { showToast('❌ '+e.message,'error'); }
}

/* ══ Helpers ══ */
function escHtml(s) {
  if(s==null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escAttr(s) {
  if(s==null) return '';
  return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ══ Auto-check auth ══ */
fbAuth.onAuthStateChanged(async user => {
  if(user && !document.getElementById('app-shell').classList.contains('visible')) {
    try {
      const doc = await fbDb.collection('users').doc(user.uid).get();
      const data = doc.exists ? doc.data() : {};
      if(data.role==='admin'||data.isAdmin) {
        adminUser = user;
        enterAdmin(user, data);
      }
    } catch(e) {}
  }
});

/* ══ Live notif preview on type ══ */
['notif-title','notif-body','notif-type','notif-icon'].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.addEventListener('input', updateNotifPreview);
});


/* ── Keyboard shortcuts ── */
document.addEventListener('keydown', e => {
  if((e.ctrlKey||e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openQuickSwitch();
  }
  if(e.key === 'Escape') {
    document.getElementById('quick-switch-overlay')?.remove();
    document.querySelector('.modal-overlay')?.remove();
  }
  if((e.ctrlKey||e.metaKey) && e.key === 'r') {
    e.preventDefault();
    refreshPanel();
  }
});

