// GameLogic.js
// Handles princess selection and jump mechanics

document.addEventListener("DOMContentLoaded", () => {
  // --- LOAD SELECTED CHARACTER ---
  const avatar = document.getElementById("avatar");
  const selected = localStorage.getItem("selectedPrincess") || "princess1";

  // Map princess IDs to image paths
  const imgMap = {
    princess1: "../src/images/Princess1.png",
    princess2: "../src/images/Princess2.png",
    princess3: "../src/images/Princess3.png",
  };

  // Set avatar image
  avatar.src = imgMap[selected] || imgMap["princess1"];

  // --- SPACEBAR JUMP LOGIC ---
  const jumpHeight = 0.5; // cm per jump
  let jumping = false;

  document.addEventListener("keydown", (event) => {
    if (event.code === "Space" && !jumping) {
      jumping = true;
      avatar.style.transform = `translateY(-${jumpHeight}cm)`; // jump up
      setTimeout(() => {
        avatar.style.transform = "translateY(0)"; // fall back down
        jumping = false;
      }, 200); // controls how long jump lasts
      event.preventDefault(); // prevents page from scrolling
    }
  });
});
