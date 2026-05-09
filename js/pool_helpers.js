/* ══════════════════════════════════════════════════════════════════
   FEATURE 3 — POOL POSITION SNAPSHOTS (Atualização para cálculo IL)
   Salva snapshots com qty + preço + data de cada token
   Calcula IL histórico vs posição de entrada
   ══════════════════════════════════════════════════════════════════ */

function renderPoolSnapshots(pool, key) {
  const safeKey   = key.replace(/[^a-z0-9]/gi,'_');
  const snapshots = pool.snapshots || [];
  const p0A = parseFloat(pool.token1?.price||0);
  const p0B = parseFloat(pool.token2?.price||0)||1;
  const t1usd = parseFloat(pool.token1?.usd||0);
  const t2usd = parseFloat(pool.token2?.usd||0);
  const totalDep = t1usd + t2usd;

  // Build snapshot history table
  let histHtml = '';
  if(snapshots.length > 0) {
    histHtml = `<div class="card" style="padding:0;margin-top:.75rem;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:580px">
        <thead><tr style="border-bottom:1px solid var(--border)">
          ${['Data','Qtd '+pool.token1?.symbol,'Preço '+pool.token1?.symbol,'Qtd '+pool.token2?.symbol,'Preço '+pool.token2?.symbol,'Total USD',t('il_pct'),t('net_pnl_liq'),''].map(h=>
            `<th style="padding:7px 10px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap">${h}</th>`
          ).join('')}
        </tr></thead>
        <tbody>
          ${snapshots.map((s,i)=>{
            // IL calculation for this snapshot
            const r      = p0A > 0 ? parseFloat(s.priceA||p0A) / p0A : 1;
            const ilPct  = calcILFormula(r)*100;
            const qA0    = p0A>0 ? t1usd/p0A : 0;
            const qB0    = p0B>0 ? t2usd/p0B : 0;
            const curQA  = parseFloat(s.qtyA||qA0);
            const curQB  = parseFloat(s.qtyB||qB0);
            const curPA  = parseFloat(s.priceA||p0A);
            const curPB  = parseFloat(s.priceB||p0B);
            const poolVal= curQA*curPA + curQB*curPB;
            const holdVal= qA0*curPA + qB0*curPB;
            const ilUSD  = poolVal - holdVal;
            const fees   = (pool.fees||[])
              .filter(f=>!s.date||f.date<=s.date)
              .reduce((acc,f)=>acc+parseFloat(f.value||0),0);
            const netPnL = ilUSD + fees;
            const ilColor= ilPct<-5?'var(--red)':ilPct<-1?'var(--amber)':'var(--green)';
            return `<tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--bg4)'" onmouseout="this.style.background=''">
              <td style="padding:7px 10px;font-size:12px;color:var(--text2)">${s.date?new Date(s.date+'T00:00').toLocaleDateString('pt-BR'):'—'}</td>
              <td style="padding:7px 10px;color:var(--text)">${parseFloat(s.qtyA||0).toFixed(4)}</td>
              <td style="padding:7px 10px;color:var(--text2)">$${parseFloat(s.priceA||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})}</td>
              <td style="padding:7px 10px;color:var(--text)">${parseFloat(s.qtyB||0).toFixed(4)}</td>
              <td style="padding:7px 10px;color:var(--text2)">$${parseFloat(s.priceB||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})}</td>
              <td style="padding:7px 10px;font-weight:600;color:var(--text)">$${poolVal.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              <td style="padding:7px 10px;font-weight:700;color:${ilColor}">${ilPct.toFixed(2)}%</td>
              <td style="padding:7px 10px;font-weight:700;color:${netPnL>=0?'var(--green)':'var(--red)'}">${netPnL>=0?'+':'-'}$${Math.abs(netPnL).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              <td style="padding:7px 10px"><button class="btn btn-sm btn-danger" onclick="deleteSnapshot('${key}',${i})">✕</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  const today = new Date().toISOString().split('T')[0];

  return `
  <div style="margin-bottom:1rem">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.625rem">
      <div class="sec-label" style="margin-bottom:0">📸 ${appLang==='en'?'Update Position (Snapshot IL)':'Atualizar Posição (Snapshot IL)'}</div>
      <span style="font-size:11px;color:var(--text3)">${snapshots.length} ${appLang==='en'?'record':'registro'}${snapshots.length!==1?'s':''}</span>
    </div>

    <!-- Info box -->
    <div style="background:var(--blue-bg);border:1px solid rgba(99,142,255,.2);border-radius:var(--radius);padding:.75rem 1rem;margin-bottom:.875rem;font-size:12px;color:var(--blue-text);line-height:1.5">
      <strong>${appLang==='en'?'How it works:':'Como funciona:'}</strong> ${appLang==='en'?'Enter the current quantity of each token in the pool and their prices on that date. The system calculates the <strong>historical IL</strong> by comparing with your entry position, also showing net P&L (IL + fees).':'Informe a quantidade atual de cada token na pool e seus preços naquela data. O sistema calcula o <strong>IL histórico</strong> comparando com sua posição de entrada, mostrando também o P&L líquido (IL + taxas).'}
    </div>

    <!-- Input form -->
    <div class="card" style="background:var(--bg2);border-color:var(--border)">
      <div class="grid2" style="margin-bottom:.875rem">
        <!-- Token A -->
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.75rem">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:.625rem">
            ${pool.token1?.logo?`<img src="${pool.token1.logo}" style="width:22px;height:22px;border-radius:50%" onerror="this.style.display='none'">`:`<div style="width:22px;height:22px;border-radius:50%;background:var(--blue-bg);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--blue-text)">${(pool.token1?.symbol||'T1').slice(0,2)}</div>`}
            <span style="font-weight:700;font-size:13px;color:var(--text)">${pool.token1?.symbol||'Token 1'}</span>
            <span style="font-size:11px;color:var(--text3)">${appLang==='en'?'entry':'entrada'}: ${pool.token1?.qty||'—'} · $${parseFloat(pool.token1?.price||0).toFixed(4)}</span>
          </div>
          <div class="grid2" style="gap:8px">
            <div class="field" style="margin-bottom:0">
              <label style="font-size:11px">${appLang==='en'?'Current qty':'Quantidade atual'}</label>
              <input type="number" id="snap-qtyA-${safeKey}" placeholder="${pool.token1?.qty||'0.0000'}" step="0.000001" min="0"
                style="height:34px;font-size:13px">
            </div>
            <div class="field" style="margin-bottom:0">
              <label style="font-size:11px">${appLang==='en'?'Current price (USD)':'Preço atual (USD)'}</label>
              <div class="suf" style="height:34px">
                <input type="number" id="snap-prcA-${safeKey}" placeholder="${parseFloat(pool.token1?.price||0).toFixed(4)}" step="0.0001" min="0" style="height:34px;font-size:13px">
                <s style="font-size:11px">$</s>
              </div>
            </div>
          </div>
        </div>

        <!-- Token B -->
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.75rem">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:.625rem">
            ${pool.token2?.logo?`<img src="${pool.token2.logo}" style="width:22px;height:22px;border-radius:50%" onerror="this.style.display='none'">`:`<div style="width:22px;height:22px;border-radius:50%;background:var(--green-bg);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--green-text)">${(pool.token2?.symbol||'T2').slice(0,2)}</div>`}
            <span style="font-weight:700;font-size:13px;color:var(--text)">${pool.token2?.symbol||'Token 2'}</span>
            <span style="font-size:11px;color:var(--text3)">${appLang==='en'?'entry':'entrada'}: ${pool.token2?.qty||'—'} · $${parseFloat(pool.token2?.price||0).toFixed(4)}</span>
          </div>
          <div class="grid2" style="gap:8px">
            <div class="field" style="margin-bottom:0">
              <label style="font-size:11px">${appLang==='en'?'Current qty':'Quantidade atual'}</label>
              <input type="number" id="snap-qtyB-${safeKey}" placeholder="${pool.token2?.qty||'0.0000'}" step="0.000001" min="0"
                style="height:34px;font-size:13px">
            </div>
            <div class="field" style="margin-bottom:0">
              <label style="font-size:11px">${appLang==='en'?'Current price (USD)':'Preço atual (USD)'}</label>
              <div class="suf" style="height:34px">
                <input type="number" id="snap-prcB-${safeKey}" placeholder="${parseFloat(pool.token2?.price||0).toFixed(4)}" step="0.0001" min="0" style="height:34px;font-size:13px">
                <s style="font-size:11px">$</s>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Date + note + preview -->
      <div class="grid2" style="margin-bottom:.875rem">
        <div class="field" style="margin-bottom:0">
          <label>${appLang==='en'?'Snapshot date':'Data do snapshot'}</label>
          <input type="date" id="snap-date-${safeKey}" value="${today}">
        </div>
        <div class="field" style="margin-bottom:0">
          <label>${appLang==='en'?'Note (optional)':'Nota (opcional)'}</label>
          <input id="snap-note-${safeKey}" placeholder="${appLang==='en'?'e.g. rebalancing, fee collection...':'ex: rebalanceamento, coleta de taxas...'}">
        </div>
      </div>

      <!-- Live IL preview -->
      <div id="snap-preview-${safeKey}" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:.625rem .875rem;margin-bottom:.875rem;font-size:12px;display:none">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:4px">${appLang==='en'?'Calculation preview':'Prévia do cálculo'}</div>
        <div id="snap-preview-body-${safeKey}"></div>
      </div>

      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-primary btn-sm" onclick="saveSnapshot('${key}')">
          📸 ${t('save_snapshot')}
        </button>
        <button class="btn btn-sm" onclick="snapPreview('${key}')">
          🔍 Calcular IL agora
        </button>
      </div>
    </div>

    ${histHtml}
  </div>`;
}

function snapPreview(poolKey) {
  const pool    = stGet(poolKey);
  if(!pool) return;
  const safeKey = poolKey.replace(/[^a-z0-9]/gi,'_');
  const qtyA    = parseFloat(document.getElementById('snap-qtyA-'+safeKey)?.value)||parseFloat(pool.token1?.qty||0);
  const prcA    = parseFloat(document.getElementById('snap-prcA-'+safeKey)?.value)||parseFloat(pool.token1?.price||0);
  const qtyB    = parseFloat(document.getElementById('snap-qtyB-'+safeKey)?.value)||parseFloat(pool.token2?.qty||0);
  const prcB    = parseFloat(document.getElementById('snap-prcB-'+safeKey)?.value)||parseFloat(pool.token2?.price||0)||1;
  const prevEl  = document.getElementById('snap-preview-'+safeKey);
  const bodyEl  = document.getElementById('snap-preview-body-'+safeKey);
  if(!prevEl||!bodyEl) return;

  const p0A = parseFloat(pool.token1?.price||0);
  const p0B = parseFloat(pool.token2?.price||0)||1;
  const t1usd = parseFloat(pool.token1?.usd||0);
  const t2usd = parseFloat(pool.token2?.usd||0);

  if(!p0A || !prcA) {
    prevEl.style.display='block';
    bodyEl.innerHTML='<span style="color:var(--text3)">Informe os preços para calcular.</span>';
    return;
  }

  // Entry amounts
  const qA0  = p0A>0 ? t1usd/p0A : 0;
  const qB0  = p0B>0 ? t2usd/p0B : 0;

  // Current pool value
  const poolVal = qtyA*prcA + qtyB*prcB;
  // HODL value (entry qty × current prices)
  const holdVal = qA0*prcA + qB0*prcB;
  const ilUSD   = poolVal - holdVal;
  const r       = p0A>0 ? prcA/p0A : 1;
  const ilPct   = calcILFormula(r)*100;
  const fees    = (pool.fees||[]).reduce((s,f)=>s+parseFloat(f.value||0),0);
  const netPnL  = ilUSD + fees;
  const priceChg= (r-1)*100;
  const ilColor = ilPct<-5?'var(--red)':ilPct<-1?'var(--amber)':'var(--green)';

  prevEl.style.display='block';
  bodyEl.innerHTML=`<div style="display:flex;gap:16px;flex-wrap:wrap">
    <div><span style="color:var(--text3)">IL: </span><strong style="color:${ilColor}">${ilPct.toFixed(2)}%</strong> <span style="font-size:11px;color:${ilColor}">(${ilUSD<0?'-':'+'}$${Math.abs(ilUSD).toFixed(2)})</span></div>
    <div><span style="color:var(--text3)">Valor pool: </span><strong>$${poolVal.toFixed(2)}</strong></div>
    <div><span style="color:var(--text3)">HODL: </span><strong>$${holdVal.toFixed(2)}</strong></div>
    <div><span style="color:var(--text3)">P&L líquido: </span><strong style="color:${netPnL>=0?'var(--green)':'var(--red)'}">${netPnL>=0?'+':''}$${netPnL.toFixed(2)}</strong></div>
    <div><span style="color:var(--text3)">${pool.token1?.symbol} </span><span style="color:${priceChg>=0?'var(--green)':'var(--red)'}">${priceChg>=0?'+':''}${priceChg.toFixed(2)}%</span></div>
  </div>`;
}

function saveSnapshot(poolKey) {
  const pool    = stGet(poolKey);
  if(!pool) return;
  const safeKey = poolKey.replace(/[^a-z0-9]/gi,'_');
  const qtyA    = parseFloat(document.getElementById('snap-qtyA-'+safeKey)?.value);
  const prcA    = parseFloat(document.getElementById('snap-prcA-'+safeKey)?.value);
  const qtyB    = parseFloat(document.getElementById('snap-qtyB-'+safeKey)?.value);
  const prcB    = parseFloat(document.getElementById('snap-prcB-'+safeKey)?.value);
  const date    = document.getElementById('snap-date-'+safeKey)?.value;
  const note    = document.getElementById('snap-note-'+safeKey)?.value.trim()||'';

  if((!qtyA && !prcA) || !date) {
    showToast('Informe pelo menos o preço do token principal e a data.');
    return;
  }

  pool.snapshots = pool.snapshots || [];
  pool.snapshots.push({
    date, note, ts: Date.now(),
    qtyA:  qtyA  || parseFloat(pool.token1?.qty||0),
    prcA:  prcA  || parseFloat(pool.token1?.price||0),
    qtyB:  qtyB  || parseFloat(pool.token2?.qty||0),
    prcB:  prcB  || parseFloat(pool.token2?.price||0)||1,
  });
  // Sort by date
  pool.snapshots.sort((a,b)=>new Date(a.date)-new Date(b.date));
  stSet(poolKey, pool);
  syncPoolToWallet(pool, poolKey);
  showToast('Snapshot salvo! IL calculado no histórico.');
  closePoolDetail();
  openPoolDetail(poolKey);
}

function deleteSnapshot(poolKey, idx) {
  if(!confirm('Remover este snapshot?')) return;
  const pool = stGet(poolKey);
  if(!pool) return;
  pool.snapshots.splice(idx,1);
  stSet(poolKey, pool);
  closePoolDetail();
  openPoolDetail(poolKey);
}


function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;background:var(--text);color:var(--bg);padding:10px 18px;border-radius:var(--radius);font-size:14px;z-index:300;transition:opacity .3s';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 2200);
}

/**
 * Calcula o valor atual da pool
 * Pool Value = Snapshot mais recente (ou Depositado) + Taxas coletadas
 */
function calculatePoolValue(pool) {
  const snapshots = pool.snapshots || [];
  const fees      = pool.fees || [];
  const totalFees = fees.reduce((s, f) => s + parseFloat(f.value || 0), 0);
  const totalDep  = parseFloat(pool.token1?.usd || 0) + parseFloat(pool.token2?.usd || 0);

  if (snapshots.length > 0) {
    // Modo 1 — COM snapshot: Valor no Pool = ultimo snapshot + taxas coletadas
    const latestSnapshot = snapshots[snapshots.length - 1];
    const snapshotValue  =
      (parseFloat(latestSnapshot.qtyA || 0) * parseFloat(latestSnapshot.prcA || 0)) +
      (parseFloat(latestSnapshot.qtyB || 0) * parseFloat(latestSnapshot.prcB || 0));
    return {
      poolValue: snapshotValue + totalFees,
      baseValue: snapshotValue,
      totalFees,
      hasSnapshot: true,
      latestSnapshot
    };
  } else {
    // Modo 2 — SEM snapshot: Valor no Pool = depositado + taxas coletadas
    return {
      poolValue: totalDep + totalFees,
      baseValue: totalDep,
      totalFees,
      hasSnapshot: false,
      latestSnapshot: null
    };
  }
}

function openPoolDetail(key) {
  const pool = stGet(key);
  if(!pool) return;
  
  // Usar função auxiliar para calcular pool value
  const { poolValue, baseValue, totalFees, hasSnapshot, latestSnapshot } = calculatePoolValue(pool);
  
  const t1usd = parseFloat(pool.token1.usd||0);
  const t2usd = parseFloat(pool.token2.usd||0);
  const totalDeposit = t1usd + t2usd;
  const startDate = pool.date ? new Date(pool.date+'T00:00:00').toLocaleDateString('pt-BR') : '—';
  const daysSince = pool.date ? Math.max(0, Math.floor((Date.now() - new Date(pool.date+'T00:00:00'))/(1000*60*60*24))) : 0;
  const hasRange = pool.rangeMin || pool.rangeMax;
  const isDCA = !pool.token2.symbol;

  // ROI/M — calculado antes do template literal para evitar backtick aninhado
  const _netGain   = poolValue - totalDeposit;
  const _roiTotal  = totalDeposit > 0 ? (_netGain / totalDeposit) * 100 : 0;
  const _roiM      = daysSince   > 0 ? _roiTotal * (30 / daysSince)    : 0;
  const _roiColor  = _roiM >= 0 ? 'var(--green)' : 'var(--red)';
  const _roiBg     = _roiM >= 0 ? 'rgba(57,255,138,.08)' : 'rgba(255,80,80,.08)';
  const _roiBorder = _roiM >= 0 ? 'rgba(57,255,138,.25)' : 'rgba(255,80,80,.25)';
  const _netFmt    = (_netGain>=0?'+':'-')+'$'+Math.abs(_netGain).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const _varIL     = _netGain - totalFees;
  const _varILFmt  = (_varIL>=0?'+':'-')+'$'+Math.abs(_varIL).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const roiMHtml   = (totalDeposit <= 0 || daysSince <= 0) ? '' : `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:1rem">
      <div style="background:${_roiBg};border:1px solid ${_roiBorder};border-radius:var(--radius);padding:1rem">
        <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;font-weight:600;margin-bottom:6px">📈 ROI/M</div>
        <div style="font-size:30px;font-weight:800;color:${_roiColor}">${_roiM>=0?'+':''}${_roiM.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}%</div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px;line-height:1.6">
          Retorno médio mensal<br>
          <span style="color:var(--text2)">Base: ${daysSince}d ativo · Capital $${totalDeposit.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
        </div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1rem">
        <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;font-weight:600;margin-bottom:6px">🧮 Composição ROI/M</div>
        <div style="font-size:12px;color:var(--text2);line-height:2">
          <div style="display:flex;justify-content:space-between">
            <span>Taxas coletadas</span>
            <strong style="color:var(--green)">+$${totalFees.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span>Variação + IL</span>
            <strong style="color:${_varIL>=0?'var(--green)':'var(--red)'}">${_varILFmt}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:4px;margin-top:4px">
            <span>P&L líquido</span>
            <strong style="color:${_netGain>=0?'var(--green)':'var(--red)'}">${_netFmt}</strong>
          </div>
        </div>
        <div style="font-size:10px;color:var(--text3);margin-top:6px">
          Fórmula: (Taxas + ΔPreço − IL) ÷ Capital × (30 ÷ ${daysSince}d)
        </div>
      </div>
    </div>`;

  let feesHtml = '';
  const fees = pool.fees || [];
  if(fees.length === 0) {
    feesHtml = `<div style="font-size:13px;color:var(--text2);padding:.5rem 0">Nenhuma taxa registrada ainda.</div>`;
  } else {
    feesHtml = `<table style="margin-top:.25rem">
      <thead><tr><th>Data</th><th>Valor (USD)</th><th>Nota</th><th></th></tr></thead>
      <tbody>
        ${fees.map((f,i)=>`<tr>
          <td>${f.date ? new Date(f.date+'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
          <td style="color:var(--green);font-weight:500">$${parseFloat(f.value||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
          <td style="color:var(--text2)">${f.note||'—'}</td>
          <td><button class="btn btn-sm btn-danger" onclick="deleteFee('${key}',${i})">✕</button></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pool-detail-overlay';
  overlay.style.cssText = 'overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  overlay.innerHTML = `
  <div class="modal" style="max-width:900px;margin:auto;width:100%">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.25rem">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="position:relative;width:${isDCA?'44px':'64px'};height:44px;flex-shrink:0">
          ${pool.token1?.logo
            ?`<img src="${pool.token1.logo}" style="width:40px;height:40px;border-radius:50%;border:2.5px solid var(--bg2);position:absolute;left:0;top:0;z-index:2;background:var(--bg3)" onerror="this.style.display='none'">`
            :`<div style="width:40px;height:40px;border-radius:50%;background:var(--blue-bg);border:2.5px solid var(--bg2);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:var(--blue-text);position:absolute;left:0;top:0;z-index:2">${(pool.token1?.symbol||'?').slice(0,2)}</div>`}
          ${!isDCA
            ?(pool.token2?.logo
              ?`<img src="${pool.token2.logo}" style="width:34px;height:34px;border-radius:50%;border:2.5px solid var(--bg2);position:absolute;left:22px;top:10px;z-index:1;background:var(--bg3)" onerror="this.style.display='none'">`
              :`<div style="width:34px;height:34px;border-radius:50%;background:var(--green-bg);border:2.5px solid var(--bg2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--green-text);position:absolute;left:22px;top:10px;z-index:1">${(pool.token2?.symbol||'?').slice(0,2)}</div>`)
            :''}
        </div>
        <div>
          <h3 style="margin-bottom:2px">${pool.name}</h3>
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
            <span class="badge bb">${pool.exchange}</span>
            <span class="badge bg">${pool.network}</span>
            ${isDCA?'<span class="badge ba">DCA single-token</span>':''}
            ${pool.fee?`<span class="badge" style="background:var(--bg4);color:var(--text2);border:1px solid var(--border)">Fee ${pool.fee}%</span>`:''}
          </div>
        </div>
      </div>
      <button class="btn btn-sm" onclick="closePoolDetail()">✕</button>
    </div>

    <div class="grid4" style="margin-bottom:1rem">
      <div class="mc"><div class="lbl">Início</div><div class="val" style="font-size:16px">${startDate}</div></div>
      <div class="mc"><div class="lbl">${t('active_days')}</div><div class="val">${daysSince}</div></div>
      <div class="mc"><div class="lbl">${t('deposited')}</div><div class="val" style="font-size:16px">${totalDeposit>0?'$'+totalDeposit.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—'}</div></div>
      <div class="mc"><div class="lbl">${t('fees')}</div><div class="val pos" style="font-size:16px">${totalFees>0?'$'+totalFees.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'$0,00'}</div></div>
    </div>


    <!-- ROI/M -->
    ${roiMHtml}

    <!-- NOVO: Card com Pool Value (Snapshot ou Depositado + Taxas) -->
    <div class="card" style="background:rgba(57,255,138,.08);border:1px solid rgba(57,255,138,.2);padding:1.25rem;margin-bottom:1.5rem">
      <div style="font-size:11px;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em;font-weight:600">💰 Valor Atual do Pool</div>
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:6px">
        <div style="font-size:32px;font-weight:800;color:var(--green)">$${poolValue.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      </div>
      <div style="font-size:12px;color:var(--text3);line-height:1.6">
        ${hasSnapshot ? `<strong>📸 Snapshot</strong> ${new Date(latestSnapshot.date+'T00:00').toLocaleDateString('pt-BR')} + <strong>Taxas coletadas</strong><br><span style="color:var(--text2);font-size:11px">Valor do snapshot: $${baseValue.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} + $${totalFees.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} em taxas</span>` : `<strong>Depositado</strong> + <strong>Taxas coletadas</strong><br><span style="color:var(--text2);font-size:11px">$${baseValue.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} depositado + $${totalFees.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} em taxas</span>`}
      </div>
    </div>

    <div class="sec-label">Tokens</div>
    <div class="${isDCA?'':'grid2'}" style="margin-bottom:1rem">
      <div class="mc">
        ${pool.token1.logo?`<img src="${pool.token1.logo}" style="width:32px;height:32px;border-radius:50%;margin-bottom:6px" onerror="this.style.display='none'">`:''}
        <div style="font-weight:500;font-size:14px;color:var(--text);margin-bottom:4px">${pool.token1.symbol||'Token 1'}</div>
        ${pool.token1.price?`<div style="font-size:12px;color:var(--text2)">Preço entrada: <strong>$${parseFloat(pool.token1.price).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})}</strong></div>`:''}
        <div style="font-size:12px;color:var(--text2)">${pool.token1.qty ? pool.token1.qty+' unidades' : '—'}</div>
        <div style="font-size:12px;color:var(--text2)">${pool.token1.usd ? '$'+parseFloat(pool.token1.usd).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '—'}</div>
        ${pool.token1.usd0?`<div style="font-size:11px;color:var(--text3);margin-top:2px">USD inicial: <strong>$${parseFloat(pool.token1.usd0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></div>`:''}
        ${pool.token1.qty0?`<div style="font-size:11px;color:var(--text3)">Qtd inicial: <strong>${pool.token1.qty0}</strong></div>`:''}
      </div>
      ${!isDCA?`<div class="mc">
        ${pool.token2.logo?`<img src="${pool.token2.logo}" style="width:32px;height:32px;border-radius:50%;margin-bottom:6px" onerror="this.style.display='none'">`:''}
        <div style="font-weight:500;font-size:14px;color:var(--text);margin-bottom:4px">${pool.token2.symbol||'Token 2'}</div>
        ${pool.token2.price?`<div style="font-size:12px;color:var(--text2)">Preço entrada: <strong>$${parseFloat(pool.token2.price).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})}</strong></div>`:''}
        <div style="font-size:12px;color:var(--text2)">${pool.token2.qty ? pool.token2.qty+' unidades' : '—'}</div>
        <div style="font-size:12px;color:var(--text2)">${pool.token2.usd ? '$'+parseFloat(pool.token2.usd).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '—'}</div>
      </div>`:''}
    </div>

    ${!isDCA && pool.token1.price ? `
    <div class="sec-label" id="il-detail-label-${key.replace(/[^a-z0-9]/gi,'_')}">Impermanent Loss</div>
    <div id="il-detail-${key.replace(/[^a-z0-9]/gi,'_')}" style="margin-bottom:1rem">
      <div style="display:flex;align-items:center;gap:8px;padding:.75rem;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);font-size:13px;color:var(--text2)">
        <span style="display:inline-block;width:10px;height:10px;border:2px solid var(--border2);border-top-color:var(--text);border-radius:50%;animation:spin .8s linear infinite"></span>
        Buscando preço atual de ${pool.token1.symbol}...
      </div>
    </div>` : ''}

    ${hasRange?`
    <div class="sec-label">Range de preço</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="mc"><div class="lbl">Mínimo</div><div class="val" style="font-size:16px">${pool.rangeMin?'$'+parseFloat(pool.rangeMin).toLocaleString('pt-BR'):'—'}</div></div>
      <div class="mc"><div class="lbl">Máximo</div><div class="val" style="font-size:16px">${pool.rangeMax?'$'+parseFloat(pool.rangeMax).toLocaleString('pt-BR'):'—'}</div></div>
    </div>`:''}

    ${!isDCA ? renderPoolSnapshots(pool, key) : ''}

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
      <div class="sec-label" style="margin-bottom:0">Taxas coletadas</div>
      <span style="font-size:13px;color:var(--green);font-weight:500">Total: $${totalFees.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
    </div>

    <div id="fees-list-${key.replace(/[^a-z0-9]/gi,'_')}" style="margin-bottom:1rem">${feesHtml}</div>

    <div class="card" style="margin-bottom:1rem;background:var(--bg2);border-color:var(--border2)">
      <div class="sec-label" style="margin-bottom:.875rem">Registrar taxas coletadas</div>
      <div class="grid2" style="margin-bottom:.75rem">
        <div class="field">
          <label>Data da coleta</label>
          <input type="date" id="fee-date-inp">
        </div>
        <div class="field">
          <label>Nota (opcional)</label>
          <input id="fee-note-inp" placeholder="ex: claim semanal">
        </div>
      </div>
      <div class="grid2" style="margin-bottom:.75rem">
        <div class="field">
          <label>Qtd de <strong>${pool.token1?.symbol||'Token A'}</strong> recebida</label>
          <div class="suf">
            <input type="number" id="fee-qty-a" placeholder="0.000000" step="any" min="0"
              oninput="previewFeeUSD('${key}')">
            <s>${pool.token1?.symbol||'A'}</s>
          </div>
        </div>
        <div class="field">
          <label>Qtd de <strong>${pool.token2?.symbol||'Token B'}</strong> recebida</label>
          <div class="suf">
            <input type="number" id="fee-qty-b" placeholder="0.000000" step="any" min="0"
              oninput="previewFeeUSD('${key}')">
            <s>${pool.token2?.symbol||'B'}</s>
          </div>
        </div>
      </div>
      <div id="fee-usd-preview" style="font-size:12px;color:var(--text2);padding:.5rem .625rem;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:.875rem;display:none">
        💰 Valor estimado: <strong id="fee-usd-val" style="color:var(--green)">$0.00</strong>
        <span style="color:var(--text3);font-size:11px"> · baseado no preço de entrada dos tokens</span>
      </div>
      <div>
        <button class="btn btn-primary btn-sm" onclick="addFee('${key}')">💧 Registrar coleta → Yield</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" onclick="closePoolDetail()">Fechar</button>
      <button class="btn btn-sm" style="color:var(--blue);border-color:var(--blue)" onclick="openShareModal('${key}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right:4px;vertical-align:-2px"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Compartilhar resultados
      </button>
      <button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="deletePool('${key}')">${t('delete_pool')}</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('fee-date-inp').value = today;

  // Async fetch live IL for detail modal
  if(!isDCA && pool.token1.price) {
    fetchDetailIL(pool, key.replace(/[^a-z0-9]/gi,'_'));
  }
}

function closePoolDetail() {
  const el = document.getElementById('pool-detail-overlay');
  if(el) el.remove();
}

/**
 * Deleta uma pool com confirmação
 */
function deletePool(key, poolName) {
  if(!confirm(`Tem certeza que deseja deletar a pool "${poolName}"?\n\nEsta ação não pode ser desfeita!`)) {
    return;
  }
  
  try {
    // Remover do localStorage
    localStorage.removeItem(key);
    stSet(key, null);
    
    // Fechar modal se estiver aberto
    closePoolDetail();
    
    // Recarregar a página de posições
    loadPositions();
    
    // Mostrar mensagem de sucesso
    showToast('✓ Pool deletada com sucesso!');
  } catch(e) {
    console.error('Erro ao deletar pool:', e);
    showToast('✗ Erro ao deletar pool');
  }
}

async function fetchDetailIL(pool, safeKey) {
  const el = document.getElementById('il-detail-'+safeKey);
  if(!el) return;

  const p0_A  = parseFloat(pool.token1?.price || 0);
  const p0_B  = parseFloat(pool.token2?.price  || 0);
  const t1usd = parseFloat(pool.token1?.usd    || 0);
  const t2usd = parseFloat(pool.token2?.usd    || 0);
  const totalDep = t1usd + t2usd;
  const fees  = (pool.fees||[]).reduce((s,f)=>s+parseFloat(f.value||0),0);

  // Quantidades originais na entrada
  const amtA0 = p0_A > 0 ? t1usd / p0_A : 0;
  const amtB0 = p0_B > 0 ? t2usd / p0_B : 0;

  const snapshots   = pool.snapshots || [];
  const hasSnapshot = snapshots.length > 0;

  // Sem snapshot: solicitar ao usuário
  if (!hasSnapshot) {
    el.innerHTML = `
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.875rem 1rem;margin-bottom:.5rem;font-size:13px;color:var(--text3)">
      Sem snapshot registrado. Adicione um snapshot com as quantidades e preços atuais dos tokens para calcular o IL com precisão.
    </div>`;
    return;
  }

  // Usar último snapshot
  const snap  = snapshots[snapshots.length - 1];
  const qtyA  = parseFloat(snap.qtyA || 0);
  const prcA  = parseFloat(snap.prcA || 0);
  const qtyB  = parseFloat(snap.qtyB || 0);
  const prcB  = parseFloat(snap.prcB || 0);

  if (!p0_A || !prcA) {
    el.innerHTML = `<div style="font-size:13px;color:var(--text3);padding:.75rem;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius)">
      Sem preço de entrada ou snapshot incompleto. Verifique os dados da pool.
    </div>`;
    return;
  }

  // poolVal: valor real com as quantidades rebalanceadas registradas no snapshot
  const poolVal = qtyA * prcA + qtyB * prcB;

  // holdVal: o que valeria se tivesse segurado as quantidades originais aos preços do snapshot
  const holdVal = amtA0 * prcA + amtB0 * prcB;

  // IL calculado diretamente das quantidades reais — sem estimativa de fórmula AMM
  const ilUSD = poolVal - holdVal;
  const il    = holdVal > 0 ? (poolVal / holdVal) - 1 : 0;

  // P&L e Valor no pool baseados no snapshot
  // Valor no pool = snapshot + taxas (Modo 1)
  // P&L Liquido = IL + taxas coletadas
  const displayNetPnL  = ilUSD + fees;
  const displayPoolVal = poolVal + fees;

  const netPnL   = displayNetPnL;
  const ilColor  = il < -0.05 ? 'var(--red)' : il < -0.01 ? 'var(--amber)' : 'var(--green)';
  const snapDate = snap.date ? new Date(snap.date+'T00:00:00').toLocaleDateString('pt-BR') : '—';
  const fmtP     = v => v<0.01?'$'+v.toFixed(6):v<1?'$'+v.toFixed(4):'$'+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

  el.innerHTML = `
  <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.875rem 1rem;margin-bottom:.5rem">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;flex-wrap:wrap;gap:6px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:12px;color:var(--text2)">${pool.token1.symbol}/${pool.token2?.symbol||'—'}</span>
        <span style="font-size:9px;background:var(--bg4);color:var(--text3);padding:1px 6px;border-radius:99px">snapshot ${snapDate}</span>
      </div>
      <span style="font-size:12px;color:var(--text2)">
        ${pool.token1.symbol}: entrada ${fmtP(p0_A)} → snapshot ${fmtP(prcA)}
        &nbsp;|&nbsp;
        ${pool.token2?.symbol||'B'}: entrada ${fmtP(p0_B)} → snapshot ${fmtP(prcB)}
      </span>
    </div>
    <div class="grid4">
      <div class="mc"><div class="lbl">Impermanent Loss</div><div class="val" style="font-size:18px;color:${ilColor}">${(il*100).toFixed(2)}%</div><div class="sub2">${ilUSD<0?'-':'+'}${fmt(Math.abs(ilUSD))}</div></div>
      <div class="mc"><div class="lbl">${t('pool_value')}</div><div class="val" style="font-size:18px">${fmt(displayPoolVal)}</div><div class="sub2">${appLang==='en'?'snapshot + fees':'snapshot + taxas'}</div></div>
      <div class="mc"><div class="lbl">${t('hodl_value')}</div><div class="val" style="font-size:18px;color:${holdVal<totalDep?'var(--amber)':'var(--text)'}">${fmt(holdVal)}${holdVal<totalDep?` <span style="font-size:11px;color:var(--amber)">▼</span>`:''}</div></div>
      <div class="mc"><div class="lbl">${t('net_pnl')}</div><div class="val ${netPnL>=0?'pos':'neg'}" style="font-size:18px">${netPnL>=0?'+':'-'}${fmt(Math.abs(netPnL))}</div><div class="sub2">IL + ${t('fees').toLowerCase()}</div></div>
    </div>
  </div>`;
}


/* ── Preview fee USD value while typing ── */
function previewFeeUSD(poolKey) {
  const pool = stGet(poolKey);
  if(!pool) return;
  const qtyA = parseFloat(document.getElementById('fee-qty-a')?.value || 0);
  const qtyB = parseFloat(document.getElementById('fee-qty-b')?.value || 0);
  if(qtyA <= 0 && qtyB <= 0) {
    document.getElementById('fee-usd-preview').style.display = 'none';
    return;
  }
  const priceA = parseFloat(pool.token1?.price || pool.token1?.priceEntry || 0);
  const priceB = parseFloat(pool.token2?.price || pool.token2?.priceEntry || 1); // stablecoin fallback
  const est = (qtyA * priceA) + (qtyB * priceB);
  const prev = document.getElementById('fee-usd-preview');
  const val  = document.getElementById('fee-usd-val');
  if(prev) prev.style.display = 'block';
  if(val)  val.textContent = '$' + est.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addFee(poolKey) {
  const date  = document.getElementById('fee-date-inp')?.value;
  const qtyA  = parseFloat(document.getElementById('fee-qty-a')?.value || 0);
  const qtyB  = parseFloat(document.getElementById('fee-qty-b')?.value || 0);
  const note  = document.getElementById('fee-note-inp')?.value.trim() || '';

  if(!date) { showToast('Informe a data da coleta.'); return; }
  if(qtyA <= 0 && qtyB <= 0) { showToast('Informe a quantidade de pelo menos um token.'); return; }

  const pool = stGet(poolKey);
  if(!pool) return;

  const symA   = pool.token1?.symbol || 'A';
  const symB   = pool.token2?.symbol || 'B';
  const priceA = parseFloat(pool.token1?.price || pool.token1?.priceEntry || 0);
  const priceB = parseFloat(pool.token2?.price || pool.token2?.priceEntry || 1);
  const valueUSD = (qtyA * priceA) + (qtyB * priceB);
  const poolName = pool.name || `${symA}/${symB}`;

  // ── Save fee record on pool (backward-compatible: keeps value field) ──
  pool.fees = pool.fees || [];
  pool.fees.push({
    date,
    qtyA,
    qtyB,
    symA,
    symB,
    value: valueUSD,   // kept for existing total/APR calculations
    valueUSD,
    note,
  });
  stSet(poolKey, pool);
  fsPersistKey(poolKey, pool);

  // ── Save yield entry (Option C — separate from wallet assets) ──
  const yEntries = yLoad();
  yEntries.push({
    ts:       Date.now(),
    date,
    poolKey,
    poolName,
    symA,
    symB,
    qtyA,
    qtyB,
    priceA,
    priceB,
    valueUSD,
    note,
    source:   'pool_fee',
  });
  ySave(yEntries);

  showToast(`💧 Taxa registrada! +$${valueUSD.toFixed(2)} em Yield.`, 'success');
  closePoolDetail();
  openPoolDetail(poolKey);
}

function deleteFee(poolKey, idx) {
  if(!confirm('Remover esta taxa?')) return;
  const pool = stGet(poolKey);
  if(!pool) return;
  pool.fees.splice(idx, 1);
  stSet(poolKey, pool);
  fsPersistKey(poolKey, pool);
  closePoolDetail();
  openPoolDetail(poolKey);
}

function deletePool(key) {
  if(!confirm('Excluir esta pool permanentemente?')) return;
  stDel(key);
  fsDeleteKey(key);
  unsyncPoolFromWallet(key);
  closePoolDetail();
  loadPositions();
  showToast('Pool excluída.');
}

function calcILFormula(r) { return 2*Math.sqrt(r)/(1+r)-1; }
function fmt(n) { return '$'+Math.abs(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtPct(n) { return (n>=0?'+':'')+n.toFixed(2)+'%'; }

function renderIL() {
  document.getElementById('panel-il').innerHTML = `
  <div class="card">
    <div class="sec-label">Posição inicial</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field"><label>Token A</label><input id="il-tA" value="ETH" oninput="calcIL()"></div>
      <div class="field"><label>Token B</label><input id="il-tB" value="USDC" oninput="calcIL()"></div>
      <div class="field"><label>Preço inicial Token A (USD)</label><div class="suf"><input type="number" id="il-p0" value="2000" oninput="calcIL()"><s>$</s></div></div>
      <div class="field"><label>Valor depositado (USD)</label><div class="suf"><input type="number" id="il-dep" value="10000" oninput="calcIL()"><s>$</s></div></div>
    </div>
    <hr class="divider">
    <div class="sec-label">Variação de preço</div>
    <div class="slider-row">
      <label>Novo preço <span id="il-tA-lbl">ETH</span></label>
      <input type="range" min="100" max="20000" step="50" value="3000" id="il-sl" oninput="ilSync();calcIL()" style="flex:1">
      <div class="sv" id="il-sv">$3.000</div>
    </div>
    <input type="hidden" id="il-p1" value="3000">
  </div>
  <div class="grid4" style="margin-bottom:1rem">
    <div class="mc"><div class="lbl">Impermanent Loss</div><div class="val neg" id="il-pct">—</div><div class="sub2" id="il-usd">em USD</div></div>
    <div class="mc"><div class="lbl">${t('pool_value')}</div><div class="val" id="il-pv">—</div><div class="sub2">${appLang==='en'?'if withdrawn now':'se retirar agora'}</div></div>
    <div class="mc"><div class="lbl">${t('hodl_value')}</div><div class="val" id="il-hv">—</div><div class="sub2">${appLang==='en'?'without providing liquidity':'sem fornecer liquidez'}</div></div>
    <div class="mc"><div class="lbl">Variação do preço</div><div class="val" id="il-pc">—</div><div class="sub2">vs inicial</div></div>
  </div>
  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
      <div class="sec-label" style="margin-bottom:0">Curva de IL</div>
      <button class="btn btn-sm btn-primary" onclick="openSaveModal('il')">Salvar posição</button>
    </div>
    <div class="canvas-wrap"><canvas id="il-chart"></canvas></div>
  </div>
  <div class="card">
    <div class="sec-label">Tabela de cenários</div>
    <div style="overflow-x:auto"><table id="il-table">
      <thead><tr><th>Variação</th><th>Novo preço</th><th>Valor no pool</th><th>HODL</th><th>IL (USD)</th><th>IL (%)</th></tr></thead>
      <tbody id="il-tbody"></tbody>
    </table></div>
  </div>`;
  calcIL();
}

function ilSync() {
  const v = document.getElementById('il-sl').value;
  document.getElementById('il-p1').value = v;
  document.getElementById('il-sv').textContent = '$'+Number(v).toLocaleString('pt-BR');
}

function calcIL() {
  const p0 = parseFloat(document.getElementById('il-p0').value)||1;
  const p1 = parseFloat(document.getElementById('il-p1').value)||parseFloat(document.getElementById('il-sl').value)||1;
  const dep = parseFloat(document.getElementById('il-dep').value)||10000;
  const tA = document.getElementById('il-tA').value||'A';
  document.getElementById('il-tA-lbl').textContent = tA;
  const ratio = p1/p0;
  const il = calcILFormula(ratio);
  const half = dep/2, amtA0 = half/p0, amtB0 = half, k = amtA0*amtB0;
  const holdVal = amtA0*p1+amtB0;
  const amtA1 = Math.sqrt(k/p1), amtB1 = Math.sqrt(k*p1);
  const poolVal = amtA1*p1+amtB1;
  const ilUSD = poolVal-holdVal;
  const priceChg = (ratio-1)*100;
  document.getElementById('il-pct').textContent = (il*100).toFixed(2)+'%';
  document.getElementById('il-usd').textContent = (ilUSD<0?'-':'')+fmt(Math.abs(ilUSD));
  document.getElementById('il-pv').textContent = fmt(poolVal);
  document.getElementById('il-hv').textContent = fmt(holdVal);
  document.getElementById('il-pc').textContent = fmtPct(priceChg);
  document.getElementById('il-pc').className = 'val '+(priceChg>=0?'pos':'neg');
  drawILChart(p0);
  updateILTable(p0, dep);
}

function drawILChart(p0) {
  const ctx = document.getElementById('il-chart').getContext('2d');
  const labels=[], data=[];
  for(let r=0.1;r<=5;r+=0.05){ labels.push(+(p0*r).toFixed(0)); data.push(+(calcILFormula(r)*100).toFixed(3)); }
  if(ilChart) ilChart.destroy();
  ilChart = new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'IL (%)',data,borderColor:'#D85A30',backgroundColor:'rgba(216,90,48,0.08)',fill:true,tension:0.4,pointRadius:0,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.parsed.y.toFixed(2)+'%'}}},scales:{x:{ticks:{maxTicksLimit:8,color:'#888',font:{size:11}},grid:{color:'rgba(128,128,128,0.1)'}},y:{ticks:{color:'#888',font:{size:11},callback:v=>v+'%'},grid:{color:'rgba(128,128,128,0.1)'}}}}});
  watermarkChart(ilChart);
}

function updateILTable(p0, dep) {
  const mults = [0.1,0.25,0.5,0.75,0.9,1.1,1.25,1.5,2,3,4,5];
  const half=dep/2, amtA0=half/p0, amtB0=half, k=amtA0*amtB0;
  let rows='';
  mults.forEach(m=>{
    const p1=p0*m, ratio=m, il=calcILFormula(ratio)*100;
    const holdVal=amtA0*p1+amtB0;
    const amtA1=Math.sqrt(k/p1), amtB1=Math.sqrt(k*p1), poolVal=amtA1*p1+amtB1;
    const ilUSD=poolVal-holdVal, chg=(m-1)*100;
    rows+=`<tr>
      <td><span class="badge ${chg>=0?'bg':'br'}">${chg>=0?'+':''}${chg.toFixed(0)}%</span></td>
      <td>$${p1.toLocaleString('pt-BR')}</td>
      <td>${fmt(poolVal)}</td><td>${fmt(holdVal)}</td>
      <td style="color:var(--red)">${fmt(ilUSD)}</td>
      <td style="color:var(--red)">${il.toFixed(2)}%</td>
    </tr>`;
  });
  document.getElementById('il-tbody').innerHTML = rows;
}

function renderYield() {
  if(!document.getElementById('panel-yield')) return;
  document.getElementById('panel-yield').innerHTML = `
  <div class="card">
    <div class="sec-label">Parâmetros da pool</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field"><label>Par</label><input id="y-pair" value="ETH/USDC" oninput="calcY()"></div>
      <div class="field"><label>Fee tier</label><select id="y-fee" onchange="calcY()"><option value="0.01">0.01%</option><option value="0.05">0.05%</option><option value="0.3" selected>0.30%</option><option value="1">1.00%</option></select></div>
      <div class="field"><label>Valor depositado (USD)</label><div class="suf"><input type="number" id="y-dep" value="10000" oninput="calcY()"><s>$</s></div></div>
      <div class="field"><label>TVL da pool (USD)</label><div class="suf"><input type="number" id="y-tvl" value="5000000" oninput="calcY()"><s>$</s></div></div>
      <div class="field"><label>Volume diário (USD)</label><div class="suf"><input type="number" id="y-vol" value="2000000" oninput="calcY()"><s>$</s></div></div>
      <div class="field"><label>Dias no pool</label><input type="number" id="y-days" value="30" oninput="calcY()"></div>
      <div class="field"><label>APR incentivos extras (%)</label><div class="suf"><input type="number" id="y-extra" value="0" oninput="calcY()"><s>%</s></div></div>
      <div class="field"><label>IL estimado (%/ano)</label><div class="suf"><input type="number" id="y-il" value="2" oninput="calcY()"><s>%</s></div></div>
    </div>
  </div>
  <div class="grid4" style="margin-bottom:1rem">
    <div class="mc"><div class="lbl">Fee APR</div><div class="val pos" id="y-fapr">—</div></div>
    <div class="mc"><div class="lbl">APR total</div><div class="val pos" id="y-tapr">—</div></div>
    <div class="mc"><div class="lbl">APR líquido</div><div class="val" id="y-napr">—</div></div>
    <div class="mc"><div class="lbl">Rendimento líquido</div><div class="val" id="y-net">—</div><div class="sub2" id="y-netlbl">no período</div></div>
  </div>
  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
      <div class="sec-label" style="margin-bottom:0">Projeção acumulada</div>
      <button class="btn btn-sm btn-primary" onclick="openSaveModal('yield')">Salvar posição</button>
    </div>
    <div class="canvas-wrap"><canvas id="y-chart"></canvas></div>
  </div>`;
  calcY();
}

function calcY() {
  if(!document.getElementById('y-dep')) return;
  const dep=parseFloat(document.getElementById('y-dep').value)||10000;
  const tvl=parseFloat(document.getElementById('y-tvl').value)||5000000;
  const vol=parseFloat(document.getElementById('y-vol').value)||2000000;
  const fee=parseFloat(document.getElementById('y-fee').value)||0.3;
  const days=parseFloat(document.getElementById('y-days').value)||30;
  const extra=parseFloat(document.getElementById('y-extra').value)||0;
  const ilEst=parseFloat(document.getElementById('y-il').value)||0;
  const share=dep/tvl, dailyFee=vol*(fee/100)*share;
  const feeApr=(dailyFee/dep)*365*100, totalApr=feeApr+extra, netApr=totalApr-ilEst;
  const periodFees=dailyFee*days, extraP=dep*(extra/100)*(days/365), ilLoss=dep*(ilEst/100)*(days/365);
  const net=periodFees+extraP-ilLoss;
  document.getElementById('y-fapr').textContent=feeApr.toFixed(2)+'%';
  document.getElementById('y-tapr').textContent=totalApr.toFixed(2)+'%';
  document.getElementById('y-napr').textContent=netApr.toFixed(2)+'%';
  document.getElementById('y-napr').className='val '+(netApr>=0?'pos':'neg');
  document.getElementById('y-net').textContent=(net>=0?'+':'')+fmt(net);
  document.getElementById('y-net').className='val '+(net>=0?'pos':'neg');
  document.getElementById('y-netlbl').textContent='em '+days+' dias';
  drawYChart(dailyFee, days, dep, extra, ilEst);
}

function drawYChart(dailyFee, totalDays, dep, extraApr, ilEst) {
  if(!document.getElementById('y-chart')) return;
  const ctx=document.getElementById('y-chart').getContext('2d');
  const labels=[],fees=[],nets=[];
  const step=Math.max(1,Math.floor(totalDays/30));
  for(let d=0;d<=totalDays;d+=step){
    labels.push('Dia '+d);
    const f=dailyFee*d, e=dep*(extraApr/100)*(d/365), il=dep*(ilEst/100)*(d/365);
    fees.push(+f.toFixed(2)); nets.push(+(f+e-il).toFixed(2));
  }
  if(yChart) yChart.destroy();
  yChart=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Fees',data:fees,borderColor:'#1D9E75',backgroundColor:'rgba(29,158,117,0.08)',fill:true,tension:0.3,pointRadius:0,borderWidth:2},{label:'Líquido',data:nets,borderColor:'#378ADD',backgroundColor:'rgba(55,138,221,0.06)',fill:true,tension:0.3,pointRadius:0,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#888',font:{size:11},boxWidth:12}}},scales:{x:{ticks:{maxTicksLimit:8,color:'#888',font:{size:11}},grid:{color:'rgba(128,128,128,0.1)'}},y:{ticks:{color:'#888',font:{size:11},callback:v=>'$'+Number(v).toLocaleString('pt-BR')},grid:{color:'rgba(128,128,128,0.1)'}}}}});
  watermarkChart(yChart);
}

function openSaveModal(type) {
  const pair = type==='il'
    ? (document.getElementById('il-tA').value||'A')+'/'+(document.getElementById('il-tB').value||'B')
    : (document.getElementById('y-pair').value||'Pool');
  const dep = parseFloat(type==='il' ? document.getElementById('il-dep').value : document.getElementById('y-dep').value)||0;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'save-overlay';
  overlay.innerHTML = `<div class="modal">
    <h3 style="margin-bottom:.25rem">Salvar posição</h3>
    <p class="sub" style="margin-bottom:1rem">Os dados atuais serão salvos no seu perfil</p>
    <div class="field" style="margin-bottom:12px"><label>Nome da posição</label><input id="save-name" value="${pair} — $${dep.toLocaleString('pt-BR')}"></div>
    <div class="field" style="margin-bottom:16px"><label>Notas (opcional)</label><input id="save-note" placeholder="ex: entrada em Jan 2025"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="savePosition('${type}')">Salvar</button>
      <button class="btn" onclick="closeModal()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>document.getElementById('save-name').focus(), 50);
}

function closeModal() {
  const el = document.getElementById('save-overlay');
  if(el) el.remove();
}

function savePosition(type) {
  const uid = session.user.uid;
  const name = document.getElementById('save-name').value||'Posição';
  const note = document.getElementById('save-note').value||'';
  const ts = Date.now();
  const key = uid+'_pos_'+ts;
  let data = { type, name, note, ts };
  if(type==='il') {
    data.tokenA=document.getElementById('il-tA').value;
    data.tokenB=document.getElementById('il-tB').value;
    data.priceA0=document.getElementById('il-p0').value;
    data.priceA1=document.getElementById('il-p1').value;
    data.deposit=document.getElementById('il-dep').value;
  } else {
    data.pair=document.getElementById('y-pair').value;
    data.fee=document.getElementById('y-fee').value;
    data.deposit=document.getElementById('y-dep').value;
    data.tvl=document.getElementById('y-tvl').value;
    data.vol=document.getElementById('y-vol').value;
    data.days=document.getElementById('y-days').value;
    data.extraApr=document.getElementById('y-extra').value;
    data.ilEst=document.getElementById('y-il').value;
  }
  stSet(key, data);
  fsPersistKey(key, data);
  closeModal();
  showToast('Análise salva!');
}

async function loadPositions() {
  const uid = session.user.uid;
  const posKeys = stKeys(uid+'_pos_');
  const poolKeys = stKeys(uid+'_pool_');
  const allKeys = [...posKeys, ...poolKeys];
  const items = allKeys.map(k=>({ key:k, ...stGet(k) })).filter(p=>p.ts).sort((a,b)=>b.ts-a.ts);

  const panel = document.getElementById('panel-positions');
  const pools = items.filter(p=>p.type==='pool');

  // No pools at all — render immediately
  if(pools.length === 0) { renderPositions(items, {}); return; }

  // Collect unique CoinGecko IDs (only from pools that have them)
  const ids = [...new Set(
    pools.flatMap(p=>[p.token1?.id, p.token2?.id].filter(Boolean))
  )];

  // Show loading skeleton
  panel.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px">
    <div><h2>Pool de Liquidez</h2><p class="sub">${items.length} item${items.length!==1?'s':''} salvos</p></div>
    <button class="btn btn-primary btn-sm" onclick="openNewPoolModal()">+ Criar nova pool</button>
  </div>
  <div style="font-size:13px;color:var(--text2);padding:.75rem 0;display:flex;align-items:center;gap:8px">
    <span style="display:inline-block;width:12px;height:12px;border:2px solid var(--border2);border-top-color:var(--text);border-radius:50%;animation:spin .8s linear infinite"></span>
    ${ids.length > 0 ? 'Buscando preços atuais...' : 'Carregando posições...'}
  </div>`;

  let livePrices = {};
  if(ids.length > 0) {
    try {
      const data = await cgFetch(`/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`);
      livePrices = data || {};
    } catch(e) {
      // continue — will fall back to stored prices
    }
  }

  renderPositions(items, livePrices);
}

function renderPositions(items, livePrices) {
  const panel = document.getElementById('panel-positions');
  if(items.length===0) {
    panel.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px">
      <div><h2>Pool de Liquidez</h2><p class="sub">Nenhuma posição ainda</p></div>
      <button class="btn btn-primary btn-sm" onclick="openNewPoolModal()">+ Criar nova pool</button>
    </div>
    <div class="card"><div class="empty">
      <div style="font-size:32px;margin-bottom:.75rem;opacity:.3">⬡</div>
      <div style="font-weight:500;margin-bottom:.5rem">Nenhuma pool criada ainda</div>
      <div style="margin-bottom:1rem">Importe pelo link da exchange ou crie manualmente</div>
      <button class="btn btn-primary" onclick="openNewPoolModal()">+ Criar nova pool</button>
    </div></div>`;
    return;
  }
  const pools = items.filter(p=>p.type==='pool');
  const analyses = items.filter(p=>p.type==='il'||p.type==='yield');

  let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px">
    <div><h2>Pool de Liquidez</h2><p class="sub">${items.length} item${items.length!==1?'s':''} salvos</p></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-sm" onclick="exportPoolsExcel()" title="Exportar Excel">📊 Excel</button>
      <button class="btn btn-sm" onclick="exportPoolsPDF()" title="Exportar PDF">📄 PDF</button>
      <button class="btn btn-primary btn-sm" onclick="openNewPoolModal()">+ Criar nova pool</button>
    </div>
  </div>`;

  let poolDonutCanvasId = null;
  let poolAllocDataForDraw = null;

  if(pools.length>0) {
    // ── Allocation card ──────────────────────────────
    const poolAllocData = {};
    let poolTotalValue = 0;
    pools.forEach(p => {
      const { poolValue } = calculatePoolValue(p);
      poolAllocData[p.name] = (poolAllocData[p.name] || 0) + poolValue;
      poolTotalValue += poolValue;
    });
    const hasPoolAlloc = poolTotalValue > 0;
    poolDonutCanvasId = hasPoolAlloc ? 'pool-donut-' + Date.now() : null;
    if(hasPoolAlloc) poolAllocDataForDraw = poolAllocData;

    if(hasPoolAlloc) {
      html += `
      <div class="card" style="margin-bottom:1.25rem">
        <div class="sec-label">${t('pool_alloc_title')}</div>
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
          <div class="donut-wrap" style="height:140px;width:140px;flex-shrink:0">
            <canvas id="${poolDonutCanvasId}" style="max-width:140px;max-height:140px"></canvas>
            <div class="donut-center">
              <div style="font-size:9px;color:var(--text3)">Total</div>
              <div style="font-size:13px;font-weight:700;color:var(--text)">$${poolTotalValue>=1000?(poolTotalValue/1000).toFixed(1)+'k':poolTotalValue.toFixed(0)}</div>
            </div>
          </div>
          <div style="flex:1;min-width:140px;display:flex;flex-direction:column;gap:6px">
            ${Object.entries(poolAllocData).sort((a,b)=>b[1]-a[1]).map(([name,val],i)=>`
            <div style="display:flex;align-items:center;gap:6px">
              <div style="width:8px;height:8px;border-radius:2px;background:${WALLET_COLORS[i%WALLET_COLORS.length]};flex-shrink:0"></div>
              <div style="font-size:11px;color:var(--text2);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${name}">${name}</div>
              <div style="font-size:11px;color:var(--text3);white-space:nowrap">$${val.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
              <div style="font-size:11px;font-weight:600;color:var(--text3);min-width:30px;text-align:right">${((val/poolTotalValue)*100).toFixed(0)}%</div>
            </div>`).join('')}
          </div>
        </div>
      </div>`;
    }
    // ─────────────────────────────────────────────────

    html += `<div class="sec-label" style="margin-bottom:.75rem">${t('created_pools')} (${pools.length})</div>`;
    pools.forEach(p=>{
      const fees = p.fees||[];
      const totalFees = fees.reduce((s,f)=>s+parseFloat(f.value||0),0);
      const t1usd = parseFloat(p.token1?.usd||0), t2usd = parseFloat(p.token2?.usd||0);
      const totalDep = t1usd+t2usd;
      const startDate = p.date ? new Date(p.date+'T00:00:00').toLocaleDateString('pt-BR') : '—';
      const daysSince = p.date ? Math.max(0,Math.floor((Date.now()-new Date(p.date+'T00:00:00'))/(1000*60*60*24))) : 0;
      const isDCA = !p.token2?.symbol;

      // live IL calculation
      const p0 = parseFloat(p.token1?.price||0);
      const liveData = livePrices[p.token1?.id||''];
      // p1: live price first, then stored price (entry price as last resort — IL = 0 but still shows)
      const p1 = liveData?.usd || parseFloat(p.token1?.price||0) || 0;
      const chg24 = liveData?.usd_24h_change ?? null;
      const isLive = !!(liveData?.usd);

      // p2: token2 live price, fallback to stored price, fallback $1 (stablecoin)
      const p2live = livePrices[p.token2?.id||''];
      const p2 = p2live?.usd || parseFloat(p.token2?.price||0) || 1;

      let ilBlock = '';
      // Show IL whenever we have BOTH entry price AND a current price (live or stored)
      const canCalcIL = !isDCA && p0 > 0 && p1 > 0;

      if(canCalcIL) {
        const ratio = p1/p0;
        const il = calcILFormula(ratio);
        const t1dep = t1usd||totalDep/2, t2dep = t2usd||totalDep/2;
        const amtA0 = p0>0 ? t1dep/p0 : 0;
        const amtB0 = p2>0 ? t2dep/p2 : 0;
        const k = amtA0*amtB0;
        const amtA1 = k>0 ? Math.sqrt(k/p1) : 0;
        const amtB1 = k>0 ? Math.sqrt(k*p1) : 0;
        const poolVal = amtA1*p1 + amtB1*p2;
        const holdVal = amtA0*p1 + amtB0*p2;
        const ilUSD = poolVal - holdVal;
        const priceChg = (ratio-1)*100;
        const p1Str = p1<0.01?'$'+p1.toFixed(6):p1<1?'$'+p1.toFixed(4):'$'+p1.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
        const chgStr = chg24!=null?`<span style="font-size:11px;color:${chg24>=0?'var(--green)':'var(--red)'}">${chg24>=0?'+':''}${chg24.toFixed(2)}% 24h</span>`:'';
        const ilColor = il < -0.05 ? 'var(--red)' : il < -0.01 ? 'var(--amber)' : 'var(--green)';
        // Valor no Pool e P&L baseados em snapshot (se houver)
        const cardSnaps = p.snapshots || [];
        let displayPoolVal, displayNetPnL;
        if (cardSnaps.length > 0) {
          const latestSnap = cardSnaps[cardSnaps.length - 1];
          const snapVal = (parseFloat(latestSnap.qtyA||0)*parseFloat(latestSnap.prcA||0)) + (parseFloat(latestSnap.qtyB||0)*parseFloat(latestSnap.prcB||0));
          displayNetPnL  = (totalDep - snapVal) + totalFees;
          displayPoolVal = snapVal + displayNetPnL;
        } else {
          displayNetPnL  = (holdVal - totalDep) + totalFees;
          displayPoolVal = totalDep + displayNetPnL;
        }
        ilBlock = `
        <div style="border-top:1px solid var(--border);margin-top:.75rem;padding-top:.75rem">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;flex-wrap:wrap;gap:4px">
            <span style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.08em">
              IL ao vivo · ${p.token1.symbol}/${p.token2?.symbol||'—'}
              ${isLive ? '<span style="font-size:9px;background:var(--green-bg);color:var(--green-text);border:1px solid rgba(57,255,138,.2);padding:1px 6px;border-radius:99px;margin-left:4px">LIVE</span>' : '<span style="font-size:9px;background:var(--bg4);color:var(--text3);padding:1px 6px;border-radius:99px;margin-left:4px">entrada</span>'}
            </span>
            <span style="font-size:12px;color:var(--text2)">
              ${p.token1.symbol} ${isLive?'atual':'preço entrada'} ${p1Str} ${chgStr}
              · entrada $${parseFloat(p0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})}
              · <span style="color:${priceChg>=0?'var(--green)':'var(--red)'};font-weight:600">${priceChg>=0?'+':''}${priceChg.toFixed(2)}%</span>
            </span>
          </div>
          <div class="grid4">
            <div class="mc"><div class="lbl">Impermanent Loss</div><div class="val" style="font-size:16px;color:${ilColor}">${(il*100).toFixed(2)}%</div><div class="sub2">${ilUSD<0?'-':'+'}${fmt(Math.abs(ilUSD))}</div></div>
            <div class="mc"><div class="lbl">${t('pool_value')}</div><div class="val" style="font-size:16px">${fmt(displayPoolVal)}</div></div>
            <div class="mc"><div class="lbl">${t('hodl_value')}</div><div class="val" style="font-size:16px;color:${holdVal<totalDep?'var(--amber)':'var(--text)'}">${fmt(holdVal)}${holdVal<totalDep?` <span style="font-size:10px;color:var(--amber)">▼</span>`:''}</div></div>
            <div class="mc"><div class="lbl">${t('net_pnl')}</div><div class="val ${displayNetPnL>=0?'pos':'neg'}" style="font-size:16px">${displayNetPnL>=0?'+':''}${fmt(displayNetPnL)}</div><div class="sub2">IL + ${t('fees').toLowerCase()}</div></div>
          </div>
        </div>`;
      } else if(!isDCA && !p0) {
        ilBlock = `<div style="border-top:1px solid var(--border);margin-top:.75rem;padding-top:.75rem;font-size:13px;color:var(--text3)">
          Sem preço de entrada — recrie a pool selecionando o token pela busca para habilitar o cálculo de IL.
        </div>`;
      } else if(!isDCA && p0 && !p1) {
        ilBlock = `<div style="border-top:1px solid var(--border);margin-top:.75rem;padding-top:.75rem;font-size:13px;color:var(--text3);display:flex;align-items:center;gap:8px">
          <span>Preço ao vivo indisponível para ${p.token1?.symbol||'este token'}</span>
          <button class="btn btn-sm" onclick="loadPositions()" style="font-size:11px">↻ Tentar novamente</button>
        </div>`;
      } else if(isDCA && p0 && p1) {
        const priceChg = (p1/p0-1)*100;
        const p1Str = p1<0.01?'$'+p1.toFixed(6):p1<1?'$'+p1.toFixed(4):'$'+p1.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
        ilBlock = `<div style="border-top:1px solid var(--border);margin-top:.75rem;padding-top:.75rem;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <span style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.08em">DCA single-token</span>
          <span style="font-size:13px;color:var(--text2)">${p.token1.symbol} ${isLive?'atual':'entrada'} <strong style="color:var(--text)">${p1Str}</strong> · entrada $${parseFloat(p0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})} · <span style="color:${priceChg>=0?'var(--green)':'var(--red)'};font-weight:600">${priceChg>=0?'+':''}${priceChg.toFixed(2)}%</span></span>
        </div>`;
      }

      html+=`<div class="pos-card">
        <div class="pos-header">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="display:flex;align-items:center;flex-shrink:0;position:relative;width:${isDCA?'36px':'52px'};height:36px">
              ${p.token1?.logo
                ? `<img src="${p.token1.logo}" style="width:36px;height:36px;border-radius:50%;border:2px solid var(--bg2);position:absolute;left:0;top:0;z-index:2;background:var(--bg3)" onerror="this.style.display='none'">`
                : `<div style="width:36px;height:36px;border-radius:50%;background:var(--blue-bg);border:2px solid var(--bg2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--blue-text);position:absolute;left:0;top:0;z-index:2">${(p.token1?.symbol||'?').slice(0,2)}</div>`}
              ${!isDCA
                ? (p.token2?.logo
                    ? `<img src="${p.token2.logo}" style="width:28px;height:28px;border-radius:50%;border:2px solid var(--bg2);position:absolute;left:18px;top:8px;z-index:1;background:var(--bg3)" onerror="this.style.display='none'">`
                    : `<div style="width:28px;height:28px;border-radius:50%;background:var(--green-bg);border:2px solid var(--bg2);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--green-text);position:absolute;left:18px;top:8px;z-index:1">${(p.token2?.symbol||'?').slice(0,2)}</div>`)
                : ''}
            </div>
            <div>
              <div class="pos-pair">${p.name}</div>
              <div class="pos-meta" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
                <span class="badge bb">${p.exchange||'—'}</span>
                <span class="badge bg">${p.network||'—'}</span>
                ${isDCA?'<span class="badge ba">DCA</span>':''}
                ${p.fee?`<span class="badge" style="background:var(--bg4);color:var(--text2);border:1px solid var(--border)">${p.fee}%</span>`:''}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm" onclick="loadPositions()" title="Atualizar" style="padding:6px 10px">↻</button>
            <button class="btn btn-sm btn-primary" onclick="openPoolDetail('${p.key}')">Detalhes</button>
            <button class="btn btn-sm btn-danger" onclick="deletePool('${p.key}', '${p.name}')" style="background:var(--red-bg);border-color:var(--red);color:var(--red-text)">✕ Deletar</button>
          </div>
        </div>
        ${(()=>{
          const cardSnaps = p.snapshots || [];
          let cardPnL, cardPoolVal;
          if (cardSnaps.length > 0) {
            const snap    = cardSnaps[cardSnaps.length - 1];
            const snapVal = parseFloat(snap.qtyA||0)*parseFloat(snap.prcA||0) + parseFloat(snap.qtyB||0)*parseFloat(snap.prcB||0);
            const amtA0   = parseFloat(p.token1?.price||0) > 0 ? t1usd / parseFloat(p.token1.price) : 0;
            const amtB0   = parseFloat(p.token2?.price||0) > 0 ? t2usd / parseFloat(p.token2.price) : 0;
            const holdVal = amtA0 * parseFloat(snap.prcA||0) + amtB0 * parseFloat(snap.prcB||0);
            cardPnL     = (snapVal - holdVal) + totalFees;  // IL + taxas
            cardPoolVal = snapVal + totalFees;               // snapshot + taxas
          } else {
            cardPnL     = totalFees;                         // sem snapshot: só taxas
            cardPoolVal = totalDep + totalFees;              // depositado + taxas
          }
          const pnlSign  = cardPnL >= 0 ? '+' : '-';
          const pnlClass = cardPnL >= 0 ? 'pos' : 'neg';
          const fmtCard  = v => '$'+Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
          return `<div class="grid4">
            <div class="mc"><div class="lbl">Início</div><div class="val" style="font-size:15px">${startDate}</div></div>
            <div class="mc"><div class="lbl">${t('active_days')}</div><div class="val">${daysSince}</div></div>
            <div class="mc"><div class="lbl">P&L Líquido</div><div class="val ${pnlClass}" style="font-size:15px">${pnlSign}${fmtCard(cardPnL)}</div>${cardSnaps.length===0?'<div class="sub2">sem snapshot</div>':''}</div>
            <div class="mc"><div class="lbl">${t('fees')}</div><div class="val pos" style="font-size:15px">$${totalFees.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div><div class="sub2">${fees.length} ${appLang==='en'?'record':'registro'}${fees.length!==1?'s':''}</div></div>
          </div>`;
        })()}
      </div>`;
    });
  }

  if(analyses.length>0) {
    html += `<div class="sec-label" style="margin-bottom:.75rem;margin-top:${pools.length>0?'1.5rem':'0'}">${t('analyses_saved')} (${analyses.length})</div>`;
    analyses.forEach(p=>{
      const date=new Date(p.ts).toLocaleDateString('pt-BR');
      const isIL=p.type==='il';
      let details='';
      if(isIL) {
        const p0=parseFloat(p.priceA0)||1, p1=parseFloat(p.priceA1)||1, dep=parseFloat(p.deposit)||0;
        const ratio=p1/p0, il=calcILFormula(ratio);
        const half=dep/2, amtA0=half/p0, k=amtA0*half;
        const holdVal=amtA0*p1+half, amtA1=Math.sqrt(k/p1), amtB1=Math.sqrt(k*p1), poolVal=amtA1*p1+amtB1;
        details=`<div class="grid3" style="margin-top:.75rem">
          <div class="mc"><div class="lbl">IL</div><div class="val neg">${(il*100).toFixed(2)}%</div></div>
          <div class="mc"><div class="lbl">Valor no pool</div><div class="val">${fmt(poolVal)}</div></div>
          <div class="mc"><div class="lbl">HODL</div><div class="val">${fmt(holdVal)}</div></div>
        </div>`;
      } else {
        const dep=parseFloat(p.deposit)||10000, tvl=parseFloat(p.tvl)||1, vol=parseFloat(p.vol)||0;
        const fee=parseFloat(p.fee)||0.3, days=parseFloat(p.days)||30, extra=parseFloat(p.extraApr)||0, ilEst=parseFloat(p.ilEst)||0;
        const share=dep/tvl, dailyFee=vol*(fee/100)*share, feeApr=(dailyFee/dep)*365*100, netApr=feeApr+extra-ilEst;
        const net=dailyFee*days+dep*(extra/100)*(days/365)-dep*(ilEst/100)*(days/365);
        details=`<div class="grid3" style="margin-top:.75rem">
          <div class="mc"><div class="lbl">Fee APR</div><div class="val pos">${feeApr.toFixed(2)}%</div></div>
          <div class="mc"><div class="lbl">APR líquido</div><div class="val ${netApr>=0?'pos':'neg'}">${netApr.toFixed(2)}%</div></div>
          <div class="mc"><div class="lbl">Rendimento (${days}d)</div><div class="val ${net>=0?'pos':'neg'}">${(net>=0?'+':'')+fmt(net)}</div></div>
        </div>`;
      }
      html+=`<div class="pos-card">
        <div class="pos-header">
          <div><div class="pos-pair">${p.name}</div><div class="pos-meta">${isIL?'Impermanent Loss':'Rendimento'} · ${date}${p.note?' · '+p.note:''}</div></div>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="badge ${isIL?'ba':'bb'}">${isIL?'IL':'Yield'}</span>
            <button class="btn btn-sm btn-danger" onclick="deletePos('${p.key}')">Excluir</button>
          </div>
        </div>
        ${details}
      </div>`;
    });
  }

  panel.innerHTML = html;

  // Draw pool allocation donut after DOM is ready
  if(poolDonutCanvasId && poolAllocDataForDraw) {
    requestAnimationFrame(()=>{
      if(poolDonutChart) { try{poolDonutChart.destroy();}catch(e){} poolDonutChart=null; }
      poolDonutChart = drawWalletDonut(poolDonutCanvasId, poolAllocDataForDraw, true);
    });
  }
  const tipsDiv = document.createElement('div');
  tipsDiv.innerHTML = `
    <div class="card" style="background: var(--blue-bg); border-color: var(--blue); margin-top: 2rem;">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 20px; flex-shrink: 0;">💡</span>
        <div>
          <h3 style="color: var(--blue-text); margin-bottom: 8px;">Dicas de Uso - Posições & Análises</h3>
          <ul style="list-style: none; padding: 0; margin: 0; color: var(--text2); font-size: 13px; line-height: 1.6;">
            <li>🔍 <strong>Análise de IL:</strong> Use a calculadora de Impermanent Loss para entender o risco de sua posição em pools.</li>
            <li>📈 <strong>Rendimento:</strong> Simule diferentes cenários de APR, volume e taxas para prever seus ganhos.</li>
            <li>💾 <strong>Salvar Análises:</strong> Clique em "Salvar análise" para guardar suas simulações e compará-las depois.</li>
            <li>🗑️ <strong>Gerenciar:</strong> Exclua análises antigas para manter seu histórico organizado e relevante.</li>
          </ul>
        </div>
      </div>
    </div>
  `;
  panel.appendChild(tipsDiv);

  const formulasDiv = document.createElement('div');
  formulasDiv.innerHTML = `
    <div class="card" style="margin-top:.75rem;border-color:var(--border)">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <span style="font-size:20px;flex-shrink:0">🧮</span>
        <div style="width:100%">
          <h3 style="margin-bottom:12px;font-size:13px;font-weight:700;color:var(--text1)">Como os cálculos funcionam</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
            <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.75rem">
              <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Impermanent Loss</div>
              <div style="font-size:12px;color:var(--text2);line-height:1.6">Diferença entre o valor real no pool e o que você teria se tivesse apenas segurado os tokens (HODL) — usando quantidades e preços do último snapshot.</div>
            </div>
            <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.75rem">
              <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Valor HODL</div>
              <div style="font-size:12px;color:var(--text2);line-height:1.6">O que seu capital valeria se tivesse mantido as quantidades originais fora do pool, avaliadas pelos preços do snapshot.</div>
            </div>
            <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.75rem">
              <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">P&L Líquido</div>
              <div style="font-size:12px;color:var(--text2);line-height:1.6">Lucro ou prejuízo real da posição: soma o Impermanent Loss (em USD) com as taxas coletadas. Requer snapshot para ser calculado.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  panel.appendChild(formulasDiv);
}

function deletePos(key) {
  if(!confirm('Excluir esta análise?')) return;
  stDel(key);
  fsDeleteKey(key);
  loadPositions();
}

