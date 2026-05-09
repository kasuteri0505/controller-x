/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ProfitFlow Labs — Cloud Functions                             ║
 * ║  Dispara e-mail de boas-vindas ao criar novo usuário         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const { Resend } = require('resend');

admin.initializeApp();

/* ── Config — defina via: firebase functions:config:set resend.key="re_..." ── */
const RESEND_API_KEY  = functions.config().resend?.key  || process.env.RESEND_API_KEY;
const FROM_EMAIL      = functions.config().resend?.from || 'ProfitFlow Labs <noreply@profitflowlabs.io>';
const APP_URL         = 'https://cashflow-ae591.web.app';

/* ════════════════════════════════════════════════════════════════
   TRIGGER: Novo usuário criado no Firebase Auth
   ════════════════════════════════════════════════════════════════ */
exports.onUserCreated = functions
  .region('us-central1')
  .auth.user()
  .onCreate(async (user) => {
    const { uid, email, displayName } = user;
    if (!email) {
      console.log(`Usuário ${uid} sem e-mail — e-mail não enviado.`);
      return null;
    }

    const firstName = displayName
      ? displayName.split(' ')[0]
      : email.split('@')[0];

    /* ── Busca perfil no Firestore para pegar o nome registrado ── */
    try {
      const doc = await admin.firestore().collection('users').doc(uid).get();
      const profile = doc.exists ? doc.data() : {};
      const name = profile.name || profile.displayName || firstName;

      const resend = new Resend(RESEND_API_KEY);

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to:   email,
        subject: '👋 Bem-vindo ao ProfitFlow Labs!',
        html:  buildWelcomeEmail(name, email),
      });

      if (error) {
        console.error('Resend error:', error);
        return null;
      }

      /* ── Registra envio no Firestore ── */
      await admin.firestore()
        .collection('users')
        .doc(uid)
        .set({ welcomeEmailSent: true, welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

      console.log(`✅ E-mail de boas-vindas enviado para ${email} (id: ${data?.id})`);
      return { success: true };

    } catch (err) {
      console.error('onUserCreated error:', err);
      return null;
    }
  });

/* ════════════════════════════════════════════════════════════════
   TRIGGER: Admin envia e-mail manual via Firestore
   (Escreva em /admin_emails/{id} para disparar)
   ════════════════════════════════════════════════════════════════ */
exports.onAdminEmail = functions
  .region('us-central1')
  .firestore.document('admin_emails/{emailId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data?.to || !data?.subject || !data?.html) {
      console.warn('admin_emails: campos obrigatórios ausentes (to, subject, html)');
      return null;
    }

    try {
      const resend = new Resend(RESEND_API_KEY);
      const { data: result, error } = await resend.emails.send({
        from:    FROM_EMAIL,
        to:      data.to,
        subject: data.subject,
        html:    data.html,
      });

      if (error) {
        await snap.ref.update({ status: 'error', error: error.message });
        return null;
      }

      await snap.ref.update({ status: 'sent', sentAt: admin.firestore.FieldValue.serverTimestamp(), resendId: result?.id });
      console.log(`✅ Admin email enviado para ${data.to}`);
      return { success: true };

    } catch (err) {
      console.error('onAdminEmail error:', err);
      await snap.ref.update({ status: 'error', error: err.message });
      return null;
    }
  });

/* ════════════════════════════════════════════════════════════════
   HTML DO E-MAIL DE BOAS-VINDAS
   ════════════════════════════════════════════════════════════════ */
function buildWelcomeEmail(name, email) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bem-vindo ao ProfitFlow Labs</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 16px">
  <tr><td align="center">

    <!-- Card principal -->
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#0d1117 0%,#161d2a 100%);padding:40px 40px 32px;text-align:center">
          <!-- Logo -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px">
            <tr>
              <td style="background:linear-gradient(135deg,#4169e1,#39ff8a);width:52px;height:52px;border-radius:14px;text-align:center;vertical-align:middle">
                <span style="font-size:24px;font-weight:900;color:#ffffff;line-height:52px">C</span>
              </td>
              <td style="padding-left:14px;text-align:left;vertical-align:middle">
                <div style="font-size:20px;font-weight:800;color:#ffffff;line-height:1">ProfitFlow Labs</div>
                <div style="font-size:11px;color:#39ff8a;font-family:monospace;letter-spacing:0.1em;margin-top:3px">PLATAFORMA FINANCEIRA</div>
              </td>
            </tr>
          </table>
          <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.3">
            Bem-vindo, ${name}! 👋
          </h1>
          <p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.6">
            Sua conta foi criada com sucesso.<br>
            Explore o melhor do mercado financeiro.
          </p>
        </td>
      </tr>

      <!-- Corpo -->
      <tr>
        <td style="padding:40px">

          <p style="margin:0 0 28px;font-size:15px;color:#4a5568;line-height:1.7">
            Ficamos felizes em ter você na plataforma. O ProfitFlow Labs reúne tudo que você precisa para tomar decisões financeiras mais inteligentes — DeFi, cripto, ações, opções e muito mais.
          </p>

          <!-- Módulos em destaque -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px">
            <tr>
              <td style="padding-bottom:12px">
                <div style="font-size:11px;font-weight:700;color:#a0aec0;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px">O que você pode fazer agora</div>
              </td>
            </tr>
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${buildFeatureRow('🌊', 'Pool de Liquidez DeFi', 'Monitore suas posições em Uniswap, Aerodrome, Cetus e mais. Calcule Impermanent Loss em tempo real.')}
                  ${buildFeatureRow('₿', 'Carteira Multi-ativo', 'Acompanhe cripto, ações e renda fixa em um só lugar com gráficos de evolução patrimonial.')}
                  ${buildFeatureRow('📰', 'News Financeiro', 'Artigos semanais sobre DeFi, macro, ações e opções produzidos por especialistas.')}
                  ${buildFeatureRow('🔄', 'P2P Cripto', 'Compre e venda Bitcoin, ETH, SOL e stablecoins diretamente com outros usuários.')}
                  ${buildFeatureRow('◎', 'Mercado de Opções', 'Monte e gerencie estratégias de opções com calculadora de gregas integrada.')}
                </table>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px">
            <tr>
              <td align="center">
                <a href="${APP_URL}"
                   style="display:inline-block;background:#39ff8a;color:#0a0e18;font-size:15px;font-weight:800;text-decoration:none;padding:16px 40px;border-radius:10px;letter-spacing:0.02em">
                  Acessar o ProfitFlow Labs →
                </a>
              </td>
            </tr>
          </table>

          <!-- Trial info -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbf0;border:1px solid #fbd38d;border-radius:10px;margin-bottom:32px">
            <tr>
              <td style="padding:20px 24px">
                <div style="display:flex;align-items:center">
                  <span style="font-size:20px;margin-right:12px">⏰</span>
                  <div>
                    <div style="font-size:14px;font-weight:700;color:#744210;margin-bottom:4px">Período de avaliação de 30 dias</div>
                    <div style="font-size:13px;color:#975a16;line-height:1.5">
                      Você tem 30 dias para explorar todos os módulos gratuitamente. Nenhum cartão de crédito necessário agora.
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Divisor -->
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 28px">

          <!-- Conta -->
          <p style="margin:0;font-size:13px;color:#a0aec0;line-height:1.6">
            Esta conta está vinculada ao e-mail <strong style="color:#4a5568">${email}</strong>.<br>
            Se você não criou esta conta, ignore este e-mail.
          </p>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f7fafc;padding:24px 40px;border-top:1px solid #e2e8f0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="font-size:12px;color:#a0aec0;line-height:1.6">
                  © ${new Date().getFullYear()} ProfitFlow Labs. Todos os direitos reservados.<br>
                  <a href="${APP_URL}" style="color:#638eff;text-decoration:none">cashflow-ae591.web.app</a>
                </div>
              </td>
              <td align="right">
                <div style="font-size:20px">💹</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
    <!-- /Card -->

  </td></tr>
</table>

</body>
</html>`;
}

function buildFeatureRow(icon, title, desc) {
  return `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #f0f2f5;vertical-align:top">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:40px;vertical-align:top;padding-top:2px">
            <div style="width:36px;height:36px;background:#f7fafc;border-radius:9px;text-align:center;line-height:36px;font-size:18px">${icon}</div>
          </td>
          <td style="padding-left:14px;vertical-align:top">
            <div style="font-size:14px;font-weight:700;color:#1a202c;margin-bottom:3px">${title}</div>
            <div style="font-size:12px;color:#718096;line-height:1.5">${desc}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

/* ════════════════════════════════════════════════════════════════
   TRIGGER: push_jobs/{jobId} criado pelo admin
   Envia push para todos os usuários com FCM token
   ════════════════════════════════════════════════════════════════ */
exports.onPushJob = functions
  .region('us-central1')
  .firestore.document('push_jobs/{jobId}')
  .onCreate(async (snap, context) => {
    const job = snap.data();
    if (!job || job.status !== 'pending') return null;

    const { title, body, icon, module: mod, segment, requireInteraction, url } = job;

    try {
      // Mark as processing
      await snap.ref.update({ status: 'processing', processingAt: admin.firestore.FieldValue.serverTimestamp() });

      // Query users with push tokens based on segment
      let query = admin.firestore().collection('users').where('pushEnabled', '==', true);
      if (segment === 'pro')   query = query.where('plan', '==', 'pro');
      if (segment === 'trial') query = query.where('plan', '==', 'trial');
      if (segment === 'free')  query = query.where('plan', '==', 'free');

      const usersSnap = await query.get();
      const tokens = usersSnap.docs
        .map(d => d.data().fcmToken)
        .filter(Boolean);

      if (!tokens.length) {
        await snap.ref.update({ status: 'done', sent: 0, note: 'No tokens found' });
        return null;
      }

      // Split into batches of 500 (FCM limit)
      const batchSize = 500;
      let totalSent = 0;
      let totalFailed = 0;

      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        const message = {
          tokens: batch,
          notification: {
            title: `${icon || ''} ${title}`.trim(),
            body,
          },
          data: {
            module: mod || '',
            url:    url || 'https://cashflow-ae591.web.app/app.html',
            requireInteraction: requireInteraction ? 'true' : 'false',
          },
          webpush: {
            notification: {
              icon:   '/icon-192.png',
              badge:  '/icon-192.png',
              vibrate: [200, 100, 200],
              requireInteraction: !!requireInteraction,
              actions: mod
                ? [{ action:'open', title:'🚀 Abrir módulo' }, { action:'dismiss', title:'Ignorar' }]
                : [{ action:'open', title:'📱 Abrir app' }],
              data: { url, module: mod },
            },
            fcmOptions: { link: url || 'https://cashflow-ae591.web.app/app.html' },
          },
          android: {
            notification: {
              icon:  'ic_notification',
              color: '#39ff8a',
              sound: 'default',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            },
            priority: 'high',
          },
          apns: {
            payload: { aps: { sound: 'default', badge: 1 } },
          },
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        totalSent   += response.successCount;
        totalFailed += response.failureCount;

        // Clean up invalid tokens
        const invalidTokens = [];
        response.responses.forEach((r, idx) => {
          if (!r.success && (
            r.error?.code === 'messaging/invalid-registration-token' ||
            r.error?.code === 'messaging/registration-token-not-registered'
          )) {
            invalidTokens.push(batch[idx]);
          }
        });

        if (invalidTokens.length) {
          const cleanupBatch = admin.firestore().batch();
          usersSnap.docs.forEach(doc => {
            if (invalidTokens.includes(doc.data().fcmToken)) {
              cleanupBatch.update(doc.ref, { fcmToken: null, pushEnabled: false });
            }
          });
          await cleanupBatch.commit();
          console.log(`Cleaned up ${invalidTokens.length} invalid tokens`);
        }
      }

      await snap.ref.update({
        status:     'done',
        sent:       totalSent,
        failed:     totalFailed,
        doneAt:     admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update history doc
      const histSnap = await admin.firestore().collection('push_history')
        .where('sentBy', '==', job.sentBy)
        .orderBy('sentAt', 'desc').limit(1).get();
      if (!histSnap.empty) {
        await histSnap.docs[0].ref.update({ status:'sent', sent:totalSent, failed:totalFailed });
      }

      console.log(`✅ Push sent: ${totalSent} success, ${totalFailed} failed`);
      return { totalSent, totalFailed };

    } catch (err) {
      console.error('onPushJob error:', err);
      await snap.ref.update({ status: 'error', error: err.message });
      return null;
    }
  });
