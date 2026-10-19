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
      const textMatch = !query || card.textContent.toLowerCase().includes(query) || ['gorakhpur','gkp'].includes(query);
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
  let currentMatchToken = '';
  let currentMatchFingerprint = '';
  let linkedMatchStartTime = '';
  function matchFingerprint(plan) {
    return JSON.stringify([plan.sport, plan.date, plan.time, plan.players, plan.area === 'your area' ? '' : plan.area]);
  }
  function getMatchVisitorKey() {
    const keyName = 'bookrr-match-visitor';
    try {
      let key = sessionStorage.getItem(keyName);
      if (!key) {
        key = crypto.randomUUID ? crypto.randomUUID() : 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        sessionStorage.setItem(keyName, key);
      }
      return key;
    } catch {
      return 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
  }
  async function ensurePersistentMatch() {
    const plan = squadPlan();
    if (!plan.date) throw new Error('Choose a match date first.');
    const fingerprint = matchFingerprint(plan);
    if (currentMatchToken && currentMatchFingerprint === fingerprint) {
      return { token: currentMatchToken, url: location.origin + '/match.html?token=' + encodeURIComponent(currentMatchToken), match: null };
    }
    const payload = {
      sport: plan.sport,
      match_date: plan.date,
      start_time: plan.time,
      players_needed: plan.players,
      area: plan.area === 'your area' ? '' : plan.area,
      organizer_name: 'A teammate',
      visitor_key: getMatchVisitorKey(),
      website: ''
    };
    const response = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not create the match invite.');
    currentMatchToken = data.match.invite_token;
    currentMatchFingerprint = fingerprint;
    linkedMatchStartTime = String(data.match.start_time || '').slice(0,5);
    const tokenInput = document.getElementById('matchTokenInput');
    if (tokenInput) tokenInput.value = currentMatchToken;
    return { token: currentMatchToken, url: new URL(data.invite_url, location.origin).toString(), match: data.match };
  }
  function matchTimeToOption(value) {
    const parts = String(value || '').slice(0,5).split(':').map(Number);
    if (parts.length !== 2 || parts.some(Number.isNaN)) return '';
    const hour = parts[0] % 12 || 12;
    return String(hour).padStart(2,'0') + ':' + String(parts[1]).padStart(2,'0') + ' ' + (parts[0] >= 12 ? 'PM' : 'AM');
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
    const button = document.getElementById('generateInvite');
    button.disabled = true;
    squadMessage.textContent = 'Creating your shareable match invite…';
    try {
      const saved = await ensurePersistentMatch();
      const message = `🏟️ BOOKRR MATCH INVITE\n\nWho’s in for ${plan.sport.toLowerCase()}?\n📅 ${plan.readableDate}\n⏰ ${plan.time}\n👥 Looking for ${plan.players} players\n📍 ${plan.area}\n\nOpen the match plan, RSVP, and help organize the game:\n${saved.url}\n\nAn invite is not a confirmed turf booking.`;
      if (navigator.share) {
        try {
          await navigator.share({title:'BOOKRR Match Invite', text:message, url:saved.url});
          squadMessage.textContent = 'Invite ready and share sheet opened. A turf booking is still a separate step.';
        } catch (error) {
          if (error?.name === 'AbortError') squadMessage.textContent = 'Your match invite is saved. Share it with your squad whenever you’re ready.';
          else throw error;
        }
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        squadMessage.textContent = 'Match invite copied with its unique link. Paste it into your squad chat.';
      } else {
        window.prompt('Copy your BOOKRR match invite:', message);
        squadMessage.textContent = 'Share the unique match link with your squad. Booking is not confirmed yet.';
      }
    } catch (error) {
      squadMessage.textContent = error.message || 'Could not create your invite. Please try again.';
    } finally { button.disabled = false; }
  });
  document.getElementById('bookFromPlan')?.addEventListener('click', async () => {
    const plan = squadPlan();
    if (!plan.date) { squadMessage.textContent = 'Choose a match date first, then find a turf.'; squadDate?.focus(); return; }
    const button = document.getElementById('bookFromPlan');
    button.disabled = true;
    try {
      const saved = await ensurePersistentMatch();
      const bookingSport = document.getElementById('sportSelect');
      const bookingDateInput = document.getElementById('bookingDate');
      const tokenInput = document.getElementById('matchTokenInput');
      const notes = bookingForm?.elements.notes;
      if (tokenInput) tokenInput.value = saved.token;
      linkedMatchStartTime = String(saved.match?.start_time || linkedMatchStartTime || '').slice(0,5);
      if (bookingSport) { const match = [...bookingSport.options].find(option => option.value.toLowerCase() === plan.sport.toLowerCase()); if (match) bookingSport.value = match.value; }
      if (bookingDateInput) bookingDateInput.value = plan.date;
      if (notes) notes.value = `Match plan: ${plan.players} players, ${plan.time}, area: ${plan.area}. Confirm slot with venue.`;
      if (typeof loadAvailableTimes === 'function') await loadAvailableTimes();
      document.getElementById('book')?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
      squadMessage.textContent = 'Match plan linked. Choose a venue and start time; the reservation is not submitted until you request it and the venue confirms.';
    } catch (error) {
      squadMessage.textContent = error.message || 'Could not prepare the booking form.';
    } finally { button.disabled = false; }
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
  const matchTokenInput = document.getElementById('matchTokenInput');
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
      if (linkedMatchStartTime && data.available_times?.includes(linkedMatchStartTime)) startTimeSelect.value = linkedMatchStartTime;
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
        if (new URLSearchParams(location.search).has('rebook') && !new URLSearchParams(location.search).has('match')) hydratePreviousBooking();
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
        const nextPath = values.match_token ? '/?match=' + encodeURIComponent(values.match_token) + '#book' : '/#book';
        location.href = '/login?next=' + encodeURIComponent(nextPath); return;
      }
      if (!response.ok) throw new Error(data.error || 'Could not submit your request.');
      const linkedMatchToken = values.match_token || '';
      bookingMessage.textContent = `Request #${data.booking.id} received for ${venue.name}. ${data.message}`;
      bookingForm.reset();
      await loadAvailableTimes();
      bookingDate.min = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
      notify('Booking request saved securely. Venue confirmation is still required.');
      if (linkedMatchToken) { location.href = '/match.html?token=' + encodeURIComponent(linkedMatchToken); return; }
    } catch (error) { bookingMessage.textContent = error.message || 'Network error. Please try again.'; }
    finally { submit.disabled = false; }
  });
  // If a player arrives from a shared match invite, keep the booking attributed to that match.
  async function hydratePreviousBooking() {
    const bookingId = new URLSearchParams(location.search).get('rebook') || '';
    if (!/^\d+$/.test(bookingId)) {
      if (bookingMessage) bookingMessage.textContent = 'This rebooking link is invalid. Open My Bookings and use Run It Back.';
      return;
    }
    try {
      const response = await fetch('/api/my-bookings', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        location.href = '/login?next=' + encodeURIComponent('/?rebook=' + bookingId + '#book');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Could not load your booking history.');
      const booking = (data.bookings || []).find(item => String(item.id) === bookingId);
      if (!booking || !['confirmed','completed'].includes(booking.status)) {
        throw new Error('Only your confirmed or completed bookings can be rebooked. Open My Bookings to check the status.');
      }
      const venue = liveVenues.find(item => String(item.id) === String(booking.venue_id));
      if (!venue) throw new Error('That turf is no longer listed. Choose another venue to plan your next game.');
      if (venueSelect) venueSelect.value = String(booking.venue_id);
      const bookingSport = document.getElementById('sportSelect');
      if (bookingSport) {
        const option = [...bookingSport.options].find(item => item.value === booking.sport);
        if (option) bookingSport.value = booking.sport;
      }
      if (bookingDate) bookingDate.value = '';
      if (bookingForm?.elements.duration_hours) bookingForm.elements.duration_hours.value = String(booking.duration_hours || 1);
      if (bookingForm?.elements.notes) bookingForm.elements.notes.value = `Run it back from previous booking #${booking.id}. Choose a new date and time; confirm price and availability with the venue.`;
      currentMatchToken = '';
      currentMatchFingerprint = '';
      linkedMatchStartTime = '';
      if (matchTokenInput) matchTokenInput.value = '';
      await loadAvailableTimes();
      if (bookingMessage) bookingMessage.textContent = `Ready to run it back at ${booking.venue_name}. Choose a new date and available time; this will create a new request, not repeat the old reservation.`;
      document.getElementById('book')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    } catch (error) {
      if (bookingMessage) bookingMessage.textContent = error.message || 'Could not prepare your rebooking.';
    }
  }
  async function hydrateMatchPlanForBooking() {
    const token = new URLSearchParams(location.search).get('match');
    if (!token) return;
    try {
      const response = await fetch('/api/matches?token=' + encodeURIComponent(token), { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load the shared match plan.');
      const m = data.match;
      currentMatchToken = token;
      if (squadSport) squadSport.value = m.sport;
      if (squadDate) squadDate.value = m.match_date;
      if (squadTime) squadTime.value = matchTimeToOption(m.start_time);
      if (squadSize) squadSize.value = String(m.players_needed);
      if (squadArea) squadArea.value = m.area || '';
      currentMatchFingerprint = matchFingerprint(squadPlan());
      linkedMatchStartTime = String(m.start_time || '').slice(0,5);
      if (matchTokenInput) matchTokenInput.value = token;
      updateSquadPreview();
      const bookingSport = document.getElementById('sportSelect');
      if (bookingSport) bookingSport.value = m.sport;
      if (bookingDate) bookingDate.value = m.match_date;
      if (bookingForm?.elements.notes) bookingForm.elements.notes.value = `Shared match plan: ${m.players_needed} players in ${m.area || 'your area'}. Confirm slot with venue.`;
      await loadAvailableTimes();
      if (bookingMessage) bookingMessage.textContent = 'Shared match plan loaded. Choose a venue and confirm the available time before sending a booking request.';
    } catch (error) {
      if (bookingMessage) bookingMessage.textContent = error.message || 'Could not load the shared match plan.';
    }
  }
  hydrateMatchPlanForBooking();
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