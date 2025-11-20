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

  // crowns (collectibles)
  let crowns = [];
  let crownSpawnTimer = 0;
  let crownImg = null;
  const crownFile = 'CrownNoBackground.png';
  const crownW = 38, crownH = 28;
  let floatingTexts = []; // {x,y,ttl,text}

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

  // Background toggle settings
  const pointsPerStage = 20; // change every 20 points
  const origBgSrc = '../../src/images/origbig1.png';
  let initialLayerPreset = null; // will store initial layer srcs so we can restore them
  let lastBgStage = -1; // -1 means uninitialized

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
        // capture the initial layer srcs so we can restore them when toggling
        initialLayerPreset = window.Backgrounds.layers.map(l => l.src);
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

    // load crown image
    try {
      const { img: cimg, url: curl } = await loadImageFromCandidates(crownFile, candidateFolders);
      if (cimg) {
        crownImg = cimg;
        console.info('GameLogic: loaded crown image', curl);
      }
    } catch (e) { /* ignore */ }

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
      player.vy = player.jumpForce;
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
    crowns = [];
    floatingTexts = [];
    spawnTimer = 0;
    crownSpawnTimer = 0;
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
  // main loop (updates background, game, and render)
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

    // spawn crowns periodically (less frequent than obstacles)
    crownSpawnTimer -= 1 * delta;
    const crownInterval = 140 + Math.floor(Math.random() * 160);
    if (crownSpawnTimer <= 0) {
      crownSpawnTimer = crownInterval;
      // spawn crown somewhere above ground but reachable
      const groundYPos = height - 80;
      const minY = 40;
      const maxY = groundYPos - crownH - 40;
      const y = Math.max(minY, Math.min(maxY, Math.floor(minY + Math.random() * (Math.max(minY, maxY) - minY))));
      crowns.push({ x: width + 30, y: y, w: crownW, h: crownH });
    }

    // update crowns movement and check collection
    for (let i = crowns.length - 1; i >= 0; i--) {
      const c = crowns[i];
      c.x -= speed * delta;
      if (c.x + c.w < -50) { crowns.splice(i, 1); continue; }
      if (rectsIntersect(player.x, player.y, player.w, player.h, c.x, c.y, c.w, c.h)) {
        // collected
        crowns.splice(i, 1);
        score += 5; // add 5 points
        floatingTexts.push({ x: c.x + c.w / 2, y: c.y, ttl: 60, text: '+5' });
      }
    }

    // update floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 0.3 * delta;
      ft.ttl -= 1 * delta;
      if (ft.ttl <= 0) floatingTexts.splice(i, 1);
    }

    // collisions
    for (const o of obstacles) {
      if (rectsIntersect(player.x, player.y, player.w, player.h, o.x, o.y, o.w, o.h)) {
        // game over
        stop();
        // update high score
        if (score > highScore) {
          highScore = Math.floor(score);
          localStorage.setItem('highScore', highScore);
          const hsEl = document.getElementById('highScore');
          if (hsEl) hsEl.textContent = highScore;
        }
        return;
      }
    }

    // scoring: increment gradually for time survived
    score += 0.01 * delta;

    // check and switch background based on stage
    checkBackgroundByScore();
  }

  function rectsIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // Background toggle helper: switch between initial preset and orig.png based on stage
  function checkBackgroundByScore() {
    // determine stage: 0 = initial preset, 1 = orig background, alternate every pointsPerStage
    const stageIndex = Math.floor(score / pointsPerStage) % 2; // 0 or 1
    if (stageIndex === lastBgStage) return; // no change
    lastBgStage = stageIndex;

    if (!window.Backgrounds || !Array.isArray(window.Backgrounds.layers)) return;

    if (stageIndex === 1) {
      // switch to orig.png (replace layers with single orig image)
      (async () => {
        const layers = window.Backgrounds.layers;
        layers.length = 0;
        layers.push({ src: origBgSrc, speed: 0.15, img: null, offset: 0 });
        try {
          await window.Backgrounds.load(candidateFolders);
          console.info('Backgrounds: switched to orig.png');
        } catch (e) {
          console.warn('Backgrounds: failed to load orig.png', e);
        }
      })();
    } else {
      // restore initial preset layers
      (async () => {
        if (!initialLayerPreset) return;
        const layers = window.Backgrounds.layers;
        layers.length = 0;
        for (const s of initialLayerPreset) layers.push({ src: s, speed: 0.15, img: null, offset: 0 });
        try {
          await window.Backgrounds.load(candidateFolders);
          console.info('Backgrounds: restored initial preset');
        } catch (e) {
          console.warn('Backgrounds: failed to restore initial preset', e);
        }
      })();
    }
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
  // (loop function is defined above; ensure it exists once)

  function render() {
    if (!ctx) return;
    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // render backgrounds first
    if (window.Backgrounds && typeof window.Backgrounds.render === 'function') {
      window.Backgrounds.render(ctx, canvas.width, canvas.height);
    }

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

    // draw crowns
    for (const c of crowns) {
        ctx.drawImage(crownImg, c.x, c.y, c.w, c.h);
    }

    // draw floating collect texts
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    for (const ft of floatingTexts) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
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