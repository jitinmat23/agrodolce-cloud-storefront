export function initSubscription() {
  const form = document.querySelector('#subscribe-form');
  const feedback = form.querySelector('.form-feedback');
  const button = form.querySelector('[type=submit]');
  const channelInputs = [...form.querySelectorAll('[name=channel]')];
  let busy = false;

  function updateFields() {
    for (const [channel, field] of [['email', 'email'], ['whatsapp', 'phone']]) {
      const selected = channelInputs.some(input => input.value === channel && input.checked);
      const input = form.elements[field];
      input.disabled = !selected;
      input.required = selected;
      input.closest('label').hidden = !selected;
    }
    channelInputs[0].setCustomValidity(channelInputs.some(input => input.checked)
      ? '' : 'Choose at least one way to receive updates.');
  }
  channelInputs.forEach(input => input.addEventListener('change', updateFields));
  updateFields();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const data = new FormData(form);
    busy = true;
    button.disabled = true;
    feedback.className = 'form-feedback';
    feedback.textContent = 'Saving your preferences…';
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channels: data.getAll('channel'),
          email: data.get('email'),
          phone: data.get('phone'),
          consent: data.get('consent') === 'on',
          website: data.get('website'),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to subscribe. Please try again.');
      feedback.className = 'form-feedback success';
      feedback.textContent = result.preview
        ? 'Preview subscription saved. This is a test; you won’t receive any updates.'
        : 'Thank you! Your new-product subscription preferences have been saved.';
      form.reset();
      updateFields();
    } catch (error) {
      feedback.className = 'form-feedback error';
      feedback.textContent = error.message === 'Failed to fetch'
        ? 'Unable to connect. Please try again.' : error.message;
    } finally {
      busy = false;
      button.disabled = false;
    }
  });
}
