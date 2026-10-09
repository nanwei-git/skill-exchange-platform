document.addEventListener('DOMContentLoaded', async () => {
  const app = window.SkillApp;
  const form = document.querySelector('#filterForm');
  const grid = document.querySelector('#skillGrid');
  const pagination = document.querySelector('#pagination');
  const message = document.querySelector('#skillMessage');
  const categorySelect = document.querySelector('#categoryId');
  let currentPage = 1;

  async function loadCategories() {
    const categories = await app.api('/api/categories');
    for (const category of categories) {
      categorySelect.append(app.el('option', { text: `${category.name}（${category.skill_count}）`, attrs: { value: category.category_id } }));
    }
  }

  function paramsForPage(page) {
    const params = new URLSearchParams();
    const data = new FormData(form);
    for (const [key, value] of data.entries()) if (value) params.set(key, value);
    params.set('page', page);
    params.set('limit', 9);
    return params;
  }

  function renderPagination(info) {
    pagination.replaceChildren();
    if (info.totalPages <= 1) return;
    const start = Math.max(1, info.page - 2);
    const end = Math.min(info.totalPages, info.page + 2);
    for (let page = start; page <= end; page += 1) {
      const button = app.el('button', { text: page, type: 'button', className: page === info.page ? 'active' : '' });
      button.addEventListener('click', () => loadSkills(page));
      pagination.append(button);
    }
  }

  async function loadSkills(page = 1) {
    currentPage = page;
    grid.replaceChildren(app.el('div', { className: 'loading', text: '正在加载技能…' }));
    app.hideMessage(message);
    try {
      const result = await app.api(`/api/skills?${paramsForPage(page).toString()}`);
      grid.replaceChildren();
      if (!result.items.length) grid.append(app.emptyState('没有找到符合条件的技能，换个筛选条件试试。'));
      else result.items.forEach((skill) => grid.append(app.skillCard(skill)));
      renderPagination(result.pagination);
      history.replaceState(null, '', `/?${paramsForPage(currentPage).toString()}#skills`);
    } catch (error) {
      grid.replaceChildren();
      app.showMessage(message, error.message, 'error');
    }
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); loadSkills(1); });
  try {
    await loadCategories();
    const initial = new URLSearchParams(location.search);
    for (const key of ['keyword', 'categoryId', 'type', 'locationType', 'sort']) {
      if (initial.has(key) && form.elements[key]) form.elements[key].value = initial.get(key);
    }
    await loadSkills(Number(initial.get('page') || 1));
  } catch (error) {
    grid.replaceChildren();
    app.showMessage(message, error.message, 'error');
  }
});
