document.addEventListener('DOMContentLoaded', () => {
  const app = window.SkillApp;
  if (app.getToken()) { location.href = '/dashboard.html'; return; }
  const form = document.querySelector('#loginForm');
  const message = document.querySelector('#formMessage');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    app.hideMessage(message);
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const data = await app.api('/api/auth/login', { method: 'POST', body: { username: form.username.value, password: form.password.value } });
      app.setSession(data);
      app.showMessage(message, '登录成功，正在进入个人中心…', 'success');
      setTimeout(() => { location.href = '/dashboard.html'; }, 350);
    } catch (error) {
      app.showMessage(message, error.message, 'error');
    } finally { button.disabled = false; }
  });
});
