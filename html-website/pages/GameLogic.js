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