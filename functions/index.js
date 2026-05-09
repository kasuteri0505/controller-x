/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CashFlow Labs — Cloud Functions                             ║
 * ║  Dispara e-mail de boas-vindas ao criar novo usuário         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const functions = require('firebase-functions/v1');
const admin     = require('firebase-admin');
const { Resend } = require('resend');
const Stripe = require('stripe');

admin.initializeApp();

function getLegacyConfig() {
  try {
    return typeof functions.config === 'function' ? functions.config() : {};
  } catch (err) {
    return {};
  }
}

const LEGACY_CONFIG = getLegacyConfig();

/* ── Config — defina via: firebase functions:config:set resend.key="re_..." ── */
const RESEND_API_KEY  = LEGACY_CONFIG.resend?.key  || process.env.RESEND_API_KEY;
const FROM_EMAIL      = LEGACY_CONFIG.resend?.from || process.env.FROM_EMAIL || 'CashFlow Labs <noreply@cashflowlabs.io>';
const APP_URL         = 'https://cashflow-ae591.web.app';
const STRIPE_SECRET_KEY = LEGACY_CONFIG.stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = LEGACY_CONFIG.stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_ALLOWED_PRICE_IDS = (
  LEGACY_CONFIG.stripe?.price_ids ||
  process.env.STRIPE_ALLOWED_PRICE_IDS ||
  process.env.STRIPE_PRICE_ID ||
  ''
).split(',').map(s => s.trim()).filter(Boolean);

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
        subject: '👋 Bem-vindo ao CashFlow Labs!',
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
<title>Bem-vindo ao CashFlow Labs</title>
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
                <div style="font-size:20px;font-weight:800;color:#ffffff;line-height:1">CashFlow Labs</div>
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
            Ficamos felizes em ter você na plataforma. O CashFlow Labs reúne tudo que você precisa para tomar decisões financeiras mais inteligentes — DeFi, cripto, ações, opções e muito mais.
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
                  Acessar o CashFlow Labs →
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
                  © ${new Date().getFullYear()} CashFlow Labs. Todos os direitos reservados.<br>
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

function setCors(req, res) {
  const allowedOrigins = new Set([
    'https://cashflow-ae591.web.app',
    'https://cashflow-ae591.firebaseapp.com',
    'http://localhost:5000',
    'http://localhost:5173',
  ]);
  const origin = req.get('origin');
  if (allowedOrigins.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function requireFirebaseUser(req) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) throw new Error('missing-auth-token');
  return admin.auth().verifyIdToken(match[1]);
}

function getStripe() {
  if (!STRIPE_SECRET_KEY) throw new Error('stripe-not-configured');
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
}

exports.createCheckoutSession = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' });

    try {
      const decoded = await requireFirebaseUser(req);
      const { priceId } = req.body || {};
      if (!priceId) return res.status(400).json({ error: 'missing-price-id' });
      if (STRIPE_ALLOWED_PRICE_IDS.length && !STRIPE_ALLOWED_PRICE_IDS.includes(priceId)) {
        return res.status(400).json({ error: 'invalid-price-id' });
      }

      const userDoc = await admin.firestore().collection('users').doc(decoded.uid).get();
      const user = userDoc.exists ? userDoc.data() : {};
      const stripe = getStripe();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: decoded.email || user.email || undefined,
          name: user.name || user.displayName || undefined,
          metadata: { uid: decoded.uid },
        });
        customerId = customer.id;
        await userDoc.ref.set({ stripeCustomerId: customerId }, { merge: true });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${APP_URL}/app.html?stripe_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/app.html?stripe_cancelled=1`,
        client_reference_id: decoded.uid,
        metadata: { uid: decoded.uid },
        subscription_data: { metadata: { uid: decoded.uid } },
        allow_promotion_codes: true,
      });

      return res.status(200).json({ url: session.url });
    } catch (err) {
      console.error('createCheckoutSession error:', err);
      const code = err.message === 'missing-auth-token' ? 401 : 500;
      return res.status(code).json({ error: err.message || 'internal-error' });
    }
  });

exports.stripeWebhook = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    let event = req.body;

    try {
      const stripe = getStripe();
      if (STRIPE_WEBHOOK_SECRET) {
        const sig = req.get('stripe-signature');
        event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const uid = session.metadata?.uid || session.client_reference_id;
        if (uid) {
          await admin.firestore().collection('users').doc(uid).set({
            plan: 'pro',
            subscription: {
              plan: 'monthly',
              status: 'active',
              method: 'stripe',
              stripeCustomerId: session.customer || null,
              stripeSubscriptionId: session.subscription || null,
              checkoutSessionId: session.id,
              start: Date.now(),
            },
            stripeCustomerId: session.customer || null,
          }, { merge: true });
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object;
        const uid = sub.metadata?.uid;
        if (uid) {
          await admin.firestore().collection('users').doc(uid).set({
            plan: 'free',
            subscription: {
              status: 'cancelled',
              method: 'stripe',
              stripeSubscriptionId: sub.id,
              cancelledAt: Date.now(),
            },
          }, { merge: true });
        }
      }

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('stripeWebhook error:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

exports.onPushJob = functions
  .region('us-central1')
  .firestore.document('push_jobs/{jobId}')
  .onCreate(async (snap) => {
    const job = snap.data();
    if (!job || job.status !== 'pending') return null;

    const { title, body, icon, module: mod, segment, requireInteraction, url } = job;

    try {
      await snap.ref.update({
        status: 'processing',
        processingAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      let query = admin.firestore().collection('users').where('pushEnabled', '==', true);
      if (segment === 'pro') query = query.where('plan', '==', 'pro');
      if (segment === 'trial') query = query.where('plan', '==', 'trial');
      if (segment === 'free') query = query.where('plan', '==', 'free');

      const usersSnap = await query.get();
      const tokens = usersSnap.docs.map(d => d.data().fcmToken).filter(Boolean);

      if (!tokens.length) {
        await snap.ref.update({ status: 'done', sent: 0, failed: 0, note: 'No tokens found' });
        return null;
      }

      const batchSize = 500;
      let totalSent = 0;
      let totalFailed = 0;

      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        const message = {
          tokens: batch,
          notification: {
            title: `${icon || ''} ${title || 'ProfitFlow Labs'}`.trim(),
            body: body || '',
          },
          data: {
            module: mod || '',
            url: url || `${APP_URL}/app.html`,
            requireInteraction: requireInteraction ? 'true' : 'false',
          },
          webpush: {
            notification: {
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              requireInteraction: !!requireInteraction,
              data: { url: url || `${APP_URL}/app.html`, module: mod || '' },
            },
            fcmOptions: { link: url || `${APP_URL}/app.html` },
          },
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        totalSent += response.successCount;
        totalFailed += response.failureCount;

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
        }
      }

      await snap.ref.update({
        status: 'done',
        sent: totalSent,
        failed: totalFailed,
        doneAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (job.sentBy) {
        const histSnap = await admin.firestore().collection('push_history')
          .where('sentBy', '==', job.sentBy)
          .orderBy('sentAt', 'desc')
          .limit(1)
          .get();
        if (!histSnap.empty) {
          await histSnap.docs[0].ref.update({ status: 'sent', sent: totalSent, failed: totalFailed });
        }
      }

      return { totalSent, totalFailed };
    } catch (err) {
      console.error('onPushJob error:', err);
      await snap.ref.update({ status: 'error', error: err.message });
      return null;
    }
  });
