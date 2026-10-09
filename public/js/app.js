(function bootstrapSkillApp() {
  const tokenKey = 'skill_exchange_token';
  const userKey = 'skill_exchange_user';

  function getToken() { return localStorage.getItem(tokenKey); }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(userKey) || 'null'); } catch (_error) { return null; }
  }
  function setSession(data) {
    localStorage.setItem(tokenKey, data.token);
    localStorage.setItem(userKey, JSON.stringify(data.user));
  }
  function clearSession() {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
  }

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body !== undefined && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(path, {
      ...options,
      headers,
      body: options.body !== undefined && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
    });
    let payload;
    try { payload = await response.json(); } catch (_error) { payload = null; }
    if (!response.ok) {
      if (response.status === 401) clearSession();
      const error = new Error(payload?.message || `请求失败（${response.status}）`);
      error.status = response.status;
      error.code = payload?.error?.code;
      error.details = payload?.error?.details;
      throw error;
    }
    return payload.data;
  }

  function el(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.href) node.href = options.href;
    if (options.type) node.type = options.type;
    if (options.title) node.title = options.title;
    if (options.dataset) Object.assign(node.dataset, options.dataset);
    if (options.attrs) {
      for (const [key, value] of Object.entries(options.attrs)) node.setAttribute(key, value);
    }
    for (const child of children) if (child) node.append(child);
    return node;
  }

  function showMessage(target, message, kind = '') {
    if (!target) return;
    target.textContent = message;
    target.className = `message${kind ? ` ${kind}` : ''}`;
    target.hidden = false;
  }

  function hideMessage(target) { if (target) target.hidden = true; }
  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
  }

  const labels = {
    type: { offer: '我掌握', request: '我想学' },
    location: { online: '线上', offline: '线下', both: '线上/线下' },
    status: { pending: '待处理', accepted: '已接受', rejected: '已拒绝', cancelled: '已撤销', completed: '已完成', active: '已上架', inactive: '已下架' },
  };

  function skillCard(skill) {
    const card = el('a', { className: 'skill-card', href: `/skill-detail.html?id=${skill.skill_id}` });
    const top = el('div', { className: 'card-top' }, [
      el('span', { className: `tag ${skill.type === 'offer' ? 'tag-dark' : ''}`, text: labels.type[skill.type] || skill.type }),
      el('span', { className: 'tag', text: skill.category_name || '未分类' }),
    ]);
    const title = el('h3', { text: skill.title });
    const description = el('p', { text: skill.description ? `${skill.description.slice(0, 75)}${skill.description.length > 75 ? '…' : ''}` : '查看技能详情' });
    const owner = el('div', { className: 'user-line' });
    const avatar = el('img', { className: 'avatar', attrs: { alt: `${skill.username || '用户'}头像`, loading: 'lazy' } });
    avatar.src = skill.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(skill.username || 'EX')}`;
    owner.append(avatar, el('div', {}, [el('strong', { text: skill.username || '技能伙伴' }), el('span', { text: labels.location[skill.location_type] || skill.location_type })]));
    const meta = el('div', { className: 'card-meta' }, [
      el('span', { text: `浏览 ${skill.view_count || 0}` }),
      el('span', { text: `收藏 ${skill.favorite_count || 0}` }),
    ]);
    card.append(top, title, description, owner, meta);
    return card;
  }

  function emptyState(message) { return el('div', { className: 'empty', text: message }); }

  function initNav() {
    const loggedIn = Boolean(getToken());
    document.querySelectorAll('[data-auth-only]').forEach((node) => { node.hidden = !loggedIn; });
    document.querySelectorAll('[data-guest-only]').forEach((node) => { node.hidden = loggedIn; });
    document.querySelectorAll('[data-logout]').forEach((node) => {
      node.addEventListener('click', () => { clearSession(); window.location.href = '/'; });
    });
  }

  window.SkillApp = {
    api, el, getToken, getUser, setSession, clearSession,
    showMessage, hideMessage, formatDate, labels, skillCard, emptyState,
  };
  document.addEventListener('DOMContentLoaded', initNav);
}());
