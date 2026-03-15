/* =============================================
   SPONSORAI — Investor Auth (Magic Link)
   Replaces hardcoded credential approach.
   Requires: Supabase JS CDN + website/config.js loaded before this script.
   ============================================= */

(function () {
  'use strict';

  /* ── Config ────────────────────────────────────────────────────────── */
  var SUPABASE_URL = (typeof WEBSITE_SUPABASE_URL !== 'undefined') ? WEBSITE_SUPABASE_URL : null;
  var SUPABASE_KEY = (typeof WEBSITE_API_KEY     !== 'undefined') ? WEBSITE_API_KEY     : null;
  var API_URL      = (typeof WEBSITE_API_URL     !== 'undefined') ? WEBSITE_API_URL     : null;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[SponsorAI] investor-auth.js: Supabase config missing. Load website/config.js before this script.');
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[SponsorAI] investor-auth.js: Supabase JS client not found. Load the Supabase CDN before this script.');
    return;
  }

  var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ── Route detection ───────────────────────────────────────────────── */
  var path     = window.location.pathname;
  var isPortal = path.includes('investor-portal');
  var isLogin  = path.includes('investor-login');

  /* ── Dispatch ──────────────────────────────────────────────────────── */
  if (isPortal) { guardPortal(); }
  if (isLogin)  { initLoginPage(); }

  /* Sign-out wired here so it works regardless of which page loads first */
  var signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', function () {
      db.auth.signOut().then(function () {
        window.location.replace('investor-login.html');
      });
    });
  }

  /* ── Portal guard ──────────────────────────────────────────────────── */
  /*
   * body starts visibility:hidden (set in investor-portal.html).
   * We only reveal it after confirming:
   *   1. A valid Supabase session exists (magic link processed or existing session)
   *   2. The authenticated user's email is in investor_allowlist (enforced by RLS)
   */
  function guardPortal() {
    db.auth.getSession().then(function (result) {
      var session = result.data && result.data.session;

      if (!session) {
        /* No active session — magic link may not have been clicked yet */
        window.location.replace('investor-login.html');
        return;
      }

      /* Check allowlist. RLS ensures this query returns at most one row:
         the row matching the authenticated user's own email. Zero rows = not authorised. */
      db.from('investor_allowlist')
        .select('id')
        .limit(1)
        .then(function (result) {
          if (result.error || !result.data || result.data.length === 0) {
            /* Authenticated but not on the allowlist — sign out cleanly */
            db.auth.signOut().then(function () {
              window.location.replace('investor-login.html?reason=not_authorised');
            });
          } else {
            /* Authorised — reveal page and wire up portal-specific behaviour */
            document.body.style.visibility = 'visible';
            initPortalSignupForm();
          }
        });
    });
  }

  /* ── Login page ────────────────────────────────────────────────────── */
  function initLoginPage() {
    var loginForm  = document.getElementById('loginForm');
    var emailInput = document.getElementById('emailInput');
    var errorEl    = document.getElementById('loginError');
    var sentState  = document.getElementById('loginSent');

    if (!loginForm) return;

    /* Show rejection message if redirected back after allowlist check failed */
    var params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'not_authorised' && errorEl) {
      errorEl.textContent = 'This email address is not on the investor list. Please contact us if you think this is an error.';
    }

    if (emailInput) {
      emailInput.addEventListener('input', function () {
        if (errorEl)  { errorEl.textContent = ''; }
        emailInput.classList.remove('is-error');
      });
    }

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (emailInput ? emailInput.value.trim() : '');

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        if (errorEl)    { errorEl.textContent = 'Please enter a valid email address.'; }
        if (emailInput) { emailInput.classList.add('is-error'); }
        return;
      }

      var btn = loginForm.querySelector('.login-btn');
      if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
      if (errorEl) { errorEl.textContent = ''; }

      /* Compute portal URL for the magic link redirect.
         Works for both local file:// and hosted environments. */
      var portalUrl = window.location.href
        .split('?')[0]
        .replace('investor-login.html', 'investor-portal.html');

      db.auth.signInWithOtp({
        email: email,
        options: { emailRedirectTo: portalUrl }
      }).then(function (result) {
        if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }

        if (result.error) {
          if (errorEl) { errorEl.textContent = 'Something went wrong. Please try again in a moment.'; }
          console.error('[SponsorAI] Magic link error:', result.error);
        } else {
          /* Show "check your inbox" state — hide form, show confirmation */
          loginForm.style.display = 'none';
          if (sentState) { sentState.style.display = 'block'; }
        }
      });
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
        _portalSignupSuccess(portalForm, emailInput, noteEl, btn);
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
          _portalSignupSuccess(portalForm, emailInput, noteEl, btn);
        } else {
          return res.json().then(function (body) {
            /* 23505 = unique violation: already signed up — treat as success */
            if (body && body.code === '23505') {
              _portalSignupSuccess(portalForm, emailInput, noteEl, btn);
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

  function _portalSignupSuccess(form, input, note, btn) {
    form.classList.add('is-submitted');
    if (note)  { note.textContent = "You're on the list. We'll be in touch."; note.className = 'signup__note is-success'; }
    if (input) { input.value = ''; }
    if (btn)   { btn.disabled = false; }
  }

})();
