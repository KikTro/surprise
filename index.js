document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Setup: Enable JS-specific styles
  document.body.classList.add('js-enabled');

  // DOM Elements
  const viewportWrapper = document.getElementById('viewport-wrapper');
  const scrollContainer = document.getElementById('scroll-container');
  const pressLayer = document.getElementById('press-layer');
  const instructionText = document.getElementById('instruction-text');
  const silentAudio = document.getElementById('silent-audio');

  // 2. Spring Physics Engine State
  let targetY = 0;
  let currentY = 0;
  let velocity = 0;
  
  // Spring config parameters (separate pull vs recoil)
  const pullStiffness = 0.08;
  const pullDamping = 0.82;
  const recoilStiffness = 0.15; // Snappier spring force when returning to top
  const recoilDamping = 0.84;   // Stable damping to settle smoothly at the top
  
  // Interaction flags and speed variables
  let isPressed = false;
  let scrollSpeed = 0;
  const maxScrollSpeed = 16; // px per frame (steady, romantic pace down)
  const acceleration = 0.65; // Eases into steady speed

  let maxScroll = 0;

  // Recalculate max scroll bounds based on content and viewport
  function updateScrollBounds() {
    // Fall back to exactly 9 viewports if stylesheet is not fully loaded/rendered yet
    maxScroll = Math.max(scrollContainer.scrollHeight - window.innerHeight, window.innerHeight * 9);
  }
  updateScrollBounds();
  window.addEventListener('load', updateScrollBounds); // Trigger again on full window load
  window.addEventListener('resize', updateScrollBounds);

  // 3. Audio & Volume Hook (progressive enhancement for iOS Safari)
  let audioUnlocked = false;
  let lastVolume = 1.0;
  let volumeDownActive = false;
  let volumeTimeout = null;
  let volumeTrickConfirmed = false;

  function unlockAudio() {
    if (audioUnlocked) return;
    silentAudio.play()
      .then(() => {
        audioUnlocked = true;
        lastVolume = silentAudio.volume;
      })
      .catch(err => {
        console.warn('Audio play prevented or failed:', err);
      });
  }

  // Monitor volume changes for hardware volume down clicks
  silentAudio.addEventListener('volumechange', () => {
    const currentVolume = silentAudio.volume;
    
    // Check if volume decreased
    if (currentVolume < lastVolume) {
      handleVolumeNudge();
    }
    lastVolume = currentVolume;
  });

  function handleVolumeNudge() {
    volumeDownActive = true;
    unlockAudio();

    // Nudge target scroll down by 35% of viewport height
    targetY = Math.min(targetY + window.innerHeight * 0.35, maxScroll);

    // Confirm volume trick works and update instructions
    if (!volumeTrickConfirmed) {
      volumeTrickConfirmed = true;
      instructionText.textContent = "Press & hold anywhere or hold Volume Down to glide down";
      instructionText.classList.add('highlight');
      setTimeout(() => {
        instructionText.classList.remove('highlight');
      }, 1200);
    }

    // Reset volume down active after 350ms of no further events
    clearTimeout(volumeTimeout);
    volumeTimeout = setTimeout(() => {
      volumeDownActive = false;
      // If pointer is not pressed, spring back to top
      if (!isPressed) {
        targetY = 0;
      }
    }, 350);
  }

  // 4. Pointer Interaction Listeners
  pressLayer.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    isPressed = true;
    unlockAudio();
  });

  const releasePointer = (e) => {
    if (!isPressed) return;
    isPressed = false;
  };

  pressLayer.addEventListener('pointerup', releasePointer);
  pressLayer.addEventListener('pointercancel', releasePointer);
  pressLayer.addEventListener('pointerleave', releasePointer);

  // 5. Kiss Emoji Setup & Staggered Spawning System
  const kisses = [];
  const totalKisses = 140; // Dense confetti at the bottom
  const pendingTriggerQueue = [];
  let lastTriggerTime = 0;
  const triggerInterval = 55; // 55ms stagger beat for the cascade

  function initKisses() {
    // Clear any existing fallback kisses
    const existingKisses = scrollContainer.querySelectorAll('.kiss');
    existingKisses.forEach(k => k.remove());

    for (let i = 0; i < totalKisses; i++) {
      let progressTrigger;
      
      if (i === 0) {
        progressTrigger = 0.02; // First quiet kiss near the top
      } else if (i === 1) {
        progressTrigger = 0.05; // Second quiet kiss near the top
      } else {
        // Accelerating growth curve: more concentrated towards the bottom (progress = 1.0)
        progressTrigger = 0.07 + 0.93 * Math.pow(Math.random(), 2.8);
      }

      const kiss = {
        progressTrigger: progressTrigger,
        xPercent: 8 + Math.random() * 84, // Keep within 8% to 92% screen width
        scale: 0.75 + Math.random() * 0.85,
        rotEnd: -45 + Math.random() * 90,
        rotStart: 0,
        type: '💋',
        stamped: false,
        queued: false,
        element: null
      };

      // Set start rotation with extra offset for overshoot look
      kiss.rotStart = kiss.rotEnd + (Math.random() < 0.5 ? 1 : -1) * (25 + Math.random() * 25);

      // Sparsely introduce 😘 or ❤️ for variety
      const rand = Math.random();
      if (rand < 0.08) {
        kiss.type = '😘';
      } else if (rand < 0.16) {
        kiss.type = '❤️';
      }

      // Create DOM element
      const el = document.createElement('div');
      el.className = 'kiss';
      el.innerText = kiss.type;
      el.style.left = `${kiss.xPercent}%`;
      el.style.setProperty('--p', progressTrigger);
      el.style.setProperty('--scale', kiss.scale);
      el.style.setProperty('--rot-start', `${kiss.rotStart}deg`);
      el.style.setProperty('--rot-end', `${kiss.rotEnd}deg`);

      scrollContainer.appendChild(el);
      kiss.element = el;
      kisses.push(kiss);
    }
  }

  initKisses();

  // 6. Main Physics & Rendering Loop
  function tick(timestamp) {
    // Update scroll target based on holding status
    if (isPressed) {
      scrollSpeed = Math.min(scrollSpeed + acceleration, maxScrollSpeed);
      targetY = Math.min(targetY + scrollSpeed, maxScroll);
    } else if (!volumeDownActive) {
      scrollSpeed = 0;
      targetY = 0; // recoil back to top
    }

    // Determine if we are in the recoil state
    const isRecoiling = !isPressed && !volumeDownActive && targetY === 0;
    const currentStiffness = isRecoiling ? recoilStiffness : pullStiffness;
    const currentDamping = isRecoiling ? recoilDamping : pullDamping;

    // Spring equations
    const force = (targetY - currentY) * currentStiffness;
    velocity = (velocity + force) * currentDamping;

    // Recoil Speed Clamp: Limit return speed to be fast (3x pull speed) but not instantaneous
    if (isRecoiling) {
      const maxRecoilSpeed = 48; // Faster than pull speed (16), but still visible and smooth
      if (Math.abs(velocity) > maxRecoilSpeed) {
        velocity = Math.sign(velocity) * maxRecoilSpeed;
      }
    }

    currentY += velocity;

    // Clamp spring to content boundaries
    if (currentY < 0) {
      currentY = 0;
      velocity = 0;
    } else if (currentY > maxScroll) {
      currentY = maxScroll;
      velocity = 0;
    }

    // Reset kisses when fully returned to the top so the interaction is replayable
    if (isRecoiling && currentY <= 5) {
      kisses.forEach(kiss => {
        if (kiss.stamped) {
          kiss.stamped = false;
          kiss.queued = false;
          kiss.element.classList.remove('stamped');
        }
      });
      pendingTriggerQueue.length = 0; // Clear any pending stagger animations
    }

    // Apply translation to container
    scrollContainer.style.transform = `translate3d(0, ${-currentY}px, 0)`;

    // Check for kisses entering trigger threshold
    // Trigger when they are 82% of the way down the screen (coming into view)
    const triggerProgress = maxScroll > 0 ? (currentY + window.innerHeight * 0.82) / maxScroll : 0;

    for (let i = 0; i < kisses.length; i++) {
      const kiss = kisses[i];
      if (!kiss.stamped && !kiss.queued && triggerProgress >= kiss.progressTrigger) {
        kiss.queued = true;
        pendingTriggerQueue.push(kiss);
      }
    }

    // Process staggered stamp queue
    if (pendingTriggerQueue.length > 0) {
      const now = performance.now();
      if (now - lastTriggerTime >= triggerInterval) {
        const nextKiss = pendingTriggerQueue.shift();
        if (nextKiss && nextKiss.element) {
          nextKiss.element.classList.add('stamped');
          nextKiss.stamped = true;
        }
        lastTriggerTime = now;
      }
    }

    requestAnimationFrame(tick);
  }

  // Start the physics loop
  requestAnimationFrame(tick);
});
