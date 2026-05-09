function openQuickSwitch() {
  if(document.getElementById('quick-switch-overlay')) {
    document.getElementById('quick-switch-overlay').remove();
    return;
  }
  const panels = [
    {id:'dashboard',     label:'Dashboard',          icon:'📊'},
    {id:'analytics',     label:'Analytics',           icon:'📈'},
    {id:'users',         label:'Usuários',            icon:'👥'},
    {id:'subscriptions', label:'Assinaturas',         icon:'💳'},
    {id:'posts',         label:'Posts & Artigos',     icon:'📰'},
    {id:'notifications', label:'Notificações',        icon:'🔔'},
    {id:'push',          label:'Push Notifications',  icon:'📲'},
    {id:'modules',       label:'Módulos',             icon:'🧩'},
    {id:'settings',      label:'Configurações',       icon:'⚙️'},
    {id:'logs',          label:'Logs de Acesso',      icon:'📋'},
  ];
  const overlay = document.createElement('div');
  overlay.id = 'quick-switch-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:300;display:flex;align-items:flex-start;justify-content:center;padding-top:15vh;backdrop-filter:blur(4px)';
  overlay.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:500px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6);margin:0 1rem">
      <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
        <span style="color:var(--text3);font-size:14px">🔍</span>
        <input id="qs-input" type="text" placeholder="Navegar para... (Ctrl+K)" autofocus
          style="flex:1;background:transparent;border:none;outline:none;font-size:14px;color:var(--text);font-family:var(--font-body)"
          oninput="filterQuickSwitch(this.value)"
          onkeydown="quickSwitchKey(event)">
        <span style="font-size:10px;color:var(--text3);font-family:monospace">ESC fechar</span>
      </div>
      <div id="qs-list" style="max-height:360px;overflow-y:auto;padding:.5rem">
        ${panels.map((p,i)=>`
        <div class="qs-item" data-panel="${p.id}" onclick="switchPanel('${p.id}');document.getElementById('quick-switch-overlay').remove()"
          style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;cursor:pointer;transition:background .1s;${i===0?'background:var(--bg4)':''}"
          onmouseover="document.querySelectorAll('.qs-item').forEach(x=>x.style.background='');this.style.background='var(--bg4)'"
          onmouseout="this.style.background=''">
          <span style="font-size:18px;width:24px;text-align:center">${p.icon}</span>
          <span style="font-size:13px;font-weight:600;color:var(--text)">${p.label}</span>
        </div>`).join('')}
      </div>
      <div style="padding:.75rem 1.25rem;border-top:1px solid var(--border);font-size:10px;color:var(--text3);display:flex;gap:1.5rem;font-family:monospace">
        <span>↑↓ navegar</span><span>Enter selecionar</span><span>Ctrl+R atualizar</span>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  setTimeout(()=>document.getElementById('qs-input')?.focus(), 50);
}

function filterQuickSwitch(q) {
  const items = document.querySelectorAll('.qs-item');
  items.forEach(item => {
    const label = item.querySelector('span:last-child')?.textContent?.toLowerCase()||'';
    item.style.display = label.includes(q.toLowerCase()) ? '' : 'none';
  });
}

function quickSwitchKey(e) {
  const visible = [...document.querySelectorAll('.qs-item')].filter(x=>x.style.display!=='none');
  const active  = visible.findIndex(x=>x.style.background.includes('bg4')||x.style.background.includes('(20'));
  if(e.key==='ArrowDown') { e.preventDefault(); const next=visible[Math.min(active+1,visible.length-1)]; visible.forEach(x=>x.style.background=''); if(next)next.style.background='var(--bg4)'; }
  if(e.key==='ArrowUp')   { e.preventDefault(); const prev=visible[Math.max(active-1,0)];           visible.forEach(x=>x.style.background=''); if(prev)prev.style.background='var(--bg4)'; }
  if(e.key==='Enter')     { const sel=visible.find(x=>x.style.background.includes('bg4')||x.style.background.includes('(20')); if(sel){sel.click();} }
}

/* ══ Responsive mobile ══ */
if(window.innerWidth < 768) {
  document.getElementById('mobile-menu').style.display = 'flex';
}
</script>

<script>

/* ══════════════════════════════════════════════════════════
   AUTO-REFRESH + REFRESH BUTTON
   ══════════════════════════════════════════════════════════ */
let _autoRefreshTimer = null;
const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutos

function refreshDashboard() {
  const btn = document.getElementById('refresh-btn');
  if(btn) { btn.textContent = '↻'; btn.style.color = 'var(--green)'; btn.disabled = true; }
  loadDashboard().finally(() => {
    updateLastRefresh();
    if(btn) { btn.textContent = '↻'; btn.style.color = ''; btn.disabled = false; }
  });
}

function updateLastRefresh() {
  const el = document.getElementById('last-refresh-label');
  if(el) el.textContent = 'Atualizado: ' + new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
}

function startAutoRefresh() {
  if(_autoRefreshTimer) clearInterval(_autoRefreshTimer);
  _autoRefreshTimer = setInterval(() => {
    // Only refresh if on dashboard or analytics panel
    const active = document.querySelector('.panel.active')?.id;
    if(active === 'panel-dashboard' || active === 'panel-analytics') {
      loadDashboard();
      updateLastRefresh();
    }
  }, AUTO_REFRESH_MS);
}

// Start auto-refresh when admin logs in
const __origEnterAdmin = window.enterAdmin;
if(typeof enterAdmin === 'function') {
  const __orig = enterAdmin;
  window.enterAdmin = function() {
    __orig.apply(this, arguments);
    startAutoRefresh();
  };
}



/* ══════════════════════════════════════════════════════════════
   RICH EDITOR — FUNCTIONS
   ══════════════════════════════════════════════════════════════ */

/* ── Image preview in post modal ── */
function updateImagePreview() {
  const url   = document.getElementById('pm-image')?.value.trim();
  const prev  = document.getElementById('pm-image-preview');
  const thumb = document.getElementById('pm-image-thumb');
  if(url && prev && thumb) {
    thumb.src = url;
    thumb.onerror = () => { prev.style.display='none'; };
    thumb.onload  = () => { prev.style.display='block'; };
  } else if(prev) {
    prev.style.display = 'none';
  }
}

/* ── Core command ── */
function edCmd(cmd, val=null) {
  const ed = document.getElementById('pm-content-editor');
  if(!ed) return;
  ed.focus();
  document.execCommand(cmd, false, val);
  updateEditorWordCount();
  updateToolbarState();
}

/* ── Insert inline code ── */
function edInsertCode() {
  const sel = window.getSelection();
  const text = sel?.toString() || 'código';
  document.execCommand('insertHTML', false, `<code>${text}</code>`);
}

/* ── Insert code block ── */
function edInsertCodeBlock() {
  document.execCommand('insertHTML', false,
    '<pre><code>// cole seu código aqui\n</code></pre><p></p>'
  );
}

/* ── Insert link ── */
function edInsertLink() {
  const sel = window.getSelection()?.toString();
  const url = prompt('URL do link:', 'https://');
  if(!url) return;
  const text = sel || prompt('Texto do link:', url) || url;
  document.execCommand('insertHTML', false,
    `<a href="${url}" target="_blank" rel="noopener">${text}</a>`
  );
}

/* ── Insert image ── */
function edInsertImage() {
  const url = prompt('URL da imagem:', 'https://');
  if(!url) return;
  const alt = prompt('Descrição da imagem (alt):', '') || '';
  document.execCommand('insertHTML', false,
    `<img src="${url}" alt="${alt}" style="max-width:100%;border-radius:8px;margin:.5em 0">`
  );
}

/* ── Keyboard shortcuts ── */
function editorKeydown(e) {
  if(e.ctrlKey || e.metaKey) {
    switch(e.key.toLowerCase()) {
      case 'b': e.preventDefault(); edCmd('bold'); break;
      case 'i': e.preventDefault(); edCmd('italic'); break;
      case 'u': e.preventDefault(); edCmd('underline'); break;
      case 'k': e.preventDefault(); edInsertLink(); break;
    }
  }
  // Tab inserts spaces instead of changing focus
  if(e.key === 'Tab') {
    e.preventDefault();
    document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
  }
}

/* ── Word count ── */
function updateEditorWordCount() {
  const ed = document.getElementById('pm-content-editor');
  if(!ed) return;
  const text  = ed.innerText || '';
  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.replace(/\s/g,'').length;
  const wEl = document.getElementById('pm-wordcount');
  const cEl = document.getElementById('pm-charcount');
  if(wEl) wEl.textContent = `${words} palavra${words!==1?'s':''}`;
  if(cEl) cEl.textContent = `${chars} caractere${chars!==1?'s':''}`;
  // Estimated read time
  const mins = Math.max(1, Math.ceil(words / 200));
  const rt = document.getElementById('pm-readtime');
  if(rt && !rt._manualEdit) rt.value = `${mins} min`;
  rt?.addEventListener('input', ()=>rt._manualEdit=true, {once:true});
}

/* ── Toolbar state (highlight active buttons) ── */
function updateToolbarState() {
  const cmds = ['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList'];
  cmds.forEach(cmd => {
    const btns = document.querySelectorAll(`[onclick="edCmd('${cmd}')"]`);
    btns.forEach(btn => {
      try { btn.classList.toggle('active', document.queryCommandState(cmd)); } catch(e) {}
    });
  });
}

/* ── Tab switching ── */
function switchEditorTab(tab) {
  const editor  = document.getElementById('pm-content-editor');
  const preview = document.getElementById('pm-content-preview');
  const toolbar = document.getElementById('pm-toolbar');
  const tabEd   = document.getElementById('tab-editor');
  const tabPr   = document.getElementById('tab-preview');
  if(!editor||!preview) return;
  if(tab === 'preview') {
    preview.innerHTML = editor.innerHTML || '<p style="color:var(--text3)">Sem conteúdo ainda.</p>';
    preview.classList.add('visible');
    editor.style.display = 'none';
    if(toolbar) toolbar.style.display = 'none';
    tabEd?.classList.remove('active');
    tabPr?.classList.add('active');
  } else {
    preview.classList.remove('visible');
    editor.style.display = '';
    if(toolbar) toolbar.style.display = '';
    tabEd?.classList.add('active');
    tabPr?.classList.remove('active');
    editor.focus();
  }
}

/* ── Toggle HTML raw mode ── */
function togglePostHTML() {
  const editor  = document.getElementById('pm-content-editor');
  const rawArea = document.getElementById('pm-html-raw');
  const toolbar = document.getElementById('pm-toolbar');
  const btn     = document.getElementById('pm-html-btn');
  if(!editor||!rawArea) return;
  const isHtml = rawArea.style.display !== 'none';
  if(isHtml) {
    // HTML → visual: apply raw HTML back to editor
    editor.innerHTML = rawArea.value;
    rawArea.style.display = 'none';
    editor.style.display = '';
    if(toolbar) toolbar.style.opacity = '1';
    if(btn) { btn.style.background=''; btn.style.color=''; }
    updateEditorWordCount();
  } else {
    // Visual → HTML
    rawArea.value = editor.innerHTML;
    rawArea.style.display = '';
    editor.style.display = 'none';
    if(toolbar) toolbar.style.opacity = '0.4';
    if(btn) { btn.style.background='var(--amber-bg)'; btn.style.color='var(--amber-text)'; }
    rawArea.focus();
  }
}

/* ── Update toolbar on editor focus/selection change ── */
document.addEventListener('selectionchange', () => {
  if(document.getElementById('pm-content-editor')) updateToolbarState();
});



/* ══════════════════════════════════════════════════════════════
   GERENCIADOR DE MÓDULOS — ADMIN
   ══════════════════════════════════════════════════════════════ */

/* Lista completa de módulos (espelho do ALL_MODULES do app.html) */
const PLATFORM_MODULES = [
  { id:'home',          label:'Home / Notícias',     desc:'Revista financeira, market tickers e artigos',    icon:'📰', group:'Principal',   core:false },
  { id:'dashboard',     label:'Dashboard',            desc:'Painel de patrimônio e resumo de posições',       icon:'⬡',  group:'Principal',   core:true  },
  { id:'positions',     label:'Pool de Liquidez',     desc:'Gestão de pools de liquidez DeFi',                icon:'🌊', group:'DeFi',        core:false },
  { id:'copytrading',   label:'Copy Trading',         desc:'Acompanhamento de contas e sinais',               icon:'📡', group:'Forex & Stocks', core:false },
  { id:'options',       label:'Opções',               desc:'Operações de opções de ações e cripto',           icon:'◎',  group:'Forex & Stocks', core:false },
  { id:'wallet',        label:'Carteira',             desc:'Gestão de ativos: cripto, ações e ETFs',          icon:'💼', group:'Gestão',      core:false },
  { id:'finance',       label:'Finanças / ERP',       desc:'Controle de receitas, despesas e fluxo de caixa', icon:'💵', group:'Contábil',    core:false },
  { id:'dp',            label:'Depto. Pessoal',       desc:'Gestão de funcionários e folha de pagamento',     icon:'👥', group:'Contábil',    core:false },
  { id:'p2p',           label:'P2P Cripto',           desc:'Mercado peer-to-peer com escrow automático',      icon:'🔄', group:'DeFi',        core:false },
  { id:'imovelvendas',  label:'Imóveis — Vendas',     desc:'Gestão de vendas e captações imobiliárias',       icon:'🏠', group:'Imóveis',     core:false },
  { id:'imovellocation',label:'Imóveis — Locação',    desc:'Gestão de contratos de locação',                  icon:'🔑', group:'Imóveis',     core:false },
  { id:'consorcios',    label:'Consórcios',           desc:'Gestão de grupos e parcelas de consórcio',        icon:'🏦', group:'Consórcios',  core:false },
  { id:'comunidade',    label:'Comunidade',           desc:'Feed social e interações entre usuários',         icon:'💬', group:'Principal',   core:false },
  { id:'relatoriosbr',  label:'Relatórios BR',        desc:'Relatórios fiscais e contábeis brasileiros',      icon:'📊', group:'Contábil',    core:false },
];

// In-memory state of toggles
let _moduleState = {};

async function loadModules() {
  const grid = document.getElementById('modules-grid');
  if(!grid) return;
  grid.innerHTML = `<div class="loading"><div class="spinner"></div> Carregando...</div>`;

  // Load current state from Firestore
  try {
    const doc = await fbDb.collection('platform').doc('modules').get();
    const saved = doc.exists ? (doc.data() || {}) : {};
    // Default: all enabled
    PLATFORM_MODULES.forEach(m => {
      _moduleState[m.id] = saved[m.id] !== undefined ? saved[m.id] : true;
    });
  } catch(e) {
    PLATFORM_MODULES.forEach(m => { _moduleState[m.id] = true; });
  }

  renderModulesGrid();
}

function renderModulesGrid() {
  const grid = document.getElementById('modules-grid');
  if(!grid) return;

  // Group modules
  const groups = {};
  PLATFORM_MODULES.forEach(m => {
    if(!groups[m.group]) groups[m.group] = [];
    groups[m.group].push(m);
  });

  const groupColors = {
    'Principal':       'var(--blue)',
    'DeFi':            'var(--green)',
    'Forex & Stocks':  'var(--amber)',
    'Gestão':          '#a78bfa',
    'Contábil':        '#f472b6',
    'Imóveis':         '#34d399',
    'Consórcios':      '#60a5fa',
  };

  let html = '';
  Object.entries(groups).forEach(([groupName, mods]) => {
    const color = groupColors[groupName] || 'var(--blue)';
    html += `
    <div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;margin-top:.75rem;margin-bottom:2px">
      <div style="width:3px;height:14px;border-radius:99px;background:${color}"></div>
      <span style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.12em;font-family:var(--font-mono)">${groupName}</span>
    </div>`;

    mods.forEach(m => {
      const enabled   = _moduleState[m.id] !== false;
      const isCore    = m.core;
      const statusColor = enabled ? 'var(--green)' : 'var(--red)';
      html += `
      <div class="card" id="mod-card-${m.id}" style="padding:1rem;border-color:${enabled?'var(--border)':'rgba(255,71,87,.2)'};transition:all .2s;position:relative;overflow:hidden">
        ${!enabled ? `<div style="position:absolute;top:0;left:0;right:0;height:2px;background:var(--red)"></div>` : ''}
        ${enabled  ? `<div style="position:absolute;top:0;left:0;right:0;height:2px;background:var(--green)"></div>` : ''}
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:40px;height:40px;border-radius:10px;background:${enabled?'var(--bg4)':'var(--red-bg)'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;transition:background .2s">
            ${m.icon}
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <span style="font-size:13px;font-weight:700;color:${enabled?'var(--text)':'var(--text3)'}">${m.label}</span>
              ${isCore ? `<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:99px;background:var(--blue-bg);color:var(--blue-text);border:1px solid rgba(99,142,255,.2);font-family:var(--font-mono)">CORE</span>` : ''}
              <span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:99px;border:1px solid ${statusColor};color:${statusColor};font-family:var(--font-mono);margin-left:auto">${enabled?'ATIVO':'INATIVO'}</span>
            </div>
            <div style="font-size:11px;color:var(--text3);line-height:1.4">${m.desc}</div>
          </div>
          <!-- Toggle -->
          <div style="flex-shrink:0">
            ${isCore
              ? `<div style="font-size:10px;color:var(--text3);text-align:center;font-family:var(--font-mono)">🔒<br>Core</div>`
              : `<label class="toggle" style="cursor:pointer" title="${enabled?'Clique para desativar':'Clique para ativar'}">
                  <input type="checkbox" id="mod-toggle-${m.id}" ${enabled?'checked':''} onchange="toggleModule('${m.id}',this.checked)" style="display:none">
                  <div class="toggle-track ${enabled?'on':''}" id="mod-track-${m.id}" onclick="document.getElementById('mod-toggle-${m.id}').click()">
                    <div class="toggle-thumb"></div>
                  </div>
                </label>`
            }
          </div>
        </div>
        ${!enabled && !isCore ? `
        <div style="margin-top:.75rem;padding:.5rem .75rem;background:var(--red-bg);border-radius:6px;border:1px solid rgba(255,71,87,.15)">
          <span style="font-size:11px;color:var(--red-text)">⛔ Este módulo está desativado — invisível para todos os usuários</span>
        </div>` : ''}
      </div>`;
    });
  });

  grid.innerHTML = html;
}

function toggleModule(id, enabled) {
  if(PLATFORM_MODULES.find(m=>m.id===id)?.core) return; // Can't toggle core
  _moduleState[id] = enabled;

  // Update card visual immediately
  const card  = document.getElementById(`mod-card-${id}`);
  const track = document.getElementById(`mod-track-${id}`);
  if(track) { enabled ? track.classList.add('on') : track.classList.remove('on'); }

  // Re-render just this card
  renderModulesGrid();

  showToast(
    enabled ? `✅ "${PLATFORM_MODULES.find(m=>m.id===id)?.label}" ativado — lembre de salvar.`
            : `⛔ "${PLATFORM_MODULES.find(m=>m.id===id)?.label}" desativado — lembre de salvar.`,
    enabled ? 'success' : 'warn'
  );
}

function setAllModules(enabled) {
  PLATFORM_MODULES.forEach(m => {
    if(!m.core) _moduleState[m.id] = enabled;
  });
  renderModulesGrid();
  showToast(enabled ? '✅ Todos os módulos ativados.' : '⛔ Todos os módulos desativados.', enabled?'success':'warn');
}

async function saveModules() {
  const btn = document.querySelector('[onclick="saveModules()"]');
  if(btn) { btn.textContent = 'Salvando...'; btn.disabled = true; }
  try {
    // Save to Firestore platform/modules
    const data = {};
    PLATFORM_MODULES.forEach(m => { data[m.id] = m.core ? true : (_moduleState[m.id] !== false); });
    data.updatedAt  = firebase.firestore.FieldValue.serverTimestamp();
    data.updatedBy  = adminUser?.email || 'admin';

    await fbDb.collection('platform').doc('modules').set(data, { merge: true });

    addLog('modules_save', `Salvou configuração de módulos: ${Object.entries(data).filter(([k,v])=>k!=='updatedAt'&&k!=='updatedBy'&&!v).map(([k])=>k).join(', ')||'todos ativos'}`);
    showToast('💾 Módulos salvos! Alterações ativas imediatamente.', 'success');
    renderModulesGrid();
  } catch(e) {
    showToast('❌ Erro ao salvar: ' + e.message, 'error');
  } finally {
    if(btn) { btn.textContent = '💾 Salvar e publicar alterações'; btn.disabled = false; }
  }
}



/* ══════════════════════════════════════════════════════════════
   PUSH NOTIFICATIONS — ADMIN PANEL
   ══════════════════════════════════════════════════════════════ */

async function loadPushPanel() {
  // Count users with FCM tokens
  try {
    const snap = await fbDb.collection('users').where('pushEnabled','==',true).get();
    const tokenUsers = snap.docs.map(d=>({id:d.id,...d.data()}));
    const total = tokenUsers.length;

    document.getElementById('nav-push-count').textContent = total;

    // Reach stats by segment
    const pro   = tokenUsers.filter(u=>u.plan==='pro'||u.plan==='Pro').length;
    const trial = tokenUsers.filter(u=>u.plan==='trial').length;
    const free  = total - pro - trial;

    const reachEl = document.getElementById('push-reach-stats');
    if(reachEl) reachEl.innerHTML = [
      { label:'Total com push ativo', value: total,  color:'var(--blue)',  icon:'📲' },
      { label:'Pro',                  value: pro,    color:'var(--green)', icon:'⭐' },
      { label:'Trial',                value: trial,  color:'var(--amber)', icon:'⏱' },
      { label:'Free',                 value: free,   color:'var(--text2)', icon:'🆓' },
    ].map(s=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:8px;font-size:12px">
        <span>${s.icon}</span><span style="color:var(--text2)">${s.label}</span>
      </div>
      <span style="font-size:14px;font-weight:700;color:${s.color};font-family:monospace">${s.value}</span>
    </div>`).join('');

  } catch(e) {
    const reachEl = document.getElementById('push-reach-stats');
    if(reachEl) reachEl.innerHTML = `<div style="font-size:12px;color:var(--text2)">Sem usuários com push ativo ainda.</div>`;
  }

  // Push history
  try {
    const snap = await fbDb.collection('push_history').orderBy('sentAt','desc').limit(10).get();
    const histEl = document.getElementById('push-history');
    if(!snap.docs.length) {
      histEl.innerHTML = `<div style="font-size:12px;color:var(--text2)">Nenhum push enviado ainda.</div>`;
      return;
    }
    histEl.innerHTML = snap.docs.map(d=>{
      const h = d.data();
      const date = h.sentAt ? new Date(h.sentAt.seconds*1000).toLocaleString('pt-BR') : '—';
      return `
      <div style="padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="font-size:12px;font-weight:600;margin-bottom:2px">${h.title||'—'}</div>
        <div style="display:flex;gap:8px;font-size:10px;color:var(--text3);font-family:monospace">
          <span>📲 ${h.sent||0} enviados</span>
          <span>·</span>
          <span>${h.segment||'all'}</span>
          <span>·</span>
          <span>${date}</span>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    document.getElementById('push-history').innerHTML = `<div style="font-size:12px;color:var(--text2)">Sem histórico.</div>`;
  }
}

function updatePushPreview() {
  const title  = document.getElementById('push-title')?.value || 'Título da notificação';
  const body   = document.getElementById('push-body')?.value  || 'Corpo da mensagem aparece aqui...';
  const icon   = document.getElementById('push-icon')?.value  || '🔔';
  const module = document.getElementById('push-module')?.value;
  const tCount = document.getElementById('push-title-count');
  const bCount = document.getElementById('push-body-count');

  if(tCount) tCount.textContent = `${title.length}/65`;
  if(bCount) bCount.textContent = `${(document.getElementById('push-body')?.value||'').length}/180`;

  document.getElementById('push-prev-title').textContent = title;
  document.getElementById('push-prev-body').textContent  = body;
  document.getElementById('push-prev-icon').textContent  = icon;

  const modInfo = document.getElementById('push-prev-module-info');
  if(modInfo) modInfo.textContent = module
    ? `→ Abrirá o módulo: ${module}`
    : '→ Abrirá o app na tela inicial';
}

async function sendPushNotification() {
  const title   = document.getElementById('push-title')?.value.trim();
  const body    = document.getElementById('push-body')?.value.trim();
  if(!title||!body) { showToast('Título e mensagem são obrigatórios.','warn'); return; }

  const icon    = document.getElementById('push-icon')?.value.trim() || '🔔';
  const module  = document.getElementById('push-module')?.value || '';
  const segment = document.getElementById('push-segment')?.value || 'all';
  const persist = document.getElementById('push-persist')?.checked || false;

  const btn = document.querySelector('[onclick="sendPushNotification()"]');
  if(btn) { btn.textContent='Enviando...'; btn.disabled=true; }

  try {
    // Save push job to Firestore — Cloud Function picks it up and sends via FCM Admin SDK
    const pushData = {
      title, body, icon, module, segment,
      requireInteraction: persist,
      url:       'https://cashflow-ae591.web.app/app.html',
      status:    'pending',
      sentBy:    adminUser?.email || 'admin',
      sentAt:    firebase.firestore.FieldValue.serverTimestamp(),
      sent:      0,
    };

    await fbDb.collection('push_jobs').add(pushData);

    // Also save to history immediately
    await fbDb.collection('push_history').add({...pushData, status:'queued'});

    addLog('push_send', `Enviou push: "${title}" → segmento:${segment}`);
    showToast('📲 Push enfileirado! A Cloud Function enviará em instantes.','success');

    // Clear form
    ['push-title','push-body'].forEach(id => { const el=document.getElementById(id); if(el)el.value=''; });
    document.getElementById('push-icon').value = '🔔';
    updatePushPreview();
    setTimeout(loadPushPanel, 2000);

  } catch(e) {
    showToast('❌ Erro: '+e.message,'error');
  } finally {
    if(btn) { btn.textContent='📲 Enviar Push para Todos'; btn.disabled=false; }
  }
}

</script>
