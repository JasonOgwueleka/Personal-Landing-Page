// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Newsletter — submit to Kit via fetch so the visitor stays on the page.
// Kit replies with JSON: { status: "success" } or { status: "failed", errors: { messages: [...] } }.
const newsletterForm = document.querySelector('.newsletter-form');

if (newsletterForm) {
  const newsletterStatus = newsletterForm.querySelector('.newsletter-status');
  const newsletterBtn = newsletterForm.querySelector('.newsletter-btn');

  newsletterForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    newsletterBtn.disabled = true;
    newsletterBtn.textContent = 'Subscribing…';
    newsletterStatus.textContent = '';
    newsletterStatus.className = 'form-note newsletter-status';

    try {
      const response = await fetch(newsletterForm.action, {
        method: 'POST',
        body: new FormData(newsletterForm),
        headers: { Accept: 'application/json' },
      });
      const data = await response.json();

      if (data.status === 'success') {
        newsletterStatus.textContent = 'Almost there. Check your inbox to confirm your subscription.';
        newsletterStatus.className = 'form-note newsletter-status success';
        newsletterForm.reset();
      } else {
        const message = data.errors && data.errors.messages && data.errors.messages[0];
        newsletterStatus.textContent = message || 'Something went wrong. Please try again.';
        newsletterStatus.className = 'form-note newsletter-status error';
      }
    } catch (err) {
      newsletterStatus.textContent = 'Something went wrong. Please try again.';
      newsletterStatus.className = 'form-note newsletter-status error';
    } finally {
      newsletterBtn.disabled = false;
      newsletterBtn.textContent = 'Subscribe';
    }
  });
}

// Enquiry modal — open on button click, close on X / overlay / Escape
const modal = document.getElementById('enquiry-modal');
const openBtn = document.getElementById('enquiry-open');
const closeBtn = document.getElementById('enquiry-close');

function openModal() {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const firstField = modal.querySelector('input, textarea, select');
  if (firstField) firstField.focus();
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (openBtn) openBtn.focus();
}

if (modal && openBtn) {
  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
}
 
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
      submitBtn.textContent = 'Send enquiry';
    }
  });
}
