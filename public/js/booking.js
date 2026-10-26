/**
 * MIMORI DIGITAL - WHITE THEME BOOKING LOGIC
 * Validates inputs, handles submission to POST /api/enquiries,
 * renders Section 12 confirmation, and provides .ics calendar download.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('booking-form');
  const confirmationBox = document.getElementById('booking-confirmation');
  const dateInput = document.getElementById('event-date');

  // Set minimum date to tomorrow
  if (dateInput) {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
  }

  function setFieldError(fieldId, msg) {
    const group = document.getElementById(`group-${fieldId}`);
    if (group) {
      group.classList.add('has-error');
      const err = group.querySelector('.field-error-text');
      if (err) err.textContent = msg;
    }
  }

  function clearFieldError(fieldId) {
    const group = document.getElementById(`group-${fieldId}`);
    if (group) {
      group.classList.remove('has-error');
    }
  }

  // Clear errors dynamically on input
  ['full-name', 'email', 'phone', 'services', 'event-location', 'event-date', 'event-type', 'consent'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => clearFieldError(id));
      el.addEventListener('change', () => clearFieldError(id));
    }
  });

  const productSelect = document.getElementById('product-select');
  if (productSelect) {
    productSelect.addEventListener('change', () => clearFieldError('services'));
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      let hasErrors = false;

      const fullName = document.getElementById('full-name').value.trim();
      const email = document.getElementById('email').value.trim();
      const countryCode = document.getElementById('country-code') ? document.getElementById('country-code').value : '+44';
      const phoneRaw = document.getElementById('phone').value.trim();
      const product = document.getElementById('product-select').value;
      const venue = document.getElementById('event-location').value.trim();
      const city = document.getElementById('city-select') ? document.getElementById('city-select').value : '';
      const eventDate = document.getElementById('event-date').value;
      const eventType = document.getElementById('event-type').value;
      const message = document.getElementById('message').value.trim();
      const consent = document.getElementById('consent').checked;

      if (!fullName || fullName.length < 2) {
        setFieldError('full-name', 'Please enter your full name');
        hasErrors = true;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        setFieldError('email', 'Please provide a valid email');
        hasErrors = true;
      }

      if (!phoneRaw || phoneRaw.replace(/\D/g, '').length < 6) {
        setFieldError('phone', 'Please enter a valid phone number');
        hasErrors = true;
      }

      if (!product) {
        setFieldError('services', 'Please select a photobooth experience');
        hasErrors = true;
      }

      if (!venue) {
        setFieldError('event-location', 'Please state your event venue');
        hasErrors = true;
      }

      if (!eventDate) {
        setFieldError('event-date', 'Please choose your event date');
        hasErrors = true;
      }

      if (!eventType) {
        setFieldError('event-type', 'Please select your event category');
        hasErrors = true;
      }

      if (!consent) {
        setFieldError('consent', 'You must agree to proceed');
        hasErrors = true;
      }

      if (hasErrors) {
        const firstErr = form.querySelector('.has-error');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const payload = {
        fullName,
        email,
        phone: `${countryCode} ${phoneRaw}`,
        eventType,
        eventDate,
        eventLocation: city ? `${venue}, ${city}` : venue,
        services: [product],
        message,
        consent
      };

      const submitBtn = document.getElementById('booking-submit-btn');
      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Submitting Enquiry...</span>';

      try {
        const res = await fetch('/api/enquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;

        if (res.ok && result.success) {
          form.style.display = 'none';
          confirmationBox.classList.add('active');

          const ref = result.referenceId;
          document.getElementById('conf-reference-code').textContent = ref;
          document.getElementById('conf-client-name').textContent = result.enquiry.fullName;
          document.getElementById('conf-event-type').textContent = result.enquiry.eventType;
          document.getElementById('conf-event-date').textContent = result.enquiry.eventDate;
          document.getElementById('conf-location').textContent = result.enquiry.eventLocation;
          document.getElementById('conf-services').textContent = result.enquiry.services.join(', ');

          // Copy ref code
          const copyBtn = document.getElementById('copy-ref-btn');
          if (copyBtn) {
            copyBtn.onclick = () => {
              navigator.clipboard.writeText(ref).then(() => {
                copyBtn.textContent = 'Copied! ✓';
                setTimeout(() => copyBtn.textContent = 'Copy Code', 2000);
              });
            };
          }

          // Calendar download (.ics)
          const calBtn = document.getElementById('add-calendar-btn');
          if (calBtn) {
            calBtn.onclick = () => downloadCalendar(result.enquiry);
          }

          // Reset button
          const resetBtn = document.getElementById('book-another-btn');
          if (resetBtn) {
            resetBtn.onclick = () => {
              form.reset();
              confirmationBox.classList.remove('active');
              form.style.display = 'block';
              form.scrollIntoView({ behavior: 'smooth' });
            };
          }

          confirmationBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          alert(result.message || 'Error submitting enquiry. Please check your form.');
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
        alert('Network connection error. Please try again or call our event concierge.');
      }
    });
  }

  function downloadCalendar(enquiry) {
    const title = `Mimori Digital - ${enquiry.eventType} Photobooth`;
    const location = enquiry.eventLocation;
    const description = `Booking Reference: ${enquiry.referenceId}\\nProduct: ${enquiry.services.join(', ')}`;
    const dateFormatted = enquiry.eventDate.replace(/-/g, '');
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mimori Digital//Event Calendar//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `DTSTART;VALUE=DATE:${dateFormatted}`,
      `DTEND;VALUE=DATE:${dateFormatted}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Mimori-${enquiry.referenceId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});
