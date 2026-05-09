#!/bin/bash
# ╔══════════════════════════════════════════════════════╗
# ║  CashFlow Labs — Deploy para Firebase Hosting        ║
# ║  Execute: bash deploy.sh                             ║
# ╚══════════════════════════════════════════════════════╝

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "  ╔═════════════════════════════════════╗"
echo "  ║   CashFlow Labs — Firebase Deploy   ║"
echo "  ╚═════════════════════════════════════╝"
echo -e "${NC}"

PROJECT_ID="cashflow-ae591"

# ── 1. Verificar Node.js ──────────────────────────────
echo -e "${YELLOW}[1/5] Verificando Node.js...${NC}"
if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ Node.js não encontrado.${NC}"
  echo "  → Instale em: https://nodejs.org (versão LTS)"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) encontrado${NC}"

# ── 2. Instalar Firebase CLI ─────────────────────────
echo -e "${YELLOW}[2/5] Verificando Firebase CLI...${NC}"
if ! command -v firebase &>/dev/null; then
  echo "  Instalando Firebase CLI..."
  npm install -g firebase-tools
fi
echo -e "${GREEN}✓ Firebase CLI $(firebase --version) pronto${NC}"

# ── 3. Login ─────────────────────────────────────────
echo -e "${YELLOW}[3/5] Login no Firebase...${NC}"
firebase login --no-localhost 2>/dev/null || firebase login

# ── 4. Criar estrutura do projeto ────────────────────
echo -e "${YELLOW}[4/5] Preparando projeto...${NC}"

DEPLOY_DIR="cashflow-deploy"
mkdir -p "$DEPLOY_DIR"

# Copiar arquivos HTML para a pasta de deploy
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/index_integrated.html" ]; then
  cp "$SCRIPT_DIR/index_integrated.html" "$DEPLOY_DIR/index.html"
  echo -e "  ${GREEN}✓ index_integrated.html → index.html${NC}"
elif [ -f "$SCRIPT_DIR/index.html" ]; then
  cp "$SCRIPT_DIR/index.html" "$DEPLOY_DIR/index.html"
  echo -e "  ${GREEN}✓ index.html copiado${NC}"
else
  echo -e "  ${RED}✗ Arquivo index_integrated.html não encontrado nesta pasta.${NC}"
  echo "     Coloque o script na mesma pasta dos arquivos HTML."
  exit 1
fi

if [ -f "$SCRIPT_DIR/admin.html" ]; then
  cp "$SCRIPT_DIR/admin.html" "$DEPLOY_DIR/admin.html"
  echo -e "  ${GREEN}✓ admin.html copiado${NC}"
fi

# Criar firebase.json
cat > "$DEPLOY_DIR/firebase.json" <<EOF
{
  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "**/.*"],
    "rewrites": [
      { "source": "/admin", "destination": "/admin.html" }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
        ]
      }
    ]
  }
}
EOF

# Criar .firebaserc
cat > "$DEPLOY_DIR/.firebaserc" <<EOF
{
  "projects": {
    "default": "$PROJECT_ID"
  }
}
EOF

echo -e "  ${GREEN}✓ firebase.json e .firebaserc criados${NC}"

# ── 5. Deploy ─────────────────────────────────────────
echo -e "${YELLOW}[5/5] Fazendo deploy...${NC}"
cd "$DEPLOY_DIR"
firebase deploy --only hosting

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗"
echo -e "║  ✅ Deploy concluído!                                  ║"
echo -e "║                                                        ║"
echo -e "║  App:   https://${PROJECT_ID}.web.app          ║"
echo -e "║  Admin: https://${PROJECT_ID}.web.app/admin    ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}"
