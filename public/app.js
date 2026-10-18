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
  // Keep the decorative motion inexpensive: CSS does the animation, JS only reacts to real interaction.
})();