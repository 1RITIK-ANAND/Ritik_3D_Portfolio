/* Zero-Defect Run: catch in-tolerance parts, avoid defective ones. */
(function () {
  'use strict';
  var cv = document.getElementById('gcanvas'), ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height;
  var elScore = document.getElementById('score'), elBest = document.getElementById('best'), elLives = document.getElementById('lives');
  var ov = document.getElementById('overlay'), ovT = document.getElementById('ov-title'), ovX = document.getElementById('ov-text'), btn = document.getElementById('start');

  var best = 0;
  try { best = +(localStorage.getItem('ra_best') || 0); } catch (e) { best = 0; }
  elBest.textContent = best;

  var running = false, score, lives, items, tray, spawnT, speed, last, combo, keys = {};

  function reset() {
    score = 0; lives = 3; items = []; spawnT = 0; speed = 2.2; combo = 0;
    tray = { x: W / 2, w: 96, h: 14, y: H - 40 };
    sync();
  }
  function sync() {
    elScore.textContent = score;
    elLives.textContent = lives > 0 ? new Array(lives + 1).join('\u2764') : '\u2014';
  }
  function spawn() {
    var bad = Math.random() < 0.32;
    items.push({ x: 24 + Math.random() * (W - 48), y: -20, r: 15, bad: bad, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.08 });
  }
  function end() {
    running = false;
    if (score > best) { best = score; try { localStorage.setItem('ra_best', best); } catch (e) { } elBest.textContent = best; }
    ovT.textContent = 'Line stopped'; ovX.textContent = 'Final score: ' + score + (score >= best && score > 0 ? ' (new best!)' : '');
    btn.textContent = 'Run again'; ov.classList.remove('hide');
  }

  function update(dt) {
    if (keys.ArrowLeft || keys.a) tray.x -= 7 * dt;
    if (keys.ArrowRight || keys.d) tray.x += 7 * dt;
    tray.x = Math.max(tray.w / 2, Math.min(W - tray.w / 2, tray.x));
    spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = Math.max(18, 58 - score * 0.35); }
    speed = 2.2 + Math.min(4.5, score / 120);
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i]; it.y += speed * dt; it.rot += it.vr * dt;
      var caught = it.y + it.r >= tray.y && it.y - it.r <= tray.y + tray.h && Math.abs(it.x - tray.x) <= tray.w / 2 + it.r * 0.6;
      if (caught) {
        if (it.bad) { lives--; combo = 0; } else { combo++; score += 10 + Math.min(combo, 10); }
        items.splice(i, 1); sync();
        if (lives <= 0) { end(); return; }
      } else if (it.y > H + 30) {
        if (!it.bad) combo = 0;
        items.splice(i, 1);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(39,225,255,.06)'; ctx.lineWidth = 1;
    for (var g = 0; g < W; g += 40) { ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, H); ctx.stroke(); }
    for (g = 0; g < H; g += 40) { ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(W, g); ctx.stroke(); }
    items.forEach(function (it) {
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
      var col = it.bad ? '#ff5c6c' : '#27e1ff';
      ctx.strokeStyle = col; ctx.fillStyle = it.bad ? 'rgba(255,92,108,.15)' : 'rgba(39,225,255,.15)'; ctx.lineWidth = 2;
      ctx.shadowColor = col; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 0, it.r, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, it.r * 0.45, 0, 6.283); ctx.stroke();
      if (it.bad) { ctx.beginPath(); ctx.moveTo(-it.r * 0.8, -it.r * 0.8); ctx.lineTo(it.r * 0.8, it.r * 0.8); ctx.moveTo(it.r * 0.8, -it.r * 0.8); ctx.lineTo(-it.r * 0.8, it.r * 0.8); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(-it.r, 0); ctx.lineTo(it.r, 0); ctx.stroke(); }
      ctx.restore();
    });
    ctx.save(); ctx.shadowColor = '#ffb454'; ctx.shadowBlur = 14; ctx.fillStyle = '#ffb454';
    ctx.fillRect(tray.x - tray.w / 2, tray.y, tray.w, tray.h);
    ctx.fillStyle = 'rgba(255,180,84,.35)';
    ctx.fillRect(tray.x - tray.w / 2 - 8, tray.y - 10, 8, 24); ctx.fillRect(tray.x + tray.w / 2, tray.y - 10, 8, 24);
    ctx.restore();
    if (combo > 2) { ctx.fillStyle = 'rgba(232,238,242,.8)'; ctx.font = '600 14px sans-serif'; ctx.fillText('combo x' + combo, 12, H - 12); }
  }

  function loop(t) {
    if (!running) return;
    var dt = Math.min(2.5, (t - last) / 16.67); last = t;
    update(dt); if (running) { draw(); requestAnimationFrame(loop); }
  }

  function start() {
    reset(); running = true; ov.classList.add('hide'); last = performance.now(); requestAnimationFrame(loop);
  }
  btn.addEventListener('click', start);

  function moveTo(clientX) {
    var r = cv.getBoundingClientRect();
    tray.x = (clientX - r.left) / r.width * W;
  }
  cv.addEventListener('pointermove', function (e) { if (tray) moveTo(e.clientX); });
  cv.addEventListener('pointerdown', function (e) { if (tray) moveTo(e.clientX); });
  addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = true; if (running) e.preventDefault(); }
    if (e.key === 'a' || e.key === 'd') keys[e.key] = true;
  });
  addEventListener('keyup', function (e) { keys[e.key] = false; });

  reset(); draw();
})();
