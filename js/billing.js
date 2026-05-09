/* ══════════════════════════════════════════
   BILLING MODULE
   Plans: free_trial (30d) → monthly ($4.99) | semiannual ($29.99) | annual ($59.99)
   Sub stored on user object: { plan, status, start, expiry, method, txId }
   ══════════════════════════════════════════ */

/* ── Stripe ── */
const STRIPE_PK = 'pk_test_51TRr5DD6dYLf0ODGMAL96QKf19jY7HzxMb0Lae2AZtVcxebTIQrcWycmG1pOUZw80o875Nj6XPC4Dj6Nybs5rV2400Klsv92jq';
const STRIPE_PRICE_ID = 'price_1TRrIXD4NtZF4ybEiUeA5sHX'; // ex: price_1AbCdEfGhIjKlMno

const PLANS = {
  monthly: { id:'monthly', label:'Mensal', price:4.99, period:'mês' },
};

const PAY_METHODS = [
  { id:'stripe', icon:'🌐', name:'Stripe Checkout', desc:'Cartão, Apple Pay e Google Pay · seguro e global', instant:false },
];

const TRIAL_DAYS = 30;

function subLoad() { return session?.user?.subscription || null; }

function checkAccess() {
  const u = session?.user;
  if(!u) return false;
  const sub = u.subscription;

  // paid & active
  if(sub?.status === 'active') {
    if(sub.plan === 'lifetime') return true;
    if(sub.expiry && Date.now() < sub.expiry) return true;
    // expired — mark it
    u.subscription.status = 'expired';
    stSet(u.uid, u);
    return false;
  }

  // trial window
  const started = u.trialStart || Date.now();
  const elapsed = Date.now() - started;
  if(elapsed < TRIAL_DAYS * 86400000) return true;

  return false;
}

function trialDaysLeft() {
  const u = session?.user;
  if(!u) return 0;
  const elapsed = Date.now() - (u.trialStart || Date.now());
  return Math.max(0, TRIAL_DAYS - Math.floor(elapsed / 86400000));
}

function subStatusLabel() {
  const u = session?.user;
  if(!u) return { label:'—', cls:'expired' };
  const _prof = stGet(u.uid+'_profile')||{};
  if(_prof.role==='admin'||_prof.isAdmin) return { label:'🛡️ Admin', cls:'active' };
  const sub = u.subscription;
  if(sub?.status === 'active') {
    if(sub.plan === 'lifetime') return { label:'Vitalício ★', cls:'active' };
    const exp = new Date(sub.expiry).toLocaleDateString('pt-BR');
    return { label:`${PLANS[sub.plan]?.label} · ativo até ${exp}`, cls:'active' };
  }
  const dl = trialDaysLeft();
  if(dl > 0) return { label:`Trial · ${dl} dia${dl!==1?'s':''} restante${dl!==1?'s':''}`, cls:'trial' };
  return { label:'Trial expirado', cls:'expired' };
}

/* ── Trial banner shown inside the app ── */
function maybeRenderTrialBanner() {
  const sub = subLoad();
  if(sub?.status === 'active') return '';
  const dl = trialDaysLeft();
  if(dl <= 0) return '';
  const urgency = dl <= 7;
  return `<div class="trial-banner" style="${urgency?'border-color:var(--amber)':''}">
    <div class="trial-days" style="${urgency?'color:var(--amber)':''}">
      ${dl}<span style="font-size:14px;font-weight:400;color:var(--text2)"> dias</span>
    </div>
    <div style="flex:1">
      <div style="font-size:14px;font-weight:600;color:var(--text)">
        ${urgency?'⚠ Trial expirando em breve!':'Período trial gratuito'}
      </div>
      <div style="font-size:13px;color:var(--text2);margin-top:2px">
        ${urgency?'Assine agora para não perder acesso à plataforma':'Explore todas as funcionalidades gratuitamente'}
      </div>
    </div>
    <button class="btn btn-primary" onclick="switchTab('settings');setTimeout(()=>document.getElementById('billing-section')?.scrollIntoView({behavior:'smooth'}),100)">
      Ver planos
    </button>
  </div>`;
}

/* ── Full paywall screen (trial expired / expired sub) ── */
function renderPaywall() {
  const u = session.user;
  const sub = u.subscription;
  const isExpired = sub?.status === 'expired';
  R.innerHTML = `
  <div class="paywall-overlay">
    <div class="paywall-box">
      <div style="font-size:40px;margin-bottom:.75rem">${isExpired?'🔒':'⏰'}</div>
      <h2 style="margin-bottom:.5rem">${isExpired?'Assinatura expirada':'Trial encerrado'}</h2>
      <p class="sub" style="margin-bottom:1.5rem;font-size:14px">
        ${isExpired
          ?'Sua assinatura expirou. Renove para continuar usando o ProfitFlow Labs.'
          :'Seus 30 dias gratuitos chegaram ao fim. Assine para continuar.'}
      </p>
      <button class="btn btn-primary" style="width:100%;margin-bottom:10px;font-size:15px;padding:12px" onclick="renderPricingPage()">
        Ver planos e assinar
      </button>
      <button class="btn" style="width:100%;font-size:13px" onclick="doLogout()">Sair da conta</button>
      <div style="margin-top:1rem;font-size:12px;color:var(--text3)">
        Dúvidas? <a href="mailto:suporte@cashflow.io" style="color:var(--blue)">suporte@cashflow.io</a>
      </div>
    </div>
  </div>`;
}

/* ── Full pricing page ── */
function renderPricingPage(selectedPlan='monthly') {
  R.innerHTML = `
  <div class="app" style="max-width:480px;margin:0 auto;padding:2rem 1rem">
    <div style="text-align:center;margin-bottom:2rem">
      <h1 style="font-size:28px;margin-bottom:.5rem">ProfitFlow Labs Pro</h1>
      <p class="sub" style="font-size:15px">Acesso completo a todas as funcionalidades</p>
    </div>

    <div class="card" style="margin-bottom:1.5rem;border:2px solid var(--green);box-shadow:0 0 24px rgba(57,255,138,.1)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.06em">Plano Mensal</div>
          <div style="font-size:36px;font-weight:800;color:var(--text);line-height:1.1">$4,99<span style="font-size:14px;font-weight:400;color:var(--text2)"> / mês</span></div>
        </div>
        <div style="font-size:32px">🚀</div>
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:.75rem 0">
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2)"><span style="color:var(--green);font-weight:700">✓</span> Pools de liquidez ilimitadas</div>
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2)"><span style="color:var(--green);font-weight:700">✓</span> Gestão de Carteira completa</div>
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2)"><span style="color:var(--green);font-weight:700">✓</span> ERP Financeiro</div>
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2)"><span style="color:var(--green);font-weight:700">✓</span> IL em tempo real</div>
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2)"><span style="color:var(--green);font-weight:700">✓</span> CoinGecko integrado</div>
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2)"><span style="color:var(--green);font-weight:700">✓</span> Exportação de dados</div>
      </div>
    </div>

    <button class="btn btn-primary" id="pay-btn" style="width:100%;font-size:15px;padding:14px;margin-bottom:.75rem" onclick="processPayment()">
      🔒 Assinar por $4,99/mês via Stripe
    </button>
    <div style="text-align:center;font-size:12px;color:var(--text3);margin-bottom:1.5rem">
      Cartão de crédito · Apple Pay · Google Pay · Cancele a qualquer momento
    </div>

    <div style="text-align:center">
      <button class="btn btn-sm" onclick="${checkAccess()?'renderApp()':'renderPaywall()'}">← Voltar</button>
    </div>
  </div>`;

  window._selectedPlan = 'monthly';
  window._selectedMethod = 'stripe';
}

function renderPlanCards(sel) {
  return Object.values(PLANS).map(p=>{
    const isSel = p.id === sel;
    return `<div class="plan-card ${p.id==='annual'?'featured':''}" style="${isSel?'border-color:var(--blue);':''}cursor:pointer" onclick="selectPlan('${p.id}')">
      ${p.id==='annual'?'<div class="plan-badge">Mais popular</div>':''}
      ${p.badge?`<div class="plan-badge" style="background:var(--blue)">${p.badge}</div>`:''}
      <div style="font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.06em">${p.label}</div>
      <div class="plan-price">$${p.price}<span> / ${p.period}</span></div>
      ${p.monthly?`<div style="font-size:12px;color:var(--green)">≈ $${p.monthly}/mês · ${p.save}% de economia</div>`:''}
      ${p.annually?`<div style="font-size:12px;color:var(--text3)">$${p.annually}/ano no mensal</div>`:''}
      <hr style="border:none;border-top:1px solid var(--border);margin:.5rem 0">
      <div class="plan-feature ok">Pools ilimitadas</div>
      <div class="plan-feature ok">Gestão de Carteira</div>
      <div class="plan-feature ok">ERP Financeiro</div>
      <div class="plan-feature ok">IL em tempo real</div>
      <div class="plan-feature ok">CoinGecko integrado</div>
      ${p.id==='monthly'?'<div class="plan-feature no">Exportação de dados</div>':'<div class="plan-feature ok">Exportação de dados</div>'}
      ${p.id==='annual'?'<div class="plan-feature ok">Suporte prioritário</div>':''}
      <button class="btn ${isSel?'btn-primary':''}" style="width:100%;margin-top:.5rem" onclick="selectPlan('${p.id}')">
        ${isSel?'✓ Selecionado':'Selecionar'}
      </button>
    </div>`;
  }).join('');
}

function selectPlan(id) {
  window._selectedPlan = id;
  document.getElementById('plan-cards').innerHTML = renderPlanCards(id);
  updatePayBtn();
}

function selectPayMethod(id) {
  window._selectedMethod = id;
  PAY_METHODS.forEach(m=>{
    const el  = document.getElementById('pm-'+m.id);
    const dot = document.getElementById('pmc-'+m.id);
    if(el)  el.classList.toggle('selected', m.id===id);
    if(dot) dot.innerHTML = m.id===id?'<div style="width:10px;height:10px;border-radius:50%;background:var(--blue)"></div>':'';
  });
  updatePayDetail();
}

function updatePayDetail() {
  const method = window._selectedMethod || 'pix';
  const plan   = PLANS[window._selectedPlan || 'annual'];
  const detail = document.getElementById('pay-detail');
  if(!detail || !plan) return;

  const details = {
    pix:    `<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;text-align:center">
               <div style="font-size:13px;color:var(--text2);margin-bottom:.75rem">Escaneie o QR Code ou copie a chave PIX</div>
               <div style="width:120px;height:120px;background:var(--bg4);border-radius:8px;margin:0 auto .75rem;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text3)">[QR Code gerado<br>via backend]</div>
               <input value="funbot@pagamentos.io" readonly style="width:100%;height:34px;text-align:center;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg2);color:var(--text)">
               <div style="font-size:12px;color:var(--text3);margin-top:.5rem">Chave PIX · válida por 30 min</div>
             </div>`,
    card:   `<div style="display:flex;flex-direction:column;gap:10px">
               <div class="field"><label>Número do cartão</label><input placeholder="0000 0000 0000 0000" maxlength="19" oninput="this.value=this.value.replace(/[^\\d]/g,'').replace(/(\\d{4})/g,'$1 ').trim()"></div>
               <div class="grid2">
                 <div class="field"><label>Validade</label><input placeholder="MM/AA" maxlength="5"></div>
                 <div class="field"><label>CVV</label><input placeholder="123" maxlength="4" type="password"></div>
               </div>
               <div class="field"><label>Nome no cartão</label><input placeholder="NOME SOBRENOME"></div>
               <div style="display:flex;gap:6px;margin-top:4px">
                 ${['💳 Visa','💳 Master','💳 Elo','💳 Amex'].map(b=>`<span style="font-size:11px;padding:2px 8px;border:1px solid var(--border);border-radius:4px;color:var(--text2)">${b}</span>`).join('')}
               </div>
             </div>`,
    boleto: `<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1rem">
               <div style="font-size:13px;color:var(--text2);margin-bottom:.5rem">Boleto bancário · vence em 3 dias úteis</div>
               <input value="23793.38128 60007.827136 00553.870000 6 00000000001900" readonly style="width:100%;height:34px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg2);color:var(--text);padding:0 8px">
               <div style="font-size:12px;color:var(--text3);margin-top:.5rem">Após o pagamento, o acesso é liberado em até 2 dias úteis</div>
             </div>`,
    crypto: `<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1rem">
               <div style="display:flex;gap:8px;margin-bottom:.75rem">
                 ${['USDC','USDT','ETH','BTC'].map(c=>`<button class="tag-btn active" style="font-size:12px">${c}</button>`).join('')}
               </div>
               <div style="font-size:13px;color:var(--text2);margin-bottom:.5rem">Endereço de recebimento (Ethereum / Arbitrum)</div>
               <input value="0x742d35Cc6634C0532925a3b8D4C9E0F6a4b3c1e8" readonly style="width:100%;height:34px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg2);color:var(--text);padding:0 8px">
               <div style="font-size:12px;color:var(--text3);margin-top:.5rem">Envie o valor exato em USDC · acesso liberado após 1 confirmação</div>
             </div>`,
    paypal: `<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;text-align:center">
               <div style="font-size:13px;color:var(--text2);margin-bottom:.75rem">Você será redirecionado ao PayPal para completar o pagamento</div>
               <div style="font-size:28px;margin-bottom:.5rem">🅿</div>
               <div style="font-size:12px;color:var(--text3)">pagamentos@cashflow.io</div>
             </div>`,
    stripe: `<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;text-align:center">
               <div style="font-size:13px;color:var(--text2);margin-bottom:.75rem">Checkout seguro via Stripe · Apple Pay e Google Pay disponíveis</div>
               <div style="display:flex;gap:8px;justify-content:center">
                 ${['🍎 Apple Pay','G Google Pay','💳 Cartão'].map(b=>`<span style="font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:6px;color:var(--text2)">${b}</span>`).join('')}
               </div>
             </div>`,
  };
  detail.innerHTML = details[method] || '';
  updatePayBtn();
}

function updatePayBtn() {
  const btn  = document.getElementById('pay-btn');
  if(!btn) return;
  const plan = PLANS[window._selectedPlan || 'annual'];
  btn.textContent = `Assinar ${plan.label} · $${plan.price}/${plan.period}`;
}

async function processPayment() {
  const btn = document.getElementById('pay-btn');
  if(btn) { btn.disabled = true; btn.textContent = 'Aguarde...'; }

  try {
    const uid  = session?.user?.uid;
    const email = session?.user?.email || '';
    const idToken = await fbAuth.currentUser?.getIdToken();
    if(!idToken) throw new Error('Usuário não autenticado');

    // Call Firebase Cloud Function to create Stripe Checkout Session
    const resp = await fetch('https://us-central1-cashflow-ae591.cloudfunctions.net/createCheckoutSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({ uid, email, priceId: STRIPE_PRICE_ID })
    });

    if(!resp.ok) throw new Error('Erro ao criar sessão de pagamento');
    const { url } = await resp.json();

    // Redirect to Stripe Checkout
    window.location.href = url;

  } catch(err) {
    console.error('Stripe error:', err);
    showToast('❌ Erro ao processar pagamento. Tente novamente.');
    if(btn) { btn.disabled = false; btn.textContent = '🔒 Assinar por $4,99/mês via Stripe'; }
  }
}

/* Called on page load to check if user returned from Stripe */
function checkStripeReturn() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('stripe_session_id');
  const cancelled = params.get('stripe_cancelled');

  if(sessionId) {
    // Remove query string from URL
    window.history.replaceState({}, '', window.location.pathname);
    // Show pending activation screen (webhook will activate, but show optimistic UI)
    showToast('✅ Pagamento recebido! Ativando sua assinatura...');
    // Poll Firestore for subscription activation (webhook may take a few seconds)
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      try {
        const doc = await fbDb.collection('users').doc(session.user.uid).get();
        const data = doc.data();
        if(data?.subscription?.status === 'active') {
          clearInterval(poll);
          session.user = { ...session.user, ...data };
          stSet('pool_session', session);
          renderApp();
          showToast('🎉 Assinatura ativada com sucesso!');
        }
      } catch(e) {}
      if(attempts >= 10) clearInterval(poll); // stop after 10 attempts (~20s)
    }, 2000);
  }

  if(cancelled) {
    window.history.replaceState({}, '', window.location.pathname);
    showToast('Pagamento cancelado.');
  }
}

/* ── Billing section injected into renderSettings ── */
function renderBillingSection() {
  const sub = subLoad();
  const status = subStatusLabel();
  const dl = trialDaysLeft();

  return `<div class="card settings-section" id="billing-section">
    <div class="settings-section-title">Assinatura & Pagamento</div>

    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:1.25rem">
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">Status atual</div>
        <span class="sub-status-pill ${status.cls}">${status.label}</span>
      </div>
      ${sub?.status==='active'?`
      <div style="text-align:right">
        <div style="font-size:12px;color:var(--text3)">Plano</div>
        <div style="font-size:14px;font-weight:600;color:var(--text)">${PLANS[sub.plan]?.label||sub.plan}</div>
      </div>`:''}
    </div>

    ${sub?.status==='active'?`
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.75rem 1rem;margin-bottom:1rem;font-size:13px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--text2)">Forma de pagamento</span><span style="color:var(--text)">${PAY_METHODS.find(m=>m.id===sub.method)?.name||sub.method}</span></div>
      ${sub.expiry?`<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--text2)">Próxima renovação</span><span style="color:var(--text)">${new Date(sub.expiry).toLocaleDateString('pt-BR')}</span></div>`:''}
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">Ativo desde</span><span style="color:var(--text)">${new Date(sub.start).toLocaleDateString('pt-BR')}</span></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="renderPricingPage()">Alterar plano</button>
      <button class="btn btn-sm btn-danger" onclick="cancelSubscription()">Cancelar assinatura</button>
    </div>`:`
    <div style="margin-bottom:1rem">
      ${dl>0?`<div style="font-size:13px;color:var(--text2);margin-bottom:.75rem">Você tem <strong style="color:var(--amber)">${dl} dia${dl!==1?'s':''}</strong> de trial restante${dl!==1?'s':''}. Assine antes de expirar.</div>`:''}
    </div>
    <button class="btn btn-primary" style="width:100%" onclick="renderPricingPage()">Ver planos e assinar</button>`}
  </div>`;
}

function cancelSubscription() {
  if(!confirm('Cancelar assinatura? O acesso continuará até o fim do período pago.')) return;
  const u = session.user;
  if(u.subscription) u.subscription.status = 'cancelled';
  stSet(u.uid, u);
  session.user = u;
  stSet('pool_session', session);
  showToast('Assinatura cancelada. Acesso mantido até o fim do período.');
  renderSettings();
}

/* ══════════════════════════════════════════
   COPY TRADING MODULE
   Account: rb-35107532 / ID 11910184 (Myfxbook)
   - Uses Myfxbook public widgets (no auth needed)
   - Uses Myfxbook API when user configures credentials
   - Falls back to curated static data from public profile
   ══════════════════════════════════════════ */

const CT_ACCOUNT_ID   = '11910184';
const CT_ACCOUNT_SLUG = 'members/FunBot/rb-35107532';
const CT_KEY = () => session.user.uid + '_ct_config';

function ctConfigLoad() { return stGet(CT_KEY()) || {}; }
function ctConfigSave(c) { stSet(CT_KEY(), c); }

// Static snapshot from public profile (updated manually or via API)
const CT_STATIC = {
  name:         'RB Trading',
  broker:       'Forex',
  currency:     'USD',
  gain:         null,
  drawdown:     null,
  monthly:      null,
  weekly:       null,
  profitFactor: null,
  totalTrades:  null,
  winRate:      null,
  avgWin:       null,
  avgLoss:      null,
  startDate:    '—',
  lastUpdate:   '—',
  risk:         'med',
  tradingStyle: 'Swing / Day Trade',
  instruments:  'Forex, Índices',
};

// Try to load cached CT data from localStorage
function ctLoadCached() {
  const c = stGet('ct_cached_'+CT_ACCOUNT_ID);
  if(c && c.ts && Date.now()-c.ts < 3600000) { // 1h cache
    Object.assign(CT_STATIC, c.data);
    return true;
  }
  return false;
}
ctLoadCached();

let ctApiSession  = null;
let ctLiveData    = null;
let ctHistChart   = null;
let ctRefreshTimer = null;

