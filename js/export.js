/* ── Wallet Export ── */
function _getEnrichedWalletForExport() {
  // Try to get enriched data from DOM (live prices rendered)
  const rows = [];
  document.querySelectorAll('#wallet-asset-row').forEach(row => {
    rows.push({
      symbol:       row.dataset.symbol || '',
      name:         row.dataset.name || '',
      category:     row.dataset.category || '',
      qty:          parseFloat(row.dataset.qty || 0),
      buyPrice:     parseFloat(row.dataset.buyprice || 0),
      currentPrice: parseFloat(row.dataset.currentprice || row.dataset.buyprice || 0),
      pnl:          parseFloat(row.dataset.pnl || 0),
      pnlPct:       parseFloat(row.dataset.pnlpct || 0),
      network:      row.dataset.network || '',
    });
  });
  if(rows.length > 0) return rows;
  // Fallback to raw stored data
  return wLoad().map(a => ({
    symbol: a.symbol, name: a.name, category: a.category,
    qty: parseFloat(a.qty||0), buyPrice: parseFloat(a.buyPrice||0),
    currentPrice: parseFloat(a.buyPrice||0), pnl: 0, pnlPct: 0, network: a.network||'',
  }));
}

function exportWalletExcel() {
  const assets = _getEnrichedWalletForExport();
  if (!assets.length) { showToast('Nenhum ativo para exportar.', 'warn'); return; }
  const rows = assets.map(a => ({
    'Símbolo':            a.symbol || '',
    'Nome':               a.name   || '',
    'Categoria':          a.category || '',
    'Quantidade':         a.qty,
    'Preço Compra ($)':   +a.buyPrice.toFixed(2),
    'Preço Atual ($)':    +a.currentPrice.toFixed(2),
    'Custo Total ($)':    +(a.qty * a.buyPrice).toFixed(2),
    'Valor Atual ($)':    +(a.qty * a.currentPrice).toFixed(2),
    'PnL ($)':            +a.pnl.toFixed(2),
    'PnL (%)':            +a.pnlPct.toFixed(2),
    'Rede/Exchange':      a.network || '',
  }));
  _downloadExcel(rows, 'CashFlow_Carteira');
  addExportLog('Excel', 'Carteira');
}

function exportWalletPDF() {
  const assets = _getEnrichedWalletForExport();
  if (!assets.length) { showToast('Nenhum ativo para exportar.', 'warn'); return; }
  const totalCost  = assets.reduce((s,a)=>s+(a.qty*a.buyPrice),0);
  const totalValue = assets.reduce((s,a)=>s+(a.qty*a.currentPrice),0);
  const totalPnL   = totalValue - totalCost;
  const html = `
  <h2>📊 Relatório de Carteira — ProfitFlow Labs</h2>
  <p style="color:#666;margin-bottom:.5rem">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
  <div style="display:flex;gap:2rem;margin-bottom:1rem;font-size:13px">
    <div>💰 <b>Custo total:</b> $${totalCost.toFixed(2)}</div>
    <div>📈 <b>Valor atual:</b> $${totalValue.toFixed(2)}</div>
    <div style="color:${totalPnL>=0?'green':'red'}"><b>PnL:</b> ${totalPnL>=0?'+':''}$${totalPnL.toFixed(2)}</div>
  </div>
  <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:11px">
    <thead style="background:#f5f5f5"><tr><th>Símbolo</th><th>Nome</th><th>Qtd</th><th>Compra</th><th>Atual</th><th>Custo</th><th>Valor</th><th>PnL</th><th>PnL%</th></tr></thead>
    <tbody>${assets.map(a=>`<tr>
      <td><b>${a.symbol}</b></td><td>${a.name||''}</td>
      <td>${a.qty}</td>
      <td>$${a.buyPrice.toFixed(2)}</td>
      <td>$${a.currentPrice.toFixed(2)}</td>
      <td>$${(a.qty*a.buyPrice).toFixed(2)}</td>
      <td>$${(a.qty*a.currentPrice).toFixed(2)}</td>
      <td style="color:${a.pnl>=0?'green':'red'}">${a.pnl>=0?'+':''}$${a.pnl.toFixed(2)}</td>
      <td style="color:${a.pnlPct>=0?'green':'red'}">${a.pnlPct>=0?'+':''}${a.pnlPct.toFixed(1)}%</td>
    </tr>`).join('')}</tbody>
    <tfoot><tr style="font-weight:700;background:#f5f5f5">
      <td colspan="5">TOTAIS</td>
      <td>$${totalCost.toFixed(2)}</td>
      <td>$${totalValue.toFixed(2)}</td>
      <td style="color:${totalPnL>=0?'green':'red'}">${totalPnL>=0?'+':''}$${totalPnL.toFixed(2)}</td>
      <td></td>
    </tr></tfoot>
  </table>`;
  _printPDF(html, 'CashFlow — Carteira');
  addExportLog('PDF', 'Carteira');
}

/* ── Finance Export ── */
function exportFinanceExcel() {
  const txs = fLoad();
  if (!txs.length) { showToast('Nenhuma transação para exportar.', 'warn'); return; }
  const rows = txs.map(tx => ({
    'Data':        tx.date || '',
    'Tipo':        tx.type || '',
    'Categoria':   tx.category || '',
    'Descrição':   tx.description || '',
    'Valor ($)':   parseFloat(tx.amount||0),
    'Conta':       tx.account || '',
    'Tags':        (tx.tags||[]).join(', '),
  }));
  _downloadExcel(rows, 'CashFlow_Financas');
  addExportLog('Excel', 'Finanças');
}

function exportFinancePDF() {
  const txs = fLoad().sort((a,b)=>new Date(b.date)-new Date(a.date));
  if (!txs.length) { showToast('Nenhuma transação para exportar.', 'warn'); return; }
  const receitas = txs.filter(t=>t.type==='receita').reduce((s,t)=>s+parseFloat(t.amount||0),0);
  const despesas = txs.filter(t=>t.type==='despesa').reduce((s,t)=>s+parseFloat(t.amount||0),0);
  const html = `
  <h2>💸 Relatório Financeiro — ProfitFlow Labs</h2>
  <p style="color:#666;margin-bottom:.5rem">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
  <div style="display:flex;gap:2rem;margin-bottom:1rem;font-size:13px">
    <div>📈 <b>Receitas:</b> $${receitas.toFixed(2)}</div>
    <div>📉 <b>Despesas:</b> $${despesas.toFixed(2)}</div>
    <div>💰 <b>Saldo:</b> $${(receitas-despesas).toFixed(2)}</div>
  </div>
  <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:11px">
    <thead style="background:#f5f5f5"><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th></tr></thead>
    <tbody>${txs.map(tx=>`<tr><td>${tx.date}</td><td style="color:${tx.type==='receita'?'green':'red'}">${tx.type}</td><td>${tx.category||''}</td><td>${tx.description||''}</td><td>$${parseFloat(tx.amount||0).toFixed(2)}</td></tr>`).join('')}</tbody>
  </table>`;
  _printPDF(html, 'CashFlow — Finanças');
  addExportLog('PDF', 'Finanças');
}

/* ── Pools Export ── */
function exportPoolsExcel() {
  const uid   = session?.user?.uid || '';
  const pools = stKeys(uid+'_pool_').map(k=>stGet(k)).filter(p=>p&&p.ts);
  if (!pools.length) { showToast('Nenhuma pool para exportar.', 'warn'); return; }
  const rows = pools.map(p => ({
    'Par':          `${p.token1?.symbol||'?'}/${p.token2?.symbol||'?'}`,
    'DEX':          p.dex || '',
    'Rede':         p.network || p.chain || '',
    'Token A':      p.token1?.symbol || '',
    'Qtd A':        parseFloat(p.token1?.amount||0),
    'Token B':      p.token2?.symbol || '',
    'Qtd B':        parseFloat(p.token2?.amount||0),
    'Preço Entrada A': parseFloat(p.token1?.priceEntry||0),
    'Preço Entrada B': parseFloat(p.token2?.priceEntry||0),
    'Fee Tier':     p.feeTier || '',
    'Data Entrada': p.date || '',
    'Notas':        p.notes || '',
  }));
  _downloadExcel(rows, 'CashFlow_Pools');
  addExportLog('Excel', 'Pools de Liquidez');
}

function exportPoolsPDF() {
  const uid   = session?.user?.uid || '';
  const pools = stKeys(uid+'_pool_').map(k=>stGet(k)).filter(p=>p&&p.ts);
  if (!pools.length) { showToast('Nenhuma pool para exportar.', 'warn'); return; }
  const html = `
  <h2>🌊 Relatório de Pools — ProfitFlow Labs</h2>
  <p style="color:#666;margin-bottom:1rem">Gerado em ${new Date().toLocaleString('pt-BR')} · ${pools.length} pool${pools.length!==1?'s':''}</p>
  <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:11px">
    <thead style="background:#f5f5f5"><tr><th>Par</th><th>DEX</th><th>Rede</th><th>Qtd A</th><th>Qtd B</th><th>Fee</th><th>Data</th></tr></thead>
    <tbody>${pools.map(p=>`<tr>
      <td><b>${p.token1?.symbol||'?'}/${p.token2?.symbol||'?'}</b></td>
      <td>${p.dex||''}</td><td>${p.network||p.chain||''}</td>
      <td>${parseFloat(p.token1?.amount||0).toFixed(4)}</td>
      <td>${parseFloat(p.token2?.amount||0).toFixed(4)}</td>
      <td>${p.feeTier||''}</td><td>${p.date||''}</td>
    </tr>`).join('')}</tbody>
  </table>`;
  _printPDF(html, 'CashFlow — Pools');
  addExportLog('PDF', 'Pools');
}

/* ── Shared helpers ── */
let _xlsxLoader = null;
function _ensureXlsx() {
  if (typeof XLSX !== 'undefined') return Promise.resolve();
  if (_xlsxLoader) return _xlsxLoader;
  showToast('Carregando exportador...', 'info');
  _xlsxLoader = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('xlsx-load-failed'));
    document.head.appendChild(s);
  });
  return _xlsxLoader;
}

async function _downloadExcel(rows, filename) {
  try {
    await _ensureXlsx();
  } catch(e) {
    showToast('Nao foi possivel carregar o exportador.', 'error');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  XLSX.writeFile(wb, filename + '_' + new Date().toISOString().slice(0,10) + '.xlsx');
  showToast('✅ Excel gerado com sucesso!', 'success');
}

function _printPDF(bodyHtml, title) {
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:2rem;color:#1a1a1a;font-size:13px}
    h2{color:#0d1117;margin-bottom:.25rem}table{border-color:#ddd}
    th{background:#f8f9fa;font-weight:600}td,th{padding:6px 10px;border:1px solid #ddd}
    tr:nth-child(even){background:#fafafa}
    @media print{.no-print{display:none}}
  </style></head><body>
  ${bodyHtml}
  <div class="no-print" style="margin-top:2rem;text-align:center">
    <button onclick="window.print()" style="padding:10px 24px;background:#39ff8a;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px">🖨️ Imprimir / Salvar PDF</button>
    <button onclick="window.close()" style="margin-left:10px;padding:10px 24px;background:#eee;border:none;border-radius:8px;cursor:pointer;font-size:14px">Fechar</button>
  </div>
  `);
  win.document.close();
  showToast('📄 PDF aberto em nova aba!', 'success');
}

function addExportLog(format, module) {
  try {
    fbDb.collection('users').doc(session.user.uid).collection('export_logs').add({
      format, module, exportedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e) {}
}

