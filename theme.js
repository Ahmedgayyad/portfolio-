// Light / dark switch, shared by every page. The theme itself is chosen by a tiny inline script in
// each page's <head> before anything paints; this file wires up the switch. The new theme spreads
// out in a circle from the switch where the browser supports view transitions, and cross-fades
// everywhere else.
(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setTheme = (theme) => {
    root.dataset.theme = theme;
    toggle.setAttribute('aria-checked', String(theme === 'dark'));
    try { localStorage.setItem('ag-theme', theme); } catch (_) {}
  };

  toggle.setAttribute('aria-checked', String(root.dataset.theme === 'dark'));
  toggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || reducedMotion) {
      root.classList.add('theme-fade');
      setTheme(next);
      setTimeout(() => root.classList.remove('theme-fade'), 450);
      return;
    }
    const r = toggle.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = document.startViewTransition(() => setTheme(next));
    transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  });
})();
