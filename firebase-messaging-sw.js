/* ══════════════════════════════════════════════════════════════════════
   firebase-messaging-sw.js — ProfitFlow Labs
   OBRIGATÓRIO para push notifications em background (FCM).
   Este arquivo DEVE ficar na raiz do domínio (/).
   ══════════════════════════════════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyDOpo4jZJXL3GtoXJ7tbswfUJu01UerSJ8",
  authDomain:        "cashflow-ae591.firebaseapp.com",
  projectId:         "cashflow-ae591",
  storageBucket:     "cashflow-ae591.firebasestorage.app",
  messagingSenderId: "976016511064",
  appId:             "1:976016511064:web:d09bf315ebc80c68187a2d",
  measurementId:     "G-4E0D0XRF40"
});

const messaging = firebase.messaging();

/* Notificações recebidas com o app em background ou fechado */
messaging.onBackgroundMessage(payload => {
  console.log('[FCM SW] Mensagem em background:', payload);
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'ProfitFlow Labs', {
    body:  body  || '',
    icon:  icon  || '/icon-192.png',
    badge: '/icon-192.png',
    tag:   'profitflow-bg-notif',
    data:  payload.data || {},
  });
});
