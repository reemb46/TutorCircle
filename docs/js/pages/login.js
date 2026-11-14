// Log in / Sign up page (Figure 1)
(function () {
  // Already logged in? Go straight to the home page for this role.
  const existing = getCurrentUser();
  if (existing) {
    location.href = homeFor(existing.role);
    return;
  }

  const alertBox = $('#alert');
  const loginForm = $('#login-form');
  const signupForm = $('#signup-form');
  let chosenRole = 'learner';

  function showTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    loginForm.hidden = name !== 'login';
    signupForm.hidden = name !== 'signup';
    clearAlert(alertBox);
  }

  document.querySelectorAll('.tab').forEach(tab =>
    tab.addEventListener('click', () => showTab(tab.dataset.tab)));
  document.querySelectorAll('[data-goto]').forEach(link =>
    link.addEventListener('click', e => { e.preventDefault(); showTab(link.dataset.goto); }));

  // Learner / Peer tutor choice
  document.querySelectorAll('#role-options .option').forEach(option => {
    option.addEventListener('click', () => {
      chosenRole = option.dataset.role;
      document.querySelectorAll('#role-options .option').forEach(o => o.classList.toggle('selected', o === option));
    });
  });

  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const user = tryAction(() => logIn($('#login-email').value, $('#login-password').value), alertBox);
    if (user) location.href = homeFor(user.role);
  });

  signupForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#su-email').value;
    const password = $('#su-password').value;
    const user = tryAction(() => registerUser($('#su-name').value, email, password, chosenRole), alertBox);
    if (user) {
      logIn(email, password);
      location.href = user.role === 'tutor' ? 'my-profile.html' : homeFor(user.role);
    }
  });

  // Demo account buttons fill in the form
  document.querySelectorAll('.demo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('#login-email').value = btn.dataset.email;
      $('#login-password').value = 'password123';
    });
  });

  $('#reset-link').addEventListener('click', e => {
    e.preventDefault();
    if (confirm('Delete all changes and restore the demo data?')) {
      resetDB();
      loadDB();
      showAlert(alertBox, 'Demo data restored.', 'success');
    }
  });

  showTab(getParam('tab') === 'signup' ? 'signup' : 'login');
})();
