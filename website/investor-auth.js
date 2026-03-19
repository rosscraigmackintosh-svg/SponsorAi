/* =============================================
   SPONSORAI — Partner Auth (Username + Password)
   Credentials set in website/config.js (gitignored).
   Requires: website/config.js loaded before this script.
   ============================================= */

(function () {
  'use strict';

  var SESSION_KEY = 'sponsorai_portal_auth';

  /* ── Config ────────────────────────────────────────────────────────── */
  var API_URL     = (typeof WEBSITE_API_URL          !== 'undefined') ? WEBSITE_API_URL          : null;
  var SUPABASE_KEY= (typeof WEBSITE_API_KEY          !== 'undefined') ? WEBSITE_API_KEY          : null;
  var PORTAL_USER = (typeof WEBSITE_PORTAL_USERNAME  !== 'undefined') ? WEBSITE_PORTAL_USERNAME  : null;
  var PORTAL_PASS = (typeof WEBSITE_PORTAL_PASSWORD  !== 'undefined') ? WEBSITE_PORTAL_PASSWORD  : null;

  /* ── Route detection ───────────────────────────────────────────────── */
  var path     = window.location.pathname;
  var isPortal = path.includes('investor-portal');
  var isLogin  = path.includes('investor-login');

  /* ── Dispatch ──────────────────────────────────────────────────────── */
  if (isPortal) { guardPortal(); }
  if (isLogin)  { initLoginPage(); }

  /* Sign-out — clears session and returns to login */
  var signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', function () {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.replace('investor-login.html');
    });
  }

  /* ── Portal guard ──────────────────────────────────────────────────── */
  /*
   * body starts visibility:hidden (set in investor-portal.html).
   * Only revealed after confirming a valid session flag set at login.
   */
  function guardPortal() {
    if (sessionStorage.getItem(SESSION_KEY) !== '1') {
      window.location.replace('investor-login.html');
      return;
    }
    document.body.style.visibility = 'visible';
    initPortalSignupForm();
  }

  /* ── Login page ────────────────────────────────────────────────────── */
  function initLoginPage() {
    var loginForm     = document.getElementById('loginForm');
    var usernameInput = document.getElementById('usernameInput');
    var passwordInput = document.getElementById('passwordInput');
    var errorEl       = document.getElementById('loginError');

    if (!loginForm) return;

    [usernameInput, passwordInput].forEach(function (input) {
      if (!input) return;
      input.addEventListener('input', function () {
        if (errorEl) { errorEl.textContent = ''; }
        input.classList.remove('is-error');
      });
    });

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var username = (usernameInput ? usernameInput.value.trim() : '');
      var password = (passwordInput ? passwordInput.value        : '');

      if (!username) {
        if (errorEl)       { errorEl.textContent = 'Please enter your username.'; }
        if (usernameInput) { usernameInput.classList.add('is-error'); }
        return;
      }

      if (!password) {
        if (errorEl)       { errorEl.textContent = 'Please enter your password.'; }
        if (passwordInput) { passwordInput.classList.add('is-error'); }
        return;
      }

      if (!PORTAL_USER || !PORTAL_PASS) {
        if (errorEl) { errorEl.textContent = 'Login is not configured. Please contact us.'; }
        console.error('[SponsorAI] WEBSITE_PORTAL_USERNAME / WEBSITE_PORTAL_PASSWORD not set in config.js.');
        return;
      }

      var btn = loginForm.querySelector('.login-btn');
      if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
      if (errorEl) { errorEl.textContent = ''; }

      if (username === PORTAL_USER && password === PORTAL_PASS) {
        sessionStorage.setItem(SESSION_KEY, '1');
        var portalUrl = window.location.href
          .split('?')[0]
          .replace('investor-login.html', 'investor-portal.html');
        window.location.replace(portalUrl);
      } else {
        if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
        if (errorEl)       { errorEl.textContent = 'Incorrect username or password. Please try again.'; }
        if (usernameInput) { usernameInput.classList.add('is-error'); }
        if (passwordInput) { passwordInput.classList.add('is-error'); }
      }
    });
  }

  /* ── Portal signup form ────────────────────────────────────────────── */
  /*
   * Same logic as website/script.js — real Supabase insert.
   * Uses source: 'investor-portal' to distinguish from main website signups.
   */
  function initPortalSignupForm() {
    var portalForm = document.getElementById('portalSignupForm');
    if (!portalForm) return;

    var emailInput = document.getElementById('portalEmailInput');
    var noteEl     = document.getElementById('portalSignupNote');

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    }

    if (emailInput) {
      emailInput.addEventListener('input', function () {
        if (noteEl) { noteEl.textContent = ''; noteEl.className = 'signup__note'; }
      });
    }

    portalForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (emailInput ? emailInput.value.trim() : '');

      if (!email || !isValidEmail(email)) {
        if (noteEl) { noteEl.textContent = 'Please enter a valid email address.'; noteEl.className = 'signup__note is-error'; }
        return;
      }

      var btn = portalForm.querySelector('.signup__btn');
      if (btn) { btn.disabled = true; }

      if (!API_URL) {
        /* Config missing — dev fallback */
        console.warn('[SponsorAI] API_URL missing — portal signup not stored. Email was:', email);
        _portalSignupSuccess(portalForm, emailInput, noteEl, btn, email);
        return;
      }

      fetch(API_URL + '/email_signups', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Prefer':        'return=minimal'
        },
        body: JSON.stringify({ email: email, source: 'investor-portal' })
      })
      .then(function (res) {
        if (res.ok) {
          _portalSignupSuccess(portalForm, emailInput, noteEl, btn, email);
        } else {
          return res.json().then(function (body) {
            /* 23505 = unique violation: already signed up — treat as success */
            if (body && body.code === '23505') {
              _portalSignupSuccess(portalForm, emailInput, noteEl, btn, email);
            } else {
              if (btn) { btn.disabled = false; }
              if (noteEl) { noteEl.textContent = 'Something went wrong. Please try again in a moment.'; noteEl.className = 'signup__note is-error'; }
              console.error('[SponsorAI] Portal signup error:', body);
            }
          });
        }
      })
      .catch(function (err) {
        if (btn) { btn.disabled = false; }
        if (noteEl) { noteEl.textContent = 'Something went wrong. Please try again in a moment.'; noteEl.className = 'signup__note is-error'; }
        console.error('[SponsorAI] Portal signup error:', err);
      });
    });
  }

  function _notifyResend(email) {
    fetch('/api/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email, source: 'investor-portal' })
    }).catch(function (err) {
      console.warn('[SponsorAI] Resend subscribe error:', err);
    });
  }

  function _portalSignupSuccess(form, input, note, btn, email) {
    form.classList.add('is-submitted');
    if (note)  { note.textContent = "You're on the list. We'll be in touch."; note.className = 'signup__note is-success'; }
    if (input) { input.value = ''; }
    if (btn)   { btn.disabled = false; }
    if (email) { _notifyResend(email); }
  }

})();
