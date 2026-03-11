/* =============================================
   SPONSORAI — Investor Auth
   Demo credentials — replace before sharing widely
   ============================================= */

(function () {
  'use strict';

  /* ── Demo credentials ─────────────────────── */
  const VALID_USERNAME = 'investor';
  const VALID_PASSWORD = 'SponsorAI2026';
  const SESSION_KEY    = 'sponsorai_investor';

  /* ── Helpers ──────────────────────────────── */
  function setSession()    { localStorage.setItem(SESSION_KEY, '1'); }
  function clearSession()  { localStorage.removeItem(SESSION_KEY); }
  function hasSession()    { return localStorage.getItem(SESSION_KEY) === '1'; }

  /* ── Route guard — runs on every investor page ── */
  const path = window.location.pathname;
  const isPortal    = path.includes('investor-portal');
  const isLoginPage = path.includes('investor-login');

  if (isPortal && !hasSession()) {
    window.location.replace('investor-login.html');
    return;
  }

  if (isLoginPage && hasSession()) {
    window.location.replace('investor-portal.html');
    return;
  }

  /* ── Login form handler ───────────────────── */
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorEl       = document.getElementById('loginError');
    const submitBtn     = loginForm.querySelector('.login-btn');

    function showError(msg) {
      errorEl.textContent = msg;
      usernameInput.classList.add('is-error');
      passwordInput.classList.add('is-error');
    }

    function clearError() {
      errorEl.textContent = '';
      usernameInput.classList.remove('is-error');
      passwordInput.classList.remove('is-error');
    }

    [usernameInput, passwordInput].forEach(function (el) {
      el.addEventListener('input', clearError);
    });

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError();

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        showError('Please enter both username and password.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');

      /* Brief pause for feel — swap for a real API call when needed */
      setTimeout(function () {
        if (username === VALID_USERNAME && password === VALID_PASSWORD) {
          setSession();
          window.location.replace('investor-portal.html');
        } else {
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-loading');
          showError('Incorrect username or password.');
          passwordInput.value = '';
          passwordInput.focus();
        }
      }, 400);
    });
  }

  /* ── Sign-out handler ─────────────────────── */
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', function () {
      clearSession();
      window.location.replace('investor-login.html');
    });
  }

  /* ── Portal email signup ──────────────────── */
  const portalForm = document.getElementById('portalSignupForm');
  if (portalForm) {
    const emailInput = document.getElementById('portalEmailInput');
    const noteEl     = document.getElementById('portalSignupNote');

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    }

    emailInput.addEventListener('input', function () {
      noteEl.textContent = '';
      noteEl.className   = 'signup__note';
    });

    portalForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = emailInput.value.trim();

      if (!email || !isValidEmail(email)) {
        noteEl.textContent = 'Please enter a valid email address.';
        noteEl.className   = 'signup__note is-error';
        return;
      }

      const btn = portalForm.querySelector('.signup__btn');
      if (btn) btn.disabled = true;

      setTimeout(function () {
        portalForm.classList.add('is-submitted');
        noteEl.textContent = 'You\'re on the list. We\'ll be in touch.';
        noteEl.className   = 'signup__note is-success';
        emailInput.value   = '';
        if (btn) btn.disabled = false;
        console.log('[SponsorAI] Investor signup:', email);
      }, 400);
    });
  }

})();
