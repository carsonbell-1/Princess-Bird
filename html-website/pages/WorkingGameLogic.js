(function () {
  // Public API
  const Game = {
    init,
    start,
    stop,
    reset
  };
  window.Game = Game;

  // internal state
  let canvas, ctx;
  let width = 1000, height = 600;
  let charImg = null;
  let running = false;
  let rafId = null;

  // simple character physics
  const player = { x: 150, y: 0, w: 80, h: 80, vy: 0, gravity: 0.9, jumpForce: -16, onGround: false };

  // obstacles and scoring
  let obstacles = [];
  let spawnTimer = 0;
  let score = 0;
  let highScore = parseInt(localStorage.getItem('highScore') || '0', 10);
  const obstacleGap = 160;
  const obstacleWidth = 84;
  const obstacleSpeedBase = 4;

  // image file mapping
  const fileMap = {
    princess1: 'Princess_1_new.png',
    princess2: 'Princess_2_new.png',
    princess3: 'Princess_3_new.png'
  };

  const candidateFolders = [
    './src/images/',
    './images/',
    '../src/images/',
    '../images/',
    '../../src/images/',
    './assets/images/'
  ];

  // Helper: create canvas inside #gameArea
  function createCanvasIn(areaEl) {
    areaEl.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    areaEl.appendChild(canvas);
    ctx = canvas.getContext('2d');
  }

  // Try load image from candidate folders
  function loadImageFromCandidates(name, folders) {
    return new Promise((resolve) => {
      let i = 0;
      function tryNext() {
        if (i >= folders.length) return resolve({ img: null, url: null });
        const url = folders[i++] + name;
        const img = new Image();
        img.onload = () => resolve({ img, url });
        img.onerror = tryNext;
        img.src = url;
      }
      tryNext();
    });
  }

  // Determine selected character
  function getSelectedCharacterName() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('character');
    const stored = localStorage.getItem('selectedPrincess');
    const sel = (q || stored || 'princess1').toLowerCase();
    return sel;
  }

  // Init: locate gameArea and prepare canvas + load images
   async function init() {
    const gameArea = document.getElementById('gameArea');
    if (!gameArea) {
      console.warn('GameLogic: #gameArea not found.');
      return;
    }

    createCanvasIn(gameArea);

    // set player start y to ground level
    player.y = height - 80 - player.h; // ground height 80

    // load background layers if available
    if (window.Backgrounds && typeof window.Backgrounds.load === 'function') {
      try {
        await window.Backgrounds.load(candidateFolders);
        console.info('Backgrounds: loaded layers', window.Backgrounds.layers);
      } catch (e) {
        console.warn('Backgrounds: load failed', e);
      }
    }

    // load character image
    const sel = getSelectedCharacterName();
    const file = fileMap[sel] || fileMap.princess1;
    const { img, url } = await loadImageFromCandidates(file, candidateFolders);
    if (img) {
      charImg = img;
      console.info('GameLogic: loaded character image', url);
    } else {
      console.warn('GameLogic: failed to load character image:', file);
      // charImg stays null and we draw a placeholder
    }

    // wire input
    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('pointerdown', onPointerDown);

    // wire restart button if present
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.addEventListener('click', () => { reset(); });

    // wire home button (optional)
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) homeBtn.addEventListener('click', () => { stop(); /* keep state, allow user to navigate */ });

    // show existing high score
    const hsEl = document.getElementById('highScore');
    if (hsEl) hsEl.textContent = highScore;

    // start automatically
    reset();
  }

  function onKeyDown(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      jump();
    }
  }
  function onPointerDown() { jump(); }

  function jump() {
    if (player.onGround) {
      player.vy = player.jumpForce;
      player.onGround = true;
    }
  }

  // game loop
  function start() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function reset() {
    // reset state
    obstacles = [];
    spawnTimer = 0;
    score = 0;
    player.vy = 0;
    player.x = 150;
    player.y = height - 80 - player.h;
    player.onGround = true;
    // update display
    const hsEl = document.getElementById('highScore');
    if (hsEl) hsEl.textContent = highScore;
    // start loop
    stop();
    start();
  }

  let lastTime = 0;
  function loop(now) {
    rafId = requestAnimationFrame(loop);
    const dt = Math.min(40, now - lastTime);
    lastTime = now;
    update(dt / 16.666); // normalise to ~60fps units
    render();
  }

  function update(delta) {
    // physics
    player.vy += player.gravity * delta;
    player.y += player.vy * delta;

    // ground collision
    const groundY = height - 80 - player.h;
    if (player.y >= groundY) {
      player.y = groundY;
      player.vy = 0;
      player.onGround = true;
    }

    // spawn obstacles (random top or bottom)
    spawnTimer -= 1 * delta;
    const spawnInterval = Math.max(40, 90 - Math.floor(score / 5)); // faster as score increases
    if (spawnTimer <= 0) {
      spawnTimer = spawnInterval;
      const h = 40 + Math.random() * 240; // height of obstacle
      const fromTop = Math.random() < 0.5; // 50% chance to come from top
      const y = fromTop ? 0 : (height - 80 - h);
      obstacles.push({ x: width + 20, w: obstacleWidth, h: h, y: y, fromTop: fromTop });
    }

    // update obstacles
    const speed = obstacleSpeedBase + Math.floor(score / 10);
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= speed * delta;
      // remove offscreen
      if (obstacles[i].x + obstacles[i].w < -50) obstacles.splice(i, 1);
    }

    // collisions
    for (const o of obstacles) {
      if (rectsIntersect(player.x, player.y, player.w, player.h, o.x, o.y, o.w, o.h)) {
        // game over
        stop();
        // update high score
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('highScore', highScore);
          const hsEl = document.getElementById('highScore');
          if (hsEl) hsEl.textContent = highScore;
        }
        return;
      }
    }

    // scoring: increment gradually for time survived
    score += 0.01  * delta;
  }

  function rectsIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

    function loop(now) {
    rafId = requestAnimationFrame(loop);
    const dt = Math.min(40, now - lastTime);
    lastTime = now;
    const delta = dt / 16.666; // normalise to ~60fps units

    // update background (use delta scaled to nicer units)
    if (window.Backgrounds && typeof window.Backgrounds.update === 'function') {
      window.Backgrounds.update(delta * 2); // adjust multiplier to taste
    }

    update(delta);
    render();
  }

  function render() {
    if (!ctx) return;
    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // render backgrounds first
    if (window.Backgrounds && typeof window.Backgrounds.render === 'function') {
      window.Backgrounds.render(ctx, canvas.width, canvas.height);
    }

 // background sky (if you still want gradient on top)
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, 'rgba(223,233,252,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // ground
    ctx.fillStyle = '#bfe7a1';
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);

    // obstacles
    ctx.fillStyle = '#7b5e3a';
    for (const o of obstacles) {
      ctx.fillRect(Math.round(o.x), Math.round(o.y), Math.round(o.w), Math.round(o.h));

      // shadow: place under top obstacles, above bottom obstacles
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      if (o.fromTop) {
        ctx.fillRect(Math.round(o.x), Math.round(o.y) + Math.round(o.h), Math.round(o.w), 6);
      } else {
        ctx.fillRect(Math.round(o.x), Math.round(o.y) - 6, Math.round(o.w), 6);
      }
      ctx.fillStyle = '#7b5e3a';
    } 

    // character
    if (charImg) {
      // scale to player w/h
      ctx.drawImage(charImg, player.x, player.y, player.w, player.h);
    } else {
      // placeholder
      ctx.fillStyle = '#ff6b81';
      roundRect(ctx, player.x, player.y, player.w, player.h, 10, true, false);
    }

    // HUD: score
    ctx.fillStyle = '#333';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + Math.floor(score), 14, 30);
    ctx.textAlign = 'right';
    ctx.fillText('Best: ' + highScore, canvas.width - 14, 30);
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'undefined') r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();