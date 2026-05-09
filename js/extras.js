/* ══════════════════════════════════════════
   POLYGON WALLET CONNECT
   ══════════════════════════════════════════ */

const POLYGON_CHAIN_ID = '0x89'; // 137 decimal
const POLYGON_PARAMS = {
  chainId: POLYGON_CHAIN_ID,
  chainName: 'Polygon Mainnet',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: ['https://polygon-rpc.com'],
  blockExplorerUrls: ['https://polygonscan.com'],
};

function getConnectedWallet() {
  if (!session) return null;
  // Check localStorage cache first (fastest), profile cache as fallback
  const local = stGet(session.user.uid + '_wallet_addr');
  if (local) return local;
  const prof = stGet(PROF_KEY());
  return prof?.walletAddress || null;
}
function getLinkedGoogle() {
  if (!session) return null;
  const local = stGet(session.user.uid + '_google_linked');
  if (local) return local;
  const prof = stGet(PROF_KEY());
  return prof?.googleLinked || null;
}
function shortAddr(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

async function openWalletConnectModal() {
  if (!window.ethereum) {
    openNoMetaMaskModal();
    return;
  }
  try {
    showToast('Conectando à Polygon...', 2000);
    // Request accounts
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || !accounts.length) { showToast('Nenhuma conta encontrada.'); return; }

    // Switch / add Polygon network
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: POLYGON_CHAIN_ID }] });
    } catch (switchErr) {
      if (switchErr.code === 4902) {
        await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [POLYGON_PARAMS] });
      } else { throw switchErr; }
    }

    const addr = accounts[0];
    stSet(session.user.uid + '_wallet_addr', addr);
    fbDb.collection('users').doc(session.user.uid).set({ walletAddress: addr }, { merge: true }).catch(()=>{});
    showToast('✓ Carteira Polygon conectada!');
    renderApp();
    // re-render settings if open
    if (document.getElementById('connections-section')) renderSettings();
  } catch (err) {
    if (err.code === 4001) { showToast('Conexão cancelada pelo usuário.'); }
    else { showToast('Erro ao conectar: ' + (err.message || 'desconhecido')); }
  }
}

function disconnectWallet() {
  if (!confirm('Desconectar a carteira Polygon desta conta?')) return;
  stDel(session.user.uid + '_wallet_addr');
  fbDb.collection('users').doc(session.user.uid).set({ walletAddress: null }, { merge: true }).catch(()=>{});
  showToast('Carteira desconectada.');
  renderApp();
  if (document.getElementById('connections-section')) renderSettings();
}

function openNoMetaMaskModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'no-mm-overlay';
  overlay.innerHTML = `
  <div class="modal" style="max-width:380px;text-align:center">
    <div style="font-size:38px;margin-bottom:.75rem">🦊</div>
    <h3 style="margin-bottom:.5rem">MetaMask não detectado</h3>
    <p style="font-size:13px;color:var(--text2);margin-bottom:1.25rem">Para conectar uma carteira Polygon, instale a extensão MetaMask ou use um navegador compatível com Web3.</p>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="font-size:13px">Instalar MetaMask</a>
      <button class="btn" onclick="document.getElementById('no-mm-overlay').remove()">Fechar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

/* ══════════════════════════════════════════
   GOOGLE ACCOUNT LINK
   ══════════════════════════════════════════ */

function linkGoogleAccount() {
  const prefillEmail = (session && session.user && session.user.email && session.user.email.endsWith('@gmail.com')) ? session.user.email : '';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'google-link-overlay';
  overlay.innerHTML =
    '<div class="modal" style="max-width:400px">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:1.25rem">' +
        '<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
        '<h3>Vincular conta Google</h3>' +
      '</div>' +
      '<p style="font-size:13px;color:var(--text2);margin-bottom:1rem">Ao vincular seu Google, você poderá ser identificado em negociações P2P e receber pagamentos de forma mais ágil.</p>' +
      '<div class="field" style="margin-bottom:1rem">' +
        '<label>E-mail Google</label>' +
        '<input id="google-email-input" type="email" placeholder="seuemail@gmail.com" value="' + prefillEmail + '">' +
      '</div>' +
      '<div style="background:var(--blue-bg);border:1px solid rgba(99,142,255,.2);border-radius:var(--radius);padding:.75rem;margin-bottom:1rem;font-size:12px;color:var(--blue-text)">' +
        'ℹ️ Em produção, este fluxo será autenticado via Google OAuth 2.0. Por ora, o e-mail é armazenado localmente para teste.' +
      '</div>' +
      '<div id="google-link-err" class="err" style="display:none;margin-bottom:.5rem"></div>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-primary" onclick="confirmLinkGoogle()" style="background:#4285F4;border-color:#4285F4">Vincular</button>' +
        '<button class="btn" onclick="document.getElementById(\'google-link-overlay\').remove()">Cancelar</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  setTimeout(function() { var el = document.getElementById('google-email-input'); if(el) el.focus(); }, 50);
}

function confirmLinkGoogle() {
  const email = (document.getElementById('google-email-input')?.value || '').trim();
  const errEl = document.getElementById('google-link-err');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = 'Informe um e-mail válido.';
    errEl.style.display = 'block';
    return;
  }
  stSet(session.user.uid + '_google_linked', email);
  fbDb.collection('users').doc(session.user.uid).set({ googleLinked: email }, { merge: true }).catch(()=>{});
  document.getElementById('google-link-overlay')?.remove();
  showToast('✓ Conta Google vinculada!');
  if (document.getElementById('connections-section')) renderSettings();
}

function unlinkGoogle() {
  if (!confirm('Desvincular sua conta Google desta plataforma?')) return;
  stDel(session.user.uid + '_google_linked');
  fbDb.collection('users').doc(session.user.uid).set({ googleLinked: null }, { merge: true }).catch(()=>{});
  showToast('Conta Google desvinculada.');
  if (document.getElementById('connections-section')) renderSettings();
}

/* ══════════════════════════════════════════
   RELATÓRIOS BR (Depto. Pessoal)
   ══════════════════════════════════════════ */

function renderRelatoriosBR() {
  const panel = document.getElementById('panel-relatoriosbr');
  const emps = dpEmpLoad();
  const ym = new Date().toISOString().substring(0,7);
  const fpData = dpFpLoad(ym);

  let html = `
    <div class="panel-header">
      <h2>📄 Relatórios BR</h2>
      <p style="color:var(--text2);font-size:13px">Holerites, recibos e guias do Depto. Pessoal</p>
    </div>
    <div class="panel-content">
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;margin-bottom:1.5rem">
        <h3 style="margin-bottom:1rem;font-size:14px">📋 Holerites - Mês ${ym}</h3>
        ${fpData.length > 0 ? `
          <div style="display:grid;gap:10px">
            ${fpData.map(f => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg);border-radius:var(--radius);border:1px solid var(--border)">
                <div>
                  <div style="font-weight:600;color:var(--text)">${f.empNome || 'Funcionário'}</div>
                  <div style="font-size:12px;color:var(--text2)">ID: ${f.empKey}</div>
                </div>
                <button class="btn btn-sm" onclick="dpOpenRecibo('${f.empKey}')" style="background:var(--green-bg);color:var(--green-text);border-color:var(--green)">
                  📥 Visualizar
                </button>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align:center;color:var(--text3);padding:2rem">
            Nenhum holerite gerado para este mês
          </div>
        `}
      </div>

      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem">
        <h3 style="margin-bottom:1rem;font-size:14px">📌 Guias e Impostos</h3>
        <div style="display:grid;gap:10px">
          <button class="btn btn-primary" onclick="alert('Função em desenvolvimento')">
            📊 Gerar DARF
          </button>
          <button class="btn btn-primary" onclick="alert('Função em desenvolvimento')">
            📋 Gerar GPS
          </button>
          <button class="btn btn-primary" onclick="alert('Função em desenvolvimento')">
            🏦 Gerar GRF
          </button>
        </div>
      </div>
    </div>
  `;

  panel.innerHTML = html;
}

/* ══════════════════════════════════════════
   RELATÓRIOS JP (人事部 Japão)
   ══════════════════════════════════════════ */

function renderRelatoriosJP() {
  const panel = document.getElementById('panel-relatoriosjp');
  const ym = new Date().toISOString().substring(0,7);

  let html = `
    <div class="panel-header">
      <h2>📄 Relatórios JP</h2>
      <p style="color:var(--text2);font-size:13px">Holerites e guias do 人事部 (Japão)</p>
    </div>
    <div class="panel-content">
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;margin-bottom:1.5rem">
        <h3 style="margin-bottom:1rem;font-size:14px">📋 Holerites - Mês ${ym}</h3>
        <div style="text-align:center;color:var(--text3);padding:2rem">
          Dados sincronizando do 人事部 Japão...
        </div>
      </div>

      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem">
        <h3 style="margin-bottom:1rem;font-size:14px">📌 Guias (Japão)</h3>
        <div style="display:grid;gap:10px">
          <button class="btn btn-primary" onclick="alert('Função em desenvolvimento')">
            📊 Gerar Relatório de Impostos (日本)
          </button>
          <button class="btn btn-primary" onclick="alert('Função em desenvolvimento')">
            📋 Gerar Comprovante de Renda (日本)
          </button>
          <button class="btn btn-primary" onclick="alert('Função em desenvolvimento')">
            🏦 Gerar Guia de Contribuição (日本)
          </button>
        </div>
      </div>
    </div>
  `;

  panel.innerHTML = html;
}

/* ══════════════════════════════════════════
   IMÓVEIS - VENDAS
   ══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   IMÓVEIS - VENDAS
   ══════════════════════════════════════════ */

function renderImovelVendas() {
  const panel = document.getElementById('panel-imovelvendas');
  
  let html = `
    <div class="panel-header">
      <h2>🏠 Vendas de Imóveis</h2>
      <p style="color:var(--text2);font-size:13px">Acompanhe vendas de propriedades</p>
    </div>
    <div class="panel-content">
      <button class="btn btn-primary" onclick="alert('Função em desenvolvimento - Cadastro de vendas')">
        ➕ Adicionar Venda
      </button>
      <div style="margin-top:1.5rem;text-align:center;color:var(--text3);padding:2rem">
        Nenhuma venda cadastrada
      </div>
    </div>
  `;
  
  panel.innerHTML = html;
}

/* ══════════════════════════════════════════
   IMÓVEIS - LOCAÇÃO
   ══════════════════════════════════════════ */

function renderImovelLocacao() {
  const panel = document.getElementById('panel-imovellocation');
  const uid = session.user.uid;
  const tab = panel._tab || 'contratos';

  // ── helpers de storage ──
  const locLoad = k => stGet(uid + '_loc_' + k) || [];
  const locSave = (k, v) => stSet(uid + '_loc_' + k, v);

  const imoveis   = locLoad('imoveis');
  const locadores = locLoad('locadores');
  const locatarios= locLoad('locatarios');
  const contratos = locLoad('contratos');
  const boletos   = locLoad('boletos');

  // ── métricas ──
  const contratosAtivos = contratos.filter(c => c.status === 'ativo').length;
  const receitaMensal   = contratos.filter(c => c.status === 'ativo').reduce((s, c) => s + (parseFloat(c.aluguel) || 0), 0);
  const boletosAbertos  = boletos.filter(b => b.status === 'aberto').length;

  const tabs = [
    { id:'contratos',  label:'📋 Contratos' },
    { id:'imoveis',    label:'🏠 Imóveis' },
    { id:'locadores',  label:'👤 Locadores' },
    { id:'locatarios', label:'🧑 Locatários' },
    { id:'boletos',    label:'🔖 Boletos' },
  ];

  // ── render do conteúdo da tab ──
  const tabContents = {

    contratos: () => contratos.length === 0
      ? `<div style="text-align:center;color:var(--text3);padding:3rem">Nenhum contrato cadastrado</div>`
      : contratos.map((c, i) => {
          const im = imoveis.find(x => x.id === c.imovelId) || {};
          const lo = locadores.find(x => x.id === c.locadorId) || {};
          const lt = locatarios.find(x => x.id === c.locatarioId) || {};
          const corStatus = c.status === 'ativo' ? '#39ff8a' : c.status === 'encerrado' ? '#ff4444' : '#ff9800';
          return `
            <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem;margin-bottom:1rem">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem">
                <div>
                  <div style="font-weight:700;font-size:15px;color:var(--text)">${im.endereco || 'Imóvel não encontrado'}</div>
                  <div style="font-size:12px;color:var(--text2);margin-top:2px">Locador: ${lo.nome || '—'} · Locatário: ${lt.nome || '—'}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:11px;padding:3px 10px;border-radius:99px;border:1px solid ${corStatus};color:${corStatus}">${c.status || 'ativo'}</span>
                  <button onclick="locEditContrato(${i})" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);padding:3px 8px;cursor:pointer;font-size:12px">✏️</button>
                  <button onclick="locDeleteContrato(${i})" style="background:none;border:1px solid var(--border);border-radius:6px;color:#ff4444;padding:3px 8px;cursor:pointer;font-size:12px">✕</button>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:1rem">
                <div style="background:var(--bg2);padding:10px;border-radius:6px">
                  <div style="font-size:10px;color:var(--text3)">ALUGUEL</div>
                  <div style="font-weight:700;color:#39ff8a">R$ ${parseFloat(c.aluguel||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                </div>
                <div style="background:var(--bg2);padding:10px;border-radius:6px">
                  <div style="font-size:10px;color:var(--text3)">VENCIMENTO</div>
                  <div style="font-weight:600;color:var(--text)">Dia ${c.diaVenc || '—'}</div>
                </div>
                <div style="background:var(--bg2);padding:10px;border-radius:6px">
                  <div style="font-size:10px;color:var(--text3)">INÍCIO</div>
                  <div style="font-weight:600;color:var(--text)">${c.dataInicio || '—'}</div>
                </div>
                <div style="background:var(--bg2);padding:10px;border-radius:6px">
                  <div style="font-size:10px;color:var(--text3)">FIM</div>
                  <div style="font-weight:600;color:var(--text)">${c.dataFim || '—'}</div>
                </div>
              </div>
              <div style="display:flex;gap:8px">
                <button onclick="locGerarBoleto('${c.id}')" class="btn btn-primary" style="font-size:12px;padding:6px 14px">🔖 Gerar Boleto</button>
                <button onclick="locVerBoletos('${c.id}')" class="btn" style="font-size:12px;padding:6px 14px">📄 Ver Boletos</button>
              </div>
            </div>
          `;
        }).join(''),

    imoveis: () => imoveis.length === 0
      ? `<div style="text-align:center;color:var(--text3);padding:3rem">Nenhum imóvel cadastrado</div>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">${imoveis.map((im, i) => `
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
              <div style="font-size:28px">${im.tipo==='casa'?'🏠':im.tipo==='apartamento'?'🏢':im.tipo==='comercial'?'🏪':'🏗️'}</div>
              <div style="display:flex;gap:6px">
                <button onclick="locEditImovel(${i})" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);padding:3px 8px;cursor:pointer;font-size:11px">✏️</button>
                <button onclick="locDeleteImovel(${i})" style="background:none;border:1px solid var(--border);border-radius:6px;color:#ff4444;padding:3px 8px;cursor:pointer;font-size:11px">✕</button>
              </div>
            </div>
            <div style="font-weight:700;color:var(--text);margin-bottom:4px">${im.endereco}</div>
            <div style="font-size:12px;color:var(--text2)">${im.cidade || ''} ${im.cep ? '· CEP '+im.cep : ''}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px">${im.tipo || ''} · ${im.area ? im.area+'m²' : ''} · ${im.quartos ? im.quartos+' quartos' : ''}</div>
          </div>
        `).join('')}</div>`,

    locadores: () => locadores.length === 0
      ? `<div style="text-align:center;color:var(--text3);padding:3rem">Nenhum locador cadastrado</div>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem">${locadores.map((p, i) => `
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:18px">👤</div>
              <div style="display:flex;gap:6px">
                <button onclick="locEditPessoa('locadores',${i})" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);padding:3px 8px;cursor:pointer;font-size:11px">✏️</button>
                <button onclick="locDeletePessoa('locadores',${i})" style="background:none;border:1px solid var(--border);border-radius:6px;color:#ff4444;padding:3px 8px;cursor:pointer;font-size:11px">✕</button>
              </div>
            </div>
            <div style="font-weight:700;color:var(--text)">${p.nome}</div>
            <div style="font-size:12px;color:var(--text2)">${p.cpf || p.cnpj || ''}</div>
            <div style="font-size:12px;color:var(--text3)">${p.email || ''} ${p.telefone ? '· '+p.telefone : ''}</div>
          </div>
        `).join('')}</div>`,

    locatarios: () => locatarios.length === 0
      ? `<div style="text-align:center;color:var(--text3);padding:3rem">Nenhum locatário cadastrado</div>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem">${locatarios.map((p, i) => `
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:18px">🧑</div>
              <div style="display:flex;gap:6px">
                <button onclick="locEditPessoa('locatarios',${i})" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);padding:3px 8px;cursor:pointer;font-size:11px">✏️</button>
                <button onclick="locDeletePessoa('locatarios',${i})" style="background:none;border:1px solid var(--border);border-radius:6px;color:#ff4444;padding:3px 8px;cursor:pointer;font-size:11px">✕</button>
              </div>
            </div>
            <div style="font-weight:700;color:var(--text)">${p.nome}</div>
            <div style="font-size:12px;color:var(--text2)">${p.cpf || ''}</div>
            <div style="font-size:12px;color:var(--text3)">${p.email || ''} ${p.telefone ? '· '+p.telefone : ''}</div>
          </div>
        `).join('')}</div>`,

    boletos: () => {
      const todos = boletos.sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento));
      return todos.length === 0
        ? `<div style="text-align:center;color:var(--text3);padding:3rem">Nenhum boleto gerado</div>`
        : todos.map((b, i) => {
            const ct = contratos.find(c => c.id === b.contratoId) || {};
            const im = imoveis.find(x => x.id === ct.imovelId) || {};
            const lt = locatarios.find(x => x.id === ct.locatarioId) || {};
            const hoje = new Date(); hoje.setHours(0,0,0,0);
            const venc = new Date(b.vencimento + 'T00:00:00');
            const vencido = b.status === 'aberto' && venc < hoje;
            const cor = b.status === 'pago' ? '#39ff8a' : vencido ? '#ff4444' : '#ff9800';
            const label = b.status === 'pago' ? 'PAGO' : vencido ? 'VENCIDO' : 'ABERTO';
            return `
              <div style="background:var(--bg);border:1px solid ${cor}33;border-radius:var(--radius);padding:1.25rem;margin-bottom:0.75rem;display:flex;justify-content:space-between;align-items:center;gap:1rem">
                <div style="flex:1">
                  <div style="font-weight:700;color:var(--text)">${lt.nome || '—'}</div>
                  <div style="font-size:12px;color:var(--text2)">${im.endereco || '—'} · Ref: ${b.referencia || '—'}</div>
                  <div style="font-size:12px;color:var(--text3)">Venc: ${b.vencimento || '—'}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:18px;font-weight:700;color:${cor}">R$ ${parseFloat(b.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                  <div style="font-size:11px;color:${cor};margin-bottom:8px">${label}</div>
                  <div style="display:flex;gap:6px;justify-content:flex-end">
                    <button onclick="locImprimirBoleto(${i})" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);padding:3px 8px;cursor:pointer;font-size:11px">🖨️</button>
                    ${b.status !== 'pago' ? `<button onclick="locMarcarPago(${i})" style="background:none;border:1px solid #39ff8a44;border-radius:6px;color:#39ff8a;padding:3px 8px;cursor:pointer;font-size:11px">✓ Pago</button>` : ''}
                    <button onclick="locDeleteBoleto(${i})" style="background:none;border:1px solid var(--border);border-radius:6px;color:#ff4444;padding:3px 8px;cursor:pointer;font-size:11px">✕</button>
                  </div>
                </div>
              </div>
            `;
          }).join('');
    },
  };

  const addButtons = {
    contratos:  `<button class="btn btn-primary" onclick="locOpenContrato()">➕ Novo Contrato</button>`,
    imoveis:    `<button class="btn btn-primary" onclick="locOpenImovel()">➕ Novo Imóvel</button>`,
    locadores:  `<button class="btn btn-primary" onclick="locOpenPessoa('locadores')">➕ Novo Locador</button>`,
    locatarios: `<button class="btn btn-primary" onclick="locOpenPessoa('locatarios')">➕ Novo Locatário</button>`,
    boletos:    `<button class="btn btn-primary" onclick="locOpenBoletoManual()">➕ Boleto Manual</button>`,
  };

  panel.innerHTML = `
    <div class="panel-header">
      <h2>🔑 Locação de Imóveis</h2>
      <p style="color:var(--text2);font-size:13px">Gestão completa de aluguéis</p>
    </div>
    <div class="panel-content">

      <!-- MÉTRICAS -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem">
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1rem">
          <div style="font-size:10px;color:var(--text3)">CONTRATOS ATIVOS</div>
          <div style="font-size:24px;font-weight:700;color:var(--text)">${contratosAtivos}</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1rem">
          <div style="font-size:10px;color:var(--text3)">RECEITA MENSAL</div>
          <div style="font-size:22px;font-weight:700;color:#39ff8a">R$ ${receitaMensal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1rem">
          <div style="font-size:10px;color:var(--text3)">BOLETOS ABERTOS</div>
          <div style="font-size:24px;font-weight:700;color:#ff9800">${boletosAbertos}</div>
        </div>
      </div>

      <!-- ABAS -->
      <div style="display:flex;gap:4px;margin-bottom:1.5rem;background:var(--bg2);padding:4px;border-radius:var(--radius);overflow-x:auto">
        ${tabs.map(t => `
          <button onclick="locSetTab('${t.id}')" style="flex:1;padding:8px 12px;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;
            background:${tab===t.id?'var(--bg4)':'transparent'};
            color:${tab===t.id?'var(--text)':'var(--text2)'}">
            ${t.label}
          </button>
        `).join('')}
      </div>

      <!-- BOTÃO ADD -->
      <div style="margin-bottom:1rem">${addButtons[tab]}</div>

      <!-- CONTEÚDO -->
      <div id="loc-content">${tabContents[tab]()}</div>
    </div>
  `;

  panel._tab = tab;
}

// ── Trocar aba ──
function locSetTab(t) {
  const panel = document.getElementById('panel-imovellocation');
  panel._tab = t;
  renderImovelLocacao();
}

// ── IDs únicos ──
function locId() { return '_' + Math.random().toString(36).substr(2,9); }

// ── IMÓVEL ──
function locOpenImovel(dados={}, idx=null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:520px;max-height:90vh;overflow-y:auto">
      <h3 style="margin-bottom:1.5rem">🏠 ${idx!==null?'Editar':'Novo'} Imóvel</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="field" style="grid-column:1/-1">
          <label>Endereço completo *</label>
          <input id="li-end" value="${dados.endereco||''}" placeholder="Rua, número, complemento" style="width:100%">
        </div>
        <div class="field"><label>Cidade</label><input id="li-cidade" value="${dados.cidade||''}" placeholder="São Paulo" style="width:100%"></div>
        <div class="field"><label>CEP</label><input id="li-cep" value="${dados.cep||''}" placeholder="00000-000" style="width:100%"></div>
        <div class="field"><label>Tipo</label>
          <select id="li-tipo" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
            ${['casa','apartamento','comercial','terreno','outro'].map(t=>`<option value="${t}" ${(dados.tipo||'apartamento')===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Área (m²)</label><input id="li-area" type="number" value="${dados.area||''}" placeholder="80" style="width:100%"></div>
        <div class="field"><label>Quartos</label><input id="li-quartos" type="number" value="${dados.quartos||''}" placeholder="2" style="width:100%"></div>
        <div class="field"><label>Vagas</label><input id="li-vagas" type="number" value="${dados.vagas||''}" placeholder="1" style="width:100%"></div>
        <div class="field" style="grid-column:1/-1"><label>Observação</label>
          <textarea id="li-obs" rows="2" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px;resize:vertical">${dados.obs||''}</textarea>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:1.5rem">
        <button class="btn btn-primary" onclick="locSaveImovel(${idx})" style="flex:1">💾 Salvar</button>
        <button class="btn" onclick="document.querySelector('.modal-overlay').remove()" style="flex:1">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function locSaveImovel(idx) {
  const end = document.getElementById('li-end').value.trim();
  if(!end) { showToast('Informe o endereço'); return; }
  const uid = session.user.uid;
  const lista = stGet(uid+'_loc_imoveis') || [];
  const novo = { id: idx!==null ? lista[idx].id : locId(), endereco:end,
    cidade: document.getElementById('li-cidade').value.trim(),
    cep:    document.getElementById('li-cep').value.trim(),
    tipo:   document.getElementById('li-tipo').value,
    area:   document.getElementById('li-area').value,
    quartos:document.getElementById('li-quartos').value,
    vagas:  document.getElementById('li-vagas').value,
    obs:    document.getElementById('li-obs').value.trim(),
  };
  if(idx!==null) lista[idx]=novo; else lista.push(novo);
  stSet(uid+'_loc_imoveis', lista);
  document.querySelector('.modal-overlay').remove();
  showToast('✓ Imóvel salvo!');
  renderImovelLocacao();
}
function locEditImovel(i) { const l=stGet(session.user.uid+'_loc_imoveis')||[]; locOpenImovel(l[i],i); }
function locDeleteImovel(i) { if(!confirm('Remover imóvel?')) return; const l=stGet(session.user.uid+'_loc_imoveis')||[]; l.splice(i,1); stSet(session.user.uid+'_loc_imoveis',l); renderImovelLocacao(); }

// ── PESSOA (Locador / Locatário) ──
function locOpenPessoa(tipo, dados={}, idx=null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:480px">
      <h3 style="margin-bottom:1.5rem">${tipo==='locadores'?'👤 Locador':'🧑 Locatário'} — ${idx!==null?'Editar':'Novo'}</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="field" style="grid-column:1/-1"><label>Nome completo *</label><input id="lp-nome" value="${dados.nome||''}" style="width:100%"></div>
        <div class="field"><label>CPF</label><input id="lp-cpf" value="${dados.cpf||''}" placeholder="000.000.000-00" style="width:100%"></div>
        <div class="field"><label>RG</label><input id="lp-rg" value="${dados.rg||''}" style="width:100%"></div>
        <div class="field"><label>E-mail</label><input id="lp-email" type="email" value="${dados.email||''}" style="width:100%"></div>
        <div class="field"><label>Telefone</label><input id="lp-tel" value="${dados.telefone||''}" placeholder="(11) 99999-9999" style="width:100%"></div>
        <div class="field" style="grid-column:1/-1"><label>Endereço</label><input id="lp-end" value="${dados.endereco||''}" style="width:100%"></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:1.5rem">
        <button class="btn btn-primary" onclick="locSavePessoa('${tipo}',${idx})" style="flex:1">💾 Salvar</button>
        <button class="btn" onclick="document.querySelector('.modal-overlay').remove()" style="flex:1">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function locSavePessoa(tipo, idx) {
  const nome = document.getElementById('lp-nome').value.trim();
  if(!nome) { showToast('Informe o nome'); return; }
  const uid = session.user.uid;
  const lista = stGet(uid+'_loc_'+tipo) || [];
  const novo = { id: idx!==null ? lista[idx].id : locId(), nome,
    cpf:      document.getElementById('lp-cpf').value.trim(),
    rg:       document.getElementById('lp-rg').value.trim(),
    email:    document.getElementById('lp-email').value.trim(),
    telefone: document.getElementById('lp-tel').value.trim(),
    endereco: document.getElementById('lp-end').value.trim(),
  };
  if(idx!==null) lista[idx]=novo; else lista.push(novo);
  stSet(uid+'_loc_'+tipo, lista);
  document.querySelector('.modal-overlay').remove();
  showToast('✓ Salvo!');
  renderImovelLocacao();
}
function locEditPessoa(t,i) { const l=stGet(session.user.uid+'_loc_'+t)||[]; locOpenPessoa(t,l[i],i); }
function locDeletePessoa(t,i) { if(!confirm('Remover?')) return; const l=stGet(session.user.uid+'_loc_'+t)||[]; l.splice(i,1); stSet(session.user.uid+'_loc_'+t,l); renderImovelLocacao(); }

// ── CONTRATO ──
function locOpenContrato(dados={}, idx=null) {
  const uid = session.user.uid;
  const imoveis    = stGet(uid+'_loc_imoveis')    || [];
  const locadores  = stGet(uid+'_loc_locadores')  || [];
  const locatarios = stGet(uid+'_loc_locatarios') || [];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:540px;max-height:90vh;overflow-y:auto">
      <h3 style="margin-bottom:1.5rem">📋 ${idx!==null?'Editar':'Novo'} Contrato</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="field" style="grid-column:1/-1"><label>Imóvel *</label>
          <select id="lc-imovel" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
            <option value="">Selecione...</option>
            ${imoveis.map(im=>`<option value="${im.id}" ${dados.imovelId===im.id?'selected':''}>${im.endereco}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Locador *</label>
          <select id="lc-locador" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
            <option value="">Selecione...</option>
            ${locadores.map(p=>`<option value="${p.id}" ${dados.locadorId===p.id?'selected':''}>${p.nome}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Locatário *</label>
          <select id="lc-locatario" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
            <option value="">Selecione...</option>
            ${locatarios.map(p=>`<option value="${p.id}" ${dados.locatarioId===p.id?'selected':''}>${p.nome}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Valor do Aluguel (R$) *</label><input id="lc-aluguel" type="number" value="${dados.aluguel||''}" placeholder="2500" style="width:100%"></div>
        <div class="field"><label>Dia de Vencimento *</label><input id="lc-dia" type="number" min="1" max="31" value="${dados.diaVenc||10}" style="width:100%"></div>
        <div class="field"><label>Data Início</label><input id="lc-inicio" type="date" value="${dados.dataInicio||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px"></div>
        <div class="field"><label>Data Fim</label><input id="lc-fim" type="date" value="${dados.dataFim||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px"></div>
        <div class="field"><label>Índice de Reajuste</label>
          <select id="lc-indice" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
            ${['IGP-M','IPCA','INPC','Nenhum'].map(t=>`<option value="${t}" ${(dados.indice||'IGP-M')===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Status</label>
          <select id="lc-status" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
            ${['ativo','encerrado','suspenso'].map(t=>`<option value="${t}" ${(dados.status||'ativo')===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="grid-column:1/-1"><label>Observações</label>
          <textarea id="lc-obs" rows="2" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px;resize:vertical">${dados.obs||''}</textarea>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:1.5rem">
        <button class="btn btn-primary" onclick="locSaveContrato(${idx})" style="flex:1">💾 Salvar</button>
        <button class="btn" onclick="document.querySelector('.modal-overlay').remove()" style="flex:1">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function locSaveContrato(idx) {
  const imovelId   = document.getElementById('lc-imovel').value;
  const locadorId  = document.getElementById('lc-locador').value;
  const locatarioId= document.getElementById('lc-locatario').value;
  const aluguel    = parseFloat(document.getElementById('lc-aluguel').value) || 0;
  if(!imovelId || !locatarioId || !aluguel) { showToast('Preencha imóvel, locatário e aluguel'); return; }
  const uid = session.user.uid;
  const lista = stGet(uid+'_loc_contratos') || [];
  const novo = { id: idx!==null ? lista[idx].id : locId(),
    imovelId, locadorId, locatarioId, aluguel,
    diaVenc:    document.getElementById('lc-dia').value,
    dataInicio: document.getElementById('lc-inicio').value,
    dataFim:    document.getElementById('lc-fim').value,
    indice:     document.getElementById('lc-indice').value,
    status:     document.getElementById('lc-status').value,
    obs:        document.getElementById('lc-obs').value.trim(),
  };
  if(idx!==null) lista[idx]=novo; else lista.push(novo);
  stSet(uid+'_loc_contratos', lista);
  document.querySelector('.modal-overlay').remove();
  showToast('✓ Contrato salvo!');
  renderImovelLocacao();
}
function locEditContrato(i) { const l=stGet(session.user.uid+'_loc_contratos')||[]; locOpenContrato(l[i],i); }
function locDeleteContrato(i) { if(!confirm('Remover contrato?')) return; const l=stGet(session.user.uid+'_loc_contratos')||[]; l.splice(i,1); stSet(session.user.uid+'_loc_contratos',l); renderImovelLocacao(); }

// ── GERAR BOLETO ──
function locGerarBoleto(contratoId) {
  const uid = session.user.uid;
  const contratos  = stGet(uid+'_loc_contratos')  || [];
  const imoveis    = stGet(uid+'_loc_imoveis')    || [];
  const locatarios = stGet(uid+'_loc_locatarios') || [];
  const ct = contratos.find(c => c.id === contratoId);
  if(!ct) return;
  const im = imoveis.find(x => x.id === ct.imovelId) || {};
  const lt = locatarios.find(x => x.id === ct.locatarioId) || {};

  // calcular vencimento próximo
  const hoje = new Date();
  let venc = new Date(hoje.getFullYear(), hoje.getMonth(), parseInt(ct.diaVenc)||10);
  if(venc <= hoje) venc = new Date(hoje.getFullYear(), hoje.getMonth()+1, parseInt(ct.diaVenc)||10);
  const vencStr = venc.toISOString().split('T')[0];
  const refStr  = `${String(venc.getMonth()+1).padStart(2,'0')}/${venc.getFullYear()}`;

  // checar se já existe boleto para esse mês
  const boletos = stGet(uid+'_loc_boletos') || [];
  const jaExiste = boletos.find(b => b.contratoId === contratoId && b.referencia === refStr);
  if(jaExiste) { showToast('Já existe boleto para '+refStr); locSetTab('boletos'); return; }

  const novo = {
    id: locId(), contratoId,
    locatarioNome: lt.nome || '—',
    imovelEnd: im.endereco || '—',
    valor: ct.aluguel,
    vencimento: vencStr,
    referencia: refStr,
    status: 'aberto',
    geradoEm: new Date().toISOString(),
  };
  boletos.push(novo);
  stSet(uid+'_loc_boletos', boletos);
  showToast('✓ Boleto gerado para '+refStr+'!');
  locSetTab('boletos');
}

function locVerBoletos(contratoId) {
  const panel = document.getElementById('panel-imovellocation');
  panel._tab = 'boletos';
  renderImovelLocacao();
}

function locOpenBoletoManual() {
  const uid = session.user.uid;
  const contratos  = stGet(uid+'_loc_contratos')  || [];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px">
      <h3 style="margin-bottom:1.5rem">🔖 Boleto Manual</h3>
      <div style="display:grid;gap:1rem">
        <div class="field"><label>Contrato</label>
          <select id="bm-ct" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
            <option value="">Selecione...</option>
            ${contratos.map(c=>`<option value="${c.id}">Contrato ${c.id.slice(-4)} — R$ ${parseFloat(c.aluguel).toLocaleString('pt-BR',{minimumFractionDigits:2})}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Valor (R$)</label><input id="bm-valor" type="number" placeholder="2500" style="width:100%"></div>
        <div class="field"><label>Vencimento</label><input id="bm-venc" type="date" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px"></div>
        <div class="field"><label>Referência</label><input id="bm-ref" placeholder="Ex: 05/2026" style="width:100%"></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:1.5rem">
        <button class="btn btn-primary" onclick="locSaveBoletoManual()" style="flex:1">Gerar</button>
        <button class="btn" onclick="document.querySelector('.modal-overlay').remove()" style="flex:1">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function locSaveBoletoManual() {
  const contratoId = document.getElementById('bm-ct').value;
  const valor      = parseFloat(document.getElementById('bm-valor').value) || 0;
  const vencimento = document.getElementById('bm-venc').value;
  const referencia = document.getElementById('bm-ref').value.trim();
  if(!valor || !vencimento) { showToast('Informe valor e vencimento'); return; }
  const uid = session.user.uid;
  const boletos = stGet(uid+'_loc_boletos') || [];
  boletos.push({ id:locId(), contratoId, valor, vencimento, referencia, status:'aberto', geradoEm:new Date().toISOString() });
  stSet(uid+'_loc_boletos', boletos);
  document.querySelector('.modal-overlay').remove();
  showToast('✓ Boleto criado!');
  renderImovelLocacao();
}

function locMarcarPago(i) {
  const uid = session.user.uid;
  const boletos = stGet(uid+'_loc_boletos') || [];
  boletos[i].status = 'pago';
  boletos[i].pagoBem = new Date().toISOString();
  stSet(uid+'_loc_boletos', boletos);
  showToast('✓ Marcado como pago!');
  renderImovelLocacao();
}

function locDeleteBoleto(i) {
  if(!confirm('Remover boleto?')) return;
  const uid = session.user.uid;
  const boletos = stGet(uid+'_loc_boletos') || [];
  boletos.splice(i,1);
  stSet(uid+'_loc_boletos', boletos);
  renderImovelLocacao();
}

function locImprimirBoleto(i) {
  const uid = session.user.uid;
  const boletos    = stGet(uid+'_loc_boletos')    || [];
  const contratos  = stGet(uid+'_loc_contratos')  || [];
  const imoveis    = stGet(uid+'_loc_imoveis')    || [];
  const locadores  = stGet(uid+'_loc_locadores')  || [];
  const locatarios = stGet(uid+'_loc_locatarios') || [];
  const b  = boletos[i];
  const ct = contratos.find(c => c.id === b.contratoId) || {};
  const im = imoveis.find(x => x.id === ct.imovelId) || {};
  const lo = locadores.find(x => x.id === ct.locadorId) || {};
  const lt = locatarios.find(x => x.id === ct.locatarioId) || {};

  // Gerar código de barras fictício
  const cod = `0001${Math.floor(Math.random()*9999999999).toString().padStart(10,'0')}2${Math.floor(Math.random()*9999999999).toString().padStart(10,'0')}3${Math.floor(Math.random()*9999999999).toString().padStart(10,'0')}`;

  const win = window.open('','_blank');
  win.document.write(`
    <!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"><title>Boleto — ${lt.nome||'Locatário'}</title>
    <style>
      * { box-sizing:border-box; margin:0; padding:0; }
      body { font-family:Arial,sans-serif; font-size:12px; color:#000; background:#fff; padding:20px; }
      .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #000; padding-bottom:8px; margin-bottom:12px; }
      .logo { font-size:20px; font-weight:900; letter-spacing:-1px; }
      .bank { font-size:18px; font-weight:700; border-left:3px solid #000; border-right:3px solid #000; padding:0 12px; }
      .linha { font-size:14px; font-weight:600; }
      table { width:100%; border-collapse:collapse; margin-bottom:8px; }
      td { border:1px solid #aaa; padding:6px 8px; }
      .label { font-size:9px; color:#555; display:block; }
      .value { font-size:12px; font-weight:600; }
      .valor-grande { font-size:18px; font-weight:900; text-align:right; }
      .barcode { text-align:center; margin:16px 0 8px; letter-spacing:4px; font-size:14px; font-family:monospace; border:1px solid #000; padding:14px; background:#f9f9f9; }
      .num-barcode { text-align:center; font-size:11px; letter-spacing:2px; margin-top:4px; font-family:monospace; }
      .rodape { font-size:10px; color:#555; text-align:center; margin-top:10px; }
      .corte { border-top:1px dashed #aaa; margin:14px 0; text-align:center; font-size:9px; color:#888; }
      @media print { body { padding:0; } button { display:none; } }
    </style></head><body>

    <div class="header">
      <div class="logo">ProfitFlow<br><span style="font-size:10px;font-weight:400">Labs</span></div>
      <div class="bank">001-9</div>
      <div class="linha">${cod.replace(/(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d{1})(\d{14})/,'$1.$2 $3.$4 $5.$6 $7 $8')}</div>
    </div>

    <table>
      <tr>
        <td style="width:60%"><span class="label">Local de Pagamento</span><span class="value">Pagável em qualquer banco ou internet banking até o vencimento</span></td>
        <td><span class="label">Vencimento</span><span class="value">${b.vencimento ? b.vencimento.split('-').reverse().join('/') : '—'}</span></td>
      </tr>
      <tr>
        <td><span class="label">Beneficiário (Locador)</span><span class="value">${lo.nome || 'ProfitFlow Labs'}</span></td>
        <td><span class="label">CPF/CNPJ</span><span class="value">${lo.cpf || '—'}</span></td>
      </tr>
      <tr>
        <td><span class="label">Imóvel</span><span class="value">${im.endereco || '—'}</span></td>
        <td><span class="label">Referência</span><span class="value">${b.referencia || '—'}</span></td>
      </tr>
      <tr>
        <td><span class="label">Pagador (Locatário)</span><span class="value">${lt.nome || '—'} · CPF: ${lt.cpf || '—'}</span></td>
        <td class="valor-grande">R$ ${parseFloat(b.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
      </tr>
    </table>

    <div class="barcode">||| || ||| |||| || ||||| |||| | |||| ||||| || |||| ||||| | |||||| ||| |||||| |||||||| |||||| || ||||</div>
    <div class="num-barcode">${cod}</div>

    <div class="corte">✂ — Recibo do Pagador — ✂</div>

    <table>
      <tr>
        <td><span class="label">Pagador</span><span class="value">${lt.nome||'—'} · ${lt.cpf||'—'}</span></td>
        <td><span class="label">Valor</span><span class="value" style="font-size:16px;font-weight:900">R$ ${parseFloat(b.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span></td>
      </tr>
      <tr>
        <td><span class="label">Imóvel</span><span class="value">${im.endereco||'—'}</span></td>
        <td><span class="label">Vencimento</span><span class="value">${b.vencimento ? b.vencimento.split('-').reverse().join('/') : '—'}</span></td>
      </tr>
    </table>

    <div class="rodape">Gerado por ProfitFlow Labs · ${new Date().toLocaleString('pt-BR')} · Este boleto é meramente ilustrativo.</div>

    <br><button onclick="window.print()" style="padding:10px 30px;background:#000;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">🖨️ Imprimir</button>
    
  `);
  win.document.close();
}

/* ══════════════════════════════════════════
   CONSÓRCIOS - POSIÇÕES
   ══════════════════════════════════════════ */

function renderConsorcios() {
  const panel = document.getElementById('panel-consorcios');
  const uid = session.user.uid;
  const lista = stGet(uid + '_consorcios') || [];

  const totalAlocado = lista.reduce((s, c) => s + (parseFloat(c.valorTotal) || 0), 0);
  const totalPago    = lista.reduce((s, c) => s + (parseFloat(c.parcelaValor) || 0) * (parseInt(c.parcelasPagas) || 0), 0);
  const totalPendente= totalAlocado - totalPago;

  panel.innerHTML = `
    <div class="panel-header">
      <h2>🤝 Consórcios</h2>
      <p style="color:var(--text2);font-size:13px">Cadastro e acompanhamento de consórcios</p>
    </div>
    <div class="panel-content">

      <!-- MÉTRICAS -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem">
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1rem">
          <div style="font-size:11px;color:var(--text2);margin-bottom:6px">TOTAL ALOCADO</div>
          <div style="font-size:22px;font-weight:700;color:var(--text)">R$ ${totalAlocado.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1rem">
          <div style="font-size:11px;color:var(--text2);margin-bottom:6px">TOTAL PAGO</div>
          <div style="font-size:22px;font-weight:700;color:#39ff8a">R$ ${totalPago.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1rem">
          <div style="font-size:11px;color:var(--text2);margin-bottom:6px">SALDO PENDENTE</div>
          <div style="font-size:22px;font-weight:700;color:#ff9800">R$ ${totalPendente.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
        </div>
      </div>

      <!-- BOTÃO ADICIONAR -->
      <button class="btn btn-primary" onclick="consorcioOpenModal()" style="margin-bottom:1.5rem">
        ➕ Adicionar Consórcio
      </button>

      <!-- LISTA -->
      ${lista.length === 0
        ? `<div style="text-align:center;color:var(--text3);padding:3rem">Nenhum consórcio cadastrado</div>`
        : lista.map((c, idx) => {
            const pagas   = parseInt(c.parcelasPagas) || 0;
            const total   = parseInt(c.parcelasTotais) || 1;
            const pct     = Math.min(100, Math.round((pagas / total) * 100));
            const pago    = (parseFloat(c.parcelaValor) || 0) * pagas;
            const restante= (parseFloat(c.parcelaValor) || 0) * (total - pagas);
            const corBarra = pct >= 75 ? '#39ff8a' : pct >= 40 ? '#638eff' : '#ff9800';
            return `
              <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;margin-bottom:1rem">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem">
                  <div>
                    <div style="font-size:15px;font-weight:700;color:var(--text)">${c.nome}</div>
                    <div style="font-size:12px;color:var(--text2)">${c.administradora || ''} · ${c.tipo || 'Consórcio'}</div>
                  </div>
                  <div style="display:flex;gap:8px">
                    <button onclick="consorcioEditModal(${idx})" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);padding:4px 10px;cursor:pointer;font-size:12px">✏️ Editar</button>
                    <button onclick="consorcioDelete(${idx})" style="background:none;border:1px solid var(--border);border-radius:6px;color:#ff4444;padding:4px 10px;cursor:pointer;font-size:12px">✕</button>
                  </div>
                </div>

                <!-- PROGRESSO -->
                <div style="margin-bottom:1rem">
                  <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-bottom:6px">
                    <span>Parcelas: <strong style="color:var(--text)">${pagas} / ${total}</strong></span>
                    <span><strong style="color:${corBarra}">${pct}%</strong> concluído</span>
                  </div>
                  <div style="background:var(--bg3);border-radius:99px;height:8px;overflow:hidden">
                    <div style="width:${pct}%;height:100%;background:${corBarra};border-radius:99px;transition:width .3s"></div>
                  </div>
                </div>

                <!-- VALORES -->
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
                  <div style="background:var(--bg);padding:10px;border-radius:6px">
                    <div style="font-size:10px;color:var(--text3);margin-bottom:4px">CRÉDITO</div>
                    <div style="font-size:13px;font-weight:600;color:var(--text)">R$ ${parseFloat(c.valorTotal||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                  </div>
                  <div style="background:var(--bg);padding:10px;border-radius:6px">
                    <div style="font-size:10px;color:var(--text3);margin-bottom:4px">PARCELA</div>
                    <div style="font-size:13px;font-weight:600;color:var(--text)">R$ ${parseFloat(c.parcelaValor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                  </div>
                  <div style="background:var(--bg);padding:10px;border-radius:6px">
                    <div style="font-size:10px;color:var(--text3);margin-bottom:4px">PAGO</div>
                    <div style="font-size:13px;font-weight:600;color:#39ff8a">R$ ${pago.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                  </div>
                  <div style="background:var(--bg);padding:10px;border-radius:6px">
                    <div style="font-size:10px;color:var(--text3);margin-bottom:4px">RESTANTE</div>
                    <div style="font-size:13px;font-weight:600;color:#ff9800">R$ ${restante.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                  </div>
                </div>

                ${c.contemplado ? `<div style="margin-top:10px;padding:8px 12px;background:rgba(57,255,138,.1);border:1px solid rgba(57,255,138,.3);border-radius:6px;font-size:12px;color:#39ff8a">✅ Contemplado${c.dataContemplacao ? ' em ' + c.dataContemplacao : ''}</div>` : ''}
                ${c.observacao ? `<div style="margin-top:10px;font-size:12px;color:var(--text3)">💬 ${c.observacao}</div>` : ''}
              </div>
            `;
          }).join('')
      }
    </div>
  `;
}

function consorcioOpenModal(dados = {}, idx = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:520px;max-height:90vh;overflow-y:auto">
      <h3 style="margin-bottom:1.5rem">${idx !== null ? '✏️ Editar' : '➕ Novo'} Consórcio</h3>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
        <div class="field" style="grid-column:1/-1">
          <label>Nome / Descrição *</label>
          <input id="cs-nome" type="text" value="${dados.nome||''}" placeholder="Ex: Consórcio Imóvel 2025" style="width:100%">
        </div>
        <div class="field">
          <label>Administradora</label>
          <input id="cs-adm" type="text" value="${dados.administradora||''}" placeholder="Ex: Porto Seguro" style="width:100%">
        </div>
        <div class="field">
          <label>Tipo</label>
          <select id="cs-tipo" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
            ${['Imóvel','Automóvel','Moto','Serviço','Outros'].map(t=>`<option value="${t}" ${(dados.tipo||'Imóvel')===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Crédito Total (R$) *</label>
          <input id="cs-valor" type="number" value="${dados.valorTotal||''}" placeholder="200000" style="width:100%">
        </div>
        <div class="field">
          <label>Valor da Parcela (R$) *</label>
          <input id="cs-parcela" type="number" value="${dados.parcelaValor||''}" placeholder="1500" style="width:100%">
        </div>
        <div class="field">
          <label>Total de Parcelas *</label>
          <input id="cs-total" type="number" value="${dados.parcelasTotais||''}" placeholder="180" style="width:100%">
        </div>
        <div class="field">
          <label>Parcelas Pagas</label>
          <input id="cs-pagas" type="number" value="${dados.parcelasPagas||0}" placeholder="0" style="width:100%">
        </div>
        <div class="field">
          <label>Data de Início</label>
          <input id="cs-inicio" type="month" value="${dados.dataInicio||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px">
        </div>
        <div class="field">
          <label>Contemplado?</label>
          <select id="cs-contemplado" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
            <option value="0" ${!dados.contemplado?'selected':''}>Não</option>
            <option value="1" ${dados.contemplado?'selected':''}>Sim</option>
          </select>
        </div>
        <div class="field">
          <label>Data de Contemplação</label>
          <input id="cs-datacontemp" type="month" value="${dados.dataContemplacao||''}" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px">
        </div>
        <div class="field" style="grid-column:1/-1">
          <label>Observação</label>
          <textarea id="cs-obs" rows="2" placeholder="Anotações gerais..." style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px;resize:vertical">${dados.observacao||''}</textarea>
        </div>
      </div>

      <div style="display:flex;gap:10px">
        <button class="btn btn-primary" onclick="consorcioSave(${idx})" style="flex:1">💾 Salvar</button>
        <button class="btn" onclick="document.querySelector('.modal-overlay').remove()" style="flex:1">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('cs-nome').focus();
}

function consorcioEditModal(idx) {
  const lista = stGet(session.user.uid + '_consorcios') || [];
  consorcioOpenModal(lista[idx], idx);
}

function consorcioSave(idx) {
  const nome = document.getElementById('cs-nome').value.trim();
  if(!nome) { showToast('Preencha o nome'); return; }

  const novo = {
    nome,
    administradora: document.getElementById('cs-adm').value.trim(),
    tipo:           document.getElementById('cs-tipo').value,
    valorTotal:     parseFloat(document.getElementById('cs-valor').value) || 0,
    parcelaValor:   parseFloat(document.getElementById('cs-parcela').value) || 0,
    parcelasTotais: parseInt(document.getElementById('cs-total').value) || 0,
    parcelasPagas:  parseInt(document.getElementById('cs-pagas').value) || 0,
    dataInicio:     document.getElementById('cs-inicio').value,
    contemplado:    document.getElementById('cs-contemplado').value === '1',
    dataContemplacao: document.getElementById('cs-datacontemp').value,
    observacao:     document.getElementById('cs-obs').value.trim(),
  };

  const lista = stGet(session.user.uid + '_consorcios') || [];
  if(idx !== null && idx >= 0) lista[idx] = novo;
  else lista.push(novo);
  stSet(session.user.uid + '_consorcios', lista);

  document.querySelector('.modal-overlay').remove();
  showToast('✓ Consórcio salvo!');
  renderConsorcios();
}

function consorcioDelete(idx) {
  if(!confirm('Remover este consórcio?')) return;
  const lista = stGet(session.user.uid + '_consorcios') || [];
  lista.splice(idx, 1);
  stSet(session.user.uid + '_consorcios', lista);
  showToast('✓ Removido');
  renderConsorcios();
}

/* ══════════════════════════════════════════
   COMUNIDADE
   ══════════════════════════════════════════ */

function renderComunidade() {
  const panel = document.getElementById('panel-comunidade');
  const WA_LINK = 'https://chat.whatsapp.com/GoMZPM8t3DACj3cltMsSO9';

  panel.innerHTML = `
    <div class="panel-header">
      <h2>💬 Comunidade</h2>
      <p style="color:var(--text2);font-size:13px">Conecte-se com outros membros do ProfitFlow Labs</p>
    </div>
    <div class="panel-content">

      <!-- CARD PRINCIPAL WHATSAPP -->
      <div style="background:linear-gradient(135deg,#1a3a2a,#0d2b1a);border:1px solid #25d36633;border-radius:var(--radius);padding:2.5rem;text-align:center;margin-bottom:1.5rem">
        <div style="font-size:64px;margin-bottom:1rem">
          <svg width="72" height="72" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="24" fill="#25D366"/>
            <path d="M34.5 13.5C32.1 11.1 28.9 9.6 25.5 9.5C18.3 9.5 12.5 15.3 12.5 22.5C12.5 24.9 13.2 27.2 14.4 29.2L12.3 36L19.3 33.9C21.2 35 23.3 35.6 25.5 35.6C32.7 35.6 38.5 29.8 38.5 22.6C38.5 19.1 37.1 15.9 34.5 13.5ZM25.5 33.3C23.5 33.3 21.6 32.8 19.9 31.8L19.5 31.6L15.4 32.7L16.5 28.7L16.3 28.3C15.2 26.5 14.7 24.5 14.7 22.5C14.7 16.5 19.5 11.7 25.5 11.7C28.4 11.7 31.1 12.8 33.2 14.9C35.2 17 36.3 19.7 36.3 22.6C36.3 28.6 31.5 33.3 25.5 33.3ZM31.4 25.3C31.1 25.1 29.5 24.4 29.2 24.2C28.9 24.1 28.7 24 28.5 24.3C28.3 24.6 27.8 25.2 27.6 25.5C27.5 25.7 27.3 25.7 27 25.6C25.5 24.8 24.5 24.2 23.4 22.5C23.1 22 23.7 22 24.2 21C24.3 20.8 24.2 20.6 24.2 20.4C24.1 20.2 23.5 18.7 23.2 18C23 17.4 22.7 17.5 22.5 17.5C22.3 17.5 22.1 17.5 21.9 17.5C21.7 17.5 21.3 17.5 21 17.8C20.7 18.1 19.9 18.9 19.9 20.4C19.9 21.9 21 23.3 21.2 23.6C21.4 23.8 23.5 27.1 26.7 28.4C28.7 29.2 29.5 29.3 30.5 29.1C31.1 29 32.4 28.3 32.7 27.5C33 26.7 33 26 32.9 25.8C32.7 25.6 32.5 25.5 31.4 25.3Z" fill="white"/>
          </svg>
        </div>
        <h3 style="font-size:22px;font-weight:700;color:#fff;margin-bottom:0.5rem">Grupo ProfitFlow Labs</h3>
        <p style="color:#a0cfb4;font-size:14px;margin-bottom:2rem;max-width:400px;margin-left:auto;margin-right:auto">
          Compartilhe estratégias, tire dúvidas e acompanhe as novidades com outros membros da comunidade.
        </p>
        <a href="${WA_LINK}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;background:#25D366;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:99px;text-decoration:none;transition:opacity .2s" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="24" fill="white"/><path d="M34.5 13.5C32.1 11.1 28.9 9.6 25.5 9.5C18.3 9.5 12.5 15.3 12.5 22.5C12.5 24.9 13.2 27.2 14.4 29.2L12.3 36L19.3 33.9C21.2 35 23.3 35.6 25.5 35.6C32.7 35.6 38.5 29.8 38.5 22.6C38.5 19.1 37.1 15.9 34.5 13.5Z" fill="#25D366"/></svg>
          Entrar no Grupo
        </a>
        <p style="font-size:11px;color:#6b9e7e;margin-top:1rem">Abre o WhatsApp automaticamente</p>
      </div>

      <!-- CARDS INFO -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem">
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem;text-align:center">
          <div style="font-size:28px;margin-bottom:8px">📈</div>
          <div style="font-weight:600;color:var(--text);margin-bottom:4px">Estratégias</div>
          <div style="font-size:12px;color:var(--text2)">Compartilhe e aprenda com os melhores trades do grupo</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem;text-align:center">
          <div style="font-size:28px;margin-bottom:8px">🤝</div>
          <div style="font-weight:600;color:var(--text);margin-bottom:4px">Networking</div>
          <div style="font-size:12px;color:var(--text2)">Conecte-se com traders e investidores da comunidade</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem;text-align:center">
          <div style="font-size:28px;margin-bottom:8px">🔔</div>
          <div style="font-weight:600;color:var(--text);margin-bottom:4px">Alertas</div>
          <div style="font-size:12px;color:var(--text2)">Receba avisos de novas features e atualizações</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem;text-align:center">
          <div style="font-size:28px;margin-bottom:8px">💡</div>
          <div style="font-weight:600;color:var(--text);margin-bottom:4px">Suporte</div>
          <div style="font-size:12px;color:var(--text2)">Tire dúvidas com outros membros e a equipe</div>
        </div>
      </div>

    </div>
  `;
}

/* ══════════════════════════════════════════
   BACKUP AUTOMÁTICO EM GOOGLE DRIVE
   ══════════════════════════════════════════ */

async function backupToDrive() {
  if(!session || !session.user) return;
  
  try {
    // Coletar todos os dados do usuário
    const userData = {
      user: session.user,
      timestamp: new Date().toISOString(),
      data: {}
    };

    // Coletar dados de múltiplas categorias
    const categories = ['pool_', 'asset_', 'position_', 'trade_', 'copytrading_', 'options_', 'p2p_', 'finance_', 'dp_'];
    
    categories.forEach(cat => {
      const keys = stKeys(session.user.uid + '_' + cat);
      if(keys.length > 0) {
        userData.data[cat] = keys.map(k => stGet(k)).filter(Boolean);
      }
    });

    // Preparar conteúdo do arquivo
    const content = JSON.stringify(userData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    
    // Chamar API do Google Drive (usando gapi.client)
    if(window.gapi && window.gapi.client.drive) {
      const file = {
        name: `CashFlow_Backup_${new Date().toISOString().split('T')[0]}.json`,
        mimeType: 'application/json'
      };

      const media = new window.gapi.client.drive.Files.Resource();
      await window.gapi.client.drive.files.create({
        resource: file,
        media: { body: blob },
        fields: 'id'
      });

      // Salvar data do último backup
      stSet(session.user.uid + '_last_backup', Date.now());
    }
  } catch(e) {
    console.warn('Erro ao fazer backup:', e);
    // Falha silenciosa - não interrompe a experiência
  }
}

// Fazer backup automático a cada 24 horas
function scheduleAutoBackup() {
  if(!session || !session.user) return;
  
  const lastBackup = stGet(session.user.uid + '_last_backup') || 0;
  const dayInMs = 24 * 60 * 60 * 1000;
  
  if(Date.now() - lastBackup > dayInMs) {
    backupToDrive();
  }
  
  // Agendar próximo backup em 24h
  setTimeout(scheduleAutoBackup, dayInMs);
}

init();
// Check if user returned from Stripe Checkout
window.addEventListener('load', () => {
  if(window.location.search.includes('stripe_session_id') || window.location.search.includes('stripe_cancelled')) {
    // Wait for auth to complete
    const iv = setInterval(() => {
      if(session?.user) { clearInterval(iv); checkStripeReturn(); }
    }, 300);
  }
});




/* ── Inject platform notifications from Firestore after DOM is ready ── */
async function injectPlatformNotifs() {
  try {
    const board = document.getElementById('notif-board');
    const notifs = await loadPlatformNotifications();
    if(!notifs || !notifs.length) return;
    const typeStyles = {
      info:    { bg:'var(--blue-bg)',  border:'rgba(99,142,255,.25)',   color:'var(--blue-text)'  },
      tip:     { bg:'rgba(139,92,246,.08)', border:'rgba(139,92,246,.25)', color:'#a78bfa'        },
      success: { bg:'var(--green-bg)', border:'rgba(57,255,138,.2)',    color:'var(--green-text)' },
      warning: { bg:'var(--amber-bg)', border:'rgba(255,183,77,.3)',    color:'var(--amber-text)' },
    };
    const container = board ? board.querySelector('div[style*="flex-direction:column"]') : null;
    notifs.forEach(n => {
      if(document.getElementById('notif-card-'+n.id)) return;
      const s = typeStyles[n.type] || typeStyles.info;
      const el = document.createElement('div');
      el.className = 'notif-card';
      el.id = 'notif-card-' + n.id;
      el.style.cssText = `display:flex;align-items:flex-start;gap:12px;padding:.875rem 1rem;background:${s.bg};border:1px solid ${s.border};border-radius:var(--radius);position:relative;margin-bottom:8px`;
      el.innerHTML = `
        <div style="font-size:20px;flex-shrink:0;line-height:1.2">${n.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:3px">${n.title}</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.5">${n.body}</div>
          ${n.link?`<button onclick="switchTab('${n.link}')" style="margin-top:6px;font-size:11px;color:${s.color};background:none;border:none;cursor:pointer;padding:0;font-weight:600;text-decoration:underline">Ir para o módulo →</button>`:''}
        </div>
        <button onclick="this.closest('.notif-card').remove();checkNotifBoardEmpty()" style="width:24px;height:24px;border-radius:50%;border:1px solid ${s.border};background:rgba(255,255,255,.06);cursor:pointer;font-size:12px;color:var(--text3);flex-shrink:0">✕</button>`;
      if(container) container.prepend(el);
      else if(board) board.appendChild(el);
    });
    if(board) board.style.display = '';
  } catch(e) { console.warn('injectPlatformNotifs error', e); }
}
// Run after app renders
const _origRenderApp = window.renderApp;
if(typeof renderApp === 'function') {
  const __orig = renderApp;
  window.renderApp = function() {
    __orig.apply(this, arguments);
    setTimeout(injectPlatformNotifs, 800);
  };
}


/* ══════════════════════════════════════════════════════════════════════
   FEATURE 5 — PERFIL DO USUÁRIO
   ══════════════════════════════════════════════════════════════════════ */
function renderProfile() {
  const panel = document.getElementById('panel-profile');
  if (!panel) return;
  const u     = session?.user;
  const p     = profLoad();
  const uid   = u?.uid || '';

  // Gather stats
  const pools    = stKeys(uid+'_pool_').map(k=>stGet(k)).filter(Boolean);
  const wallet   = wLoad();
  const finance  = fLoad();
  const receitas = finance.filter(t=>t.type==='receita').reduce((s,t)=>s+parseFloat(t.amount||0),0);
  const despesas = finance.filter(t=>t.type==='despesa').reduce((s,t)=>s+parseFloat(t.amount||0),0);
  const joinDate = u?.metadata?.creationTime ? new Date(u.metadata.creationTime) : new Date();
  const daysSince = Math.floor((Date.now()-joinDate.getTime())/86400000);

  // ── Achievements ──
  const badges = [
    { id:'first_pool',  icon:'🌊', label:'Primeira Pool',    desc:'Criou sua primeira pool de liquidez',           earned: pools.length >= 1 },
    { id:'five_pools',  icon:'🏊', label:'Poolmaster',       desc:'Criou 5 pools de liquidez',                     earned: pools.length >= 5 },
    { id:'first_asset', icon:'💼', label:'Primeiro Ativo',   desc:'Adicionou um ativo à carteira',                 earned: wallet.length >= 1 },
    { id:'diversified', icon:'🎯', label:'Diversificado',    desc:'Tem ativos em 3+ categorias diferentes',        earned: new Set(wallet.map(a=>a.category)).size >= 3 },
    { id:'first_tx',    icon:'💸', label:'Primeira Transação','desc':'Registrou uma transação nas finanças',        earned: finance.length >= 1 },
    { id:'saver',       icon:'🏦', label:'Poupador',         desc:'Receitas superam despesas',                     earned: receitas > despesas && finance.length > 0 },
    { id:'veteran',     icon:'⭐', label:'Veterano',         desc:'Usa a plataforma há mais de 30 dias',           earned: daysSince >= 30 },
    { id:'power_user',  icon:'🚀', label:'Power User',       desc:'Usa a plataforma há mais de 90 dias',           earned: daysSince >= 90 },
    { id:'multi_module',icon:'🧩', label:'Multi-módulo',     desc:'Usou 4+ módulos diferentes',                    earned: (pools.length>0?1:0)+(wallet.length>0?1:0)+(finance.length>0?1:0) >= 2 },
  ];
  const earned = badges.filter(b=>b.earned);

  // ── Activity feed (simulated from data) ──
  const activities = [];
  pools.slice(0,3).forEach(pool => {
    if(pool.ts) activities.push({ ts: pool.ts, icon:'🌊', text:`Pool criada: ${pool.token1?.symbol||'?'}/${pool.token2?.symbol||'?'} em ${pool.dex||'DEX'}` });
  });
  wallet.slice(0,3).forEach(a => {
    if(a.ts) activities.push({ ts: a.ts||Date.now(), icon:'💼', text:`Ativo adicionado: ${a.qty} ${a.symbol} @ $${parseFloat(a.buyPrice||0).toFixed(2)}` });
  });
  finance.slice(0,4).forEach(tx => {
    activities.push({ ts: new Date(tx.date+'T00:00:00').getTime(), icon: tx.type==='receita'?'📈':'📉', text:`${tx.type==='receita'?'Receita':'Despesa'}: ${tx.description||tx.category} — $${parseFloat(tx.amount||0).toFixed(2)}` });
  });
  activities.sort((a,b)=>b.ts-a.ts);

  panel.innerHTML = `
  <div style="max-width:720px;margin:0 auto">

    <!-- ── HEADER DO PERFIL ── -->
    <div class="card" style="margin-bottom:1rem;background:linear-gradient(135deg,var(--bg2),var(--bg3));border-color:var(--border2);position:relative;overflow:hidden">
      <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(57,255,138,0.06),transparent);pointer-events:none"></div>
      <div style="display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap">
        <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--green));display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:#fff;flex-shrink:0;overflow:hidden;border:3px solid var(--border2)">
          ${p.avatar ? `<img src="${p.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : getInitials(u?.name||u?.email||'?')}
        </div>
        <div style="flex:1;min-width:0">
          <h2 style="margin-bottom:4px">${p.name||u?.name||u?.email?.split('@')[0]||'Usuário'}</h2>
          ${p.nickname?`<div style="font-size:13px;color:var(--blue);margin-bottom:4px;font-family:monospace">${p.nickname}</div>`:''}
          ${p.bio?`<div style="font-size:13px;color:var(--text2);line-height:1.5;margin-bottom:8px">${p.bio}</div>`:''}
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <span style="font-size:11px;padding:2px 8px;background:var(--bg4);border:1px solid var(--border);border-radius:99px;color:var(--text3)">${u?.email||''}</span>
            ${p.country?`<span style="font-size:11px;padding:2px 8px;background:var(--bg4);border:1px solid var(--border);border-radius:99px;color:var(--text3)">📍 ${p.country}</span>`:''}
            <span style="font-size:11px;padding:2px 8px;background:var(--bg4);border:1px solid var(--border);border-radius:99px;color:var(--text3)">📅 Membro há ${daysSince} dias</span>
          </div>
        </div>
        <button class="btn btn-sm" onclick="switchTab('settings')" style="flex-shrink:0">✏️ Editar perfil</button>
      </div>
    </div>

    <!-- ── STATS ── -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:1rem">
      ${[
        { label:'Pools Ativas',  value: pools.length,    icon:'🌊', color:'var(--green)' },
        { label:'Ativos',        value: wallet.length,   icon:'💼', color:'var(--blue)'  },
        { label:'Transações',    value: finance.length,  icon:'💸', color:'var(--amber)' },
        { label:'Conquistas',    value: earned.length+'/'+badges.length, icon:'🏆', color:'var(--purple,#a78bfa)' },
      ].map(s=>`
      <div class="card" style="padding:.875rem;text-align:center;border-color:var(--border)">
        <div style="font-size:20px;margin-bottom:6px">${s.icon}</div>
        <div style="font-size:20px;font-weight:800;color:${s.color};line-height:1">${s.value}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:4px;font-family:monospace;text-transform:uppercase;letter-spacing:.06em">${s.label}</div>
      </div>`).join('')}
    </div>

    <!-- ── CONQUISTAS ── -->
    <div class="card" style="margin-bottom:1rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <div style="font-size:14px;font-weight:700">🏆 Conquistas</div>
        <div style="font-size:12px;color:var(--text2)">${earned.length} de ${badges.length} desbloqueadas</div>
      </div>
      <!-- Progress bar -->
      <div style="height:6px;background:var(--bg4);border-radius:99px;margin-bottom:1rem;overflow:hidden">
        <div style="height:100%;width:${Math.round(earned.length/badges.length*100)}%;background:linear-gradient(90deg,var(--blue),var(--green));border-radius:99px;transition:width .5s"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
        ${badges.map(b=>`
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${b.earned?'rgba(57,255,138,.2)':'var(--border)'};background:${b.earned?'rgba(57,255,138,.04)':'var(--bg3)'};opacity:${b.earned?1:.5}">
          <span style="font-size:22px;flex-shrink:0">${b.icon}</span>
          <div>
            <div style="font-size:12px;font-weight:700;color:${b.earned?'var(--text)':'var(--text2)'}">${b.label}</div>
            <div style="font-size:10px;color:var(--text3);line-height:1.4">${b.desc}</div>
          </div>
          ${b.earned?`<span style="margin-left:auto;font-size:10px;color:var(--green);font-weight:700">✓</span>`:''}
        </div>`).join('')}
      </div>
    </div>

    <!-- ── ATIVIDADE RECENTE ── -->
    <div class="card">
      <div style="font-size:14px;font-weight:700;margin-bottom:1rem">📋 Atividade Recente</div>
      ${activities.length===0
        ? `<div style="text-align:center;padding:2rem;color:var(--text3);font-size:13px">Nenhuma atividade registrada ainda.<br>Comece criando uma pool ou adicionando um ativo!</div>`
        : activities.slice(0,8).map(a=>`
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:16px;flex-shrink:0;width:24px;text-align:center">${a.icon}</span>
        <div style="flex:1">
          <div style="font-size:13px;color:var(--text)">${a.text}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px;font-family:monospace">${new Date(a.ts).toLocaleString('pt-BR')}</div>
        </div>
      </div>`).join('')}
    </div>

  </div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   FEATURE 8 — EXPORTAÇÃO EXCEL E PDF
   ══════════════════════════════════════════════════════════════════════ */

