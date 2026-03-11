/* =============================================
   SPONSORAI — Email Signup Handler
   ============================================= */

(function () {
  'use strict';

  const form    = document.getElementById('signupForm');
  const input   = document.getElementById('emailInput');
  const note    = document.getElementById('signupNote');

  if (!form || !input || !note) return;

  /* Basic email validation */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  }

  function setNote(message, type) {
    note.textContent  = message;
    note.className    = 'signup__note';
    if (type) note.classList.add('is-' + type);
  }

  function clearNote() {
    note.textContent = '';
    note.className   = 'signup__note';
  }

  /* Clear error on typing */
  input.addEventListener('input', function () {
    if (note.classList.contains('is-error')) clearNote();
  });

  /* Form submission */
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const email = input.value.trim();

    if (!email) {
      setNote('Please enter your email address.', 'error');
      input.focus();
      return;
    }

    if (!isValidEmail(email)) {
      setNote('That doesn\'t look quite right — try a valid email.', 'error');
      input.focus();
      return;
    }

    /*
     * TODO: Connect to your email capture backend here.
     * Example: POST to a Mailchimp, ConvertKit, or custom API endpoint.
     *
     * fetch('/api/subscribe', {
     *   method: 'POST',
     *   headers: { 'Content-Type': 'application/json' },
     *   body: JSON.stringify({ email })
     * })
     * .then(res => res.json())
     * .then(data => { ... })
     * .catch(err => { ... });
     *
     * For now we simulate a successful submission.
     */

    simulateSuccess(email);
  });

  function simulateSuccess(email) {
    /* Briefly disable the button to prevent double-submit */
    const btn = form.querySelector('.signup__btn');
    if (btn) btn.disabled = true;

    /* Short delay for feel */
    setTimeout(function () {
      form.classList.add('is-submitted');
      setNote('You\'re on the list. We\'ll be in touch.', 'success');
      input.value = '';
      if (btn) btn.disabled = false;

      /* Optional: log to console for dev confirmation */
      console.log('[SponsorAI] Signup captured:', email);
    }, 420);
  }

})();
