async function loadPosts() {
  document.getElementById('posts-list').innerHTML = `<div class="loading"><div class="spinner"></div> Carregando...</div>`;
  try {
    const snap = await fbDb.collection('posts').orderBy('createdAt','desc').get();
    allPosts = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderPostList('posts-list', allPosts);
    document.getElementById('posts-subtitle').textContent = `${allPosts.length} posts · ${allPosts.filter(p=>p.published!==false).length} publicados`;
    document.getElementById('nav-posts-count').textContent = allPosts.length;
  } catch(e) {
    try {
      const snap = await fbDb.collection('posts').get();
      allPosts = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
      renderPostList('posts-list', allPosts);
    } catch(e2) {
      document.getElementById('posts-list').innerHTML = `<div class="info-box info-amber">Coleção "posts" ainda não existe. Crie o primeiro post para inicializá-la.</div>`;
    }
  }
}

function filterPosts() {
  const tag    = document.getElementById('post-filter-tag')?.value;
  const status = document.getElementById('post-filter-status')?.value;
  let posts = allPosts;
  if(tag)    posts = posts.filter(p=>p.tag===tag);
  if(status==='published') posts = posts.filter(p=>p.published!==false);
  if(status==='draft')     posts = posts.filter(p=>p.published===false);
  renderPostList('posts-list', posts);
}

function renderPostList(containerId, posts, mini=false) {
  const el = document.getElementById(containerId);
  if(!el) return;
  if(!posts.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📰</div><div class="empty-title">Nenhum post encontrado</div><div class="empty-sub">Crie o primeiro artigo para o News.</div><button class="btn btn-green" onclick="openPostModal()">+ Novo Post</button></div>`;
    return;
  }
  const tagClassMap = {
    'DeFi':'tag-defi','Cripto':'tag-cripto','Ações':'tag-acoes',
    'Economia':'tag-economia','Opções':'tag-opcoes'
  };
  el.innerHTML = posts.slice(0, mini?4:999).map(p => {
    const published = p.published !== false;
    const date = p.createdAt ? new Date(p.createdAt.seconds ? p.createdAt.seconds*1000 : p.createdAt).toLocaleDateString('pt-BR') : '—';
    return `
    <div class="post-card" style="border-left:3px solid ${published?'var(--green)':'var(--border)'}">
      <div class="post-card-header">
        <div class="post-emoji">${p.emoji||'📄'}</div>
        <div class="post-info">
          <div class="post-title">${escHtml(p.title||'Sem título')}</div>
          <div class="post-meta">
            <span class="${tagClassMap[p.tag]||''}">${p.tag||'—'}</span>
            <span>·</span>
            <span>${p.author||'ProfitFlow Labs'}</span>
            <span>·</span>
            <span>${date}</span>
            <span>·</span>
            <span>${p.readTime||'—'}</span>
            ${p.featured?'<span>⭐ Destaque</span>':''}
          </div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px;line-height:1.4">${escHtml((p.summary||'').slice(0,120))}${(p.summary||'').length>120?'...':''}</div>
        </div>
        ${!mini?`
        <div class="post-actions">
          <span class="badge ${published?'badge-green':'badge-gray'}">${published?'LIVE':'RASCUNHO'}</span>
          <button class="btn btn-xs" onclick="openPostModal('${p.id}')">✏️</button>
          <button class="btn btn-xs" onclick="togglePostPublished('${p.id}',${!published})">${published?'⏸ Pausar':'▶ Publicar'}</button>
          <button class="btn btn-xs btn-danger" onclick="deletePost('${p.id}')">🗑</button>
        </div>`:`<span class="badge ${published?'badge-green':'badge-gray'}" style="flex-shrink:0">${published?'LIVE':'RASCUNHO'}</span>`}
      </div>
    </div>`;
  }).join('');
}

function openPostModal(postId=null) {
  const post = postId ? allPosts.find(p=>p.id===postId) : null;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'post-modal';
  overlay.style.alignItems = 'flex-start';
  overlay.innerHTML = `
  <div class="modal" style="max-width:660px;margin:2rem auto">
    <div class="modal-header">
      <div>
        <div class="modal-title">${post?'Editar Post':'Novo Post'}</div>
        <div class="modal-sub">${post?post.title:'Criar novo artigo para o News'}</div>
      </div>
      <button class="modal-close" onclick="document.getElementById('post-modal').remove()">✕</button>
    </div>

    <div class="form-group">
      <label>Título *</label>
      <input type="text" id="pm-title" value="${escAttr(post?.title||'')}" placeholder="Título do artigo..."
        style="width:100%;height:42px;padding:0 14px;font-size:14px;border:1px solid var(--border2);border-radius:var(--radius);background:var(--bg3);color:var(--text);outline:none;font-family:var(--font-body)">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Categoria / Tag</label>
        <select id="pm-tag">
          <option value="DeFi" ${post?.tag==='DeFi'?'selected':''}>🌊 DeFi</option>
          <option value="Cripto" ${post?.tag==='Cripto'?'selected':''}>₿ Cripto</option>
          <option value="Ações" ${post?.tag==='Ações'?'selected':''}>📈 Ações</option>
          <option value="Economia" ${post?.tag==='Economia'?'selected':''}>🏛 Economia</option>
          <option value="Opções" ${post?.tag==='Opções'?'selected':''}>◎ Opções</option>
        </select>
      </div>
      <div class="form-group">
        <label>Emoji / Ícone</label>
        <input type="text" id="pm-emoji" value="${escAttr(post?.emoji||'📄')}"
          style="width:100%;height:38px;padding:0 14px;font-size:20px;border:1px solid var(--border2);border-radius:var(--radius);background:var(--bg3);color:var(--text);outline:none;font-family:var(--font-body)">
      </div>
    </div>
    <div class="form-group">
      <label>Resumo (Summary) *</label>
      <textarea id="pm-summary" rows="2" placeholder="Resumo exibido no card da lista...">${escHtml(post?.summary||'')}</textarea>
    </div>
    <div class="form-group">
      <label>Conteúdo completo (suporta HTML)</label>
      <textarea id="pm-content" rows="8" placeholder="Conteúdo completo do artigo... Suporta HTML básico: &lt;strong&gt;, &lt;em&gt;, &lt;br&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a href&gt;">${escHtml(post?.content||'')}</textarea>
    </div>
    <div class="form-group">
      <label>🖼 URL da Imagem de Capa (opcional)</label>
      <input type="text" id="pm-image" value="${escAttr(post?.imageUrl||'')}" placeholder="https://... (imagem que aparece no blog e no carrossel)"
        style="width:100%;height:38px;padding:0 12px;font-size:13px;border:1px solid var(--border2);border-radius:var(--radius);background:var(--bg3);color:var(--text);outline:none;font-family:var(--font-body)"
        oninput="updateImagePreview()">
      <div id="pm-image-preview" style="display:none;margin-top:6px;border-radius:8px;overflow:hidden;max-height:120px">
        <img id="pm-image-thumb" src="" style="width:100%;max-height:120px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Autor</label>
        <input type="text" id="pm-author" value="${escAttr(post?.author||'ProfitFlow Labs')}"
          style="width:100%;height:38px;padding:0 12px;font-size:13px;border:1px solid var(--border2);border-radius:var(--radius);background:var(--bg3);color:var(--text);outline:none;font-family:var(--font-body)">
      </div>
      <div class="form-group">
        <label>Tempo de leitura</label>
        <input type="text" id="pm-readtime" value="${escAttr(post?.readTime||'5 min')}"
          style="width:100%;height:38px;padding:0 12px;font-size:13px;border:1px solid var(--border2);border-radius:var(--radius);background:var(--bg3);color:var(--text);outline:none;font-family:var(--font-body)">
      </div>
    </div>
    <div style="display:flex;gap:1.5rem;margin-bottom:1.25rem">
      <label class="toggle">
        <input type="checkbox" id="pm-featured" ${post?.featured?'checked':''}>
        <div class="toggle-track"></div>
        <span class="toggle-label">⭐ Destaque (featured)</span>
      </label>
      <label class="toggle">
        <input type="checkbox" id="pm-published" ${(!post||post.published!==false)?'checked':''}>
        <div class="toggle-track"></div>
        <span class="toggle-label">📤 Publicar agora</span>
      </label>
    </div>
    <div class="info-box info-blue">
      💡 Posts publicados aparecem imediatamente no News para todos os usuários. Use "Rascunho" para salvar sem publicar.
    </div>
    <div style="display:flex;gap:8px;margin-top:1rem">
      <button class="btn btn-green" style="flex:1;justify-content:center" onclick="savePost('${postId||''}')">
        ${post?'💾 Salvar alterações':'📤 Criar Post'}
      </button>
      <button class="btn" onclick="document.getElementById('post-modal').remove()">Cancelar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function savePost(postId, forceDraft=false) {
  const title    = document.getElementById('pm-title')?.value.trim();
  const summary  = document.getElementById('pm-summary')?.value.trim();
  if(!title || !summary) { showToast('Título e resumo são obrigatórios.', 'warn'); return; }

  // Get content from rich editor or html-raw textarea
  const htmlRaw   = document.getElementById('pm-html-raw');
  const editorEl  = document.getElementById('pm-content-editor');
  const isHtmlMode = htmlRaw && htmlRaw.style.display !== 'none';
  const rawContent = isHtmlMode
    ? (htmlRaw.value || '')
    : (editorEl ? editorEl.innerHTML : '');

  // Sanitize: strip <script> tags for safety
  const content = rawContent.replace(/<script[\s\S]*?<\/script>/gi, '');

  const tag      = document.getElementById('pm-tag')?.value || 'DeFi';
  const tagClassMap = {'DeFi':'news-tag-defi','Cripto':'news-tag-cripto','Ações':'news-tag-acoes','Economia':'news-tag-economia','Opções':'news-tag-opcoes'};
  const isPublished = forceDraft === 'draft' ? false : (document.getElementById('pm-published')?.checked ?? true);
  const data = {
    title,
    summary,
    content,
    tag,
    tagClass:  tagClassMap[tag]||'',
    emoji:     document.getElementById('pm-emoji')?.value.trim() || '📄',
    author:    document.getElementById('pm-author')?.value.trim() || 'ProfitFlow Labs',
    readTime:  document.getElementById('pm-readtime')?.value.trim() || '5 min',
    imageUrl:  document.getElementById('pm-image')?.value.trim() || '',
    featured:  document.getElementById('pm-featured')?.checked || false,
    published: isPublished,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    wordCount: editorEl ? editorEl.innerText.split(/\s+/).filter(Boolean).length : 0,
  };

  try {
    if(postId) {
      await fbDb.collection('posts').doc(postId).set(data, {merge:true});
      addLog('post_edit', `Editou post: "${title}"`);
      showToast('✅ Post atualizado!', 'success');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.date = new Date().toLocaleDateString('pt-BR', {month:'short', year:'numeric'});
      const ref = await fbDb.collection('posts').add(data);
      allPosts.unshift({id:ref.id,...data});
      addLog('post_create', `Criou post: "${title}" (${data.published?'publicado':'rascunho'})`);
      showToast('✅ Post criado!', 'success');
    }
    document.getElementById('post-modal')?.remove();
    _panelCache['posts'] = 0;
    _panelCache['dashboard'] = 0;
    loadPosts();
    loadDashboard();
  } catch(e) {
    showToast('❌ Erro: '+e.message, 'error');
  }
}

async function togglePostPublished(postId, publish) {
  try {
    await fbDb.collection('posts').doc(postId).update({published: publish});
    const idx = allPosts.findIndex(p=>p.id===postId);
    if(idx>=0) allPosts[idx].published = publish;
    addLog('post_toggle', `Post ${postId} → ${publish?'publicado':'pausado'}`);
    showToast(publish ? '✅ Post publicado!' : '⏸ Post pausado.', 'success');
    loadPosts();
  } catch(e) {
    showToast('❌ Erro: '+e.message, 'error');
  }
}

async function deletePost(postId) {
  const post = allPosts.find(p=>p.id===postId);
  if(!confirm(`Deletar post "${post?.title||postId}"? Esta ação não pode ser desfeita.`)) return;
  try {
    await fbDb.collection('posts').doc(postId).delete();
    allPosts = allPosts.filter(p=>p.id!==postId);
    addLog('post_delete', `Deletou post: "${post?.title||postId}"`);
    showToast('🗑 Post removido.', 'success');
    _panelCache['posts'] = 0;
    _panelCache['dashboard'] = 0;
    loadPosts();
  } catch(e) {
    showToast('❌ Erro: '+e.message, 'error');
  }
}

/* ══ Analytics ══ */
let growthWindowDays = 30;

