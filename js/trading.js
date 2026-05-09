async function renderCopyTrading() {
  const panel = document.getElementById('panel-copytrading');
  const estrategias = ctLoadEstrategias();

  let cards = '';
  if(estrategias.length > 0) {
    cards = estrategias.map((est, idx) => `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;position:relative">
        <button onclick="ctDeleteEstrategia(${idx})" title="Remover" style="position:absolute;top:10px;right:10px;background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer;z-index:2">✕</button>
        <h3 style="margin-bottom:4px;font-size:15px;color:var(--text);padding-right:24px">${est.nome || 'Estratégia'}</h3>
        <p style="font-size:11px;color:var(--text3);margin-bottom:12px;word-break:break-all">${est.url}</p>
        <div style="border-radius:8px;overflow:hidden;width:100%">
          <iframe
            src="https://widgets.myfxbook.com/widgets/system.html?id=${est.accountId}&mode=1&lang=2"
            width="100%"
            height="520"
            frameborder="0"
            scrolling="no"
            allowtransparency="true"
            style="display:block;min-height:520px">
          </iframe>
        </div>
        <div style="margin-top:10px">
          <a href="${est.url}" target="_blank" style="font-size:12px;color:var(--accent);text-decoration:none">🔗 Ver no MyFxBook</a>
        </div>
      </div>
    `).join('');
  } else {
    cards = '<div style="text-align:center;color:var(--text3);padding:3rem;grid-column:1/-1">Nenhuma estratégia adicionada</div>';
  }

  // Card com embed do MyFxBook
  const myfxbookCard = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;position:relative">
      <h3 style="margin-bottom:4px;font-size:15px;color:var(--text)">📊 FunBot RB - Copy Trading</h3>
      <p style="font-size:11px;color:var(--text3);margin-bottom:12px">Acompanhe em tempo real</p>
      <div style="border-radius:8px;overflow:hidden;width:100%">
        <a href="https://www.myfxbook.com/members/FunBot/rb-35107532/11910184" target="_blank" rel="noopener">
          <img alt="widget" src="https://widget.myfxbook.com/widget/widget.png?accountOid=11910184&type=6" style="width:100%;display:block"/>
        </a>
      </div>
      <div style="margin-top:10px">
        <a href="https://www.myfxbook.com/members/FunBot/rb-35107532/11910184" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent);text-decoration:none">🔗 Ver no MyFxBook</a>
      </div>
    </div>
  `;

  panel.innerHTML = `
    <div class="panel-header">
      <h2>📊 Estratégias / Contas</h2>
      <p style="color:var(--text2);font-size:13px">Mural de estratégias do MyFxBook</p>
    </div>
    <div class="panel-content">
      <button class="btn btn-primary" onclick="ctOpenAddModal()" style="margin-bottom:1.5rem">
        ➕ Adicionar Estratégia
      </button>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(460px,1fr));gap:1.5rem">
        ${myfxbookCard}
        ${cards}
      </div>
    </div>
  `;
}

function ctLoadEstrategias() {
  const stored = stGet(session.user.uid + '_estrategias') || [];
  return Array.isArray(stored) ? stored : [];
}

function ctSaveEstrategias(estrategias) {
  stSet(session.user.uid + '_estrategias', estrategias);
}

function ctOpenAddModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:500px">
      <h3 style="margin-bottom:1.5rem">➕ Adicionar Estratégia</h3>

      <div class="field" style="margin-bottom:1rem">
        <label>Nome da Estratégia</label>
        <input id="ct-nome" type="text" placeholder="Ex: FunBot RB" style="width:100%">
      </div>

      <div class="field" style="margin-bottom:1.5rem">
        <label>URL do MyFxBook</label>
        <input id="ct-url" type="text" placeholder="https://www.myfxbook.com/members/..." style="width:100%">
        <div style="font-size:11px;color:var(--text3);margin-top:4px">Ex: https://www.myfxbook.com/members/FunBot/rb-35107532/11910184</div>
      </div>

      <div style="display:flex;gap:10px">
        <button class="btn btn-primary" onclick="ctAddEstrategia()" style="flex:1">Adicionar</button>
        <button class="btn" onclick="document.querySelector('.modal-overlay').remove()" style="flex:1">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('ct-nome').focus();
}

async function ctAddEstrategia() {
  const nome = document.getElementById('ct-nome').value.trim();
  const url  = document.getElementById('ct-url').value.trim();

  if(!nome || !url) { showToast('Preencha nome e URL'); return; }
  if(!url.includes('myfxbook.com')) { showToast('URL deve ser do MyFxBook'); return; }

  // Extrair accountId — sempre o ÚLTIMO número da URL
  let accountId = null;
  let m;
  // Formato padrão: /members/username/account-name/ID
  m = url.match(/\/members\/[^\/]+\/[^\/]+\/(\d+)/);
  if(m) accountId = m[1];
  // Fallback: último número da URL
  if(!accountId) {
    const nums = url.match(/(\d+)/g);
    if(nums && nums.length > 0) accountId = nums[nums.length - 1];
  }

  if(!accountId) {
    showToast('Não encontrei o ID da conta na URL');
    return;
  }

  const estrategias = ctLoadEstrategias();
  estrategias.push({ nome, url, accountId });
  ctSaveEstrategias(estrategias);

  document.querySelector('.modal-overlay').remove();
  showToast('✓ Estratégia adicionada!');
  renderCopyTrading();
}

function ctDeleteEstrategia(index) {
  if(!confirm('Remover esta estratégia?')) return;
  const estrategias = ctLoadEstrategias();
  estrategias.splice(index, 1);
  ctSaveEstrategias(estrategias);
  showToast('✓ Estratégia removida');
  renderCopyTrading();
}

async function ctFetchPublicStats() {
  // Check cache first (15 min)
  const cached = stGet('ct_cached_'+CT_ACCOUNT_ID);
  if(cached && cached.ts && Date.now()-cached.ts < 900000) {
    Object.assign(CT_STATIC, cached.data);
    return;
  }
  // Try multiple public endpoints
  const tried = [];
  // 1. Myfxbook public JSON endpoint (when account is public)
  try {
    const r = await fetch(
      `https://widgets.myfxbook.com/api/get-public-systems.json?id=${CT_ACCOUNT_ID}`,
      { mode:'cors' }
    );
    if(r.ok) {
      const d = await r.json();
      const sys = Array.isArray(d) ? d[0] : d;
      if(sys && (sys.gain!=null || sys.monthly!=null)) {
        const data = {
          gain: sys.gain, monthly: sys.monthly, weekly: sys.weekly,
          drawdown: sys.maxDrawdown || sys.drawdown,
          profitFactor: sys.profitFactor, totalTrades: sys.trades || sys.totalTrades,
          winRate: sys.wonTrades && sys.trades ? ((sys.wonTrades/sys.trades)*100).toFixed(1) : null,
          name: sys.name || CT_STATIC.name,
          startDate: sys.firstTradeDate || CT_STATIC.startDate,
          lastUpdate: sys.lastUpdate || CT_STATIC.lastUpdate,
        };
        Object.assign(CT_STATIC, data);
        stSet('ct_cached_'+CT_ACCOUNT_ID, { ts:Date.now(), data });
        return;
      }
    }
  } catch(e) { tried.push('public-systems: '+e.message); }

  // 2. Custom widget stats endpoint
  try {
    const r = await fetch(
      `https://widgets.myfxbook.com/widgets/custom.json?id=${CT_ACCOUNT_ID}`,
      { mode:'cors' }
    );
    if(r.ok) {
      const d = await r.json();
      if(d && d.gain != null) {
        const data = {
          gain:d.gain, monthly:d.monthly, drawdown:d.maxDrawdown||d.drawdown,
          profitFactor:d.profitFactor, totalTrades:d.trades,
          startDate:d.firstTradeDate||'—', lastUpdate:d.lastUpdate||'—',
        };
        Object.assign(CT_STATIC, data);
        stSet('ct_cached_'+CT_ACCOUNT_ID, { ts:Date.now(), data });
        return;
      }
    }
  } catch(e) { tried.push('custom-widget: '+e.message); }

  // 3. Manual fallback — show saved manual data if any
  const manual = stGet('ct_manual_'+CT_ACCOUNT_ID);
  if(manual) { Object.assign(CT_STATIC, manual); }
  // No CORS error shown to user — widgets still load via iframe
}

async function ctApiLogin(email, password) {
  // Note: Myfxbook API blocks CORS from browsers.
  // This works only from server-side. Left here for when a backend proxy is added.
  try {
    const r = await fetch(`https://www.myfxbook.com/api/login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
    const d = await r.json();
    if(!d.error) { ctApiSession = d.session; return true; }
  } catch(e) {}
  return false;
}

async function ctFetchLive() {
  if(!ctApiSession) return;
  try {
    const r = await fetch(`https://www.myfxbook.com/api/get-my-accounts.json?session=${ctApiSession}`);
    const d = await r.json();
    if(!d.error && d.accounts) {
      const acc = d.accounts.find(a => String(a.id) === CT_ACCOUNT_ID || String(a.accountId) === CT_ACCOUNT_ID)
                  || d.accounts.find(a => a.name && a.name.toLowerCase().includes('rb'))
                  || d.accounts[0];
      if(acc) {
        ctLiveData = acc;
        const data = {
          gain:acc.gain, drawdown:acc.drawdown, monthly:acc.monthly, weekly:acc.weekly,
          profitFactor:acc.profitFactor, totalTrades:acc.trades,
          winRate:acc.wonTrades&&acc.trades?((acc.wonTrades/acc.trades)*100).toFixed(1):null,
          name:acc.name||CT_STATIC.name, startDate:acc.firstTradeDate||'—', lastUpdate:acc.lastUpdateDate||'—',
        };
        Object.assign(CT_STATIC, data);
        stSet('ct_cached_'+CT_ACCOUNT_ID, { ts:Date.now(), data });
      }
    }
  } catch(e) {}
}

function ctRenderPanel(panel) {
  const d    = CT_STATIC;
  const cfg  = ctConfigLoad();
  const hasApi = !!ctApiSession;

  const fmtPct = v => v!=null ? (v>=0?'+':'')+parseFloat(v).toFixed(2)+'%' : '—';
  const fmtNum = v => v!=null ? parseFloat(v).toFixed(2) : '—';
  const riskClass = { low:'risk-low', med:'risk-med', high:'risk-high' }[d.risk] || 'risk-med';
  const riskLabel = { low:'Baixo', med:'Médio', high:'Alto' }[d.risk] || 'Médio';

  // Build 6 stat cards
  const stats = [
    { lbl:'Ganho total',    val:fmtPct(d.gain),        pos: d.gain>=0,   neg: d.gain<0   },
    { lbl:'Ganho mensal',   val:fmtPct(d.monthly),     pos: d.monthly>=0,neg: d.monthly<0 },
    { lbl:'Ganho semanal',  val:fmtPct(d.weekly),      pos: d.weekly>=0, neg: d.weekly<0  },
    { lbl:'Drawdown máx.',  val:fmtPct(d.drawdown),    pos: false,       neg: true        },
    { lbl:'Profit Factor',  val:fmtNum(d.profitFactor),pos: d.profitFactor>=1, neg:false  },
    { lbl:'Total de trades',val:d.totalTrades!=null?d.totalTrades:'—', pos:false, neg:false },
  ];

  panel.innerHTML = `
  <!-- ── HEADER ── -->
  <div class="ct-header-card">
    <div style="position:relative;z-index:1">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:1rem">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <span class="signal-live"></span>
            <h2 style="font-size:20px;margin:0">${d.name}</h2>
            <span class="${riskClass} risk-badge">${riskLabel} risco</span>
            ${hasApi?'<span style="font-size:10px;background:var(--green-bg);color:var(--green);border:1px solid rgba(57,255,138,.3);padding:2px 8px;border-radius:99px;font-weight:700">API LIVE</span>':'<span style="font-size:10px;background:var(--blue-bg);color:var(--blue-text);border:1px solid rgba(99,142,255,.25);padding:2px 8px;border-radius:99px;font-weight:600">WIDGETS</span>'}
          </div>
          <div style="font-size:13px;color:var(--text2);display:flex;gap:16px;flex-wrap:wrap">
            <span>📊 ${d.tradingStyle}</span>
            <span>💱 ${d.instruments}</span>
            <span>🏦 ${d.broker}</span>
            <span>💵 ${d.currency}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="copy-btn" onclick="openCopyModal()">Copiar esta conta</button>
          <button class="btn btn-sm" onclick="openCtConfigModal()">⚙ Configurar API</button>
          <a href="https://www.myfxbook.com/${CT_ACCOUNT_SLUG}/${CT_ACCOUNT_ID}" target="_blank" class="btn btn-sm">Ver no Myfxbook ↗</a>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text3)">
        Início: <strong style="color:var(--text2)">${d.startDate}</strong> &nbsp;·&nbsp;
        Última atualização: <strong style="color:var(--text2)">${d.lastUpdate}</strong> &nbsp;·&nbsp;
        ID: <code style="color:var(--text3)">${CT_ACCOUNT_ID}</code>
      </div>
    </div>
  </div>

  <!-- ── STATS GRID ── -->
  <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:1rem" id="ct-stats">
    ${stats.map(s=>`<div class="ct-stat">
      <div class="lbl">${s.lbl}</div>
      <div class="val ${s.pos?'pos':s.neg?'neg':''}">${s.val}</div>
    </div>`).join('')}
  </div>

  <!-- ── WIDGETS MYFXBOOK (public embed) ── -->
  <div class="grid2" style="margin-bottom:1rem">
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:.75rem 1rem .5rem;display:flex;align-items:center;justify-content:space-between">
        <div class="sec-label" style="margin-bottom:0">Curva de equidade</div>
        <span style="font-size:10px;color:var(--text3)">via Myfxbook widget</span>
      </div>
      <iframe class="ct-widget-frame" style="height:260px"
        src="https://widgets.myfxbook.com/widgets/system-chart.html?id=${CT_ACCOUNT_ID}&bg=161b27&txtColor=e6edf3&lineColor=39ff8a&fillColor=071a10"
        scrolling="no" frameborder="0">
      </iframe>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:.75rem 1rem .5rem;display:flex;align-items:center;justify-content:space-between">
        <div class="sec-label" style="margin-bottom:0">Ganho mensal</div>
        <span style="font-size:10px;color:var(--text3)">via Myfxbook widget</span>
      </div>
      <iframe class="ct-widget-frame" style="height:260px"
        src="https://widgets.myfxbook.com/widgets/system-monthly-breakdown.html?id=${CT_ACCOUNT_ID}&bg=161b27&txtColor=e6edf3"
        scrolling="no" frameborder="0">
      </iframe>
    </div>
  </div>

  <!-- ── DRAWDOWN + TRADING HOURS ── -->
  <div class="grid2" style="margin-bottom:1rem">
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:.75rem 1rem .5rem">
        <div class="sec-label" style="margin-bottom:0">Análise de drawdown</div>
      </div>
      <iframe class="ct-widget-frame" style="height:220px"
        src="https://widgets.myfxbook.com/widgets/system-drawdown.html?id=${CT_ACCOUNT_ID}&bg=161b27&txtColor=e6edf3"
        scrolling="no" frameborder="0">
      </iframe>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:.75rem 1rem .5rem">
        <div class="sec-label" style="margin-bottom:0">Horários de trading</div>
      </div>
      <iframe class="ct-widget-frame" style="height:220px"
        src="https://widgets.myfxbook.com/widgets/system-trading-hours.html?id=${CT_ACCOUNT_ID}&bg=161b27&txtColor=e6edf3"
        scrolling="no" frameborder="0">
      </iframe>
    </div>
  </div>

  <!-- ── FULL SYSTEM WIDGET ── -->
  <div class="card" style="padding:0;overflow:hidden;margin-bottom:1rem">
    <div style="padding:.75rem 1rem .5rem">
      <div class="sec-label" style="margin-bottom:0">Painel completo</div>
    </div>
    <iframe class="ct-widget-frame" style="height:540px"
      src="https://widgets.myfxbook.com/widgets/system.html?id=${CT_ACCOUNT_ID}&bg=161b27&txtColor=e6edf3"
      scrolling="no" frameborder="0">
    </iframe>
  </div>

  <!-- ── API STATUS / CONFIG HINT ── -->
  <div class="card" style="background:${hasApi?'var(--green-bg)':'var(--bg2)'};border-color:${hasApi?'rgba(57,255,138,.2)':'var(--border)'}">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="font-size:24px">${hasApi?'🔗':'🔒'}</div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:600;color:var(--text)">${hasApi?'API Myfxbook conectada — dados em tempo real':'Conecte sua conta Myfxbook para dados ao vivo'}</div>
        <div style="font-size:13px;color:var(--text2);margin-top:3px">
          ${hasApi
            ? `Sessão ativa · gains, trades e histórico atualizados automaticamente`
            : `Configure suas credenciais para acessar gain, drawdown, trades abertos e histórico via API`}
        </div>
      </div>
      ${hasApi
        ? `<button class="btn btn-sm btn-danger" onclick="ctDisconnect()">Desconectar</button>`
        : `<button class="btn btn-primary btn-sm" onclick="openCtConfigModal()">Conectar agora</button>`}
    </div>
  </div>

  <!-- ── SEGUINDO / COPIANDO ── -->
  <div class="card" id="ct-followers-card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
      <div class="sec-label" style="margin-bottom:0">Minha posição nesta conta</div>
    </div>
    ${ctRenderFollowSection()}
  </div>
  
  <div class="card" style="background: var(--green-bg); border-color: var(--green); margin-top: 2rem;">
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <span style="font-size: 20px; flex-shrink: 0;">💡</span>
      <div>
        <h3 style="color: var(--green); margin-bottom: 8px;">Dicas de Uso - Copy Trading</h3>
        <ul style="list-style: none; padding: 0; margin: 0; color: var(--text2); font-size: 13px; line-height: 1.6;">
          <li>📊 <strong>Análise da Estratégia:</strong> Estude a curva de equidade, drawdown máximo e profit factor antes de copiar.</li>
          <li>⏱️ <strong>Horários de Trading:</strong> Verifique em qual horário a conta opera para sincronizar com seu portfólio.</li>
          <li>💰 <strong>Copiar Conta:</strong> Clique em "Copiar esta conta" para espelhar as operações com capital personalizado.</li>
          <li>📈 <strong>Monitoramento:</strong> Acompanhe seu P&L estimado em tempo real enquanto copia as operações.</li>
          <li>🔗 <strong>Conectar API:</strong> Use API Myfxbook para dados atualizados em tempo real dos trades.</li>
        </ul>
      </div>
    </div>
  </div>`;

  // Adjust widget colors for light theme
  if(document.body.classList.contains('theme-light')) {
    panel.querySelectorAll('iframe').forEach(f=>{
      f.src = f.src
        .replace('bg=161b27','bg=ffffff')
        .replace('txtColor=e6edf3','txtColor=0f172a')
        .replace('fillColor=071a10','fillColor=ecfdf5')
        .replace('lineColor=39ff8a','lineColor=059669');
    });
  }
}

function ctRenderFollowSection() {
  const follows = stGet(session.user.uid+'_ct_follows') || [];
  const thisFollow = follows.find(f=>f.accountId===CT_ACCOUNT_ID);

  if(!thisFollow) {
    return `<div style="text-align:center;padding:1rem 0">
      <div style="font-size:13px;color:var(--text2);margin-bottom:.75rem">Você ainda não está copiando esta conta</div>
      <button class="copy-btn" onclick="openCopyModal()">+ Copiar esta conta</button>
    </div>`;
  }

  const pnl = parseFloat(thisFollow.currentPnl||0);
  return `<div class="grid3">
    <div class="ct-stat"><div class="lbl">Capital alocado</div><div class="val">$${parseFloat(thisFollow.capital||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
    <div class="ct-stat"><div class="lbl">P&L estimado</div><div class="val ${pnl>=0?'pos':'neg'}">${pnl>=0?'+':''}$${Math.abs(pnl).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
    <div class="ct-stat"><div class="lbl">Copiando desde</div><div class="val" style="font-size:15px">${new Date(thisFollow.since).toLocaleDateString('pt-BR')}</div></div>
  </div>
  <div style="margin-top:.75rem;display:flex;gap:8px">
    <button class="btn btn-sm" onclick="openCopyModal(true)">Editar posição</button>
    <button class="btn btn-sm btn-danger" onclick="ctStopCopy()">Parar de copiar</button>
  </div>`;
}

function openCtConfigModal() {
  const cfg = ctConfigLoad();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'ct-config-overlay';
  overlay.innerHTML = `
  <div class="modal" style="max-width:440px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div><h3 style="margin-bottom:2px">Conectar Myfxbook</h3>
      <p class="sub" style="margin-top:0">Suas credenciais ficam salvas localmente</p></div>
      <button class="btn btn-sm" onclick="document.getElementById('ct-config-overlay').remove()">✕</button>
    </div>
    <div style="background:var(--blue-bg);border:1px solid rgba(99,142,255,.2);border-radius:var(--radius);padding:.75rem 1rem;margin-bottom:1rem;font-size:13px;color:var(--blue-text)">
      🔒 As credenciais são usadas apenas para autenticar na API oficial da Myfxbook e nunca são enviadas a terceiros.
    </div>
    <div class="field" style="margin-bottom:12px"><label>E-mail Myfxbook</label>
      <input id="ct-email" type="email" value="${cfg.email||''}" placeholder="seu@email.com"></div>
    <div class="field" style="margin-bottom:16px"><label>Senha Myfxbook</label>
      <input id="ct-pass" type="password" value="${cfg.password||''}" placeholder="••••••••"></div>
    <div id="ct-login-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" id="ct-login-btn" onclick="ctDoLogin()">Conectar</button>
      <button class="btn" onclick="document.getElementById('ct-config-overlay').remove()">Cancelar</button>
    </div>
    <div style="margin-top:.75rem;font-size:12px;color:var(--text3)">
      Não tem conta? <a href="https://www.myfxbook.com/register" target="_blank" style="color:var(--blue)">Criar conta gratuita</a>
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:.75rem 0">
    <div style="font-size:12px;color:var(--text3);margin-bottom:.5rem">Inserir dados manualmente (sem API)</div>
    <div class="grid2" style="margin-bottom:8px">
      <div class="field"><label>Ganho total (%)</label><input type="number" id="ct-m-gain" step="0.01" placeholder="ex: 45.2"></div>
      <div class="field"><label>Ganho mensal (%)</label><input type="number" id="ct-m-monthly" step="0.01" placeholder="ex: 3.5"></div>
      <div class="field"><label>Drawdown máx (%)</label><input type="number" id="ct-m-dd" step="0.01" placeholder="ex: 12.4"></div>
      <div class="field"><label>Total de trades</label><input type="number" id="ct-m-trades" placeholder="ex: 248"></div>
      <div class="field"><label>Profit Factor</label><input type="number" id="ct-m-pf" step="0.01" placeholder="ex: 1.85"></div>
      <div class="field"><label>Data de início</label><input type="date" id="ct-m-start"></div>
    </div>
    <button class="btn btn-sm" onclick="ctSaveManual()" style="width:100%">Salvar dados manuais</button>
  </div>`;
  document.body.appendChild(overlay);
}

async function ctDoLogin() {
  const email = document.getElementById('ct-email').value.trim();
  const pass  = document.getElementById('ct-pass').value;
  const errEl = document.getElementById('ct-login-err');
  const btn   = document.getElementById('ct-login-btn');
  if(!email||!pass){ errEl.textContent='Preencha e-mail e senha.'; errEl.style.display='block'; return; }
  btn.textContent = 'Conectando...'; btn.disabled=true;
  const ok = await ctApiLogin(email, pass);
  if(ok) {
    // Never store third-party passwords in plaintext — hash for identity only
    ctConfigSave({ email, _passMemo: hash(pass+email) });
    document.getElementById('ct-config-overlay').remove();
    showToast('Myfxbook conectado com sucesso!');
    renderCopyTrading();
  } else {
    errEl.textContent = 'Falha na autenticação. Verifique suas credenciais.';
    errEl.style.display='block';
    btn.textContent='Conectar'; btn.disabled=false;
  }
}

function ctSaveManual() {
  const data = {
    gain:      parseFloat(document.getElementById('ct-m-gain')?.value)||null,
    monthly:   parseFloat(document.getElementById('ct-m-monthly')?.value)||null,
    drawdown:  parseFloat(document.getElementById('ct-m-dd')?.value)||null,
    totalTrades: parseInt(document.getElementById('ct-m-trades')?.value)||null,
    profitFactor: parseFloat(document.getElementById('ct-m-pf')?.value)||null,
    startDate: document.getElementById('ct-m-start')?.value||'—',
  };
  Object.assign(CT_STATIC, data);
  stSet('ct_manual_'+CT_ACCOUNT_ID, data);
  // Also cache it
  stSet('ct_cached_'+CT_ACCOUNT_ID, { ts:Date.now(), data });
  document.getElementById('ct-config-overlay')?.remove();
  showToast('Dados salvos!');
  renderCopyTrading();
}

function ctDisconnect() {
  ctApiSession = null; ctLiveData = null;
  ctConfigSave({});
  showToast('Myfxbook desconectado.');
  renderCopyTrading();
}

function openCopyModal(editing=false) {
  const follows = stGet(session.user.uid+'_ct_follows') || [];
  const existing = follows.find(f=>f.accountId===CT_ACCOUNT_ID);
  const overlay = document.createElement('div');
  overlay.className='modal-overlay'; overlay.id='ct-copy-overlay';
  overlay.innerHTML=`
  <div class="modal" style="max-width:460px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div><h3 style="margin-bottom:2px">${editing?'Editar posição':'Copiar conta'}</h3>
      <p class="sub" style="margin-top:0">RB Trading · ID ${CT_ACCOUNT_ID}</p></div>
      <button class="btn btn-sm" onclick="document.getElementById('ct-copy-overlay').remove()">✕</button>
    </div>
    <div style="background:var(--amber-bg);border:1px solid rgba(255,183,77,.2);border-radius:var(--radius);padding:.75rem 1rem;margin-bottom:1rem;font-size:12px;color:var(--amber-text)">
      ⚠ Copy trading envolve risco. Rentabilidade passada não garante resultados futuros.
    </div>
    <div class="grid2" style="margin-bottom:12px">
      <div class="field"><label>Capital a alocar (USD)</label>
        <div class="suf"><input type="number" id="ct-capital" value="${existing?.capital||500}" min="100" step="50"><s>$</s></div></div>
      <div class="field"><label>Risco por trade (%)</label>
        <div class="suf"><input type="number" id="ct-risk-pct" value="${existing?.riskPct||1}" min="0.1" max="10" step="0.1"><s>%</s></div></div>
    </div>
    <div class="field" style="margin-bottom:12px"><label>Modo de cópia</label>
      <select id="ct-mode">
        <option value="proportional" ${(!existing||existing.mode==='proportional')?'selected':''}>Proporcional (% do lote original)</option>
        <option value="fixed"        ${existing?.mode==='fixed'?'selected':''}>Lote fixo</option>
        <option value="equity"       ${existing?.mode==='equity'?'selected':''}>% do patrimônio</option>
      </select>
    </div>
    <div class="field" style="margin-bottom:1rem"><label>Nota / Estratégia</label>
      <input id="ct-note" value="${existing?.note||''}" placeholder="ex: scalp com 1% risco, SL automático"></div>
    <div style="display:flex;gap:8px">
      <button class="copy-btn" onclick="ctSaveCopy()">Salvar posição</button>
      <button class="btn" onclick="document.getElementById('ct-copy-overlay').remove()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function ctSaveCopy() {
  const capital  = parseFloat(document.getElementById('ct-capital').value)||0;
  const riskPct  = parseFloat(document.getElementById('ct-risk-pct').value)||1;
  const mode     = document.getElementById('ct-mode').value;
  const note     = document.getElementById('ct-note').value.trim();
  const follows  = stGet(session.user.uid+'_ct_follows') || [];
  const idx      = follows.findIndex(f=>f.accountId===CT_ACCOUNT_ID);
  const entry    = { accountId:CT_ACCOUNT_ID, accountName:'RB Trading', capital, riskPct, mode, note, since:Date.now(), currentPnl:0 };
  if(idx>=0) follows[idx]=entry; else follows.push(entry);
  stSet(session.user.uid+'_ct_follows', follows);
  document.getElementById('ct-copy-overlay').remove();
  showToast('Posição de copy salva!');
  renderCopyTrading();
}

function ctStopCopy() {
  if(!confirm('Parar de copiar esta conta?')) return;
  const follows = (stGet(session.user.uid+'_ct_follows')||[]).filter(f=>f.accountId!==CT_ACCOUNT_ID);
  stSet(session.user.uid+'_ct_follows', follows);
  showToast('Copy trading encerrado.');
  renderCopyTrading();
}

/* ══════════════════════════════════════════════════════════
   OPTIONS MODULE — Ações & Cripto
   Tipos: Call / Put
   Ativos: Ações (AAPL, PETR4…) / Cripto (BTC, ETH…) / Índice
   Estratégias: Long Call, Long Put, Covered Call, Cash Secured Put,
                Bull Spread, Bear Spread, Straddle, Strangle, Custom
   Armazenamento: uid_opt_ts  →  { key, ts, type:'option', ... }
   ══════════════════════════════════════════════════════════ */

const OPT_KEY = () => session.user.uid + '_opt_';

function optLoad() {
  return stKeys(OPT_KEY()).map(k => stGet(k)).filter(Boolean).sort((a,b)=>b.ts-a.ts);
}

function renderOptions() {
  const panel = document.getElementById('panel-options');
  const opts  = optLoad();

  const totalPremium = opts.reduce((s,o) => {
    const dir = o.direction === 'sell' ? -1 : 1;
    return s + dir * parseFloat(o.premium||0) * parseFloat(o.qty||0) * (parseInt(o.contractSize)||100);
  }, 0);

  const openOpts  = opts.filter(o => o.status === 'open');
  const closedOpts= opts.filter(o => o.status !== 'open');

  panel.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:1rem">
    <div>
      <h2>Opções</h2>
      <p class="sub">${opts.length} posição${opts.length!==1?'s':''} · Ações & Cripto</p>
    </div>
    <button class="btn btn-primary btn-sm" onclick="openNewOptionModal()">+ Nova operação</button>
  </div>

  <!-- Summary cards -->
  <div class="grid4" style="margin-bottom:1rem">
    <div class="ct-stat">
      <div class="lbl">Posições abertas</div>
      <div class="val">${openOpts.length}</div>
    </div>
    <div class="ct-stat">
      <div class="lbl">Prêmio líquido</div>
      <div class="val ${totalPremium>=0?'pos':'neg'}">${totalPremium>=0?'+':''}$${Math.abs(totalPremium).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      <div class="sub">recebido − pago</div>
    </div>
    <div class="ct-stat">
      <div class="lbl">Calls abertas</div>
      <div class="val pos">${openOpts.filter(o=>o.optType==='call').length}</div>
    </div>
    <div class="ct-stat">
      <div class="lbl">Puts abertas</div>
      <div class="val neg">${openOpts.filter(o=>o.optType==='put').length}</div>
    </div>
  </div>

  <!-- Options table -->
  ${opts.length === 0 ? `
  <div class="card"><div class="empty">
    <div style="font-size:32px;margin-bottom:.75rem;opacity:.3">◎</div>
    <div style="font-weight:500;margin-bottom:.5rem">Nenhuma operação registrada</div>
    <div style="margin-bottom:1rem">Registre calls, puts, spreads e outras estratégias</div>
    <button class="btn btn-primary" onclick="openNewOptionModal()">+ Nova operação</button>
  </div></div>` : `

  <!-- Open positions -->
  ${openOpts.length>0?`
  <div class="sec-label" style="margin-bottom:.75rem">Posições abertas (${openOpts.length})</div>
  <div class="card" style="padding:0;margin-bottom:1rem;overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:600px">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          ${['Ativo','Tipo','Dir.','Strike','Prêmio','Qty','Vencimento','P&L Est.',''].map(h=>`<th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${openOpts.map(o => optRow(o)).join('')}
      </tbody>
    </table>
  </div>`:``}

  <!-- Closed positions -->
  ${closedOpts.length>0?`
  <div class="sec-label" style="margin-bottom:.75rem">Histórico (${closedOpts.length})</div>
  <div class="card" style="padding:0;overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:600px">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          ${['Ativo','Tipo','Dir.','Strike','Prêmio','Qty','Encerramento','Resultado',''].map(h=>`<th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${closedOpts.map(o => optRow(o, true)).join('')}
      </tbody>
    </table>
  </div>`:``}

  `}

  <!-- Options glossary -->
  <div class="card" style="margin-top:1rem;background:var(--bg2)">
    <div class="sec-label">Guia rápido de opções</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
      ${[
        ['Call (Compra)','Direito de comprar o ativo pelo strike na data de vencimento'],
        ['Put (Venda)','Direito de vender o ativo pelo strike na data de vencimento'],
        ['Strike','Preço de exercício da opção'],
        ['Prêmio','Valor pago/recebido pela opção'],
        ['Vencimento','Data limite de exercício'],
        ['Coberta (Covered)','Call vendida sobre ativo que já possui em carteira'],
        ['Delta','Sensibilidade do prêmio à variação do ativo subjacente'],
        ['Theta','Decaimento do valor da opção com o tempo'],
      ].map(([t,d])=>`<div style="padding:8px 10px;background:var(--bg);border-radius:var(--radius);border:1px solid var(--border)">
        <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:3px">${t}</div>
        <div style="font-size:11px;color:var(--text3);line-height:1.4">${d}</div>
      </div>`).join('')}
    </div>
  </div>
  
  <div class="card" style="background: var(--info-bg); border-color: var(--blue); margin-top: 2rem;">
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <span style="font-size: 20px; flex-shrink: 0;">💡</span>
      <div>
        <h3 style="color: var(--info-text); margin-bottom: 8px;">Dicas de Uso - Opções</h3>
        <ul style="list-style: none; padding: 0; margin: 0; color: var(--text2); font-size: 13px; line-height: 1.6;">
          <li>➕ <strong>Nova Operação:</strong> Registre calls, puts, spreads e outras estratégias de opções em ações e cripto.</li>
          <li>📊 <strong>Monitoramento:</strong> Acompanhe posições abertas e fechadas com P&L estimado e realizado.</li>
          <li>⚡ <strong>Estratégias:</strong> Use covered calls para gerar renda passiva ou puts para proteção de portfólio.</li>
          <li>📈 <strong>Análise de Gregas:</strong> Compreenda Delta (exposição), Theta (decaimento), Vega (volatilidade) e Gamma.</li>
          <li>🗂️ <strong>Histórico:</strong> Guarde registro de todas as operações para análise de desempenho.</li>
        </ul>
      </div>
    </div>
  </div>`;
  
  // Adicionar ao painel
  const panel2 = document.getElementById('panel-options');
  setTimeout(() => {
    const existing = panel2.querySelector('[style*="margin-top:1rem;background:var(--bg2)"]')?.parentElement;
    if(existing) existing.innerHTML += '';
  }, 50);
}

function optRow(o, closed=false) {
  const dir    = o.direction === 'sell' ? 'VENDA' : 'COMPRA';
  const dirClr = o.direction === 'sell' ? 'var(--red)' : 'var(--green)';
  const typeClr= o.optType   === 'call' ? 'var(--green)' : 'var(--red)';
  const prem   = parseFloat(o.premium||0);
  const qty    = parseFloat(o.qty||0);
  const csize  = parseInt(o.contractSize)||100;
  const totalPrem = prem * qty * csize;
  const result = closed && o.closePrice!=null
    ? (o.direction==='sell' ? prem - parseFloat(o.closePrice) : parseFloat(o.closePrice) - prem) * qty * csize
    : null;
  const estPnl = !closed && o.currentPrice!=null
    ? (o.direction==='sell' ? prem - parseFloat(o.currentPrice) : parseFloat(o.currentPrice) - prem) * qty * csize
    : null;
  const pnlVal  = closed ? result : estPnl;
  const pnlStr  = pnlVal!=null ? `<span style="color:${pnlVal>=0?'var(--green)':'var(--red)'}">
    ${pnlVal>=0?'+':''}$${Math.abs(pnlVal).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
  </span>` : '—';

  return `<tr style="border-bottom:1px solid var(--border);cursor:pointer" onclick="openOptionDetail('${o.key}')">
    <td style="padding:10px 12px">
      <div style="font-weight:600;color:var(--text)">${o.underlying||'—'}</div>
      <div style="font-size:11px;color:var(--text3)">${o.strategy||''} · ${o.assetClass||''}</div>
    </td>
    <td style="padding:10px 12px"><span style="font-weight:700;color:${typeClr}">${(o.optType||'').toUpperCase()}</span></td>
    <td style="padding:10px 12px"><span style="font-size:11px;font-weight:700;color:${dirClr}">${dir}</span></td>
    <td style="padding:10px 12px">$${parseFloat(o.strike||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
    <td style="padding:10px 12px">$${prem.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
    <td style="padding:10px 12px">${qty} × ${csize}</td>
    <td style="padding:10px 12px;font-size:12px;color:var(--text2)">${o.expiry||'—'}</td>
    <td style="padding:10px 12px">${pnlStr}</td>
    <td style="padding:10px 12px">
      <button class="btn btn-sm" onclick="event.stopPropagation();openOptionDetail('${o.key}')">⋯</button>
    </td>
  </tr>`;
}

function openNewOptionModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'new-opt-overlay';
  overlay.style.cssText = 'overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  overlay.innerHTML = `
  <div class="modal" style="max-width:580px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div><h3 style="margin-bottom:2px">Nova operação de opções</h3>
      <p class="sub" style="margin-top:0">Ações, ETFs, Cripto e Índices</p></div>
      <button class="btn btn-sm" onclick="document.getElementById('new-opt-overlay').remove()">✕</button>
    </div>

    <!-- Asset class tabs -->
    <div style="display:flex;gap:8px;margin-bottom:1rem">
      ${['Ações EUA','Ações B3','Cripto','ETF','Índice'].map((c,i)=>`
      <button class="import-method-btn${i===0?' active':''}" style="flex:none;padding:6px 12px;font-size:12px" id="ac-btn-${i}"
        onclick="selectAssetClass(${i},'${c}')">${c}</button>`).join('')}
    </div>
    <input type="hidden" id="opt-asset-class" value="Ações EUA">

    <div class="grid2" style="margin-bottom:1rem">
      <div class="field">
        <label>Ativo subjacente <span style="color:var(--red)">*</span></label>
        <input id="opt-underlying" placeholder="ex: AAPL, PETR4, BTC">
      </div>
      <div class="field">
        <label>Estratégia</label>
        <select id="opt-strategy">
          <option>Long Call</option><option>Long Put</option>
          <option>Covered Call</option><option>Cash Secured Put</option>
          <option>Bull Call Spread</option><option>Bear Put Spread</option>
          <option>Straddle</option><option>Strangle</option>
          <option>Iron Condor</option><option>Butterfly</option>
          <option>Personalizada</option>
        </select>
      </div>
      <div class="field">
        <label>Tipo <span style="color:var(--red)">*</span></label>
        <select id="opt-type">
          <option value="call">CALL — direito de comprar</option>
          <option value="put">PUT — direito de vender</option>
        </select>
      </div>
      <div class="field">
        <label>Direção <span style="color:var(--red)">*</span></label>
        <select id="opt-direction">
          <option value="buy">Compra (Long)</option>
          <option value="sell">Venda (Short)</option>
        </select>
      </div>
      <div class="field">
        <label>Strike (USD) <span style="color:var(--red)">*</span></label>
        <div class="suf"><input type="number" id="opt-strike" step="0.01" placeholder="ex: 150.00" oninput="calcOptPnl()"><s>$</s></div>
      </div>
      <div class="field">
        <label>Prêmio pago/recebido <span style="color:var(--red)">*</span></label>
        <div class="suf"><input type="number" id="opt-premium" step="0.01" placeholder="ex: 3.50" oninput="calcOptPnl()"><s>$</s></div>
      </div>
      <div class="field">
        <label>Quantidade (contratos)</label>
        <input type="number" id="opt-qty" value="1" min="1" oninput="calcOptPnl()">
      </div>
      <div class="field">
        <label>Tamanho do contrato</label>
        <select id="opt-csize" onchange="calcOptPnl()">
          <option value="100">100 ações (padrão EUA/cripto)</option>
          <option value="1">1 (minicontrato B3)</option>
          <option value="10">10 (B3 / spot cripto)</option>
          <option value="50">50</option>
          <option value="1000">1000</option>
        </select>
      </div>
      <div class="field">
        <label>Data de abertura</label>
        <input type="date" id="opt-open-date">
      </div>
      <div class="field">
        <label>Vencimento <span style="color:var(--red)">*</span></label>
        <input type="date" id="opt-expiry">
      </div>
      <div class="field">
        <label>Delta (opcional)</label>
        <input type="number" id="opt-delta" step="0.01" placeholder="ex: 0.35">
      </div>
      <div class="field">
        <label>IV — Volatilidade implícita (%)</label>
        <input type="number" id="opt-iv" step="0.1" placeholder="ex: 28.5">
      </div>
    </div>

    <div class="field" style="margin-bottom:1rem">
      <label>Notas / Tese da operação</label>
      <textarea id="opt-notes" rows="2" style="width:100%;padding:8px 12px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);resize:vertical;font-family:inherit" placeholder="ex: Venda coberta sobre AAPL aguardando queda de IV pós-earnings"></textarea>
    </div>

    <!-- Live P&L preview -->
    <div id="opt-pnl-preview" style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.875rem 1rem;margin-bottom:1rem;display:none">
      <div class="sec-label" style="margin-bottom:.5rem">Resumo da operação</div>
      <div class="grid2" style="gap:6px">
        <div><span style="font-size:12px;color:var(--text3)">Custo total do prêmio:</span><br><strong id="opt-preview-cost">—</strong></div>
        <div><span style="font-size:12px;color:var(--text3)">Break-even:</span><br><strong id="opt-preview-be">—</strong></div>
        <div><span style="font-size:12px;color:var(--text3)">Lucro máximo:</span><br><strong id="opt-preview-maxp" style="color:var(--green)">—</strong></div>
        <div><span style="font-size:12px;color:var(--text3)">Perda máxima:</span><br><strong id="opt-preview-maxl" style="color:var(--red)">—</strong></div>
      </div>
    </div>

    <div id="opt-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="saveNewOption()">Salvar operação</button>
      <button class="btn" onclick="document.getElementById('new-opt-overlay').remove()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('opt-open-date').value = today;
  // Default expiry = 30 days
  const exp = new Date(); exp.setDate(exp.getDate()+30);
  document.getElementById('opt-expiry').value = exp.toISOString().split('T')[0];
}

function selectAssetClass(idx, cls) {
  document.querySelectorAll('[id^="ac-btn-"]').forEach((b,i)=>b.classList.toggle('active',i===idx));
  document.getElementById('opt-asset-class').value = cls;
  // Adjust contract size default
  const csEl = document.getElementById('opt-csize');
  if(cls==='Ações B3') csEl.value='1';
  else if(cls==='Cripto') csEl.value='1';
  else csEl.value='100';
}

function calcOptPnl() {
  const strike  = parseFloat(document.getElementById('opt-strike')?.value)||0;
  const premium = parseFloat(document.getElementById('opt-premium')?.value)||0;
  const qty     = parseFloat(document.getElementById('opt-qty')?.value)||1;
  const csize   = parseInt(document.getElementById('opt-csize')?.value)||100;
  const type    = document.getElementById('opt-type')?.value||'call';
  const dir     = document.getElementById('opt-direction')?.value||'buy';
  const prev    = document.getElementById('opt-pnl-preview');
  if(!strike||!premium||!prev) return;

  prev.style.display='block';
  const totalCost = premium * qty * csize;
  const isBuy = dir==='buy';
  const isCall= type==='call';

  const maxLoss  = isBuy ? totalCost : null; // null = unlimited
  const maxProfit= isBuy ? null : totalCost; // null = unlimited (call sell)
  const breakeven= isCall
    ? (isBuy ? strike + premium : strike + premium)   // same formula, different risk
    : (isBuy ? strike - premium : strike - premium);

  document.getElementById('opt-preview-cost').textContent = `$${totalCost.toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
  document.getElementById('opt-preview-be').textContent   = `$${breakeven.toFixed(2)}`;
  document.getElementById('opt-preview-maxp').textContent = maxProfit!=null ? `$${maxProfit.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : 'Ilimitado';
  document.getElementById('opt-preview-maxl').textContent = maxLoss!=null   ? `-$${maxLoss.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : 'Ilimitado';
}

function saveNewOption() {
  const underlying = document.getElementById('opt-underlying').value.trim().toUpperCase();
  const strike     = parseFloat(document.getElementById('opt-strike').value)||0;
  const premium    = parseFloat(document.getElementById('opt-premium').value)||0;
  const qty        = parseFloat(document.getElementById('opt-qty').value)||1;
  const errEl      = document.getElementById('opt-err');

  if(!underlying){ errEl.textContent='Preencha o ativo subjacente.'; errEl.style.display='block'; return; }
  if(!strike)    { errEl.textContent='Informe o strike.'; errEl.style.display='block'; return; }
  if(!premium)   { errEl.textContent='Informe o prêmio.'; errEl.style.display='block'; return; }

  const ts  = Date.now();
  const key = session.user.uid + '_opt_' + ts;
  const opt = {
    key, ts, type:'option', status:'open',
    underlying,
    assetClass:  document.getElementById('opt-asset-class').value,
    strategy:    document.getElementById('opt-strategy').value,
    optType:     document.getElementById('opt-type').value,
    direction:   document.getElementById('opt-direction').value,
    strike,
    premium,
    qty,
    contractSize: parseInt(document.getElementById('opt-csize').value)||100,
    openDate:    document.getElementById('opt-open-date').value,
    expiry:      document.getElementById('opt-expiry').value,
    delta:       parseFloat(document.getElementById('opt-delta').value)||null,
    iv:          parseFloat(document.getElementById('opt-iv').value)||null,
    notes:       document.getElementById('opt-notes').value.trim(),
  };
  stSet(key, opt);
  fsPersistKey(key, opt);
  document.getElementById('new-opt-overlay').remove();
  showToast('Operação salva!');
  renderOptions();
}

function openOptionDetail(key) {
  const o = stGet(key);
  if(!o) return;
  const overlay = document.createElement('div');
  overlay.className='modal-overlay'; overlay.id='opt-detail-overlay';
  const prem=parseFloat(o.premium||0), qty=parseFloat(o.qty||0), cs=parseInt(o.contractSize)||100;
  const total=prem*qty*cs;
  const isBuy=o.direction==='buy', isCall=o.optType==='call';
  const be=(isCall?o.strike+prem:o.strike-prem);

  overlay.innerHTML=`
  <div class="modal" style="max-width:480px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div>
        <h3 style="margin-bottom:2px">${o.underlying} ${(o.optType||'').toUpperCase()} $${o.strike}</h3>
        <p class="sub" style="margin-top:0">${o.strategy||''} · ${o.assetClass||''} · Vence ${o.expiry||'—'}</p>
      </div>
      <button class="btn btn-sm" onclick="document.getElementById('opt-detail-overlay').remove()">✕</button>
    </div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="mc"><div class="lbl">Prêmio total</div><div class="val">$${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
      <div class="mc"><div class="lbl">Break-even</div><div class="val">$${parseFloat(be).toFixed(2)}</div></div>
      <div class="mc"><div class="lbl">Delta</div><div class="val">${o.delta!=null?o.delta:'—'}</div></div>
      <div class="mc"><div class="lbl">IV</div><div class="val">${o.iv!=null?o.iv+'%':'—'}</div></div>
    </div>
    ${o.notes?`<div style="font-size:13px;color:var(--text2);padding:.75rem;background:var(--bg);border-radius:var(--radius);margin-bottom:1rem">${o.notes}</div>`:''}
    <div class="field" style="margin-bottom:12px">
      <label>Preço atual do prêmio (para P&L)</label>
      <div class="suf"><input type="number" id="opt-current-price" value="${o.currentPrice||''}" step="0.01" placeholder="ex: 4.20"><s>$</s></div>
    </div>
    <div class="field" style="margin-bottom:1rem">
      <label>Encerrar posição — preço de fechamento</label>
      <div class="suf"><input type="number" id="opt-close-price" value="${o.closePrice||''}" step="0.01" placeholder="ex: 6.50"><s>$</s></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="updateOptionPrice('${key}')">Atualizar preço</button>
      <button class="btn" style="color:var(--green);border-color:var(--green)" onclick="closeOption('${key}')">Encerrar posição</button>
      <button class="btn btn-danger btn-sm" onclick="deleteOption('${key}')">Excluir</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function updateOptionPrice(key) {
  const o = stGet(key); if(!o) return;
  const cp = parseFloat(document.getElementById('opt-current-price')?.value)||null;
  if(cp!=null) { o.currentPrice=cp; stSet(key,o); fsPersistKey(key,o); }
  document.getElementById('opt-detail-overlay')?.remove();
  showToast('Preço atualizado!');
  renderOptions();
}

function closeOption(key) {
  const o = stGet(key); if(!o) return;
  const cp = parseFloat(document.getElementById('opt-close-price')?.value);
  if(!cp){ showToast('Informe o preço de fechamento.'); return; }
  o.closePrice = cp; o.status = 'closed'; o.closeDate = new Date().toISOString().split('T')[0];
  stSet(key, o);
  fsPersistKey(key, o);
  document.getElementById('opt-detail-overlay')?.remove();
  showToast('Posição encerrada!');
  renderOptions();
}

function deleteOption(key) {
  if(!confirm('Excluir esta operação?')) return;
  stDel(key);
  fsDeleteKey(key);
  document.getElementById('opt-detail-overlay')?.remove();
  showToast('Operação excluída.');
  renderOptions();
}

