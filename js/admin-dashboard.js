async function loadDashboard() {
  try {
    // ── Fetch all collections in parallel ──
    const [usersSnap, postsSnap, newsletterSnap] = await Promise.all([
      fbDb.collection('users').get(),
      fbDb.collection('posts').get(),
      fbDb.collection('newsletter_subscribers').get().catch(()=>({docs:[]})),
    ]);

    const users = usersSnap.docs.map(d=>({id:d.id,...d.data()}));
    const posts = postsSnap.docs.map(d=>({id:d.id,...d.data()}));
    allUsers = users;
    allPosts = posts;

    const now       = Date.now();
    const todayStart = startOfDay(now);
    const weekStart  = now - 7*86400000;
    const h24        = now - 86400000;

    // ── Derived metrics ──
    const proUsers    = users.filter(u=>u.plan==='pro'||u.plan==='Pro'||u.subscription?.status==='active');
    const trialUsers  = users.filter(u=>u.plan==='trial'||u.plan==='Trial');
    const publishedPosts = posts.filter(p=>p.published!==false);

    const activeUsers = users.filter(u => {
      const ll = tsToMs(u.lastLogin);
      return ll > h24;
    });

    const todayUsers = users.filter(u => {
      const ca = tsToMs(u.createdAt);
      return ca >= todayStart;
    });

    const weekUsers = users.filter(u => {
      const ca = tsToMs(u.createdAt);
      return ca >= weekStart;
    });

    const revenue = proUsers.length * 97;
    const newsletterCount = newsletterSnap.docs.length;

    // ── Update stat cards ──
    const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };

    set('stat-users',           users.length);
    set('stat-users-sub',       users.length === 1 ? 'usuário registrado' : 'usuários registrados');
    set('stat-active',          activeUsers.length);
    set('stat-active-sub',      activeUsers.length ? `${Math.round(activeUsers.length/users.length*100)}% do total` : 'via lastLogin');
    set('stat-pro',             proUsers.length);
    set('stat-pro-sub',         users.length ? `${Math.round(proUsers.length/users.length*100)}% do total` : '—');
    set('stat-posts',           publishedPosts.length);
    set('stat-posts-sub',       (posts.length - publishedPosts.length) + ' rascunhos');
    set('stat-revenue',         `R$${revenue.toLocaleString('pt-BR')}`);
    set('stat-revenue-sub',     `${proUsers.length} Pro × R$97`);
    set('stat-today',           todayUsers.length);
    set('stat-today-sub',       todayUsers.length === 1 ? 'novo hoje' : 'novos hoje');
    set('stat-newsletter',      newsletterCount);
    set('stat-week',            weekUsers.length);
    set('stat-week-sub',        'últimos 7 dias');
    set('nav-users-count',      users.length);
    set('nav-posts-count',      posts.length);

    // ── Recent users table ──
    const recent = [...users].sort((a,b)=>tsToMs(b.createdAt)-tsToMs(a.createdAt)).slice(0,5);
    renderUsersRows('recent-users-tbody', recent);

    // ── Recent posts ──
    renderPostList('recent-posts-list', [...posts].sort((a,b)=>tsToMs(b.createdAt)-tsToMs(a.createdAt)).slice(0,4), true);

    // ── Start real-time listener for new users ──
    startRealtimeListener();

  } catch(e) {
    console.error(e);
    showToast('Erro ao carregar dashboard: '+e.message, 'error');
  }
}

/* ── Real-time listener: updates stat-users live when someone registers ── */
function startRealtimeListener() {
  if(_realtimeUnsub) _realtimeUnsub();
  try {
    _realtimeUnsub = fbDb.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .onSnapshot(snap => {
        if(!snap.empty) {
          const newest = snap.docs[0].data();
          const isNew  = (Date.now() - tsToMs(newest.createdAt)) < 10000;
          if(isNew && allUsers.length > 0) {
            const newId = snap.docs[0].id;
            if(!allUsers.find(u=>u.id===newId)) {
              allUsers.unshift({id:newId,...newest});
              const el = document.getElementById('stat-users');
              if(el) {
                el.textContent = allUsers.length;
                el.style.color = 'var(--green)';
                setTimeout(()=>el.style.color='var(--blue)', 2000);
              }
              showToast(`🆕 Novo usuário: ${newest.email||'—'}`, 'success');
              addLog('realtime_event', `Novo usuário detectado: ${newest.email||snap.docs[0].id}`);
            }
          }
        }
      }, err => console.warn('Realtime listener error:', err));
  } catch(e) { /* indexing may not be ready */ }
}

/* ══ Users ══ */
