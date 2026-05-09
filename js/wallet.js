async function renderWallet() {
  // Auto-refresh prices every 60s while on wallet tab
  if(_walletRefreshTimer) clearInterval(_walletRefreshTimer);
  _walletRefreshTimer = setInterval(() => {
    const active = document.querySelector('.panel.active')?.id;
    if(active === 'panel-wallet') renderWallet();
    else clearInterval(_walletRefreshTimer);
  }, 60000);

  const panel = document.getElementById('panel-wallet');
  const assets = wLoad();

  // Separate crypto (CoinGecko) from stocks (Yahoo Finance)
  const cryptoAssets = assets.filter(a => a.cgId && !a.cgId.startsWith('STOCK:'));
  const stockAssets  = assets.filter(a => !a.cgId || a.cgId.startsWith('STOCK:'));

  const ids = [...new Set(cryptoAssets.map(a=>a.cgId).filter(Boolean))];
  let livePrices = {};
  if(ids.length > 0) {
    try {
      livePrices = await cgFetch(`/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`);
    } catch(e) {}
  }

  // Fetch stock prices in parallel (throttled — max 5 at once)
  const stockPriceMap = {};
  const stockTickers  = [...new Set(stockAssets.map(a => {
    if(a.cgId?.startsWith('STOCK:')) return a.cgId.slice(6); // strip STOCK: prefix
    // Legacy: try to guess ticker from symbol + category
    if(isStockCategory(a.category||'')) return a.symbol;
    return null;
  }).filter(Boolean))];

  if(stockTickers.length > 0) {
    const batches = [];
    for(let i=0;i<stockTickers.length;i+=5) batches.push(stockTickers.slice(i,i+5));
    for(const batch of batches) {
      await Promise.all(batch.map(async ticker => {
        const data = await fetchStockPrice(ticker);
        if(data) stockPriceMap[ticker] = data;
      }));
    }
  }

  // enrich assets with live data
  const enriched = assets.map(a=>{
    let currentPrice = parseFloat(a.buyPrice)||0;
    let chg24 = null;
    const isStock = isStockCategory(a.category||'') || a.cgId?.startsWith('STOCK:');

    if(isStock) {
      const ticker = a.cgId?.startsWith('STOCK:') ? a.cgId.slice(6) : a.symbol;
      const sd = stockPriceMap[ticker];
      if(sd) { currentPrice = sd.price; chg24 = sd.chg24; }
    } else {
      const live = livePrices[a.cgId||''];
      if(live) { currentPrice = live.usd; chg24 = live.usd_24h_change; }
    }

    const value = currentPrice * parseFloat(a.qty||0);
    const cost  = parseFloat(a.buyPrice||0) * parseFloat(a.qty||0);
    const pnl   = value - cost;
    const pnlPct= cost>0 ? (pnl/cost)*100 : 0;
    return { ...a, currentPrice, value, cost, pnl, pnlPct, chg24, isStock };
  });

  const totalValue = enriched.reduce((s,a)=>s+a.value, 0);
  const totalCost  = enriched.reduce((s,a)=>s+a.cost,  0);
  const totalPnL   = totalValue - totalCost;
  const totalPnLPct= totalCost>0 ? (totalPnL/totalCost)*100 : 0;

  // group by category for chart
  const byCategory = {};
  enriched.forEach(a=>{
    const cat = a.category||'Outros';
    byCategory[cat] = (byCategory[cat]||0) + a.value;
  });

  // build asset rows sorted by value desc
  const sorted = [...enriched].sort((a,b)=>b.value-a.value);

  const emptyState = assets.length===0;

  panel.innerHTML = `
  <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:1.25rem">
    <div>
      <h2>${t('wallet')}</h2>
      <p class="sub">Todos os seus ativos em um lugar</p>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-sm" onclick="exportWalletExcel()" title="Exportar Excel">📊 Excel</button>
      <button class="btn btn-sm" onclick="exportWalletPDF()" title="Exportar PDF">📄 PDF</button>
      <button class="btn btn-primary" onclick="openAddAssetModal()">${t('add_asset')}</button>
    </div>
  </div>

  ${emptyState ? `
  <div class="card"><div class="empty" style="padding:2.5rem">
    <div style="font-size:36px;margin-bottom:.75rem;opacity:.2">◎</div>
    <div style="font-weight:600;margin-bottom:.5rem">Carteira vazia</div>
    <div>Adicione seus ativos para visualizar o portfólio</div>
    <button class="btn btn-primary" style="margin-top:1.25rem" onclick="openAddAssetModal()">+ Adicionar primeiro ativo</button>
  </div></div>` : `

  <div class="grid3" style="margin-bottom:1rem">
    <div class="mc"><div class="lbl">${t('total_portfolio')}</div><div class="val" style="font-size:20px">$${totalValue.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div><div class="sub2">${assets.length} ${assets.length!==1?t('asset_plural'):t('asset_singular')}</div></div>
    <div class="mc"><div class="lbl">Custo total</div><div class="val" style="font-size:20px">$${totalCost.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
    <div class="mc"><div class="lbl">P&L total</div><div class="val ${totalPnL>=0?'pos':'neg'}" style="font-size:20px">${totalPnL>=0?'+':''}$${Math.abs(totalPnL).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div><div class="sub2" style="color:${totalPnLPct>=0?'var(--green)':'var(--red)'}">${totalPnLPct>=0?'+':''}${totalPnLPct.toFixed(2)}%</div></div>
  </div>

  <!-- Card de resumo de alocação -->
  <div class="card" style="margin-bottom:1rem;background:var(--bg);border-color:rgba(99,142,255,0.2)">
    <div class="sec-label" style="margin-bottom:1rem">Resumo de Alocação</div>
    ${enriched.filter(a=>parseFloat(a.targetAlloc||0)>0).length>0?`
    <div style="display:flex;flex-direction:column;gap:10px">
      ${enriched.filter(a=>parseFloat(a.targetAlloc||0)>0).map((a,i)=>{
        const currentAlloc = totalValue>0 ? (a.value/totalValue)*100 : 0;
        const targetAlloc = parseFloat(a.targetAlloc||0);
        const diff = currentAlloc - targetAlloc;
        const diffColor = Math.abs(diff)<0.5?'var(--green)':Math.abs(diff)<2?'var(--amber)':'var(--red)';
        const symbol = a.cgId?.startsWith('STOCK:') ? a.cgId.slice(6).replace('.SA','') : a.symbol;
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:.75rem;background:var(--bg2);border-radius:var(--radius);border:1px solid var(--border)">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;color:var(--text);margin-bottom:4px">${symbol}</div>
            <div style="display:flex;gap:12px;font-size:12px">
              <div><span style="color:var(--text3)">Atual:</span> <strong style="color:var(--text)">${currentAlloc.toFixed(2)}%</strong></div>
              <div><span style="color:var(--text3)">Meta:</span> <strong style="color:var(--text)">${targetAlloc.toFixed(2)}%</strong></div>
              <div><span style="color:var(--text3)">Diferença:</span> <strong style="color:${diffColor}">${diff>=0?'+':''}${diff.toFixed(2)}%</strong></div>
            </div>
          </div>
          <div style="width:40px;height:40px;border-radius:50%;background:${diffColor};opacity:0.15;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <div style="font-size:18px;color:${diffColor}">${Math.abs(diff)<0.5?'✓':diff>0?'⬆':'⬇'}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`:`
    <div style="padding:1rem;text-align:center;color:var(--text3);font-size:13px">
      Configure as metas de ${t('allocation').toLowerCase()} ao adicionar ativos para acompanhar o rebalanceamento
    </div>`}
  </div>

  <div class="grid2" style="margin-bottom:1rem">
    <div class="card">
      <div class="sec-label">Alocação por categoria</div>
      <div class="donut-wrap" style="height:180px">
        <canvas id="wallet-donut" style="max-width:180px;max-height:180px"></canvas>
        <div class="donut-center">
          <div style="font-size:11px;color:var(--text3)">Total</div>
          <div style="font-size:16px;font-weight:700;color:var(--text)">$${totalValue>=1000?(totalValue/1000).toFixed(1)+'k':totalValue.toFixed(0)}</div>
        </div>
      </div>
      <div style="margin-top:.75rem;display:flex;flex-direction:column;gap:6px">
        ${Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).map(([cat,val],i)=>`
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:10px;height:10px;border-radius:3px;background:${WALLET_COLORS[i%WALLET_COLORS.length]};flex-shrink:0"></div>
          <div style="flex:1;font-size:12px;color:var(--text2)">${cat}</div>
          <div style="font-size:12px;font-weight:600;color:var(--text)">$${val.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div style="font-size:11px;color:var(--text3);min-width:36px;text-align:right">${totalValue>0?((val/totalValue)*100).toFixed(1):0}%</div>
        </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="sec-label">Distribuição por ativo</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:.25rem">
        ${sorted.slice(0,6).map((a,i)=>{
          const pct = totalValue>0 ? (a.value/totalValue)*100 : 0;
          return `<div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
              <div style="display:flex;align-items:center;gap:6px">
                ${a.logo?`<img src="${a.logo}" style="width:18px;height:18px;border-radius:50%" onerror="this.style.display='none'">`:`<div style="width:18px;height:18px;border-radius:50%;background:${WALLET_COLORS[i%WALLET_COLORS.length]};opacity:.7"></div>`}
                <span style="font-size:13px;font-weight:500;color:var(--text)">${a.symbol}</span>
              </div>
              <span style="font-size:12px;color:var(--text2)">${pct.toFixed(1)}%</span>
            </div>
            <div class="alloc-bar-bg"><div class="alloc-bar-fill" style="width:${pct.toFixed(1)}%;background:${WALLET_COLORS[i%WALLET_COLORS.length]}"></div></div>
          </div>`;
        }).join('')}
        ${sorted.length>6?`<div style="font-size:12px;color:var(--text3)">+${sorted.length-6} ${sorted.length-6!==1?t('asset_plural'):t('asset_singular')}</div>`:''}
      </div>
    </div>
  </div>

  <div class="card" style="padding:0">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem .75rem;flex-wrap:wrap;gap:8px">
      <div class="sec-label" style="margin-bottom:0">Ativos (${assets.length})</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap" id="wallet-filter-btns">
        <button class="tag-btn active" onclick="filterWallet('todos',this)">Todos</button>
        ${[...new Set(assets.map(a=>a.category||'Outros'))].map(c=>`<button class="tag-btn" onclick="filterWallet('${c}',this)">${c}</button>`).join('')}
      </div>
    </div>
    <div id="wallet-asset-list" style="padding:0 1.25rem 1rem">
      ${buildAssetRows(sorted, totalValue)}
    </div>
  </div>`}`;

  // draw donut chart after DOM is ready
  if(!emptyState && Object.keys(byCategory).length > 0) {
    requestAnimationFrame(()=>drawWalletDonut('wallet-donut', byCategory, false));
  }
  
  // ── Render Yield / Fees section ──
  const yieldDiv = document.createElement('div');
  yieldDiv.innerHTML = buildYieldSection();
  setTimeout(() => {
    const walletPanel = document.getElementById('panel-wallet');
    if(walletPanel) walletPanel.appendChild(yieldDiv);
  }, 50);

  // Adicionar dicas de uso ao final do painel
  const tipsDiv = document.createElement('div');
  tipsDiv.innerHTML = `
    <div class="card" style="background: var(--amber-bg); border-color: var(--amber); margin-top: 2rem;">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 20px; flex-shrink: 0;">💡</span>
        <div>
          <h3 style="color: var(--amber-text); margin-bottom: 8px;">Dicas de Uso - Gestão de Carteira</h3>
          <ul style="list-style: none; padding: 0; margin: 0; color: var(--text2); font-size: 13px; line-height: 1.6;">
            <li>➕ <strong>${t('add_asset')}:</strong> ${appLang==='en'?'Click "+ Add asset" to include crypto or stocks in your wallet.':'Clique em "+ Adicionar ativo" para incluir criptomoedas ou ações à sua carteira.'}</li>
            <li>📊 <strong>Categorização:</strong> Organize seus ativos em categorias (ex: Staking, Leverage, DeFi) para melhor controle.</li>
            <li>🔄 <strong>Preços em Tempo Real:</strong> Os preços são atualizados automaticamente do CoinGecko (cripto) e Yahoo Finance (ações).</li>
            <li>📈 <strong>Análise de Ganhos:</strong> Acompanhe seu P&L (Profit & Loss) e percentual de retorno para cada ativo.</li>
            <li>🎨 <strong>Filtros:</strong> Use os filtros por categoria para visualizar apenas os ativos de sua escolha.</li>
          </ul>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => {
    const panel = document.getElementById('panel-wallet');
    if(panel) panel.appendChild(tipsDiv);
  }, 100);
}

function buildAssetRows(sorted, totalValue) {
  if(!sorted.length) return `<div class="empty" style="padding:1rem">${appLang==='en'?'No assets in this category':'Nenhum ativo nessa categoria'}</div>`;
  return sorted.map((a,i)=>{
    const pct = totalValue>0 ? (a.value/totalValue)*100 : 0;
    const targetAlloc = parseFloat(a.targetAlloc) || 0;
    const allocDiff = pct - targetAlloc;
    const allocColor = allocDiff > 2 ? 'var(--red)' : allocDiff < -2 ? 'var(--amber)' : 'var(--green)';
    const p1Str = a.currentPrice<0.01?'$'+a.currentPrice.toFixed(6):a.currentPrice<1?'$'+a.currentPrice.toFixed(4):'$'+a.currentPrice.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4});
    const chgStr = a.chg24!=null?`<span style="font-size:11px;color:${a.chg24>=0?'var(--green)':'var(--red)'}">${a.chg24>=0?'+':''}${a.chg24.toFixed(2)}% 24h</span>`:'';
    const srcBadge = a.source === 'pool'
      ? `<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(57,255,138,.12);color:var(--green-text);border:1px solid rgba(57,255,138,.2);margin-left:4px" title="Sincronizado da pool ${a.poolName||''}">⬡ Pool</span>`
      : a.isStock
      ? `<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:var(--blue-bg);color:var(--blue-text);border:1px solid rgba(99,142,255,.2);margin-left:4px">Yahoo</span>`
      : a.cgId ? `<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:var(--green-bg);color:var(--green-text);border:1px solid rgba(57,255,138,.2);margin-left:4px">CG</span>` : '';
    const isPoolAsset = a.source === 'pool';
    const tickerDisplay = a.cgId?.startsWith('STOCK:') ? a.cgId.slice(6).replace('.SA','') : a.symbol;
    return `<div id="wallet-asset-row" class="wallet-asset-row" data-cat="${a.category||'Outros'}" data-symbol="${a.symbol||''}" data-name="${(a.name||''  ).replace(/"/g,'&quot;')}" data-category="${a.category||''}" data-qty="${a.qty||0}" data-buyprice="${a.buyPrice||0}" data-currentprice="${a.currentPrice||a.buyPrice||0}" data-pnl="${a.pnl?.toFixed(2)||0}" data-pnlpct="${a.pnlPct?.toFixed(2)||0}" data-network="${a.network||a.exchange||''}">
      <div style="flex-shrink:0">
        ${a.logo?`<img src="${a.logo}" style="width:36px;height:36px;border-radius:50%;border:2px solid var(--bg4)" onerror="this.style.display='none'">`:`<div style="width:36px;height:36px;border-radius:50%;background:${WALLET_COLORS[i%WALLET_COLORS.length]};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff">${tickerDisplay.slice(0,3)}</div>`}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600;color:var(--text)">${tickerDisplay}${srcBadge} <span style="font-size:12px;font-weight:400;color:var(--text2)">${a.name}</span></div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">${a.qty} unid. · ${p1Str} ${chgStr}</div>
      </div>
      <div style="text-align:center;flex-shrink:0;min-width:140px">
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px;text-transform:uppercase;font-weight:600">Alocação</div>
        <div style="display:flex;gap:8px;align-items:center;justify-content:center">
          <div style="text-align:center">
            <div style="font-size:13px;font-weight:700;color:var(--text)">${pct.toFixed(2)}%</div>
            <div style="font-size:10px;color:var(--text3)">Atual</div>
          </div>
          <div style="font-size:12px;color:var(--text3)">|</div>
          <div style="text-align:center">
            <div style="font-size:13px;font-weight:700;color:${targetAlloc>0?'var(--text)':'var(--text3)'}">${targetAlloc.toFixed(2)}%</div>
            <div style="font-size:10px;color:var(--text3)">Meta</div>
          </div>
          ${targetAlloc>0?`<div style="text-align:center;padding-left:4px;border-left:1px solid var(--border)">
            <div style="font-size:13px;font-weight:700;color:${allocColor}">${allocDiff>=0?'+':''}${allocDiff.toFixed(2)}%</div>
            <div style="font-size:10px;color:var(--text3)">Diff</div>
          </div>`:''}
        </div>
      </div>
      <div class="sparkline-wrap" style="width:60px;flex-shrink:0;display:flex;align-items:center">
        ${!a.isStock&&a.cgId?`<canvas width="60" height="30"></canvas>`:''}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:14px;font-weight:700;color:var(--text)">$${a.value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        <div style="font-size:12px;color:${a.pnl>=0?'var(--green)':'var(--red)'};">${a.pnl>=0?'+':''}$${Math.abs(a.pnl).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} (${a.pnlPct>=0?'+':''}${a.pnlPct.toFixed(2)}%)</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">
        <span class="badge bb" style="font-size:10px">${a.category||'Outros'}</span>
        ${isPoolAsset
          ? `<button class="btn btn-sm" style="font-size:10px;padding:2px 8px;opacity:.6;cursor:default" title="Gerenciado pela pool — edite na aba Pool de Liquidez" disabled>🔒 Pool</button>`
          : `<div style="display:flex;gap:4px"><button class="btn btn-sm" style="font-size:10px;padding:2px 8px" onclick="editAsset('${a.ts}')">✏</button><button class="btn btn-sm btn-danger" style="font-size:10px;padding:2px 8px" onclick="deleteAsset('${a.ts}')">✕</button></div>`}
      </div>
    </div>`;
  }).join('');
}

function filterWallet(cat, btn) {
  document.querySelectorAll('#wallet-filter-btns .tag-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const rows = document.querySelectorAll('#wallet-asset-list .wallet-asset-row');
  rows.forEach(r=>{
    r.style.display = (cat==='todos' || r.dataset.cat===cat) ? 'flex' : 'none';
  });
}

function drawWalletDonut(canvasId, byCategory, small=false) {
  const ctx = document.getElementById(canvasId);
  if(!ctx) return null;
  // Sort by value desc so chart colors match legend order
  const sorted = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
  const labels = sorted.map(e=>e[0]);
  const data   = sorted.map(e=>e[1]);
  const colors = labels.map((_,i)=>WALLET_COLORS[i%WALLET_COLORS.length]);
  const chart = new Chart(ctx, {
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor:colors, borderWidth:2, borderColor:'#0d1117', hoverOffset:4 }] },
    options:{
      responsive:true, maintainAspectRatio:true,
      cutout: small?'72%':'68%',
      plugins:{
        legend:{ display:false },
        tooltip:{ callbacks:{ label: c=>`${c.label}: $${c.parsed.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} (${((c.parsed/c.dataset.data.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)` } }
      }
    }
  });
  return chart;
}

/* ── Add asset modal ── */
function openAddAssetModal() {
  const cats = ['DeFi','Layer 1','Layer 2','Stablecoin','NFT / GameFi','Meme','Ações B3','Ações EUA','ETF BR','ETF EUA','BDR','FII','Renda Fixa','Outros'];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'add-asset-overlay';
  overlay.style.cssText = 'overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  overlay.innerHTML = `
  <div class="modal" style="max-width:520px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div><h3 style="margin-bottom:2px">${t('add_asset')}</h3><p class="sub" style="margin-top:0">${appLang==='en'?'Search for the token and enter your position':'Busque o token e informe sua posição'}</p></div>
      <button class="btn btn-sm" onclick="closeAddAssetModal()">✕</button>
    </div>

    <div class="sec-label">Token / Ativo</div>
    <div class="field" style="margin-bottom:1rem">
      <label>Categoria</label>
      <select id="wa-category" onchange="onWaCategoryChange(this)">${cats.map(c=>`<option>${c}</option>`).join('')}</select>
    </div>

    <div id="wa-t1-selected" style="display:none;margin-bottom:10px"></div>
    <div class="token-search-wrap" style="margin-bottom:1rem">
      <div class="field"><label id="wa-search-label">Buscar token</label><input id="wa-search" placeholder="Nome ou símbolo (ex: bitcoin, ETH, PETR4, AAPL)" autocomplete="off"
        oninput="waRouteSearch(this)"
        onkeydown="tokenKeyNav(event,'wa')"></div>
      <div id="wa-dropdown" class="token-dropdown" style="display:none"></div>
    </div>
    <input type="hidden" id="np-waid">
    <input type="hidden" id="np-wasym">
    <input type="hidden" id="np-waprice">
    <input type="hidden" id="np-walogo">
    <input type="hidden" id="np-waname">

    <div class="grid2" style="margin-bottom:1rem">
      <div class="field"><label>Quantidade</label><div class="suf"><input type="text" id="wa-qty" placeholder="0.00" oninput="waCalcTotal()"><s>#</s></div></div>
      <div class="field"><label>Preço médio de compra (USD)</label><div class="suf"><input type="text" id="wa-buyprice" placeholder="0.00" oninput="waCalcTotal()"><s>$</s></div></div>
    </div>

    <div class="field" style="margin-bottom:1rem">
      <label>Alocação desejada (%)</label>
      <div class="suf"><input type="number" id="wa-targetalloc" placeholder="0.00" min="0" max="100" step="0.01"><s>%</s></div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">Percentual do patrimônio que você quer ter neste ativo</div>
    </div>

    <div id="wa-total-preview" style="display:none;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;margin-bottom:1rem;font-size:13px;color:var(--text2)">
      Custo total: <strong id="wa-total-val" style="color:var(--text)">—</strong>
    </div>

    <div id="wa-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="saveAsset()">${t('add_asset')}</button>
      <button class="btn" style="color:var(--amber);border-color:var(--amber)" onclick="saveAsset(true)">+ Adicionar outro</button>
      <button class="btn" onclick="closeAddAssetModal()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  // hook up the wallet token slot to the shared tokenSearch system
  setTimeout(()=>document.getElementById('wa-search').focus(), 50);
}

function closeAddAssetModal() {
  const el = document.getElementById('add-asset-overlay');
  if(el) el.remove();
}

/* Route search to CoinGecko or Yahoo Finance based on selected category */
function waRouteSearch(input) {
  const category = document.getElementById('wa-category')?.value || '';
  if(isStockCategory(category)) {
    // Update label and placeholder
    const lbl = document.getElementById('wa-search-label');
    if(lbl) lbl.textContent = 'Buscar ativo (B3/EUA)';
    input.placeholder = 'Ex: PETR4, AAPL, VALE3, IVVB11';
    tokenSearchStock(input, 'wa', category);
  } else {
    const lbl = document.getElementById('wa-search-label');
    if(lbl) lbl.textContent = 'Buscar token';
    input.placeholder = 'Nome ou símbolo (ex: bitcoin, ETH)';
    tokenSearch(input, 'wa');
  }
}

/* When category changes, clear selection and update search hint */
function onWaCategoryChange(sel) {
  clearStockSelection('wa');
  const inp = document.getElementById('wa-search');
  if(!inp) return;
  if(isStockCategory(sel.value)) {
    inp.placeholder = 'Ex: PETR4, AAPL, VALE3, IVVB11';
    const lbl = document.getElementById('wa-search-label');
    if(lbl) lbl.textContent = 'Buscar ativo (B3/EUA)';
  } else {
    inp.placeholder = 'Nome ou símbolo (ex: bitcoin, ETH)';
    const lbl = document.getElementById('wa-search-label');
    if(lbl) lbl.textContent = 'Buscar token';
  }
}



function parseCommaNumber(val) {
  if(!val && val!==0) return NaN;
  return parseFloat(String(val).replace(',','.'));
}

function waCalcTotal() {
  const qty = parseCommaNumber(document.getElementById('wa-qty').value)||0;
  const bp  = parseCommaNumber(document.getElementById('wa-buyprice').value)||0;
  const tot = qty*bp;
  const el  = document.getElementById('wa-total-preview');
  const val = document.getElementById('wa-total-val');
  if(qty>0 && bp>0) {
    el.style.display='block';
    val.textContent = '$'+tot.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  } else { el.style.display='none'; }
}

function saveAsset(addAnother=false) {
  const sym      = document.getElementById('np-wasym').value.trim();
  const name     = document.getElementById('np-waname').value.trim();
  const cgId     = document.getElementById('np-waid').value.trim();
  const logo     = document.getElementById('np-walogo').value.trim();
  const price    = document.getElementById('np-waprice').value.trim();
  const qty      = document.getElementById('wa-qty').value.trim();
  const buyPrice = document.getElementById('wa-buyprice').value.trim();
  const category = document.getElementById('wa-category').value;
  const targetAlloc = parseCommaNumber(document.getElementById('wa-targetalloc').value) || 0;
  const errEl    = document.getElementById('wa-err');

  if(!sym) { errEl.textContent='Selecione um token pela busca.'; errEl.style.display='block'; return; }
  if(!qty||parseCommaNumber(qty)<=0) { errEl.textContent='Informe a quantidade.'; errEl.style.display='block'; return; }
  if(!buyPrice||parseCommaNumber(buyPrice)<=0) { errEl.textContent='Informe o preço de compra.'; errEl.style.display='block'; return; }
  errEl.style.display='none';

  const assets = wLoad();
  assets.push({ ts: Date.now(), symbol: sym.toUpperCase(), name, cgId, logo, buyPrice: parseCommaNumber(buyPrice), qty: parseCommaNumber(qty), category, targetAlloc });
  wSave(assets);
  closeAddAssetModal();
  showToast(`${sym.toUpperCase()} adicionado à carteira!`);
  if(addAnother) { setTimeout(()=>openAddAssetModal(), 100); } else { renderWallet(); }
}

function deleteAsset(ts) {
  if(!confirm('Remover este ativo da carteira?')) return;
  const assets = wLoad().filter(a=>String(a.ts)!==String(ts));
  wSave(assets);
  renderWallet();
}

function editAsset(ts) {
  const assets = wLoad();
  const a = assets.find(x=>String(x.ts)===String(ts));
  if(!a) return;
  const cats = ['DeFi','Layer 1','Layer 2','Stablecoin','NFT / GameFi','Meme','Ações B3','Ações EUA','ETF BR','ETF EUA','BDR','FII','Renda Fixa','Outros'];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'edit-asset-overlay';
  overlay.style.cssText = 'overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  overlay.innerHTML = `
  <div class="modal" style="max-width:440px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div><h3 style="margin-bottom:2px">Editar ativo</h3>
      <p class="sub" style="margin-top:0">${a.symbol} — ${a.name||''}</p></div>
      <button class="btn btn-sm" onclick="document.getElementById('edit-asset-overlay').remove()">✕</button>
    </div>
    <div class="field" style="margin-bottom:12px">
      <label>Categoria</label>
      <select id="ea-category">${cats.map(c=>`<option${a.category===c?' selected':''}>${c}</option>`).join('')}</select>
    </div>
    <div class="grid2" style="margin-bottom:12px">
      <div class="field"><label>Quantidade total</label>
        <div class="suf"><input type="text" id="ea-qty" value="${a.qty}" oninput="eaCalc()"><s>#</s></div>
      </div>
      <div class="field"><label>Preço médio (USD)</label>
        <div class="suf"><input type="text" id="ea-price" value="${a.buyPrice}" oninput="eaCalc()"><s>$</s></div>
      </div>
    </div>
    <div id="ea-preview" style="display:none;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;margin-bottom:12px;font-size:13px;color:var(--text2)">
      Custo total: <strong id="ea-total" style="color:var(--text)">—</strong>
    </div>
    <div style="background:var(--bg4);border-radius:var(--radius);padding:.75rem 1rem;margin-bottom:1rem;font-size:12px;color:var(--text3)">
      💡 Para aumentar posição, some a quantidade nova ao total atual e recalcule o preço médio.
    </div>
    <div class="field" style="margin-bottom:1rem">
      <label>Alocação desejada (%)</label>
      <div class="suf"><input type="text" id="ea-targetalloc" value="${a.targetAlloc||0}"><s>%</s></div>
    </div>
    <div id="ea-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="saveEditAsset('${ts}')">Salvar alterações</button>
      <button class="btn" onclick="document.getElementById('edit-asset-overlay').remove()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function eaCalc() {
  const qty = parseCommaNumber(document.getElementById('ea-qty').value)||0;
  const pr  = parseCommaNumber(document.getElementById('ea-price').value)||0;
  const prev = document.getElementById('ea-preview');
  const tot  = document.getElementById('ea-total');
  if(qty>0&&pr>0){ prev.style.display='block'; tot.textContent='$'+(qty*pr).toLocaleString('pt-BR',{minimumFractionDigits:2}); }
  else prev.style.display='none';
}

function saveEditAsset(ts) {
  const qty  = parseCommaNumber(document.getElementById('ea-qty').value);
  const price= parseCommaNumber(document.getElementById('ea-price').value);
  const cat  = document.getElementById('ea-category').value;
  const tgt  = parseCommaNumber(document.getElementById('ea-targetalloc').value)||0;
  const errEl= document.getElementById('ea-err');
  if(!qty||qty<=0){ errEl.textContent='Informe a quantidade.'; errEl.style.display='block'; return; }
  if(!price||price<=0){ errEl.textContent='Informe o preço médio.'; errEl.style.display='block'; return; }
  const assets = wLoad();
  const idx = assets.findIndex(a=>String(a.ts)===String(ts));
  if(idx<0){ errEl.textContent='Ativo não encontrado.'; errEl.style.display='block'; return; }
  assets[idx] = { ...assets[idx], qty, buyPrice:price, category:cat, targetAlloc:tgt };
  wSave(assets);
  document.getElementById('edit-asset-overlay').remove();
  showToast('Ativo atualizado!');
  renderWallet();
}

// Hook selectToken to also handle wallet slot 'wa'
const _origSelectToken = selectToken;
function selectToken(slot, id, symbol, name, logo, price) {
  if(slot==='wa') {
    document.getElementById('np-waid').value    = id;
    document.getElementById('np-wasym').value   = symbol;
    document.getElementById('np-waname').value  = name;
    document.getElementById('np-waprice').value = price;
    document.getElementById('np-walogo').value  = logo;
    document.getElementById('wa-dropdown').style.display='none';
    document.getElementById('wa-search').value = '';
    const priceStr = price<0.01?'$'+price.toFixed(6):price<1?'$'+price.toFixed(4):'$'+price.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
    const selEl = document.getElementById('wa-t1-selected');
    selEl.style.display='flex';
    selEl.className='token-selected';
    selEl.innerHTML=`
      ${logo?`<img src="${logo}" onerror="this.style.display='none'" style="width:28px;height:28px;border-radius:50%">`:''}
      <div class="token-selected-info">
        <div class="token-selected-name">${name} <span style="color:var(--text2);font-weight:400">(${symbol})</span></div>
        <div class="token-selected-price">Preço atual: <strong>${priceStr}</strong></div>
      </div>
      <button class="btn btn-sm" style="font-size:11px" onclick="clearWalletToken()">Trocar</button>`;
    // prefill buy price with current price
    const bpEl = document.getElementById('wa-buyprice');
    if(!bpEl.value) { bpEl.value = price; waCalcTotal(); }
    return;
  }
  // original behavior for t1/t2
  document.getElementById('np-'+slot+'id').value    = id;
  document.getElementById('np-'+slot+'sym').value   = symbol;
  document.getElementById('np-'+slot+'price').value = price;
  document.getElementById('np-'+slot+'logo').value  = logo;
  const dd = document.getElementById(slot+'-dropdown');
  dd.style.display = 'none';
  document.getElementById('np-'+slot+'search').value = '';
  const priceStr = price < 0.01 ? '$'+price.toFixed(6)
    : price < 1 ? '$'+price.toFixed(4)
    : '$'+price.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const selEl = document.getElementById(slot+'-selected');
  selEl.style.display = 'flex';
  selEl.className = 'token-selected';
  selEl.innerHTML = `
    ${logo?`<img src="${logo}" onerror="this.style.display='none'" style="width:28px;height:28px;border-radius:50%">`:''}
    <div class="token-selected-info">
      <div class="token-selected-name">${name} <span style="color:var(--text2);font-weight:400">(${symbol})</span></div>
      <div class="token-selected-price">Preço atual: <strong>${priceStr}</strong></div>
    </div>
    <button class="btn btn-sm" style="font-size:11px" onclick="clearToken('${slot}')">Trocar</button>`;
  recalcUSD(slot);
  dropdownActive[slot] = -1;
}

function clearWalletToken() {
  ['np-waid','np-wasym','np-waname','np-waprice','np-walogo'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const sel = document.getElementById('wa-t1-selected'); if(sel) sel.style.display='none';
  const inp = document.getElementById('wa-search'); if(inp) { inp.value=''; inp.focus(); }
}

/* ══════════════════════════════════════════
   FINANCE MODULE — ERP de Receitas & Despesas
   Key: uid_finance_txs  → [{ts, type, amount, category, description, date, tags, recurrent, recurrentPeriod}]
   ══════════════════════════════════════════ */

const FIN_KEY  = () => session.user.uid + '_finance_txs';
// ── ERP Finance Categories ──────────────────────────────────
const FIN_CATS_RECEITA = {
  'Cripto & DeFi':     ['Taxas de Pool','Staking / Yield','Airdrops','Venda de Cripto','Copy Trading','Arbitragem','Rendimento DeFi'],
  'Investimentos':     ['Dividendos','Aluguel de Ações','Venda de Ações','Venda de ETFs','Fundos Imobiliários','Renda Fixa','Juros'],
  'Trabalho':          ['Salário','13º Salário','Férias','Bônus / PLR','Freelance / PJ','Comissão','Hora Extra'],
  'Receitas Pessoais': ['Aluguel Recebido','Pensão Recebida','Herança','Prêmios','Cashback','Reembolso','Outros'],
};
const FIN_CATS_DESPESA = {
  'Moradia':           ['Aluguel','Condomínio','IPTU','Água e Esgoto','Luz / Energia','Gás','Internet','Telefone Fixo','TV por Assinatura','Manutenção / Reparos'],
  'Alimentação':       ['Supermercado','Restaurante','Delivery','Padaria / Café','Feira / Açougue','Alimentação no Trabalho'],
  'Transporte':        ['Combustível','Estacionamento','Pedágio','IPVA','Seguro Auto','Manutenção do Carro','Transporte Público','Uber / Táxi','Financiamento do Veículo'],
  'Saúde':             ['Plano de Saúde','Consulta Médica','Dentista','Medicamentos','Academia / Esporte','Exames / Laboratório'],
  'Educação':          ['Mensalidade Escolar','Faculdade / Pós','Cursos Online','Livros / Material','Idiomas'],
  'Pessoal':           ['Vestuário','Salão / Barbearia','Higiene / Beleza','Lazer / Entretenimento','Viagem','Assinatura Streaming','Presentes'],
  'Cripto & DeFi':     ['Gas / Taxas de Rede','Exchange Fees','Compra de Cripto','Ferramentas DeFi','Hardware Wallet','VPN'],
  'Financeiro':        ['Imposto de Renda','DARF / Carnê Leão','IOF','Tarifas Bancárias','Juros / Multas','Financiamento','Parcela de Empréstimo'],
  'Empresa / PJ':      ['Pró-labore','Folha de Pagamento','Contador / Honorários','Aluguel Comercial','Marketing','Softwares / SaaS','Equipamentos','Impostos PJ','Outros PJ'],
  'Outros':            ['Doações','Seguros em Geral','Pensão Paga','Despesas Diversas'],
};
const FIN_CATS_RECEITA_FLAT = Object.values(FIN_CATS_RECEITA).flat();
const FIN_CATS_DESPESA_FLAT = Object.values(FIN_CATS_DESPESA).flat();
const FIN_EMOJIS = {
  'Taxas de Pool':'💧','Staking / Yield':'🔒','Airdrops':'🪂','Venda de Cripto':'📈','Copy Trading':'📡','Arbitragem':'⚡','Rendimento DeFi':'🌊',
  'Dividendos':'💵','Aluguel de Ações':'📊','Venda de Ações':'📈','Venda de ETFs':'📊','Fundos Imobiliários':'🏢','Renda Fixa':'🏦','Juros':'💹',
  'Salário':'💼','13º Salário':'🎁','Férias':'🌴','Bônus / PLR':'🏆','Freelance / PJ':'🖥','Comissão':'🤝','Hora Extra':'⏱',
  'Aluguel Recebido':'🏠','Pensão Recebida':'👨‍👩‍👧','Herança':'🏛','Prêmios':'🥇','Cashback':'💳','Reembolso':'↩','Outros':'📦',
  'Aluguel':'🏠','Condomínio':'🏢','IPTU':'📋','Água e Esgoto':'💧','Luz / Energia':'💡','Gás':'🔥','Internet':'📶','Telefone Fixo':'📞','TV por Assinatura':'📺','Manutenção / Reparos':'🔧',
  'Supermercado':'🛒','Restaurante':'🍽','Delivery':'🛵','Padaria / Café':'☕','Feira / Açougue':'🥩','Alimentação no Trabalho':'🥡',
  'Combustível':'⛽','Estacionamento':'🅿','Pedágio':'🛣','IPVA':'🚗','Seguro Auto':'🛡','Manutenção do Carro':'🔧','Transporte Público':'🚌','Uber / Táxi':'🚕','Financiamento do Veículo':'💳',
  'Plano de Saúde':'💊','Consulta Médica':'👨‍⚕️','Dentista':'🦷','Medicamentos':'💉','Academia / Esporte':'🏋','Exames / Laboratório':'🔬',
  'Mensalidade Escolar':'🏫','Faculdade / Pós':'🎓','Cursos Online':'💻','Livros / Material':'📚','Idiomas':'🌐',
  'Vestuário':'👕','Salão / Barbearia':'✂','Higiene / Beleza':'💄','Lazer / Entretenimento':'🎮','Viagem':'✈','Assinatura Streaming':'🎬','Presentes':'🎁',
  'Gas / Taxas de Rede':'⛽','Exchange Fees':'🏦','Compra de Cripto':'🛒','Ferramentas DeFi':'🔧','Hardware Wallet':'🔑','VPN':'🔐',
  'Imposto de Renda':'📄','DARF / Carnê Leão':'📄','IOF':'🏛','Tarifas Bancárias':'🏦','Juros / Multas':'⚠','Financiamento':'💳','Parcela de Empréstimo':'💳',
  'Pró-labore':'💼','Folha de Pagamento':'👥','Contador / Honorários':'📋','Aluguel Comercial':'🏢','Marketing':'📣','Softwares / SaaS':'💻','Equipamentos':'🖥','Impostos PJ':'📄','Outros PJ':'📦',
  'Doações':'❤','Seguros em Geral':'🛡','Pensão Paga':'👶','Despesas Diversas':'📦',
};
let finBarChart = null;

function fLoad() {
  return stGet(FIN_KEY()) || [];
}
function fSave(txs) {
  stSet(FIN_KEY(), txs);
  fbDb.collection('users').doc(session.user.uid).set({ finance_txs: txs }, { merge: true }).catch(e => console.warn('fSave error', e));
}

function finTotals(txs) {
  const receitas = txs.filter(t=>t.type==='receita').reduce((s,t)=>s+parseFloat(t.amount||0),0);
  const despesas  = txs.filter(t=>t.type==='despesa').reduce((s,t)=>s+parseFloat(t.amount||0),0);
  return { receitas, despesas, saldo: receitas - despesas };
}

function parseTxDate(dateStr) {
  // Parse date as local midnight to avoid UTC timezone shift
  if(!dateStr) return new Date(0);
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m-1, d);
}

function finFilterPeriod(txs, period) {
  const now = new Date();
  return txs.filter(t=>{
    const d = new Date(t.date+'T00:00:00');
    if(period==='7d')  return (now-d) <= 7*864e5;
    if(period==='30d') return (now-d) <= 30*864e5;
    if(period==='90d') return (now-d) <= 90*864e5;
    if(period==='ano') return d.getFullYear()===now.getFullYear();
    return true; // 'todos'
  });
}

let finCurrentPeriod = '30d';
let finTypeFilter    = 'todos';

