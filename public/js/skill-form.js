document.addEventListener('DOMContentLoaded', async () => {
  const app = window.SkillApp;
  if (!app.getToken()) { location.href = '/login.html'; return; }
  const form = document.querySelector('#skillForm');
  const message = document.querySelector('#formMessage');
  const skillId = Number(new URLSearchParams(location.search).get('id')) || null;
  const categorySelect = document.querySelector('#categoryId');

  try {
    const categories = await app.api('/api/categories');
    categorySelect.replaceChildren();
    categories.forEach((item) => categorySelect.append(app.el('option', { text: item.name, attrs: { value: item.category_id } })));
    if (skillId) {
      document.querySelector('#pageTitle').textContent = '编辑技能';
      document.title = '编辑技能 · 技能交换平台';
      const mine = await app.api('/api/skills/mine');
      const skill = mine.find((item) => Number(item.skill_id) === skillId);
      if (!skill) throw new Error('技能不存在或无权编辑');
      document.querySelector('#title').value = skill.title;
      categorySelect.value = skill.category_id;
      document.querySelector('#type').value = skill.type;
      document.querySelector('#locationType').value = skill.location_type;
      document.querySelector('#description').value = skill.description;
      document.querySelector('#coverUrl').value = skill.cover_url || '';
    }
  } catch (error) { app.showMessage(message, error.message, 'error'); }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      title: document.querySelector('#title').value,
      categoryId: Number(categorySelect.value),
      type: document.querySelector('#type').value,
      locationType: document.querySelector('#locationType').value,
      description: document.querySelector('#description').value,
      coverUrl: document.querySelector('#coverUrl').value,
    };
    try {
      const result = await app.api(skillId ? `/api/skills/${skillId}` : '/api/skills', { method: skillId ? 'PUT' : 'POST', body: payload });
      app.showMessage(message, skillId ? '技能信息已更新' : '技能发布成功', 'success');
      setTimeout(() => { location.href = `/skill-detail.html?id=${result.skill_id}`; }, 450);
    } catch (error) { app.showMessage(message, error.message, 'error'); }
  });
});
