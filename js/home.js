/* ══════════════════════════════════════════
   SUGGESTION BOX
   ══════════════════════════════════════════ */
function openSuggestionBox() {
  if(document.getElementById('suggest-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'suggest-overlay';
  overlay.innerHTML = `
  <div class="modal" style="max-width:460px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.25rem">
      <div>
        <div style="font-size:22px;margin-bottom:4px">💬</div>
        <h3 style="margin-bottom:2px">Sugestões & Feedback</h3>
        <p class="sub" style="margin-top:0">Sua opinião nos ajuda a melhorar o ProfitFlow Labs</p>
      </div>
      <button class="btn btn-sm" onclick="document.getElementById('suggest-overlay').remove()">✕</button>
    </div>

    <div style="display:flex;gap:6px;margin-bottom:1rem">
      ${[['💡','Sugestão','suggestion'],['🐛','Bug','bug'],['🚀','Nova feature','feature'],['🌟','Elogio','praise']].map(([ico,lbl,val],i)=>`
      <button class="import-method-btn${i===0?' active':''}" id="stype-${val}"
        style="flex:1;padding:8px 4px;font-size:11px" onclick="selectSuggestType('${val}')">
        <div style="font-size:18px;margin-bottom:2px">${ico}</div>
        <div style="font-weight:600">${lbl}</div>
      </button>`).join('')}
    </div>
    <input type="hidden" id="suggest-type" value="suggestion">

    <div class="field" style="margin-bottom:12px">
      <label>Assunto</label>
      <input id="suggest-subject" placeholder="ex: Integração com Binance, bug no cálculo de IL...">
    </div>
    <div class="field" style="margin-bottom:12px">
      <label>Mensagem <span style="color:var(--red)">*</span></label>
      <textarea id="suggest-body" rows="5" style="width:100%;padding:10px 12px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);resize:vertical;font-family:inherit;line-height:1.5" placeholder="Descreva sua sugestão com o máximo de detalhes possível..."></textarea>
    </div>
    <div class="field" style="margin-bottom:1rem">
      <label>Seu e-mail (opcional, para resposta)</label>
      <input id="suggest-email" type="email" value="${(()=>{try{return JSON.parse(localStorage.getItem('pool_session'))?.user?.email||''}catch(e){return ''}})()||''}" placeholder="seu@email.com">
    </div>
    <div id="suggest-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="sendSuggestion()" id="suggest-send-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right:4px;vertical-align:-1px"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        Enviar feedback
      </button>
      <button class="btn" onclick="document.getElementById('suggest-overlay').remove()">Cancelar</button>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-top:.75rem;text-align:center">
      Respondemos todas as sugestões em até 48h úteis ✓
    </div>
  </div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>document.getElementById('suggest-body')?.focus(), 80);
}

function selectSuggestType(val) {
  ['suggestion','bug','feature','praise'].forEach(t=>{
    document.getElementById('stype-'+t)?.classList.toggle('active', t===val);
  });
  document.getElementById('suggest-type').value = val;
}

function sendSuggestion() {
  const type    = document.getElementById('suggest-type')?.value || 'suggestion';
  const subject = (document.getElementById('suggest-subject')?.value||'').trim();
  const body    = (document.getElementById('suggest-body')?.value||'').trim();
  const replyTo = (document.getElementById('suggest-email')?.value||'').trim();
  const errEl   = document.getElementById('suggest-err');
  const btn     = document.getElementById('suggest-send-btn');

  if(!body) {
    errEl.textContent = 'Por favor escreva sua mensagem.';
    errEl.style.display = 'block';
    return;
  }

  const typeLabels = { suggestion:'💡 Sugestão', bug:'🐛 Bug', feature:'🚀 Feature', praise:'🌟 Elogio' };
  const dest = atob('cmFmYWVsY2FzdGVsbGltdW5pekBnbWFpbC5jb20='); // obfuscated
  const emailSubject = encodeURIComponent(`[ProfitFlow Labs] ${typeLabels[type]||type}${subject?' — '+subject:''}`);

  const prof = (()=>{try{const s=JSON.parse(localStorage.getItem('pool_session'));return s?.user;}catch(e){return null;}})();
  const userInfo = prof ? `\n\nUsuário: ${prof.name} (${prof.email})` : '';
  const replyInfo = replyTo ? `\nResponder para: ${replyTo}` : '';

  const emailBody = encodeURIComponent(
    body + userInfo + replyInfo +
    '\n\n---\nEnviado via ProfitFlow Labs · cashflow.io'
  );

  const mailtoLink = `mailto:${dest}?subject=${emailSubject}&body=${emailBody}`;

  // Open mailto — works on desktop and most mobile
  const a = document.createElement('a');
  a.href = mailtoLink;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Show success state
  btn.textContent = '✓ Obrigado!';
  btn.style.background = 'var(--green)';
  btn.style.color = '#000';
  btn.disabled = true;
  setTimeout(()=>{
    document.getElementById('suggest-overlay')?.remove();
  }, 1800);
}

/* ══════════════════════════════════════════
   SHARE POOL RESULTS
   ══════════════════════════════════════════ */
function openShareModal(key) {
  const pool = stGet(key);
  if(!pool) return;

  const fees      = (pool.fees||[]).reduce((s,f)=>s+parseFloat(f.value||0),0);
  const t1usd     = parseFloat(pool.token1?.usd||0);
  const t2usd     = parseFloat(pool.token2?.usd||0);
  const totalDep  = t1usd + t2usd;
  const daysSince = pool.date ? Math.max(0,Math.floor((Date.now()-new Date(pool.date+'T00:00:00'))/(86400000))) : 0;
  const isDCA     = !pool.token2?.symbol;
  const feeAPR    = totalDep > 0 && daysSince > 0 ? (fees/totalDep)*(365/daysSince)*100 : null;

  // Build share text for copy/social
  const shareText = buildShareText(pool, fees, totalDep, daysSince, feeAPR, isDCA);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'share-overlay';
  overlay.style.cssText = 'overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  overlay.innerHTML = `
  <div class="modal" style="max-width:480px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div>
        <h3 style="margin-bottom:2px">Compartilhar resultados</h3>
        <p class="sub" style="margin-top:0">${pool.name}</p>
      </div>
      <button class="btn btn-sm" onclick="document.getElementById('share-overlay').remove()">✕</button>
    </div>

    <!-- Preview card (the "shareable image look") -->
    <div class="share-card" id="share-preview-card" style="margin-bottom:1.25rem">
      <div style="position:relative;z-index:1">
        <!-- Logo header -->
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:1rem">
          <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#638eff,#39ff8a);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#0a0e18">C</div>
          <span style="font-size:13px;font-weight:700;background:linear-gradient(90deg,#638eff,#39ff8a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">ProfitFlow Labs</span>
        </div>

        <!-- Pool pair -->
        <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:.75rem">
          <div style="display:flex;align-items:center">
            ${pool.token1?.logo?`<img src="${pool.token1.logo}" style="width:32px;height:32px;border-radius:50%;border:2px solid rgba(255,255,255,.15)" onerror="this.style.display='none'">`:`<div style="width:32px;height:32px;border-radius:50%;background:rgba(99,142,255,.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">${(pool.token1?.symbol||'?').slice(0,2)}</div>`}
            ${!isDCA?(pool.token2?.logo?`<img src="${pool.token2.logo}" style="width:32px;height:32px;border-radius:50%;border:2px solid rgba(255,255,255,.15);margin-left:-10px" onerror="this.style.display='none'">`:`<div style="width:32px;height:32px;border-radius:50%;background:rgba(57,255,138,.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#39ff8a;margin-left:-10px">${(pool.token2?.symbol||'?').slice(0,2)}</div>`):''}
          </div>
          <div>
            <div style="font-size:18px;font-weight:800;color:#fff">${pool.name}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.5)">${pool.exchange} · ${pool.network}</div>
          </div>
        </div>

        <!-- Metrics grid -->
        <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:1rem">
          ${totalDep>0?`<div class="share-metric">
            <span class="sm-val" style="color:#638eff">$${totalDep>=10000?(totalDep/1000).toFixed(1)+'k':totalDep.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            <span class="sm-lbl">${t('deposited')}</span>
          </div>`:''}
          ${fees>0?`<div class="share-metric">
            <span class="sm-val" style="color:#39ff8a">+$${fees.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            <span class="sm-lbl">${t('fees')}</span>
          </div>`:''}
          ${feeAPR!=null?`<div class="share-metric">
            <span class="sm-val" style="color:#ffb74d">${feeAPR.toFixed(1)}%</span>
            <span class="sm-lbl">APR estimado</span>
          </div>`:''}
          <div class="share-metric">
            <span class="sm-val" style="color:rgba(255,255,255,.85)">${daysSince}</span>
            <span class="sm-lbl">${t('active_days')}</span>
          </div>
        </div>

        <!-- CTA -->
        <div style="font-size:11px;color:rgba(255,255,255,.4);letter-spacing:.04em">
          📊 Acompanhe suas pools com <strong style="color:rgba(255,255,255,.65)">ProfitFlow Labs</strong>
        </div>
      </div>
    </div>

    <!-- Share text preview -->
    <div class="field" style="margin-bottom:1rem">
      <label>Texto para copiar</label>
      <textarea id="share-text-area" rows="7" style="width:100%;padding:10px 12px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text2);resize:vertical;font-family:monospace;line-height:1.55">${shareText}</textarea>
    </div>

    <!-- Action buttons -->
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="copyShareText()" id="share-copy-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right:4px;vertical-align:-1px"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copiar texto
      </button>
      <button class="btn" onclick="shareWhatsApp('${key}')"
        style="background:#25D366;color:#fff;border-color:#25D366">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;vertical-align:-1px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
        WhatsApp
      </button>
      <button class="btn" onclick="shareTwitter('${key}')"
        style="background:#1DA1F2;color:#fff;border-color:#1DA1F2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;vertical-align:-1px"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
        X / Twitter
      </button>
    </div>

    <div style="margin-top:.875rem;font-size:11px;color:var(--text3);text-align:center">
      Ao compartilhar você ajuda a divulgar o ProfitFlow Labs 🚀
    </div>
  </div>`;
  document.body.appendChild(overlay);
  // Inject watermark into share card
  setTimeout(injectShareWatermark, 0);
}

function buildShareText(pool, fees, totalDep, daysSince, feeAPR, isDCA) {
  const pair   = pool.name;
  const lines  = [];
  lines.push(`📊 *Minha performance na pool ${pair}*`);
  lines.push(`🏦 ${pool.exchange} · ${pool.network}`);
  lines.push('');
  if(totalDep > 0) lines.push(`💰 Depositado: $${totalDep.toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
  if(fees > 0)     lines.push(`✅ Taxas coletadas: +$${fees.toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
  if(feeAPR!=null) lines.push(`📈 APR estimado: ${feeAPR.toFixed(1)}%`);
  if(daysSince > 0) lines.push(`⏱ ${daysSince} dias ativo`);
  if(pool.fee)     lines.push(`🔧 Fee tier: ${pool.fee}%`);
  lines.push('');
  lines.push(`🚀 Acompanho minhas pools com o *ProfitFlow Labs* — rastreie IL, calcule APR e gerencie toda sua carteira DeFi em um lugar só.`);
  lines.push('');
  lines.push(`👉 Experimente grátis em cashflow.io`);
  return watermarkShareText(lines.join('\n'));
}

function copyShareText() {
  const txt = document.getElementById('share-text-area')?.value;
  if(!txt) return;
  navigator.clipboard.writeText(txt).then(()=>{
    const btn = document.getElementById('share-copy-btn');
    btn.textContent = '✓ Copiado!';
    btn.style.background = 'var(--green)';
    btn.style.color = '#000';
    setTimeout(()=>{ btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right:4px;vertical-align:-1px"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar texto'; btn.style.background=''; btn.style.color=''; }, 2000);
  }).catch(()=>{ showToast('Selecione o texto e copie manualmente.'); });
}

function shareWhatsApp(key) {
  const pool = stGet(key); if(!pool) return;
  const fees   = (pool.fees||[]).reduce((s,f)=>s+parseFloat(f.value||0),0);
  const dep    = parseFloat(pool.token1?.usd||0)+parseFloat(pool.token2?.usd||0);
  const days   = pool.date ? Math.max(0,Math.floor((Date.now()-new Date(pool.date+'T00:00:00'))/(86400000))) : 0;
  const apr    = dep>0&&days>0 ? (fees/dep)*(365/days)*100 : null;
  const isDCA  = !pool.token2?.symbol;
  const txt    = buildShareText(pool, fees, dep, days, apr, isDCA);
  window.open('https://wa.me/?text='+encodeURIComponent(txt), '_blank');
}

function shareTwitter(key) {
  const pool = stGet(key); if(!pool) return;
  const fees  = (pool.fees||[]).reduce((s,f)=>s+parseFloat(f.value||0),0);
  const dep   = parseFloat(pool.token1?.usd||0)+parseFloat(pool.token2?.usd||0);
  const days  = pool.date ? Math.max(0,Math.floor((Date.now()-new Date(pool.date+'T00:00:00'))/(86400000))) : 0;
  const apr   = dep>0&&days>0 ? (fees/dep)*(365/days)*100 : null;
  const short = [
    `📊 ${pool.name} no ${pool.exchange}`,
    fees>0?`✅ +$${fees.toFixed(2)} em taxas`:'',
    apr!=null?`📈 APR: ${apr.toFixed(1)}%`:'',
    `⏱ ${days} dias`,
    ``,
    `Uso o ProfitFlow Labs pra rastrear minhas pools DeFi 🚀`,
    `👉 cashflow.io`,
    `#DeFi #LiquidityPool #CashFlowLabs`,
  ].filter(Boolean).join('\n');
  window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(short), '_blank');
}

/* ══════════════════════════════════════════════════════
   HOME — Revista financeira / News Magazine
   ══════════════════════════════════════════════════════ */

const NEWS_ARTICLES = [
  {
    id:1, tag:'DeFi', tagClass:'news-tag-defi', emoji:'🌊',
    title:'Uniswap v4 hooks: como as pools personalizadas estão redefinindo a liquidez concentrada',
    summary:'Com o lançamento dos hooks customizáveis, provedores de liquidez agora podem programar estratégias avançadas diretamente no contrato, eliminando a necessidade de bots externos.',
    author:'ProfitFlow Labs', date:'Abr 2025', readTime:'5 min', featured:true,
  },
  {
    id:2, tag:'Cripto', tagClass:'news-tag-cripto', emoji:'₿',
    title:'Bitcoin acima de $90k: o que os dados on-chain dizem sobre o próximo movimento',
    summary:'Análise de métricas como SOPR, NUPLs e fluxos de exchanges indica acumulação por holders de longo prazo mesmo com volatilidade de curto prazo elevada.',
    author:'ProfitFlow Labs', date:'Abr 2025', readTime:'7 min', featured:true,
  },
  {
    id:3, tag:'Ações', tagClass:'news-tag-acoes', emoji:'📈',
    title:'Temporada de earnings: NVIDIA e Microsoft superam expectativas; o que esperar do setor de IA',
    summary:'Os resultados do Q1 2025 revelam que empresas de infraestrutura de IA continuam crescendo acima de 30% ao ano, enquanto aplicações ainda buscam monetização.',
    author:'ProfitFlow Labs', date:'Abr 2025', readTime:'4 min', featured:false,
  },
  {
    id:4, tag:'Economia', tagClass:'news-tag-economia', emoji:'🏛',
    title:'Fed mantém juros: o impacto no mercado de DeFi e nas stablecoins lastreadas em treasuries',
    summary:'A decisão do Federal Reserve de manter a taxa em 5.25% fortalece o rendimento de stablecoins como USDC e USDT nos protocolos de lending.',
    author:'ProfitFlow Labs', date:'Mar 2025', readTime:'6 min', featured:false,
  },
  {
    id:5, tag:'DeFi', tagClass:'news-tag-defi', emoji:'🔗',
    title:'Impermanent Loss explicado: guia completo para LPs iniciantes e avançados',
    summary:'Entenda como o IL afeta sua posição dependendo da correlação entre os ativos, do fee tier escolhido e da largura do range em pools concentradas.',
    author:'ProfitFlow Labs', date:'Mar 2025', readTime:'10 min', featured:false,
  },
  {
    id:6, tag:'Opções', tagClass:'news-tag-opcoes', emoji:'◎',
    title:'Estratégias de opções para mercados laterais: iron condor e butterfly na prática',
    summary:'Quando o mercado não define direção, as estratégias de venda de volatilidade se tornam as mais rentáveis. Aprenda a montar e gerir iron condors com risco controlado.',
    author:'ProfitFlow Labs', date:'Mar 2025', readTime:'8 min', featured:false,
  },
  {
    id:7, tag:'Economia', tagClass:'news-tag-economia', emoji:'🇧🇷',
    title:'Selic em foco: como a taxa básica brasileira afeta seus investimentos em cripto e B3',
    summary:'Com a Selic acima de 10%, a comparação entre renda fixa e ativos de risco volta ao centro do debate. Analisamos o custo de oportunidade para diferentes perfis.',
    author:'ProfitFlow Labs', date:'Mar 2025', readTime:'5 min', featured:false,
  },
  {
    id:8, tag:'Cripto', tagClass:'news-tag-cripto', emoji:'⚡',
    title:'Layer 2s e o futuro das taxas: Arbitrum, Base e Optimism competem por liquidez',
    summary:'O ecossistema de L2s cresceu mais de 400% em TVL no último ano. Entenda qual rede oferece o melhor equilíbrio entre segurança, velocidade e custo para seu perfil.',
    author:'ProfitFlow Labs', date:'Fev 2025', readTime:'6 min', featured:false,
  },
  {
    id:9, tag:'Ações', tagClass:'news-tag-acoes', emoji:'🏦',
    title:'ETFs de Bitcoin aprovados: como o fluxo institucional está mudando a correlação com o S&P 500',
    summary:'Com mais de $15 bilhões em AUM acumulados nos primeiros meses, os ETFs spot de Bitcoin estão criando um novo padrão de comportamento para o ativo.',
    author:'ProfitFlow Labs', date:'Fev 2025', readTime:'7 min', featured:false,
  },
];

const MARKET_DATA = [
  { sym:'BTC',    price:'$91,240',  chg:'+2.14%', pos:true  },
  { sym:'ETH',    price:'$3,180',   chg:'+1.87%', pos:true  },
  { sym:'SOL',    price:'$178.40',  chg:'-0.53%', pos:false },
  { sym:'BNB',    price:'$598.20',  chg:'+0.91%', pos:true  },
  { sym:'ARB',    price:'$1.14',    chg:'+3.22%', pos:true  },
  { sym:'IBOV',   price:'128.540',  chg:'+0.34%', pos:true  },
  { sym:'S&P500', price:'5.254',    chg:'+0.12%', pos:true  },
  { sym:'USD/BRL',price:'R$5.02',   chg:'-0.18%', pos:false },
  { sym:'EUR/USD',price:'$1.0841',  chg:'+0.07%', pos:true  },
  { sym:'GOLD',   price:'$2.345',   chg:'+0.55%', pos:true  },
];

let homeFilter = 'todos';
let _firestorePosts = null; // cache

async function loadFirestorePosts() {
  if(_firestorePosts !== null) return _firestorePosts;
  try {
    const snap = await fbDb.collection('posts').where('published','==',true).get();
    _firestorePosts = snap.docs.map((d,i) => {
      const data = d.data();
      return {
        id: 'fs_'+d.id,
        tag: data.tag||'DeFi',
        tagClass: data.tagClass || 'news-tag-defi',
        emoji: data.emoji||'📄',
        title: data.title||'',
        summary: data.summary||'',
        content: data.content||'',
        author: data.author||'ProfitFlow Labs',
        date: data.date || (data.createdAt ? new Date(data.createdAt.seconds*1000).toLocaleDateString('pt-BR',{month:'short',year:'numeric'}) : ''),
        readTime: data.readTime||'5 min',
        featured: !!data.featured,
        _fsId: d.id,
      };
    });
  } catch(e) {
    console.warn('Firestore posts load error:', e);
    _firestorePosts = [];
  }
  return _firestorePosts;
}

async function renderHome() {
  const panel = document.getElementById('panel-home');
  if(!panel) return;

  // Load Firestore posts and merge (Firestore posts appear first if featured)
  const fsPosts = await loadFirestorePosts();
  const allArticles = [...fsPosts, ...NEWS_ARTICLES];

  const allTags = ['todos','DeFi','Cripto','Ações','Economia','Opções'];
  const filtered = homeFilter==='todos' ? allArticles : allArticles.filter(a=>a.tag===homeFilter);
  const featured = filtered.filter(a=>a.featured);
  const regular  = filtered.filter(a=>!a.featured);

  panel.innerHTML = `
  <!-- Market ticker strip -->
  <div class="market-ticker-strip" id="home-market-strip">
    ${MARKET_DATA.map(m=>`
    <div class="market-chip">
      <span class="sym">${m.sym}</span>
      <span class="price" style="color:var(--text2)">${m.price}</span>
      <span class="chg" style="color:${m.pos?'var(--green)':'var(--red)'}">${m.chg}</span>
    </div>`).join('')}
  </div>

  <!-- Hero header -->
  <div class="news-hero" style="margin-bottom:1rem">
    <div style="position:relative;z-index:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:.5rem">
        <span style="font-size:20px">📰</span>
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.5)">ProfitFlow Labs — Revista Financeira</span>
      </div>
      <h2 style="font-size:22px;font-weight:800;color:#fff;margin-bottom:.375rem">Fique por dentro do mercado</h2>
      <p style="font-size:13px;color:rgba(255,255,255,.55);max-width:520px">
        DeFi, cripto, ações, opções e macroeconomia — tudo que você precisa saber para tomar melhores decisões financeiras.
      </p>
    </div>
  </div>

  <!-- Category filters -->
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:1rem">
    ${allTags.map(tag=>`
    <button class="news-filter-btn${homeFilter===tag?' active':''}" onclick="setHomeFilter('${tag}')">
      ${tag==='todos'?'Todos os temas':tag}
    </button>`).join('')}
  </div>

  <!-- Featured articles -->
  ${featured.length>0?`
  <div class="sec-label" style="margin-bottom:.75rem">Destaques</div>
  <div class="grid2" style="margin-bottom:1.5rem">
    ${featured.map(a=>`
    <div class="featured-article" onclick="openArticle(${a.id})">
      <div style="font-size:28px;margin-bottom:.75rem">${a.emoji}</div>
      <span class="news-card-tag ${a.tagClass}">${a.tag}</span>
      <div style="font-size:16px;font-weight:700;color:var(--text);line-height:1.4;margin-bottom:.5rem">${a.title}</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.5;margin-bottom:.75rem">${a.summary}</div>
      <div class="news-card-meta">
        <span>${a.author}</span>
        <span>·</span>
        <span>${a.date}</span>
        <span>·</span>
        <span>⏱ ${a.readTime} de leitura</span>
      </div>
    </div>`).join('')}
  </div>`:''}

  <!-- Partner banner -->
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:1rem;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1rem 1.25rem">
    <div>
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text3);margin-bottom:4px">Parceiro</div>
      <div style="font-size:13px;font-weight:600;color:var(--text)">RoboForex — Trade without Limits</div>
      <div style="font-size:12px;color:var(--text2);margin-top:2px">Corretora global com spreads competitivos e execução ultrarrápida</div>
    </div>
    <a href="https://roboforex.com/?utm_source=domain&utm_medium=affbanerimg&utm_content=size250_250&utm_campaign=afftrade_without_limits&a=hcuz" target="_blank" rel="noopener noreferrer" class="hcuz" style="flex-shrink:0;display:block;border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);transition:transform .15s,box-shadow .15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,.3)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
      <img src="http://my.roboforex.com/files/banners/89_en_rbfx_250x250__f3e929cb40f89a0fae8567a1863cc4ab.jpg" style="display:block;width:140px;height:140px;object-fit:cover" alt="RoboForex">
    </a>
  </div>

  <!-- All articles grid -->
  ${regular.length>0?`
  <div class="sec-label" style="margin-bottom:.75rem">${featured.length>0?'Mais artigos':'Artigos'} (${regular.length})</div>
  <div class="news-grid">
    ${regular.map(a=>`
    <div class="news-card" onclick="openArticle(${a.id})">
      <div class="news-card-img">
        <div class="news-card-img-placeholder">${a.emoji}</div>
      </div>
      <div class="news-card-body">
        <span class="news-card-tag ${a.tagClass}">${a.tag}</span>
        <div class="news-card-title">${a.title}</div>
        <div class="news-card-meta">
          <span>${a.date}</span>
          <span>·</span>
          <span>⏱ ${a.readTime}</span>
        </div>
      </div>
    </div>`).join('')}
  </div>`:''}

  ${filtered.length===0?`<div class="card"><div class="empty" style="padding:2rem">
    <div style="font-size:32px;margin-bottom:.75rem;opacity:.3">📰</div>
    <div style="font-weight:600;margin-bottom:.5rem">Nenhum artigo nessa categoria</div>
  </div></div>`:''}

  <!-- Newsletter CTA -->
  <div class="card" style="background:linear-gradient(90deg,var(--blue-bg),var(--green-bg));border-color:rgba(57,255,138,.15);margin-top:1rem;text-align:center;padding:1.5rem">
    <div style="font-size:24px;margin-bottom:.5rem">✉️</div>
    <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:.375rem">Receba a newsletter semanal</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:1rem">Os melhores artigos de finanças direto no seu e-mail, toda sexta-feira.</div>
    <div style="display:flex;gap:8px;max-width:400px;margin:0 auto">
      <input id="newsletter-email" type="email" placeholder="seu@email.com" style="flex:1;height:38px;padding:0 12px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);outline:none">
      <button class="btn btn-primary" onclick="subscribeNewsletter()" style="white-space:nowrap">Assinar</button>
    </div>
  </div>

  ${renderFAQ()}
  `;
}

function setHomeFilter(tag) {
  homeFilter = tag;
  renderHome(); // async, no need to await here
}

function openArticle(id) {
  // Support both static (number) and Firestore (string 'fs_...') IDs
  const allArticles = [...(_firestorePosts||[]), ...NEWS_ARTICLES];
  const a = allArticles.find(x => String(x.id) === String(id));
  if(!a) return;
  const overlay = document.createElement('div');
  overlay.className='modal-overlay'; overlay.id='article-overlay';
  overlay.style.cssText='overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  const hasFullContent = a.content && a.content.trim().length > 0;
  overlay.innerHTML=`
  <div class="modal" style="max-width:680px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <span class="news-card-tag ${a.tagClass}" style="font-size:11px">${a.tag}</span>
      <button class="btn btn-sm" onclick="document.getElementById('article-overlay').remove()">✕ Fechar</button>
    </div>
    <div style="font-size:36px;margin-bottom:1rem;text-align:center">${a.emoji}</div>
    <h2 style="font-size:20px;font-weight:800;line-height:1.35;margin-bottom:.75rem">${a.title}</h2>
    <div class="news-card-meta" style="margin-bottom:1.25rem">
      <span style="font-weight:600">${a.author}</span> · <span>${a.date}</span> · <span>⏱ ${a.readTime} de leitura</span>
    </div>
    <div style="font-size:15px;color:var(--text2);line-height:1.7;margin-bottom:1.25rem">${a.summary}</div>
    <div style="font-size:14px;color:var(--text2);line-height:1.75">
      ${hasFullContent
        ? `<div style="font-size:14px;line-height:1.8;color:var(--text)">${a.content}</div>`
        : `<p style="margin-bottom:1rem">Este é um artigo da revista ProfitFlow Labs. Nosso conteúdo é produzido semanalmente por especialistas em mercados financeiros, DeFi e macroeconomia para ajudar você a tomar decisões mais informadas.</p>
           <p style="margin-bottom:1rem">A edição completa deste artigo estará disponível na versão premium da plataforma. Assine para ter acesso ilimitado a todos os artigos, análises aprofundadas e ferramentas exclusivas.</p>
           <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;margin-top:1rem">
             <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:.5rem">📌 Pontos-chave deste artigo</div>
             <ul style="padding-left:1.25rem;color:var(--text2);font-size:13px;line-height:1.7">
               <li>Análise baseada em dados on-chain e métricas de mercado atualizadas</li>
               <li>Impacto direto para investidores de DeFi, cripto e mercado tradicional</li>
               <li>Estratégias práticas para adaptar seu portfólio ao cenário atual</li>
             </ul>
           </div>`
      }
    </div>
    <div style="display:flex;gap:8px;margin-top:1.25rem">
      ${!hasFullContent?`<button class="btn btn-primary" onclick="switchTab('settings');setTimeout(()=>document.getElementById('billing-section')?.scrollIntoView({behavior:'smooth'}),150);document.getElementById('article-overlay')?.remove()">Assinar para ler completo</button>`:''}
      <button class="btn" onclick="document.getElementById('article-overlay').remove()">Fechar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function subscribeNewsletter() {
  const email = document.getElementById('newsletter-email')?.value?.trim();
  if(!email || !email.includes('@')) { showToast('Informe um e-mail válido.'); return; }
  showToast(`✓ ${email} inscrito na newsletter!`);
  if(document.getElementById('newsletter-email')) document.getElementById('newsletter-email').value='';
}

/* ══════════════════════════════════════════════════════
   MODULES SETTINGS SECTION
   ══════════════════════════════════════════════════════ */
function renderModulesSection() {
  const mods = modulesLoad();
  return `<div class="card settings-section" id="modules-section">
    <div class="settings-section-title">Módulos ativos</div>
    <p style="font-size:13px;color:var(--text2);margin-bottom:1rem">
      Ative ou desative módulos para personalizar sua experiência. Módulos desativados desaparecem do menu lateral.
      <span style="color:var(--text3)"> Módulos marcados como <strong>Core</strong> não podem ser desativados.</span>
    </p>
    ${ALL_MODULES.map(m=>`
    <div class="module-card${mods[m.id]!==false?' enabled':''}" id="module-card-${m.id}">
      <div class="module-card-icon" style="background:${mods[m.id]!==false?'var(--green-bg)':'var(--bg4)'}">
        ${m.icon}
      </div>
      <div class="module-card-info">
        <div class="module-card-name">
          ${m.label}
          ${m.core?`<span class="module-card-badge module-badge-core">Core</span>`:''}
        </div>
        <div class="module-card-desc">${m.desc}</div>
      </div>
      ${m.core
        ? `<label class="toggle"><input type="checkbox" checked disabled><span class="toggle-slider"></span></label>`
        : `<label class="toggle">
             <input type="checkbox" ${mods[m.id]!==false?'checked':''} onchange="toggleModule('${m.id}',this.checked)">
             <span class="toggle-slider"></span>
           </label>`
      }
    </div>`).join('')}
    <div style="margin-top:.75rem;font-size:12px;color:var(--text3)">
      💡 Dica: módulos desativados continuam salvando seus dados — você pode reativá-los a qualquer momento.
    </div>
  </div>`;
}

function toggleModule(id, enabled) {
  const mods = modulesLoad();
  mods[id] = enabled;
  modulesSave(mods);
  // Update card style immediately
  const card = document.getElementById('module-card-'+id);
  if(card) {
    card.classList.toggle('enabled', enabled);
    const icon = card.querySelector('.module-card-icon');
    if(icon) icon.style.background = enabled ? 'var(--green-bg)' : 'var(--bg4)';
  }
  // Rebuild sidebar nav without full re-render
  const nav = document.getElementById('sidebar-nav');
  if(nav) nav.innerHTML = buildSidebarNav();
  showToast(enabled ? `Módulo "${ALL_MODULES.find(m=>m.id===id)?.label}" ativado!` : `Módulo "${ALL_MODULES.find(m=>m.id===id)?.label}" desativado.`);
}

/* ══════════════════════════════════════════════════════════════
   DEPARTAMENTO PESSOAL — ProfitFlow Labs
   Módulos: Colaboradores · Folha de Pagamento · Contas a Pagar
   Storage keys: uid_dp_emp_ts · uid_dp_fp_YYYY_MM · uid_dp_cp_ts
   ══════════════════════════════════════════════════════════════ */
const DP_EMP  = () => session.user.uid + '_dp_emp_';
const DP_FP   = (ym) => session.user.uid + '_dp_fp_' + ym;
const DP_CP   = () => session.user.uid + '_dp_cp_';
function dpEmpLoad()    { return stKeys(DP_EMP()).map(k=>stGet(k)).filter(Boolean).sort((a,b)=>(a.nome||'').localeCompare(b.nome||'')); }
function dpFpLoad(ym)   { return stGet(DP_FP(ym)) || []; }
function dpFpSave(ym,d) { stSet(DP_FP(ym), d); }
function dpCpLoad()     { return stKeys(DP_CP()).map(k=>stGet(k)).filter(Boolean).sort((a,b)=>new Date(a.vencimento)-new Date(b.vencimento)); }

// ── Tabelas legais Brasil 2025 ─────────────────────────────────
function calcINSS(salBruto) {
  const faixas=[[1518,0.075],[2793.88,0.09],[4190.83,0.12],[8157.41,0.14]];
  let inss=0, base=salBruto, ant=0;
  for(const [teto,aliq] of faixas){
    if(base<=0) break;
    const faixa=Math.min(base, teto-ant);
    inss+=faixa*aliq; base-=faixa; ant=teto;
    if(salBruto<=teto) break;
  }
  return Math.round(inss*100)/100;
}
function calcIRRF(bruto, inss, dep) {
  const IRRF_TABLE=[[2259.20,0,0],[2826.65,0.075,169.44],[3751.05,0.15,381.44],[4664.68,0.225,662.77],[Infinity,0.275,896]];
  const base=bruto-inss-(dep*189.59);
  if(base<=2259.20) return 0;
  for(const [ate,aliq,ded] of IRRF_TABLE) if(base<=ate) return Math.max(0,Math.round((base*aliq-ded)*100)/100);
  return 0;
}
function calcFGTS(v){ return Math.round(v*0.08*100)/100; }

function calcFolhaColaborador(emp, lanc) {
  const salBase   = parseFloat(emp.salario||0);
  const diasUteis = parseInt(lanc.diasUteis||22);
  const diasTrab  = parseInt(lanc.diasTrabalhados||diasUteis);
  const faltas    = Math.max(0, diasUteis-diasTrab);
  const numDep    = parseInt(emp.dependentes||0);
  const hsE50     = parseFloat(lanc.hsExtra50||0);
  const hsE100    = parseFloat(lanc.hsExtra100||0);
  const vt        = parseFloat(lanc.valeTransporte||0);
  const vr        = parseFloat(lanc.valeRefeicao||0);
  const adiant    = parseFloat(lanc.adiantamento||0);
  const outDed    = parseFloat(lanc.outrasDeducoes||0);
  const outVerb   = parseFloat(lanc.outrasVerbas||0);
  const salHora   = salBase/220;
  const descFalta = faltas>0 ? (salBase/diasUteis)*faltas : 0;
  const extra50   = salHora*1.5*hsE50;
  const extra100  = salHora*2.0*hsE100;
  const salBruto  = Math.max(0, salBase-descFalta+extra50+extra100+outVerb);
  const inss      = calcINSS(salBruto);
  const irrf      = calcIRRF(salBruto, inss, numDep);
  const fgts      = calcFGTS(salBruto);
  const descVT    = Math.min(vt, salBase*0.06);
  const totDesc   = inss+irrf+descFalta+descVT+adiant+outDed;
  const salLiq    = Math.max(0, salBruto-totDesc);
  return { salBase,diasUteis,diasTrab,faltas,descFalta,extra50,extra100,outVerb,
           salBruto,inss,irrf,fgts,vt,descVT,vr,adiant,outDed,totDesc,salLiq };
}

let dpTab='colaboradores';
let dpFpYM=(()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); })();
let dpCpFilter='todos';

function renderDP() {
  const panel=document.getElementById('panel-dp');
  panel.innerHTML=`
  <div style="display:flex;gap:4px;margin-bottom:1.25rem;flex-wrap:wrap">
    ${[['colaboradores','👥','Colaboradores'],['folha','💵','Folha de Pagamento'],['contaspagar','📋','Contas a Pagar']].map(([id,ico,lbl])=>
      `<button onclick="dpSwitchTab('${id}')" id="dp-tab-${id}" class="btn${dpTab===id?' btn-primary':''}" style="font-size:13px;gap:6px;display:flex;align-items:center"><span>${ico}</span>${lbl}</button>`
    ).join('')}
  </div>
  <div id="dp-content"></div>`;
  dpRenderTab();
}
function dpSwitchTab(tab) {
  dpTab=tab;
  document.querySelectorAll('[id^="dp-tab-"]').forEach(b=>{
    const id=b.id.replace('dp-tab-','');
    b.className='btn'+(id===tab?' btn-primary':'');
    b.style.cssText='font-size:13px;gap:6px;display:flex;align-items:center';
  });
  dpRenderTab();
}
function dpRenderTab() {
  if(dpTab==='colaboradores') dpRenderColaboradores();
  else if(dpTab==='folha')    dpRenderFolha();
  else                        dpRenderContasPagar();
}

/* ─── COLABORADORES ──────────────────────────────────────────── */
function dpRenderColaboradores() {
  const emps=dpEmpLoad();
  const content=document.getElementById('dp-content');
  const totalSal=emps.reduce((s,e)=>s+parseFloat(e.salario||0),0);
  content.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:1rem">
    <div><h2>Cadastro de Colaboradores</h2><p class="sub">${emps.length} colaborador${emps.length!==1?'es':''} ativo${emps.length!==1?'s':''}</p></div>
    <button class="btn btn-primary" onclick="dpOpenEmpModal()">+ Novo colaborador</button>
  </div>
  ${emps.length===0?`<div class="card"><div class="empty">
    <div style="font-size:32px;margin-bottom:.75rem;opacity:.3">👥</div>
    <div style="font-weight:600;margin-bottom:.5rem">Nenhum colaborador cadastrado</div>
    <div style="margin-bottom:1rem">Cadastre colaboradores para gerar a folha de pagamento</div>
    <button class="btn btn-primary" onclick="dpOpenEmpModal()">+ Cadastrar colaborador</button>
  </div></div>`:`
  <div class="grid4" style="margin-bottom:1rem">
    <div class="ct-stat"><div class="lbl">Total</div><div class="val">${emps.length}</div></div>
    <div class="ct-stat"><div class="lbl">Folha bruta</div><div class="val pos">R$ ${totalSal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
    <div class="ct-stat"><div class="lbl">CLT</div><div class="val">${emps.filter(e=>e.regime==='CLT').length}</div></div>
    <div class="ct-stat"><div class="lbl">PJ/Outros</div><div class="val">${emps.filter(e=>e.regime!=='CLT').length}</div></div>
  </div>
  <div class="card" style="padding:0;overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:700px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        ${['Nome','Cargo','Regime','Salário','Admissão','Depto.','Dep.',''].map(h=>`<th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">${h}</th>`).join('')}
      </tr></thead>
      <tbody>${emps.map(e=>`
      <tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--bg4)'" onmouseout="this.style.background=''">
        <td style="padding:10px 12px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--blue-bg);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--blue-text);flex-shrink:0">${(e.nome||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
            <div><div style="font-weight:600;color:var(--text)">${e.nome}</div><div style="font-size:11px;color:var(--text3)">${e.cpf||''}</div></div>
          </div>
        </td>
        <td style="padding:10px 12px;color:var(--text2)">${e.cargo||'—'}</td>
        <td style="padding:10px 12px"><span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;background:${e.regime==='CLT'?'var(--green-bg)':'var(--blue-bg)'};color:${e.regime==='CLT'?'var(--green-text)':'var(--blue-text)'}">${e.regime||'CLT'}</span></td>
        <td style="padding:10px 12px;font-weight:600;color:var(--text)">R$ ${parseFloat(e.salario||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
        <td style="padding:10px 12px;font-size:12px;color:var(--text2)">${e.admissao?new Date(e.admissao+'T00:00').toLocaleDateString('pt-BR'):'—'}</td>
        <td style="padding:10px 12px;color:var(--text2)">${e.departamento||'—'}</td>
        <td style="padding:10px 12px;text-align:center">${e.dependentes||0}</td>
        <td style="padding:10px 12px"><div style="display:flex;gap:4px">
          <button class="btn btn-sm" onclick="dpOpenEmpModal('${e.key}')">✏</button>
          <button class="btn btn-sm btn-danger" onclick="dpDeleteEmp('${e.key}')">✕</button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`}`;
}

function dpOpenEmpModal(key) {
  const e=key?stGet(key):{};
  const overlay=document.createElement('div');
  overlay.className='modal-overlay'; overlay.id='dp-emp-overlay';
  overlay.style.cssText='overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  const regimes=['CLT','PJ','Estagiário','Autônomo','Temporário'];
  const deptos=['Administrativo','Comercial','Financeiro','TI','Operacional','RH','Jurídico','Marketing','Diretoria','Outro'];
  const bancos=['Itaú','Bradesco','Banco do Brasil','Santander','Caixa','Nubank','Inter','C6 Bank','Outro'];
  overlay.innerHTML=`
  <div class="modal" style="max-width:620px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div><h3 style="margin-bottom:2px">${key?'Editar':'Novo'} colaborador</h3>
      <p class="sub" style="margin-top:0">Dados pessoais, contratuais e benefícios</p></div>
      <button class="btn btn-sm" onclick="document.getElementById('dp-emp-overlay').remove()">✕</button>
    </div>
    <div class="sec-label">Dados pessoais</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field" style="grid-column:1/-1"><label>Nome completo *</label><input id="de-nome" value="${e.nome||''}"></div>
      <div class="field"><label>CPF</label><input id="de-cpf" value="${e.cpf||''}" placeholder="000.000.000-00"></div>
      <div class="field"><label>Data de nascimento</label><input type="date" id="de-nasc" value="${e.nascimento||''}"></div>
      <div class="field"><label>E-mail</label><input type="email" id="de-email" value="${e.email||''}"></div>
      <div class="field"><label>Telefone</label><input id="de-tel" value="${e.telefone||''}" placeholder="(11) 99999-9999"></div>
      <div class="field" style="grid-column:1/-1"><label>Endereço</label><input id="de-end" value="${e.endereco||''}" placeholder="Rua, número, bairro, cidade - UF"></div>
    </div>
    <div class="sec-label">Dados contratuais</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field"><label>Cargo *</label><input id="de-cargo" value="${e.cargo||''}"></div>
      <div class="field"><label>Departamento</label><select id="de-depto">${deptos.map(d=>`<option ${e.departamento===d?'selected':''}>${d}</option>`).join('')}</select></div>
      <div class="field"><label>Regime</label><select id="de-regime">${regimes.map(r=>`<option ${(e.regime||'CLT')===r?'selected':''}>${r}</option>`).join('')}</select></div>
      <div class="field"><label>Salário bruto (R$) *</label><div class="suf"><input type="number" id="de-sal" step="0.01" value="${e.salario||''}"><s>R$</s></div></div>
      <div class="field"><label>Data de admissão</label><input type="date" id="de-admissao" value="${e.admissao||''}"></div>
      <div class="field"><label>Dependentes (IRRF)</label><input type="number" id="de-dep" min="0" value="${e.dependentes||0}"></div>
      <div class="field"><label>PIS/PASEP</label><input id="de-pis" value="${e.pis||''}" placeholder="000.00000.00-0"></div>
      <div class="field"><label>CTPS</label><input id="de-ctps" value="${e.ctps||''}" placeholder="0000000/0000-0"></div>
      <div class="field"><label>Banco</label><select id="de-banco">${bancos.map(b=>`<option ${e.banco===b?'selected':''}>${b}</option>`).join('')}</select></div>
      <div class="field"><label>Agência / Conta</label><input id="de-conta" value="${e.conta||''}" placeholder="0000 / 00000-0"></div>
      <div class="field"><label>Tipo de conta</label><select id="de-tipoconta">${['Corrente','Poupança','Salário'].map(t=>`<option ${e.tipoConta===t?'selected':''}>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Chave PIX</label><input id="de-pix" value="${e.pix||''}" placeholder="CPF, e-mail ou telefone"></div>
    </div>
    <div class="sec-label">Benefícios mensais</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field"><label>Vale Transporte (R$)</label><div class="suf"><input type="number" id="de-vt" step="0.01" value="${e.valeTransporte||0}"><s>R$</s></div></div>
      <div class="field"><label>Vale Refeição (R$)</label><div class="suf"><input type="number" id="de-vr" step="0.01" value="${e.valeRefeicao||0}"><s>R$</s></div></div>
      <div class="field"><label>Plano de saúde (R$)</label><div class="suf"><input type="number" id="de-ps" step="0.01" value="${e.planoSaude||0}"><s>R$</s></div></div>
      <div class="field"><label>Outros benefícios (R$)</label><div class="suf"><input type="number" id="de-ob" step="0.01" value="${e.outrosBeneficios||0}"><s>R$</s></div></div>
    </div>
    <div class="field" style="margin-bottom:1rem"><label>Observações</label>
      <textarea id="de-obs" rows="2" style="width:100%;padding:8px 12px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);resize:vertical;font-family:inherit">${e.obs||''}</textarea>
    </div>
    <div id="de-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="dpSaveEmp('${key||''}')">Salvar colaborador</button>
      <button class="btn" onclick="document.getElementById('dp-emp-overlay').remove()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function dpSaveEmp(key) {
  const nome=document.getElementById('de-nome').value.trim();
  const sal=parseFloat(document.getElementById('de-sal').value)||0;
  if(!nome){document.getElementById('de-err').textContent='Nome é obrigatório.';document.getElementById('de-err').style.display='block';return;}
  if(!sal){document.getElementById('de-err').textContent='Informe o salário.';document.getElementById('de-err').style.display='block';return;}
  const ts=key?key.split('_').pop():Date.now();
  const k=key||DP_EMP()+ts;
  stSet(k,{key:k,ts:parseInt(ts),nome,cargo:document.getElementById('de-cargo').value.trim(),
    cpf:document.getElementById('de-cpf').value.trim(),nascimento:document.getElementById('de-nasc').value,
    email:document.getElementById('de-email').value.trim(),telefone:document.getElementById('de-tel').value.trim(),
    endereco:document.getElementById('de-end').value.trim(),
    departamento:document.getElementById('de-depto').value,regime:document.getElementById('de-regime').value,
    salario:sal,admissao:document.getElementById('de-admissao').value,
    dependentes:parseInt(document.getElementById('de-dep').value)||0,
    pis:document.getElementById('de-pis').value.trim(),ctps:document.getElementById('de-ctps').value.trim(),
    banco:document.getElementById('de-banco').value,conta:document.getElementById('de-conta').value.trim(),
    tipoConta:document.getElementById('de-tipoconta').value,pix:document.getElementById('de-pix').value.trim(),
    valeTransporte:parseFloat(document.getElementById('de-vt').value)||0,
    valeRefeicao:parseFloat(document.getElementById('de-vr').value)||0,
    planoSaude:parseFloat(document.getElementById('de-ps').value)||0,
    outrosBeneficios:parseFloat(document.getElementById('de-ob').value)||0,
    obs:document.getElementById('de-obs').value.trim()});
  document.getElementById('dp-emp-overlay').remove();
  showToast(key?'Colaborador atualizado!':'Colaborador cadastrado!');
  dpRenderColaboradores();
}
function dpDeleteEmp(key){if(!confirm('Excluir colaborador?'))return;stDel(key);showToast('Excluído.');dpRenderColaboradores();}

/* ─── FOLHA ──────────────────────────────────────────────────── */
function dpRenderFolha() {
  const emps=dpEmpLoad();
  const folha=dpFpLoad(dpFpYM);
  const content=document.getElementById('dp-content');
  let totB=0,totI=0,totR=0,totF=0,totL=0;
  folha.forEach(f=>{const emp=emps.find(e=>e.key===f.empKey);if(!emp)return;const c=calcFolhaColaborador(emp,f);totB+=c.salBruto;totI+=c.inss;totR+=c.irrf;totF+=c.fgts;totL+=c.salLiq;});
  const [yyyy,mm]=dpFpYM.split('-');
  const nomeMes=new Date(parseInt(yyyy),parseInt(mm)-1).toLocaleString('pt-BR',{month:'long',year:'numeric'});
  content.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:1rem">
    <div><h2>Folha de Pagamento</h2><p class="sub">${nomeMes.charAt(0).toUpperCase()+nomeMes.slice(1)}</p></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <input type="month" value="${dpFpYM}" onchange="dpFpYM=this.value;dpRenderFolha()" style="height:36px;padding:0 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);font-size:13px">
      <button class="btn btn-primary" onclick="dpOpenLancamentoModal()">+ Lançar colaborador</button>
      ${folha.length>0?`<button class="btn btn-sm" onclick="dpGerarTodosRecibos()">🖨 Gerar recibos</button>`:''}
    </div>
  </div>
  <div class="grid4" style="margin-bottom:1rem">
    <div class="ct-stat"><div class="lbl">Colaboradores</div><div class="val">${folha.length}</div></div>
    <div class="ct-stat"><div class="lbl">Total bruto</div><div class="val">R$ ${totB.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
    <div class="ct-stat"><div class="lbl">FGTS empresa</div><div class="val" style="color:var(--amber)">R$ ${totF.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
    <div class="ct-stat"><div class="lbl">Total líquido</div><div class="val pos">R$ ${totL.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
  </div>
  ${folha.length===0?`<div class="card"><div class="empty">
    <div style="font-size:32px;margin-bottom:.75rem;opacity:.3">💵</div>
    <div style="font-weight:600;margin-bottom:.5rem">Nenhum lançamento para ${nomeMes}</div>
    <button class="btn btn-primary" onclick="dpOpenLancamentoModal()">+ Lançar colaborador</button>
  </div></div>`:`
  <div class="card" style="padding:0;overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:900px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        ${['Colaborador','Sal.Base','Dias','H.Extra','Bruto','INSS','IRRF','Outras Ded.','Líquido','FGTS',''].map((h,i)=>`<th style="padding:8px 10px;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;${i===0?'text-align:left':'text-align:right'}">${h}</th>`).join('')}
      </tr></thead>
      <tbody>${folha.map(f=>{
        const emp=emps.find(e=>e.key===f.empKey);if(!emp)return'';
        const c=calcFolhaColaborador(emp,f);
        const nm=emp.nome.split(' ').slice(0,2).join(' ');
        const td=(v,clr='')=>`<td style="padding:8px 10px;text-align:right${clr?';color:'+clr:''}">${v}</td>`;
        const fmt=v=>'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2});
        return`<tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--bg4)'" onmouseout="this.style.background=''">
          <td style="padding:8px 10px"><div style="font-weight:600;color:var(--text)">${nm}</div><div style="font-size:10px;color:var(--text3)">${emp.cargo||''}</div></td>
          ${td(fmt(c.salBase))}
          <td style="padding:8px 10px;text-align:center;color:${c.faltas>0?'var(--amber)':'var(--text2)'}">${c.diasTrab}/${c.diasUteis}${c.faltas>0?' (−'+c.faltas+')':''}</td>
          ${td((c.extra50+c.extra100)>0?'+'+fmt(c.extra50+c.extra100):'—',(c.extra50+c.extra100)>0?'var(--green)':'var(--text3)')}
          ${td(fmt(c.salBruto),'var(--text)')}
          ${td('−'+fmt(c.inss),'var(--red)')}
          ${td('−'+fmt(c.irrf),'var(--red)')}
          ${td('−'+fmt(Math.max(0,c.totDesc-c.inss-c.irrf)),'var(--amber)')}
          ${td(fmt(c.salLiq),'var(--green)')}
          ${td(fmt(c.fgts),'var(--text3)')}
          <td style="padding:8px 10px"><div style="display:flex;gap:4px">
            <button class="btn btn-sm" onclick="dpOpenLancamentoModal('${f.empKey}')">✏</button>
            <button class="btn btn-sm" onclick="dpOpenRecibo('${f.empKey}')">📄</button>
            <button class="btn btn-sm btn-danger" onclick="dpDeleteLancamento('${f.empKey}')">✕</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
      <tfoot><tr style="border-top:2px solid var(--border);background:var(--bg)">
        <td colspan="4" style="padding:8px 10px;font-weight:700;color:var(--text)">TOTAIS</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700">R$ ${totB.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;color:var(--red)">−R$ ${totI.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;color:var(--red)">−R$ ${totR.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;color:var(--amber)">—</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;color:var(--green)">R$ ${totL.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;color:var(--text3)">R$ ${totF.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
        <td></td>
      </tr></tfoot>
    </table>
  </div>`}`;
}

function dpOpenLancamentoModal(empKey) {
  const emps=dpEmpLoad();
  if(emps.length===0){showToast('Cadastre colaboradores primeiro.');return;}
  const folha=dpFpLoad(dpFpYM);
  const existing=empKey?folha.find(f=>f.empKey===empKey):{};
  const overlay=document.createElement('div');
  overlay.className='modal-overlay'; overlay.id='dp-lanc-overlay';
  overlay.style.cssText='overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  const [yyyy,mm]=dpFpYM.split('-');
  const nomeMes=new Date(parseInt(yyyy),parseInt(mm)-1).toLocaleString('pt-BR',{month:'long',year:'numeric'});
  const v=(id,def='')=>`value="${(existing&&existing[id]!==undefined)?existing[id]:def}"`;
  overlay.innerHTML=`
  <div class="modal" style="max-width:540px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div><h3 style="margin-bottom:2px">Lançamento de folha</h3>
      <p class="sub" style="margin-top:0">${nomeMes.charAt(0).toUpperCase()+nomeMes.slice(1)}</p></div>
      <button class="btn btn-sm" onclick="document.getElementById('dp-lanc-overlay').remove()">✕</button>
    </div>
    <div class="field" style="margin-bottom:1rem">
      <label>Colaborador *</label>
      <select id="dl-emp" onchange="dpLancAutoFill()" ${empKey?'disabled':''}>
        ${emps.map(e=>`<option value="${e.key}" ${(empKey===e.key||existing?.empKey===e.key)?'selected':''}>${e.nome} — ${e.cargo||''}</option>`).join('')}
      </select>
    </div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field"><label>Dias úteis no mês</label><input type="number" id="dl-duteis" ${v('diasUteis',22)} min="1" max="31"></div>
      <div class="field"><label>Dias trabalhados</label><input type="number" id="dl-dtrab" ${v('diasTrabalhados',22)} min="0" max="31" oninput="dpLancPreview()"></div>
      <div class="field"><label>Horas extras 50%</label><div class="suf"><input type="number" id="dl-he50" ${v('hsExtra50',0)} step="0.5" min="0" oninput="dpLancPreview()"><s>h</s></div></div>
      <div class="field"><label>Horas extras 100%</label><div class="suf"><input type="number" id="dl-he100" ${v('hsExtra100',0)} step="0.5" min="0" oninput="dpLancPreview()"><s>h</s></div></div>
      <div class="field"><label>Vale Transporte (R$)</label><div class="suf"><input type="number" id="dl-vt" ${v('valeTransporte',0)} step="0.01" oninput="dpLancPreview()"><s>R$</s></div></div>
      <div class="field"><label>Vale Refeição (R$)</label><div class="suf"><input type="number" id="dl-vr" ${v('valeRefeicao',0)} step="0.01"><s>R$</s></div></div>
      <div class="field"><label>Adiantamento (R$)</label><div class="suf"><input type="number" id="dl-adiant" ${v('adiantamento',0)} step="0.01" oninput="dpLancPreview()"><s>R$</s></div></div>
      <div class="field"><label>Outras deduções (R$)</label><div class="suf"><input type="number" id="dl-deducoes" ${v('outrasDeducoes',0)} step="0.01" oninput="dpLancPreview()"><s>R$</s></div></div>
      <div class="field"><label>Outras verbas (R$)</label><div class="suf"><input type="number" id="dl-verbas" ${v('outrasVerbas',0)} step="0.01" oninput="dpLancPreview()"><s>R$</s></div></div>
      <div class="field"><label>Observação</label><input id="dl-obs" ${v('obs','')} placeholder="ex: 13º, férias..."></div>
    </div>
    <div id="dl-preview" style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.875rem 1rem;margin-bottom:1rem">
      <div class="sec-label" style="margin-bottom:.5rem">Prévia do cálculo</div>
      <div id="dl-preview-body" style="font-size:12px;color:var(--text2)">Aguardando...</div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="dpSaveLancamento()">Salvar lançamento</button>
      <button class="btn" onclick="document.getElementById('dp-lanc-overlay').remove()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  dpLancAutoFill();
}

function dpLancAutoFill() {
  const empKey=document.getElementById('dl-emp')?.value;
  const emp=dpEmpLoad().find(e=>e.key===empKey);
  if(!emp) return;
  const vt=document.getElementById('dl-vt');const vr=document.getElementById('dl-vr');
  if(vt&&!parseFloat(vt.value)) vt.value=emp.valeTransporte||0;
  if(vr&&!parseFloat(vr.value)) vr.value=emp.valeRefeicao||0;
  dpLancPreview();
}

function dpLancPreview() {
  const empKey=document.getElementById('dl-emp')?.value;
  const emp=dpEmpLoad().find(e=>e.key===empKey);
  const body=document.getElementById('dl-preview-body');
  if(!emp||!body) return;
  const lanc={diasUteis:parseInt(document.getElementById('dl-duteis')?.value)||22,diasTrabalhados:parseInt(document.getElementById('dl-dtrab')?.value)||22,
    hsExtra50:parseFloat(document.getElementById('dl-he50')?.value)||0,hsExtra100:parseFloat(document.getElementById('dl-he100')?.value)||0,
    valeTransporte:parseFloat(document.getElementById('dl-vt')?.value)||0,adiantamento:parseFloat(document.getElementById('dl-adiant')?.value)||0,
    outrasDeducoes:parseFloat(document.getElementById('dl-deducoes')?.value)||0,outrasVerbas:parseFloat(document.getElementById('dl-verbas')?.value)||0};
  const c=calcFolhaColaborador(emp,lanc);
  const fmt=v=>'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2});
  const rows=[
    ['Salário base',fmt(c.salBase),''],
    ...(c.descFalta>0?[['(-) Faltas ('+c.faltas+' dias)','−'+fmt(c.descFalta),'var(--red)']]:[]),
    ...((c.extra50+c.extra100)>0?[['(+) Horas extras','+'+fmt(c.extra50+c.extra100),'var(--green)']]:[]),
    ['= Salário bruto',fmt(c.salBruto),'var(--text)'],
    ['(-) INSS','−'+fmt(c.inss),'var(--red)'],
    ['(-) IRRF','−'+fmt(c.irrf),'var(--red)'],
    ...(c.descVT>0?[['(-) Desc. VT','−'+fmt(c.descVT),'var(--amber)']]:[]),
    ...(c.adiant>0?[['(-) Adiantamento','−'+fmt(c.adiant),'var(--amber)']]:[]),
    ['= SALÁRIO LÍQUIDO',fmt(c.salLiq),'var(--green)'],
    ['FGTS (empresa)',fmt(c.fgts),'var(--text3)'],
  ];
  body.innerHTML=rows.map(([l,v,cl])=>`<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text2)">${l}</span><span style="font-weight:600;color:${cl||'var(--text)'}">${v}</span></div>`).join('');
}

function dpSaveLancamento() {
  const empKey=document.getElementById('dl-emp')?.value;
  if(!empKey){showToast('Selecione um colaborador.');return;}
  const folha=dpFpLoad(dpFpYM).filter(f=>f.empKey!==empKey);
  folha.push({empKey,ts:Date.now(),
    diasUteis:parseInt(document.getElementById('dl-duteis').value)||22,
    diasTrabalhados:parseInt(document.getElementById('dl-dtrab').value)||22,
    hsExtra50:parseFloat(document.getElementById('dl-he50').value)||0,
    hsExtra100:parseFloat(document.getElementById('dl-he100').value)||0,
    valeTransporte:parseFloat(document.getElementById('dl-vt').value)||0,
    valeRefeicao:parseFloat(document.getElementById('dl-vr').value)||0,
    adiantamento:parseFloat(document.getElementById('dl-adiant').value)||0,
    outrasDeducoes:parseFloat(document.getElementById('dl-deducoes').value)||0,
    outrasVerbas:parseFloat(document.getElementById('dl-verbas').value)||0,
    obs:document.getElementById('dl-obs').value.trim()});
  dpFpSave(dpFpYM,folha);
  document.getElementById('dp-lanc-overlay').remove();
  showToast('Lançamento salvo!');
  dpRenderFolha();
}
function dpDeleteLancamento(empKey){if(!confirm('Remover este lançamento?'))return;dpFpSave(dpFpYM,dpFpLoad(dpFpYM).filter(f=>f.empKey!==empKey));dpRenderFolha();}

function dpOpenRecibo(empKey) {
  const emp=dpEmpLoad().find(e=>e.key===empKey);
  const lanc=dpFpLoad(dpFpYM).find(f=>f.empKey===empKey);
  if(!emp||!lanc){showToast('Dados não encontrados.');return;}
  const c=calcFolhaColaborador(emp,lanc);
  const [yyyy,mm]=dpFpYM.split('-');
  const nomeMes=new Date(parseInt(yyyy),parseInt(mm)-1).toLocaleString('pt-BR',{month:'long',year:'numeric'});
  const fmt=v=>'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2});
  const w=window.open('','_blank','width=720,height=900');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Recibo — ${emp.nome}</title>
  <style>body{font-family:Arial,sans-serif;font-size:12px;max-width:680px;margin:20px auto;padding:20px}
  h2{text-align:center;font-size:15px;margin-bottom:4px}.sub{text-align:center;font-size:12px;color:#555;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  th{background:#f0f0f0;padding:5px 8px;border:1px solid #ccc;font-size:11px;text-align:left}
  td{padding:5px 8px;border:1px solid #ccc}
  .right{text-align:right}.bold{font-weight:bold}.green{background:#e8f5e9}.dashed{border-top:1px dashed #999;margin:16px 0}
  @media print{button{display:none}}

</style></head><body>
  <h2>RECIBO DE PAGAMENTO DE SALÁRIO</h2>
  <div class="sub">${nomeMes.charAt(0).toUpperCase()+nomeMes.slice(1)}</div>
  <table><tr><th colspan="2">DADOS DO COLABORADOR</th></tr>
    <tr><td>Nome</td><td>${emp.nome}</td></tr>
    <tr><td>CPF</td><td>${emp.cpf||'—'}</td></tr>
    <tr><td>Cargo / Departamento</td><td>${emp.cargo||'—'} / ${emp.departamento||'—'}</td></tr>
    <tr><td>Regime</td><td>${emp.regime||'CLT'}</td></tr>
    <tr><td>Admissão</td><td>${emp.admissao?new Date(emp.admissao+'T00:00').toLocaleDateString('pt-BR'):'—'}</td></tr>
    <tr><td>PIS/PASEP</td><td>${emp.pis||'—'}</td></tr>
  </table>
  <table><tr><th>VENCIMENTOS</th><th class="right">VALOR (R$)</th><th>DESCONTOS</th><th class="right">VALOR (R$)</th></tr>
    <tr><td>Salário Base (${c.diasTrab}/${c.diasUteis} dias)</td><td class="right">${fmt(Math.max(0,c.salBase-c.descFalta))}</td><td>INSS</td><td class="right">${fmt(c.inss)}</td></tr>
    <tr><td>${(c.extra50+c.extra100)>0?'Horas extras: '+fmt(c.extra50+c.extra100):'—'}</td><td class="right">${(c.extra50+c.extra100)>0?fmt(c.extra50+c.extra100):'—'}</td><td>IRRF</td><td class="right">${fmt(c.irrf)}</td></tr>
    ${c.descVT>0?`<tr><td>—</td><td></td><td>Desc. Vale Transporte</td><td class="right">${fmt(c.descVT)}</td></tr>`:''}
    ${c.adiant>0?`<tr><td>—</td><td></td><td>Adiantamento</td><td class="right">${fmt(c.adiant)}</td></tr>`:''}
    <tr class="bold"><td>TOTAL VENCIMENTOS</td><td class="right">${fmt(c.salBruto)}</td><td>TOTAL DESCONTOS</td><td class="right">${fmt(c.totDesc)}</td></tr>
    <tr class="green bold"><td colspan="3">SALÁRIO LÍQUIDO A RECEBER</td><td class="right">${fmt(c.salLiq)}</td></tr>
  </table>
  <table><tr><th>Base FGTS</th><td>${fmt(c.salBruto)}</td><th>FGTS (8%)</th><td>${fmt(c.fgts)}</td></tr></table>
  ${lanc.valeRefeicao>0?`<p style="font-size:11px">Vale Refeição creditado: ${fmt(parseFloat(lanc.valeRefeicao))}</p>`:''}
  ${emp.pix?`<p style="font-size:11px">PIX: ${emp.pix} | Banco: ${emp.banco||'—'} | Conta: ${emp.conta||'—'}</p>`:''}
  <div class="dashed"></div>
  <table><tr>
    <td style="width:48%;text-align:center;padding-top:40px;border-top:1px solid #000">Assinatura do Colaborador<br><br>${emp.nome}</td>
    <td style="width:4%"></td>
    <td style="width:48%;text-align:center;padding-top:40px;border-top:1px solid #000">Assinatura do Empregador</td>
  </tr></table>
  <p style="text-align:center;font-size:10px;margin-top:12px">Declaro ter recebido o valor acima referente ao salário de ${nomeMes}.</p>
  <div style="text-align:center;margin-top:12px"><button onclick="window.print()" style="padding:8px 24px;cursor:pointer;font-size:14px">🖨 Imprimir Recibo</button></div>
  `);
  w.document.close();
}
function dpGerarTodosRecibos(){dpFpLoad(dpFpYM).forEach(f=>dpOpenRecibo(f.empKey));}

/* ─── CONTAS A PAGAR ─────────────────────────────────────────── */
function dpRenderContasPagar() {
  const all=dpCpLoad();
  const hoje=new Date().toISOString().split('T')[0];
  const hoje7=new Date();hoje7.setDate(hoje7.getDate()+7);
  const vencidas=all.filter(c=>c.status!=='pago'&&c.vencimento<hoje);
  const proximas=all.filter(c=>c.status!=='pago'&&c.vencimento>=hoje&&new Date(c.vencimento)<=hoje7);
  const filtered=dpCpFilter==='todos'?all:dpCpFilter==='vencidas'?vencidas:dpCpFilter==='proximas'?proximas:all.filter(c=>c.status===dpCpFilter);
  const totPend=all.filter(c=>c.status!=='pago').reduce((s,c)=>s+parseFloat(c.valor||0),0);
  const totPago=all.filter(c=>c.status==='pago').reduce((s,c)=>s+parseFloat(c.valor||0),0);
  const content=document.getElementById('dp-content');
  content.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:1rem">
    <div><h2>Contas a Pagar</h2><p class="sub">${all.length} lançamento${all.length!==1?'s':''} · ${vencidas.length} vencida${vencidas.length!==1?'s':''}</p></div>
    <button class="btn btn-primary" onclick="dpOpenCpModal()">+ Nova conta</button>
  </div>
  <div class="grid4" style="margin-bottom:1rem">
    <div class="ct-stat" style="${vencidas.length>0?'border-color:var(--red)':''}"><div class="lbl">Vencidas</div><div class="val neg">${vencidas.length}</div></div>
    <div class="ct-stat"><div class="lbl">A vencer em 7 dias</div><div class="val" style="color:var(--amber)">${proximas.length}</div></div>
    <div class="ct-stat"><div class="lbl">Total pendente</div><div class="val neg">R$ ${totPend.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
    <div class="ct-stat"><div class="lbl">Total pago</div><div class="val pos">R$ ${totPago.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:1rem">
    ${[['todos','Todos'],['pendente','Pendente'],['pago','Pago'],['vencidas','Vencidas ⚠'],['proximas','Próximas 7 dias']].map(([f,l])=>`<button class="tag-btn${dpCpFilter===f?' active':''}" onclick="dpCpFilter='${f}';dpRenderContasPagar()">${l}</button>`).join('')}
  </div>
  ${filtered.length===0?`<div class="card"><div class="empty">
    <div style="font-size:32px;margin-bottom:.75rem;opacity:.3">📋</div>
    <div style="font-weight:600;margin-bottom:.5rem">Nenhuma conta encontrada</div>
    <button class="btn btn-primary" onclick="dpOpenCpModal()">+ Adicionar conta</button>
  </div></div>`:`
  <div class="card" style="padding:0;overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:700px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        ${['Descrição','Categoria','Valor','Vencimento','Status','Fornecedor','Forma Pgto',''].map(h=>`<th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">${h}</th>`).join('')}
      </tr></thead>
      <tbody>${filtered.map(c=>{
        const isVenc=c.status!=='pago'&&c.vencimento<hoje;
        const isProx=!isVenc&&c.status!=='pago'&&new Date(c.vencimento)<=hoje7;
        const sc=c.status==='pago'?'var(--green)':isVenc?'var(--red)':isProx?'var(--amber)':'var(--text2)';
        const sl=c.status==='pago'?'Pago':isVenc?'Vencida':isProx?'Vence em breve':'Pendente';
        const sbg=c.status==='pago'?'var(--green-bg)':isVenc?'var(--red-bg)':'var(--amber-bg)';
        return`<tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--bg4)'" onmouseout="this.style.background=''">
          <td style="padding:10px 12px"><div style="font-weight:600;color:var(--text)">${c.descricao}</div>${c.obs?`<div style="font-size:11px;color:var(--text3)">${c.obs}</div>`:''}</td>
          <td style="padding:10px 12px"><span class="badge bb" style="font-size:11px">${c.categoria||'—'}</span></td>
          <td style="padding:10px 12px;font-weight:700;color:var(--text)">R$ ${parseFloat(c.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
          <td style="padding:10px 12px;font-size:12px;color:${isVenc?'var(--red)':isProx?'var(--amber)':'var(--text2)'}">
            ${new Date(c.vencimento+'T00:00').toLocaleDateString('pt-BR')}</td>
          <td style="padding:10px 12px"><span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;background:${sbg};color:${sc}">${sl}</span></td>
          <td style="padding:10px 12px;color:var(--text2);font-size:12px">${c.fornecedor||'—'}</td>
          <td style="padding:10px 12px;font-size:12px;color:var(--text2)">${c.formaPgto||'—'}</td>
          <td style="padding:10px 12px"><div style="display:flex;gap:4px">
            ${c.status!=='pago'?`<button class="btn btn-sm" style="color:var(--green);border-color:var(--green)" onclick="dpMarcarPago('${c.key}')">✓</button>`:''}
            <button class="btn btn-sm" onclick="dpOpenCpModal('${c.key}')">✏</button>
            <button class="btn btn-sm btn-danger" onclick="dpDeleteCp('${c.key}')">✕</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>`}`;
  
  // Adicionar dicas de uso
  const tipsDiv = document.createElement('div');
  tipsDiv.innerHTML = `
    <div class="card" style="background: var(--amber-bg); border-color: var(--amber); margin-top: 2rem;">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 20px; flex-shrink: 0;">💡</span>
        <div>
          <h3 style="color: var(--amber-text); margin-bottom: 8px;">Dicas de Uso - Departamento Pessoal</h3>
          <ul style="list-style: none; padding: 0; margin: 0; color: var(--text2); font-size: 13px; line-height: 1.6;">
            <li>👥 <strong>Colaboradores:</strong> Registre dados completos (nome, CPF, salário, data de admissão) de seus funcionários.</li>
            <li>💵 <strong>Folha de Pagamento:</strong> Gere folhas mensais automaticamente com cálculos de INSS, IRRF, FGTS e benefícios.</li>
            <li>📋 <strong>Contas a Pagar:</strong> Controle vencimentos de impostos (FGTS, INSS, IRRF) e outras obrigações.</li>
            <li>⚠️ <strong>Alertas:</strong> Identifique contas vencidas e próximas de vencer para evitar multas.</li>
            <li>📊 <strong>Relatórios:</strong> Acompanhe folha bruta, descontos e saldo líquido mensal.</li>
          </ul>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => {
    const content = document.getElementById('dp-content');
    if(content) content.appendChild(tipsDiv);
  }, 50);
}

function dpOpenCpModal(key) {
  const c=key?stGet(key):{};
  const cats=['FGTS','INSS/GPS','IRRF/DARF','Rescisão','13º Salário','Férias','Folha de Pagamento','Vale Transporte','Vale Refeição','Plano de Saúde','Fornecedor','Aluguel','Energia','Internet','Telefone','Software/SaaS','Contabilidade','Cartório','Seguros','Outros'];
  const overlay=document.createElement('div');
  overlay.className='modal-overlay'; overlay.id='dp-cp-overlay';
  overlay.innerHTML=`
  <div class="modal" style="max-width:480px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <h3>${key?'Editar':'Nova'} conta a pagar</h3>
      <button class="btn btn-sm" onclick="document.getElementById('dp-cp-overlay').remove()">✕</button>
    </div>
    <div class="field" style="margin-bottom:12px"><label>Descrição *</label>
      <input id="dc-desc" value="${c.descricao||''}" placeholder="ex: Guia FGTS Maio, Rescisão..."></div>
    <div class="grid2" style="margin-bottom:12px">
      <div class="field"><label>Valor (R$) *</label><div class="suf"><input type="number" id="dc-valor" step="0.01" value="${c.valor||''}"><s>R$</s></div></div>
      <div class="field"><label>Vencimento *</label><input type="date" id="dc-venc" value="${c.vencimento||new Date().toISOString().split('T')[0]}"></div>
      <div class="field"><label>Categoria</label><select id="dc-cat">${cats.map(ct=>`<option ${c.categoria===ct?'selected':''}>${ct}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label><select id="dc-status">
        <option value="pendente" ${(c.status||'pendente')==='pendente'?'selected':''}>Pendente</option>
        <option value="pago" ${c.status==='pago'?'selected':''}>Pago</option>
        <option value="cancelado" ${c.status==='cancelado'?'selected':''}>Cancelado</option>
      </select></div>
      <div class="field"><label>Fornecedor / Credor</label><input id="dc-forn" value="${c.fornecedor||''}" placeholder="ex: Receita Federal"></div>
      <div class="field"><label>Centro de custo</label><select id="dc-cc">
        ${['Geral','RH','Financeiro','Operacional','TI','Comercial','Jurídico'].map(cc=>`<option ${c.centroCusto===cc?'selected':''}>${cc}</option>`).join('')}
      </select></div>
      <div class="field"><label>Forma de pagamento</label><select id="dc-forma">
        ${['PIX','Boleto','TED/DOC','Débito automático','Cartão','Dinheiro','Cheque'].map(f=>`<option ${c.formaPgto===f?'selected':''}>${f}</option>`).join('')}
      </select></div>
    </div>
    <div class="field" style="margin-bottom:1rem"><label>Observações</label>
      <textarea id="dc-obs" rows="2" style="width:100%;padding:8px 12px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);resize:vertical;font-family:inherit">${c.obs||''}</textarea>
    </div>
    <div id="dc-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="dpSaveCp('${key||''}')">Salvar</button>
      <button class="btn" onclick="document.getElementById('dp-cp-overlay').remove()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function dpSaveCp(key) {
  const desc=document.getElementById('dc-desc').value.trim();
  const valor=parseFloat(document.getElementById('dc-valor').value)||0;
  const venc=document.getElementById('dc-venc').value;
  const errEl=document.getElementById('dc-err');
  if(!desc){errEl.textContent='Informe a descrição.';errEl.style.display='block';return;}
  if(!valor){errEl.textContent='Informe o valor.';errEl.style.display='block';return;}
  if(!venc){errEl.textContent='Informe o vencimento.';errEl.style.display='block';return;}
  const ts=key?key.split('_').pop():Date.now();
  const k=key||DP_CP()+ts;
  stSet(k,{key:k,ts:parseInt(ts),descricao:desc,valor,vencimento:venc,
    categoria:document.getElementById('dc-cat').value,status:document.getElementById('dc-status').value,
    fornecedor:document.getElementById('dc-forn').value.trim(),centroCusto:document.getElementById('dc-cc').value,
    formaPgto:document.getElementById('dc-forma').value,obs:document.getElementById('dc-obs').value.trim()});
  document.getElementById('dp-cp-overlay').remove();
  showToast(key?'Conta atualizada!':'Conta adicionada!');
  dpRenderContasPagar();
}
function dpMarcarPago(key){const c=stGet(key);if(!c)return;c.status='pago';c.dataPagamento=new Date().toISOString().split('T')[0];stSet(key,c);showToast('Marcado como pago!');dpRenderContasPagar();}
function dpDeleteCp(key){if(!confirm('Excluir esta conta?'))return;stDel(key);dpRenderContasPagar();}


/* ══════════════════════════════════════════════════════════════
   人事部 — DEPARTAMENTO PESSOAL JAPÃO (ProfitFlow Labs)
   Módulo para empresas de HAKEN (派遣 — terceirização de mão de obra)
   Legislação: 労働基準法・健康保険法・厚生年金保険法・雇用保険法 (2024/2025)
   Módulos: 社員登録 Colaboradores · 給与計算 Folha · 支払管理 Contas a Pagar
   Storage: uid_jphr_emp_ts · uid_jphr_fp_YYYY_MM · uid_jphr_cp_ts
   ══════════════════════════════════════════════════════════════ */

// ── Storage helpers ────────────────────────────────────────────
const JP_EMP  = () => session.user.uid + '_jphr_emp_';
const JP_FP   = (ym) => session.user.uid + '_jphr_fp_' + ym;
const JP_CP   = () => session.user.uid + '_jphr_cp_';
function jpEmpLoad()    { return stKeys(JP_EMP()).map(k=>stGet(k)).filter(Boolean).sort((a,b)=>(a.fullNameKana||a.fullName||'').localeCompare(b.fullNameKana||b.fullName||'')); }
function jpFpLoad(ym)   { return stGet(JP_FP(ym)) || []; }
function jpFpSave(ym,d) { stSet(JP_FP(ym), d); }
function jpCpLoad()     { return stKeys(JP_CP()).map(k=>stGet(k)).filter(Boolean).sort((a,b)=>new Date(a.vencimento)-new Date(b.vencimento)); }

/* ══ TABELAS LEGAIS JAPÃO 2024/2025 ═══════════════════════════
   健康保険: 協会けんぽ (taxa média nacional — varia por prefeitura)
   厚生年金: alíquota fixa
   雇用保険: alíquota geral
   所得税: tabela de retenção mensal (月額甲欄)
   住民税: deduzido pelo empregador (10% aprox. renda anterior)
   ══════════════════════════════════════════════════════════════ */

// 健康保険率 (Kenko Hoken) por prefeitura — 2024 協会けんぽ
const KENKO_RATES = {
  '北海道': 0.1009, '青森': 0.0965, '岩手': 0.0965, '宮城': 0.1001, '秋田': 0.1011,
  '山形': 0.0997, '福島': 0.0965, '茨城': 0.0979, '栃木': 0.0981, '群馬': 0.0979,
  '埼玉': 0.0979, '千葉': 0.0979, '東京': 0.0998, '神奈川': 0.1002, '新潟': 0.0985,
  '富山': 0.1009, '石川': 0.1021, '福井': 0.1019, '山梨': 0.0997, '長野': 0.0961,
  '岐阜': 0.1004, '静岡': 0.0983, '愛知': 0.0999, '三重': 0.0992, '滋賀': 0.0976,
  '京都': 0.1013, '大阪': 0.1029, '兵庫': 0.1021, '奈良': 0.0986, '和歌山': 0.1007,
  '鳥取': 0.0971, '島根': 0.0978, '岡山': 0.0994, '広島': 0.0988, '山口': 0.1008,
  '徳島': 0.1021, '香川': 0.1009, '愛媛': 0.1009, '高知': 0.1029, '福岡': 0.1028,
  '佐賀': 0.1049, '長崎': 0.1012, '熊本': 0.1013, '大分': 0.1010, '宮崎': 0.0993,
  '鹿児島': 0.1002, '沖縄': 0.0973, '全国平均': 0.0998
};
// 厚生年金 (Kosei Nenkin) — 固定 18.3% (折半: 9.15% 労使各)
const KOSEI_NENKIN_RATE_TOTAL = 0.183;
const KOSEI_NENKIN_EMP_RATE   = KOSEI_NENKIN_RATE_TOTAL / 2; // 9.15%
const KOSEI_NENKIN_MAX_HOSO   = 650000; // 標準報酬月額上限
const KOSEI_NENKIN_MIN_HOSO   = 88000;  // 標準報酬月額下限

// 雇用保険 (Koyo Hoken) 2024 — 一般事業
const KOYO_EMP_RATE = 0.006; // 労働者負担 0.6%
const KOYO_EMP_RATE_HAKEN = 0.006; // 派遣労働者も同率

// 標準報酬月額 (Hyojun Hoshu Getsugaku) table — simplified
// 等級 → [以上, 未満, 標準報酬月額]
const HYOJUN_TABLE = [
  [0,63000,58000],[63000,73000,68000],[73000,83000,78000],[83000,93000,88000],
  [93000,101000,98000],[101000,107000,104000],[107000,114000,110000],[114000,122000,118000],
  [122000,130000,126000],[130000,138000,134000],[138000,146000,142000],[146000,155000,150000],
  [155000,165000,160000],[165000,175000,170000],[175000,185000,180000],[185000,195000,190000],
  [195000,210000,200000],[210000,230000,220000],[230000,250000,240000],[250000,270000,260000],
  [270000,290000,280000],[290000,310000,300000],[310000,330000,320000],[330000,350000,340000],
  [350000,370000,360000],[370000,395000,380000],[395000,425000,410000],[425000,455000,440000],
  [455000,485000,470000],[485000,515000,500000],[515000,545000,530000],[545000,575000,560000],
  [575000,605000,590000],[605000,635000,620000],[635000,Infinity,650000]
];

function getHyojunHoshu(salary) {
  for(const [min,max,std] of HYOJUN_TABLE) {
    if(salary >= min && salary < max) return std;
  }
  return 650000;
}

// 所得税 源泉徴収税額表 月額甲欄 (2024) — simplified progressive
// [基準額以上, 基準額未満, 税率, 控除額]
const SHOTOKU_TABLE_A = [
  // 扶養0人の場合の概略テーブル (円)
  [0,88000,0,0],[88000,89000,130,0],[89000,92000,180,0],[92000,95000,290,0],
  [95000,98000,400,0],[98000,101000,520,0],[101000,105000,680,0],[105000,109000,870,0],
  [109000,113000,1060,0],[113000,117000,1250,0],[117000,121000,1440,0],
  [121000,125000,1630,0],[125000,129000,1820,0],[129000,133000,2010,0],
  [133000,141000,2210,0],[141000,149000,2560,0],[149000,157000,2920,0],
  [157000,165000,3280,0],[165000,173000,3640,0],[173000,181000,4000,0],
  [181000,189000,4360,0],[189000,197000,4720,0],[197000,205000,5080,0],
  [205000,213000,5540,0],[213000,221000,6120,0],[221000,229000,6720,0],
  [229000,237000,7320,0],[237000,245000,7920,0],[245000,253000,8520,0],
  [253000,261000,9120,0],[261000,269000,9720,0],[269000,277000,10320,0],
  [277000,285000,10920,0],[285000,293000,11520,0],[293000,301000,12120,0],
  [301000,309000,12720,0],[309000,317000,13320,0],[317000,325000,13920,0],
  [325000,333000,14520,0],[333000,341000,15220,0],[341000,349000,15980,0],
  [349000,357000,16750,0],[357000,365000,17520,0],[365000,373000,18280,0],
  [373000,381000,19050,0],[381000,389000,19820,0],[389000,397000,20600,0],
  [397000,405000,21370,0],[405000,420000,22280,0],[420000,440000,23700,0],
  [440000,460000,25600,0],[460000,480000,27500,0],[480000,500000,29500,0],
  [500000,520000,31500,0],[520000,540000,33600,0],[540000,560000,35700,0],
  [560000,580000,37800,0],[580000,600000,39900,0],[600000,620000,42000,0],
  [620000,640000,44200,0],[640000,660000,46400,0],[660000,680000,48600,0],
  [680000,700000,50800,0],[700000,720000,53000,0],[720000,740000,55200,0],
  [740000,760000,57400,0],[760000,780000,59600,0],[780000,800000,61800,0],
  [800000,820000,64000,0],[820000,840000,66200,0],[840000,860000,68400,0],
  [860000,880000,70600,0],[880000,900000,72800,0],[900000,Infinity,75000,0]
];

// Per-dependent deduction for 所得税 (月額) 2024
const DEP_SHOTOKU_DEDUCAO = 8333; // 年間 100,000円 ÷ 12

function calcShotokuZei(kyuyo, numDep) {
  // Adjust for dependents
  const adjustedKyuyo = kyuyo - (numDep * DEP_SHOTOKU_DEDUCAO);
  if(adjustedKyuyo <= 0) return 0;
  for(const [min,max,zei] of SHOTOKU_TABLE_A) {
    if(adjustedKyuyo >= min && adjustedKyuyo < max) return zei;
  }
  // Over 900,000 yen/month — approximation
  return Math.round(adjustedKyuyo * 0.33);
}

function calcJPSocial(kyuyoBase, prefName) {
  // 標準報酬月額
  const hyojun = getHyojunHoshu(kyuyoBase);

  // 健康保険 (折半) employee share
  const kenkoRate = (KENKO_RATES[prefName] || KENKO_RATES['全国平均']) / 2;
  const kenkoHoken = Math.floor(hyojun * kenkoRate);

  // 厚生年金 (折半) employee share
  const koseiBasis = Math.min(Math.max(hyojun, KOSEI_NENKIN_MIN_HOSO), KOSEI_NENKIN_MAX_HOSO);
  const koseiNenkin = Math.floor(koseiBasis * KOSEI_NENKIN_EMP_RATE);

  // 雇用保険
  const koyoHoken = Math.floor(kyuyoBase * KOYO_EMP_RATE);

  // 介護保険 (Kaigo Hoken — only if age ≥ 40)
  // Rate ~1.82% total, employee pays half (~0.91%)
  // We return separately; calling code adds if age >= 40
  const kaigoHoken = Math.floor(hyojun * 0.0091); // placeholder

  return { kenkoHoken, koseiNenkin, koyoHoken, kaigoHoken, hyojun };
}

// Overtime rules 労働基準法 第37条
function calcJPOvertime(kyuyoBase, normalHours, normalDaysPerMonth, overtimeH, late_night_H, holiday_H) {
  // 時給 (hourly rate) from monthly salary
  const jikyu = kyuyoBase / (normalHours * (normalDaysPerMonth || 22));
  // 時間外労働割増 25% (残業)
  const zangyoPay = Math.floor(jikyu * 1.25 * (overtimeH || 0));
  // 深夜労働割増 50% (22:00–05:00, on top of normal: +25%)
  const shinnyaPay = Math.floor(jikyu * 0.50 * (late_night_H || 0));
  // 休日労働割増 35%
  const kyujitsuPay = Math.floor(jikyu * 1.35 * (holiday_H || 0));
  return { zangyoPay, shinnyaPay, kyujitsuPay, jikyu };
}

function calcJPFolha(emp, lanc) {
  const kyuyoBase  = parseFloat(emp.kyuyo || 0);
  const kyuyoTotal = kyuyoBase
    + parseFloat(lanc.tsukinTeate || 0)   // 通勤手当
    + parseFloat(lanc.yakushokuTeate || 0) // 役職手当
    + parseFloat(lanc.kazokuTeate || 0)    // 家族手当
    + parseFloat(lanc.jutakuTeate || 0)    // 住宅手当
    + parseFloat(lanc.sonota || 0);        // その他手当

  const hoursPerDay    = parseFloat(emp.hoursPerDay || 8);
  const daysPerMonth   = parseInt(lanc.daysWorked || 22);
  const scheduledDays  = parseInt(lanc.scheduledDays || 22);
  const absenceDays    = Math.max(0, scheduledDays - daysPerMonth);
  const overtimeH      = parseFloat(lanc.overtimeH || 0);
  const lateNightH     = parseFloat(lanc.lateNightH || 0);
  const holidayH       = parseFloat(lanc.holidayH || 0);
  const numDep         = parseInt(emp.dependents || 0);
  const prefName       = emp.prefecture || '東京';
  const isAge40plus    = parseInt(emp.age || 0) >= 40;
  const adiantamento   = parseFloat(lanc.adiantamento || 0);
  const sonota_kojo    = parseFloat(lanc.sonotaKojo || 0);

  // 欠勤控除 (absence deduction)
  const absenceDeduction = absenceDays > 0 ? Math.floor((kyuyoBase / scheduledDays) * absenceDays) : 0;

  // Overtime
  const { zangyoPay, shinnyaPay, kyujitsuPay, jikyu } = calcJPOvertime(kyuyoBase, hoursPerDay, scheduledDays, overtimeH, lateNightH, holidayH);

  // 総支給額 (gross before social insurance)
  const soShikyu = Math.max(0, kyuyoTotal - absenceDeduction + zangyoPay + shinnyaPay + kyujitsuPay);

  // 社会保険 (based on kyuyoBase for 標準報酬)
  const { kenkoHoken, koseiNenkin, koyoHoken, kaigoHoken, hyojun } = calcJPSocial(kyuyoBase, prefName);
  const kaigoFinal = isAge40plus ? kaigoHoken : 0;
  const totalShakai = kenkoHoken + koseiNenkin + koyoHoken + kaigoFinal;

  // 所得税 (based on gross minus commuting allowance, minus social insurance)
  const tsukin    = parseFloat(lanc.tsukinTeate || 0);
  const shotokuBase = Math.max(0, soShikyu - tsukin); // 通勤手当は非課税
  const shotokuZei  = calcShotokuZei(Math.max(0, shotokuBase - totalShakai), numDep);

  // 住民税 (fixed monthly amount, set per employee — previous year income based)
  const juminZei = parseFloat(emp.juminZeiMonthly || 0);

  // 派遣料金 (billing to client company) — markup typically 30-40%
  const hokenMarkup    = parseFloat(emp.hokenMarkup || 30) / 100;
  const hakenRyokin    = Math.floor(soShikyu * (1 + hokenMarkup));

  const totalKojo = totalShakai + shotokuZei + juminZei + adiantamento + sonota_kojo;
  const sikkyuGaku = Math.max(0, soShikyu - totalKojo);

  // Employer burdens (会社負担分)
  const kenkoHokenSha  = kenkoHoken;  // employer pays same as employee
  const koseiNenkinSha = koseiNenkin;
  const koyoSha        = Math.floor(kyuyoBase * 0.0095); // 0.95% employer
  const rosaiHoken     = Math.floor(kyuyoBase * 0.003);  // 労災 0.3% (services avg)
  const totalEmpBurden = kenkoHokenSha + koseiNenkinSha + koyoSha + rosaiHoken;

  return {
    kyuyoBase, kyuyoTotal, absenceDays, absenceDeduction,
    tsukinTeate: parseFloat(lanc.tsukinTeate||0),
    zangyoPay, shinnyaPay, kyujitsuPay, jikyu,
    soShikyu,
    hyojun, kenkoHoken, koseiNenkin, koyoHoken, kaigoFinal, totalShakai,
    shotokuZei, juminZei,
    adiantamento, sonota_kojo,
    totalKojo, sikkyuGaku,
    kenkoHokenSha, koseiNenkinSha, koyoSha, rosaiHoken, totalEmpBurden,
    hakenRyokin,
  };
}

// ── State ──────────────────────────────────────────────────────
let jpTab = 'shainhantori';
let jpFpYM = (()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); })();
let jpCpFilter = 'todos';

// ══ MAIN RENDER ═══════════════════════════════════════════════
function renderDPJP() {
  const panel = document.getElementById('panel-dpjp');
  panel.innerHTML = `
  <!-- Header -->
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.25rem;padding:.75rem 1rem;background:linear-gradient(90deg,rgba(239,68,68,.08),rgba(248,113,113,.04));border:1px solid rgba(239,68,68,.2);border-radius:var(--radius-lg)">
    <span style="font-size:22px">🇯🇵</span>
    <div>
      <div style="font-size:14px;font-weight:700;color:var(--text)">人事部 — Japan HR Module</div>
      <div style="font-size:12px;color:var(--text2)">派遣労働者管理 · 労働基準法・健康保険法・厚生年金法・雇用保険法 (2024/2025)</div>
    </div>
  </div>
  <!-- Sub-tabs -->
  <div style="display:flex;gap:4px;margin-bottom:1.25rem;flex-wrap:wrap">
    ${[
      ['shainhantori','👥','社員登録 (Colaboradores)'],
      ['kyuyokeisan', '💴','給与計算 (Folha de Pagamento)'],
      ['shiharaiканри','📋','支払管理 (Contas a Pagar)'],
    ].map(([id,ico,lbl])=>`
    <button onclick="jpSwitchTab('${id}')" id="jp-tab-${id}"
      class="btn${jpTab===id?' btn-primary':''}"
      style="font-size:12px;gap:5px;display:flex;align-items:center">
      <span>${ico}</span>${lbl}
    </button>`).join('')}
  </div>
  <div id="jp-content"></div>`;
  jpRenderTab();
}

function jpSwitchTab(tab) {
  jpTab = tab;
  document.querySelectorAll('[id^="jp-tab-"]').forEach(b=>{
    const id=b.id.replace('jp-tab-','');
    b.className='btn'+(id===tab?' btn-primary':'');
    b.style.cssText='font-size:12px;gap:5px;display:flex;align-items:center';
  });
  jpRenderTab();
}
function jpRenderTab() {
  if(jpTab==='shainhantori') jpRenderShainhantori();
  else if(jpTab==='kyuyokeisan') jpRenderKyuyo();
  else jpRenderShiharai();
}

/* ═══ 1. 社員登録 — CADASTRO DE COLABORADORES (JP) ════════════ */
function jpRenderShainhantori() {
  const emps = jpEmpLoad();
  const content = document.getElementById('jp-content');
  const totalKyuyo = emps.reduce((s,e)=>s+parseFloat(e.kyuyo||0),0);
  content.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:1rem">
    <div><h2>社員登録 — Cadastro de Colaboradores</h2>
    <p class="sub">${emps.length}名登録済 · Total: ¥${totalKyuyo.toLocaleString('ja-JP')}/月</p></div>
    <button class="btn btn-primary" onclick="jpOpenEmpModal()">+ 新規登録 Novo colaborador</button>
  </div>
  ${emps.length===0?`<div class="card"><div class="empty">
    <div style="font-size:32px;margin-bottom:.75rem;opacity:.3">👥</div>
    <div style="font-weight:600;margin-bottom:.5rem">社員が登録されていません</div>
    <div style="margin-bottom:1rem">Cadastre colaboradores para iniciar a gestão de RH</div>
    <button class="btn btn-primary" onclick="jpOpenEmpModal()">+ 新規登録</button>
  </div></div>`:`
  <div class="grid4" style="margin-bottom:1rem">
    <div class="ct-stat"><div class="lbl">総社員数</div><div class="val">${emps.length}名</div></div>
    <div class="ct-stat"><div class="lbl">給与総額</div><div class="val pos">¥${totalKyuyo.toLocaleString('ja-JP')}</div></div>
    <div class="ct-stat"><div class="lbl">派遣社員</div><div class="val">${emps.filter(e=>e.type==='派遣').length}名</div></div>
    <div class="ct-stat"><div class="lbl">正社員</div><div class="val">${emps.filter(e=>e.type==='正社員').length}名</div></div>
  </div>
  <div class="card" style="padding:0;overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:800px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        ${['氏名 (Nome)','雇用形態','基本給 (¥)','入社日','都道府県','派遣先','扶養',''].map(h=>`<th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">${h}</th>`).join('')}
      </tr></thead>
      <tbody>${emps.map(e=>`
      <tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--bg4)'" onmouseout="this.style.background=''">
        <td style="padding:10px 12px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--blue-bg);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--blue-text);flex-shrink:0">${(e.fullName||'?').slice(0,1)}</div>
            <div>
              <div style="font-weight:600;color:var(--text)">${e.fullName||'—'}</div>
              <div style="font-size:11px;color:var(--text3)">${e.fullNameKana||''} · ${e.myNumber?'マイナンバー登録済':'未登録'}</div>
            </div>
          </div>
        </td>
        <td style="padding:10px 12px">
          <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;background:${e.type==='派遣'?'var(--blue-bg)':e.type==='正社員'?'var(--green-bg)':'var(--bg4)'};color:${e.type==='派遣'?'var(--blue-text)':e.type==='正社員'?'var(--green-text)':'var(--text2)'}">
            ${e.type||'派遣'}
          </span>
        </td>
        <td style="padding:10px 12px;font-weight:600;color:var(--text)">¥${parseFloat(e.kyuyo||0).toLocaleString('ja-JP')}</td>
        <td style="padding:10px 12px;font-size:12px;color:var(--text2)">${e.nyushaDate?new Date(e.nyushaDate+'T00:00').toLocaleDateString('ja-JP'):'—'}</td>
        <td style="padding:10px 12px;color:var(--text2)">${e.prefecture||'—'}</td>
        <td style="padding:10px 12px;color:var(--text2);font-size:12px">${e.hakenSaki||'—'}</td>
        <td style="padding:10px 12px;text-align:center">${e.dependents||0}名</td>
        <td style="padding:10px 12px"><div style="display:flex;gap:4px">
          <button class="btn btn-sm" onclick="jpOpenEmpModal('${e.key}')">✏</button>
          <button class="btn btn-sm btn-danger" onclick="jpDeleteEmp('${e.key}')">✕</button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`}`;
}

function jpOpenEmpModal(key) {
  const e = key ? stGet(key) : {};
  const types = ['派遣','正社員','契約社員','パート・アルバイト','業務委託'];
  const prefs = Object.keys(KENKO_RATES).filter(p=>p!=='全国平均');
  const overlay = document.createElement('div');
  overlay.className='modal-overlay'; overlay.id='jp-emp-overlay';
  overlay.style.cssText='overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  overlay.innerHTML=`
  <div class="modal" style="max-width:640px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div><h3 style="margin-bottom:2px">🇯🇵 ${key?'社員編集':'新規社員登録'}</h3>
      <p class="sub" style="margin-top:0">個人情報・雇用条件・社会保険 (Personal data & employment)</p></div>
      <button class="btn btn-sm" onclick="document.getElementById('jp-emp-overlay').remove()">✕</button>
    </div>

    <div class="sec-label">個人情報 (Dados pessoais)</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field"><label>氏名 (Nome completo) *</label><input id="je-name" value="${e.fullName||''}"></div>
      <div class="field"><label>フリガナ (Furigana)</label><input id="je-kana" value="${e.fullNameKana||''}" placeholder="カタカナ"></div>
      <div class="field"><label>生年月日 (Data de nascimento)</label><input type="date" id="je-birth" value="${e.birthDate||''}"></div>
      <div class="field"><label>年齢 (Idade)</label><input type="number" id="je-age" value="${e.age||''}" min="16" max="80" placeholder="40歳未満=介護保険なし" oninput="document.getElementById('je-kaigo-note').style.display=parseInt(this.value)>=40?'block':'none'">
        <div id="je-kaigo-note" style="display:${(e.age&&parseInt(e.age)>=40)?'block':'none'};font-size:11px;color:var(--amber);margin-top:3px">⚠ 40歳以上 — 介護保険が適用されます</div>
      </div>
      <div class="field"><label>性別 (Sexo)</label>
        <select id="je-gender"><option ${(e.gender||'男')==='男'?'selected':''}>男</option><option ${e.gender==='女'?'selected':''}>女</option><option ${e.gender==='その他'?'selected':''}>その他</option></select>
      </div>
      <div class="field"><label>国籍 (Nacionalidade)</label><input id="je-nationality" value="${e.nationality||'日本'}" placeholder="日本 / ブラジル / etc."></div>
      <div class="field"><label>在留資格 (Visto/Residência)</label>
        <select id="je-visa">
          ${['日本人','永住者','特別永住者','技術・人文知識・国際業務','特定技能1号','特定技能2号','技能実習','定住者','家族滞在','その他'].map(v=>`<option ${e.visaType===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>住所 (Endereço)</label><input id="je-addr" value="${e.address||''}" placeholder="東京都渋谷区..."></div>
      <div class="field"><label>都道府県 (Prefeitura) — 健康保険率に影響</label>
        <select id="je-pref">${prefs.map(p=>`<option ${(e.prefecture||'東京')===p?'selected':''}>${p}</option>`).join('')}</select>
      </div>
      <div class="field"><label>電話番号 (Telefone)</label><input id="je-tel" value="${e.tel||''}" placeholder="090-0000-0000"></div>
      <div class="field"><label>メールアドレス (E-mail)</label><input type="email" id="je-email" value="${e.email||''}"></div>
    </div>

    <div class="sec-label">雇用条件 (Condições de emprego)</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field"><label>雇用形態 (Tipo de contrato) *</label>
        <select id="je-type">${types.map(t=>`<option ${(e.type||'派遣')===t?'selected':''}>${t}</option>`).join('')}</select>
      </div>
      <div class="field"><label>職種 (Cargo)</label><input id="je-shoku" value="${e.shokuShu||''}" placeholder="エンジニア, 事務, 製造..."></div>
      <div class="field"><label>基本給 / 月給 (¥) *</label><div class="suf"><input type="number" id="je-kyuyo" value="${e.kyuyo||''}" step="1000"><s>¥</s></div></div>
      <div class="field"><label>時給 (¥/h) — para パート</label><div class="suf"><input type="number" id="je-jikyu" value="${e.jikyu||''}" step="10"><s>¥</s></div></div>
      <div class="field"><label>入社日 (Data admissão)</label><input type="date" id="je-nyusha" value="${e.nyushaDate||''}"></div>
      <div class="field"><label>所定労働時間/日 (Horas diárias)</label><div class="suf"><input type="number" id="je-hours" value="${e.hoursPerDay||8}" step="0.5" min="1" max="12"><s>h</s></div></div>
      <div class="field"><label>扶養家族数 (Dependentes IRRF) *</label><input type="number" id="je-dep" value="${e.dependents||0}" min="0"></div>
      <div class="field"><label>住民税月額 ¥ (Imposto residência/mês)</label><div class="suf"><input type="number" id="je-jumin" value="${e.juminZeiMonthly||0}" step="100"><s>¥</s></div></div>
    </div>

    <div class="sec-label">派遣情報 (Dados da terceirização)</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field"><label>派遣先会社 (Empresa cliente)</label><input id="je-hakenSaki" value="${e.hakenSaki||''}" placeholder="株式会社〇〇"></div>
      <div class="field"><label>派遣先部署 (Departamento cliente)</label><input id="je-hakenBusho" value="${e.hakenBusho||''}" placeholder="製造部 / IT部門..."></div>
      <div class="field"><label>派遣契約期間 開始</label><input type="date" id="je-hakStart" value="${e.hakenKiKanStart||''}"></div>
      <div class="field"><label>派遣契約期間 終了</label><input type="date" id="je-hakEnd" value="${e.hakenKiKanEnd||''}"></div>
      <div class="field"><label>派遣料金マークアップ % (Markup)</label><div class="suf"><input type="number" id="je-markup" value="${e.hokenMarkup||30}" step="1" min="0"><s>%</s></div></div>
      <div class="field"><label>派遣元管理担当者 (Gerente responsável)</label><input id="je-tantosya" value="${e.tantosya||''}"></div>
    </div>

    <div class="sec-label">銀行・番号 (Dados bancários e identificação)</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field"><label>銀行名 (Banco)</label><input id="je-bank" value="${e.bank||''}" placeholder="三菱UFJ・みずほ・ゆうちょ..."></div>
      <div class="field"><label>支店 / 口座番号</label><input id="je-bankAccount" value="${e.bankAccount||''}" placeholder="渋谷支店 / 1234567"></div>
      <div class="field"><label>マイナンバー (登録確認)</label>
        <select id="je-mynum"><option value="未登録" ${(e.myNumber||'未登録')==='未登録'?'selected':''}>未登録</option><option value="登録済" ${e.myNumber==='登録済'?'selected':''}>登録済</option></select>
      </div>
      <div class="field"><label>雇用保険被保険者番号</label><input id="je-koyo-num" value="${e.koyoNum||''}" placeholder="0000-000000-0"></div>
      <div class="field"><label>基礎年金番号 (Pensão)</label><input id="je-nenkin-num" value="${e.nenkinNum||''}" placeholder="0000-000000"></div>
      <div class="field"><label>健康保険証番号 (Plano saúde)</label><input id="je-kenko-num" value="${e.kenkoNum||''}" placeholder="記号 / 番号"></div>
    </div>
    <div class="field" style="margin-bottom:1rem"><label>備考 (Observações)</label>
      <textarea id="je-biko" rows="2" style="width:100%;padding:8px 12px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);resize:vertical;font-family:inherit">${e.biko||''}</textarea>
    </div>
    <div id="je-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="jpSaveEmp('${key||''}')">保存 Salvar</button>
      <button class="btn" onclick="document.getElementById('jp-emp-overlay').remove()">キャンセル</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function jpSaveEmp(key) {
  const name  = document.getElementById('je-name').value.trim();
  const kyuyo = parseFloat(document.getElementById('je-kyuyo').value)||0;
  const errEl = document.getElementById('je-err');
  if(!name)  { errEl.textContent='氏名を入力してください (Nome obrigatório).'; errEl.style.display='block'; return; }
  if(!kyuyo) { errEl.textContent='基本給を入力してください (Salário obrigatório).'; errEl.style.display='block'; return; }
  const ts = key ? key.split('_').pop() : Date.now();
  const k  = key || JP_EMP() + ts;
  stSet(k, { key:k, ts:parseInt(ts),
    fullName:   name,
    fullNameKana: document.getElementById('je-kana').value.trim(),
    birthDate:  document.getElementById('je-birth').value,
    age:        parseInt(document.getElementById('je-age').value)||0,
    gender:     document.getElementById('je-gender').value,
    nationality:document.getElementById('je-nationality').value.trim(),
    visaType:   document.getElementById('je-visa').value,
    address:    document.getElementById('je-addr').value.trim(),
    prefecture: document.getElementById('je-pref').value,
    tel:        document.getElementById('je-tel').value.trim(),
    email:      document.getElementById('je-email').value.trim(),
    type:       document.getElementById('je-type').value,
    shokuShu:   document.getElementById('je-shoku').value.trim(),
    kyuyo,
    jikyu:      parseFloat(document.getElementById('je-jikyu').value)||0,
    nyushaDate: document.getElementById('je-nyusha').value,
    hoursPerDay:parseFloat(document.getElementById('je-hours').value)||8,
    dependents: parseInt(document.getElementById('je-dep').value)||0,
    juminZeiMonthly: parseFloat(document.getElementById('je-jumin').value)||0,
    hakenSaki:  document.getElementById('je-hakenSaki').value.trim(),
    hakenBusho: document.getElementById('je-hakenBusho').value.trim(),
    hakenKiKanStart: document.getElementById('je-hakStart').value,
    hakenKiKanEnd:   document.getElementById('je-hakEnd').value,
    hokenMarkup:parseFloat(document.getElementById('je-markup').value)||30,
    tantosya:   document.getElementById('je-tantosya').value.trim(),
    bank:       document.getElementById('je-bank').value.trim(),
    bankAccount:document.getElementById('je-bankAccount').value.trim(),
    myNumber:   document.getElementById('je-mynum').value,
    koyoNum:    document.getElementById('je-koyo-num').value.trim(),
    nenkinNum:  document.getElementById('je-nenkin-num').value.trim(),
    kenkoNum:   document.getElementById('je-kenko-num').value.trim(),
    biko:       document.getElementById('je-biko').value.trim(),
  });
  document.getElementById('jp-emp-overlay').remove();
  showToast(key ? '社員情報を更新しました' : '社員を登録しました！');
  jpRenderShainhantori();
}
function jpDeleteEmp(key){ if(!confirm('この社員を削除しますか？')) return; stDel(key); showToast('削除しました'); jpRenderShainhantori(); }

/* ═══ 2. 給与計算 — FOLHA DE PAGAMENTO (JP) ══════════════════ */
function jpRenderKyuyo() {
  const emps  = jpEmpLoad();
  const folha = jpFpLoad(jpFpYM);
  const content = document.getElementById('jp-content');
  let totSoShikyu=0, totShakai=0, totShotoku=0, totSikkyu=0, totHaken=0, totEmpBurden=0;
  folha.forEach(f=>{ const emp=emps.find(e=>e.key===f.empKey); if(!emp) return;
    const c=calcJPFolha(emp,f); totSoShikyu+=c.soShikyu; totShakai+=c.totalShakai;
    totShotoku+=c.shotokuZei; totSikkyu+=c.sikkyuGaku; totHaken+=c.hakenRyokin; totEmpBurden+=c.totalEmpBurden; });
  const [yyyy,mm]=jpFpYM.split('-');
  const nomeMes=new Date(parseInt(yyyy),parseInt(mm)-1).toLocaleString('ja-JP',{year:'numeric',month:'long'});

  content.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:1rem">
    <div><h2>給与計算 — Folha de Pagamento</h2><p class="sub">${nomeMes}</p></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <input type="month" value="${jpFpYM}" onchange="jpFpYM=this.value;jpRenderKyuyo()" style="height:36px;padding:0 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);font-size:13px">
      <button class="btn btn-primary" onclick="jpOpenLancamento()">+ 給与入力</button>
      ${folha.length>0?`<button class="btn btn-sm" onclick="jpGerarTodosRecibos()">🖨 給与明細</button>`:''}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:1rem">
    <div class="ct-stat"><div class="lbl">対象者数</div><div class="val">${folha.length}名</div></div>
    <div class="ct-stat"><div class="lbl">総支給額合計</div><div class="val">¥${totSoShikyu.toLocaleString('ja-JP')}</div></div>
    <div class="ct-stat"><div class="lbl">差引支給額合計</div><div class="val pos">¥${totSikkyu.toLocaleString('ja-JP')}</div></div>
    <div class="ct-stat"><div class="lbl">社会保険合計</div><div class="val neg">¥${totShakai.toLocaleString('ja-JP')}</div></div>
    <div class="ct-stat"><div class="lbl">会社負担合計</div><div class="val" style="color:var(--amber)">¥${totEmpBurden.toLocaleString('ja-JP')}</div></div>
    <div class="ct-stat"><div class="lbl">派遣料金合計 (請求)</div><div class="val" style="color:var(--blue)">¥${totHaken.toLocaleString('ja-JP')}</div></div>
  </div>
  ${folha.length===0?`<div class="card"><div class="empty">
    <div style="font-size:32px;margin-bottom:.75rem;opacity:.3">💴</div>
    <div style="font-weight:600;margin-bottom:.5rem">給与データがありません (${nomeMes})</div>
    <button class="btn btn-primary" onclick="jpOpenLancamento()">+ 給与入力</button>
  </div></div>`:`
  <div class="card" style="padding:0;overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:11px;min-width:1000px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        ${['氏名','出勤日','総支給','健保','厚年','雇保','所得税','住民税','差引支給','会社負担','派遣料金',''].map((h,i)=>`<th style="padding:7px 8px;font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;${i===0?'text-align:left':'text-align:right'}">${h}</th>`).join('')}
      </tr></thead>
      <tbody>${folha.map(f=>{
        const emp=emps.find(e=>e.key===f.empKey); if(!emp) return '';
        const c=calcJPFolha(emp,f);
        const nm=emp.fullName; const fx=v=>'¥'+v.toLocaleString('ja-JP');
        const td=(v,cl='')=>`<td style="padding:7px 8px;text-align:right${cl?';color:'+cl:''}">${v}</td>`;
        return`<tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--bg4)'" onmouseout="this.style.background=''">
          <td style="padding:7px 8px"><div style="font-weight:600;color:var(--text)">${nm}</div><div style="font-size:10px;color:var(--text3)">${emp.type||'派遣'} · ${emp.prefecture||''}</div></td>
          <td style="padding:7px 8px;text-align:center;color:${c.absenceDays>0?'var(--amber)':'var(--text2)'}">${c.daysWorked||f.daysWorked||22}/${f.scheduledDays||22}${c.absenceDays>0?' (−'+c.absenceDays+')':''}</td>
          ${td(fx(c.soShikyu),'var(--text)')}
          ${td('−'+fx(c.kenkoHoken),'var(--red)')}
          ${td('−'+fx(c.koseiNenkin),'var(--red)')}
          ${td('−'+fx(c.koyoHoken),'var(--red)')}
          ${td('−'+fx(c.shotokuZei),'var(--red)')}
          ${td(c.juminZei>0?'−'+fx(c.juminZei):'—',c.juminZei>0?'var(--amber)':'var(--text3)')}
          ${td(fx(c.sikkyuGaku),'var(--green)')}
          ${td(fx(c.totalEmpBurden),'var(--amber)')}
          ${td(fx(c.hakenRyokin),'var(--blue)')}
          <td style="padding:7px 8px"><div style="display:flex;gap:3px">
            <button class="btn btn-sm" onclick="jpOpenLancamento('${f.empKey}')">✏</button>
            <button class="btn btn-sm" onclick="jpOpenMeisai('${f.empKey}')">📄</button>
            <button class="btn btn-sm btn-danger" onclick="jpDeleteLancamento('${f.empKey}')">✕</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
      <tfoot><tr style="border-top:2px solid var(--border);background:var(--bg)">
        <td colspan="2" style="padding:7px 8px;font-weight:700">TOTAIS</td>
        <td style="padding:7px 8px;text-align:right;font-weight:700">¥${totSoShikyu.toLocaleString('ja-JP')}</td>
        <td colspan="4" style="padding:7px 8px;text-align:right;font-weight:700;color:var(--red)">−¥${totShakai.toLocaleString('ja-JP')}</td>
        <td style="padding:7px 8px;text-align:right;font-weight:700;color:var(--amber)">−¥${totShotoku.toLocaleString('ja-JP')}</td>
        <td style="padding:7px 8px;text-align:right;font-weight:700;color:var(--green)">¥${totSikkyu.toLocaleString('ja-JP')}</td>
        <td style="padding:7px 8px;text-align:right;font-weight:700;color:var(--amber)">¥${totEmpBurden.toLocaleString('ja-JP')}</td>
        <td style="padding:7px 8px;text-align:right;font-weight:700;color:var(--blue)">¥${totHaken.toLocaleString('ja-JP')}</td>
        <td></td>
      </tr></tfoot>
    </table>
  </div>`}`;
}

function jpOpenLancamento(empKey) {
  const emps=jpEmpLoad(); if(emps.length===0){showToast('社員を先に登録してください');return;}
  const folha=jpFpLoad(jpFpYM);
  const existing=empKey?folha.find(f=>f.empKey===empKey):{};
  const [yyyy,mm]=jpFpYM.split('-');
  const nomeMes=new Date(parseInt(yyyy),parseInt(mm)-1).toLocaleString('ja-JP',{year:'numeric',month:'long'});
  const v=(id,def='')=>`value="${(existing&&existing[id]!==undefined)?existing[id]:def}"`;
  const overlay=document.createElement('div');
  overlay.className='modal-overlay'; overlay.id='jp-lanc-overlay';
  overlay.style.cssText='overflow-y:auto;align-items:flex-start;padding:1.5rem 1rem';
  overlay.innerHTML=`
  <div class="modal" style="max-width:580px;margin:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <div><h3 style="margin-bottom:2px">💴 給与入力 — ${nomeMes}</h3>
      <p class="sub" style="margin-top:0">手当・控除・残業を入力</p></div>
      <button class="btn btn-sm" onclick="document.getElementById('jp-lanc-overlay').remove()">✕</button>
    </div>
    <div class="field" style="margin-bottom:1rem">
      <label>社員 (Colaborador) *</label>
      <select id="jl-emp" onchange="jpLancAutoFill()" ${empKey?'disabled':''}>
        ${emps.map(e=>`<option value="${e.key}" ${(empKey===e.key||existing?.empKey===e.key)?'selected':''}>${e.fullName} — ${e.type||'派遣'} · ¥${parseFloat(e.kyuyo||0).toLocaleString('ja-JP')}</option>`).join('')}
      </select>
    </div>

    <div class="sec-label" style="margin-bottom:.5rem">勤怠情報 (Frequência)</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field"><label>所定労働日数 (Dias úteis)</label><input type="number" id="jl-sched" ${v('scheduledDays',22)} min="1" max="31"></div>
      <div class="field"><label>出勤日数 (Dias trabalhados)</label><input type="number" id="jl-worked" ${v('daysWorked',22)} min="0" max="31" oninput="jpLancPreview()"></div>
      <div class="field"><label>時間外労働 残業 (h)</label><div class="suf"><input type="number" id="jl-ot" ${v('overtimeH',0)} step="0.5" oninput="jpLancPreview()"><s>h</s></div></div>
      <div class="field"><label>深夜労働 22:00-05:00 (h)</label><div class="suf"><input type="number" id="jl-night" ${v('lateNightH',0)} step="0.5" oninput="jpLancPreview()"><s>h</s></div></div>
      <div class="field"><label>休日労働 (h)</label><div class="suf"><input type="number" id="jl-holi" ${v('holidayH',0)} step="0.5" oninput="jpLancPreview()"><s>h</s></div></div>
    </div>

    <div class="sec-label" style="margin-bottom:.5rem">手当 (Adicionais)</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field"><label>通勤手当 (VT — não tributável) ¥</label><div class="suf"><input type="number" id="jl-tsuk" ${v('tsukinTeate',0)} step="100" oninput="jpLancPreview()"><s>¥</s></div></div>
      <div class="field"><label>役職手当 (Cargo/posição) ¥</label><div class="suf"><input type="number" id="jl-yaku" ${v('yakushokuTeate',0)} step="100" oninput="jpLancPreview()"><s>¥</s></div></div>
      <div class="field"><label>家族手当 (Família) ¥</label><div class="suf"><input type="number" id="jl-kaz" ${v('kazokuTeate',0)} step="100" oninput="jpLancPreview()"><s>¥</s></div></div>
      <div class="field"><label>住宅手当 (Moradia) ¥</label><div class="suf"><input type="number" id="jl-jut" ${v('jutakuTeate',0)} step="100" oninput="jpLancPreview()"><s>¥</s></div></div>
      <div class="field"><label>その他手当 (Outros) ¥</label><div class="suf"><input type="number" id="jl-son" ${v('sonota',0)} step="100" oninput="jpLancPreview()"><s>¥</s></div></div>
    </div>

    <div class="sec-label" style="margin-bottom:.5rem">控除 (Deduções extras)</div>
    <div class="grid2" style="margin-bottom:1rem">
      <div class="field"><label>前払い / 仮払い (Adiantamento) ¥</label><div class="suf"><input type="number" id="jl-adiant" ${v('adiantamento',0)} step="100" oninput="jpLancPreview()"><s>¥</s></div></div>
      <div class="field"><label>その他控除 (Outras deduções) ¥</label><div class="suf"><input type="number" id="jl-kojo" ${v('sonotaKojo',0)} step="100" oninput="jpLancPreview()"><s>¥</s></div></div>
    </div>

    <!-- Preview -->
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:.875rem 1rem;margin-bottom:1rem">
      <div class="sec-label" style="margin-bottom:.5rem">給与計算プレビュー (Prévia do cálculo)</div>
      <div id="jl-preview" style="font-size:12px;color:var(--text2)">社員を選択してください...</div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="jpSaveLancamento()">保存 Salvar</button>
      <button class="btn" onclick="document.getElementById('jp-lanc-overlay').remove()">キャンセル</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  jpLancAutoFill();
}

function jpLancAutoFill() {
  const empKey=document.getElementById('jl-emp')?.value;
  const emp=jpEmpLoad().find(e=>e.key===empKey);
  if(!emp) return;
  // Pre-fill VT from emp profile
  const vtEl=document.getElementById('jl-tsuk');
  if(vtEl&&!parseFloat(vtEl.value)) vtEl.value=0;
  jpLancPreview();
}

function jpLancPreview() {
  const empKey=document.getElementById('jl-emp')?.value;
  const emp=jpEmpLoad().find(e=>e.key===empKey);
  const pEl=document.getElementById('jl-preview'); if(!emp||!pEl) return;
  const lanc={
    scheduledDays:parseInt(document.getElementById('jl-sched')?.value)||22,
    daysWorked:parseInt(document.getElementById('jl-worked')?.value)||22,
    overtimeH:parseFloat(document.getElementById('jl-ot')?.value)||0,
    lateNightH:parseFloat(document.getElementById('jl-night')?.value)||0,
    holidayH:parseFloat(document.getElementById('jl-holi')?.value)||0,
    tsukinTeate:parseFloat(document.getElementById('jl-tsuk')?.value)||0,
    yakushokuTeate:parseFloat(document.getElementById('jl-yaku')?.value)||0,
    kazokuTeate:parseFloat(document.getElementById('jl-kaz')?.value)||0,
    jutakuTeate:parseFloat(document.getElementById('jl-jut')?.value)||0,
    sonota:parseFloat(document.getElementById('jl-son')?.value)||0,
    adiantamento:parseFloat(document.getElementById('jl-adiant')?.value)||0,
    sonotaKojo:parseFloat(document.getElementById('jl-kojo')?.value)||0,
  };
  const c=calcJPFolha(emp,lanc);
  const fx=v=>'¥'+v.toLocaleString('ja-JP');
  const rows=[
    ['基本給 (Salário base)',fx(c.kyuyoBase),''],
    ...(c.absenceDays>0?[['(-) 欠勤控除 ('+c.absenceDays+'日)','−'+fx(c.absenceDeduction),'var(--red)']]:[]),
    ...(c.zangyoPay>0?[['(+) 残業手当','+'+ fx(c.zangyoPay),'var(--green)']]:[]),
    ...(c.shinnyaPay>0?[['(+) 深夜割増','+'+ fx(c.shinnyaPay),'var(--green)']]:[]),
    ...(c.kyujitsuPay>0?[['(+) 休日割増','+'+ fx(c.kyujitsuPay),'var(--green)']]:[]),
    ...(lanc.tsukinTeate>0?[['(+) 通勤手当','+'+ fx(lanc.tsukinTeate),'var(--text2)']]:[]),
    ['= 総支給額 (Bruto)',fx(c.soShikyu),'var(--text)'],
    ['(-) 健康保険 (Kenko)','−'+fx(c.kenkoHoken),'var(--red)'],
    ['(-) 厚生年金 (Nenkin)','−'+fx(c.koseiNenkin),'var(--red)'],
    ['(-) 雇用保険 (Koyo)','−'+fx(c.koyoHoken),'var(--red)'],
    ...(c.kaigoFinal>0?[['(-) 介護保険 (Kaigo)','−'+fx(c.kaigoFinal),'var(--red)']]:[]),
    ['(-) 源泉所得税 (Shotoku-zei)','−'+fx(c.shotokuZei),'var(--red)'],
    ...(c.juminZei>0?[['(-) 住民税 (Jumin-zei)','−'+fx(c.juminZei),'var(--amber)']]:[]),
    ...(c.adiantamento>0?[['(-) 前払い','−'+fx(c.adiantamento),'var(--amber)']]:[]),
    ['= 差引支給額 (Líquido)',fx(c.sikkyuGaku),'var(--green)'],
    ['---','---',''],
    ['会社負担 合計 (Encargo empresa)',fx(c.totalEmpBurden),'var(--amber)'],
    ['派遣料金 (Cobrança cliente)',fx(c.hakenRyokin),'var(--blue)'],
    ['標準報酬月額 (Hyojun Hoshu)',fx(c.hyojun),'var(--text3)'],
  ];
  pEl.innerHTML=rows.map(([l,v,cl])=>l==='---'?`<div style="border-top:1px dashed var(--border);margin:4px 0"></div>`:
    `<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid var(--border);font-size:11px">
      <span style="color:var(--text2)">${l}</span>
      <span style="font-weight:600;color:${cl||'var(--text)'}">${v}</span>
    </div>`).join('');
}

function jpSaveLancamento() {
  const empKey=document.getElementById('jl-emp')?.value;
  if(!empKey){showToast('社員を選択してください');return;}
  const folha=jpFpLoad(jpFpYM).filter(f=>f.empKey!==empKey);
  folha.push({empKey,ts:Date.now(),
    scheduledDays:parseInt(document.getElementById('jl-sched').value)||22,
    daysWorked:parseInt(document.getElementById('jl-worked').value)||22,
    overtimeH:parseFloat(document.getElementById('jl-ot').value)||0,
    lateNightH:parseFloat(document.getElementById('jl-night').value)||0,
    holidayH:parseFloat(document.getElementById('jl-holi').value)||0,
    tsukinTeate:parseFloat(document.getElementById('jl-tsuk').value)||0,
    yakushokuTeate:parseFloat(document.getElementById('jl-yaku').value)||0,
    kazokuTeate:parseFloat(document.getElementById('jl-kaz').value)||0,
    jutakuTeate:parseFloat(document.getElementById('jl-jut').value)||0,
    sonota:parseFloat(document.getElementById('jl-son').value)||0,
    adiantamento:parseFloat(document.getElementById('jl-adiant').value)||0,
    sonotaKojo:parseFloat(document.getElementById('jl-kojo').value)||0});
  jpFpSave(jpFpYM,folha);
  document.getElementById('jp-lanc-overlay').remove();
  showToast('給与データを保存しました！');
  jpRenderKyuyo();
}
function jpDeleteLancamento(empKey){if(!confirm('このデータを削除しますか？'))return;jpFpSave(jpFpYM,jpFpLoad(jpFpYM).filter(f=>f.empKey!==empKey));jpRenderKyuyo();}

function jpOpenMeisai(empKey) {
  const emp=jpEmpLoad().find(e=>e.key===empKey);
  const lanc=jpFpLoad(jpFpYM).find(f=>f.empKey===empKey);
  if(!emp||!lanc){showToast('データが見つかりません');return;}
  const c=calcJPFolha(emp,lanc);
  const [yyyy,mm]=jpFpYM.split('-');
  const nomeMes=new Date(parseInt(yyyy),parseInt(mm)-1).toLocaleString('ja-JP',{year:'numeric',month:'long'});
  const fx=v=>'¥'+v.toLocaleString('ja-JP');
  const w=window.open('','_blank','width=720,height=900');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>給与明細書 — ${emp.fullName}</title>
  <style>body{font-family:'Yu Gothic','Hiragino Kaku Gothic Pro',Meiryo,sans-serif;font-size:12px;max-width:680px;margin:20px auto;padding:20px}
  h2{text-align:center;font-size:14px}
  .sub{text-align:center;color:#555;font-size:11px;margin-bottom:12px}
  table{width:100%;border-collapse:collapse;margin-bottom:10px}
  th{background:#e8eaf6;padding:4px 8px;border:1px solid #aaa;font-size:10px;text-align:left}
  td{padding:4px 8px;border:1px solid #ccc;font-size:11px}
  .right{text-align:right}.blue{background:#e3f2fd}.green{background:#e8f5e9;font-weight:bold}.dashed{border-top:1px dashed #999;margin:10px 0}
  @media print{button{display:none}}

</style></head><body>
  <h2>給与明細書 (Holerite)</h2>
  <div class="sub">${nomeMes}</div>
  <table>
    <tr><th colspan="2">社員情報</th><th colspan="2">雇用情報</th></tr>
    <tr><td>氏名</td><td>${emp.fullName} (${emp.fullNameKana||'—'})</td><td>雇用形態</td><td>${emp.type||'派遣'}</td></tr>
    <tr><td>生年月日</td><td>${emp.birthDate||'—'}</td><td>基本給</td><td class="right">${fx(emp.kyuyo||0)}</td></tr>
    <tr><td>都道府県</td><td>${emp.prefecture||'—'}</td><td>派遣先</td><td>${emp.hakenSaki||'—'}</td></tr>
    <tr><td>標準報酬月額</td><td>${fx(c.hyojun)}</td><td>扶養家族数</td><td>${emp.dependents||0}名</td></tr>
  </table>
  <table>
    <tr><th>支給項目</th><th class="right">金額</th><th>控除項目</th><th class="right">金額</th></tr>
    <tr><td>基本給</td><td class="right">${fx(c.kyuyoBase)}</td><td>健康保険料</td><td class="right">${fx(c.kenkoHoken)}</td></tr>
    ${c.absenceDays>0?`<tr><td>欠勤控除 (−${c.absenceDays}日)</td><td class="right" style="color:red">−${fx(c.absenceDeduction)}</td><td>厚生年金保険料</td><td class="right">${fx(c.koseiNenkin)}</td></tr>`:
    `<tr><td>—</td><td></td><td>厚生年金保険料</td><td class="right">${fx(c.koseiNenkin)}</td></tr>`}
    ${c.zangyoPay>0?`<tr><td>時間外労働手当 (${lanc.overtimeH}h)</td><td class="right" style="color:green">+${fx(c.zangyoPay)}</td><td>雇用保険料</td><td class="right">${fx(c.koyoHoken)}</td></tr>`:
    `<tr><td>—</td><td></td><td>雇用保険料</td><td class="right">${fx(c.koyoHoken)}</td></tr>`}
    ${c.kaigoFinal>0?`<tr><td>—</td><td></td><td>介護保険料</td><td class="right">${fx(c.kaigoFinal)}</td></tr>`:''}
    ${c.shinnyaPay>0?`<tr><td>深夜割増 (${lanc.lateNightH}h)</td><td class="right" style="color:green">+${fx(c.shinnyaPay)}</td><td>源泉所得税</td><td class="right">${fx(c.shotokuZei)}</td></tr>`:
    `<tr><td>—</td><td></td><td>源泉所得税</td><td class="right">${fx(c.shotokuZei)}</td></tr>`}
    ${c.juminZei>0?`<tr><td>—</td><td></td><td>住民税</td><td class="right">${fx(c.juminZei)}</td></tr>`:''}
    ${lanc.tsukinTeate>0?`<tr><td>通勤手当 (非課税)</td><td class="right">+${fx(lanc.tsukinTeate)}</td><td>—</td><td></td></tr>`:''}
    ${c.adiantamento>0?`<tr><td>—</td><td></td><td>前払い</td><td class="right">${fx(c.adiantamento)}</td></tr>`:''}
    <tr class="blue"><td colspan="1"><b>総支給額</b></td><td class="right"><b>${fx(c.soShikyu)}</b></td><td><b>控除合計</b></td><td class="right"><b>${fx(c.totalKojo)}</b></td></tr>
    <tr class="green"><td colspan="3"><b>差引支給額 (Salário líquido a receber)</b></td><td class="right"><b>${fx(c.sikkyuGaku)}</b></td></tr>
  </table>
  <table>
    <tr><th colspan="4">会社負担額 (Encargo empresa — para referência)</th></tr>
    <tr><td>健康保険 (empresa)</td><td class="right">${fx(c.kenkoHokenSha)}</td><td>労災保険</td><td class="right">${fx(c.rosaiHoken)}</td></tr>
    <tr><td>厚生年金 (empresa)</td><td class="right">${fx(c.koseiNenkinSha)}</td><td>雇用保険 (empresa)</td><td class="right">${fx(c.koyoSha)}</td></tr>
    <tr class="blue"><td colspan="3"><b>会社負担合計</b></td><td class="right"><b>${fx(c.totalEmpBurden)}</b></td></tr>
    <tr><td colspan="3">派遣料金 (Cobrança ao cliente — ${emp.hokenMarkup||30}% markup)</td><td class="right"><b style="color:#1565c0">${fx(c.hakenRyokin)}</b></td></tr>
  </table>
  <p style="font-size:10px;color:#555;margin-top:8px">健康保険率: 協会けんぽ ${emp.prefecture||'東京'} ${((KENKO_RATES[emp.prefecture||'東京']||0.0998)*100).toFixed(2)}% | 標準報酬月額: ${fx(c.hyojun)}</p>
  <div class="dashed"></div>
  <table><tr>
    <td style="width:48%;text-align:center;padding-top:36px;border-top:1px solid #000">受領印 (Assinatura do colaborador)<br><br>${emp.fullName}</td>
    <td style="width:4%"></td>
    <td style="width:48%;text-align:center;padding-top:36px;border-top:1px solid #000">会社確認印 (Assinatura da empresa)</td>
  </tr></table>
  <div style="text-align:center;margin-top:12px"><button onclick="window.print()" style="padding:8px 24px;cursor:pointer;font-size:14px">🖨 印刷 Imprimir</button></div>
  `);
  w.document.close();
}
function jpGerarTodosRecibos(){jpFpLoad(jpFpYM).forEach(f=>jpOpenMeisai(f.empKey));}

/* ═══ 3. 支払管理 — CONTAS A PAGAR (JP) ═══════════════════════ */
function jpRenderShiharai() {
  const all=jpCpLoad();
  const hoje=new Date().toISOString().split('T')[0];
  const hoje7=new Date();hoje7.setDate(hoje7.getDate()+7);
  const venc=all.filter(c=>c.status!=='pago'&&c.vencimento<hoje);
  const prox=all.filter(c=>c.status!=='pago'&&c.vencimento>=hoje&&new Date(c.vencimento)<=hoje7);
  const filtered=jpCpFilter==='todos'?all:jpCpFilter==='vencidas'?venc:jpCpFilter==='proximas'?prox:all.filter(c=>c.status===jpCpFilter);
  const totPend=all.filter(c=>c.status!=='pago').reduce((s,c)=>s+parseFloat(c.valor||0),0);
  const totPago=all.filter(c=>c.status==='pago').reduce((s,c)=>s+parseFloat(c.valor||0),0);
  const content=document.getElementById('jp-content');
  const fx=v=>'¥'+v.toLocaleString('ja-JP');
  content.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:1rem">
    <div><h2>支払管理 — Contas a Pagar</h2><p class="sub">${all.length}件 · 未払い: ${venc.length}件</p></div>
    <button class="btn btn-primary" onclick="jpOpenCpModal()">+ 新規支払 Nova conta</button>
  </div>
  <div class="grid4" style="margin-bottom:1rem">
    <div class="ct-stat" style="${venc.length>0?'border-color:var(--red)':''}"><div class="lbl">期限超過</div><div class="val neg">${venc.length}件</div></div>
    <div class="ct-stat"><div class="lbl">7日以内期限</div><div class="val" style="color:var(--amber)">${prox.length}件</div></div>
    <div class="ct-stat"><div class="lbl">未払い合計</div><div class="val neg">${fx(totPend)}</div></div>
    <div class="ct-stat"><div class="lbl">支払済</div><div class="val pos">${fx(totPago)}</div></div>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:1rem">
    ${[['todos','全件'],['pendente','未払い'],['pago','支払済'],['vencidas','期限超過 ⚠'],['proximas','7日以内']].map(([f,l])=>`<button class="tag-btn${jpCpFilter===f?' active':''}" onclick="jpCpFilter='${f}';jpRenderShiharai()">${l}</button>`).join('')}
  </div>
  ${filtered.length===0?`<div class="card"><div class="empty">
    <div style="font-size:32px;margin-bottom:.75rem;opacity:.3">📋</div>
    <div style="font-weight:600;margin-bottom:.5rem">支払データなし</div>
    <button class="btn btn-primary" onclick="jpOpenCpModal()">+ 新規支払</button>
  </div></div>`:`
  <div class="card" style="padding:0;overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:750px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        ${['内容','種別','金額 (¥)','支払期限','状態','支払先','支払方法',''].map(h=>`<th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">${h}</th>`).join('')}
      </tr></thead>
      <tbody>${filtered.map(c=>{
        const isV=c.status!=='pago'&&c.vencimento<hoje;
        const isP=!isV&&c.status!=='pago'&&new Date(c.vencimento)<=hoje7;
        const sc=c.status==='pago'?'var(--green)':isV?'var(--red)':isP?'var(--amber)':'var(--text2)';
        const sl=c.status==='pago'?'支払済':isV?'期限超過':isP?'要確認':'未払い';
        const sbg=c.status==='pago'?'var(--green-bg)':isV?'var(--red-bg)':'var(--amber-bg)';
        return`<tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--bg4)'" onmouseout="this.style.background=''">
          <td style="padding:10px 12px"><div style="font-weight:600;color:var(--text)">${c.descricao}</div>${c.obs?`<div style="font-size:11px;color:var(--text3)">${c.obs}</div>`:''}</td>
          <td style="padding:10px 12px"><span class="badge bb" style="font-size:11px">${c.categoria||'—'}</span></td>
          <td style="padding:10px 12px;font-weight:700;color:var(--text)">¥${parseFloat(c.valor||0).toLocaleString('ja-JP')}</td>
          <td style="padding:10px 12px;font-size:12px;color:${isV?'var(--red)':isP?'var(--amber)':'var(--text2)'}">
            ${new Date(c.vencimento+'T00:00').toLocaleDateString('ja-JP')}</td>
          <td style="padding:10px 12px"><span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;background:${sbg};color:${sc}">${sl}</span></td>
          <td style="padding:10px 12px;color:var(--text2);font-size:12px">${c.fornecedor||'—'}</td>
          <td style="padding:10px 12px;font-size:12px;color:var(--text2)">${c.formaPgto||'—'}</td>
          <td style="padding:10px 12px"><div style="display:flex;gap:4px">
            ${c.status!=='pago'?`<button class="btn btn-sm" style="color:var(--green);border-color:var(--green)" onclick="jpMarcarPago('${c.key}')">✓</button>`:''}
            <button class="btn btn-sm" onclick="jpOpenCpModal('${c.key}')">✏</button>
            <button class="btn btn-sm btn-danger" onclick="jpDeleteCp('${c.key}')">✕</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>`}`;
  
  // Adicionar dicas de uso
  const tipsDiv = document.createElement('div');
  tipsDiv.innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, rgba(239,68,68,.08), rgba(248,113,113,.04)); border-color: rgba(239,68,68,.2); margin-top: 2rem;">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 20px; flex-shrink: 0;">💡</span>
        <div>
          <h3 style="color: #ef4444; margin-bottom: 8px;">使用のコツ - 人事部 / HR Module</h3>
          <ul style="list-style: none; padding: 0; margin: 0; color: var(--text2); font-size: 13px; line-height: 1.6;">
            <li>👥 <strong>社員登録:</strong> 派遣労働者の正確な個人情報、銀行口座、給与情報を登録してください。</li>
            <li>💴 <strong>給与計算:</strong> 月次で社員の実績（勤務時間、残業、控除）を入力し、給与計算を自動化します。</li>
            <li>📋 <strong>支払管理:</strong> 健康保険、年金、所得税、住民税などの各種義務を追跡します。</li>
            <li>⚠️ <strong>期限チェック:</strong> 納付期限超過を避けるため、支払管理で有効期限を常に確認してください。</li>
            <li>📊 <strong>レポート:</strong> 月次で総給与、諸控除、派遣手数料などを詳細に確認できます。</li>
          </ul>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => {
    const content = document.getElementById('jp-content');
    if(content) content.appendChild(tipsDiv);
  }, 50);
}

function jpOpenCpModal(key) {
  const c=key?stGet(key):{};
  const cats=['健康保険 (月次)','厚生年金 (月次)','雇用保険 (月次)','労災保険 (年次)','源泉所得税 (月次)','住民税 (月次)','社会保険料 (納付)','給与振込','賞与支払','派遣労働者給与','退職金','労働組合費','社内交通費','事務用品','ソフトウェア','会計・顧問料','家賃','光熱費','通信費','その他'];
  const overlay=document.createElement('div');
  overlay.className='modal-overlay'; overlay.id='jp-cp-overlay';
  overlay.innerHTML=`
  <div class="modal" style="max-width:500px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <h3>${key?'支払編集':'新規支払登録'}</h3>
      <button class="btn btn-sm" onclick="document.getElementById('jp-cp-overlay').remove()">✕</button>
    </div>
    <div class="field" style="margin-bottom:12px"><label>内容 (Descrição) *</label>
      <input id="jc-desc" value="${c.descricao||''}" placeholder="例: 健康保険料4月分, 残業代清算..."></div>
    <div class="grid2" style="margin-bottom:12px">
      <div class="field"><label>金額 (¥) *</label><div class="suf"><input type="number" id="jc-valor" value="${c.valor||''}" step="100"><s>¥</s></div></div>
      <div class="field"><label>支払期限 *</label><input type="date" id="jc-venc" value="${c.vencimento||new Date().toISOString().split('T')[0]}"></div>
      <div class="field"><label>種別 (Categoria)</label><select id="jc-cat">${cats.map(ct=>`<option ${c.categoria===ct?'selected':''}>${ct}</option>`).join('')}</select></div>
      <div class="field"><label>状態 (Status)</label><select id="jc-status">
        <option value="pendente" ${(c.status||'pendente')==='pendente'?'selected':''}>未払い</option>
        <option value="pago" ${c.status==='pago'?'selected':''}>支払済</option>
        <option value="cancelado" ${c.status==='cancelado'?'selected':''}>キャンセル</option>
      </select></div>
      <div class="field"><label>支払先 (Fornecedor)</label><input id="jc-forn" value="${c.fornecedor||''}" placeholder="協会けんぽ, 年金機構..."></div>
      <div class="field"><label>支払方法 (Forma)</label><select id="jc-forma">
        ${['振込 (TED/PIX)','自動引落','口座振替','現金','その他'].map(f=>`<option ${c.formaPgto===f?'selected':''}>${f}</option>`).join('')}
      </select></div>
    </div>
    <div class="field" style="margin-bottom:1rem"><label>備考 (Obs)</label>
      <textarea id="jc-obs" rows="2" style="width:100%;padding:8px 12px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text);resize:vertical;font-family:inherit">${c.obs||''}</textarea>
    </div>
    <div id="jc-err" class="err" style="display:none;margin-bottom:.75rem"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="jpSaveCp('${key||''}')">保存 Salvar</button>
      <button class="btn" onclick="document.getElementById('jp-cp-overlay').remove()">キャンセル</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function jpSaveCp(key) {
  const desc=document.getElementById('jc-desc').value.trim();
  const valor=parseFloat(document.getElementById('jc-valor').value)||0;
  const venc=document.getElementById('jc-venc').value;
  const errEl=document.getElementById('jc-err');
  if(!desc){errEl.textContent='内容を入力してください。';errEl.style.display='block';return;}
  if(!valor){errEl.textContent='金額を入力してください。';errEl.style.display='block';return;}
  if(!venc){errEl.textContent='支払期限を入力してください。';errEl.style.display='block';return;}
  const ts=key?key.split('_').pop():Date.now();
  const k=key||JP_CP()+ts;
  stSet(k,{key:k,ts:parseInt(ts),descricao:desc,valor,vencimento:venc,
    categoria:document.getElementById('jc-cat').value,status:document.getElementById('jc-status').value,
    fornecedor:document.getElementById('jc-forn').value.trim(),
    formaPgto:document.getElementById('jc-forma').value,
    obs:document.getElementById('jc-obs').value.trim()});
  document.getElementById('jp-cp-overlay').remove();
  showToast(key?'支払情報を更新しました':'支払を登録しました！');
  jpRenderShiharai();
}
function jpMarcarPago(key){const c=stGet(key);if(!c)return;c.status='pago';c.dataPagamento=new Date().toISOString().split('T')[0];stSet(key,c);showToast('支払済にしました！');jpRenderShiharai();}
function jpDeleteCp(key){if(!confirm('このデータを削除しますか？'))return;stDel(key);jpRenderShiharai();}


/* ══════════════════════════════════════════════════════════════
   P2P CRIPTO — ProfitFlow Labs
   Marketplace descentralizado de compra/venda peer-to-peer
   Ativos: BTC · ETH · SOL · MATIC · USDC · USDT
   Redes:  Ethereum · Polygon · Solana
   Modelo: Anúncios + Escrow simulado + Chat + Reputação
   Storage: uid_p2p_ad_ts · uid_p2p_trade_ts · uid_p2p_msg_key
   ══════════════════════════════════════════════════════════════ */

// ── Constantes ────────────────────────────────────────────────
const P2P_ASSETS = {
  BTC:  { name:'Bitcoin',  symbol:'BTC',  cgId:'bitcoin',         color:'#f7931a', bg:'#fff3e0', logo:'₿' },
  ETH:  { name:'Ethereum', symbol:'ETH',  cgId:'ethereum',        color:'#627eea', bg:'#ede7f6', logo:'Ξ' },
  SOL:  { name:'Solana',   symbol:'SOL',  cgId:'solana',          color:'#9945ff', bg:'#f3e5f5', logo:'◎' },
  MATIC:{ name:'Polygon',  symbol:'MATIC',cgId:'matic-network',   color:'#8247e5', bg:'#ede7f6', logo:'⬡' },
  USDC: { name:'USD Coin', symbol:'USDC', cgId:'usd-coin',        color:'#2775ca', bg:'#e3f2fd', logo:'$' },
  USDT: { name:'Tether',   symbol:'USDT', cgId:'tether',          color:'#26a17b', bg:'#e8f5e9', logo:'₮' },
};
const P2P_NETWORKS = {
  ethereum:{ name:'Ethereum', short:'ETH', color:'#627eea', assets:['BTC','ETH','USDC','USDT','MATIC'] },
  polygon: { name:'Polygon',  short:'MATIC',color:'#8247e5',assets:['MATIC','USDC','USDT','ETH'] },
  solana:  { name:'Solana',   short:'SOL', color:'#9945ff', assets:['SOL','USDC','USDT'] },
};
const P2P_PAYMENT_METHODS = ['PIX','Transferência Bancária','TED/DOC','Boleto','PayPal','Wise','Crypto (outra rede)'];

// ── Storage ───────────────────────────────────────────────────
const P2P_AD    = () => session.user.uid + '_p2p_ad_';
const P2P_TRADE = () => session.user.uid + '_p2p_trade_';
const P2P_MSG   = (tradeKey) => 'p2p_msg_' + tradeKey;

function p2pAdsLoad(all=false) {
  if(all) {
    // Load ALL ads from all users (shared store for marketplace simulation)
    return stKeys('_p2p_ad_').map(k=>stGet(k)).filter(Boolean)
      .filter(a=>a.status==='active').sort((a,b)=>b.ts-a.ts);
  }
  return stKeys(P2P_AD()).map(k=>stGet(k)).filter(Boolean).sort((a,b)=>b.ts-a.ts);
}
function p2pTradesLoad() {
  return stKeys(P2P_TRADE()).map(k=>stGet(k)).filter(Boolean).sort((a,b)=>b.ts-a.ts);
}
function p2pMsgsLoad(tradeKey) { return stGet(P2P_MSG(tradeKey)) || []; }
function p2pMsgsSave(tradeKey,msgs) { stSet(P2P_MSG(tradeKey), msgs); }

// ── Live prices cache ─────────────────────────────────────────
let p2pPrices = {};
let p2pPricesTs = 0;

async function p2pFetchPrices() {
  if(Date.now()-p2pPricesTs < 60000 && Object.keys(p2pPrices).length) return;
  try {
    const ids = Object.values(P2P_ASSETS).map(a=>a.cgId).join(',');
    const data = await cgFetch(`/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
    Object.values(P2P_ASSETS).forEach(a=>{
      if(data[a.cgId]) p2pPrices[a.symbol] = { usd: data[a.cgId].usd, chg: data[a.cgId].usd_24h_change };
    });
    p2pPricesTs = Date.now();
  } catch(e) {
    // fallback prices
    p2pPrices = {
      BTC:  { usd:67500, chg:1.2 }, ETH: { usd:3400,  chg:0.8 },
      SOL:  { usd:172,   chg:2.1 }, MATIC:{ usd:0.85, chg:-0.5 },
      USDC: { usd:1.00,  chg:0.0 }, USDT:{ usd:1.00,  chg:0.0 },
    };
  }
}

function p2pFmt(v, sym='USD') {
  if(sym==='USD' || sym==='USDC' || sym==='USDT')
    return '$'+parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(parseFloat(v)<0.01) return parseFloat(v).toFixed(6)+' '+sym;
  if(parseFloat(v)<1)    return parseFloat(v).toFixed(4)+' '+sym;
  return parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:6})+' '+sym;
}

// ── State ─────────────────────────────────────────────────────
let p2pMainTab = 'mercado';   // mercado | meus-anuncios | minhas-operacoes
let p2pFilterAsset = 'ALL';
let p2pFilterNetwork = 'ALL';
let p2pFilterSide = 'ALL';    // ALL | buy | sell
let p2pActiveTrade = null;
let p2pChatInterval = null;

// ══ MAIN RENDER ════════════════════════════════════════════════
