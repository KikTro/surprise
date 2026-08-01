/* ==========================================================================
   INTERACTIVE JAVASCRIPT - NATIONAL GIRLFRIEND'S DAY
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initBgCanvas();
  initBackgroundAudio();
  initScrollAnimations();
  initKissSection();
});

/* ==========================================================================
   1. BACKGROUND CANVAS (FLOATING DARK PETALS & GLOWING EMBERS)
   ========================================================================== */
function initBgCanvas() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = 45;

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height + height;
      this.size = Math.random() * 4 + 2;
      this.speedY = Math.random() * 1.2 + 0.3;
      this.speedX = Math.sin(Math.random() * Math.PI) * 0.5;
      this.opacity = Math.random() * 0.6 + 0.2;
      this.rotation = Math.random() * 360;
      this.rotSpeed = (Math.random() - 0.5) * 1.5;
      this.isPetal = Math.random() > 0.4;
    }

    update() {
      this.y -= this.speedY;
      this.x += Math.sin(this.y * 0.005) * 0.8 + this.speedX;
      this.rotation += this.rotSpeed;

      if (this.y < -20) {
        this.reset();
        this.y = height + 20;
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.globalAlpha = this.opacity;

      if (this.isPetal) {
        ctx.fillStyle = '#8b001a';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(this.size * 2, -this.size * 2, this.size * 3, this.size, 0, this.size * 3);
        ctx.bezierCurveTo(-this.size * 3, this.size, -this.size * 2, -this.size * 2, 0, 0);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ff1a40';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#e60033';
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animate);
  }

  animate();
}

/* ==========================================================================
   2. BACKGROUND AUDIO PLAYER WITH 5s FADE-IN & FADE-OUT LOOP
   ========================================================================== */
function initBackgroundAudio() {
  const audio = document.getElementById('bgAudio');
  const btn = document.getElementById('audioToggleBtn');
  if (!audio || !btn) return;

  const FADE_DURATION = 5.0; // 5 seconds fade in/out
  let isPlaying = false;
  let fadeInterval = null;

  audio.volume = 0;

  function updateAudioFade() {
    if (!isPlaying || audio.paused) return;

    const duration = audio.duration || 0;
    const currentTime = audio.currentTime || 0;

    if (duration <= 0) return;

    if (currentTime < FADE_DURATION) {
      audio.volume = Math.min(1, Math.max(0, currentTime / FADE_DURATION));
    }
    else if ((duration - currentTime) < FADE_DURATION) {
      audio.volume = Math.min(1, Math.max(0, (duration - currentTime) / FADE_DURATION));
    }
    else {
      audio.volume = 1;
    }
  }

  function playAudio() {
    audio.play().then(() => {
      isPlaying = true;
      btn.classList.add('playing');

      if (!fadeInterval) {
        fadeInterval = setInterval(updateAudioFade, 100);
      }
    }).catch(err => {
      console.log('Autoplay deferred until user interaction');
    });
  }

  function pauseAudio() {
    audio.pause();
    isPlaying = false;
    btn.classList.remove('playing');
    if (fadeInterval) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  });

  function handleFirstInteraction() {
    if (!isPlaying) {
      playAudio();
    }
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('touchstart', handleFirstInteraction);
  }

  document.addEventListener('click', handleFirstInteraction, { once: true });
  document.addEventListener('touchstart', handleFirstInteraction, { once: true });
}

/* ==========================================================================
   3. STAGGERED SCROLL ANIMATIONS (INTERSECTION OBSERVER)
   ========================================================================== */
function initScrollAnimations() {
  const cards = document.querySelectorAll('.reason-card');
  const chips = document.querySelectorAll('.love-chip');

  const observerOptions = {
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'all 0.6s ease-out';
    observer.observe(card);
  });

  chips.forEach((chip, idx) => {
    chip.style.opacity = '0';
    chip.style.transform = 'translateY(20px)';
    chip.style.transition = `all 0.4s ease-out ${idx * 0.04}s`;
    observer.observe(chip);
  });
}

/* ==========================================================================
   4. SECTION 5: INTERACTIVE KISS STAMPING
   ========================================================================== */
function initKissSection() {
  const stage = document.getElementById('kissStage');
  const countDisplay = document.getElementById('kissCountNum');
  const clearBtn = document.getElementById('clearKissesBtn');
  const showerBtn = document.getElementById('showerKissesBtn');

  if (!stage || !countDisplay) return;

  let kissCount = 0;
  const kissImgUrl = 'https://freepngimg.com/thumb/lips/8-lips-kiss-png-image.png';

  function playKissSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {}
  }

  function addKissStamp(x, y) {
    const stamp = document.createElement('img');
    stamp.src = kissImgUrl;
    stamp.className = 'kiss-mark';
    stamp.alt = 'Kiss Mark';

    const randomRot = Math.floor(Math.random() * 360);
    const randomScale = (Math.random() * 0.4 + 0.8).toFixed(2);

    stamp.style.left = `${x}px`;
    stamp.style.top = `${y}px`;
    stamp.style.setProperty('--rot', `${randomRot}deg`);
    stamp.style.setProperty('--scl', randomScale);

    stage.appendChild(stamp);
    spawnSparkles(x, y);
    playKissSound();

    kissCount++;
    countDisplay.textContent = kissCount;

    const watermark = stage.querySelector('.kiss-stage-watermark');
    if (watermark) watermark.style.opacity = '0.1';
  }

  function spawnSparkles(x, y) {
    const particleCount = 6;
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('span');
      p.className = 'sparkle-particle';
      p.textContent = Math.random() > 0.5 ? '♥' : '✨';
      
      const angle = (Math.PI * 2 / particleCount) * i;
      const dist = Math.random() * 40 + 20;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);

      stage.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }
  }

  stage.addEventListener('click', (e) => {
    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    addKissStamp(x, y);
  });

  showerBtn.addEventListener('click', () => {
    const rect = stage.getBoundingClientRect();
    let currentDelay = 0;
    
    for (let i = 0; i < 18; i++) {
      setTimeout(() => {
        const x = Math.random() * (rect.width - 100) + 50;
        const y = Math.random() * (rect.height - 100) + 50;
        addKissStamp(x, y);
      }, currentDelay);
      currentDelay += 120;
    }
  });

  clearBtn.addEventListener('click', () => {
    const stamps = stage.querySelectorAll('.kiss-mark');
    stamps.forEach(s => {
      s.style.transition = 'all 0.4s ease';
      s.style.opacity = '0';
      s.style.transform = `${s.style.transform} scale(0)`;
      setTimeout(() => s.remove(), 400);
    });
    kissCount = 0;
    countDisplay.textContent = '0';

    const watermark = stage.querySelector('.kiss-stage-watermark');
    if (watermark) watermark.style.opacity = '0.4';
  });
}
