const backgroundsRaw = [
  'nature 1/orig.png',
  'nature 2/orig.png',
  'nature 3/orig.png',
  'nature 4/orig.png'
];

// turn "nature 1/..." into "nature%201/..."
const backgrounds = backgroundsRaw.map(p => encodeURI(p));

let currentIndex = 0;
let gameArea = null;

function applyBackground(idx) {
  gameArea.style.backgroundImage = `url("${backgrounds[idx]}")`;
}

function changeBackground() {
  currentIndex = (currentIndex + 1) % backgrounds.length;
  applyBackground(currentIndex);
}

// optional: preload to avoid first-swap flicker
function preloadImages(urls) {
  urls.forEach(src => { const img = new Image(); img.src = src; });
}

window.addEventListener('DOMContentLoaded', () => {
  gameArea = document.getElementById('game-area') || document.body;

  // set once; don't spam these every tick
  gameArea.style.backgroundSize = 'cover';
  gameArea.style.backgroundRepeat = 'no-repeat';
  gameArea.style.backgroundPosition = 'center';

  preloadImages(backgrounds);

  // initial paint
  applyBackground(currentIndex);

  // 3000 ms = every 30 seconds
  setInterval(changeBackground, 3000);
});