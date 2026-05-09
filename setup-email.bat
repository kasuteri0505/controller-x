@echo off
:: ╔══════════════════════════════════════════════════════════════╗
:: ║  CashFlow Labs — Setup E-mail de Boas-Vindas                 ║
:: ║  Execute: setup-email.bat                                    ║
:: ╚══════════════════════════════════════════════════════════════╝

echo.
echo  ╔═══════════════════════════════════════════╗
echo  ║   CashFlow Labs — Setup Email             ║
echo  ╚═══════════════════════════════════════════╝
echo.

:: Verificar se está na pasta certa
if not exist "firebase.json" (
  echo [ERRO] Execute este script na mesma pasta do firebase.json
  pause
  exit /b 1
)

:: Verificar se a pasta functions existe
if not exist "functions" (
  echo [ERRO] Pasta functions nao encontrada.
  echo Certifique-se que a pasta functions esta no mesmo diretorio.
  pause
  exit /b 1
)

echo [1/4] Instalando dependencias das functions...
cd functions
call npm install
cd ..
echo.

echo [2/4] Configurando API Key do Resend...
echo.
echo  Voce precisara da sua API Key do Resend.
echo  Se ainda nao tem uma conta, crie gratuitamente em:
echo  https://resend.com (3.000 emails/mes gratis)
echo.
set /p RESEND_KEY="  Cole aqui sua Resend API Key (re_...): "
echo.

call firebase functions:config:set resend.key="%RESEND_KEY%" resend.from="CashFlow Labs ^<noreply@cashflowlabs.io^>"

echo.
echo [3/4] Fazendo deploy das Functions...
call firebase deploy --only functions
echo.

echo [4/4] Configurando Firestore Rules para admin_emails...
echo.

echo  ╔══════════════════════════════════════════════════════╗
echo  ║  ✅ Setup concluido!                                 ║
echo  ║                                                      ║
echo  ║  Agora ao criar qualquer conta nova no app,          ║
echo  ║  o usuario recebera um e-mail de boas-vindas         ║
echo  ║  automaticamente.                                    ║
echo  ║                                                      ║
echo  ║  Teste: crie uma conta nova no app e verifique       ║
echo  ║  a caixa de entrada do e-mail usado.                 ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
pause
