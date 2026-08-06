// Footer year
document.getElementById('year').textContent = new Date().getFullYear();
 
// Contact form — submit via fetch so the user gets inline feedback
// instead of being redirected to Formspree's page.
const form = document.querySelector('.contact-form');
const statusEl = document.getElementById('form-status');
 
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
 
    const endpoint = form.getAttribute('action');
    const submitBtn = form.querySelector('.submit-btn');
 
    if (!endpoint || endpoint.includes('YOUR_FORM_ID')) {
      statusEl.textContent = 'Form endpoint not configured yet — add your Formspree ID in index.html.';
      statusEl.className = 'form-note error';
      return;
    }
 
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    statusEl.textContent = '';
    statusEl.className = 'form-note';
 
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
 
      if (response.ok) {
        statusEl.textContent = 'Message sent — I\'ll get back to you shortly.';
        statusEl.className = 'form-note success';
        form.reset();
      } else {
        statusEl.textContent = 'Something went wrong. Please try again or email me directly.';
        statusEl.className = 'form-note error';
      }
    } catch (err) {
      statusEl.textContent = 'Something went wrong. Please try again or email me directly.';
      statusEl.className = 'form-note error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send message';
    }
  });
}