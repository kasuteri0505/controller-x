/* ══════════════════════════════════════════
   LANDING PAGE
   ══════════════════════════════════════════ */
function renderLanding() {
  R.innerHTML = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

    .ld-root {
      min-height: 100vh;
      background: #060a10;
      color: #e6edf3;
      font-family: 'DM Sans', sans-serif;
      overflow-x: hidden;
    }

    /* ── noise overlay ── */
    .ld-root::before {
      content: '';
      position: fixed; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E");
      pointer-events: none; z-index: 0; opacity: .5;
    }

    /* ── glow orbs ── */
    .ld-orb {
      position: fixed; border-radius: 50%; filter: blur(120px);
      pointer-events: none; z-index: 0;
    }
    .ld-orb1 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(57,255,138,.12) 0%, transparent 70%); top: -200px; left: -100px; }
    .ld-orb2 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(99,142,255,.10) 0%, transparent 70%); bottom: -150px; right: -100px; }
    .ld-orb3 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(255,183,77,.07) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%,-50%); }

    /* ── topbar ── */
    .ld-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.1rem 2.5rem;
      background: rgba(6,10,16,.7);
      backdrop-filter: blur(18px);
      border-bottom: 1px solid rgba(99,142,255,.10);
    }
    .ld-logo {
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: 20px;
      letter-spacing: -.03em; color: #fff;
      display: flex; align-items: center; gap: 9px;
    }
    .ld-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green, #39ff8a); box-shadow: 0 0 10px rgba(57,255,138,.7); }
    .ld-nav-links { display: flex; align-items: center; gap: 8px; }
    .ld-btn-ghost {
      padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 500;
      border: 1px solid rgba(99,142,255,.25); background: transparent; color: #90acff;
      cursor: pointer; transition: all .2s; font-family: inherit;
    }
    .ld-btn-ghost:hover { background: rgba(99,142,255,.1); border-color: rgba(99,142,255,.5); }
    .ld-btn-primary {
      padding: 9px 22px; border-radius: 8px; font-size: 13px; font-weight: 600;
      background: #39ff8a; color: #060a10; border: none; cursor: pointer;
      transition: all .2s; font-family: inherit;
      box-shadow: 0 0 20px rgba(57,255,138,.3);
    }
    .ld-btn-primary:hover { background: #5fffaa; box-shadow: 0 0 30px rgba(57,255,138,.5); transform: translateY(-1px); }

    /* ── hero ── */
    .ld-hero {
      position: relative; z-index: 1;
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center; padding: 8rem 2rem 5rem;
    }
    .ld-eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase;
      color: #39ff8a; background: rgba(57,255,138,.08);
      border: 1px solid rgba(57,255,138,.2); border-radius: 99px;
      padding: 5px 14px; margin-bottom: 1.75rem;
      animation: ld-fade-up .6s ease both;
    }
    .ld-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #39ff8a; animation: ld-pulse 2s infinite; }
    .ld-h1 {
      font-family: 'Syne', sans-serif;
      font-size: clamp(42px, 7vw, 86px);
      font-weight: 800; line-height: 1.0; letter-spacing: -.04em;
      color: #fff; margin-bottom: 1.25rem;
      animation: ld-fade-up .7s .1s ease both;
    }
    .ld-h1 .ld-accent {
      background: linear-gradient(135deg, #39ff8a 0%, #638eff 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .ld-sub {
      font-size: clamp(15px, 2vw, 18px); font-weight: 300; color: rgba(230,237,243,.55);
      max-width: 560px; line-height: 1.65; margin-bottom: 2.5rem;
      animation: ld-fade-up .7s .2s ease both;
    }
    .ld-cta-group {
      display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
      animation: ld-fade-up .7s .3s ease both;
    }
    .ld-btn-hero {
      padding: 14px 34px; border-radius: 10px; font-size: 15px; font-weight: 700;
      background: #39ff8a; color: #060a10; border: none; cursor: pointer;
      transition: all .2s; font-family: inherit;
      box-shadow: 0 0 30px rgba(57,255,138,.35), 0 4px 20px rgba(0,0,0,.3);
    }
    .ld-btn-hero:hover { background: #5fffaa; box-shadow: 0 0 50px rgba(57,255,138,.5); transform: translateY(-2px); }
    .ld-btn-outline {
      padding: 14px 34px; border-radius: 10px; font-size: 15px; font-weight: 600;
      background: transparent; color: #e6edf3;
      border: 1px solid rgba(230,237,243,.2); cursor: pointer;
      transition: all .2s; font-family: inherit;
    }
    .ld-btn-outline:hover { border-color: rgba(230,237,243,.5); background: rgba(255,255,255,.04); }

    /* ── stats strip ── */
    .ld-stats {
      display: flex; gap: 0; justify-content: center;
      border: 1px solid rgba(99,142,255,.12);
      border-radius: 14px; background: rgba(22,27,39,.6);
      backdrop-filter: blur(12px);
      margin: 4rem auto 0; max-width: 680px; width: 100%;
      animation: ld-fade-up .7s .4s ease both;
    }
    .ld-stat {
      flex: 1; padding: 1.5rem 1rem; text-align: center;
      border-right: 1px solid rgba(99,142,255,.10);
    }
    .ld-stat:last-child { border-right: none; }
    .ld-stat-val {
      font-family: 'Syne', sans-serif;
      font-size: 26px; font-weight: 800; color: #fff; line-height: 1;
      margin-bottom: 4px;
    }
    .ld-stat-lbl { font-size: 11px; color: rgba(230,237,243,.4); font-weight: 400; letter-spacing: .04em; }

    /* ── section ── */
    .ld-section { position: relative; z-index: 1; padding: 6rem 2rem; max-width: 1100px; margin: 0 auto; }
    .ld-section-label {
      font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
      color: #638eff; margin-bottom: .75rem;
    }
    .ld-section-title {
      font-family: 'Syne', sans-serif;
      font-size: clamp(28px, 4vw, 46px); font-weight: 800;
      letter-spacing: -.03em; color: #fff; line-height: 1.1;
      margin-bottom: 1rem;
    }
    .ld-section-desc { font-size: 15px; color: rgba(230,237,243,.5); max-width: 500px; line-height: 1.65; margin-bottom: 3rem; }

    /* ── features grid ── */
    .ld-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(99,142,255,.08); border-radius: 16px; overflow: hidden; border: 1px solid rgba(99,142,255,.12); }
    .ld-feat {
      background: #0d1117; padding: 2rem 1.75rem;
      transition: background .2s;
    }
    .ld-feat:hover { background: #111827; }
    .ld-feat-icon {
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; margin-bottom: 1rem;
    }
    .ld-feat-name { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: #fff; margin-bottom: .5rem; }
    .ld-feat-desc { font-size: 13px; color: rgba(230,237,243,.45); line-height: 1.6; }

    /* ── modules showcase ── */
    .ld-modules { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .ld-module-card {
      background: rgba(22,27,39,.7); border: 1px solid rgba(99,142,255,.10);
      border-radius: 14px; padding: 1.5rem;
      transition: border-color .2s, transform .2s;
    }
    .ld-module-card:hover { border-color: rgba(99,142,255,.3); transform: translateY(-3px); }
    .ld-module-card.green { border-color: rgba(57,255,138,.12); }
    .ld-module-card.green:hover { border-color: rgba(57,255,138,.35); }
    .ld-mod-tag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; padding: 2px 8px; border-radius: 99px; margin-bottom: .75rem; display: inline-block; }
    .ld-mod-tag.live { background: rgba(57,255,138,.12); color: #39ff8a; border: 1px solid rgba(57,255,138,.25); }
    .ld-mod-tag.new  { background: rgba(99,142,255,.12); color: #90acff; border: 1px solid rgba(99,142,255,.25); }
    .ld-mod-tag.beta { background: rgba(255,183,77,.12); color: #ffd082; border: 1px solid rgba(255,183,77,.25); }
    .ld-mod-icon { font-size: 28px; margin-bottom: .75rem; }
    .ld-mod-name { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; color: #fff; margin-bottom: .4rem; }
    .ld-mod-desc { font-size: 13px; color: rgba(230,237,243,.45); line-height: 1.6; }

    /* ── partner ── */
    .ld-partner {
      position: relative; z-index: 1;
      padding: 2rem; max-width: 1100px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between; gap: 2rem;
      background: rgba(22,27,39,.6); border: 1px solid rgba(99,142,255,.1);
      border-radius: 16px; flex-wrap: wrap;
    }

    /* ── CTA bottom ── */
    .ld-cta-bottom {
      position: relative; z-index: 1;
      text-align: center; padding: 7rem 2rem;
      background: radial-gradient(ellipse 80% 60% at 50% 100%, rgba(57,255,138,.06) 0%, transparent 70%);
    }

    /* ── footer ── */
    .ld-footer {
      position: relative; z-index: 1;
      text-align: center; padding: 2rem;
      border-top: 1px solid rgba(99,142,255,.08);
      font-size: 12px; color: rgba(230,237,243,.2);
    }

    /* ── divider line ── */
    .ld-divider { border: none; border-top: 1px solid rgba(99,142,255,.08); margin: 0; }

    /* ── animations ── */
    @keyframes ld-fade-up {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes ld-pulse {
      0%, 100% { opacity: 1; } 50% { opacity: .35; }
    }
    @keyframes ld-float {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-8px); }
    }

    /* ── responsive ── */
    @media(max-width: 768px) {
      .ld-nav { padding: 1rem 1.25rem; }
      .ld-features { grid-template-columns: 1fr 1fr; }
      .ld-modules  { grid-template-columns: 1fr; }
      .ld-stats    { flex-direction: column; }
      .ld-stat     { border-right: none; border-bottom: 1px solid rgba(99,142,255,.10); }
      .ld-stat:last-child { border-bottom: none; }
    }
    @media(max-width: 480px) {
      .ld-features { grid-template-columns: 1fr; }
      .ld-nav .ld-btn-ghost { display: none; }
    }
  </style>

  <div class="ld-root">
    <!-- background orbs -->
    <div class="ld-orb ld-orb1"></div>
    <div class="ld-orb ld-orb2"></div>
    <div class="ld-orb ld-orb3"></div>

    <!-- ── NAVBAR ── -->
    <nav class="ld-nav">
      <div class="ld-logo">
        <div class="ld-logo-dot"></div>
        ProfitFlow Labs
      </div>
      <div class="ld-nav-links">
        <button class="ld-btn-ghost" onclick="renderAuth('login')">Entrar</button>
        <button class="ld-btn-primary" onclick="renderAuth('register')">Criar conta grátis</button>
      </div>
    </nav>

    <!-- ── HERO ── -->
    <section class="ld-hero">
      <div class="ld-eyebrow">
        <div class="ld-eyebrow-dot"></div>
        Plataforma DeFi &amp; Finanças — Beta Aberto
      </div>
      <h1 class="ld-h1">
        Gerencie tudo.<br>
        <span class="ld-accent">Cresça sem limites.</span>
      </h1>
      <p class="ld-sub">
        Do pool de liquidez DeFi às suas finanças pessoais — uma plataforma completa para investidores que pensam além.
      </p>
      <div class="ld-cta-group">
        <button class="ld-btn-hero" onclick="renderAuth('register')">Começar gratuitamente →</button>
        <button class="ld-btn-outline" onclick="renderAuth('login')">Já tenho conta</button>
      </div>

      <!-- stats -->
      <div class="ld-stats">
        <div class="ld-stat">
          <div class="ld-stat-val">8+</div>
          <div class="ld-stat-lbl">Módulos ativos</div>
        </div>
        <div class="ld-stat">
          <div class="ld-stat-val">10+</div>
          <div class="ld-stat-lbl">Redes blockchain</div>
        </div>
        <div class="ld-stat">
          <div class="ld-stat-val">P2P</div>
          <div class="ld-stat-lbl">Cripto interno</div>
        </div>
        <div class="ld-stat">
          <div class="ld-stat-val">100%</div>
          <div class="ld-stat-lbl">Seus dados</div>
        </div>
      </div>
    </section>

    <hr class="ld-divider">

    <!-- ── FEATURES ── -->
    <section class="ld-section">
      <div class="ld-section-label">O que você encontra aqui</div>
      <h2 class="ld-section-title">Uma suite completa<br>para o investidor moderno</h2>
      <p class="ld-section-desc">Cada ferramenta foi construída com dados reais, cálculos precisos e uma experiência que respeita seu tempo.</p>

      <div class="ld-features">
        <div class="ld-feat">
          <div class="ld-feat-icon" style="background:rgba(57,255,138,.1)">🌊</div>
          <div class="ld-feat-name">Pool de Liquidez DeFi</div>
          <div class="ld-feat-desc">Calcule Impermanent Loss em tempo real, simule cenários e acompanhe todas as suas posições em pools.</div>
        </div>
        <div class="ld-feat">
          <div class="ld-feat-icon" style="background:rgba(99,142,255,.1)">📊</div>
          <div class="ld-feat-name">Dashboard Unificado</div>
          <div class="ld-feat-desc">Patrimônio total, P&L, alocação por categoria — visão 360° de todos os seus ativos em um painel só.</div>
        </div>
        <div class="ld-feat">
          <div class="ld-feat-icon" style="background:rgba(255,183,77,.1)">💱</div>
          <div class="ld-feat-name">P2P Cripto Interno</div>
          <div class="ld-feat-desc">Compre e venda cripto diretamente com outros usuários da plataforma, com saldo interno e rede Polygon.</div>
        </div>
        <div class="ld-feat">
          <div class="ld-feat-icon" style="background:rgba(255,83,112,.1)">📈</div>
          <div class="ld-feat-name">Mercado de Opções</div>
          <div class="ld-feat-desc">Registre e analise posições de opções, com cálculo de prêmio, P&L estimado e gestão de vencimentos.</div>
        </div>
        <div class="ld-feat">
          <div class="ld-feat-icon" style="background:rgba(192,132,252,.1)">🔁</div>
          <div class="ld-feat-name">Copy Trading</div>
          <div class="ld-feat-desc">Acompanhe traders de referência, monitore estratégias e replique posições com controle total.</div>
        </div>
        <div class="ld-feat">
          <div class="ld-feat-icon" style="background:rgba(57,255,138,.1)">💼</div>
          <div class="ld-feat-name">Finanças Pessoais</div>
          <div class="ld-feat-desc">Receitas, despesas, fluxo de caixa e categorias — controle financeiro integrado ao seu portfólio de investimentos.</div>
        </div>
      </div>
    </section>

    <hr class="ld-divider">

    <!-- ── MODULES ── -->
    <section class="ld-section">
      <div class="ld-section-label">Módulos disponíveis</div>
      <h2 class="ld-section-title">Tudo em um só lugar,<br>sem complexidade</h2>
      <p class="ld-section-desc">Ative apenas o que precisa. Cada módulo é independente e se conecta ao ecossistema.</p>

      <div class="ld-modules">
        <div class="ld-module-card green">
          <span class="ld-mod-tag live">Ativo</span>
          <div class="ld-mod-icon">🌊</div>
          <div class="ld-mod-name">Pools DeFi &amp; IL</div>
          <div class="ld-mod-desc">Simulador de Impermanent Loss, curva IL, tabela de cenários, histórico de taxas coletadas e preços ao vivo via CoinGecko.</div>
        </div>
        <div class="ld-module-card green">
          <span class="ld-mod-tag live">Ativo</span>
          <div class="ld-mod-icon">◎</div>
          <div class="ld-mod-name">Carteira Multi-Ativo</div>
          <div class="ld-mod-desc">Cripto, ações, ETFs, FIIs — cotações ao vivo, alocação em donut chart, P&L por ativo e filtro por categoria.</div>
        </div>
        <div class="ld-module-card">
          <span class="ld-mod-tag new">Novo</span>
          <div class="ld-mod-icon">💱</div>
          <div class="ld-mod-name">P2P Cripto Polygon</div>
          <div class="ld-mod-desc">Mercado peer-to-peer em beta, com fluxo de escrow simulado para testes e identificação de conta.</div>
        </div>
        <div class="ld-module-card">
          <span class="ld-mod-tag live">Ativo</span>
          <div class="ld-mod-icon">📊</div>
          <div class="ld-mod-name">Finanças Pessoais</div>
          <div class="ld-mod-desc">Controle de receitas e despesas, fluxo de caixa mensal, gráfico de evolução patrimonial e relatórios exportáveis.</div>
        </div>
        <div class="ld-module-card">
          <span class="ld-mod-tag beta">Beta</span>
          <div class="ld-mod-icon">📈</div>
          <div class="ld-mod-name">Opções &amp; Derivativos</div>
          <div class="ld-mod-desc">Registro de calls e puts, P&L estimado, gestão de vencimentos e análise de posições abertas.</div>
        </div>
        <div class="ld-module-card">
          <span class="ld-mod-tag beta">Beta</span>
          <div class="ld-mod-icon">🔁</div>
          <div class="ld-mod-name">Copy Trading</div>
          <div class="ld-mod-desc">Siga traders, acompanhe estratégias e replique operações com controle de risco e histórico de performance.</div>
        </div>
      </div>
    </section>

    <hr class="ld-divider">

    <!-- ── PARTNER ── -->
    <div style="position:relative;z-index:1;padding:0 2rem;max-width:1100px;margin:3rem auto">
      <div class="ld-partner">
        <div>
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(230,237,243,.25);margin-bottom:6px">Parceiro oficial</div>
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#fff;margin-bottom:4px">RoboForex</div>
          <div style="font-size:14px;color:rgba(230,237,243,.5);margin-bottom:1rem">Trade without Limits — Corretora global com spreads competitivos</div>
          <a href="https://roboforex.com/?utm_source=domain&utm_medium=affbanerimg&utm_content=size250_250&utm_campaign=afftrade_without_limits&a=hcuz" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 22px;border-radius:8px;background:rgba(57,255,138,.1);border:1px solid rgba(57,255,138,.25);color:#39ff8a;font-size:13px;font-weight:600;text-decoration:none;transition:all .2s" onmouseover="this.style.background='rgba(57,255,138,.18)'" onmouseout="this.style.background='rgba(57,255,138,.1)'">Conhecer a RoboForex →</a>
        </div>
        <a href="https://roboforex.com/?utm_source=domain&utm_medium=affbanerimg&utm_content=size250_250&utm_campaign=afftrade_without_limits&a=hcuz" target="_blank" rel="noopener noreferrer" class="hcuz" style="flex-shrink:0;display:block;border-radius:12px;overflow:hidden;border:1px solid rgba(99,142,255,.15);transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 12px 40px rgba(0,0,0,.4)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <img src="http://my.roboforex.com/files/banners/89_en_rbfx_250x250__f3e929cb40f89a0fae8567a1863cc4ab.jpg" style="display:block;width:200px;height:200px;object-fit:cover" alt="RoboForex — Trade without Limits">
        </a>
      </div>
    </div>

    <!-- ── CTA BOTTOM ── -->
    <div class="ld-cta-bottom">
      <div class="ld-eyebrow" style="margin:0 auto 1.75rem">
        <div class="ld-eyebrow-dot"></div>
        Comece hoje, é gratuito
      </div>
      <h2 class="ld-section-title" style="max-width:600px;margin:0 auto 1rem">Pronto para ter controle<br>total do seu dinheiro?</h2>
      <p style="font-size:15px;color:rgba(230,237,243,.45);margin-bottom:2.5rem">Crie sua conta em menos de 30 segundos. Sem cartão de crédito.</p>
      <button class="ld-btn-hero" onclick="renderAuth('register')" style="font-size:16px;padding:16px 44px">Criar conta grátis →</button>
    </div>

    <!-- ── FOOTER ── -->
    <footer class="ld-footer">
      © 2025 ProfitFlow Labs · Todos os direitos reservados · <a href="mailto:legal@profitflowlabs.io" style="color:inherit;text-decoration:none">legal@profitflowlabs.io</a>
    </footer>

  </div>`;
}

