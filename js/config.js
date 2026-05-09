const firebaseConfig = {
  apiKey:            "AIzaSyDOpo4jZJXL3GtoXJ7tbswfUJu01UerSJ8",
  authDomain:        "cashflow-ae591.firebaseapp.com",
  projectId:         "cashflow-ae591",
  storageBucket:     "cashflow-ae591.firebasestorage.app",
  messagingSenderId: "976016511064",
  appId:             "1:976016511064:web:d09bf315ebc80c68187a2d",
  measurementId:     "G-4E0D0XRF40"
};

const I18N = {
  'pt': {

    dashboard:'Dashboard', wallet:'Carteira', finance:'Finanças', positions:'Pool de Liquidez',
    settings:'Configurações', home:'News', copytrading:'Copy Trading', options:'Mercado de Opções',

    greeting_morning:'Bom dia', greeting_afternoon:'Boa tarde', greeting_evening:'Boa noite',

    logout:'Sair', profile:'Perfil & Configurações', theme:'Tema', language:'Idioma',
    dark:'Escuro', light:'Claro',
    connect_wallet:'Conectar Carteira', suggestions_bugs:'Sugestões/Bugs',

    save:'Salvar', cancel:'Cancelar', close:'Fechar', remove:'Remover', edit:'Editar',
    delete:'Excluir', confirm:'Confirmar', back:'Voltar', search:'Buscar',

    welcome:'Bem-vindo ao ProfitFlow Labs',
    total_patrimony:'Patrimônio total',
    create_pool:'+ Criar nova pool',
    defi_pools:'Pools DeFi',
    wallet_label:'Carteira',
    fees_collected:'Taxas coletadas',
    finance_balance:'Saldo Finanças',
    portfolio_alloc:'Alocação do portfólio',
    recent_pools:'Pools recentes',
    see_all:'Ver todas',
    pool_singular:'pool', pool_plural:'pools',
    asset_singular:'ativo', asset_plural:'ativos',
    in_wallet:'na carteira',
    d_active:'d ativo',
    in_fees:'em taxas',
    tips_title:'Dicas de Uso - Visão Geral',
    tips_metrics:'Métricas Principais',
    tips_metrics_desc:'Acompanhe seu patrimônio total, saldo e rendimento em tempo real.',
    tips_charts:'Gráficos',
    tips_charts_desc:'Use os gráficos para visualizar a evolução do seu portfólio ao longo do tempo.',
    tips_update:'Atualização',
    tips_update_desc:'Os dados são atualizados automaticamente. Use o botão de refresh para sincronizar informações da blockchain.',
    tips_settings:'Configurações',
    tips_settings_desc:'Personalize suas moedas preferidas e conexões de carteira no menu de configurações.',
    finance_btn:'Finanças →', wallet_btn:'Carteira →',
    no_pools_title:'Nenhuma pool criada ainda',
    no_pools_desc:'Clique em "+ Criar nova pool" para começar',

    pool_alloc_title:'Alocação dos ativos em pools',
    created_pools:'Pools criadas',
    analyses_saved:'Análises salvas',
    no_positions_title:'Nenhuma pool ou análise criada',
    no_positions_desc:'Crie sua primeira pool de liquidez para começar.',
    pool_total:'Total',
    deposited:'Depositado',
    hodl_value:'Valor HODL',
    pool_value:'Valor no pool',
    net_pnl:'P&L líquido',
    il:'IL',
    fees:'Taxas coletadas',
    active_days:'Dias ativo',
    snapshot:'Snapshot',
    save_snapshot:'Salvar snapshot',
    delete_pool:'Excluir pool',
    pool_detail:'Detalhes da pool',
    snapshot_history:'Histórico de snapshots',
    il_pct:'IL %',
    net_pnl_liq:'P&L Liq.',

    add_asset:'+ Adicionar ativo',
    allocation:'Alocação',
    current_alloc:'Atual',
    target_alloc:'Meta',
    total_portfolio:'Portfólio total',
    no_assets_title:'Nenhum ativo adicionado',
    no_assets_desc:'Adicione criptos, ações ou ETFs para acompanhar.',
    category:'Categoria',
    price:'Preço',
    qty:'Quantidade',
    value:'Valor',

    new_transaction:'+ Nova transação',
    income:'Receitas',
    expenses:'Despesas',
    balance:'Saldo',

    photo_identity:'Foto e identidade',
    change_photo:'Alterar foto',
    full_name:'Nome completo',
    nickname:'Apelido / Username',
    email:'E-mail',
    phone:'Telefone / WhatsApp',
    country:'País',
    timezone:'Fuso horário',
    bio:'Bio / Descrição',
    bio_placeholder:'Investidor DeFi, entusiasta de blockchain...',
    save_profile:'Salvar perfil',
    saved_ok:'✓ Salvo!',
    appearance:'Aparência',
    theme_hint:'Escolha entre tema escuro ou claro',
    language_hint:'Idioma da interface',
    display_currency:'Moeda de exibição',
    currency_hint:'Para conversões e formatação',
    security:'Segurança',
    change_password:'Alterar senha',
    notifications:'Notificações',
    danger_zone:'Zona de Perigo',
    delete_account:'Apagar conta',
    export_data:'Exportar dados',
    billing:'Planos & Assinatura',
    manage_subscription:'Gerenciar assinatura',
    current_plan:'Plano atual',
  },
  'en': {

    dashboard:'Dashboard', wallet:'Wallet', finance:'Finance', positions:'Liquidity Pools',
    settings:'Settings', home:'News', copytrading:'Copy Trading', options:'Options Market',

    greeting_morning:'Good morning', greeting_afternoon:'Good afternoon', greeting_evening:'Good evening',

    logout:'Sign out', profile:'Profile & Settings', theme:'Theme', language:'Language',
    dark:'Dark', light:'Light',
    connect_wallet:'Connect Wallet', suggestions_bugs:'Suggestions/Bugs',

    save:'Save', cancel:'Cancel', close:'Close', remove:'Remove', edit:'Edit',
    delete:'Delete', confirm:'Confirm', back:'Back', search:'Search',

    welcome:'Welcome to ProfitFlow Labs',
    total_patrimony:'Total portfolio',
    create_pool:'+ New pool',
    defi_pools:'DeFi Pools',
    wallet_label:'Wallet',
    fees_collected:'Fees collected',
    finance_balance:'Finance balance',
    portfolio_alloc:'Portfolio allocation',
    recent_pools:'Recent pools',
    see_all:'See all',
    pool_singular:'pool', pool_plural:'pools',
    asset_singular:'asset', asset_plural:'assets',
    in_wallet:'in wallet',
    d_active:'d active',
    in_fees:'in fees',
    tips_title:'Usage Tips - Overview',
    tips_metrics:'Key Metrics',
    tips_metrics_desc:'Track your total portfolio, balance and yield in real time.',
    tips_charts:'Charts',
    tips_charts_desc:'Use charts to visualize the evolution of your portfolio over time.',
    tips_update:'Updates',
    tips_update_desc:'Data is updated automatically. Use the refresh button to sync on-chain information.',
    tips_settings:'Settings',
    tips_settings_desc:'Customize your preferred currencies and wallet connections in the settings menu.',
    finance_btn:'Finance →', wallet_btn:'Wallet →',
    no_pools_title:'No pools created yet',
    no_pools_desc:'Click "+ New pool" to get started',

    pool_alloc_title:'Asset allocation in pools',
    created_pools:'Created pools',
    analyses_saved:'Saved analyses',
    no_positions_title:'No pools or analyses created',
    no_positions_desc:'Create your first liquidity pool to get started.',
    pool_total:'Total',
    deposited:'Deposited',
    hodl_value:'HODL value',
    pool_value:'Pool value',
    net_pnl:'Net P&L',
    il:'IL',
    fees:'Fees collected',
    active_days:'Days active',
    snapshot:'Snapshot',
    save_snapshot:'Save snapshot',
    delete_pool:'Delete pool',
    pool_detail:'Pool details',
    snapshot_history:'Snapshot history',
    il_pct:'IL %',
    net_pnl_liq:'Net P&L',

    add_asset:'+ Add asset',
    allocation:'Allocation',
    current_alloc:'Current',
    target_alloc:'Target',
    total_portfolio:'Total portfolio',
    no_assets_title:'No assets added',
    no_assets_desc:'Add crypto, stocks or ETFs to track.',
    category:'Category',
    price:'Price',
    qty:'Quantity',
    value:'Value',

    new_transaction:'+ New transaction',
    income:'Income',
    expenses:'Expenses',
    balance:'Balance',

    photo_identity:'Photo & identity',
    change_photo:'Change photo',
    full_name:'Full name',
    nickname:'Nickname / Username',
    email:'E-mail',
    phone:'Phone / WhatsApp',
    country:'Country',
    timezone:'Timezone',
    bio:'Bio / Description',
    bio_placeholder:'DeFi investor, blockchain enthusiast...',
    save_profile:'Save profile',
    saved_ok:'✓ Saved!',
    appearance:'Appearance',
    theme_hint:'Choose between dark or light theme',
    language_hint:'Interface language',
    display_currency:'Display currency',
    currency_hint:'For conversions and formatting',
    security:'Security',
    change_password:'Change password',
    notifications:'Notifications',
    danger_zone:'Danger Zone',
    delete_account:'Delete account',
    export_data:'Export data',
    billing:'Plans & Subscription',
    manage_subscription:'Manage subscription',
    current_plan:'Current plan',
  }
};

let appLang  = (['pt','en'].includes(localStorage.getItem('profitflow_lang')))
  ? localStorage.getItem('profitflow_lang') : 'pt';
let appTheme = localStorage.getItem('profitflow_theme') || 'dark';

function t(key) {
  return (I18N[appLang] || I18N['pt'])[key] || I18N['pt'][key] || key;
}

function applyTheme(theme) {
  appTheme = theme;
  localStorage.setItem('profitflow_theme', theme);
  document.body.classList.toggle('theme-light', theme === 'light');
}

function applyLang(lang) {
  if (lang !== 'pt' && lang !== 'en') lang = 'pt';
  appLang = lang;
  localStorage.setItem('profitflow_lang', lang);
  document.documentElement.lang = lang === 'en' ? 'en-US' : 'pt-BR';
  if (session) renderApp();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return t('greeting_morning');
  if (h < 18) return t('greeting_afternoon');
  return t('greeting_evening');
}

document.addEventListener('DOMContentLoaded', () => applyTheme(appTheme));