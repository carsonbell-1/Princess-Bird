const backgrounds = [
  'nature 1/orig.png',
  'nature 2/orig.png',
  'nature 3/orig.png',
  'nature 4/orig.png'
];

let currentIndex = 0;

function changeBackground() {
  const gameArea = document.getElementById('game-area') || document.body;
  gameArea.style.backgroundImage = `url(${backgrounds[currentIndex]})`;
  gameArea.style.backgroundSize = 'cover';
  gameArea.style.backgroundRepeat = 'no-repeat';
  gameArea.style.backgroundPosition = 'center';
  gameArea.style.transition = 'background 1s ease-in-out';
  currentIndex = (currentIndex + 1) % backgrounds.length;
}

changeBackground();
setInterval(changeBackground, 30000);
d8812f7c3fa581416de774a308c8202dbe170a3d
