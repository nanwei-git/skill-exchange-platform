document.addEventListener('DOMContentLoaded', async () => {
  const app = window.SkillApp;
  const skillId = Number(new URLSearchParams(location.search).get('id'));
  const loading = document.querySelector('#detailLoading');
  const content = document.querySelector('#detailContent');
  const message = document.querySelector('#detailMessage');
  const favoriteButton = document.querySelector('#favoriteButton');
  const applyToggle = document.querySelector('#applyToggle');
  const applyPanel = document.querySelector('#applyPanel');
  const applyForm = document.querySelector('#applyForm');
  let skill;
  let favorited = false;

  function addValue(label, value) {
    document.querySelector('#detailValues').append(app.el('div', { className: 'key-value' }, [app.el('span', { text: label }), app.el('strong', { text: value })]));
  }

  function renderSkill(data) {
    document.title = `${data.title} · 技能交换平台`;
    document.querySelector('#detailTags').append(
      app.el('span', { className: `tag ${data.type === 'offer' ? 'tag-dark' : ''}`, text: app.labels.type[data.type] }),
      app.el('span', { className: 'tag', text: data.category_name }),
    );
    document.querySelector('#detailTitle').textContent = data.title;
    document.querySelector('#detailDescription').textContent = data.description;
    const avatar = app.el('img', { className: 'avatar', attrs: { alt: `${data.username}头像` } });
    avatar.src = data.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(data.username)}`;
    document.querySelector('#detailOwner').append(avatar, app.el('div', {}, [app.el('strong', { text: data.username }), app.el('span', { text: `用户评分 ${data.owner_rating || 0}` })]));
    addValue('交换类型', app.labels.type[data.type]);
    addValue('交换方式', app.labels.location[data.location_type]);
    addValue('浏览次数', String(data.view_count));
    addValue('收藏人数', String(data.favorite_count));
    addValue('发布时间', app.formatDate(data.created_at));

    if (data.related?.length) {
      document.querySelector('#relatedWrap').hidden = false;
      const relatedList = document.querySelector('#relatedList');
      for (const related of data.related) {
        relatedList.append(app.el('a', { className: 'list-item', href: `/skill-detail.html?id=${related.skill_id}` }, [
          app.el('strong', { text: related.title }),
          app.el('span', { className: 'muted small', text: `${app.labels.type[related.type]} · ${app.labels.location[related.location_type]} · 浏览 ${related.view_count}` }),
        ]));
      }
    }
  }

  async function prepareActions() {
    const user = app.getUser();
    if (!app.getToken()) {
      favoriteButton.textContent = '登录后收藏';
      applyToggle.textContent = '登录后申请';
      const goLogin = () => { location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`; };
      favoriteButton.addEventListener('click', goLogin);
      applyToggle.addEventListener('click', goLogin);
      return;
    }
    if (Number(user?.user_id) === Number(skill.user_id)) {
      favoriteButton.hidden = true;
      applyToggle.textContent = '编辑我的技能';
      applyToggle.addEventListener('click', () => { location.href = `/skill-form.html?id=${skillId}`; });
      return;
    }

    const favorites = await app.api('/api/favorites');
    favorited = favorites.some((item) => Number(item.skill_id) === skillId);
    favoriteButton.textContent = favorited ? '取消收藏' : '收藏技能';
    favoriteButton.addEventListener('click', async () => {
      try {
        if (favorited) await app.api(`/api/favorites/${skillId}`, { method: 'DELETE' });
        else await app.api(`/api/favorites/${skillId}`, { method: 'POST' });
        favorited = !favorited;
        favoriteButton.textContent = favorited ? '取消收藏' : '收藏技能';
        app.showMessage(message, favorited ? '收藏成功' : '已取消收藏', 'success');
      } catch (error) { app.showMessage(message, error.message, 'error'); }
    });

    if (skill.type !== 'offer') {
      applyToggle.hidden = true;
      return;
    }
    const mine = await app.api('/api/skills/mine');
    const offers = mine.filter((item) => item.type === 'offer' && item.status === 'active');
    const select = document.querySelector('#offerSkillId');
    select.replaceChildren();
    if (!offers.length) {
      select.append(app.el('option', { text: '请先发布一个“我掌握”的技能', attrs: { value: '' } }));
      applyForm.querySelector('button').disabled = true;
    } else {
      offers.forEach((item) => select.append(app.el('option', { text: item.title, attrs: { value: item.skill_id } })));
    }
    applyToggle.addEventListener('click', () => { applyPanel.hidden = !applyPanel.hidden; });
    applyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await app.api('/api/exchanges', {
          method: 'POST',
          body: { offerSkillId: Number(select.value), requestSkillId: skillId, message: document.querySelector('#message').value },
        });
        app.showMessage(message, '交换申请已提交，可在个人中心查看进度。', 'success');
        applyPanel.hidden = true;
      } catch (error) { app.showMessage(message, error.message, 'error'); }
    });
  }

  if (!Number.isInteger(skillId) || skillId < 1) {
    loading.hidden = true;
    app.showMessage(message, '技能编号不正确', 'error');
    return;
  }
  try {
    skill = await app.api(`/api/skills/${skillId}`);
    renderSkill(skill);
    await prepareActions();
    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    loading.hidden = true;
    app.showMessage(message, error.message, 'error');
  }
});
