const gameArea = document.getElementById('gameArea');
const avatar = document.getElementById('avatar');

// Convert 0.5 cm to pixels
const cmToPx = 37.795;
const jumpIncrement = 0.5 * cmToPx;

// Game variables
let avatarY = 0; // current bottom position
let targetY = 0; // desired position after jump
let isJumping = false;
let gravity = 2; // pixels per frame the avatar falls
let obstacles = [];
let obstacleSpeed = 4;
let spawnInterval = 2000; // milliseconds
let gameOver = false;
let score = 0;

// Load selected character
const selectedCharacter = localStorage.getItem('selectedPrincess');
if (selectedCharacter) {
avatar.style.backgroundImage = `url('../src/images/${selectedCharacter}.png')`;
avatar.style.backgroundSize = 'contain';
avatar.style.backgroundRepeat = 'no-repeat';
avatar.style.backgroundPosition = 'center';
}

// Create moving background
const bg = document.createElement('div');
bg.style.position = 'absolute';
bg.style.top = '0';
bg.style.left = '0';
bg.style.width = '200%';
bg.style.height = '100%';
bg.style.background = "url('../src/images/bg.png') repeat-x";
bg.style.backgroundSize = 'cover';
bg.style.zIndex = '-1';
gameArea.appendChild(bg);

let bgX = 0;

// Function to spawn obstacles
function spawnObstacle() {
if (gameOver) return;
const obs = document.createElement('div');
obs.classList.add('obstacle');
obs.style.position = 'absolute';
obs.style.width = '50px';
obs.style.height = '50px';

// Random bottom position (0px to 150px for variety)
const minBottom = 0;
const maxBottom = 150;
const randomBottom = Math.floor(Math.random() * (maxBottom - minBottom + 1)) + minBottom;
obs.style.bottom = `${randomBottom}px`;

obs.style.right = '0px';
obs.style.background = "url('../src/images/rock.png')";
obs.style.backgroundSize = 'cover';
gameArea.appendChild(obs);
obstacles.push(obs);
}

// Smooth jump function
function animateJump() {
if (!isJumping) return;
if (avatarY < targetY) {
avatarY += 5; // pixels per frame
if (avatarY > targetY) avatarY = targetY;
avatar.style.bottom = `${avatarY}px`;
requestAnimationFrame(animateJump);
} else {
isJumping = false;
}
}

// Space bar event to jump
document.addEventListener('keydown', (e) => {
if (e.code === 'Space' && !gameOver) {
e.preventDefault();
targetY += jumpIncrement;
if (!isJumping) {
isJumping = true;
requestAnimationFrame(animateJump);
}
}
});

// Game loop
function gameLoop() {
if (gameOver) return;

// Gravity effect
if (avatarY > 0 && avatarY > targetY) {
avatarY -= gravity;
if (avatarY < 0) avatarY = 0;
avatar.style.bottom = `${avatarY}px`;
if (!isJumping) targetY = avatarY;
}

// Check if avatar fell below screen
if (avatarY <= 0 && targetY <= 0) {
endGame();
}

// Move background
bgX -= obstacleSpeed / 2;
if (bgX <= -gameArea.offsetWidth) bgX = 0;
bg.style.transform = `translateX(${bgX}px)`;

// Move obstacles
for (let i = obstacles.length - 1; i >= 0; i--) {
const obs = obstacles[i];
let right = parseFloat(obs.style.right);
obs.style.right = `${right + obstacleSpeed}px`;

```
// Collision detection
const obsRect = obs.getBoundingClientRect();
const avatarRect = avatar.getBoundingClientRect();
if (
  avatarRect.left < obsRect.right &&
  avatarRect.right > obsRect.left &&
  avatarRect.bottom > obsRect.top &&
  avatarRect.top < obsRect.bottom
) {
  endGame();
}

// Remove obstacles off screen
if (right > gameArea.offsetWidth) {
  obs.remove();
  obstacles.splice(i, 1);
  score++;
  updateScore();
}
```

}

requestAnimationFrame(gameLoop);
}

// Score display
const scoreBoard = document.createElement('div');
scoreBoard.style.position = 'absolute';
scoreBoard.style.top = '10px';
scoreBoard.style.left = '10px';
scoreBoard.style.fontSize = '24px';
scoreBoard.style.color = '#b47b00';
scoreBoard.style.fontWeight = 'bold';
scoreBoard.textContent = `Score: ${score}`;
gameArea.appendChild(scoreBoard);

function updateScore() {
scoreBoard.textContent = `Score: ${score}`;
}

// End game function
function endGame() {
gameOver = true;
alert(`Game Over! Your score: ${score}`);
let high = parseInt(localStorage.getItem('highScore') || '0', 10);
if (score > high) {
localStorage.setItem('highScore', score);
}
window.location.reload();
}

// Start spawning obstacles
setInterval(spawnObstacle, spawnInterval);

// Start game loop
requestAnimationFrame(gameLoop);
