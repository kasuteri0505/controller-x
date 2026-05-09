function renderDashboard() {
  const u = session.user;
  const uid = u.uid;
  const poolKeys = stKeys(uid+'_pool_');
  const pools = poolKeys.map(k=>({ key:k, ...stGet(k) })).filter(p=>p.ts).sort((a,b)=>b.ts-a.ts);
  const poolCount = pools.length;

  // pool totals - usando calculatePoolValue para incluir snapshots e taxas
  let totalPoolValue = 0;
  let totalFeesColl = 0;
  
  pools.forEach(p => {
    const { poolValue, totalFees } = calculatePoolValue(p);
    totalPoolValue += poolValue;
    totalFeesColl += totalFees;
  });
  
  // Para compatibilidade com referências posteriores
  const totalPoolDeposited = totalPoolValue;
  
  const activeDays     = pools.length>0 ? Math.max(...pools.map(p=>p.date?Math.max(0,Math.floor((Date.now()-new Date(p.date+'T00:00:00'))/(86400000))):0)) : 0;

  // wallet totals — exclui ativos sincronizados de pools (já contados em totalPoolValue)
  const walletAssets = wLoad();
  const walletAssetsManual = walletAssets.filter(a => a.source !== 'pool');
  const totalWallet  = walletAssetsManual.reduce((s,a)=>s+parseFloat(a.buyPrice||0)*parseFloat(a.qty||0), 0);

  // options totals
  const optKeys = stKeys(session.user.uid+'_opt_');
  const optPositions = optKeys.map(k=>stGet(k)).filter(Boolean);
  const totalOptions = optPositions.reduce((s,o)=>{
    // premium paid × qty (negative = cost, but track as value)
    const val = parseFloat(o.premium||0) * parseFloat(o.qty||0) * (o.contractSize||100);
    return s + Math.abs(val);
  }, 0);

  // finance totals
  const finTxsAll = fLoad();
  const { receitas: finReceitas, despesas: finDespesas, saldo: finSaldo } = finTotals(finTxsAll);

  // consorcios totals
  const consorciosData = stGet(session.user.uid + '_consorcios') || [];
  const totalConsorcios = consorciosData.reduce((s,c)=>s+(parseFloat(c.parcelaValor||0)*(parseInt(c.parcelasPagas)||0)),0);

  const grandTotal   = totalPoolDeposited + totalWallet + totalOptions + totalConsorcios;

  // allocation data for donut: group wallet by category + pools as one slice
  const allocData = {};
  walletAssetsManual.forEach(a=>{ const cat=a.category||'Outros'; allocData[cat]=(allocData[cat]||0)+parseFloat(a.buyPrice||0)*parseFloat(a.qty||0); });
  if(totalPoolDeposited>0) allocData['Pools DeFi']=(allocData['Pools DeFi']||0)+totalPoolDeposited;
  if(totalOptions>0) allocData['Opções']=(allocData['Opções']||0)+totalOptions;
  if(finReceitas>0) allocData['Receitas']=(allocData['Receitas']||0)+finReceitas;
  if(totalConsorcios>0) allocData['Consórcios']=(allocData['Consórcios']||0)+totalConsorcios;

  const hasAlloc = Object.values(allocData).some(v=>v>0);

  // recent pools for list
  const recent = pools.slice(0,4);
  let recentHtml = '';
  if(recent.length===0){
    recentHtml=`<div class="empty" style="padding:1.5rem">
      <div style="font-size:28px;margin-bottom:.5rem;opacity:.25">◎</div>
      <div style="font-weight:500;margin-bottom:.4rem">${t('no_pools_title')}</div>
      <div>${t('no_pools_desc')}</div>
    </div>`;
  } else {
    recent.forEach(p=>{
      const fees=(p.fees||[]).reduce((s,f)=>s+parseFloat(f.value||0),0);
      const isDCA=!p.token2?.symbol;
      const days=p.date?Math.max(0,Math.floor((Date.now()-new Date(p.date+'T00:00:00'))/86400000)):0;
      const t1logo=p.token1?.logo||''; const t2logo=p.token2?.logo||'';
      const tokenIcons = isDCA
        ? (t1logo?`<img src="${t1logo}" style="width:28px;height:28px;border-radius:50%;border:2px solid var(--bg2)" onerror="this.style.display='none'">`:`<div style="width:28px;height:28px;border-radius:50%;background:var(--blue-bg);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--blue-text)">${(p.token1?.symbol||'?').slice(0,2)}</div>`)
        : `<div style="display:flex;align-items:center">
            <div style="position:relative;width:44px;height:28px">
              ${t1logo?`<img src="${t1logo}" style="width:28px;height:28px;border-radius:50%;border:2px solid var(--bg2);position:absolute;left:0;top:0;z-index:2;background:var(--bg3)" onerror="this.style.display='none'">`:`<div style="width:28px;height:28px;border-radius:50%;background:var(--blue-bg);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--blue-text);border:2px solid var(--bg2);position:absolute;left:0;top:0;z-index:2">${(p.token1?.symbol||'?').slice(0,2)}</div>`}
              ${t2logo?`<img src="${t2logo}" style="width:24px;height:24px;border-radius:50%;border:2px solid var(--bg2);position:absolute;left:16px;top:4px;z-index:1;background:var(--bg3)" onerror="this.style.display='none'">`:`<div style="width:24px;height:24px;border-radius:50%;background:var(--green-bg);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:var(--green-text);border:2px solid var(--bg2);position:absolute;left:16px;top:4px;z-index:1">${(p.token2?.symbol||'?').slice(0,2)}</div>`}
            </div>`;
      recentHtml+=`<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="openPoolDetail('${p.key}')">
        <div style="flex-shrink:0">${tokenIcons}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px">${p.exchange||''} · ${p.network||''} · ${days}${t('d_active')}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:13px;font-weight:600;color:var(--green)">$${fees.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div style="font-size:11px;color:var(--text3)">${t('in_fees')}</div>
        </div>
      </div>`;
    });
    if(pools.length>4) recentHtml+=`<div style="padding-top:10px;font-size:13px;color:var(--blue);cursor:pointer" onclick="switchTab('positions')">${t('see_all')} ${pools.length} ${t('pool_plural')} →</div>`;
  }

  document.getElementById('panel-dashboard').innerHTML = `
  <div style="margin-bottom:1.25rem;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px">
    <div>
      <h2 style="font-size:20px">${getGreeting()}, ${(u.name||u.email?.split('@')[0]||'Usuário').split(' ')[0]}!</h2>
      <p class="sub">${t('welcome')}</p>
    </div>
    <button class="btn btn-primary" onclick="openNewPoolModal()">${t('create_pool')}</button>
  </div>

  ${renderNotifBoard()}

  <div class="ticker-wrap" id="dash-ticker">
    <div class="ticker-track" id="dash-ticker-track">
      <span class="ticker-item"><span class="ticker-label">News</span> Carregando notícias...</span>
    </div>
  </div>

  ${maybeRenderTrialBanner()}

  <div class="balance-card">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem">
      <div>
        <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">${t('total_patrimony')}</div>
        <div class="balance-glow">${grandTotal>0?'$'+grandTotal.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'$0,00'}</div>
        <div class="balance-sub">${poolCount} ${poolCount!==1?t('pool_plural'):t('pool_singular')} · ${walletAssets.length} ${walletAssets.length!==1?t('asset_plural'):t('asset_singular')} ${t('in_wallet')}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end">
        <div style="text-align:right">
          <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">${t('defi_pools')}</div>
          <div style="font-size:18px;font-weight:700;color:var(--blue)">$${totalPoolDeposited.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">${t('wallet_label')}</div>
          <div style="font-size:18px;font-weight:700;color:var(--amber)">$${totalWallet.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">${t('fees_collected')}</div>
          <div style="font-size:18px;font-weight:700;color:var(--green)">$${totalFeesColl.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">${t('finance_balance')}</div>
          <div style="font-size:18px;font-weight:700;color:${finSaldo>=0?'var(--green)':'var(--red)'}">${finSaldo>=0?'+':''}$${Math.abs(finSaldo).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>
        ${totalConsorcios>0?`<div style="text-align:right">
          <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Consórcios (pago)</div>
          <div style="font-size:18px;font-weight:700;color:#c084fc">$${totalConsorcios.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>`:''}
      </div>
    </div>
  </div>

  ${hasAlloc?`
  <div class="card" style="margin-bottom:1rem">
    <div class="sec-label">${t('portfolio_alloc')}</div>
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
      <div class="donut-wrap" style="height:140px;width:140px;flex-shrink:0">
        <canvas id="dash-donut" style="max-width:140px;max-height:140px"></canvas>
        <div class="donut-center">
          <div style="font-size:9px;color:var(--text3)">Total</div>
          <div style="font-size:13px;font-weight:700;color:var(--text)">$${grandTotal>=1000?(grandTotal/1000).toFixed(1)+'k':grandTotal.toFixed(0)}</div>
        </div>
      </div>
      <div style="flex:1;min-width:120px;display:flex;flex-direction:column;gap:6px">
        ${Object.entries(allocData).sort((a,b)=>b[1]-a[1]).map(([cat,val],i)=>`
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:8px;height:8px;border-radius:2px;background:${WALLET_COLORS[i%WALLET_COLORS.length]};flex-shrink:0"></div>
          <div style="font-size:11px;color:var(--text2);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cat}</div>
          <div style="font-size:11px;font-weight:600;color:var(--text3)">${grandTotal>0?((val/grandTotal)*100).toFixed(0):0}%</div>
        </div>`).join('')}
      </div>
    </div>
  </div>`:''}

  <!-- ── GRÁFICO 1: Evolução do Patrimônio ── -->
  <div class="card" style="margin-bottom:1rem">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.875rem;flex-wrap:wrap;gap:8px">
      <div>
        <div class="sec-label" style="margin-bottom:2px">Evolução do Patrimônio</div>
        <div style="font-size:11px;color:var(--text3)">Baseada em snapshots e transações</div>
      </div>
      <div style="display:flex;gap:4px" id="networth-period-btns">
        ${['7d','30d','90d','all'].map(p=>`<button class="btn btn-xs ${p==='30d'?'btn-primary':''}" onclick="setNetworthPeriod('${p}',this)">${p==='all'?'Tudo':p}</button>`).join('')}
      </div>
    </div>
    <div style="position:relative;height:140px">
      <canvas id="dash-networth-chart"></canvas>
      <div id="dash-networth-empty" style="display:none;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text3)">
        Adicione pools e ativos para ver a evolução
      </div>
    </div>
  </div>

  <!-- ── GRÁFICOS 2+3: Pool Performance + Receitas vs Despesas ── -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
    <div class="card">
      <div class="sec-label" style="margin-bottom:.875rem">Top Pools por Fees</div>
      <div style="height:140px;position:relative"><canvas id="dash-pool-perf-chart"></canvas></div>
    </div>
    <div class="card">
      <div class="sec-label" style="margin-bottom:.875rem">Receitas vs Despesas</div>
      <div style="height:140px;position:relative"><canvas id="dash-fin-chart"></canvas></div>
    </div>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;margin-top:.25rem">
    <div class="sec-label" style="margin-bottom:0">${t('recent_pools')}</div>
    <div style="display:flex;gap:8px;align-items:center">
      ${pools.length>0?`<button class="btn btn-sm" onclick="switchTab('positions')">${t('see_all')}</button>`:''}
      <button class="btn btn-sm" onclick="switchTab('wallet')" style="color:var(--amber);border-color:var(--amber);opacity:.8">${t('wallet_btn')}</button>
      <button class="btn btn-sm" onclick="switchTab('finance')" style="color:var(--green);border-color:var(--green);opacity:.8">${t('finance_btn')}</button>
    </div>
  </div>

  <div class="card" style="padding:0">
    <div style="padding:.75rem 1.25rem 1rem">${recentHtml}</div>
  </div>
  
  <div class="card" style="background: var(--green-bg); border-color: var(--green); margin-top: 2rem;">
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <span style="font-size: 20px; flex-shrink: 0;">💡</span>
      <div>
        <h3 style="color: var(--green); margin-bottom: 8px;">${t('tips_title')}</h3>
        <ul style="list-style: none; padding: 0; margin: 0; color: var(--text2); font-size: 13px; line-height: 1.6;">
          <li>📊 <strong>${t('tips_metrics')}:</strong> ${t('tips_metrics_desc')}</li>
          <li>📈 <strong>${t('tips_charts')}:</strong> ${t('tips_charts_desc')}</li>
          <li>🔄 <strong>${t('tips_update')}:</strong> ${t('tips_update_desc')}</li>
          <li>⚙️ <strong>${t('tips_settings')}:</strong> ${t('tips_settings_desc')}</li>
        </ul>
      </div>
    </div>
  </div>
  
  <div id="new-pool-modal"></div>`;

  // draw dashboard donut after DOM ready
  if(hasAlloc) requestAnimationFrame(()=>{ if(dashDonutChart) dashDonutChart.destroy(); dashDonutChart=drawWalletDonut('dash-donut', allocData, true); });
}

function openNewPoolModal(mode='manual') {
  // Free trial limit: max 2 pools
  const sub = subLoad();
  const isPaid = sub?.status === 'active';
  if(!isPaid) {
    const uid = session?.user?.uid;
    const poolCount = uid ? stKeys(uid+'_pool_').map(k=>stGet(k)).filter(p=>p&&p.ts).length : 0;
    if(poolCount >= 2) {
      const ov = document.createElement('div');
      ov.className = 'modal-overlay';
      ov.innerHTML = `
        <div class="modal" style="max-width:420px;text-align:center">
          <div style="font-size:40px;margin-bottom:1rem">🔒</div>
          <h3 style="margin-bottom:.5rem">Limite do plano gratuito</h3>
          <p style="color:var(--text2);font-size:14px;margin-bottom:1.5rem">
            No plano gratuito você pode ter até <strong style="color:var(--text)">2 pools simultâneas</strong>.<br>
            Faça upgrade para criar pools ilimitadas.
          </p>
          <div style="display:flex;gap:10px;justify-content:center">
            <button class="btn" onclick="this.closest('.modal-overlay').remove()">Voltar</button>
            <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove();switchTab('settings');setTimeout(()=>document.getElementById('billing-section')?.scrollIntoView({behavior:'smooth'}),100)">
              🚀 Ver planos
            </button>
          </div>
        </div>`;
      document.body.appendChild(ov);
      return;
    }
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'new-pool-overlay';
  overlay.style.cssText = 'overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  overlay.innerHTML = `
  <div class="modal" style="max-width:580px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div>
        <h3 style="margin-bottom:2px">Criar nova pool</h3>
        <p class="sub" style="margin-top:0">Importe via URL ou preencha manualmente</p>
      </div>
      <button class="btn btn-sm" onclick="closeNewPoolModal()">✕</button>
    </div>

    <!-- Mode selector -->
    <div style="display:flex;gap:8px;margin-bottom:1.25rem;flex-wrap:wrap">
      <button class="import-method-btn ${mode==='url'?'active':''}" id="mode-btn-url" onclick="switchPoolMode('url')">
        <div class="import-method-icon">🔗</div>
        <div class="import-method-label">Importar por URL</div>
        <div class="import-method-desc">Cole o link da posição na exchange</div>
      </button>
      <button class="import-method-btn ${mode==='manual'?'active':''}" id="mode-btn-manual" onclick="switchPoolMode('manual')">
        <div class="import-method-icon">✏️</div>
        <div class="import-method-label">Criar manualmente</div>
        <div class="import-method-desc">Preencha os dados da pool</div>
      </button>
      <button class="import-method-btn ${mode==='api'?'active':''}" id="mode-btn-api" onclick="switchPoolMode('api')">
        <div class="import-method-icon">🔍</div>
        <div class="import-method-label">Buscar via API</div>
        <div class="import-method-desc">Uniswap V4 multi-chain</div>
      </button>
    </div>

    <!-- URL import panel -->
    <div id="mode-url-panel" style="display:${mode==='url'?'block':'none'}">
      <div class="field" style="margin-bottom:.75rem">
        <label>URL da posição na exchange</label>
        <div style="display:flex;gap:8px">
          <input id="np-url-input" placeholder="Uniswap, PancakeSwap, Cetus (Sui), Turbos (Sui), KriyaDEX, Aerodrome…" style="flex:1" oninput="urlParseDebounce()">
          <button class="btn btn-primary btn-sm" onclick="parsePoolUrl()">Importar</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:.75rem;display:flex;flex-wrap:wrap;gap:6px">
        Suportado:
        ${['Uniswap v3/v4','PancakeSwap','Aerodrome','SushiSwap','Camelot','Trader Joe'].map(e=>`<span style="padding:2px 8px;border:1px solid var(--border);border-radius:4px">${e}</span>`).join('')}
      </div>
      <div id="np-url-result" style="margin-bottom:1rem"></div>
      <div id="np-url-err" class="err" style="display:none;margin-bottom:.75rem"></div>
      <div style="display:flex;gap:8px" id="np-url-actions" style="display:none">
        <button class="btn btn-primary" id="np-url-confirm-btn" style="display:none" onclick="confirmUrlImport()">Salvar esta pool</button>
        <button class="btn" onclick="closeNewPoolModal()">Cancelar</button>
      </div>
    </div>

    <!-- Manual panel -->
    <div id="mode-manual-panel" style="display:${mode==='manual'?'block':'none'}">
    <div class="sec-label">Informações gerais</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field" style="grid-column:1/-1"><label>Nome da pool <span style="color:var(--red)">*</span></label><input id="np-name" placeholder="ex: ETH/USDC Uniswap"></div>
      <div class="field"><label>Exchange <span style="color:var(--red)">*</span></label>
        <select id="np-exchange">
          <option value="">Selecione...</option>
          <option>Uniswap v4</option>
          <option>Uniswap v3</option>
          <option>Uniswap v2</option>
          <option>PancakeSwap</option>
          <option>Curve</option>
          <option>Balancer</option>
          <option>SushiSwap</option>
          <option>Aerodrome</option>
          <option>Camelot</option>
          <option>Trader Joe</option>
          <option>Outro</option>
        </select>
      </div>
      <div class="field"><label>Rede <span style="color:var(--red)">*</span></label>
        <select id="np-network">
          <option value="">Selecione...</option>
          <option>Ethereum</option>
          <option>Arbitrum</option>
          <option>Base</option>
          <option>Optimism</option>
          <option>Polygon</option>
          <option>BNB Chain</option>
          <option>Avalanche</option>
          <option>Solana</option>
          <option>Outra</option>
        </select>
      </div>
      <div class="field"><label>Data de início <span style="color:var(--red)">*</span></label><input type="date" id="np-date"></div>
      <div class="field"><label>Fee tier</label>
        <select id="np-fee">
          <option value="0.01">0.01%</option>
          <option value="0.05">0.05%</option>
          <option value="0.3" selected>0.30%</option>
          <option value="1">1.00%</option>
        </select>
      </div>
    </div>

    <div class="sec-label">Token 1 <span style="color:var(--red)">*</span></div>
    <div id="t1-wrap" style="margin-bottom:1rem">
      <div id="t1-selected" style="display:none;margin-bottom:8px"></div>
      <div class="token-search-wrap">
        <div class="field"><label>Buscar token</label><input id="np-t1search" placeholder="Digite nome ou símbolo (ex: ethereum, ETH)" autocomplete="off" oninput="tokenSearch(this,'t1')" onkeydown="tokenKeyNav(event,'t1')"></div>
        <div id="t1-dropdown" class="token-dropdown" style="display:none"></div>
      </div>
      <div class="grid3" style="margin-top:8px">
        <div class="field"><label>Quantidade na entrada</label>
          <div class="suf"><input type="number" id="np-t1qty" placeholder="0.000000" step="any" oninput="recalcUSD('t1');poolManualCalcPrice('t1')"><s>#</s></div>
        </div>
        <div class="field"><label>Preço de entrada (USD) <span style="color:var(--amber);font-size:10px">★ IL</span></label>
          <div class="suf"><input type="number" id="np-t1price-input" placeholder="Preço por token" step="any" oninput="poolManualSetPrice('t1')"><s>$</s></div>
        </div>
        <div class="field"><label>Valor total em USD</label>
          <div class="suf"><input type="number" id="np-t1usd" placeholder="0.00" oninput="manualUSD('t1');poolManualCalcPrice('t1')"><s>$</s></div>
        </div>
      </div>
    </div>
    <input type="hidden" id="np-t1id">
    <input type="hidden" id="np-t1sym">
    <input type="hidden" id="np-t1price">
    <input type="hidden" id="np-t1logo">

    <div style="display:flex;align-items:center;margin-bottom:.75rem">
      <div class="sec-label" style="margin-bottom:0">Token 2</div>
      <span style="font-size:11px;color:var(--text3);margin-left:8px">(opcional — vazio para DCA single-token)</span>
    </div>
    <div id="t2-wrap" style="margin-bottom:1rem">
      <div id="t2-selected" style="display:none;margin-bottom:8px"></div>
      <div class="token-search-wrap">
        <div class="field"><label>Buscar token</label><input id="np-t2search" placeholder="Digite nome ou símbolo (ex: usd-coin, USDC)" autocomplete="off" oninput="tokenSearch(this,'t2')" onkeydown="tokenKeyNav(event,'t2')"></div>
        <div id="t2-dropdown" class="token-dropdown" style="display:none"></div>
      </div>
      <div class="grid3" style="margin-top:8px">
        <div class="field"><label>Quantidade na entrada</label>
          <div class="suf"><input type="number" id="np-t2qty" placeholder="0.000000" step="any" oninput="recalcUSD('t2');poolManualCalcPrice('t2')"><s>#</s></div>
        </div>
        <div class="field"><label>Preço de entrada (USD) <span style="color:var(--amber);font-size:10px">★ IL</span></label>
          <div class="suf"><input type="number" id="np-t2price-input" placeholder="Preço por token" step="any" oninput="poolManualSetPrice('t2')"><s>$</s></div>
        </div>
        <div class="field"><label>Valor total em USD</label>
          <div class="suf"><input type="number" id="np-t2usd" placeholder="0.00" oninput="manualUSD('t2');poolManualCalcPrice('t2')"><s>$</s></div>
        </div>
      </div>
    </div>
    <input type="hidden" id="np-t2id">
    <input type="hidden" id="np-t2sym">
    <input type="hidden" id="np-t2price">
    <input type="hidden" id="np-t2logo">

    <div class="sec-label">Range de preço <span style="font-size:11px;color:var(--text3);font-weight:400;text-transform:none">(opcional — para pools concentradas)</span></div>
    <div class="grid2" style="margin-bottom:1.5rem">
      <div class="field"><label>Preço mínimo (USD)</label><div class="suf"><input type="number" id="np-rmin" placeholder="ex: 1500"><s>$</s></div></div>
      <div class="field"><label>Preço máximo (USD)</label><div class="suf"><input type="number" id="np-rmax" placeholder="ex: 3000"><s>$</s></div></div>
    </div>

    <div style="background:var(--blue-bg);border:1px solid rgba(99,142,255,.2);border-radius:var(--radius);padding:.75rem 1rem;margin-bottom:1rem;font-size:12px;color:var(--blue-text);line-height:1.5">
      <strong>💡 Cálculo de Impermanent Loss:</strong> Os preços de entrada acima (campo <span style="color:var(--amber)">★ IL</span>) já são suficientes para o IL automático. Os campos abaixo são opcionais — use-os se quiser registrar também os valores iniciais em USD de cada token separadamente.
    </div>

    <div style="background:var(--blue-bg);border:1px solid rgba(99,142,255,.2);border-radius:var(--radius);padding:.75rem 1rem;margin-bottom:1rem;font-size:12px;color:var(--blue-text);line-height:1.5">
      <strong>💡 Cálculo de Impermanent Loss:</strong> Os preços de entrada acima (campo <span style="color:var(--amber)">★ IL</span>) já são suficientes para o IL automático. Os campos abaixo são opcionais — use-os se quiser registrar também os valores iniciais em USD de cada token separadamente.
    </div>

    <div class="sec-label">Valores iniciais na pool <span style="font-size:11px;color:var(--text3);font-weight:400;text-transform:none">(opcional — para cálculo de IL e P&L)</span></div>
    <div class="grid2" style="margin-bottom:.75rem;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.875rem">
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.05em">Token 1 — valor inicial</div>
        <div class="grid2" style="gap:8px">
          <div class="field" style="margin-bottom:0">
            <label style="font-size:11px">Quantidade inicial</label>
            <div class="suf"><input type="number" id="np-t1qty0" placeholder="0.000000" step="any"><s>#</s></div>
          </div>
          <div class="field" style="margin-bottom:0">
            <label style="font-size:11px">USD inicial <span style="color:var(--amber);font-size:10px">★ IL</span></label>
            <div class="suf"><input type="number" id="np-t1usd0" placeholder="ex: 500.00" step="0.01"><s>$</s></div>
          </div>
        </div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.05em">Token 2 — valor inicial</div>
        <div class="grid2" style="gap:8px">
          <div class="field" style="margin-bottom:0">
            <label style="font-size:11px">Quantidade inicial</label>
            <div class="suf"><input type="number" id="np-t2qty0" placeholder="0.000000" step="any"><s>#</s></div>
          </div>
          <div class="field" style="margin-bottom:0">
            <label style="font-size:11px">USD inicial <span style="color:var(--amber);font-size:10px">★ IL</span></label>
            <div class="suf"><input type="number" id="np-t2usd0" placeholder="ex: 500.00" step="0.01"><s>$</s></div>
          </div>
        </div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:1.25rem">💡 Se preenchidos, estes valores serão usados como base para o cálculo do IL histórico e P&L líquido (IL + taxas coletadas).</div>

    <div style="font-size:11px;color:var(--amber);margin-bottom:.75rem;display:flex;align-items:center;gap:5px"><span>★</span> Campos marcados com <strong>★ IL</strong> são usados para cálculo do Impermanent Loss. Preencha para habilitar o cálculo automático.</div>
    <div id="np-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="saveNewPool()">Criar pool</button>
      <button class="btn" onclick="closeNewPoolModal()">Cancelar</button>
    </div>
    </div><!-- end mode-manual-panel -->

    <!-- API panel -->
    <div id="mode-api-panel" style="display:${mode==='api'?'block':'none'}">
      <div class="sec-label">Buscar Posição Uniswap V4</div>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;margin-bottom:1rem">
        <div style="font-size:12px;color:var(--text2);line-height:1.5">
          Busque automaticamente dados de posições Uniswap V4 em múltiplas redes (Ethereum, Arbitrum, Polygon, Base, Optimism, BNB, Avalanche, Blast, World Chain, Zora).
        </div>
      </div>

      <div class="grid2" style="margin-bottom:1rem">
        <div class="field">
          <label>Rede <span style="color:var(--red)">*</span></label>
          <select id="api-network">
            <option value="">Selecione...</option>
            <option value="ethereum">Ethereum</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="polygon">Polygon</option>
            <option value="base">Base</option>
            <option value="optimism">Optimism (OP Mainnet)</option>
            <option value="binance">BNB Chain</option>
            <option value="avalanche">Avalanche</option>
            <option value="blast">Blast</option>
            <option value="worldchain">World Chain</option>
            <option value="zora">Zora Network</option>
          </select>
        </div>
        <div class="field">
          <label>Position ID (NFT) <span style="color:var(--red)">*</span></label>
          <input id="api-position-id" type="number" placeholder="ex: 158318" min="1">
        </div>
      </div>

      <div id="api-loading" style="display:none;text-align:center;padding:2rem;color:var(--text2)">
        <div style="font-size:20px;margin-bottom:0.5rem">⏳</div>
        <div>Buscando dados...</div>
      </div>

      <div id="api-result" style="display:none;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;margin-bottom:1rem"></div>

      <div id="api-err" class="err" style="display:none;margin-bottom:1rem"></div>

      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="searchUniswapV4Position()">Buscar posição</button>
        <button class="btn" onclick="closeNewPoolModal()">Cancelar</button>
      </div>
    </div><!-- end mode-api-panel -->
  </div>`;
  document.body.appendChild(overlay);
  const today = new Date().toISOString().split('T')[0];
  const dateEl = document.getElementById('np-date');
  if(dateEl) dateEl.value = today;
}

function switchPoolMode(mode) {
  document.getElementById('mode-url-panel').style.display    = mode==='url'    ? 'block' : 'none';
  document.getElementById('mode-manual-panel').style.display = mode==='manual' ? 'block' : 'none';
  document.getElementById('mode-api-panel').style.display    = mode==='api'    ? 'block' : 'none';
  document.getElementById('mode-btn-url').classList.toggle('active',    mode==='url');
  document.getElementById('mode-btn-manual').classList.toggle('active', mode==='manual');
  document.getElementById('mode-btn-api').classList.toggle('active',    mode==='api');
  if(mode==='manual') {
    const today = new Date().toISOString().split('T')[0];
    const el = document.getElementById('np-date');
    if(el && !el.value) el.value = today;
  }
}

/* ────────────────────────────────────────────
   URL POOL IMPORT
   Supports: Uniswap v3/v4, PancakeSwap,
             Aerodrome, SushiSwap, Camelot,
             Trader Joe, generic AMM patterns
──────────────────────────────────────────── */
let _urlParseTimer = null;
let _urlParsedData = null;

function urlParseDebounce() {
  clearTimeout(_urlParseTimer);
  _urlParseTimer = setTimeout(parsePoolUrl, 600);
}

async function parsePoolUrl() {
  const rawUrl = (document.getElementById('np-url-input')?.value||'').trim();
  const resEl  = document.getElementById('np-url-result');
  const errEl  = document.getElementById('np-url-err');
  const actEl  = document.getElementById('np-url-actions');
  const confBtn= document.getElementById('np-url-confirm-btn');
  if(!resEl) return;
  errEl.style.display='none'; _urlParsedData=null;
  if(confBtn) confBtn.style.display='none';
  if(!rawUrl) { resEl.innerHTML=''; return; }

  resEl.innerHTML=`<div style="font-size:13px;color:var(--text2);display:flex;align-items:center;gap:8px;padding:.5rem 0">
    <span style="display:inline-block;width:10px;height:10px;border:2px solid var(--border2);border-top-color:var(--text);border-radius:50%;animation:spin .8s linear infinite"></span>
    Detectando rede e consultando blockchain…
  </div>`;

  try {
    const parsed = await detectAndParsePoolUrl(rawUrl);
    if(!parsed) throw new Error('URL não reconhecida ou posição não encontrada.');
    _urlParsedData = parsed;
    renderUrlParseResult(parsed, resEl);
    if(confBtn) confBtn.style.display='inline-flex';
  } catch(e) {
    resEl.innerHTML='';
    errEl.textContent = e.message || 'Não foi possível interpretar esta URL.';
    errEl.style.display='block';
  }
}

async function detectAndParsePoolUrl(url) {
  const u = url.toLowerCase();

  // ── Uniswap v4 position URL ──
  // https://app.uniswap.org/positions/v4/ethereum/158318
  const uniV4Match = url.match(/uniswap\.org\/positions\/v4\/(\w+)\/(\d+)/i);
  if(uniV4Match) return await fetchUniswapPosition(uniV4Match[2], uniV4Match[1], 'Uniswap v4');

  // ── Uniswap v3 position URL ──
  // https://app.uniswap.org/positions/v3/ethereum/123456
  const uniV3Match = url.match(/uniswap\.org\/positions\/v3\/(\w+)\/(\d+)/i);
  if(uniV3Match) return await fetchUniswapPosition(uniV3Match[2], uniV3Match[1], 'Uniswap v3');

  // ── Uniswap pools page ──
  // https://app.uniswap.org/pools/123456  or  https://app.uniswap.org/#/pool/123456
  const uniPoolsMatch = url.match(/uniswap\.org\/(?:pools|#\/pool)\/(\d+)/i);
  if(uniPoolsMatch) return await fetchUniswapPosition(uniPoolsMatch[1], 'ethereum', 'Uniswap v3');

  // Uniswap legacy: https://app.uniswap.org/#/pool/123456
  const uniLegacy = url.match(/uniswap\.org\/#\/pool\/(\d+)/i);
  if(uniLegacy) return await fetchUniswapPosition(uniLegacy[1], 'ethereum', 'Uniswap v3');

  // ── PancakeSwap ──
  // https://pancakeswap.finance/liquidity/123456
  const pcakeMatch = url.match(/pancakeswap\.finance\/liquidity\/(\d+)/i);
  if(pcakeMatch) return await fetchUniswapPosition(pcakeMatch[1], 'bsc', 'PancakeSwap');

  // ── Aerodrome / Velodrome ──
  // https://aerodrome.finance/liquidity?type=cl&token0=...&token1=...
  if(u.includes('aerodrome.finance') || u.includes('velodrome.finance')) {
    return parseAerodromeUrl(url);
  }

  // ── Camelot ──
  // https://app.camelot.exchange/liquidity/increase?tokenId=123
  const camelotMatch = url.match(/camelot\.exchange.*tokenId=(\d+)/i);
  if(camelotMatch) return await fetchUniswapPosition(camelotMatch[1], 'arbitrum', 'Camelot');

  // ── SushiSwap ──
  // https://www.sushi.com/pool/1:0xABCD
  const sushiMatch = url.match(/sushi\.com\/pool\/(\d+):([0x\w]+)/i);
  if(sushiMatch) return parseSushiUrl(sushiMatch[1], sushiMatch[2]);

  // ══════════════════════════════════════════════════════════════
  //  SUI NETWORK — Cetus, Turbos, KriyaDEX, Aftermath, FlowX
  //  Sui usa Move Language e RPC própria (sui_getObject)
  //  Object IDs: 0x<64 hex chars>
  // ══════════════════════════════════════════════════════════════

  // ── Cetus Protocol (maior CLMM da Sui) ──
  // https://app.cetus.zone/liquidity/position?id=0x<objectId>
  // https://app.cetus.zone/position?id=0x<objectId>
  // https://app.cetus.zone/#/liquidity?id=0x<objectId>
  const cetusMatch = u.includes('cetus.zone');
  if(cetusMatch) {
    const objId = extractSuiObjectId(url);
    if(objId) return await fetchSuiPosition(objId, 'Cetus');
    throw new Error('Não foi possível extrair o Object ID da URL do Cetus. Copie a URL da página da posição.');
  }

  // ── Turbos Finance ──
  // https://app.turbos.finance/#/liquidity/detail?id=0x<objectId>
  // https://app.turbos.finance/liquidity/position/0x<objectId>
  if(u.includes('turbos.finance')) {
    const objId = extractSuiObjectId(url);
    if(objId) return await fetchSuiPosition(objId, 'Turbos Finance');
    throw new Error('Não foi possível extrair o Object ID da URL do Turbos. Copie a URL da posição.');
  }

  // ── KriyaDEX ──
  // https://www.kriya.finance/liquidity/position/0x<objectId>
  // https://kriya.finance/liquidity?id=0x<objectId>
  if(u.includes('kriya.finance')) {
    const objId = extractSuiObjectId(url);
    if(objId) return await fetchSuiPosition(objId, 'KriyaDEX');
    throw new Error('Não foi possível extrair o Object ID da URL do KriyaDEX.');
  }

  // ── FlowX Finance ──
  // https://flowx.finance/liquidity/position?id=0x<objectId>
  if(u.includes('flowx.finance')) {
    const objId = extractSuiObjectId(url);
    if(objId) return await fetchSuiPosition(objId, 'FlowX Finance');
    throw new Error('Não foi possível extrair o Object ID da URL do FlowX.');
  }

  // ── Aftermath Finance ──
  // https://aftermath.finance/pools/0x<poolId>
  if(u.includes('aftermath.finance')) {
    const objId = extractSuiObjectId(url);
    if(objId) return await fetchSuiPosition(objId, 'Aftermath Finance');
    throw new Error('Não foi possível extrair o Object ID da URL do Aftermath.');
  }

  // ── DeepBook (Sui order book) ──
  if(u.includes('deepbook') || u.includes('deep.book')) {
    const objId = extractSuiObjectId(url);
    if(objId) return await fetchSuiPosition(objId, 'DeepBook');
    throw new Error('URL DeepBook não reconhecida. Forneça o Object ID diretamente.');
  }

  // ── Sui Explorer direto (qualquer object ID Sui na URL) ──
  // https://suiexplorer.com/object/0x<objectId>
  // https://suivision.xyz/object/0x<objectId>
  // https://suiscan.xyz/object/0x<objectId>
  const suiExplorerMatch = u.includes('suiexplorer.com/object') ||
                           u.includes('suivision.xyz/object')   ||
                           u.includes('suiscan.xyz/object');
  if(suiExplorerMatch) {
    const objId = extractSuiObjectId(url);
    if(objId) return await fetchSuiPosition(objId, 'Sui DEX');
    throw new Error('Não foi possível extrair o Object ID do explorer Sui.');
  }

  // ── Detecção genérica de URL Sui (contém object ID 0x + 64 chars) ──
  const rawSuiId = url.match(/0x([0-9a-f]{64})/i);
  if(rawSuiId && !u.includes('uniswap') && !u.includes('ethereum')) {
    return await fetchSuiPosition('0x'+rawSuiId[1], 'Sui DEX');
  }

  // ── Generic: extract tokens from query params ──
  return parseGenericPoolUrl(url);
}

