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
  let activeSportFilter = 'all';
  function filterTurfCards() {
    const query = document.getElementById('city').value.trim().toLowerCase();
    const cards = [...document.querySelectorAll('.turf-card')];
    let visible = 0;
    cards.forEach(card => {
      const sportMatch = activeSportFilter === 'all' || card.dataset.sport === activeSportFilter || (activeSportFilter === 'box' && card.dataset.sport === 'cricket');
      const textMatch = !query || card.textContent.toLowerCase().includes(query) || 'gorakhpur'.includes(query);
      card.hidden = !(sportMatch && textMatch);
      if (!card.hidden) visible++;
    });
    return visible;
  }
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    activeSportFilter = button.dataset.filter;
    const count = filterTurfCards();
    document.getElementById('searchNote').textContent = `${count} listed venue card${count === 1 ? '' : 's'} match your filters. Venue details and prices should be confirmed directly.`;
  }));
  document.getElementById('searchBtn').addEventListener('click', () => {
    const city = document.getElementById('city').value.trim();
    const note = document.getElementById('searchNote');
    const count = filterTurfCards();
    note.textContent = city ? (count ? `${count} listed venue card${count === 1 ? '' : 's'} match “${city}”. Search covers the currently listed sample cards.` : `No listed venue cards match “${city}”. Try Taramandal, Sahara Estate, Ranidiha, or Gorakhpur.`) : `${count} listed venue cards shown. Enter an area or venue name to narrow the list.`;
    document.querySelector('#discover .turf-grid').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  });
  document.getElementById('city').addEventListener('input', () => { filterTurfCards(); });
  document.getElementById('city').addEventListener('keydown', event => {
    if (event.key === 'Enter') document.getElementById('searchBtn').click();
  });
  document.querySelectorAll('.card-book').forEach(button => button.addEventListener('click', () => {
    notify(`${button.dataset.turf} selected — live booking will be connected in the full product.`);
  }));
  // Matchday Portal: lightweight pointer parallax, with reduced-motion respected.
  const portal = document.getElementById('matchPortal');
  const portalStage = document.getElementById('portalStage');
  if (portal && portalStage && !reduced) {
    portal.addEventListener('pointermove', event => {
      const rect = portal.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      portal.style.transform = `perspective(1100px) rotateY(${x * 3.5}deg) rotateX(${-y * 2.5}deg)`;
      portalStage.style.transform = `translate3d(${x * 7}px,${y * 5}px,0)`;
    }, { passive: true });
    portal.addEventListener('pointerleave', () => {
      portal.style.transform = '';
      portalStage.style.transform = '';
    }, { passive: true });
  }
  // Interactive match-day planner: builds a shareable invite and can prefill the booking form.
  const squadSport = document.getElementById('squadSport');
  const squadDate = document.getElementById('squadDate');
  const squadTime = document.getElementById('squadTime');
  const squadSize = document.getElementById('squadSize');
  const squadArea = document.getElementById('squadArea');
  const squadMessage = document.getElementById('squadMessage');
  const localDate = new Date();
  const localDateValue = `${localDate.getFullYear()}-${String(localDate.getMonth()+1).padStart(2,'0')}-${String(localDate.getDate()).padStart(2,'0')}`;
  if (squadDate) squadDate.min = localDateValue;
  function squadPlan() {
    const sport = squadSport?.value || 'Football';
    const date = squadDate?.value || '';
    const time = squadTime?.value || '06:00 PM';
    const players = Number(squadSize?.value || 10);
    const area = squadArea?.value.trim() || 'your area';
    const readableDate = date ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'}) : 'Date to be decided';
    return {sport,date,time,players,area,readableDate,text:`🏟️ BOOKRR MATCH INVITE\n\nWho’s in for ${sport.toLowerCase()}?\n📅 ${readableDate}\n⏰ ${time}\n👥 Looking for ${players} players\n📍 ${area}\n\nReply IN if you’re playing. Let’s lock a turf on BOOKRR: ${location.origin}/#book\n\nInvite only — this is not a confirmed turf booking.`};
  }
  function updateSquadPreview() {
    const plan = squadPlan();
    document.getElementById('playerCountLabel').textContent = `${plan.players} player${plan.players===1?'':'s'}`;
    document.getElementById('matchSportView').textContent = plan.sport;
    document.getElementById('matchPlayersView').textContent = `${plan.players} players`;
    document.getElementById('matchWhenView').textContent = `${plan.date ? plan.readableDate : 'Choose a date'} · ${plan.time}`;
    document.getElementById('matchAreaView').textContent = plan.area;
    const title = document.getElementById('matchCardTitle');
    title.innerHTML = `${plan.sport.toUpperCase()}.<br>YOUR SQUAD.<br><span>GAME ON.</span>`;
  }
  [squadSport,squadDate,squadTime,squadSize,squadArea].forEach(control => control?.addEventListener('input', updateSquadPreview));
  document.getElementById('generateInvite')?.addEventListener('click', async () => {
    const plan = squadPlan();
    if (!plan.date) { squadMessage.textContent = 'Choose a match date first, then generate your invite.'; squadDate?.focus(); return; }
    try {
      if (navigator.share) { await navigator.share({title:'BOOKRR Match Invite',text:plan.text}); squadMessage.textContent = 'Invite shared. Turf booking is still a separate step and is not confirmed yet.'; }
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(plan.text); squadMessage.textContent = 'Match invite copied. Paste it into your squad chat. Booking is not confirmed yet.'; }
      else { window.prompt('Copy your BOOKRR match invite:',plan.text); squadMessage.textContent = 'Copy the invite text into your squad chat. Booking is not confirmed yet.'; }
    } catch (error) { if (error?.name !== 'AbortError') { try { window.prompt('Copy your BOOKRR match invite:',plan.text); } catch {} } }
  });
  document.getElementById('bookFromPlan')?.addEventListener('click', () => {
    const plan = squadPlan();
    const bookingSport = document.getElementById('sportSelect');
    const bookingDateInput = document.getElementById('bookingDate');
    const notes = bookingForm?.elements.notes;
    if (bookingSport) { const match = [...bookingSport.options].find(option => option.value.toLowerCase() === plan.sport.toLowerCase()); if (match) bookingSport.value = match.value; }
    if (bookingDateInput && plan.date) bookingDateInput.value = plan.date;
    if (notes) notes.value = `Match plan: ${plan.players} players, ${plan.time}, area: ${plan.area}. Confirm slot with venue.`;
    if (typeof loadAvailableTimes === 'function') loadAvailableTimes();
    document.getElementById('book')?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
    squadMessage.textContent = 'Match details copied into the booking form where supported. Choose a venue and available start time; no booking has been submitted.';
  });
  updateSquadPreview();
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
  const startTimeSelect = document.getElementById('startTimeSelect');
  const availabilityNote = document.getElementById('availabilityNote');
  async function loadAvailableTimes() {
    if (!startTimeSelect || !bookingForm) return;
    const venueId = venueSelect?.value;
    const date = bookingDate?.value;
    const duration = bookingForm.elements.duration_hours?.value || '1';
    startTimeSelect.replaceChildren(new Option('Checking available times…', ''));
    if (!venueId || !date) {
      startTimeSelect.replaceChildren(new Option('Choose turf and date first', ''));
      if (availabilityNote) availabilityNote.textContent = 'Choose a turf, date and duration to check times. Hours are provisional (06:00–23:00).';
      return;
    }
    try {
      const params = new URLSearchParams({ venue_id: venueId, date, duration_hours: duration });
      const response = await fetch('/api/availability?' + params.toString(), { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Availability is temporarily unavailable.');
      startTimeSelect.replaceChildren(new Option(data.available_times?.length ? 'Choose a start time' : 'No times currently listed', ''));
      (data.available_times || []).forEach(time => startTimeSelect.add(new Option(time, time)));
      if (availabilityNote) availabilityNote.textContent = data.note || 'Times are provisional until the venue confirms.';
    } catch (error) {
      startTimeSelect.replaceChildren(new Option('Could not load times', ''));
      if (availabilityNote) availabilityNote.textContent = error.message;
    }
  }
  venueSelect?.addEventListener('change', loadAvailableTimes);
  bookingDate?.addEventListener('change', loadAvailableTimes);
  bookingForm?.elements.duration_hours?.addEventListener('change', loadAvailableTimes);
  if (venueSelect) {
    fetch('/api/venues', { headers: { Accept: 'application/json' } })
      .then(response => { if (!response.ok) throw new Error('Directory unavailable'); return response.json(); })
      .then(data => {
        liveVenues = Array.isArray(data.venues) ? data.venues : [];
        venueSelect.replaceChildren(new Option('Choose a Gorakhpur turf', ''));
        liveVenues.forEach(venue => venueSelect.add(new Option(`${venue.name} — ${venue.area}${venue.hourly_rate == null ? '' : ' · ₹' + venue.hourly_rate + '/hour'}`, venue.id)));
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
      await loadAvailableTimes();
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
      // Hide the attribution completely when it is accessible in the page DOM.
      target.style.setProperty('display', 'none', 'important');
      target.style.setProperty('visibility', 'hidden', 'important');
      target.style.setProperty('pointer-events', 'none', 'important');
    });
  }
  softenHatchableBadge();
  const badgeObserver = new MutationObserver(softenHatchableBadge);
  badgeObserver.observe(document.documentElement, { childList: true, subtree: true });
  // Keep the decorative motion inexpensive: CSS does the animation, JS only reacts to real interaction.
})();