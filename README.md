# ProfitFlow Labs — Estrutura de Arquivos

## Visão Geral

O app foi separado do `app.html` monolítico (15.409 linhas) em **20 arquivos** focados.

---

## Estrutura

```
profitflow/
├── index.html              ← Shell HTML + imports (sem lógica)
├── css/
│   └── styles.css          ← Todos os estilos (664 linhas)
└── js/
    ├── config.js           ← Firebase config, strings i18n PT/EN, applyTheme/Lang (270 linhas)
    ├── core.js             ← stGet/stSet, Firebase init, Firestore helpers, segurança, fingerprint, init(), sync (577 linhas)
    ├── pwa.js              ← Service Worker + Platform Modules (80 linhas)
    ├── auth.js             ← renderAuth, doLogout, login Google/GitHub (318 linhas)
    ├── shell.js            ← renderApp, sidebar, topbar, showToast (260 linhas)
    ├── landing.js          ← renderLanding (422 linhas)
    ├── dashboard.js        ← renderDashboard (698 linhas)
    ├── pools.js            ← Pool de Liquidez, URL parse, CoinGecko (1634 linhas)
    ├── pool_helpers.js     ← Snapshots, IL calc, renderYield, renderPositions (1288 linhas)
    ├── wallet.js           ← renderWallet, add asset modal (687 linhas)
    ├── finance.js          ← renderFinance, transações (443 linhas)
    ├── trading.js          ← renderCopyTrading, renderOptions (1033 linhas)
    ├── p2p.js              ← renderP2P e helpers (955 linhas)
    ├── billing.js          ← Stripe, paywall, planos, trial (432 linhas)
    ├── settings.js         ← renderSettings, perfil (396 linhas)
    ├── home.js             ← renderHome, módulos, finanças BR/JP, renderPositions (2208 linhas)
    ├── extras.js           ← Wallet link, relatórios, imóvel, consórcios, comunidade, profile (1423 linhas)
    ├── notif_board.js      ← renderNotifBoard, renderFAQ, dismiss helpers (346 linhas)
    ├── charts.js           ← Dashboard charts extras, activity heatmap (456 linhas)
    ├── export.js           ← Export wallet/finance/pools (224 linhas)
    ├── notifications.js    ← FCM push, VAPID, tokens (253 linhas)
    └── yield.js            ← Yield tracker + sync Firestore (166 linhas)
```

---

## Regra de Ouro ao Editar

| Quer editar...             | Arquivo          |
|---------------------------|------------------|
| Strings PT/EN             | `config.js`      |
| Firebase config           | `config.js`      |
| Tema / idioma             | `config.js`      |
| Segurança / fingerprint   | `core.js`        |
| Login / registro          | `auth.js`        |
| Sidebar / topbar          | `shell.js`       |
| Landing page              | `landing.js`     |
| Dashboard                 | `dashboard.js`   |
| Gráficos dashboard        | `charts.js`      |
| Pools de liquidez         | `pools.js`       |
| IL / Snapshots / Posições | `pool_helpers.js`|
| Carteira                  | `wallet.js`      |
| Finanças                  | `finance.js`     |
| Copy Trading / Opções     | `trading.js`     |
| P2P                       | `p2p.js`         |
| Planos / Stripe           | `billing.js`     |
| Configurações / Perfil    | `settings.js`    |
| Home / Notícias           | `home.js`        |
| Imóvel / Consórcios       | `extras.js`      |
| Notif board / FAQ         | `notif_board.js` |
| Push notifications        | `notifications.js`|
| Export (CSV/JSON)         | `export.js`      |
| Yield tracker             | `yield.js`       |
| PWA / Service Worker      | `pwa.js`         |
| Estilos globais           | `css/styles.css` |

---

## Ordem de Carregamento (obrigatória)

`config` → `core` → `pwa` → `auth` → `shell` → `landing` → `dashboard` → `pools` → `pool_helpers` → `wallet` → `finance` → `trading` → `p2p` → `billing` → `settings` → `home` → `extras` → `notif_board` → `charts` → `export` → `notifications` → `yield`

