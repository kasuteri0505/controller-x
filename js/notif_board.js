/* ══════════════════════════════════════════════════════════════════
   FEATURE 1 — QUADRO DE AVISOS (Notification Board)
   Notificações com opção de dispensar por 30 dias
   Storage: uid_notif_dismissed_{id} = timestamp
   ══════════════════════════════════════════════════════════════════ */

const NOTIFICATIONS = [
  {
    id: 'welcome_v1',
    type: 'info',      // info | warning | success | tip
    icon: '👋',
    title: 'Bem-vindo ao ProfitFlow Labs!',
    body: 'Explore os módulos: Pools DeFi, Carteira, Finanças, P2P Cripto, Departamento Pessoal e muito mais. Use o menu lateral para navegar.',
    link: null,
    priority: 1,
    permanent: false,
  },
  {
    id: 'il_tip_v1',
    type: 'tip',
    icon: '💡',
    title: 'Dica: Calcule o IL das suas pools',
    body: 'Abra os detalhes de qualquer pool e use a seção "Atualizar Posição" para registrar snapshots e calcular o Impermanent Loss em datas específicas.',
    link: null,
    priority: 2,
    permanent: false,
  },
  {
    id: 'p2p_launch_v1',
    type: 'success',
    icon: '🔄',
    title: 'P2P Cripto disponível!',
    body: 'Compre e venda Bitcoin, Ethereum, Solana, Polygon, USDC e USDT diretamente com outros usuários. Acesse o módulo P2P no menu lateral.',
    link: 'p2p',
    priority: 3,
    permanent: false,
  },
  {
    id: 'security_tip_v1',
    type: 'warning',
    icon: '🔒',
    title: 'Segurança da conta',
    body: 'Use uma senha forte com pelo menos 8 caracteres, numero e simbolo. A autenticacao e feita pelo Firebase e seus dados sao protegidos por regras de acesso.',
    link: 'settings',
    priority: 4,
    permanent: false,
  },
  {
    id: 'sui_pools_v1',
    type: 'tip',
    icon: '🔵',
    title: 'Novidade: Importação de pools Sui',
    body: 'Agora é possível importar posições das DEXes da rede Sui (Cetus, Turbos, KriyaDEX, FlowX, Aftermath) diretamente pela URL.',
    link: null,
    priority: 5,
    permanent: false,
  },
  {
    id: 'trial_reminder',
    type: 'warning',
    icon: '⏰',
    title: 'Trial gratuito ativo',
    body: 'Você está no período de avaliação gratuita de 30 dias. Assine um plano para continuar acessando todos os módulos sem interrupção.',
    link: 'settings',
    priority: 0,       // highest priority — shows first
    permanent: false,
    condition: 'trial', // só mostra se usuário estiver em trial
  },
];

const NOTIF_DISMISS_PREFIX = () => session.user.uid + '_notif_dim_';
const NOTIF_DISMISS_DAYS   = 30;

function isNotifDismissed(id) {
  const key = NOTIF_DISMISS_PREFIX() + id;
  const ts  = stGet(key);
  if(!ts) return false;
  const daysSince = (Date.now() - ts) / 86400000;
  return daysSince < NOTIF_DISMISS_DAYS;
}

function dismissNotif(id) {
  stSet(NOTIF_DISMISS_PREFIX() + id, Date.now());
  // Animate out
  const el = document.getElementById('notif-card-' + id);
  if(el) {
    el.style.transition = 'all .3s ease';
    el.style.opacity    = '0';
    el.style.maxHeight  = el.offsetHeight + 'px';
    setTimeout(()=>{
      el.style.maxHeight  = '0';
      el.style.marginBottom = '0';
      el.style.padding    = '0';
      el.style.overflow   = 'hidden';
    }, 100);
    setTimeout(()=>{ el.remove(); checkNotifBoardEmpty(); }, 400);
  }
}

function checkNotifBoardEmpty() {
  const board = document.getElementById('notif-board');
  if(!board) return;
  const remaining = board.querySelectorAll('.notif-card');
  if(remaining.length === 0) {
    board.style.display = 'none';
  }
}

/* ── Platform notifications from Firestore (injected by admin panel) ── */
let _platformNotifs = null;
async function loadPlatformNotifications() {
  if(_platformNotifs !== null) return _platformNotifs;
  try {
    const snap = await fbDb.collection('platform_notifications').orderBy('priority','asc').limit(10).get();
    _platformNotifs = snap.docs.map(d => {
      const data = d.data();
      return {
        id: data.id || 'pn_'+d.id,
        type: data.type || 'info',
        icon: data.icon || '📢',
        title: data.title || '',
        body: data.body || '',
        link: data.link || null,
        priority: data.priority !== undefined ? data.priority : 10,
        permanent: false,
      };
    });
  } catch(e) {
    _platformNotifs = [];
  }
  return _platformNotifs;
}

function renderNotifBoard() {
  const isTrial = trialDaysLeft() > 0 && trialDaysLeft() < 30;
  const allNotifs = [...NOTIFICATIONS];

  const visible = allNotifs
    .filter(n => {
      if(isNotifDismissed(n.id)) return false;
      if(n.condition === 'trial' && !isTrial) return false;
      return true;
    })
    .sort((a,b) => a.priority - b.priority)
    .slice(0, 4); // max 4 visible at once

  if(visible.length === 0) return '';

  const typeStyles = {
    info:    { bg:'var(--blue-bg)',  border:'rgba(99,142,255,.25)',   color:'var(--blue-text)',  icon:'var(--blue)'  },
    tip:     { bg:'rgba(139,92,246,.08)', border:'rgba(139,92,246,.25)', color:'#a78bfa',       icon:'#a78bfa'      },
    success: { bg:'var(--green-bg)', border:'rgba(57,255,138,.2)',    color:'var(--green-text)', icon:'var(--green)' },
    warning: { bg:'var(--amber-bg)', border:'rgba(255,183,77,.3)',    color:'var(--amber-text)', icon:'var(--amber)' },
  };

  return `
  <div id="notif-board" style="margin-bottom:1.25rem">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:.625rem">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text3)"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3)">Avisos & Notificações</span>
      <span style="font-size:11px;color:var(--text3);margin-left:auto">${visible.length} ativo${visible.length>1?'s':''}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${visible.map(n => {
        const s = typeStyles[n.type] || typeStyles.info;
        return `<div class="notif-card" id="notif-card-${n.id}"
          style="display:flex;align-items:flex-start;gap:12px;padding:.875rem 1rem;
                 background:${s.bg};border:1px solid ${s.border};border-radius:var(--radius);
                 position:relative;transition:all .3s ease;overflow:hidden">
          <div style="font-size:20px;flex-shrink:0;line-height:1.2">${n.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:3px">${n.title}</div>
            <div style="font-size:12px;color:var(--text2);line-height:1.5">${n.body}</div>
            ${n.link ? `<button onclick="switchTab('${n.link}');dismissNotif('${n.id}')"
              style="margin-top:6px;font-size:11px;color:${s.color};background:none;border:none;cursor:pointer;padding:0;font-weight:600;text-decoration:underline">
              Ir para o módulo →
            </button>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
            <button onclick="dismissNotif('${n.id}')" title="Dispensar por 30 dias"
              style="width:24px;height:24px;border-radius:50%;border:1px solid ${s.border};
                     background:rgba(255,255,255,.06);cursor:pointer;display:flex;align-items:center;
                     justify-content:center;font-size:12px;color:var(--text3);transition:all .15s"
              onmouseover="this.style.background='rgba(255,255,255,.15)'"
              onmouseout="this.style.background='rgba(255,255,255,.06)'">✕</button>
            <span style="font-size:9px;color:var(--text3);white-space:nowrap">30 dias</span>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}


/* ══════════════════════════════════════════════════════════════════
   FEATURE 2 — FAQ (Perguntas Frequentes)
   Renderizado na aba Home, abaixo dos artigos
   ══════════════════════════════════════════════════════════════════ */

const FAQ_ITEMS = [
  {
    q: 'O que é Impermanent Loss (IL) e como o ProfitFlow Labs o calcula?',
    a: `O Impermanent Loss é a diferença entre manter tokens em uma pool de liquidez versus simplesmente os segurar (HODL). Quando o preço relativo dos tokens muda, o valor da sua posição no pool é menor do que seria se você tivesse mantido os tokens na carteira.<br><br>
    <strong>Fórmula usada:</strong> IL = (2√r / (1+r)) − 1, onde r = preço_atual / preço_entrada. Se r=2 (preço dobrou), IL ≈ −5,7%. O ProfitFlow Labs calcula o IL em tempo real com os preços do CoinGecko e também históricamente via snapshots de posição.`,
    tag: 'DeFi',
  },
  {
    q: 'Como importar uma pool via URL?',
    a: `Cole a URL diretamente da exchange na aba "Criar Pool" → "Importar por URL". Suporte atual:<br><br>
    • <strong>Uniswap v3/v4</strong> — app.uniswap.org/positions/v3/ethereum/123<br>
    • <strong>PancakeSwap, Camelot, SushiSwap, Aerodrome</strong><br>
    • <strong>Cetus, Turbos, KriyaDEX, FlowX, Aftermath</strong> (rede Sui)<br>
    • Explorers Sui: suiexplorer.com, suivision.xyz, suiscan.xyz<br><br>
    O sistema lê os dados diretamente da blockchain (sem API key), incluindo os tokens, fee tier, range de preço e cálculo do IL.`,
    tag: 'DeFi',
  },
  {
    q: 'Como funciona o Quadro P2P? É seguro?',
    a: `O módulo P2P permite comprar e vender criptoativos diretamente com outros usuários (peer-to-peer). O modelo usa <strong>escrow simulado</strong>: o vendedor "bloqueia" os cripto e o comprador tem um prazo para pagar. Após confirmação mútua, os cripto são liberados.<br><br>
    Por enquanto o P2P opera em modo simulado (sem integração com carteiras reais). Para liquidação real, conecte sua carteira externa e siga as instruções da transação.`,
    tag: 'P2P',
  },
  {
    q: 'Meus dados estão seguros? O ProfitFlow Labs tem acesso às minhas informações?',
    a: `O ProfitFlow Labs usa Firebase Authentication, Firestore e cache local do navegador para manter a experiencia rapida. Dados de perfil, assinatura e sincronizacao ficam no Firebase; alguns modulos tambem mantem copia local em <strong>localStorage</strong> para uso offline e carregamento rapido.<br><br>
    Medidas de seguranca ativas: autenticacao Firebase, regras do Firestore, sessao com token, auto-lock por inatividade (30 min), Content-Security-Policy e redacao de dados sensiveis no export.`,
    tag: 'Segurança',
  },
  {
    q: 'Como é calculada a folha de pagamento brasileira no Depto. Pessoal?',
    a: `Usamos as tabelas legais <strong>Brasil 2025</strong>:<br><br>
    • <strong>INSS progressivo</strong>: faixas de 7,5% a 14% (teto R$8.157,41)<br>
    • <strong>IRRF</strong>: tabela progressiva com dedução de R$189,59/dependente<br>
    • <strong>FGTS</strong>: 8% encargo do empregador<br>
    • <strong>Horas extras</strong>: 50% (adicional) e 100% (dobro)<br>
    • <strong>Desconto VT</strong>: 6% do salário, limitado ao valor do benefício<br>
    • <strong>Desconto por faltas</strong>: proporcional aos dias úteis`,
    tag: 'RH',
  },
  {
    q: 'E o módulo japonês (人事部)? Quais leis são seguidas?',
    a: `O módulo Japan HR segue a legislação <strong>2024/2025</strong>:<br><br>
    • <strong>健康保険</strong>: taxa real por prefeitura (47 prefs via 協会けんぽ)<br>
    • <strong>厚生年金</strong>: 9,15% funcionário + 9,15% empresa (18,3% total)<br>
    • <strong>雇用保険</strong>: 0,6% funcionário, 0,95% empresa<br>
    • <strong>介護保険</strong>: apenas para funcionários ≥40 anos<br>
    • <strong>Horas extras</strong>: 残業 +25%, 深夜 +50%, 休日 +35%<br>
    • <strong>派遣料金</strong>: cálculo automático do markup de cobrança ao cliente`,
    tag: 'RH',
  },
  {
    q: 'Quais planos estão disponíveis e o que está incluso?',
    a: `O ProfitFlow Labs oferece <strong>30 dias grátis</strong> sem cartão. Após o trial:<br><br>
    • <strong>Mensal</strong>: $4,99/mês — todos os módulos básicos<br>
    • <strong>Semestral</strong>: $29,99 — $5,00/mês equivalente<br>
    • <strong>Anual</strong>: $59,99 — melhor custo-benefício, inclui suporte prioritário<br><br>
    Todos os planos incluem: Pools DeFi, Carteira, Finanças, P2P, Opções, Departamento Pessoal BR e Japan HR.`,
    tag: 'Planos',
  },
  {
    q: 'Como funciona o cálculo de IL por snapshots?',
    a: `Na seção "Atualizar Posição" dentro dos detalhes de cada pool, você registra:<br><br>
    • Quantidade atual de cada token na pool<br>
    • Preço de cada token naquela data<br>
    • Data do snapshot<br><br>
    O sistema calcula o IL naquele momento comparando com a posição de entrada, mostrando também o valor no pool vs HODL e o P&L líquido (IL + taxas coletadas até aquela data).`,
    tag: 'DeFi',
  },
];

let faqOpenIndex = null;

function renderFAQ() {
  const tagColors = {
    DeFi:      { bg:'var(--blue-bg)',  color:'var(--blue-text)'  },
    P2P:       { bg:'var(--green-bg)', color:'var(--green-text)' },
    Segurança: { bg:'rgba(239,68,68,.1)', color:'#f87171'        },
    RH:        { bg:'rgba(139,92,246,.1)', color:'#a78bfa'       },
    Planos:    { bg:'var(--amber-bg)', color:'var(--amber-text)' },
  };

  return `
  <div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--border)">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.25rem">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--green)"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <h3 style="margin:0;font-size:17px">Perguntas Frequentes</h3>
    </div>
    <div id="faq-list" style="display:flex;flex-direction:column;gap:6px">
      ${FAQ_ITEMS.map((item, i) => {
        const tc = tagColors[item.tag] || tagColors['DeFi'];
        return `<div class="faq-item" id="faq-item-${i}" style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:border-color .15s">
          <button onclick="faqToggle(${i})"
            style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;
                   padding:.875rem 1rem;background:var(--bg2);border:none;cursor:pointer;text-align:left">
            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
              <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${tc.bg};color:${tc.color};font-weight:600;flex-shrink:0">${item.tag}</span>
              <span style="font-size:13px;font-weight:600;color:var(--text);line-height:1.4">${item.q}</span>
            </div>
            <svg id="faq-chevron-${i}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="color:var(--text3);flex-shrink:0;transition:transform .2s"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div id="faq-body-${i}" style="max-height:0;overflow:hidden;transition:max-height .3s ease">
            <div style="padding:.875rem 1rem 1rem;font-size:13px;color:var(--text2);line-height:1.65;border-top:1px solid var(--border);background:var(--bg)">
              ${item.a}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div style="margin-top:1rem;text-align:center;font-size:12px;color:var(--text3)">
      Mais dúvidas? Use o botão <strong>Sugestões</strong> no menu lateral para nos enviar uma pergunta.
    </div>
  </div>`;
}

function faqToggle(index) {
  const body    = document.getElementById('faq-body-'+index);
  const chevron = document.getElementById('faq-chevron-'+index);
  const item    = document.getElementById('faq-item-'+index);
  if(!body) return;

  const isOpen = body.style.maxHeight !== '0px' && body.style.maxHeight !== '';

  // Close previously open item
  if(faqOpenIndex !== null && faqOpenIndex !== index) {
    const prevBody    = document.getElementById('faq-body-'+faqOpenIndex);
    const prevChevron = document.getElementById('faq-chevron-'+faqOpenIndex);
    const prevItem    = document.getElementById('faq-item-'+faqOpenIndex);
    if(prevBody)    { prevBody.style.maxHeight='0'; }
    if(prevChevron) { prevChevron.style.transform='rotate(0deg)'; }
    if(prevItem)    { prevItem.style.borderColor='var(--border)'; }
  }

  if(isOpen) {
    body.style.maxHeight = '0';
    chevron.style.transform = 'rotate(0deg)';
    item.style.borderColor = 'var(--border)';
    faqOpenIndex = null;
  } else {
    body.style.maxHeight = body.scrollHeight + 'px';
    chevron.style.transform = 'rotate(180deg)';
    item.style.borderColor = 'var(--green)';
    faqOpenIndex = index;
  }
}


