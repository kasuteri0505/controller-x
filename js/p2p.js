async function renderP2P() {
  const panel = document.getElementById('panel-p2p');
  panel.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:3rem;gap:10px;color:var(--text2)">
    <span class="signal-live"></span> Carregando P2P...
  </div>`;

  await p2pFetchPrices();
  p2pBuildUI(panel);
}

function p2pBuildUI(panel) {
  const uid = session.user.uid;
  const prof = stGet(uid+'_profile') || {};
  const userName = prof.name || session.user.name || 'Você';

  panel.innerHTML = `
  <!-- ── TICKER ───────────────────────────────── -->
  <div class="p2p-ticker" style="margin-bottom:1rem">
    <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;flex-shrink:0">LIVE</div>
    ${Object.entries(P2P_ASSETS).map(([sym,a])=>{
      const pr = p2pPrices[sym];
      const chg = pr?.chg;
      return `<div class="p2p-ticker-item">
        <div style="display:flex;align-items:center;gap:5px">
          <div style="width:18px;height:18px;border-radius:50%;background:${a.bg};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:${a.color}">${a.logo}</div>
          <span style="font-size:12px;font-weight:700;color:var(--text)">${sym}</span>
        </div>
        <span style="font-size:12px;color:var(--text)">$${pr?parseFloat(pr.usd).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—'}</span>
        ${chg!=null?`<span style="font-size:10px;color:${chg>=0?'var(--green)':'var(--red)'}">${chg>=0?'+':''}${chg.toFixed(2)}%</span>`:''}
      </div>`;
    }).join('')}
    <button class="btn btn-sm" style="flex-shrink:0;font-size:11px" onclick="renderP2P()">↻</button>
  </div>

  <!-- ── MAIN TABS ─────────────────────────────── -->
  <div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:1.25rem">
    <button class="p2p-tab-btn ${p2pMainTab==='mercado'?'active':''}"     onclick="p2pSetTab('mercado')">🏪 Mercado P2P</button>
    <button class="p2p-tab-btn ${p2pMainTab==='meus-anuncios'?'active':''}" onclick="p2pSetTab('meus-anuncios')">📢 Meus Anúncios</button>
    <button class="p2p-tab-btn ${p2pMainTab==='operacoes'?'active':''}"   onclick="p2pSetTab('operacoes')">📋 Minhas Operações</button>
  </div>

  <div id="p2p-body"></div>
  
  <div class="card" style="background: var(--blue-bg); border-color: var(--blue); margin-top: 2rem;">
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <span style="font-size: 20px; flex-shrink: 0;">💡</span>
      <div>
        <h3 style="color: var(--blue-text); margin-bottom: 8px;">Dicas de Uso - P2P Trading</h3>
        <ul style="list-style: none; padding: 0; margin: 0; color: var(--text2); font-size: 13px; line-height: 1.6;">
          <li>🏪 <strong>Mercado P2P:</strong> Navegue pelos anúncios de compra e venda, filtrando por ativo, tipo e rede blockchain.</li>
          <li>📢 <strong>Criar Anúncio:</strong> Publique seus próprios anúncios definindo preço, quantidade, rede e método de pagamento.</li>
          <li>⭐ <strong>Reputação:</strong> Verifique as estrelas e número de trades dos vendedores para transações mais seguras.</li>
          <li>💬 <strong>Chat Integrado:</strong> Comunique-se com compradores/vendedores diretamente na plataforma antes de negociar.</li>
          <li>📋 <strong>Histórico:</strong> Acompanhe suas operações finalizadas para análise de desempenho e manutenção do portfólio.</li>
        </ul>
      </div>
    </div>
  </div>`;

  p2pRenderTab();
}

function p2pSetTab(tab) {
  p2pMainTab = tab;
  document.querySelectorAll('.p2p-tab-btn').forEach(b=>{
    b.classList.toggle('active', b.textContent.includes(tab==='mercado'?'Mercado':tab==='meus-anuncios'?'Anúncios':'Operações'));
  });
  p2pRenderTab();
}

function p2pRenderTab() {
  if(p2pMainTab==='mercado')       p2pRenderMercado();
  else if(p2pMainTab==='meus-anuncios') p2pRenderMeusAnuncios();
  else                             p2pRenderOperacoes();
}

/* ═══════════════════════════════════════════════════════
   1. MERCADO P2P
═══════════════════════════════════════════════════════ */
function p2pRenderMercado() {
  const body = document.getElementById('p2p-body');
  // Load market ads — combine own + demo ads for full marketplace feel
  const myAds = p2pAdsLoad(false);
  const demoAds = p2pGetDemoAds();
  const allAds = [...myAds, ...demoAds].filter(a=>a.status==='active');

  // Apply filters
  let ads = allAds;
  if(p2pFilterSide!=='ALL')    ads = ads.filter(a=>a.side===p2pFilterSide);
  if(p2pFilterAsset!=='ALL')   ads = ads.filter(a=>a.asset===p2pFilterAsset);
  if(p2pFilterNetwork!=='ALL') ads = ads.filter(a=>a.network===p2pFilterNetwork);

  body.innerHTML = `
  <!-- Filters -->
  <div class="card" style="padding:1rem;margin-bottom:1rem">
    <!-- Side filter -->
    <div style="display:flex;gap:8px;margin-bottom:.875rem;align-items:center">
      <span style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;flex-shrink:0">Tipo:</span>
      ${[['ALL','Todos'],['buy','Compra'],['sell','Venda']].map(([v,l])=>`
      <button onclick="p2pFilterSide='${v}';p2pRenderMercado()"
        style="padding:5px 14px;border-radius:99px;border:1px solid ${p2pFilterSide===v?v==='buy'?'var(--green)':v==='sell'?'var(--red)':'var(--border2)':'var(--border)'};background:${p2pFilterSide===v?v==='buy'?'var(--green-bg)':v==='sell'?'var(--red-bg)':'var(--bg4)':'transparent'};color:${p2pFilterSide===v?v==='buy'?'var(--green-text)':v==='sell'?'var(--red-text)':'var(--text)':'var(--text2)'};cursor:pointer;font-size:13px;font-weight:${p2pFilterSide===v?'600':'400'};transition:all .15s">
        ${l}</button>`).join('')}
      <button class="btn btn-primary btn-sm" style="margin-left:auto" onclick="p2pOpenCreateAd()">+ Criar anúncio</button>
    </div>
    <!-- Asset filter -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:.75rem;align-items:center">
      <span style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;flex-shrink:0">Ativo:</span>
      <button class="p2p-asset-btn ${p2pFilterAsset==='ALL'?'active':''}" onclick="p2pFilterAsset='ALL';p2pRenderMercado()" style="flex-direction:row;padding:5px 12px;min-width:auto">
        <span style="font-size:12px">Todos</span>
      </button>
      ${Object.entries(P2P_ASSETS).map(([sym,a])=>`
      <button class="p2p-asset-btn ${p2pFilterAsset===sym?'active':''}" onclick="p2pFilterAsset='${sym}';p2pRenderMercado()" style="flex-direction:row;gap:6px;padding:5px 12px;min-width:auto">
        <div style="width:20px;height:20px;border-radius:50%;background:${a.bg};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:${a.color}">${a.logo}</div>
        <span style="font-size:12px;font-weight:600">${sym}</span>
      </button>`).join('')}
    </div>
    <!-- Network filter -->
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <span style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;flex-shrink:0">Rede:</span>
      <button class="p2p-network-btn ${p2pFilterNetwork==='ALL'?'active':''}" onclick="p2pFilterNetwork='ALL';p2pRenderMercado()">Todas</button>
      ${Object.entries(P2P_NETWORKS).map(([id,n])=>`
      <button class="p2p-network-btn ${p2pFilterNetwork===id?'active':''}" onclick="p2pFilterNetwork='${id}';p2pRenderMercado()" style="display:flex;align-items:center;gap:5px">
        <div style="width:8px;height:8px;border-radius:50%;background:${n.color}"></div>${n.name}
      </button>`).join('')}
    </div>
  </div>

  <!-- Ads list -->
  ${ads.length===0?`
  <div class="card"><div class="empty">
    <div style="font-size:36px;margin-bottom:.75rem;opacity:.3">🔍</div>
    <div style="font-weight:600;margin-bottom:.5rem">Nenhum anúncio encontrado</div>
    <div style="margin-bottom:1rem">Tente remover os filtros ou crie seu próprio anúncio</div>
    <button class="btn btn-primary" onclick="p2pOpenCreateAd()">+ Criar anúncio</button>
  </div></div>`:`
  <div style="display:flex;flex-direction:column;gap:10px">
    ${ads.map(ad=>p2pRenderAdCard(ad)).join('')}
  </div>`}`;
}

function p2pRenderAdCard(ad) {
  const asset = P2P_ASSETS[ad.asset] || {};
  const net   = P2P_NETWORKS[ad.network] || {};
  const price = parseFloat(ad.price);
  const mktPrice = p2pPrices[ad.asset]?.usd || 0;
  const premPct  = mktPrice>0 ? ((price-mktPrice)/mktPrice*100) : 0;
  const isMine   = ad.key?.startsWith(session.user.uid);
  const stars    = ad.stars || 4.8;
  const trades   = ad.trades || 47;
  const verified = ad.verified !== false;

  return `<div class="p2p-order-card ${ad.side}" onclick="p2pOpenAdDetail('${ad.key||ad.id}')">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <!-- Left: trader info + asset -->
      <div style="display:flex;align-items:center;gap:12px">
        <div style="position:relative">
          <div style="width:44px;height:44px;border-radius:50%;background:${asset.bg};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:${asset.color};flex-shrink:0">${asset.logo}</div>
          <div style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:${net.color};border:2px solid var(--bg2)"></div>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="font-size:16px;font-weight:700;color:var(--text)">${ad.asset}</span>
            <span class="p2p-badge-${ad.side==='buy'?'buy':'sell'}">${ad.side==='buy'?'COMPRA':'VENDA'}</span>
            <span style="font-size:11px;padding:1px 7px;border-radius:99px;background:var(--bg4);color:var(--text2)">${net.name}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:24px;height:24px;border-radius:50%;background:var(--bg4);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--text2)">${(ad.trader||'?').slice(0,1).toUpperCase()}</div>
            <span style="font-size:13px;font-weight:600;color:var(--text)">${ad.trader||'Anônimo'}</span>
            ${verified?'<span class="p2p-verif"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Verificado</span>':''}
            <span style="font-size:11px;color:var(--text3)">⭐${stars} · ${trades} trades</span>
          </div>
        </div>
      </div>
      <!-- Right: price + limits -->
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:800;color:${ad.side==='buy'?'var(--green)':'var(--red)'}">
          $${price.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
        </div>
        <div style="font-size:11px;color:${premPct>=0?'var(--green)':'var(--red)'}">
          ${mktPrice>0?(premPct>=0?'+':'')+premPct.toFixed(2)+'% vs mercado':'Preço fixo'}
        </div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">por ${ad.asset}</div>
      </div>
    </div>
    <!-- Limits + payment + time -->
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:.75rem;padding-top:.75rem;border-top:1px solid var(--border)">
      <div>
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Limite</div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">$${parseFloat(ad.minAmount||0).toLocaleString('pt-BR')} – $${parseFloat(ad.maxAmount||0).toLocaleString('pt-BR')}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Disponível</div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">${p2pFmt(ad.available, ad.asset)}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Pagamento</div>
        <div style="font-size:12px;color:var(--text2)">${(ad.paymentMethods||[]).slice(0,2).join(' · ')}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Tempo limite</div>
        <div style="font-size:12px;color:var(--text2)">⏱ ${ad.timeLimit||30} min</div>
      </div>
      <button class="btn btn-sm ${ad.side==='buy'?'btn-primary':''}" style="${ad.side==='sell'?'color:var(--red);border-color:var(--red)':''}" onclick="event.stopPropagation();p2pOpenAdDetail('${ad.key||ad.id}')">
        ${ad.side==='buy'?'Vender para ele':'Comprar deste vendedor'}
      </button>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════
   2. MEUS ANÚNCIOS
═══════════════════════════════════════════════════════ */
function p2pRenderMeusAnuncios() {
  const body = document.getElementById('p2p-body');
  const ads  = p2pAdsLoad(false);

  body.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:1rem">
    <div><h3 style="margin-bottom:2px">Meus Anúncios</h3>
    <p class="sub">${ads.length} anúncio${ads.length!==1?'s':''} publicado${ads.length!==1?'s':''}</p></div>
    <button class="btn btn-primary" onclick="p2pOpenCreateAd()">+ Criar anúncio</button>
  </div>

  <!-- Info box -->
  <div style="background:var(--blue-bg);border:1px solid rgba(99,142,255,.2);border-radius:var(--radius);padding:.875rem 1rem;margin-bottom:1rem;font-size:13px;color:var(--blue-text)">
    Beta: o fluxo de <strong>escrow</strong> nesta versao e simulado para validar a experiencia. Nao envie cripto real ate que a liquidacao on-chain esteja habilitada.
  </div>

  ${ads.length===0?`
  <div class="card"><div class="empty">
    <div style="font-size:36px;margin-bottom:.75rem;opacity:.3">📢</div>
    <div style="font-weight:600;margin-bottom:.5rem">Você não tem anúncios ativos</div>
    <div style="margin-bottom:1rem">Crie um anúncio para comprar ou vender crypto no P2P</div>
    <button class="btn btn-primary" onclick="p2pOpenCreateAd()">+ Criar primeiro anúncio</button>
  </div></div>`:`
  <div style="display:flex;flex-direction:column;gap:10px">
    ${ads.map(ad=>{
      const asset = P2P_ASSETS[ad.asset] || {};
      const net   = P2P_NETWORKS[ad.network] || {};
      return `<div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:40px;height:40px;border-radius:50%;background:${asset.bg};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:${asset.color}">${asset.logo}</div>
            <div>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:15px;font-weight:700">${ad.asset}</span>
                <span class="p2p-badge-${ad.side==='buy'?'buy':'sell'}">${ad.side==='buy'?'COMPRA':'VENDA'}</span>
                <span style="font-size:11px;padding:1px 7px;border-radius:99px;background:var(--bg4);color:var(--text2)">${net.name}</span>
                <span class="${ad.status==='active'?'p2p-badge-done':'p2p-badge-canc'}">${ad.status==='active'?'Ativo':'Inativo'}</span>
              </div>
              <div style="font-size:12px;color:var(--text2);margin-top:3px">
                Preço: <strong>$${parseFloat(ad.price).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong> ·
                Disponível: <strong>${p2pFmt(ad.available,ad.asset)}</strong> ·
                Limite: <strong>$${parseFloat(ad.minAmount||0).toLocaleString('pt-BR')}–$${parseFloat(ad.maxAmount||0).toLocaleString('pt-BR')}</strong>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm" onclick="p2pToggleAd('${ad.key}')">${ad.status==='active'?'Pausar':'Reativar'}</button>
            <button class="btn btn-sm" onclick="p2pOpenCreateAd('${ad.key}')">✏ Editar</button>
            <button class="btn btn-sm btn-danger" onclick="p2pDeleteAd('${ad.key}')">✕</button>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>`}`;
}

/* ═══════════════════════════════════════════════════════
   3. MINHAS OPERAÇÕES
═══════════════════════════════════════════════════════ */
function p2pRenderOperacoes() {
  const body   = document.getElementById('p2p-body');
  const trades = p2pTradesLoad();

  const totVol = trades.filter(t=>t.status==='completed').reduce((s,t)=>s+parseFloat(t.totalUSD||0),0);
  const complet= trades.filter(t=>t.status==='completed').length;
  const pending= trades.filter(t=>['pending','escrow','pagamento_enviado'].includes(t.status)).length;

  body.innerHTML = `
  <div style="margin-bottom:1rem">
    <h3 style="margin-bottom:.25rem">Minhas Operações P2P</h3>
    <p class="sub">${trades.length} operação${trades.length!==1?'ões':''} · Vol. total: $${totVol.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
  </div>

  <div class="grid4" style="margin-bottom:1rem">
    <div class="ct-stat"><div class="lbl">Total operações</div><div class="val">${trades.length}</div></div>
    <div class="ct-stat"><div class="lbl">Concluídas</div><div class="val pos">${complet}</div></div>
    <div class="ct-stat"><div class="lbl">Em andamento</div><div class="val" style="color:var(--amber)">${pending}</div></div>
    <div class="ct-stat"><div class="lbl">Volume total</div><div class="val">$${totVol>=1000?(totVol/1000).toFixed(1)+'k':totVol.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
  </div>

  ${trades.length===0?`
  <div class="card"><div class="empty">
    <div style="font-size:36px;margin-bottom:.75rem;opacity:.3">📋</div>
    <div style="font-weight:600;margin-bottom:.5rem">Nenhuma operação realizada ainda</div>
    <div style="margin-bottom:1rem">Acesse o Mercado P2P para iniciar sua primeira operação</div>
    <button class="btn btn-primary" onclick="p2pSetTab('mercado')">Ir ao mercado</button>
  </div></div>`:`
  <div style="display:flex;flex-direction:column;gap:8px">
    ${trades.map(trade=>{
      const asset = P2P_ASSETS[trade.asset] || {};
      const net   = P2P_NETWORKS[trade.network] || {};
      const statusMap = {
        pending:'⏳ Aguardando',escrow:'🔒 Em escrow',
        pagamento_enviado:'💸 Pagamento enviado',
        completed:'✅ Concluída',cancelled:'❌ Cancelada',disputed:'⚠ Disputa'
      };
      const statusCls = {pending:'pend',escrow:'pend',pagamento_enviado:'pend',completed:'done',cancelled:'canc',disputed:'sell'};
      return `<div class="card" style="cursor:pointer" onclick="p2pOpenTradeDetail('${trade.key}')">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:38px;height:38px;border-radius:50%;background:${asset.bg};display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;color:${asset.color}">${asset.logo}</div>
            <div>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                <span style="font-weight:700;color:var(--text)">${trade.side==='buy'?'Comprei':'Vendi'} ${p2pFmt(trade.amount,trade.asset)}</span>
                <span class="p2p-badge-${statusCls[trade.status]||'pend'}">${statusMap[trade.status]||trade.status}</span>
              </div>
              <div style="font-size:12px;color:var(--text2)">
                ${net.name} · $${parseFloat(trade.price||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}/un ·
                Total: <strong style="color:var(--text)">$${parseFloat(trade.totalUSD||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong> ·
                ${trade.counterparty||'Contraparte desconhecida'}
              </div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:12px;color:var(--text3)">${trade.ts?new Date(trade.ts).toLocaleDateString('pt-BR'):''}</div>
            ${['pending','escrow','pagamento_enviado'].includes(trade.status)?`<button class="btn btn-sm btn-primary" style="margin-top:4px" onclick="event.stopPropagation();p2pOpenTradeDetail('${trade.key}')">Gerenciar</button>`:''}
          </div>
        </div>
        ${['pending','escrow','pagamento_enviado'].includes(trade.status)?`
        <div style="margin-top:.625rem;padding-top:.625rem;border-top:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:4px">
            <span>Progresso da operação</span>
            <span>Passo ${trade.step||1}/4</span>
          </div>
          <div class="p2p-escrow-bar"><div class="p2p-escrow-fill" style="width:${((trade.step||1)/4)*100}%"></div></div>
        </div>`:''}
      </div>`;
    }).join('')}
  </div>`}`;
}

/* ═══════════════════════════════════════════════════════
   MODAL: CRIAR ANÚNCIO
═══════════════════════════════════════════════════════ */
function p2pOpenCreateAd(editKey) {
  const existing = editKey ? stGet(editKey) : {};
  const mktPrices = Object.fromEntries(
    Object.keys(P2P_ASSETS).map(sym => [sym, p2pPrices[sym]?.usd||0])
  );
  const overlay = document.createElement('div');
  overlay.className='modal-overlay'; overlay.id='p2p-create-overlay';
  overlay.style.cssText='overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  overlay.innerHTML = `
  <div class="modal" style="max-width:560px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div><h3 style="margin-bottom:2px">${editKey?'Editar anúncio':'Criar anúncio P2P'}</h3>
      <p class="sub" style="margin-top:0">Defina os termos da sua oferta</p></div>
      <button class="btn btn-sm" onclick="document.getElementById('p2p-create-overlay').remove()">✕</button>
    </div>

    <!-- Side -->
    <div style="display:flex;gap:8px;margin-bottom:1.25rem">
      <button id="ad-side-buy"  onclick="p2pAdSetSide('buy')"  style="flex:1;padding:12px;border-radius:var(--radius);border:2px solid ${(existing.side||'buy')==='buy'?'var(--green)':'var(--border)'};background:${(existing.side||'buy')==='buy'?'var(--green-bg)':'transparent'};cursor:pointer;transition:all .15s">
        <div style="font-size:16px;margin-bottom:4px">📥</div>
        <div style="font-weight:700;color:var(--green);font-size:14px">COMPRA</div>
        <div style="font-size:11px;color:var(--text3)">Quero comprar cripto</div>
      </button>
      <button id="ad-side-sell" onclick="p2pAdSetSide('sell')" style="flex:1;padding:12px;border-radius:var(--radius);border:2px solid ${existing.side==='sell'?'var(--red)':'var(--border)'};background:${existing.side==='sell'?'var(--red-bg)':'transparent'};cursor:pointer;transition:all .15s">
        <div style="font-size:16px;margin-bottom:4px">📤</div>
        <div style="font-weight:700;color:var(--red);font-size:14px">VENDA</div>
        <div style="font-size:11px;color:var(--text3)">Quero vender cripto</div>
      </button>
    </div>
    <input type="hidden" id="ad-side" value="${existing.side||'buy'}">

    <!-- Asset -->
    <div class="field" style="margin-bottom:1rem">
      <label>Ativo *</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${Object.entries(P2P_ASSETS).map(([sym,a])=>`
        <button id="ad-asset-${sym}" onclick="p2pAdSetAsset('${sym}')"
          style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;border:1px solid ${(existing.asset||'BTC')===sym?a.color:'var(--border)'};background:${(existing.asset||'BTC')===sym?a.bg:'transparent'};cursor:pointer;transition:all .15s">
          <div style="width:18px;height:18px;border-radius:50%;background:${a.bg};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:${a.color}">${a.logo}</div>
          <span style="font-size:13px;font-weight:600;color:${(existing.asset||'BTC')===sym?a.color:'var(--text2)'}">${sym}</span>
        </button>`).join('')}
      </div>
    </div>
    <input type="hidden" id="ad-asset" value="${existing.asset||'BTC'}">

    <!-- Network -->
    <div class="field" style="margin-bottom:1rem">
      <label>Rede *</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${Object.entries(P2P_NETWORKS).map(([id,n])=>`
        <button id="ad-net-${id}" onclick="p2pAdSetNetwork('${id}')"
          style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:99px;border:1px solid ${(existing.network||'ethereum')===id?n.color:'var(--border)'};background:${(existing.network||'ethereum')===id?'rgba('+parseInt(n.color.slice(1,3),16)+','+parseInt(n.color.slice(3,5),16)+','+parseInt(n.color.slice(5,7),16)+',.1)':'transparent'};cursor:pointer;transition:all .15s">
          <div style="width:8px;height:8px;border-radius:50%;background:${n.color}"></div>
          <span style="font-size:13px;font-weight:600;color:var(--text)">${n.name}</span>
        </button>`).join('')}
      </div>
    </div>
    <input type="hidden" id="ad-network" value="${existing.network||'ethereum'}">

    <!-- Price & Amount -->
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field">
        <label>Preço por unidade (USD) *</label>
        <div style="position:relative">
          <div class="suf"><input type="number" id="ad-price" step="0.01" value="${existing.price||''}" placeholder="${p2pPrices[existing.asset||'BTC']?.usd?.toFixed(2)||'0.00'}" oninput="p2pAdPreview()"><s>$</s></div>
          <div style="font-size:11px;color:var(--text3);margin-top:3px">Mercado: $<span id="ad-mkt-price">${(p2pPrices[existing.asset||'BTC']?.usd||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span></div>
        </div>
      </div>
      <div class="field">
        <label>Quantidade disponível *</label>
        <div class="suf"><input type="number" id="ad-available" step="0.000001" value="${existing.available||''}" placeholder="0.00000" oninput="p2pAdPreview()"><s id="ad-sym">${existing.asset||'BTC'}</s></div>
      </div>
      <div class="field">
        <label>Limite mínimo por operação ($)</label>
        <div class="suf"><input type="number" id="ad-min" step="10" value="${existing.minAmount||50}" min="10"><s>$</s></div>
      </div>
      <div class="field">
        <label>Limite máximo por operação ($)</label>
        <div class="suf"><input type="number" id="ad-max" step="100" value="${existing.maxAmount||5000}" min="10"><s>$</s></div>
      </div>
    </div>

    <!-- Payment methods -->
    <div class="field" style="margin-bottom:1rem">
      <label>Métodos de pagamento aceitos *</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
        ${P2P_PAYMENT_METHODS.map(m=>`
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:4px 10px;border:1px solid var(--border);border-radius:99px">
          <input type="checkbox" name="ad-pay" value="${m}" ${(existing.paymentMethods||['PIX']).includes(m)?'checked':''} style="accent-color:var(--blue)">
          ${m}
        </label>`).join('')}
      </div>
    </div>

    <!-- Time limit -->
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field">
        <label>Tempo limite para pagamento</label>
        <select id="ad-timelimit">
          ${[15,30,45,60,90,120].map(t=>`<option value="${t}" ${(existing.timeLimit||30)===t?'selected':''}>${t} min</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Endereço de carteira (para venda)</label>
        <input id="ad-wallet" value="${existing.walletAddress||''}" placeholder="0x... ou endereço da rede">
      </div>
    </div>

    <!-- Terms -->
    <div class="field" style="margin-bottom:1rem">
      <label>Termos e condições do anúncio</label>
      <textarea id="ad-terms" rows="3" style="width:100%;padding:8px 12px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);resize:vertical;font-family:inherit" placeholder="ex: Aceito apenas transferências de contas no meu nome. Envio a cripto em até 5 minutos após confirmar o pagamento.">${existing.terms||''}</textarea>
    </div>

    <!-- Preview -->
    <div id="ad-preview" style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.875rem 1rem;margin-bottom:1rem;display:none">
      <div class="sec-label" style="margin-bottom:.5rem">Prévia do anúncio</div>
      <div id="ad-preview-body"></div>
    </div>

    <div id="ad-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="p2pSaveAd('${editKey||''}')">
        ${editKey?'Salvar alterações':'Publicar anúncio'}
      </button>
      <button class="btn" onclick="document.getElementById('p2p-create-overlay').remove()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  p2pAdPreview();
}

function p2pAdSetSide(side) {
  document.getElementById('ad-side').value = side;
  ['buy','sell'].forEach(s=>{
    const btn = document.getElementById('ad-side-'+s);
    if(!btn) return;
    const isSel = s===side;
    btn.style.border = `2px solid ${isSel?(s==='buy'?'var(--green)':'var(--red)'):'var(--border)'}`;
    btn.style.background = isSel?(s==='buy'?'var(--green-bg)':'var(--red-bg)'):'transparent';
  });
}

function p2pAdSetAsset(sym) {
  document.getElementById('ad-asset').value = sym;
  document.getElementById('ad-sym').textContent = sym;
  Object.entries(P2P_ASSETS).forEach(([s,a])=>{
    const btn = document.getElementById('ad-asset-'+s);
    if(!btn) return;
    const isSel = s===sym;
    btn.style.borderColor = isSel ? a.color : 'var(--border)';
    btn.style.background  = isSel ? a.bg : 'transparent';
    btn.querySelector('span').style.color = isSel ? a.color : 'var(--text2)';
  });
  const mktEl = document.getElementById('ad-mkt-price');
  if(mktEl) mktEl.textContent = (p2pPrices[sym]?.usd||0).toLocaleString('pt-BR',{minimumFractionDigits:2});
  p2pAdPreview();
}

function p2pAdSetNetwork(id) {
  document.getElementById('ad-network').value = id;
  Object.entries(P2P_NETWORKS).forEach(([netId,n])=>{
    const btn = document.getElementById('ad-net-'+netId);
    if(!btn) return;
    const isSel = netId===id;
    btn.style.borderColor = isSel ? n.color : 'var(--border)';
    const [r,g,b] = [parseInt(n.color.slice(1,3),16),parseInt(n.color.slice(3,5),16),parseInt(n.color.slice(5,7),16)];
    btn.style.background  = isSel ? `rgba(${r},${g},${b},.1)` : 'transparent';
  });
}

function p2pAdPreview() {
  const sym  = document.getElementById('ad-asset')?.value || 'BTC';
  const price= parseFloat(document.getElementById('ad-price')?.value)||0;
  const avail= parseFloat(document.getElementById('ad-available')?.value)||0;
  const prev = document.getElementById('ad-preview');
  const body = document.getElementById('ad-preview-body');
  if(!prev||!body||!price||!avail) { if(prev) prev.style.display='none'; return; }
  const totalUSD = price * avail;
  const mkt = p2pPrices[sym]?.usd||0;
  const prem = mkt>0?((price-mkt)/mkt*100):0;
  prev.style.display='block';
  body.innerHTML=`<div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px">
    <div><span style="color:var(--text3)">Preço: </span><strong>$${price.toLocaleString('pt-BR',{minimumFractionDigits:2})}/un</strong></div>
    <div><span style="color:var(--text3)">vs mercado: </span><strong style="color:${prem>=0?'var(--green)':'var(--red)'}">${prem>=0?'+':''}${prem.toFixed(2)}%</strong></div>
    <div><span style="color:var(--text3)">Valor total: </span><strong>$${totalUSD.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></div>
  </div>`;
}

function p2pSaveAd(editKey) {
  const side    = document.getElementById('ad-side').value;
  const asset   = document.getElementById('ad-asset').value;
  const network = document.getElementById('ad-network').value;
  const price   = parseFloat(document.getElementById('ad-price').value)||0;
  const avail   = parseFloat(document.getElementById('ad-available').value)||0;
  const minAmt  = parseFloat(document.getElementById('ad-min').value)||50;
  const maxAmt  = parseFloat(document.getElementById('ad-max').value)||5000;
  const errEl   = document.getElementById('ad-err');
  const payMethods = [...document.querySelectorAll('input[name="ad-pay"]:checked')].map(i=>i.value);

  if(!price)  { errEl.textContent='Informe o preço.';     errEl.style.display='block'; return; }
  if(!avail)  { errEl.textContent='Informe a quantidade.';errEl.style.display='block'; return; }
  if(!payMethods.length){ errEl.textContent='Selecione ao menos um método de pagamento.'; errEl.style.display='block'; return; }
  if(minAmt >= maxAmt){ errEl.textContent='Limite mínimo deve ser menor que o máximo.'; errEl.style.display='block'; return; }

  const uid = session.user.uid;
  const prof= stGet(uid+'_profile')||{};
  const ts  = editKey ? editKey.split('_').pop() : Date.now();
  const key = editKey || P2P_AD() + ts;

  stSet(key, {
    key, ts:parseInt(ts),
    side, asset, network, price, available:avail, minAmount:minAmt, maxAmount:maxAmt,
    paymentMethods: payMethods,
    timeLimit: parseInt(document.getElementById('ad-timelimit').value)||30,
    walletAddress: document.getElementById('ad-wallet').value.trim(),
    terms: document.getElementById('ad-terms').value.trim(),
    status: 'active',
    trader: prof.name || session.user.name || 'Você',
    stars: 5.0, trades: 0, verified: false,
  });
  document.getElementById('p2p-create-overlay').remove();
  showToast(editKey?'Anúncio atualizado!':'Anúncio publicado com sucesso!');
  p2pMainTab = 'meus-anuncios';
  p2pRenderMeusAnuncios();
}

function p2pToggleAd(key) {
  const ad = stGet(key); if(!ad) return;
  ad.status = ad.status==='active' ? 'paused' : 'active';
  stSet(key, ad);
  showToast(ad.status==='active'?'Anúncio reativado!':'Anúncio pausado.');
  p2pRenderMeusAnuncios();
}
function p2pDeleteAd(key) {
  if(!confirm('Excluir este anúncio?')) return;
  stDel(key); showToast('Anúncio excluído.'); p2pRenderMeusAnuncios();
}

/* ═══════════════════════════════════════════════════════
   MODAL: DETALHE DO ANÚNCIO + INICIAR OPERAÇÃO
═══════════════════════════════════════════════════════ */
function p2pOpenAdDetail(adKeyOrId) {
  const ad = stGet(adKeyOrId) || p2pGetDemoAds().find(a=>a.id===adKeyOrId);
  if(!ad) return;
  const asset = P2P_ASSETS[ad.asset] || {};
  const net   = P2P_NETWORKS[ad.network] || {};
  const mkt   = p2pPrices[ad.asset]?.usd || 0;
  const prem  = mkt>0?((ad.price-mkt)/mkt*100):0;

  const overlay = document.createElement('div');
  overlay.className='modal-overlay'; overlay.id='p2p-detail-overlay';
  overlay.style.cssText='overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  overlay.innerHTML=`
  <div class="modal" style="max-width:520px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:44px;height:44px;border-radius:50%;background:${asset.bg};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:${asset.color}">${asset.logo}</div>
        <div>
          <div style="display:flex;align-items:center;gap:6px">
            <h3 style="margin:0">${ad.asset}</h3>
            <span class="p2p-badge-${ad.side==='buy'?'buy':'sell'}">${ad.side==='buy'?'COMPRA':'VENDA'}</span>
          </div>
          <div style="font-size:12px;color:var(--text2)">${net.name}</div>
        </div>
      </div>
      <button class="btn btn-sm" onclick="document.getElementById('p2p-detail-overlay').remove()">✕</button>
    </div>

    <!-- Trader card -->
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.875rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:12px">
      <div style="width:44px;height:44px;border-radius:50%;background:var(--bg4);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:var(--text)">${(ad.trader||'?').slice(0,1).toUpperCase()}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:15px;color:var(--text)">${ad.trader||'Anônimo'}
          ${ad.verified?'<span class="p2p-verif" style="margin-left:6px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Verificado</span>':''}
        </div>
        <div style="font-size:12px;color:var(--text2)">
          ⭐${ad.stars||4.8} · ${ad.trades||0} operações · Taxa conclusão: ${ad.completion||98}%
        </div>
      </div>
    </div>

    <!-- Price info -->
    <div class="grid2" style="margin-bottom:1rem">
      <div class="mc"><div class="lbl">Preço</div>
        <div class="val" style="font-size:20px;color:${ad.side==='buy'?'var(--green)':'var(--red)'}">$${parseFloat(ad.price).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
        <div class="sub2" style="color:${prem>=0?'var(--green)':'var(--red)'};">${mkt>0?(prem>=0?'+':'')+prem.toFixed(2)+'% vs mercado':''}</div>
      </div>
      <div class="mc"><div class="lbl">Disponível</div><div class="val">${p2pFmt(ad.available,ad.asset)}</div></div>
      <div class="mc"><div class="lbl">Limite mín.</div><div class="val" style="font-size:16px">$${parseFloat(ad.minAmount||0).toLocaleString('pt-BR')}</div></div>
      <div class="mc"><div class="lbl">Limite máx.</div><div class="val" style="font-size:16px">$${parseFloat(ad.maxAmount||0).toLocaleString('pt-BR')}</div></div>
    </div>

    <!-- Payment methods -->
    <div style="margin-bottom:1rem">
      <div class="sec-label" style="margin-bottom:.5rem">Métodos de pagamento</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${(ad.paymentMethods||['PIX']).map(m=>`<span style="padding:3px 10px;border:1px solid var(--border);border-radius:99px;font-size:12px;color:var(--text2)">${m}</span>`).join('')}
      </div>
    </div>

    <!-- Terms -->
    ${ad.terms?`<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.75rem 1rem;margin-bottom:1rem;font-size:12px;color:var(--text2);line-height:1.5">
      <strong style="color:var(--text)">Termos do anunciante:</strong><br>${ad.terms}
    </div>`:''}

    <!-- Amount input -->
    <div style="background:var(--blue-bg);border:1px solid rgba(99,142,255,.2);border-radius:var(--radius);padding:1rem;margin-bottom:1rem">
      <div class="sec-label" style="margin-bottom:.75rem">${ad.side==='buy'?'Você quer VENDER':'Você quer COMPRAR'}</div>
      <div class="grid2">
        <div class="field">
          <label>Valor em USD ($)</label>
          <div class="suf"><input type="number" id="op-usd" step="10" placeholder="${ad.minAmount||50}" oninput="p2pCalcOp('usd','${ad.asset}',${ad.price})"><s>$</s></div>
        </div>
        <div class="field">
          <label>Quantidade em ${ad.asset}</label>
          <div class="suf"><input type="number" id="op-crypto" step="0.0001" placeholder="0.0000" oninput="p2pCalcOp('crypto','${ad.asset}',${ad.price})"><s>${ad.asset}</s></div>
        </div>
      </div>
      <div id="op-limits-warn" style="font-size:11px;color:var(--amber);margin-top:4px;display:none">⚠ Valor fora dos limites do anúncio</div>
    </div>

    <div id="ad-det-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" style="flex:1;font-size:15px;padding:13px" onclick="p2pStartTrade('${ad.key||ad.id}')">
        ${ad.side==='buy'?'✅ Vender para este comprador':'✅ Comprar desta oferta'}
      </button>
      <button class="btn" onclick="document.getElementById('p2p-detail-overlay').remove()">Cancelar</button>
    </div>
    <div style="margin-top:.75rem;font-size:11px;color:var(--text3);text-align:center">
      Beta com escrow simulado · ⏱ Limite de ${ad.timeLimit||30} min para pagamento
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function p2pCalcOp(changedField, sym, pricePerUnit) {
  const usdEl   = document.getElementById('op-usd');
  const crypEl  = document.getElementById('op-crypto');
  if(!usdEl||!crypEl) return;
  if(changedField==='usd') {
    const usd = parseFloat(usdEl.value)||0;
    crypEl.value = usd>0 ? (usd/pricePerUnit).toFixed(6) : '';
  } else {
    const cry = parseFloat(crypEl.value)||0;
    usdEl.value = cry>0 ? (cry*pricePerUnit).toFixed(2) : '';
  }
}

function p2pStartTrade(adKeyOrId) {
  const ad   = stGet(adKeyOrId) || p2pGetDemoAds().find(a=>a.id===adKeyOrId);
  if(!ad) return;
  const usdEl  = document.getElementById('op-usd');
  const crypEl = document.getElementById('op-crypto');
  const errEl  = document.getElementById('ad-det-err');
  const usd    = parseFloat(usdEl?.value)||0;
  const cry    = parseFloat(crypEl?.value)||0;

  if(!usd||!cry) { errEl.textContent='Informe o valor da operação.'; errEl.style.display='block'; return; }
  if(usd<(ad.minAmount||0)) { errEl.textContent=`Valor mínimo: $${ad.minAmount}`; errEl.style.display='block'; return; }
  if(usd>(ad.maxAmount||Infinity)) { errEl.textContent=`Valor máximo: $${ad.maxAmount}`; errEl.style.display='block'; return; }

  const prof = stGet(session.user.uid+'_profile')||{};
  const ts   = Date.now();
  const key  = P2P_TRADE() + ts;

  const trade = {
    key, ts, adKey: adKeyOrId,
    side:     ad.side==='buy' ? 'sell' : 'buy', // inverted from ad perspective
    asset:    ad.asset, network: ad.network,
    price:    ad.price, amount: cry, totalUSD: usd,
    paymentMethods: ad.paymentMethods,
    counterparty: ad.trader,
    myName: prof.name || session.user.name || 'Você',
    status: 'escrow', step: 2,
    escrowConfirmed: true, walletAddress: ad.walletAddress,
    timeLimit: ad.timeLimit || 30,
    startedAt: new Date().toISOString(),
  };
  stSet(key, trade);

  // Initial chat messages
  const msgs = [
    { from:'system', text:`Operação iniciada! ${trade.side==='buy'?'Você está comprando':'Você está vendendo'} ${p2pFmt(cry,ad.asset)} por $${usd.toFixed(2)}.`, ts:Date.now() },
    { from:'system', text:`🔒 Escrow ativo. Os cripto estão bloqueados aguardando confirmação do pagamento.`, ts:Date.now()+100 },
    { from:'counterparty', text:`Olá! Operação confirmada. Aguardando seu pagamento via ${(ad.paymentMethods||['PIX'])[0]}.`, ts:Date.now()+2000 },
  ];
  p2pMsgsSave(key, msgs);

  document.getElementById('p2p-detail-overlay')?.remove();
  showToast('Operação iniciada! Escrow ativo 🔒');
  p2pMainTab = 'operacoes';
  p2pRenderOperacoes();
  setTimeout(()=>p2pOpenTradeDetail(key), 300);
}

/* ═══════════════════════════════════════════════════════
   MODAL: GERENCIAR OPERAÇÃO EM ANDAMENTO
═══════════════════════════════════════════════════════ */
function p2pOpenTradeDetail(tradeKey) {
  const trade = stGet(tradeKey); if(!trade) return;
  const asset = P2P_ASSETS[trade.asset] || {};
  const net   = P2P_NETWORKS[trade.network] || {};
  const msgs  = p2pMsgsLoad(tradeKey);

  const steps = [
    { label:'Operação criada',        done:true },
    { label:'Escrow ativo',           done:['escrow','pagamento_enviado','completed'].includes(trade.status) },
    { label:'Pagamento confirmado',   done:['pagamento_enviado','completed'].includes(trade.status) },
    { label:'Cripto liberado',        done:trade.status==='completed' },
  ];

  const statusLabel = {
    escrow:'🔒 Em escrow',pagamento_enviado:'💸 Pagamento enviado',
    completed:'✅ Concluída',cancelled:'❌ Cancelada',disputed:'⚠ Disputa aberta'
  };

  const overlay = document.createElement('div');
  overlay.className='modal-overlay'; overlay.id='p2p-trade-overlay';
  overlay.style.cssText='overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  overlay.innerHTML=`
  <div class="modal" style="max-width:560px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
      <div>
        <h3 style="margin-bottom:2px">Operação P2P</h3>
        <p class="sub" style="margin-top:0">${trade.side==='buy'?'Comprando':'Vendendo'} ${p2pFmt(trade.amount,trade.asset)} · ${statusLabel[trade.status]||trade.status}</p>
      </div>
      <button class="btn btn-sm" onclick="document.getElementById('p2p-trade-overlay').remove()">✕</button>
    </div>

    <!-- Progress steps -->
    <div style="display:flex;justify-content:space-between;margin-bottom:1rem;position:relative">
      <div style="position:absolute;top:14px;left:10%;right:10%;height:2px;background:var(--border);z-index:0"></div>
      ${steps.map((s,i)=>`
      <div style="display:flex;flex-direction:column;align-items:center;gap:5px;z-index:1;flex:1">
        <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:${s.done?'var(--green)':'var(--bg4)'};color:${s.done?'#000':'var(--text3)'};border:2px solid ${s.done?'var(--green)':'var(--border)'}">
          ${s.done?'✓':i+1}
        </div>
        <div style="font-size:9px;color:${s.done?'var(--green)':'var(--text3)'};text-align:center;max-width:70px;line-height:1.2">${s.label}</div>
      </div>`).join('')}
    </div>

    <!-- Trade summary -->
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.875rem 1rem;margin-bottom:1rem">
      <div class="grid2" style="gap:8px">
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Ativo</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px">
            <div style="width:22px;height:22px;border-radius:50%;background:${asset.bg};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:${asset.color}">${asset.logo}</div>
            <span style="font-weight:600">${trade.asset} · ${net.name}</span>
          </div>
        </div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Valor total</div><div style="font-size:18px;font-weight:700;color:var(--text);margin-top:2px">$${parseFloat(trade.totalUSD||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Quantidade</div><div style="font-weight:600;margin-top:2px">${p2pFmt(trade.amount,trade.asset)}</div></div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Contraparte</div><div style="font-weight:600;margin-top:2px">${trade.counterparty||'—'}</div></div>
      </div>
      ${trade.walletAddress?`<div style="margin-top:.5rem;padding-top:.5rem;border-top:1px solid var(--border)">
        <div style="font-size:10px;color:var(--text3);margin-bottom:3px">Endereço de destino</div>
        <div style="font-size:11px;font-family:monospace;color:var(--text2);word-break:break-all">${trade.walletAddress}</div>
      </div>`:''}
    </div>

    <!-- Payment method -->
    ${trade.status==='escrow'?`
    <div style="background:var(--amber-bg);border:1px solid rgba(255,183,77,.3);border-radius:var(--radius);padding:.875rem 1rem;margin-bottom:1rem">
      <div style="font-weight:600;color:var(--amber);margin-bottom:.5rem">💳 Realize o pagamento</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:.5rem">Métodos aceitos: <strong style="color:var(--text)">${(trade.paymentMethods||['PIX']).join(' · ')}</strong></div>
      <div style="font-size:12px;color:var(--text3)">⏱ Prazo: ${trade.timeLimit||30} min a partir do início da operação</div>
    </div>`:trade.status==='pagamento_enviado'?`
    <div style="background:var(--green-bg);border:1px solid rgba(57,255,138,.2);border-radius:var(--radius);padding:.875rem 1rem;margin-bottom:1rem">
      <div style="font-weight:600;color:var(--green);margin-bottom:.5rem">✅ Pagamento enviado</div>
      <div style="font-size:13px;color:var(--text2)">Aguardando confirmação da contraparte para liberar os cripto do escrow.</div>
    </div>`:''}

    <!-- Chat -->
    <div style="margin-bottom:1rem">
      <div class="sec-label" style="margin-bottom:.5rem">💬 Chat da operação</div>
      <div id="p2p-chat-msgs" style="height:200px;overflow-y:auto;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.75rem;display:flex;flex-direction:column;gap:8px">
        ${msgs.map(m=>{
          const isMine = m.from==='me';
          const isSys  = m.from==='system';
          if(isSys) return `<div style="text-align:center;font-size:11px;color:var(--text3);padding:4px 0">${m.text}</div>`;
          return `<div style="display:flex;flex-direction:column;${isMine?'align-items:flex-end':'align-items:flex-start'}">
            <div class="p2p-chat-msg ${isMine?'mine':'theirs'}">${m.text}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px">${new Date(m.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <input id="p2p-chat-input" placeholder="Digite uma mensagem..." style="flex:1;height:36px;padding:0 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);font-size:13px"
          onkeydown="if(event.key==='Enter')p2pSendMsg('${tradeKey}')">
        <button class="btn btn-primary btn-sm" onclick="p2pSendMsg('${tradeKey}')">Enviar</button>
      </div>
    </div>

    <!-- Actions -->
    ${!['completed','cancelled'].includes(trade.status)?`
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${trade.status==='escrow'?`<button class="btn btn-primary" onclick="p2pConfirmPayment('${tradeKey}')" style="flex:1">💸 Confirmar pagamento enviado</button>`:''}
      ${trade.status==='pagamento_enviado'?`<button class="btn btn-primary" onclick="p2pReleaseCrypto('${tradeKey}')" style="flex:1;background:var(--green);border-color:var(--green);color:#000">🔓 Liberar cripto</button>`:''}
      <button class="btn btn-danger btn-sm" onclick="p2pCancelTrade('${tradeKey}')">Cancelar</button>
      <button class="btn btn-sm" onclick="p2pOpenDispute('${tradeKey}')">⚠ Abrir disputa</button>
    </div>`:`
    <div style="text-align:center;padding:.5rem;font-size:14px;color:${trade.status==='completed'?'var(--green)':'var(--red)'}">
      ${trade.status==='completed'?'✅ Operação concluída com sucesso!':'❌ Operação cancelada'}
    </div>`}
  </div>`;

  document.body.appendChild(overlay);
  // Scroll chat to bottom
  const chatEl=document.getElementById('p2p-chat-msgs');
  if(chatEl) chatEl.scrollTop=chatEl.scrollHeight;
}

function p2pSendMsg(tradeKey) {
  const input = document.getElementById('p2p-chat-input');
  const text  = input?.value.trim();
  if(!text) return;
  const msgs = p2pMsgsLoad(tradeKey);
  msgs.push({ from:'me', text, ts:Date.now() });
  // Simulate reply after 2s
  const replies = [
    'Ok, aguardando confirmação! 👍','Perfeito, já recebi.','Obrigado!','Enviando em instantes.',
    'Confirme o recebimento assim que possível.','Operação indo bem!','Verificando o pagamento...',
  ];
  setTimeout(()=>{
    const m2 = p2pMsgsLoad(tradeKey);
    m2.push({ from:'counterparty', text:replies[Math.floor(Math.random()*replies.length)], ts:Date.now() });
    p2pMsgsSave(tradeKey,m2);
  }, 1800+Math.random()*2000);
  p2pMsgsSave(tradeKey, msgs);
  input.value='';
  // Re-render chat
  const chatEl = document.getElementById('p2p-chat-msgs');
  if(chatEl) {
    const newMsg=document.createElement('div');
    newMsg.style.cssText='display:flex;flex-direction:column;align-items:flex-end';
    newMsg.innerHTML=`<div class="p2p-chat-msg mine">${text}</div><div style="font-size:10px;color:var(--text3);margin-top:2px">${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>`;
    chatEl.appendChild(newMsg);
    chatEl.scrollTop=chatEl.scrollHeight;
  }
}

function p2pConfirmPayment(tradeKey) {
  const t=stGet(tradeKey); if(!t) return;
  t.status='pagamento_enviado'; t.step=3; stSet(tradeKey,t);
  const msgs=p2pMsgsLoad(tradeKey);
  msgs.push({from:'system',text:'💸 Pagamento confirmado pelo comprador. Aguardando liberação do escrow.',ts:Date.now()});
  msgs.push({from:'counterparty',text:'Recebi a notificação. Estou verificando o pagamento agora.',ts:Date.now()+1500});
  p2pMsgsSave(tradeKey,msgs);
  document.getElementById('p2p-trade-overlay')?.remove();
  showToast('Pagamento confirmado! Aguardando liberação.');
  p2pOpenTradeDetail(tradeKey);
}

function p2pReleaseCrypto(tradeKey) {
  if(!confirm('Confirmar pagamento recebido e liberar os cripto do escrow?')) return;
  const t=stGet(tradeKey); if(!t) return;
  t.status='completed'; t.step=4; t.completedAt=new Date().toISOString(); stSet(tradeKey,t);
  const msgs=p2pMsgsLoad(tradeKey);
  msgs.push({from:'system',text:'✅ Cripto liberado do escrow! Operação concluída com sucesso.',ts:Date.now()});
  p2pMsgsSave(tradeKey,msgs);
  document.getElementById('p2p-trade-overlay')?.remove();
  showToast('🎉 Operação concluída! Cripto liberado.');
  p2pRenderOperacoes();
}

function p2pCancelTrade(tradeKey) {
  if(!confirm('Cancelar esta operação? Os fundos em escrow serão devolvidos.')) return;
  const t=stGet(tradeKey); if(!t) return;
  t.status='cancelled'; t.step=0; stSet(tradeKey,t);
  document.getElementById('p2p-trade-overlay')?.remove();
  showToast('Operação cancelada. Escrow devolvido.');
  p2pRenderOperacoes();
}

function p2pOpenDispute(tradeKey) {
  const t=stGet(tradeKey); if(!t) return;
  t.status='disputed'; stSet(tradeKey,t);
  const msgs=p2pMsgsLoad(tradeKey);
  msgs.push({from:'system',text:'⚠ Disputa aberta. Nossa equipe de mediação foi notificada e entrará em contato em até 24h.',ts:Date.now()});
  p2pMsgsSave(tradeKey,msgs);
  document.getElementById('p2p-trade-overlay')?.remove();
  showToast('Disputa aberta. Mediação ativada.');
  p2pRenderOperacoes();
}

function p2pOpenTradeDetailFromList(tradeKey) {
  p2pOpenTradeDetail(tradeKey);
}

/* ═══════════════════════════════════════════════════════
   DEMO ADS — Marketplace simulation
═══════════════════════════════════════════════════════ */
function p2pGetDemoAds() {
  const get = (sym) => p2pPrices[sym]?.usd || ({BTC:67500,ETH:3400,SOL:172,MATIC:0.85,USDC:1,USDT:1}[sym]);
  const prem = (base, pct) => parseFloat((base*(1+pct/100)).toFixed(2));
  return [
    { id:'demo1', side:'sell', asset:'BTC',  network:'ethereum', price:prem(get('BTC'),  0.5), available:0.15,  minAmount:500,   maxAmount:8000,  paymentMethods:['PIX','TED/DOC'],          timeLimit:30, trader:'CryptoKing_BR',    stars:4.9, trades:312, verified:true,  completion:99, terms:'Vendo apenas para maiores de 18 anos. Envio em 5 min após comprovante.', status:'active' },
    { id:'demo2', side:'buy',  asset:'ETH',  network:'ethereum', price:prem(get('ETH'), -0.3), available:2.5,   minAmount:100,   maxAmount:5000,  paymentMethods:['PIX'],                    timeLimit:20, trader:'ETHTrader',        stars:4.7, trades:89,  verified:true,  completion:96, terms:'Pago instantaneamente via PIX.', status:'active' },
    { id:'demo3', side:'sell', asset:'SOL',  network:'solana',   price:prem(get('SOL'),  1.2), available:50,    minAmount:50,    maxAmount:3000,  paymentMethods:['PIX','PayPal'],           timeLimit:30, trader:'SolanaMax',        stars:4.8, trades:156, verified:true,  completion:97, terms:'Aceito PIX e PayPal.', status:'active' },
    { id:'demo4', side:'sell', asset:'USDT', network:'polygon',  price:1.02,                   available:10000, minAmount:100,   maxAmount:15000, paymentMethods:['PIX','Transferência Bancária'], timeLimit:45, trader:'StableGuru',  stars:5.0, trades:847, verified:true,  completion:99, terms:'Volume alto disponível. Operações rápidas.', status:'active' },
    { id:'demo5', side:'buy',  asset:'MATIC',network:'polygon',  price:prem(get('MATIC'),-0.8),available:5000,  minAmount:20,    maxAmount:1000,  paymentMethods:['PIX'],                    timeLimit:15, trader:'PolygonFan',       stars:4.6, trades:43,  verified:false, completion:92, terms:'Compro rápido. PIX apenas.', status:'active' },
    { id:'demo6', side:'sell', asset:'USDC', network:'solana',   price:1.01,                   available:8000,  minAmount:100,   maxAmount:20000, paymentMethods:['PIX','TED/DOC','Wise'],    timeLimit:30, trader:'USDCVault',        stars:4.9, trades:521, verified:true,  completion:98, terms:'Redes Solana e Ethereum. Grandes volumes bem-vindos.', status:'active' },
    { id:'demo7', side:'buy',  asset:'BTC',  network:'ethereum', price:prem(get('BTC'), -1.0), available:0.05,  minAmount:1000,  maxAmount:3000,  paymentMethods:['TED/DOC','PIX'],          timeLimit:60, trader:'BTCHodler',        stars:4.8, trades:178, verified:true,  completion:95, terms:'Compro BTC com prêmio negativo. Sem pressa.', status:'active' },
    { id:'demo8', side:'sell', asset:'ETH',  network:'polygon',  price:prem(get('ETH'),  0.8), available:5.0,   minAmount:200,   maxAmount:10000, paymentMethods:['PIX','PayPal','Wise'],     timeLimit:30, trader:'ETHProvider',      stars:4.7, trades:234, verified:true,  completion:97, terms:'ETH via Polygon — taxas baixas!', status:'active' },
  ];
}


