async function loadUsers() {
  document.getElementById('users-tbody').innerHTML = `<tr><td colspan="7" class="loading"><div class="spinner"></div> Carregando...</td></tr>`;
  try {
    const snap = await fbDb.collection('users').orderBy('createdAt','desc').get();
    allUsers = snap.docs.map(d=>({id:d.id,...d.data()}));
    filteredUsers = allUsers;
    usersCurrentPage = 1;
    document.getElementById('users-subtitle').textContent = `${allUsers.length} usuários registrados`;
    document.getElementById('nav-users-count').textContent = allUsers.length;
    renderUsersPage();
  } catch(e) {
    console.error(e);
    // Try without orderBy if index not created
    try {
      const snap = await fbDb.collection('users').get();
      allUsers = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
      filteredUsers = allUsers;
      usersCurrentPage = 1;
      document.getElementById('users-subtitle').textContent = `${allUsers.length} usuários registrados`;
      document.getElementById('nav-users-count').textContent = allUsers.length;
      renderUsersPage();
    } catch(e2) {
      document.getElementById('users-tbody').innerHTML = `<tr><td colspan="7" style="padding:2rem;text-align:center;color:var(--red)">Erro ao carregar: ${e2.message}</td></tr>`;
    }
  }
}

function filterUsers() {
  const q = document.getElementById('user-search').value.toLowerCase().trim();
  filteredUsers = q ? allUsers.filter(u=>
    (u.email||'').toLowerCase().includes(q) ||
    (u.displayName||'').toLowerCase().includes(q) ||
    (u.name||'').toLowerCase().includes(q) ||
    (u.id||'').toLowerCase().includes(q)
  ) : allUsers;
  usersCurrentPage = 1;
  renderUsersPage();
}

function renderUsersPage() {
  const start = (usersCurrentPage-1)*USERS_PER_PAGE;
  const end   = start + USERS_PER_PAGE;
  const page  = filteredUsers.slice(start, end);
  renderUsersRows('users-tbody', page);
  const total = filteredUsers.length;
  const pages = Math.ceil(total/USERS_PER_PAGE);
  document.getElementById('users-pag-info').textContent = `${start+1}–${Math.min(end,total)} de ${total}`;
  document.getElementById('pag-prev').disabled = usersCurrentPage === 1;
  document.getElementById('pag-next').disabled = usersCurrentPage >= pages;
}

function usersPage(dir) {
  usersCurrentPage += dir;
  renderUsersPage();
}

function renderUsersRows(tbodyId, users) {
  const tbody = document.getElementById(tbodyId);
  if(!tbody) return;
  if(!users.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding:2rem;text-align:center;color:var(--text2)">Nenhum usuário encontrado</td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => {
    const name    = u.displayName || u.name || '—';
    const email   = u.email || '—';
    const plan    = u.plan || 'free';
    const role    = u.role || 'user';
    const created = u.createdAt ? new Date(u.createdAt.seconds ? u.createdAt.seconds*1000 : u.createdAt).toLocaleDateString('pt-BR') : '—';
    const lastLogin = u.lastLogin ? new Date(u.lastLogin.seconds ? u.lastLogin.seconds*1000 : u.lastLogin).toLocaleDateString('pt-BR') : '—';
    const initial = (name!='—'?name:email)[0]?.toUpperCase()||'?';
    const planBadge = plan==='pro'||plan==='Pro' ? 'badge-green' : plan==='trial' ? 'badge-amber' : plan==='enterprise' ? 'badge-blue' : 'badge-gray';
    const roleBadge = role==='admin' ? 'badge-purple' : 'badge-gray';
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,var(--blue),var(--green));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">${initial}</div>
          <span style="font-weight:600;font-size:13px">${escHtml(name)}</span>
        </div>
      </td>
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--text2)">${escHtml(email)}</td>
      <td><span class="badge ${planBadge}">${plan.toUpperCase()}</span></td>
      <td><span class="badge ${roleBadge}">${role.toUpperCase()}</span></td>
      <td style="font-size:12px;color:var(--text2)">${created}</td>
      <td style="font-size:12px;color:var(--text2)">${lastLogin}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-xs btn-ghost" onclick="openUserDetail('${u.id}')">🔍</button>
          <button class="btn btn-xs" onclick="openUserModal('${u.id}')">✏️ Editar</button>
          ${role!=='admin'?`<button class="btn btn-xs btn-danger" onclick="deleteUser('${u.id}','${escHtml(email)}')">🗑</button>`:''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openUserModal(uid) {
  const u = allUsers.find(x=>x.id===uid);
  if(!u) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'user-modal';
  overlay.innerHTML = `
  <div class="modal" style="max-width:500px">
    <div class="modal-header">
      <div>
        <div class="modal-title">Editar Usuário</div>
        <div class="modal-sub">${u.email||u.id}</div>
      </div>
      <button class="modal-close" onclick="document.getElementById('user-modal').remove()">✕</button>
    </div>
    <div class="form-group">
      <label>Nome</label>
      <input type="text" id="eu-name" value="${escAttr(u.displayName||u.name||'')}" style="width:100%;height:38px;padding:0 12px;font-size:13px;border:1px solid var(--border2);border-radius:var(--radius);background:var(--bg3);color:var(--text);outline:none;font-family:var(--font-body)">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Plano</label>
        <select id="eu-plan">
          <option value="free" ${(u.plan||'free')==='free'?'selected':''}>Free</option>
          <option value="trial" ${u.plan==='trial'?'selected':''}>Trial</option>
          <option value="pro" ${u.plan==='pro'||u.plan==='Pro'?'selected':''}>Pro</option>
          <option value="enterprise" ${u.plan==='enterprise'?'selected':''}>Enterprise</option>
        </select>
      </div>
      <div class="form-group">
        <label>Role</label>
        <select id="eu-role">
          <option value="user" ${(u.role||'user')==='user'?'selected':''}>User</option>
          <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
          <option value="moderator" ${u.role==='moderator'?'selected':''}>Moderator</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Bio</label>
      <textarea id="eu-bio" rows="2">${escHtml(u.bio||'')}</textarea>
    </div>
    <div class="form-group">
      <label>Status da conta</label>
      <select id="eu-status">
        <option value="active" ${(u.status||'active')==='active'?'selected':''}>✅ Ativa</option>
        <option value="suspended" ${u.status==='suspended'?'selected':''}>🚫 Suspensa</option>
        <option value="banned" ${u.status==='banned'?'selected':''}>⛔ Banida</option>
      </select>
    </div>
    <div class="info-box info-blue" style="margin-bottom:1rem">
      📋 UID: <code style="font-family:var(--font-mono);font-size:11px">${uid}</code>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-green" style="flex:1;justify-content:center" onclick="saveUser('${uid}')">Salvar alterações</button>
      <button class="btn" onclick="document.getElementById('user-modal').remove()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function saveUser(uid) {
  const data = {
    displayName: document.getElementById('eu-name').value.trim(),
    plan:   document.getElementById('eu-plan').value,
    role:   document.getElementById('eu-role').value,
    bio:    document.getElementById('eu-bio').value.trim(),
    status: document.getElementById('eu-status').value,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  try {
    await fbDb.collection('users').doc(uid).set(data, {merge:true});
    const idx = allUsers.findIndex(u=>u.id===uid);
    if(idx>=0) Object.assign(allUsers[idx], data);
    filteredUsers = allUsers;
    _panelCache['users'] = 0;
    _panelCache['dashboard'] = 0;
    _panelCache['analytics'] = 0;
    _panelCache['subscriptions'] = 0;
    renderUsersPage();
    document.getElementById('user-modal')?.remove();
    addLog('user_edit', `Editou usuário ${uid} — plano:${data.plan} role:${data.role}`);
    showToast('✅ Usuário atualizado!', 'success');
  } catch(e) {
    showToast('❌ Erro: '+e.message, 'error');
  }
}

async function deleteUser(uid, email) {
  if(!confirm(`Remover usuário ${email}? Esta ação não pode ser desfeita.`)) return;
  try {
    await fbDb.collection('users').doc(uid).delete();
    allUsers = allUsers.filter(u=>u.id!==uid);
    filteredUsers = allUsers;
    _panelCache['users'] = 0;
    _panelCache['dashboard'] = 0;
    _panelCache['analytics'] = 0;
    renderUsersPage();
    addLog('user_delete', `Deletou usuário ${uid} (${email})`);
    showToast('✅ Usuário removido.', 'success');
  } catch(e) {
    showToast('❌ Erro: '+e.message, 'error');
  }
}

/* ══ Posts ══ */
