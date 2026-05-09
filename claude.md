# 📋 ProfitFlow News — claude.md

## 🎯 Resumo do Projeto
**ProfitFlow Labs News** é uma plataforma web de notícias financeiras com PWA (Progressive Web App) focada em DeFi, Criptomoedas, Ações, Forex e Educação Financeira. Usa Firebase Firestore como banco de dados.

**Status:** Em desenvolvimento  
**Tech Stack:** HTML5 + CSS3 + JavaScript (Vanilla) + Firebase  
**Deploy:** Firebase Hosting (cashflow-ae591.web.app)

---

## 📁 Estrutura do Projeto

```
projeto/
├── index.html        → Landing page / Home (News Feed)
├── app.html          → App principal (Leitor de notícias interativo)
├── admin.html        → Painel administrativo (Gestão de conteúdo)
├── manifest.json     → Configuração PWA
├── icon-192.png      → Ícone PWA pequeno
├── icon-512.png      → Ícone PWA grande
└── firebase.json     → Config Firebase Hosting
```

---

## 🎨 Design & Tema

### Cores Principais
- **Background:** #0d1117 (cinza muito escuro)
- **Accent Primário:** #638eff (azul claro)
- **Accent Secundário:** #39ff8a (verde neon)
- **Vermelho/Alerta:** #ff5370
- **Âmbar/Aviso:** #ffb74d

### Fonts
- **Headlines:** Syne (400, 600, 700, 800)
- **Body:** DM Sans (300, 400, 500)
- **Padrão:** DM Sans

### Efeitos Visuais
- **Glow verde:** `box-shadow: 0 0 16px rgba(57,255,138,0.3)`
- **Glow azul:** `box-shadow: 0 0 16px rgba(99,142,255,0.3)`
- **Border:** Azul semi-transparente `rgba(99,142,255,0.12-0.5)`

---

## 🏠 index.html (Landing Page)

### Seções Principais
1. **Ticker Bar** → Breaking news em scroll contínuo (fundo verde)
2. **Header/Nav** → Logo + Navegação + Login/Register
3. **Hero Section** → Call-to-action principal
4. **News Feed** → Grid de notícias
5. **Footer** → Links, sociais, copyright

### Funcionalidades
- PWA-ready (manifest.json, service worker)
- Responsive design (mobile-first)
- Firebase Auth (Login/Register)
- Notícias renderizadas do Firestore

---

## 🚀 app.html (Aplicativo Principal)

### Componentes Principais
1. **Sidebar/Nav** → Categorias (DeFi, Cripto, Ações, Forex, Educação)
2. **News Feed Dinâmico** → Carregamento de artigos por categoria
3. **Leitor de Artigo Expandido** → Modal com conteúdo completo
4. **User Panel** → Perfil, preferências, watchlist
5. **Search/Filter** → Buscar notícias por keywords

### Estados do App
- `authenticated` → User logado
- `guest` → User não autenticado
- `loading` → Carregando dados
- `error` → Erro de conexão/dados

### Firebase Integration
- **Collection:** `news` → Documentos de notícias
- **Campos obrigatórios:**
  - `title` (string)
  - `content` (text)
  - `category` (string: DeFi, Cripto, Ações, Forex, Educação)
  - `author` (string)
  - `timestamp` (date)
  - `image_url` (string)
  - `views` (number)
  - `likes` (number)

---

## ⚙️ admin.html (Painel Admin)

### Funcionalidades
1. **CRUD de Notícias**
   - Criar novo artigo
   - Editar artigos existentes
   - Deletar notícias
   - Publicar/Despublicar

2. **Dashboard Analytics**
   - Total de views por artigo
   - Engajamento (likes, comentários)
   - Trending topics

3. **Gestão de Usuários**
   - Listar usuários registrados
   - Bloquear/Desbloquear
   - Resetar senhas

4. **Categorias & Tags**
   - Criar/editar categorias
   - Adicionar tags a artigos

### Autenticação Admin
- Email + Password
- Role-based: `admin` flag no Firestore

---

## 🔐 Autenticação & Segurança

### Firebase Auth
- Sign up (email/password)
- Login
- Logout
- Reset password
- Social login (Google, Twitter)

### Firestore Security Rules
```javascript
// Base: Apenas autenticados podem ler news
match /news/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.admin == true;
}

// Users apenas podem ler seu próprio doc
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}
```

---

## 📡 Firebase Setup

### Credenciais Necessárias
```javascript
// Configurar em cada .html
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Collections Firestore
```
├── news/
│   └── {docId}
│       ├── title
│       ├── content
│       ├── category
│       ├── author
│       ├── timestamp
│       ├── image_url
│       ├── views
│       └── likes
├── users/
│   └── {userId}
│       ├── email
│       ├── displayName
│       ├── avatar
│       ├── preferences (array de categorias)
│       └── admin (boolean)
└── comments/
    └── {docId}
        ├── newsId
        ├── userId
        ├── text
        └── timestamp
```

---

## 🎯 Features Implementadas

### Landing Page (index.html)
- ✅ Breaking news ticker
- ✅ News grid responsivo
- ✅ Login/Register forms
- ✅ Dark theme
- ✅ PWA ready

### App (app.html)
- ✅ Feed de notícias filtrado por categoria
- ✅ Leitor de artigo completo
- ✅ User profile
- ✅ Dark mode
- ✅ Search/Filter

### Admin (admin.html)
- ✅ CRUD de notícias
- ✅ Dashboard com analytics
- ✅ Gestão de usuários
- ✅ Admin-only routes

---

## 🚀 Como Usar Este claude.md

### Para Limpar Conversa
1. **Copie este arquivo** para seu projeto
2. **Referencie antes de começar nova conversa:**
   > "Aqui está o claude.md do ProfitFlow. Por favor, carregue as informações dele."
3. **Claude carregará contexto automaticamente**
4. **Mantenha arquivo sempre atualizado** com mudanças no projeto

### Quando Atualizar
- Adicionar nova feature
- Mudar estrutura Firebase
- Adicionar novas páginas
- Mudar design/cores
- Novo tech stack

### Formato de Referência
- 📌 **Breve:** "Vamos melhorar o admin.html conforme o claude.md"
- 📌 **Detalhado:** "Conforme claude.md, a category deve ter X campos"

---

## 📝 Próximas Features (Backlog)

- [ ] Notificações push (Firebase Cloud Messaging)
- [ ] Comentários em artigos
- [ ] Sistema de ratings/reviews
- [ ] Wallet integration (cripto)
- [ ] Dark/Light theme toggle
- [ ] Multi-language (EN, ES)
- [ ] Mobile app nativa (React Native)
- [ ] API REST para terceiros

---

## 🐛 Bugs/Issues Conhecidos

_A preencher conforme surgem_

---

## 👥 Contato & Suporte

**Project Lead:** [Seu Nome]  
**Last Updated:** 2025-05-05  
**Version:** 1.0.0-beta

---

## 🔑 Dicas Rápidas

| Pergunta | Resposta |
|----------|----------|
| Onde mudo cores? | `:root {}` em cada `.html` (--blue, --green, etc) |
| Como adicionar notícia? | POST em `/news` Firestore com campos obrigatórios |
| Como fazer deploy? | `firebase deploy` no terminal |
| User admin como criar? | Set `admin: true` em `/users/{userId}` Firestore |
| PWA não funciona? | Verifica `manifest.json` e service worker registration |
| Firestore rejeitando? | Valida security rules e autenticação |
