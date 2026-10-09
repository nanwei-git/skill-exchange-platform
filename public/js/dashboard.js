document.addEventListener('DOMContentLoaded', async () => {
  const app = window.SkillApp;
  if (!app.getToken()) { location.href = '/login.html'; return; }

  const message = document.querySelector('#dashboardMessage');
  const reviewModal = document.querySelector('#reviewModal');
  const reviewForm = document.querySelector('#reviewForm');
  let currentUser;
  let sentReviewExchangeIds = new Set();

  function showError(error) {
    app.showMessage(message, error.message, 'error');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (error.status === 401) setTimeout(() => { location.href = '/login.html'; }, 600);
  }

  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach((item) => item.classList.toggle('active', item === button));
      document.querySelectorAll('.dashboard-section').forEach((section) => section.classList.remove('active'));
      document.querySelector(`#tab-${button.dataset.tab}`).classList.add('active');
    });
  });

  function actionButton(text, handler, className = 'btn btn-secondary btn-small') {
    const button = app.el('button', { text, type: 'button', className });
    button.addEventListener('click', handler);
    return button;
  }

  async function loadOverview() {
    const [stats, recommendations] = await Promise.all([app.api('/api/stats/me'), app.api('/api/skills/recommended')]);
    const statGrid = document.querySelector('#statsGrid');
    statGrid.replaceChildren();
    const entries = [
      ['上架技能', stats.active_skill_count], ['全部交换', stats.exchange_count],
      ['已完成', stats.completed_exchange_count], ['待我处理', stats.pending_received_count],
      ['我的收藏', stats.favorite_count], ['未读通知', stats.unread_notification_count],
      ['平均评分', stats.average_rating], ['收到评价', stats.received_review_count],
    ];
    for (const [label, value] of entries) {
      statGrid.append(app.el('div', { className: 'stat-card' }, [app.el('strong', { text: String(value) }), app.el('span', { text: label })]));
    }
    const list = document.querySelector('#recommendations');
    list.replaceChildren();
    if (!recommendations.length) list.append(app.emptyState('暂无推荐技能'));
    else recommendations.slice(0, 6).forEach((skill) => list.append(app.skillCard(skill)));
  }

  async function loadProfile() {
    currentUser = await app.api('/api/auth/me');
    localStorage.setItem('skill_exchange_user', JSON.stringify(currentUser));
    document.querySelector('#welcomeText').textContent = `${currentUser.username}，欢迎回来。管理资料、技能和交换进度。`;
    document.querySelector('#profileUsername').value = currentUser.username;
    document.querySelector('#profileEmail').value = currentUser.email;
    document.querySelector('#profilePhone').value = currentUser.phone || '';
    document.querySelector('#profileAvatar').value = currentUser.avatar_url || '';
    document.querySelector('#profileBio').value = currentUser.bio || '';
  }

  document.querySelector('#profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await app.api('/api/users/profile', {
        method: 'PUT',
        body: {
          email: document.querySelector('#profileEmail').value,
          phone: document.querySelector('#profilePhone').value,
          avatarUrl: document.querySelector('#profileAvatar').value,
          bio: document.querySelector('#profileBio').value,
        },
      });
      await loadProfile();
      app.showMessage(message, '个人资料已保存', 'success');
    } catch (error) { showError(error); }
  });

  async function loadSkills() {
    const items = await app.api('/api/skills/mine');
    const list = document.querySelector('#mySkills');
    list.replaceChildren();
    if (!items.length) { list.append(app.emptyState('你还没有发布技能')); return; }
    for (const skill of items) {
      const actions = app.el('div', { className: 'list-actions' }, [
        app.el('a', { className: 'btn btn-secondary btn-small', text: '查看', href: `/skill-detail.html?id=${skill.skill_id}` }),
        app.el('a', { className: 'btn btn-secondary btn-small', text: '编辑', href: `/skill-form.html?id=${skill.skill_id}` }),
      ]);
      if (skill.status === 'active') {
        actions.append(actionButton('下架', async () => {
          if (!window.confirm(`确认下架“${skill.title}”吗？`)) return;
          try { await app.api(`/api/skills/${skill.skill_id}`, { method: 'DELETE' }); await loadSkills(); }
          catch (error) { showError(error); }
        }, 'btn btn-danger btn-small'));
      }
      list.append(app.el('article', { className: 'list-item' }, [
        app.el('div', { className: 'list-head' }, [app.el('div', {}, [app.el('h3', { text: skill.title }), app.el('span', { className: `tag ${skill.status === 'active' ? 'tag-success' : ''}`, text: app.labels.status[skill.status] })]), actions]),
        app.el('p', { className: 'muted', text: `${skill.category_name} · ${app.labels.type[skill.type]} · ${app.labels.location[skill.location_type]}` }),
        app.el('span', { className: 'small muted', text: `浏览 ${skill.view_count} · 收藏 ${skill.favorite_count}` }),
      ]));
    }
  }

  function statusTag(status) {
    const classMap = { pending: 'tag-warning', accepted: 'tag-success', completed: 'tag-dark', rejected: 'tag-danger', cancelled: '' };
    return app.el('span', { className: `tag ${classMap[status] || ''}`, text: app.labels.status[status] || status });
  }

  async function exchangeAction(path, options, successText) {
    try {
      await app.api(path, options);
      app.showMessage(message, successText, 'success');
      await Promise.all([loadExchanges(), loadOverview(), loadNotifications()]);
    } catch (error) { showError(error); }
  }

  function openReview(exchangeId) {
    document.querySelector('#reviewExchangeId').value = exchangeId;
    document.querySelector('#reviewContent').value = '';
    reviewModal.classList.add('open');
  }

  async function loadExchanges() {
    const status = document.querySelector('#exchangeStatus').value;
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const items = await app.api(`/api/exchanges${query}`);
    const list = document.querySelector('#exchangeList');
    list.replaceChildren();
    if (!items.length) { list.append(app.emptyState('暂无符合条件的交换申请')); return; }
    for (const exchange of items) {
      const sent = Number(exchange.applicant_id) === Number(currentUser.user_id);
      const actions = app.el('div', { className: 'list-actions' });
      if (!sent && exchange.status === 'pending') {
        actions.append(
          actionButton('接受', () => exchangeAction(`/api/exchanges/${exchange.exchange_id}/decision`, { method: 'PATCH', body: { decision: 'accept' } }, '已接受交换申请')),
          actionButton('拒绝', () => exchangeAction(`/api/exchanges/${exchange.exchange_id}/decision`, { method: 'PATCH', body: { decision: 'reject' } }, '已拒绝交换申请'), 'btn btn-danger btn-small'),
        );
      }
      if (sent && exchange.status === 'pending') {
        actions.append(actionButton('撤销', () => exchangeAction(`/api/exchanges/${exchange.exchange_id}`, { method: 'DELETE' }, '申请已撤销'), 'btn btn-danger btn-small'));
      }
      if (exchange.status === 'accepted') {
        const alreadyConfirmed = sent ? exchange.applicant_confirmed : exchange.target_confirmed;
        if (!alreadyConfirmed) actions.append(actionButton('确认完成', () => exchangeAction(`/api/exchanges/${exchange.exchange_id}/confirm`, { method: 'POST' }, '完成状态已确认')));
      }
      if (exchange.status === 'completed' && !sentReviewExchangeIds.has(Number(exchange.exchange_id))) {
        actions.append(actionButton('发布评价', () => openReview(exchange.exchange_id)));
      }
      const confirmation = exchange.status === 'accepted'
        ? `申请人${exchange.applicant_confirmed ? '已' : '未'}确认 · 接收人${exchange.target_confirmed ? '已' : '未'}确认`
        : '';
      list.append(app.el('article', { className: 'list-item' }, [
        app.el('div', { className: 'list-head' }, [app.el('div', {}, [app.el('h3', { text: `${exchange.offer_skill_title} ⇄ ${exchange.request_skill_title}` }), statusTag(exchange.status)]), actions]),
        app.el('p', { className: 'muted', text: `${exchange.applicant_username} 向 ${exchange.target_username} 发起 · ${sent ? '我发出的申请' : '我收到的申请'}` }),
        exchange.message ? app.el('p', { text: exchange.message }) : null,
        app.el('span', { className: 'small muted', text: `${app.formatDate(exchange.created_at)}${confirmation ? ` · ${confirmation}` : ''}` }),
      ]));
    }
  }

  document.querySelector('#exchangeStatus').addEventListener('change', () => loadExchanges().catch(showError));
  document.querySelector('#closeReviewModal').addEventListener('click', () => reviewModal.classList.remove('open'));
  reviewModal.addEventListener('click', (event) => { if (event.target === reviewModal) reviewModal.classList.remove('open'); });
  reviewForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await app.api('/api/reviews', {
        method: 'POST',
        body: { exchangeId: Number(document.querySelector('#reviewExchangeId').value), rating: Number(document.querySelector('#reviewRating').value), content: document.querySelector('#reviewContent').value },
      });
      reviewModal.classList.remove('open');
      await loadReviews();
      await loadExchanges();
      app.showMessage(message, '评价发布成功', 'success');
    } catch (error) { showError(error); }
  });

  async function loadFavorites() {
    const items = await app.api('/api/favorites');
    const list = document.querySelector('#favoriteList');
    list.replaceChildren();
    if (!items.length) { list.append(app.emptyState('还没有收藏技能')); return; }
    for (const item of items) {
      const card = app.el('article', { className: 'skill-card' }, [
        app.el('div', { className: 'card-top' }, [app.el('span', { className: 'tag tag-dark', text: app.labels.type[item.type] }), app.el('span', { className: 'tag', text: item.category_name })]),
        app.el('h3', { text: item.title }), app.el('p', { text: `${item.username} · ${app.labels.location[item.location_type]}` }),
      ]);
      card.append(app.el('div', { className: 'list-actions' }, [
        app.el('a', { className: 'btn btn-secondary btn-small', text: '查看', href: `/skill-detail.html?id=${item.skill_id}` }),
        actionButton('取消收藏', async () => { try { await app.api(`/api/favorites/${item.skill_id}`, { method: 'DELETE' }); await Promise.all([loadFavorites(), loadOverview()]); } catch (error) { showError(error); } }, 'btn btn-danger btn-small'),
      ]));
      list.append(card);
    }
  }

  async function loadNotifications() {
    const data = await app.api('/api/notifications');
    document.querySelector('#notificationSummary').textContent = `共有 ${data.unread} 条未读通知`;
    const list = document.querySelector('#notificationList');
    list.replaceChildren();
    if (!data.items.length) { list.append(app.emptyState('暂无通知')); return; }
    for (const item of data.items) {
      const actions = app.el('div', { className: 'list-actions' });
      if (!item.is_read) actions.append(actionButton('标记已读', async () => { try { await app.api(`/api/notifications/${item.notification_id}/read`, { method: 'PATCH' }); await loadNotifications(); } catch (error) { showError(error); } }));
      list.append(app.el('article', { className: 'list-item' }, [
        app.el('div', { className: 'list-head' }, [app.el('div', {}, [app.el('strong', { text: item.content }), app.el('span', { className: `tag ${item.is_read ? '' : 'tag-dark'}`, text: item.is_read ? '已读' : '未读' })]), actions]),
        app.el('span', { className: 'small muted', text: app.formatDate(item.created_at) }),
      ]));
    }
  }

  document.querySelector('#readAllButton').addEventListener('click', async () => {
    try { await app.api('/api/notifications/read-all', { method: 'PATCH' }); await Promise.all([loadNotifications(), loadOverview()]); }
    catch (error) { showError(error); }
  });

  async function loadReviews() {
    const items = await app.api('/api/reviews/mine');
    sentReviewExchangeIds = new Set(items.filter((item) => item.direction === 'sent').map((item) => Number(item.exchange_id)));
    const list = document.querySelector('#reviewList');
    list.replaceChildren();
    if (!items.length) { list.append(app.emptyState('暂无评价')); return; }
    for (const item of items) {
      list.append(app.el('article', { className: 'list-item' }, [
        app.el('div', { className: 'list-head' }, [app.el('h3', { text: `${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}` }), app.el('span', { className: 'tag', text: item.direction === 'sent' ? '我发出的' : '我收到的' })]),
        app.el('p', { text: item.content }),
        app.el('span', { className: 'small muted', text: `${item.from_username} → ${item.to_username} · ${item.skill_title} · ${app.formatDate(item.created_at)}` }),
      ]));
    }
  }

  try {
    await loadProfile();
    await loadReviews();
    await Promise.all([loadOverview(), loadSkills(), loadExchanges(), loadFavorites(), loadNotifications()]);
  } catch (error) { showError(error); }
});
