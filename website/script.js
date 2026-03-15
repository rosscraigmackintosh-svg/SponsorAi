/* =============================================
   SPONSORAI — Email Signup Handler
   ============================================= */

(function () {
  'use strict';

  var form  = document.getElementById('signupForm');
  var input = document.getElementById('emailInput');
  var note  = document.getElementById('signupNote');

  if (!form || !input || !note) return;

  /* Read credentials from website/config.js (gitignored, loaded before this script).
     Both vars must be present; if not, submissions degrade gracefully. */
  var API_URL = (typeof WEBSITE_API_URL !== 'undefined') ? WEBSITE_API_URL : null;
  var API_KEY = (typeof WEBSITE_API_KEY !== 'undefined') ? WEBSITE_API_KEY : null;

  /* ── Helpers ───────────────────────────────────────────────────────── */

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  }

  function setNote(message, type) {
    note.textContent = message;
    note.className   = 'signup__note';
    if (type) note.classList.add('is-' + type);
  }

  function clearNote() {
    note.textContent = '';
    note.className   = 'signup__note';
  }

  function setSubmitting(isSubmitting) {
    var btn = form.querySelector('.signup__btn');
    if (!btn) return;
    btn.disabled = isSubmitting;
    input.disabled = isSubmitting;
  }

  /* ── Clear error on typing ─────────────────────────────────────────── */
  input.addEventListener('input', function () {
    if (note.classList.contains('is-error')) clearNote();
  });

  /* ── Form submission ───────────────────────────────────────────────── */
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var email = input.value.trim();

    if (!email) {
      setNote('Please enter your email address.', 'error');
      input.focus();
      return;
    }

    if (!isValidEmail(email)) {
      setNote("That doesn't look quite right — try a valid email.", 'error');
      input.focus();
      return;
    }

    setSubmitting(true);
    clearNote();
    submitSignup(email);
  });

  /* ── Supabase insert ───────────────────────────────────────────────── */
  function submitSignup(email) {
    if (!API_URL || !API_KEY) {
      /* Config not loaded — degrade gracefully rather than silent fail */
      handleError({ message: 'configuration_missing' }, email);
      return;
    }

    fetch(API_URL + '/email_signups', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        API_KEY,
        'Authorization': 'Bearer ' + API_KEY,
        'Prefer':        'return=minimal'  /* do not echo the row back */
      },
      body: JSON.stringify({ email: email, source: 'website' })
    })
    .then(function (res) {
      if (res.ok) {
        handleSuccess(email);
      } else {
        return res.json().then(function (body) {
          /* Supabase unique-violation code: 23505 */
          if (body && body.code === '23505') {
            /* Treat duplicate as success — user is already on the list */
            handleSuccess(email, true);
          } else {
            handleError(body, email);
          }
        });
      }
    })
    .catch(function (err) {
      handleError(err, email);
    });
  }

  /* ── Outcome handlers ──────────────────────────────────────────────── */
  function handleSuccess(email, isDuplicate) {
    setSubmitting(false);
    form.classList.add('is-submitted');
    setNote("You're on the list. We'll be in touch.", 'success');
    input.value = '';
  }

  function handleError(err, email) {
    setSubmitting(false);

    var isOffline   = !navigator.onLine;
    var isMissing   = err && err.message === 'configuration_missing';

    if (isOffline) {
      setNote("You appear to be offline. Please try again when connected.", 'error');
    } else if (isMissing) {
      /* Dev environment without config.js — treat as success so the flow
         is testable locally, but log clearly so the developer knows. */
      console.warn('[SponsorAI] website/config.js not loaded — signup not stored. Email was:', email);
      form.classList.add('is-submitted');
      setNote("You're on the list. We'll be in touch.", 'success');
      input.value = '';
    } else {
      setNote("Something went wrong. Please try again in a moment.", 'error');
      console.error('[SponsorAI] Signup error:', err);
    }
  }

})();
