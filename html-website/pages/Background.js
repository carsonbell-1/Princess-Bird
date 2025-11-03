// ...existing code...
window.Backgrounds = (function () {
  // Update these filenames to the ones in your images folder
  const layers = [
    { src: '../src/images/nature 3/2.png', speed: 0.15, img: null, offset: 0 },
    { src: '../src/images/nature 3/2.png', speed: 0.5, img: null, offset: 0 },
    { src: '../src/images/nature 3/3.png', speed: 0.15, img: null, offset: 0 }
  ];

  function loadFromFolders(name, folders) {
    return new Promise((resolve) => {
      let i = 0;
      function tryNext() {
        if (i >= folders.length) return resolve(null);
        const url = folders[i++] + name;
        const img = new Image();
        img.onload = () => resolve({ img, url });
        img.onerror = tryNext;
        img.src = url;
      }
      tryNext();
    });
  }

  async function load(candidateFolders) {
    const promises = layers.map(async (layer) => {
      const res = await loadFromFolders(layer.src, candidateFolders);
      if (res && res.img) {
        layer.img = res.img;
        return true;
      }
      return false;
    });
    await Promise.all(promises);
    // returns which layers loaded (for debug)
    return layers.map(l => !!l.img);
  }

  function update(dt, speedMultiplier = 1) {
    for (const l of layers) {
      if (!l.img) continue;
      l.offset = (l.offset + l.speed * dt * speedMultiplier) % l.img.width;
    }
  }

  function render(ctx, width, height) {
    // draw layers back-to-front
    for (const l of layers) {
      if (!l.img) continue;
      const img = l.img;
      const y = Math.max(0, height - img.height - 80); // place above ground (80)
      // tile horizontally using offset
      let x = -Math.floor(l.offset);
      while (x < width) {
        ctx.drawImage(img, x, y);
        x += img.width;
      }
    }
  }

  return { load, update, render, layers };
})();