(() => {
  // Friction and attribution only; never treat client-side controls as access control.
  const protectedPaths = new Set([
    '/my-bookings', '/my-bookings.html', '/profile', '/profile.html',
    '/owner', '/owner.html', '/admin', '/admin.html',
    '/admin-bookings.html', '/admin-owners.html', '/admin-venues.html',
    '/admin-growth.html', '/admin-automation.html'
  ]);
  if (!protectedPaths.has(location.pathname)) return;

  const style = document.createElement('style');
  style.textContent = `
    #bookrr-user-watermark {
      position: fixed; inset: 0; z-index: 9998; pointer-events: none;
      overflow: hidden; opacity: .10; user-select: none; -webkit-user-select: none;
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
      align-content: space-around; justify-items: center; gap: 8vh 4vw;
    }
    #bookrr-user-watermark span {
      color: #d5ff3f; font: 800 11px/1.5 Arial,sans-serif;
      letter-spacing: .12em; transform: rotate(-24deg); white-space: nowrap;
      text-shadow: 0 1px 2px #000;
    }
    @media print { #bookrr-user-watermark { opacity: .35; } }
  `;
  document.head.appendChild(style);

  // Keep ordinary selection/context menus available until we know this is a signed-in private view.
  const auth = window.hatchable && window.hatchable.auth;
  if (!auth || typeof auth.getSession !== 'function') return;
  auth.getSession().then(session => {
    const user = session && session.user;
    if (!user) return;
    const email = String(user.email || 'BOOKRR member');
    const safeLabel = email.length > 6 ? email.slice(0, 2) + '•••' + email.slice(email.indexOf('@')) : 'BOOKRR member';
    const mark = document.createElement('div');
    mark.id = 'bookrr-user-watermark';
    mark.setAttribute('aria-hidden', 'true');
    const stamp = 'BOOKRR PRIVATE • ' + safeLabel + ' • ' + new Date().toLocaleDateString('en-IN');
    for (let i = 0; i < 8; i++) {
      const span = document.createElement('span');
      span.textContent = stamp;
      mark.appendChild(span);
    }
    document.body.appendChild(mark);

    // Low-friction deterrents only. Form controls and editable fields remain usable.
    document.addEventListener('contextmenu', event => {
      if (!event.target.closest('input, textarea, select, [contenteditable="true"]')) event.preventDefault();
    });
    document.addEventListener('selectstart', event => {
      if (!event.target.closest('input, textarea, select, [contenteditable="true"]')) event.preventDefault();
    });
  }).catch(() => {});
})();