function renderFinance() {
  const panel = document.getElementById('panel-finance');
  const allTxs  = fLoad().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const txs     = finFilterPeriod(allTxs, finCurrentPeriod);
  const { receitas, despesas, saldo } = finTotals(txs);
  const allTotals = finTotals(allTxs);

  // Category breakdown for period
  const byCatRec = {}, byCatDes = {};
  txs.forEach(t=>{
    if(t.type==='receita') byCatRec[t.category]=(byCatRec[t.category]||0)+parseFloat(t.amount||0);
    else byCatDes[t.category]=(byCatDes[t.category]||0)+parseFloat(t.amount||0);
  });

  // Monthly cashflow for bar chart (last 6 months)
  const monthLabels=[], monthRec=[], monthDes=[];
  for(let i=5;i>=0;i--){
    const d=new Date(); d.setMonth(d.getMonth()-i); d.setDate(1);
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    const key = `${mm}/${yyyy}`;
    monthLabels.push(key);
    const mo=allTxs.filter(t=>{ const td=parseTxDate(t.date); return td.getMonth()===d.getMonth()&&td.getFullYear()===d.getFullYear(); });
    monthRec.push(+mo.filter(t=>t.type==='receita').reduce((s,t)=>s+parseFloat(t.amount||0),0).toFixed(2));
    monthDes.push(+mo.filter(t=>t.type==='despesa').reduce((s,t)=>s+parseFloat(t.amount||0),0).toFixed(2));
  }

  // Build transaction rows
  const filtered = finTypeFilter==='todos' ? txs : txs.filter(t=>t.type===finTypeFilter);

  panel.innerHTML = `
  <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:1.25rem">
    <div><h2>Finanças</h2><p class="sub">Controle de receitas, despesas e fluxo de caixa</p></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-sm" onclick="exportFinanceExcel()" title="Exportar Excel">📊 Excel</button>
      <button class="btn btn-sm" onclick="exportFinancePDF()" title="Exportar PDF">📄 PDF</button>
      <button class="btn btn-primary" onclick="openAddTransactionModal()">${t('new_transaction')}</button>
    </div>
  </div>

  <div class="grid4" style="margin-bottom:1rem">
    <div class="mc" style="border-color:rgba(57,255,138,.2)">
      <div class="lbl">${t('income')} (${appLang==='en'?'period':'período'})</div>
      <div class="val pos" style="font-size:20px">$${receitas.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      <div class="sub2">${txs.filter(t=>t.type==='receita').length} lançamentos</div>
    </div>
    <div class="mc" style="border-color:rgba(255,83,112,.2)">
      <div class="lbl">${t('expenses')} (${appLang==='en'?'period':'período'})</div>
      <div class="val neg" style="font-size:20px">$${despesas.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      <div class="sub2">${txs.filter(t=>t.type==='despesa').length} lançamentos</div>
    </div>
    <div class="mc" style="border-color:${saldo>=0?'rgba(57,255,138,.2)':'rgba(255,83,112,.2)'}">
      <div class="lbl">${t('balance')} ${appLang==='en'?'(net)':'líquido'}</div>
      <div class="val ${saldo>=0?'pos':'neg'}" style="font-size:20px">${saldo>=0?'+':''}$${Math.abs(saldo).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      <div class="sub2">receitas − despesas</div>
    </div>
    <div class="mc">
      <div class="lbl">${t('balance')} ${appLang==='en'?'(cumulative)':'acumulado total'}</div>
      <div class="val ${allTotals.saldo>=0?'pos':'neg'}" style="font-size:20px">${allTotals.saldo>=0?'+':''}$${Math.abs(allTotals.saldo).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      <div class="sub2">histórico completo</div>
    </div>
  </div>

  <div class="grid2" style="margin-bottom:1rem">
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <div class="sec-label" style="margin-bottom:0">Fluxo mensal</div>
      </div>
      <div style="position:relative;height:180px;margin-bottom:.5rem"><canvas id="fin-bar-chart"></canvas></div>
      <div style="display:flex;gap:12px;margin-top:.75rem">
        <div style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text2)"><div style="width:10px;height:10px;border-radius:2px;background:var(--green);opacity:.8"></div>${t('income')}</div>
        <div style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text2)"><div style="width:10px;height:10px;border-radius:2px;background:var(--red);opacity:.8"></div>${t('expenses')}</div>
      </div>
    </div>

    <div class="card">
      <div class="sec-label">Top categorias (período)</div>
      <div style="margin-bottom:.75rem">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">${t('income')}</div>
        ${Object.entries(byCatRec).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([cat,val])=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:14px">${FIN_EMOJIS[cat]||'📦'}</span>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
              <span style="color:var(--text2)">${cat}</span>
              <span style="color:var(--green);font-weight:600">$${val.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            </div>
            <div class="alloc-bar-bg"><div class="alloc-bar-fill" style="width:${receitas>0?((val/receitas)*100).toFixed(1):0}%;background:var(--green);opacity:.7"></div></div>
          </div>
        </div>`).join('')||'<div style="font-size:13px;color:var(--text3)">Nenhuma receita no período</div>'}
      </div>
      <div style="border-top:1px solid var(--border);padding-top:.75rem">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">${t('expenses')}</div>
        ${Object.entries(byCatDes).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([cat,val])=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:14px">${FIN_EMOJIS[cat]||'📦'}</span>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
              <span style="color:var(--text2)">${cat}</span>
              <span style="color:var(--red);font-weight:600">$${val.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            </div>
            <div class="alloc-bar-bg"><div class="alloc-bar-fill" style="width:${despesas>0?((val/despesas)*100).toFixed(1):0}%;background:var(--red);opacity:.7"></div></div>
          </div>
        </div>`).join('')||'<div style="font-size:13px;color:var(--text3)">Nenhuma despesa no período</div>'}
      </div>
    </div>
  </div>

  <div class="card" style="padding:0">
    <div style="padding:1rem 1.25rem .75rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${['7d','30d','90d','ano','todos'].map(p=>`<button class="period-btn ${p===finCurrentPeriod?'active':''}" onclick="setFinPeriod('${p}')">${p==='7d'?'7 dias':p==='30d'?'30 dias':p==='90d'?'90 dias':p==='ano'?'Este ano':'Todos'}</button>`).join('')}
      </div>
      <div style="display:flex;gap:6px">
        ${['todos','receita','despesa'].map(tp=>`<button class="tag-btn ${tp===finTypeFilter?'active':''}" onclick="setFinType('${tp}')">${tp==='todos'?(appLang==='en'?'All':'Todos'):tp==='receita'?t('income'):t('expenses')}</button>`).join('')}
      </div>
    </div>

    <div style="padding:0 1.25rem;overflow-x:auto">
      <table style="min-width:500px">
        <thead><tr>
          <th style="width:36px"></th>
          <th>Descrição</th>
          <th>Categoria</th>
          <th>Data</th>
          <th style="text-align:right">Valor</th>
          <th style="width:36px"></th>
        </tr></thead>
        <tbody>
          ${filtered.length===0?`<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:1.5rem">Nenhuma transação encontrada</td></tr>`:
            filtered.map(t=>`<tr>
              <td>
                <div class="fin-icon ${t.type}">
                  <span style="font-size:14px">${FIN_EMOJIS[t.category]||'📦'}</span>
                </div>
              </td>
              <td>
                <div style="font-size:13px;font-weight:500;color:var(--text)">${t.description||t.category}</div>
                ${t.tags?`<div style="font-size:11px;color:var(--text3);margin-top:2px">${t.tags}</div>`:''}
                ${t.recurrent?`<span class="badge bb" style="font-size:10px;padding:1px 6px">${t.recurrentPeriod||'recorrente'}</span>`:''}
              </td>
              <td><span class="badge ${t.type==='receita'?'bg':'br'}" style="font-size:10px">${t.category}</span></td>
              <td style="font-size:12px;color:var(--text2);white-space:nowrap">${new Date(t.date+'T00:00:00').toLocaleDateString('pt-BR')}</td>
              <td style="text-align:right;font-weight:700;font-size:14px;color:${t.type==='receita'?'var(--green)':'var(--red)'};white-space:nowrap">
                ${t.type==='receita'?'+':'-'}$${parseFloat(t.amount).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
              </td>
              <td style="display:flex;gap:4px;align-items:center">
                <button class="btn btn-sm" style="padding:2px 8px;font-size:11px" onclick="editTransaction('${t.ts}')">✏</button>
                <button class="btn btn-sm btn-danger" style="padding:2px 8px;font-size:11px" onclick="deleteTransaction('${t.ts}')">✕</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${filtered.length>0?`<div style="padding:.75rem 1.25rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:13px">
      <span style="color:var(--text2)">${filtered.length} transação${filtered.length!==1?'ões':''}</span>
      <span style="color:var(--text2)">${t('balance')} ${appLang==='en'?'for period':'do período'}: <strong style="color:${saldo>=0?'var(--green)':'var(--red)'}">${saldo>=0?'+':''}$${Math.abs(saldo).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></span>
    </div>`:''}
  </div>`;

  // draw bar chart
  requestAnimationFrame(()=>{
    const ctx = document.getElementById('fin-bar-chart');
    if(!ctx) return;
    if(finBarChart) finBarChart.destroy();
    finBarChart = new Chart(ctx, {
      type:'bar',
      data:{
        labels: monthLabels,
        datasets:[
          { label:t('income'), data:monthRec, backgroundColor:'rgba(57,255,138,0.7)', borderColor:'rgba(57,255,138,1)', borderWidth:1, borderRadius:4 },
          { label:t('expenses'), data:monthDes, backgroundColor:'rgba(255,83,112,0.7)', borderColor:'rgba(255,83,112,1)', borderWidth:1, borderRadius:4 }
        ]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`$${c.parsed.y.toLocaleString('pt-BR',{minimumFractionDigits:2})}` } } },
        layout:{ padding:{ top:4, bottom:4 } },
        scales:{
          x:{ ticks:{color:'#7d8590',font:{size:10},maxRotation:0,autoSkip:true}, grid:{color:'rgba(99,142,255,0.05)'} },
          y:{ ticks:{color:'#7d8590',font:{size:10},callback:v=>'$'+v.toLocaleString('pt-BR')}, grid:{color:'rgba(99,142,255,0.07)'} }
        }
      }
    });
  });
  
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
    <div class="card" style="background: var(--red-bg); border-color: var(--red); margin-top: 2rem;">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 20px; flex-shrink: 0;">💡</span>
        <div>
          <h3 style="color: var(--red-text); margin-bottom: 8px;">Dicas de Uso - Finanças</h3>
          <ul style="list-style: none; padding: 0; margin: 0; color: var(--text2); font-size: 13px; line-height: 1.6;">
            <li>➕ <strong>Adicionar Transação:</strong> Registre receitas e despesas com categorias e datas para rastreamento completo.</li>
            <li>📊 <strong>Análise de Período:</strong> Use os filtros para analisar dados de 7 dias até histórico completo.</li>
            <li>📈 <strong>Gráfico de Fluxo:</strong> Visualize receitas vs despesas nos últimos 6 meses para identificar tendências.</li>
            <li>🏷️ <strong>Categorização:</strong> Organize suas transações em categorias (Alimentação, Transporte, etc) para melhor controle.</li>
            <li>🔄 <strong>Transações Recorrentes:</strong> Marque despesas/receitas recorrentes para automatizar registros mensais.</li>
          </ul>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => {
    const panel = document.getElementById('panel-finance');
    if(panel) panel.appendChild(tipsDiv);
  }, 100);
}

function setFinPeriod(p) { finCurrentPeriod=p; renderFinance(); }
function setFinType(tp)   { finTypeFilter=tp;   renderFinance(); }

function deleteTransaction(ts) {
  if(!confirm('Excluir esta transação?')) return;
  fSave(fLoad().filter(t=>String(t.ts)!==String(ts)));
  renderFinance();
  renderDashboard();
  showToast('Transação excluída.');
}

function editTransaction(ts) {
  const txs = fLoad();
  const tx = txs.find(t=>String(t.ts)===String(ts));
  if(!tx) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'edit-tx-overlay';
  overlay.style.cssText = 'overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  const typeLabel = tx.type==='receita'?'Receita':'Despesa';
  const catOptions = tx.type==='receita'
    ? Object.entries(FIN_CATS_RECEITA).map(([g,items])=>`<optgroup label="· ${g}">${items.map(c=>`<option${tx.category===c?' selected':''}>${c}</option>`).join('')}</optgroup>`).join('')
    : Object.entries(FIN_CATS_DESPESA).map(([g,items])=>`<optgroup label="· ${g}">${items.map(c=>`<option${tx.category===c?' selected':''}>${c}</option>`).join('')}</optgroup>`).join('');
  overlay.innerHTML = `
  <div class="modal" style="max-width:460px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div><h3 style="margin-bottom:2px">Editar ${typeLabel}</h3></div>
      <button class="btn btn-sm" onclick="document.getElementById('edit-tx-overlay').remove()">✕</button>
    </div>
    <div class="field" style="margin-bottom:12px">
      <label>Descrição</label>
      <input id="etx-desc" value="${tx.description||''}">
    </div>
    <div class="grid2" style="margin-bottom:12px">
      <div class="field"><label>Valor (USD) *</label>
        <div class="suf"><input type="text" id="etx-amount" value="${tx.amount}"><s>$</s></div>
      </div>
      <div class="field"><label>Data *</label>
        <input type="date" id="etx-date" value="${tx.date}">
      </div>
    </div>
    <div class="field" style="margin-bottom:12px">
      <label>Categoria *</label>
      <select id="etx-category">${catOptions}</select>
    </div>
    <div class="field" style="margin-bottom:1rem">
      <label>Tags / Notas</label>
      <input id="etx-tags" value="${tx.tags||''}">
    </div>
    <div id="etx-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="saveEditTransaction('${ts}')">Salvar alterações</button>
      <button class="btn" onclick="document.getElementById('edit-tx-overlay').remove()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function saveEditTransaction(ts) {
  const txs = fLoad();
  const idx = txs.findIndex(t=>String(t.ts)===String(ts));
  const errEl = document.getElementById('etx-err');
  if(idx<0){ errEl.textContent='Transação não encontrada.'; errEl.style.display='block'; return; }
  const amount = parseCommaNumber(document.getElementById('etx-amount').value);
  const date   = document.getElementById('etx-date').value;
  if(!amount||amount<=0){ errEl.textContent='Informe um valor válido.'; errEl.style.display='block'; return; }
  if(!date){ errEl.textContent='Informe a data.'; errEl.style.display='block'; return; }
  txs[idx] = { ...txs[idx], amount, date, category:document.getElementById('etx-category').value, description:document.getElementById('etx-desc').value.trim()||txs[idx].category, tags:document.getElementById('etx-tags').value.trim() };
  fSave(txs);
  document.getElementById('edit-tx-overlay').remove();
  showToast('Transação atualizada!');
  renderFinance();
  renderDashboard();
}

function openAddTransactionModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'add-tx-overlay';
  overlay.style.cssText = 'overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  const today = new Date().toISOString().split('T')[0];

  overlay.innerHTML = `
  <div class="modal" style="max-width:500px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div><h3 style="margin-bottom:2px">${t('new_transaction')}</h3><p class="sub" style="margin-top:0">${appLang==='en'?'Record an income or expense':'Registre uma receita ou despesa'}</p></div>
      <button class="btn btn-sm" onclick="closeAddTransactionModal()">✕</button>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:1.25rem">
      <button class="fin-type-btn receita active" id="ftb-receita" onclick="setTxType('receita')">+ Receita</button>
      <button class="fin-type-btn despesa" id="ftb-despesa" onclick="setTxType('despesa')">− Despesa</button>
    </div>
    <input type="hidden" id="tx-type" value="receita">

    <div class="field" style="margin-bottom:12px">
      <label>Descrição</label>
      <input id="tx-desc" placeholder="ex: Taxas coletadas ETH/USDC, Gas Ethereum...">
    </div>

    <div class="grid2" style="margin-bottom:12px">
      <div class="field">
        <label>Valor (USD) <span style="color:var(--red)">*</span></label>
        <div class="suf"><input type="text" id="tx-amount" placeholder="0.00"><s>$</s></div>
      </div>
      <div class="field">
        <label>Data <span style="color:var(--red)">*</span></label>
        <input type="date" id="tx-date" value="${today}">
      </div>
    </div>

    <div class="field" style="margin-bottom:12px">
      <label>Categoria <span style="color:var(--red)">*</span></label>
      <select id="tx-category">
        <optgroup label="— ${t('income')} —" id="tx-cat-receita">
          ${Object.entries(FIN_CATS_RECEITA).map(([grp,items])=>
            `<optgroup label="· ${grp}">${items.map(c=>`<option>${c}</option>`).join('')}</optgroup>`
          ).join('')}
        </optgroup>
        <optgroup label="— ${t('expenses')} —" id="tx-cat-despesa" style="display:none">
          ${Object.entries(FIN_CATS_DESPESA).map(([grp,items])=>
            `<optgroup label="· ${grp}">${items.map(c=>`<option>${c}</option>`).join('')}</optgroup>`
          ).join('')}
        </optgroup>
      </select>
    </div>

    <div class="field" style="margin-bottom:12px">
      <label>Tags / Notas (opcional)</label>
      <input id="tx-tags" placeholder="ex: ETH/USDC, Uniswap v3, Arbitrum">
    </div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.25rem;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius)">
      <input type="checkbox" id="tx-recurrent" onchange="toggleRecurrent()">
      <label for="tx-recurrent" style="font-size:13px;color:var(--text2);cursor:pointer">Transação recorrente</label>
      <select id="tx-recurrent-period" style="display:none;margin-left:auto;height:30px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);padding:0 8px">
        <option value="semanal">Semanal</option>
        <option value="mensal" selected>Mensal</option>
        <option value="trimestral">Trimestral</option>
        <option value="anual">Anual</option>
      </select>
    </div>

    <div id="tx-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="saveTransaction()">Salvar transação</button>
      <button class="btn" onclick="closeAddTransactionModal()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>document.getElementById('tx-desc').focus(), 50);
}

function closeAddTransactionModal() {
  const el = document.getElementById('add-tx-overlay');
  if(el) el.remove();
}

function setTxType(type) {
  document.getElementById('tx-type').value = type;
  document.getElementById('ftb-receita').classList.toggle('active', type==='receita');
  document.getElementById('ftb-despesa').classList.toggle('active', type==='despesa');
  const sel = document.getElementById('tx-category');
  const optR = document.getElementById('tx-cat-receita');
  const optD = document.getElementById('tx-cat-despesa');
  if(type==='receita') {
    optR.style.display=''; optD.style.display='none';
    sel.value = FIN_CATS_RECEITA_FLAT[0];
  } else {
    optD.style.display=''; optR.style.display='none';
    sel.value = FIN_CATS_DESPESA_FLAT[0];
  }
}

function toggleRecurrent() {
  const cb = document.getElementById('tx-recurrent');
  const sel = document.getElementById('tx-recurrent-period');
  sel.style.display = cb.checked ? 'block' : 'none';
}

function saveTransaction() {
  const type       = document.getElementById('tx-type').value;
  const desc       = document.getElementById('tx-desc').value.trim();
  const amount     = parseCommaNumber(document.getElementById('tx-amount').value)||0;
  const date       = document.getElementById('tx-date').value;
  const category   = document.getElementById('tx-category').value;
  const tags       = document.getElementById('tx-tags').value.trim();
  const recurrent  = document.getElementById('tx-recurrent').checked;
  const recPeriod  = document.getElementById('tx-recurrent-period').value;
  const errEl      = document.getElementById('tx-err');

  if(!amount||amount<=0) { errEl.textContent='Informe um valor válido.'; errEl.style.display='block'; return; }
  if(!date)              { errEl.textContent='Informe a data.'; errEl.style.display='block'; return; }
  errEl.style.display='none';

  const txs = fLoad();
  txs.push({ ts:Date.now(), type, description:desc||category, amount, date, category, tags, recurrent, recurrentPeriod:recurrent?recPeriod:null });
  fSave(txs);
  closeAddTransactionModal();
  showToast(`${type==='receita'?'Receita':'Despesa'} registrada!`);
  renderFinance();
  renderDashboard();
}

/* ══════════════════════════════════════════
   SETTINGS & PROFILE MODULE
   Key: uid_profile → {name, nickname, phone, bio, country, timezone, avatar, notifications, currency}
   ══════════════════════════════════════════ */

const PROF_KEY  = () => session.user.uid + '_profile';
function profLoad() {
  // Return cached local copy; background-synced from Firestore in renderSettings
  return stGet(PROF_KEY()) || {};
}
function profSave(p) {
  stSet(PROF_KEY(), p);
  // Async persist to Firestore
  fbDb.collection('users').doc(session.user.uid).set(p, { merge: true }).catch(e => console.warn('profSave fs error', e));
}

const COUNTRIES = ['Brasil','Estados Unidos','Portugal','Argentina','México','Espanha','França','Alemanha','Reino Unido','Japão','Outro'];
const TIMEZONES = ['America/Sao_Paulo','America/New_York','America/Los_Angeles','Europe/Lisbon','Europe/Madrid','Europe/London','Asia/Tokyo','UTC'];
const CURRENCIES = ['USD','BRL','EUR','GBP','JPY','ARS','MXN'];

