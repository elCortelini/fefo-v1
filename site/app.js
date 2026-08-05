// ==========================================================================
// FEFO Pet - Interactive Logic & UI Controller
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initFaceSimulator();
  initFaqAccordion();
  initSmoothScroll();
});

// 1. FEFO Interactive Screen & Mode Simulator
function initFaceSimulator() {
  const faceEmoji = document.getElementById('sim-emoji');
  const faceLabel = document.getElementById('sim-label');
  const simScreen = document.getElementById('sim-screen');
  const simButtons = document.querySelectorAll('.demo-btn');

  const modes = {
    happy: {
      emoji: '🐱✨',
      label: 'Alegre / Interativo',
      bg: '#0f0a1c',
      border: '#8b5cf6',
      glow: 'rgba(139, 92, 246, 0.4)'
    },
    calm: {
      emoji: '😌💤',
      label: 'Calmo / Relaxante',
      bg: '#06201a',
      border: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)'
    },
    music: {
      emoji: '🎵🎶',
      label: 'Jukebox do FEFO',
      bg: '#271026',
      border: '#ec4899',
      glow: 'rgba(236, 72, 153, 0.4)'
    },
    panic: {
      emoji: '🚨🔊',
      label: 'Modo Pânico (Sensor Ruído)',
      bg: '#2b0909',
      border: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.6)'
    }
  };

  simButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      simButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const modeKey = btn.getAttribute('data-mode');
      const mode = modes[modeKey] || modes.happy;

      faceEmoji.style.transform = 'scale(0.8)';
      setTimeout(() => {
        faceEmoji.textContent = mode.emoji;
        faceLabel.textContent = mode.label;
        simScreen.style.borderColor = mode.border;
        simScreen.style.boxShadow = `0 0 30px ${mode.glow}, inset 0 0 20px rgba(0,0,0,0.8)`;
        faceEmoji.style.transform = 'scale(1)';
      }, 150);
    });
  });
}

// 2. FAQ Accordion Toggle
function initFaqAccordion() {
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(q => {
    q.addEventListener('click', () => {
      const item = q.parentElement;
      const isActive = item.classList.contains('active');

      // Close all
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

      // Toggle current
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

// 3. Smooth Scroll Navigation
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}
