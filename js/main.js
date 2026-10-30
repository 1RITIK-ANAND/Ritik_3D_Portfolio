(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Scroll progress -> progress bar + robot
  var bar = $('#progress'), gameSec = $('#game');
  function onScroll() {
    var max = document.documentElement.scrollHeight - innerHeight;
    var p = max > 0 ? scrollY / max : 0;
    bar.style.width = (p * 100) + '%';
    // robot finishes its job around the end of the "Research" section
    var gTop = gameSec.offsetTop;
    var robotP = Math.min(1, scrollY / Math.max(1, gTop - innerHeight * 0.4));
    if (window.Robot) {
      window.Robot.setProgress(robotP);
      // fade background when the game takes over
      var f = 1 - Math.max(0, Math.min(1, (scrollY - (gTop - innerHeight * 0.6)) / (innerHeight * 0.5))) * 0.65;
      window.Robot.setFade(f);
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // Cursor glow
  var glow = $('#glow');
  addEventListener('pointermove', function (e) { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; }, { passive: true });

  // Typed roles
  var roles = ['Advance Operations Intern @ Stryker', 'Industrial AI · Digital Twin', 'Orthopedic Manufacturing Engineer', 'Python & SQL Developer', 'Smart Manufacturing Researcher'];
  var tEl = $('#typed'), ri = 0, ci = 0, del = false;
  (function type() {
    var word = roles[ri];
    tEl.textContent = word.slice(0, ci);
    if (!del && ci < word.length) { ci++; setTimeout(type, 55); }
    else if (!del) { del = true; setTimeout(type, 1500); }
    else if (ci > 0) { ci--; setTimeout(type, 25); }
    else { del = false; ri = (ri + 1) % roles.length; setTimeout(type, 300); }
  })();

  // Reveal + counters
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        $$('[data-count]', e.target).forEach(count);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach(function (el, i) { el.style.transitionDelay = (i % 3) * 80 + 'ms'; io.observe(el); });

  function count(el) {
    var end = +el.dataset.count, t0 = performance.now(), dur = 1400;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  // 3D tilt on cards
  $$('.tilt').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = c.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      c.style.transform = 'perspective(800px) rotateY(' + (x * 9) + 'deg) rotateX(' + (-y * 9) + 'deg) translateZ(6px)';
    });
    c.addEventListener('pointerleave', function () { c.style.transform = ''; });
  });

  // Mobile menu
  var burger = $('#burger'), menu = $('#menu');
  burger.addEventListener('click', function () {
    var o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o);
  });
  $$('#menu a').forEach(function (a) { a.addEventListener('click', function () { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }); });

  // Contact form -> mailto
  $('#form').addEventListener('submit', function (e) {
    e.preventDefault();
    var n = $('#f-name').value.trim(), m = $('#f-msg').value.trim();
    location.href = 'mailto:ritikanand243@gmail.com?subject=' + encodeURIComponent('Portfolio message from ' + n) + '&body=' + encodeURIComponent(m + '\n\n- ' + n);
  });

  $('#yr').textContent = new Date().getFullYear();
})();
