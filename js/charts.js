/* ══════════════════════════════════════════════════════════════════════
   DASHBOARD CHARTS — 5 novos gráficos
   ══════════════════════════════════════════════════════════════════════ */

let _networthChartInst  = null;
let _poolPerfChartInst  = null;
let _finChartInst       = null;
let _networthPeriod     = '30d';

/* ── Called after renderDashboard() ── */
function initDashboardCharts() {
  requestAnimationFrame(() => {
    drawNetworthChart(_networthPeriod);
    drawPoolPerfChart();
    drawFinDashChart();
    loadTickerFromFirestore();
    // Sparklines triggered from wallet enrichment
  });
}

/* ════════════════════════════════════════════════════════
   GRÁFICO 1 — Linha: Evolução do Patrimônio
   ════════════════════════════════════════════════════════ */
function setNetworthPeriod(period, btn) {
  _networthPeriod = period;
  document.querySelectorAll('#networth-period-btns button').forEach(b => {
    b.className = b===btn ? 'btn btn-xs btn-primary' : 'btn btn-xs';
  });
  drawNetworthChart(period);
}

function drawNetworthChart(period='30d') {
  const canvas = document.getElementById('dash-networth-chart');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  // Build data points from snapshots + finance txs
  const uid = session?.user?.uid;
  const poolKeys = stKeys(uid+'_pool_');
  const pools    = poolKeys.map(k=>({key:k,...stGet(k)})).filter(p=>p.ts);
  const finTxs   = fLoad();
  const walletAssets = wLoad();

  // Collect all snapshot dates + today
  const dataPoints = {};
  const now = Date.now();
  const cutoffMap = {'7d':7,'30d':30,'90d':90,'all':365};
  const days = cutoffMap[period] || 30;
  const cutoff = now - days*86400000;

  // Add today's value
  const todayKey = new Date().toISOString().slice(0,10);
  const totalPoolValue   = pools.reduce((s,p)=>{ const {poolValue}=calculatePoolValue(p); return s+poolValue; }, 0);
  const totalWalletValue = walletAssets.filter(a=>a.source!=='pool').reduce((s,a)=>s+parseFloat(a.buyPrice||0)*parseFloat(a.qty||0),0);
  dataPoints[todayKey] = (dataPoints[todayKey]||0) + totalPoolValue + totalWalletValue;

  // Add snapshot points
  pools.forEach(pool => {
    (pool.snapshots||[]).forEach(snap => {
      if(!snap.date) return;
      const snapMs = new Date(snap.date+'T00:00:00').getTime();
      if(snapMs < cutoff) return;
      const val = (parseFloat(snap.valueA||0)*parseFloat(snap.priceA||0)) +
                  (parseFloat(snap.valueB||0)*parseFloat(snap.priceB||0));
      if(val > 0) dataPoints[snap.date] = (dataPoints[snap.date]||0) + val;
    });
  });

  // Add finance saldo as running total by date
  const sortedTxDates = [...new Set(finTxs.map(t=>t.date).filter(Boolean))].sort();
  let running = 0;
  sortedTxDates.forEach(date => {
    const dateMs = new Date(date+'T00:00:00').getTime();
    if(dateMs < cutoff) return;
    const dayTxs = finTxs.filter(t=>t.date===date);
    dayTxs.forEach(tx => {
      running += tx.type==='receita' ? parseFloat(tx.amount||0) : -parseFloat(tx.amount||0);
    });
    if(running !== 0) dataPoints[date] = (dataPoints[date]||0) + Math.max(0, running);
  });

  const sortedEntries = Object.entries(dataPoints).sort((a,b)=>a[0].localeCompare(b[0]));

  if(sortedEntries.length < 2) {
    // Show placeholder line with gradient fill
    const placeholderLabels = Array.from({length:8},(_,i)=>{
      const d=new Date(); d.setDate(d.getDate()-(7-i));
      return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
    });
    const placeholderData = [0,0,0,0,0,0,0,totalPoolValue+totalWalletValue].map(v=>v||0);
    _drawLineChart(ctx, canvas, placeholderLabels, placeholderData, _networthChartInst);
    _networthChartInst = window._lastLineChart;
    return;
  }

  const labels = sortedEntries.map(([date])=>new Date(date+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}));
  const values = sortedEntries.map(([,v])=>+v.toFixed(2));

  if(_networthChartInst) { _networthChartInst.destroy(); _networthChartInst=null; }
  _networthChartInst = _drawLineChart(ctx, canvas, labels, values, null);
}

function _drawLineChart(ctx, canvas, labels, data, existingChart) {
  if(existingChart) { try{existingChart.destroy();}catch(e){} }
  const min = Math.min(...data) * 0.95;
  const max = Math.max(...data) * 1.05 || 100;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight||140);
  gradient.addColorStop(0, 'rgba(99,142,255,0.3)');
  gradient.addColorStop(1, 'rgba(99,142,255,0.0)');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#638eff',
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: data.length > 20 ? 0 : 3,
        pointBackgroundColor: '#638eff',
        pointHoverRadius: 5,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => '$' + ctx.raw.toLocaleString('pt-BR',{minimumFractionDigits:2})
          }
        }
      },
      scales: {
        x: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#3d4451',font:{size:9},maxTicksLimit:6} },
        y: {
          min, max,
          grid:{color:'rgba(255,255,255,0.04)'},
          ticks:{color:'#3d4451',font:{size:9},callback:v=>'$'+(v>=1000?(v/1000).toFixed(0)+'k':v.toFixed(0))}
        }
      }
    }
  });
  window._lastLineChart = chart;
  return chart;
}

/* ════════════════════════════════════════════════════════
   GRÁFICO 2 — Barras horizontais: Top Pools por Fees
   ════════════════════════════════════════════════════════ */
function drawPoolPerfChart() {
  const canvas = document.getElementById('dash-pool-perf-chart');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  const uid    = session?.user?.uid;
  const pools  = stKeys(uid+'_pool_').map(k=>({key:k,...stGet(k)})).filter(p=>p.ts);
  const sorted = [...pools]
    .map(p=>({ name:(p.name||`${p.token1?.symbol}/${p.token2?.symbol}`).slice(0,14), fees:(p.fees||[]).reduce((s,f)=>s+parseFloat(f.value||0),0) }))
    .filter(p=>p.fees>0)
    .sort((a,b)=>b.fees-a.fees)
    .slice(0,6);

  if(_poolPerfChartInst) { try{_poolPerfChartInst.destroy();}catch(e){} }

  if(!sorted.length) {
    ctx.fillStyle = '#3d4451';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sem fees registradas ainda', canvas.width/2, 70);
    return;
  }

  _poolPerfChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(p=>p.name),
      datasets: [{
        data: sorted.map(p=>+p.fees.toFixed(2)),
        backgroundColor: sorted.map((_,i)=>`hsla(${140+i*25},100%,60%,0.7)`),
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c=>'$'+c.raw.toLocaleString('pt-BR',{minimumFractionDigits:2}) } }
      },
      scales: {
        x: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#3d4451',font:{size:9},callback:v=>'$'+(v>=1000?(v/1000).toFixed(1)+'k':v)} },
        y: { grid:{display:false}, ticks:{color:'#7d8590',font:{size:10}} }
      }
    }
  });
}

/* ════════════════════════════════════════════════════════
   GRÁFICO 3 — Mini barras: Receitas vs Despesas (6 meses)
   ════════════════════════════════════════════════════════ */
function drawFinDashChart() {
  const canvas = document.getElementById('dash-fin-chart');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  const allTxs = fLoad();
  const monthLabels=[], monthRec=[], monthDes=[];
  for(let i=5;i>=0;i--){
    const d=new Date(); d.setMonth(d.getMonth()-i); d.setDate(1);
    monthLabels.push(d.toLocaleDateString('pt-BR',{month:'short'}));
    const mo = allTxs.filter(t=>{ const td=parseTxDate(t.date); return td.getMonth()===d.getMonth()&&td.getFullYear()===d.getFullYear(); });
    monthRec.push(+mo.filter(t=>t.type==='receita').reduce((s,t)=>s+parseFloat(t.amount||0),0).toFixed(2));
    monthDes.push(+mo.filter(t=>t.type==='despesa').reduce((s,t)=>s+parseFloat(t.amount||0),0).toFixed(2));
  }

  if(_finChartInst) { try{_finChartInst.destroy();}catch(e){} }

  if(!allTxs.length) {
    ctx.fillStyle = '#3d4451';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sem transações registradas', canvas.width/2, 70);
    return;
  }

  _finChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [
        { label:'Receitas', data:monthRec, backgroundColor:'rgba(57,255,138,0.65)', borderRadius:3 },
        { label:'Despesas', data:monthDes, backgroundColor:'rgba(255,83,112,0.65)', borderRadius:3 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      animation:{ duration:400 },
      plugins:{
        legend:{ display:true, position:'bottom', labels:{color:'#7d8590',font:{size:9},padding:8,boxWidth:10} },
        tooltip:{ callbacks:{ label:c=>'$'+c.raw.toLocaleString('pt-BR',{minimumFractionDigits:2}) } }
      },
      scales:{
        x:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#3d4451',font:{size:9}} },
        y:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#3d4451',font:{size:9},callback:v=>'$'+(v>=1000?(v/1000).toFixed(0)+'k':v)} }
      }
    }
  });
}

/* ════════════════════════════════════════════════════════
   GRÁFICO 4 — Sparklines na Carteira (7d price history)
   ════════════════════════════════════════════════════════ */
async function drawSparklines() {
  const rows = document.querySelectorAll('#wallet-asset-row[data-symbol]');
  if(!rows.length) return;

  for(const row of rows) {
    const cgId = row.dataset.cgid;
    if(!cgId || cgId.startsWith('STOCK:')) continue;

    try {
      const data = await cgFetch(`/coins/${cgId}/market_chart?vs_currency=usd&days=7&interval=daily`);
      const prices = (data.prices||[]).map(p=>p[1]);
      if(prices.length < 2) continue;

      // Find the sparkline container in this row
      const sparkWrap = row.querySelector('.sparkline-wrap');
      if(!sparkWrap) continue;

      const canvas = sparkWrap.querySelector('canvas');
      if(!canvas) continue;
      const ctx = canvas.getContext('2d');

      const isUp = prices[prices.length-1] >= prices[0];
      const color = isUp ? '#39ff8a' : '#ff5370';

      new Chart(ctx, {
        type: 'line',
        data: {
          labels: prices.map((_,i)=>i),
          datasets: [{ data: prices, borderColor: color, borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.3 }]
        },
        options: {
          responsive:false, animation:false,
          plugins:{ legend:{display:false}, tooltip:{enabled:false} },
          scales:{ x:{display:false}, y:{display:false} }
        }
      });
    } catch(e) { /* skip failed sparklines */ }
  }
}

/* ════════════════════════════════════════════════════════
   GRÁFICO 5 — Heatmap de atividade financeira
   ════════════════════════════════════════════════════════ */
function renderActivityHeatmap(containerId) {
  const el = document.getElementById(containerId);
  if(!el) return;

  const allTxs = fLoad();
  const now = Date.now();
  const WEEKS = 26; // ~6 months
  const DAYS  = WEEKS * 7;
  const cutoff = now - DAYS * 86400000;

  // Count transactions per day
  const countByDate = {};
  allTxs.forEach(tx => {
    if(!tx.date) return;
    const ms = parseTxDate(tx.date).getTime();
    if(ms < cutoff) return;
    countByDate[tx.date] = (countByDate[tx.date]||0) + 1;
  });
  const maxCount = Math.max(...Object.values(countByDate), 1);

  // Build grid: start from Sunday WEEKS ago
  const startDate = new Date(now - DAYS*86400000);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // align to Sunday

  const CELL = 11, GAP = 2;
  const cols = WEEKS + 1;
  const w    = cols * (CELL+GAP);
  const h    = 7  * (CELL+GAP) + 20;

  const dayLabels = ['D','S','T','Q','Q','S','S'];
  const monthsSeen = new Set();

  let html = `<div style="overflow-x:auto"><svg width="${w}" height="${h}" style="font-family:monospace;font-size:9px;color:var(--text3)">`;

  // Day labels (left)
  [1,3,5].forEach(d => {
    html += `<text x="0" y="${d*(CELL+GAP)+CELL*0.75}" fill="var(--text3)">${dayLabels[d]}</text>`;
  });

  // Cells
  for(let col=0; col<cols; col++) {
    for(let row=0; row<7; row++) {
      const cellDate = new Date(startDate.getTime() + (col*7+row)*86400000);
      if(cellDate > new Date()) continue;

      const dateStr = cellDate.toISOString().slice(0,10);
      const count   = countByDate[dateStr]||0;
      const alpha   = count > 0 ? 0.2 + (count/maxCount)*0.8 : 0.06;
      const color   = count > 0 ? `rgba(99,142,255,${alpha.toFixed(2)})` : 'rgba(99,142,255,0.06)';
      const x = 12 + col*(CELL+GAP);
      const y = row*(CELL+GAP);

      // Month label at top of column
      if(row===0) {
        const mKey = `${cellDate.getFullYear()}-${cellDate.getMonth()}`;
        if(!monthsSeen.has(mKey) && cellDate.getDate()<=7) {
          monthsSeen.add(mKey);
          const mLabel = cellDate.toLocaleDateString('pt-BR',{month:'short'});
          html += `<text x="${x}" y="${h-4}" fill="var(--text3)">${mLabel}</text>`;
        }
      }

      html += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${color}">
        <title>${dateStr}: ${count} transação${count!==1?'ões':''}</title>
      </rect>`;
    }
  }

  html += `</svg></div>`;
  el.innerHTML = html;
}

/* ════════════════════════════════════════════════════════
   TICKER — load posts from Firestore
   ════════════════════════════════════════════════════════ */
async function loadTickerFromFirestore() {
  const track = document.getElementById('dash-ticker-track');
  if(!track) return;
  try {
    const fsPosts = await loadFirestorePosts();
    const allArticles = [...fsPosts, ...NEWS_ARTICLES];
    if(!allArticles.length) return;
    const items = allArticles.slice(0,8).map(a =>
      `<span class="ticker-item">
        <span class="ticker-label">${a.tag||'News'}</span>
        ${a.title}
      </span>`
    ).join('');
    // Duplicate for seamless loop
    track.innerHTML = items + items;
  } catch(e) {
    // Keep default ticker on error
  }
}

/* ════════════════════════════════════════════════════════
   HOOK: Call initDashboardCharts after renderDashboard
   ════════════════════════════════════════════════════════ */
const _origRenderDashboard = window.renderDashboard;
if(typeof renderDashboard === 'function') {
  window.renderDashboard = function() {
    _origRenderDashboard.apply(this, arguments);
    setTimeout(initDashboardCharts, 80);
  };
}

/* ════════════════════════════════════════════════════════
   HOOK: Add sparklines + heatmap after renderWallet
   ════════════════════════════════════════════════════════ */
const _origRenderWalletForSpark = window.renderWallet;
if(typeof renderWallet === 'function' && !window._sparklineHooked) {
  window._sparklineHooked = true;
  const __origW = renderWallet;
  window.renderWallet = async function() {
    await __origW.apply(this, arguments);
    setTimeout(drawSparklines, 500);
  };
}

/* ════════════════════════════════════════════════════════
   HOOK: Add heatmap to finance panel
   ════════════════════════════════════════════════════════ */
const _origRenderFinance = window.renderFinance;
if(typeof renderFinance === 'function' && !window._heatmapHooked) {
  window._heatmapHooked = true;
  const __origF = renderFinance;
  window.renderFinance = function() {
    __origF.apply(this, arguments);
    // Inject heatmap after finance panel renders
    setTimeout(() => {
      const panel = document.getElementById('panel-finance');
      if(!panel) return;
      if(document.getElementById('activity-heatmap-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'card';
      wrap.style.marginTop = '1rem';
      wrap.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.875rem">
          <div class="sec-label" style="margin-bottom:0">Heatmap de Atividade</div>
          <div style="font-size:11px;color:var(--text3)">últimos 6 meses</div>
        </div>
        <div id="activity-heatmap-wrap"></div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:10px;color:var(--text3)">
          Menos
          ${[0.06,0.2,0.4,0.6,0.8,1].map(a=>`<div style="width:10px;height:10px;border-radius:2px;background:rgba(99,142,255,${a})"></div>`).join('')}
          Mais
        </div>`;
      panel.appendChild(wrap);
      renderActivityHeatmap('activity-heatmap-wrap');
    }, 150);
  };
}


