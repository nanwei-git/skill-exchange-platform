document.addEventListener('DOMContentLoaded', () => {
  const app = window.SkillApp;
  if (app.getToken()) { location.href = '/dashboard.html'; return; }
  const form = document.querySelector('#registerForm');
  const message = document.querySelector('#formMessage');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    app.hideMessage(message);
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const data = await app.api('/api/auth/register', {
        method: 'POST',
        body: { username: form.username.value, email: form.email.value, password: form.password.value, bio: form.bio.value },
      });
      app.setSession(data);
      app.showMessage(message, '注册成功，正在进入个人中心…', 'success');
      setTimeout(() => { location.href = '/dashboard.html'; }, 350);
    } catch (error) { app.showMessage(message, error.message, 'error'); }
    finally { button.disabled = false; }
  });
});
