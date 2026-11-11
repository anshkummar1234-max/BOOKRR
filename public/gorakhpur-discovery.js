(() => {
  const grid = document.querySelector('.turf-grid');
  const cityInput = document.getElementById('city');
  const searchButton = document.getElementById('searchBtn');
  const note = document.getElementById('searchNote');
  if (!grid || !cityInput || !searchButton) return;

  cityInput.value = 'Gorakhpur';
  let venues = [];
  let activeFilter = 'all';

  const setNote = (message) => { if (note) note.textContent = message; };
  const mapsUrl = (query) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query || 'sports turfs Gorakhpur');

  function render() {
    const shown = venues.filter((venue) => {
      if (activeFilter === 'all') return true;
      const sports = Array.isArray(venue.sports) ? venue.sports.join(' ').toLowerCase() : String(venue.sports || '').toLowerCase();
      if (activeFilter === 'football') return sports.includes('football');
      if (activeFilter === 'cricket') return sports.includes('cricket');
      return /badminton|box|other/.test(sports);
    });
    grid.replaceChildren();
    if (!shown.length) {
      const empty = document.createElement('p');
      empty.className = 'search-note';
      empty.textContent = venues.length
        ? 'No listed venues match this sport filter.'
        : 'No active venues are listed for this area yet. We are starting with Gorakhpur. You can still contact us to suggest a venue.';
      grid.append(empty);
      return;
    }

    shown.forEach((venue, index) => {
      const card = document.createElement('article');
      card.className = 'turf-card reveal';
      const image = document.createElement('div');
      image.className = 'turf-image image-one';
      const chip = document.createElement('span');
      chip.className = 'image-chip';
      chip.textContent = venue.verification_status === 'verified' ? 'VERIFIED LISTING' : 'LISTING NOT VERIFIED';
      const number = document.createElement('span');
      number.className = 'image-number';
      number.textContent = String(index + 1).padStart(2, '0');
      image.append(chip, number);

      const info = document.createElement('div');
      info.className = 'turf-info';
      const headingWrap = document.createElement('div');
      const heading = document.createElement('h3');
      heading.textContent = venue.name || 'Sports venue';
      const area = document.createElement('p');
      area.textContent = '↗ ' + (venue.area || 'Gorakhpur area not specified');
      headingWrap.append(heading, area);
      info.append(headingWrap);

      const meta = document.createElement('div');
      meta.className = 'turf-meta';
      const sports = document.createElement('span');
      sports.textContent = Array.isArray(venue.sports) ? venue.sports.join(' · ') : (venue.sports || 'Sports');
      const price = document.createElement('strong');
      if (venue.hourly_rate !== null && venue.hourly_rate !== undefined && Number.isFinite(Number(venue.hourly_rate))) {
        price.textContent = '₹' + Number(venue.hourly_rate).toLocaleString('en-IN') + '/hr';
      } else {
        price.textContent = 'Contact for price';
      }
      meta.append(sports, price);

      const link = document.createElement('a');
      link.className = 'card-book';
      link.href = mapsUrl(venue.map_query || [venue.name, venue.area, 'Gorakhpur'].filter(Boolean).join(' '));
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Directions ↗';
      card.append(image, info, meta, link);
      grid.append(card);
    });
  }

  async function load() {
    const city = cityInput.value.trim() || 'Gorakhpur';
    searchButton.disabled = true;
    setNote('Loading active venue listings for ' + city + '…');
    try {
      const response = await fetch('/api/venues?city=' + encodeURIComponent(city), {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Venue directory is unavailable.');
      venues = Array.isArray(payload.venues) ? payload.venues : [];
      activeFilter = 'all';
      document.querySelectorAll('.filter').forEach((button) => button.classList.toggle('active', button.dataset.filter === 'all'));
      render();
      setNote(venues.length
        ? venues.length + ' active listing(s) in ' + (payload.city || city) + '. Availability and prices must be confirmed with the venue.'
        : 'No active venue records found for ' + city + '. No sample venues are being shown as real listings.');
    } catch (error) {
      venues = [];
      render();
      setNote(error.message || 'Could not load venue listings. Please try again.');
    } finally {
      searchButton.disabled = false;
    }
  }

  searchButton.addEventListener('click', load);
  cityInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') load();
  });
  document.querySelectorAll('.filter').forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      document.querySelectorAll('.filter').forEach((item) => item.classList.toggle('active', item === button));
      render();
    });
  });
  load();
})();