/* ══════════════════════════════════════════════════════════════════════
   YIELD / FEES — Grupo C separado na Carteira
   ══════════════════════════════════════════════════════════════════════ */

function buildYieldSection() {
  const entries = yLoad();

  // Aggregate by token symbol
  const byToken = {};
  entries.forEach(e => {
    const keyA = e.symA || 'A';
    const keyB = e.symB || 'B';
    if(!byToken[keyA]) byToken[keyA] = { sym: keyA, qty: 0, usd: 0 };
    if(!byToken[keyB]) byToken[keyB] = { sym: keyB, qty: 0, usd: 0 };
    byToken[keyA].qty += parseFloat(e.qtyA || 0);
    byToken[keyA].usd += parseFloat(e.qtyA || 0) * parseFloat(e.priceA || 0);
    byToken[keyB].qty += parseFloat(e.qtyB || 0);
    byToken[keyB].usd += parseFloat(e.qtyB || 0) * parseFloat(e.priceB || 1);
  });

  // Aggregate by pool
  const byPool = {};
  entries.forEach(e => {
    const k = e.poolKey;
    if(!byPool[k]) byPool[k] = { name: e.poolName || k, total: 0, count: 0 };
    byPool[k].total += parseFloat(e.valueUSD || 0);
    byPool[k].count++;
  });

  const totalYieldUSD = entries.reduce((s, e) => s + parseFloat(e.valueUSD || 0), 0);
  const tokenRows     = Object.values(byToken).filter(t => t.qty > 0).sort((a,b) => b.usd - a.usd);
  const poolRows      = Object.values(byPool).sort((a,b) => b.total - a.total);

  // Recent entries (last 10)
  const recent = [...entries].sort((a,b) => b.ts - a.ts).slice(0, 10);

  return `
  <div class="card" style="margin-top:1rem;border-color:rgba(57,255,138,.2);background:linear-gradient(135deg,var(--bg2),rgba(57,255,138,.02))">
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:8px">
      <div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">💧</span>
          <span class="sec-label" style="margin-bottom:0">Yield / Taxas Coletadas</span>
          <span style="font-size:9px;padding:2px 7px;border-radius:99px;background:rgba(57,255,138,.1);color:var(--green);border:1px solid rgba(57,255,138,.2);font-family:monospace;font-weight:700">RENDIMENTO</span>
        </div>
        <div style="font-size:12px;color:var(--text3);margin-top:3px">Tokens recebidos como taxa de pools DeFi · custo de entrada: zero</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:800;color:var(--green)">+$${totalYieldUSD.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        <div style="font-size:11px;color:var(--text3)">${entries.length} coleta${entries.length!==1?'s':''} registrada${entries.length!==1?'s':''}</div>
      </div>
    </div>

    ${entries.length === 0 ? `
    <div style="text-align:center;padding:2rem;color:var(--text3)">
      <div style="font-size:32px;margin-bottom:.75rem;opacity:.3">💧</div>
      <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:.25rem">Nenhum yield registrado ainda</div>
      <div style="font-size:12px">Vá em Pool de Liquidez → selecione uma pool → <strong>Registrar taxas coletadas</strong></div>
    </div>` : `

    <div class="grid2" style="margin-bottom:1.25rem">
      <!-- Acumulado por token -->
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;font-family:monospace;margin-bottom:.75rem">Por Token</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${tokenRows.map(t => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg3);border-radius:8px;border:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:32px;height:32px;border-radius:8px;background:rgba(57,255,138,.15);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--green)">${t.sym.slice(0,3)}</div>
              <div>
                <div style="font-size:13px;font-weight:700;color:var(--text)">${t.sym}</div>
                <div style="font-size:11px;color:var(--text3)">${t.qty.toFixed(6)} tokens</div>
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:13px;font-weight:700;color:var(--green)">+$${t.usd.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
              <div style="font-size:10px;color:var(--text3)">custo: $0.00</div>
            </div>
          </div>`).join('')}
        </div>
      </div>

      <!-- Por pool -->
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;font-family:monospace;margin-bottom:.75rem">Por Pool</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${poolRows.map((p, i) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg3);border-radius:8px;border:1px solid var(--border)">
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--text)">🌊 ${p.name}</div>
              <div style="font-size:11px;color:var(--text3)">${p.count} coleta${p.count!==1?'s':''}</div>
            </div>
            <div style="font-size:13px;font-weight:700;color:var(--green)">+$${p.total.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Histórico de coletas -->
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;font-family:monospace">Histórico de Coletas</div>
        ${entries.length > 10 ? `<span style="font-size:11px;color:var(--text3)">${entries.length - 10} mais antigas ocultas</span>` : ''}
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="text-align:left;padding:6px 8px;font-size:10px;color:var(--text3);white-space:nowrap">Data</th>
              <th style="text-align:left;padding:6px 8px;font-size:10px;color:var(--text3)">Pool</th>
              <th style="text-align:right;padding:6px 8px;font-size:10px;color:var(--text3)">Token A</th>
              <th style="text-align:right;padding:6px 8px;font-size:10px;color:var(--text3)">Token B</th>
              <th style="text-align:right;padding:6px 8px;font-size:10px;color:var(--text3)">USD est.</th>
              <th style="text-align:left;padding:6px 8px;font-size:10px;color:var(--text3)">Nota</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${recent.map(e => `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:7px 8px;color:var(--text2);white-space:nowrap">${e.date}</td>
              <td style="padding:7px 8px;color:var(--text)">🌊 ${e.poolName||'—'}</td>
              <td style="padding:7px 8px;text-align:right">
                ${parseFloat(e.qtyA||0)>0 ? `<span style="color:var(--green)">${parseFloat(e.qtyA).toFixed(6)}</span> <span style="color:var(--text3);font-size:10px">${e.symA||''}</span>` : '<span style="color:var(--text3)">—</span>'}
              </td>
              <td style="padding:7px 8px;text-align:right">
                ${parseFloat(e.qtyB||0)>0 ? `<span style="color:var(--green)">${parseFloat(e.qtyB).toFixed(6)}</span> <span style="color:var(--text3);font-size:10px">${e.symB||''}</span>` : '<span style="color:var(--text3)">—</span>'}
              </td>
              <td style="padding:7px 8px;text-align:right;color:var(--amber);font-weight:600">+$${parseFloat(e.valueUSD||0).toFixed(2)}</td>
              <td style="padding:7px 8px;color:var(--text3)">${e.note||'—'}</td>
              <td style="padding:7px 8px">
                <button class="btn btn-xs" style="color:var(--red)" onclick="deleteYieldEntry(${e.ts})">✕</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`}
  </div>`;
}

/* ── Delete a yield entry ── */
function deleteYieldEntry(ts) {
  if(!confirm('Remover esta entrada de yield?')) return;
  const entries = yLoad().filter(e => e.ts !== ts);
  ySave(entries);
  showToast('Entrada removida.', 'success');
  renderWallet(); // re-render to update section
}

/* ── Sync existing yield entries from Firestore on login ── */
async function syncYieldFromFirestore(uid) {
  try {
    const doc = await fbDb.collection('users').doc(uid).get();
    if(doc.exists && doc.data().yield_entries) {
      const remote = doc.data().yield_entries;
      const local  = yLoad();
      // Merge: keep local if more recent, otherwise use remote
      if(remote.length > local.length) {
        stSet(YIELD_KEY(), remote);
      }
    }
  } catch(e) { console.warn('syncYield error:', e); }
}

