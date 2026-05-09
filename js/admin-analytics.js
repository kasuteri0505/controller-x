function setGrowthWindow(days) {
  growthWindowDays = days;
  [7,30,90].forEach(d => {
    const btn = document.getElementById(`growth-btn-${d}`);
    if(!btn) return;
    if(d===days) { btn.style.background='var(--blue)'; btn.style.color='#fff'; btn.style.borderColor='var(--blue)'; }
    else { btn.style.background=''; btn.style.color=''; btn.style.borderColor=''; }
  });
  renderGrowthChart();
}

async function loadAnalytics() {
  if(!allUsers.length) await loadDashboard();

  const total  = allUsers.length || 0;
  const pro    = allUsers.filter(u=>u.plan==='pro'||u.plan==='Pro'||u.subscription?.status==='active').length;
  const trial  = allUsers.filter(u=>u.plan==='trial'||u.plan==='Trial').length;
  const conv   = total ? ((pro/total)*100).toFixed(1) : '0.0';
  const countries = [...new Set(allUsers.map(u=>u.country).filter(Boolean))];
  const now    = Date.now();
  const todayStart = startOfDay(now);
  const todayUsers = allUsers.filter(u=>tsToMs(u.createdAt)>=todayStart).length;

  // Calculate 30-day buckets for avg
  const d30Start = now - 30*86400000;
  const last30   = allUsers.filter(u=>tsToMs(u.createdAt)>=d30Start);
  const avg30    = (last30.length / 30).toFixed(1);

  // Best day in last 30 days
  const buckets30 = buildDayBuckets(allUsers, 30);
  const maxBucket = buckets30.reduce((best,b)=>b.count>best.count?b:best, {count:0,label:'—'});

  // Newsletter subscribers
  let newsletterCount = '—';
  try {
    const ns = await fbDb.collection('newsletter_subscribers').get();
    newsletterCount = ns.docs.length;
    document.getElementById('an-newsletter').textContent = newsletterCount;
  } catch(e) {}

  // MRR
  const mrr = pro * 97;

  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set('an-today',    todayUsers);
  set('an-conv',     conv + '%');
  set('an-avg',      avg30);
  set('an-countries', countries.length || '—');
  set('an-best-day',  maxBucket.label);
  set('an-best-day-sub', maxBucket.count ? `${maxBucket.count} cadastros` : 'sem dados');
  set('an-mrr',      `R$${mrr.toLocaleString('pt-BR')}`);
  set('an-trial',    trial);

  renderGrowthChart();
  renderPlanDist();
  renderTagDist();
  renderCohortTable();
  renderCountryDist(countries);
  renderAdminActivity();

  // Update subtitle
  const sub = document.getElementById('growth-subtitle');
  if(sub) sub.textContent = `${last30.length} cadastros nos últimos 30 dias · média ${avg30}/dia`;
}

/* ── Build day-by-day buckets from allUsers.createdAt ── */
function buildDayBuckets(users, days) {
  const buckets = [];
  const now = Date.now();
  for(let i=days-1; i>=0; i--) {
    const dayStart = startOfDay(now - i*86400000);
    const dayEnd   = dayStart + 86400000;
    const d        = new Date(dayStart);
    const label    = d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
    const count    = users.filter(u => { const ca=tsToMs(u.createdAt); return ca>=dayStart && ca<dayEnd; }).length;
    buckets.push({ dayStart, dayEnd, label, count, isToday: i===0 });
  }
  return buckets;
}

function renderGrowthChart() {
  const el = document.getElementById('growth-chart');
  if(!el) return;
  const buckets = buildDayBuckets(allUsers, growthWindowDays);
  const max     = Math.max(...buckets.map(b=>b.count), 1);
  const total   = buckets.reduce((s,b)=>s+b.count,0);
  const showEvery = growthWindowDays <= 7 ? 1 : growthWindowDays <= 30 ? 5 : 10;

  el.innerHTML = `
  <div style="display:flex;align-items:flex-end;gap:2px;height:90px;padding:0 2px">
    ${buckets.map((b,i)=>`
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px"
         title="${b.label}: ${b.count} cadastro${b.count!==1?'s':''}">
      <div style="flex:1;display:flex;align-items:flex-end;width:100%">
        <div style="width:100%;height:${Math.max(b.count>0?Math.round((b.count/max)*100):0,b.count>0?4:2)}%;
             background:${b.isToday?'var(--green)':'var(--blue)'};
             opacity:${b.isToday?1:0.55};
             border-radius:2px 2px 0 0;min-height:${b.count>0?4:1}px;
             transition:opacity .15s;cursor:pointer"
          onmouseover="this.style.opacity=1;this.title='${b.label}: ${b.count}'"
          onmouseout="this.style.opacity='${b.isToday?1:.55}'"></div>
      </div>
      ${i%showEvery===0
        ? `<div style="font-size:7px;color:var(--text3);font-family:var(--font-mono);writing-mode:vertical-lr;transform:rotate(180deg);height:24px;overflow:hidden">${b.label}</div>`
        : '<div style="height:14px"></div>'}
    </div>`).join('')}
  </div>
  <div style="display:flex;justify-content:space-between;margin-top:6px;flex-wrap:wrap;gap:4px">
    <span style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">
      ${buckets[0]?.label} → ${buckets[buckets.length-1]?.label}
    </span>
    <span style="font-size:11px;font-family:var(--font-mono)">
      Total: <span style="color:var(--blue)">${total}</span> ·
      Hoje: <span style="color:var(--green)">${buckets[buckets.length-1]?.count||0}</span>
    </span>
  </div>`;
}

function renderCohortTable() {
  const el = document.getElementById('cohort-table');
  if(!el) return;
  const weeks = [];
  const now = Date.now();
  for(let i=7; i>=0; i--) {
    const wStart = now - (i+1)*7*86400000;
    const wEnd   = now - i*7*86400000;
    const wDate  = new Date(wStart);
    const label  = i===0 ? 'Esta semana' : i===1 ? 'Semana passada' : `${wDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}`;
    const count  = allUsers.filter(u=>{ const ca=tsToMs(u.createdAt); return ca>=wStart && ca<wEnd; }).length;
    const pro    = allUsers.filter(u=>{ const ca=tsToMs(u.createdAt); return ca>=wStart && ca<wEnd && (u.plan==='pro'||u.plan==='Pro'); }).length;
    weeks.push({ label, count, pro });
  }
  const maxCount = Math.max(...weeks.map(w=>w.count),1);
  el.innerHTML = `
  <div class="table-wrap">
    <table style="font-size:12px">
      <thead><tr><th>Período</th><th>Cadastros</th><th>Pro</th><th>Distribuição</th></tr></thead>
      <tbody>${weeks.map(w=>`
      <tr>
        <td style="font-family:var(--font-mono);font-size:11px">${w.label}</td>
        <td style="font-weight:700;color:var(--blue)">${w.count}</td>
        <td style="font-weight:700;color:var(--green)">${w.pro}</td>
        <td style="min-width:120px">
          <div style="height:6px;background:var(--bg4);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${Math.round(w.count/maxCount*100)}%;background:var(--blue);border-radius:99px"></div>
          </div>
        </td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function renderCountryDist(countries) {
  const el = document.getElementById('country-dist');
  if(!el) return;
  if(!countries.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text2)">Nenhum país registrado ainda.</div>'; return; }
  const counts = {};
  allUsers.forEach(u=>{ if(u.country) counts[u.country]=(counts[u.country]||0)+1; });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const total  = Object.values(counts).reduce((s,v)=>s+v,0)||1;
  el.innerHTML = sorted.map(([country, count])=>`
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
    <div style="width:90px;font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${country}</div>
    <div style="flex:1;height:6px;background:var(--bg4);border-radius:99px;overflow:hidden">
      <div style="height:100%;width:${Math.round(count/total*100)}%;background:var(--blue);border-radius:99px"></div>
    </div>
    <div style="width:28px;text-align:right;font-size:11px;font-weight:700;font-family:var(--font-mono);color:var(--text)">${count}</div>
  </div>`).join('');
}

function renderAdminActivity() {
  const el = document.getElementById('admin-activity');
  if(!el) return;
  const logs = JSON.parse(localStorage.getItem('admin_logs')||'[]');
  const now  = Date.now();
  const d30  = now - 30*86400000;
  const recent = logs.filter(l=>new Date(l.ts).getTime()>d30);

  // Count by action type
  const counts = {};
  recent.forEach(l=>{ counts[l.action]=(counts[l.action]||0)+1; });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);

  if(!sorted.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text2)">Sem atividade registrada.</div>'; return; }
  const max = sorted[0][1]||1;
  const icons = {login:'🔑',logout:'⏻',post_create:'📝',post_edit:'✏️',post_delete:'🗑',user_edit:'👤',user_delete:'🚫',notif_publish:'📢',settings_save:'⚙️',promote_admin:'🛡️'};
  el.innerHTML = sorted.map(([action,count])=>`
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span style="font-size:13px;width:20px;text-align:center">${icons[action]||'▸'}</span>
    <div style="width:100px;font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${action}</div>
    <div style="flex:1;height:6px;background:var(--bg4);border-radius:99px;overflow:hidden">
      <div style="height:100%;width:${Math.round(count/max*100)}%;background:var(--amber);border-radius:99px"></div>
    </div>
    <div style="width:24px;text-align:right;font-size:11px;font-weight:700;font-family:var(--font-mono);color:var(--text)">${count}</div>
  </div>`).join('');
}

function renderPlanDist() {
  const el = document.getElementById('plan-dist');
  if(!el) return;
  const counts = {free:0, trial:0, pro:0, enterprise:0};
  allUsers.forEach(u=>{ const p=(u.plan||'free').toLowerCase(); if(counts[p]!==undefined) counts[p]++; else counts.free++; });
  const total = Object.values(counts).reduce((a,b)=>a+b,0)||1;
  const items = [
    {label:'Free', value:counts.free, color:'var(--text3)'},
    {label:'Trial', value:counts.trial, color:'var(--amber)'},
    {label:'Pro', value:counts.pro, color:'var(--green)'},
    {label:'Enterprise', value:counts.enterprise, color:'var(--blue)'},
  ];
  el.innerHTML = items.map(it=>`
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
    <div style="width:80px;font-size:12px;color:var(--text2)">${it.label}</div>
    <div style="flex:1;height:8px;background:var(--bg4);border-radius:99px;overflow:hidden">
      <div style="height:100%;width:${(it.value/total*100).toFixed(1)}%;background:${it.color};border-radius:99px;transition:width .5s"></div>
    </div>
    <div style="width:40px;text-align:right;font-size:12px;font-weight:700;font-family:var(--font-mono);color:var(--text)">${it.value}</div>
  </div>`).join('');
}

function renderTagDist() {
  const el = document.getElementById('tag-dist');
  if(!el) return;
  const counts = {};
  allPosts.forEach(p=>{ const t=p.tag||'Outros'; counts[t]=(counts[t]||0)+1; });
  const total = Object.values(counts).reduce((a,b)=>a+b,0)||1;
  const colors = {DeFi:'var(--green)', Cripto:'var(--blue)', 'Ações':'var(--amber)', Economia:'var(--purple)', 'Opções':'#f472b6', Outros:'var(--text3)'};
  el.innerHTML = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([tag,count])=>`
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
    <div style="width:80px;font-size:12px;color:var(--text2)">${tag}</div>
    <div style="flex:1;height:8px;background:var(--bg4);border-radius:99px;overflow:hidden">
      <div style="height:100%;width:${(count/total*100).toFixed(1)}%;background:${colors[tag]||'var(--blue)'};border-radius:99px"></div>
    </div>
    <div style="width:30px;text-align:right;font-size:12px;font-weight:700;font-family:var(--font-mono);color:var(--text)">${count}</div>
  </div>`).join('');
  if(!Object.keys(counts).length) el.innerHTML = `<div style="color:var(--text2);font-size:13px">Nenhum post criado ainda.</div>`;
}

/* ══ Subscriptions ══ */
function loadSubscriptions() {
  const counts = {free:0, trial:0, pro:0, enterprise:0};
  allUsers.forEach(u=>{ const p=(u.plan||'free').toLowerCase(); if(counts[p]!==undefined)counts[p]++;else counts.free++; });
  document.getElementById('sub-free').textContent = counts.free;
  document.getElementById('sub-trial').textContent = counts.trial;
  document.getElementById('sub-pro').textContent = counts.pro;
  document.getElementById('sub-ent').textContent = counts.enterprise;

  const tbl = document.getElementById('sub-table');
  const rows = [
    {plan:'Free', users:counts.free, price:'R$ 0', features:'Módulos básicos', color:'var(--text3)'},
    {plan:'Trial', users:counts.trial, price:'—', features:'30 dias de acesso Pro', color:'var(--amber)'},
    {plan:'Pro', users:counts.pro, price:'R$ 97/mês', features:'Todos os módulos', color:'var(--green)'},
    {plan:'Enterprise', users:counts.enterprise, price:'Personalizado', features:'Módulos + suporte', color:'var(--blue)'},
  ];
  tbl.innerHTML = `
  <div class="table-wrap">
    <table>
      <thead><tr><th>Plano</th><th>Usuários</th><th>Preço</th><th>Recursos</th></tr></thead>
      <tbody>${rows.map(r=>`
      <tr>
        <td><span style="font-weight:700;color:${r.color}">${r.plan}</span></td>
        <td style="font-family:var(--font-mono);font-weight:700">${r.users}</td>
        <td style="font-family:var(--font-mono);font-size:12px">${r.price}</td>
        <td style="font-size:12px;color:var(--text2)">${r.features}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

/* ══ Notifications ══ */
async function loadNotifications() {
  try {
    const snap = await fbDb.collection('platform_notifications').orderBy('createdAt','desc').limit(20).get();
    const notifs = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderPublishedNotifs(notifs);
  } catch(e) {
    try {
      const snap = await fbDb.collection('platform_notifications').get();
      renderPublishedNotifs(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e2) {
      document.getElementById('notif-published-list').innerHTML = `<div style="font-size:12px;color:var(--text2)">Nenhuma notificação publicada ainda.</div>`;
    }
  }
}

function renderPublishedNotifs(notifs) {
  const el = document.getElementById('notif-published-list');
  if(!el) return;
  if(!notifs.length) { el.innerHTML = `<div style="font-size:12px;color:var(--text2)">Nenhuma notificação publicada.</div>`; return; }
  el.innerHTML = notifs.map(n=>`
  <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
    <span style="font-size:18px">${n.icon||'📢'}</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:12px;font-weight:600">${escHtml(n.title||'')}</div>
      <div style="font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(n.body||'')}</div>
    </div>
    <button class="btn btn-xs btn-danger" onclick="deleteNotif('${n.id}')">🗑</button>
  </div>`).join('');
}

function updateNotifPreview() {
  const icon  = document.getElementById('notif-icon')?.value || '📢';
  const title = document.getElementById('notif-title')?.value || 'Título da notificação';
  const body  = document.getElementById('notif-body')?.value || 'Descrição da notificação aparece aqui.';
  const type  = document.getElementById('notif-type')?.value || 'info';
  const styles = {
    info:    {bg:'var(--blue-bg)',border:'rgba(99,142,255,.25)',color:'var(--blue-text)'},
    success: {bg:'var(--green-bg)',border:'rgba(57,255,138,.2)',color:'var(--green-text)'},
    warning: {bg:'var(--amber-bg)',border:'rgba(255,183,77,.3)',color:'var(--amber-text)'},
    tip:     {bg:'rgba(139,92,246,.08)',border:'rgba(139,92,246,.25)',color:'#a78bfa'},
  };
  const s = styles[type]||styles.info;
  document.getElementById('notif-preview-container').innerHTML = `
  <div style="display:flex;align-items:flex-start;gap:12px;padding:.875rem 1rem;background:${s.bg};border:1px solid ${s.border};border-radius:var(--radius)">
    <span style="font-size:20px">${icon}</span>
    <div>
      <div style="font-size:13px;font-weight:700;margin-bottom:4px">${escHtml(title)}</div>
      <div style="font-size:12px;color:var(--text2)">${escHtml(body)}</div>
    </div>
  </div>
  <div style="font-size:11px;color:var(--text3);margin-top:6px;font-family:var(--font-mono)">⬆ Assim será exibido no painel do usuário</div>`;
}

async function publishNotification() {
  const title = document.getElementById('notif-title')?.value.trim();
  const body  = document.getElementById('notif-body')?.value.trim();
  if(!title||!body) { showToast('Título e mensagem são obrigatórios.','warn'); return; }
  const data = {
    id:       'notif_' + Date.now(),
    type:     document.getElementById('notif-type')?.value || 'info',
    icon:     document.getElementById('notif-icon')?.value.trim() || '📢',
    title, body,
    link:     document.getElementById('notif-link')?.value || null,
    priority: document.getElementById('notif-priority')?.checked ? 0 : 99,
    permanent: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: adminUser?.email || 'admin',
  };
  try {
    await fbDb.collection('platform_notifications').add(data);
    addLog('notif_publish', `Publicou notificação: "${title}"`);
    showToast('📤 Notificação publicada!', 'success');
    clearNotifForm();
    loadNotifications();
  } catch(e) {
    showToast('❌ Erro: '+e.message, 'error');
  }
}

function clearNotifForm() {
  ['notif-title','notif-body','notif-icon'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=id==='notif-icon'?'📢':''; });
  document.getElementById('notif-priority').checked = false;
  document.getElementById('notif-preview-container').innerHTML = '<div style="font-size:12px;color:var(--text3)">Preencha o formulário para ver a prévia.</div>';
}

async function deleteNotif(id) {
  if(!confirm('Remover notificação?')) return;
  try {
    await fbDb.collection('platform_notifications').doc(id).delete();
    showToast('🗑 Notificação removida.','success');
    loadNotifications();
  } catch(e) { showToast('❌ '+e.message,'error'); }
}

/* ══ Settings ══ */
