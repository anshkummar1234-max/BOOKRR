(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toast = document.getElementById('toast');
  let toastTimer;
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }
  const menu = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  menu.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.textContent = open ? '×' : '☰';
  });
  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    navLinks.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.textContent = '☰';
  }));
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    document.querySelectorAll('.turf-card').forEach(card => {
      card.hidden = filter !== 'all' && card.dataset.sport !== filter && !(filter === 'box' && card.dataset.sport === 'cricket');
    });
  }));
  document.getElementById('searchBtn').addEventListener('click', () => {
    const city = document.getElementById('city').value.trim();
    const note = document.getElementById('searchNote');
    if (!city) {
      note.textContent = 'Enter a city or area to preview a local search.';
      document.getElementById('city').focus();
      return;
    }
    note.textContent = `Showing sample discovery cards for ${city}. Live location search is not connected in this prototype.`;
    document.querySelector('#discover .turf-grid').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  });
  document.getElementById('city').addEventListener('keydown', event => {
    if (event.key === 'Enter') document.getElementById('searchBtn').click();
  });
  document.querySelectorAll('.card-book').forEach(button => button.addEventListener('click', () => {
    notify(`${button.dataset.turf} selected — live booking will be connected in the full product.`);
  }));
  const revealEls = document.querySelectorAll('.reveal, .step');
  if ('IntersectionObserver' in window && !reduced) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add(entry.target.classList.contains('step') ? 'in-view' : 'visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.14 });
    revealEls.forEach((el, index) => { el.style.transitionDelay = `${Math.min(index % 4, 3) * 65}ms`; observer.observe(el); });
  } else revealEls.forEach(el => el.classList.add(el.classList.contains('step') ? 'in-view' : 'visible'));
  if (!reduced && window.matchMedia('(pointer:fine)').matches) {
    const art = document.querySelector('.hero-art');
    const ball = document.querySelector('.ball-wrap');
    art.addEventListener('pointermove', event => {
      const rect = art.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      ball.style.animationPlayState = 'paused';
      ball.style.transform = `translate(${x * 17}px, ${y * 15}px) rotate(${x * 12}deg)`;
      art.style.setProperty('--mx', `${x * 18}px`);
      art.style.setProperty('--my', `${y * 18}px`);
    });
    art.addEventListener('pointerleave', () => { ball.style.animationPlayState = 'running'; ball.style.transform = ''; });
    document.querySelectorAll('.magnetic').forEach(button => {
      button.addEventListener('pointermove', event => {
        const rect = button.getBoundingClientRect();
        button.style.transform = `translate(${(event.clientX - rect.left - rect.width / 2) * .08}px, ${(event.clientY - rect.top - rect.height / 2) * .12}px)`;
      });
      button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    });
  }
  // Live directory and secure booking-request flow.
  const venueSelect = document.getElementById('venueSelect');
  const bookingForm = document.getElementById('bookingForm');
  const bookingMessage = document.getElementById('bookingMessage');
  const bookingDate = document.getElementById('bookingDate');
  if (bookingDate) {
    const now = new Date();
    bookingDate.min = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }
  let liveVenues = [];
  if (venueSelect) {
    fetch('/api/venues', { headers: { Accept: 'application/json' } })
      .then(response => { if (!response.ok) throw new Error('Directory unavailable'); return response.json(); })
      .then(data => {
        liveVenues = Array.isArray(data.venues) ? data.venues : [];
        venueSelect.replaceChildren(new Option('Choose a Gorakhpur turf', ''));
        liveVenues.forEach(venue => venueSelect.add(new Option(`${venue.name} — ${venue.area}`, venue.id)));
      })
      .catch(() => { venueSelect.replaceChildren(new Option('Venue directory temporarily unavailable', '')); });
  }
  if (bookingForm) bookingForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = bookingForm.querySelector('button[type="submit"]');
    const values = Object.fromEntries(new FormData(bookingForm).entries());
    const venue = liveVenues.find(item => String(item.id) === String(values.venue_id));
    if (!venue) { bookingMessage.textContent = 'Please choose a venue from the loaded directory.'; return; }
    if (!venue.sports.includes(values.sport) && values.sport !== 'Other sports') {
      bookingMessage.textContent = 'That sport is not listed for this venue. Choose another sport or confirm directly with the venue.'; return;
    }
    submit.disabled = true; bookingMessage.textContent = 'Submitting your request…';
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(values)
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        location.href = '/login?next=' + encodeURIComponent('/#book'); return;
      }
      if (!response.ok) throw new Error(data.error || 'Could not submit your request.');
      bookingMessage.textContent = `Request #${data.booking.id} received for ${venue.name}. ${data.message}`;
      bookingForm.reset();
      bookingDate.min = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
      notify('Booking request saved securely. Venue confirmation is still required.');
    } catch (error) { bookingMessage.textContent = error.message || 'Network error. Please try again.'; }
    finally { submit.disabled = false; }
  });
  // Installable mobile app (PWA). Booking APIs are deliberately never cached.
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
  let installPrompt = null;
  const installButton = document.getElementById('installApp');
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event;
    if (installButton) installButton.hidden = false;
  });
  if (installButton) installButton.addEventListener('click', async () => {
    if (!installPrompt) { notify('On iPhone: Share → Add to Home Screen. On Android: browser menu → Install app.'); return; }
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null; installButton.hidden = true;
  });
  window.addEventListener('appinstalled', () => { if (installButton) installButton.hidden = true; notify('BOOKRR added to your home screen. Game on!'); });
  // Make the platform-injected Hatchable attribution unobtrusive when it is part of the page DOM.
  // If Hatchable renders it outside the page DOM (for example in a separate frame), this cannot affect it.
  function softenHatchableBadge() {
    const candidates = [...document.querySelectorAll('body *')].filter(el => {
      const text = (el.innerText || el.textContent || '').trim();
      return text === 'Built on Hatchable' && ![...el.children].some(child => (child.innerText || child.textContent || '').trim() === text);
    });
    candidates.forEach(el => {
      let target = el;
      for (let i = 0; i < 4 && target.parentElement; i++) {
        const style = getComputedStyle(target);
        const parentStyle = getComputedStyle(target.parentElement);
        if (style.position === 'fixed' || parentStyle.position === 'fixed' || /hatchable/i.test(target.parentElement.className?.toString() || '')) {
          if (parentStyle.position === 'fixed') target = target.parentElement;
          break;
        }
        target = target.parentElement;
      }
      target.style.setProperty('font-size', '9px', 'important');
      target.style.setProperty('padding', '4px 7px', 'important');
      target.style.setProperty('opacity', '0.42', 'important');
      target.style.setProperty('transform', 'scale(0.78)', 'important');
      target.style.setProperty('transform-origin', 'bottom right', 'important');
    });
  }
  softenHatchableBadge();
  const badgeObserver = new MutationObserver(softenHatchableBadge);
  badgeObserver.observe(document.documentElement, { childList: true, subtree: true });
  // Keep the decorative motion inexpensive: CSS does the animation, JS only reacts to real interaction.
})();