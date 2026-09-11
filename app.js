// ==========================================================================
// FEFO Pet - Interactive Logic & Story Video Studio Engine
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initThemeSystem();
  initMobileMenu();
  initFaceSimulator();
  initFaqAccordion();
  initSmoothScroll();
  initRealPhotoGallery();
  initReadingProgressBar();
  initSensoryAndAudioControls();
  initFefo3DViewer();
  initButtonAudioFeedback();
  initTestimonialsAudio();
  initWaitlistForm();
});

// 0. Mobile Hamburger Menu Toggle
function initMobileMenu() {
  const toggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  const navButtons = document.querySelector('.nav-buttons');
  if (!toggle || !navLinks) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navLinks.classList.toggle('nav-open');
    if (navButtons) navButtons.classList.toggle('nav-open');
    toggle.classList.toggle('active');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !navLinks.contains(e.target) && (!navButtons || !navButtons.contains(e.target))) {
      navLinks.classList.remove('nav-open');
      if (navButtons) navButtons.classList.remove('nav-open');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Close menu when clicking any nav link
  document.querySelectorAll('.nav-link, .nav-buttons .btn').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('nav-open');
      if (navButtons) navButtons.classList.remove('nav-open');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// 0.5. Accessible & Neurofriendly Theme Selection System
function initThemeSystem() {
  const wrapper = document.getElementById('theme-switch-wrapper');
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const currentIcon = document.getElementById('current-theme-icon');
  const currentName = document.getElementById('current-theme-name');
  const options = document.querySelectorAll('.theme-option');

  if (!wrapper || !toggleBtn) return;

  const themes = {
    galaxy: { name: 'Galáxia', icon: '🌌' },
    calm: { name: 'Calmo (TEA)', icon: '🌿' },
    light: { name: 'Solar', icon: '☀️' },
    contrast: { name: 'Contraste', icon: '⚡' }
  };

  function applyTheme(themeKey) {
    const selected = themes[themeKey] ? themeKey : 'galaxy';
    document.documentElement.setAttribute('data-theme', selected);
    try {
      localStorage.setItem('fefo-theme', selected);
    } catch (e) {}

    if (currentIcon) currentIcon.textContent = themes[selected].icon;
    if (currentName) currentName.textContent = themes[selected].name;

    options.forEach(opt => {
      if (opt.getAttribute('data-theme') === selected) {
        opt.classList.add('active');
        opt.setAttribute('aria-selected', 'true');
      } else {
        opt.classList.remove('active');
        opt.setAttribute('aria-selected', 'false');
      }
    });
  }

  // Load saved theme or HTML attribute or fallback
  let savedTheme = 'galaxy';
  try {
    savedTheme = localStorage.getItem('fefo-theme') || document.documentElement.getAttribute('data-theme') || 'galaxy';
  } catch (e) {
    savedTheme = document.documentElement.getAttribute('data-theme') || 'galaxy';
  }
  applyTheme(savedTheme);

  // Toggle dropdown menu
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = wrapper.classList.toggle('open');
    toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Handle option selection
  options.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const themeKey = opt.getAttribute('data-theme');
      applyTheme(themeKey);
      wrapper.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      wrapper.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Close with keyboard Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrapper.classList.contains('open')) {
      wrapper.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.focus();
    }
  });
}

// 1. FEFO Interactive Screen & Mode Simulator (Imagens Reais do Robô)
function initFaceSimulator() {
  const simImg = document.getElementById('sim-face-img');
  const faceLabel = document.getElementById('sim-label');
  const simScreen = document.getElementById('sim-screen');
  const simButtons = document.querySelectorAll('.demo-btn');

  if (!simImg || !simScreen) return;

  const modes = {
    happy: {
      label: 'Alegre / Interativo',
      image: 'images/expressoes/fefo_exp_alegre_1.png',
      border: '#8b5cf6',
      glow: 'rgba(139, 92, 246, 0.45)'
    },
    calm: {
      label: 'Calmo / Relaxante',
      image: 'images/expressoes/fefo_exp_calmo_1.png',
      border: '#10b981',
      glow: 'rgba(16, 185, 129, 0.45)'
    },
    smart: {
      label: 'Esperto / Atento',
      image: 'images/expressoes/fefo_exp_esperto.png',
      border: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.45)'
    },
    sad: {
      label: 'Triste / Precisa de Carinho',
      image: 'images/expressoes/fefo_exp_triste.png',
      border: '#6366f1',
      glow: 'rgba(99, 102, 241, 0.45)'
    },
    eating: {
      label: 'Comendo / Hora do Lanche',
      image: 'images/expressoes/fefo_exp_comendo.png',
      border: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.45)'
    },
    music: {
      label: 'Jukebox do FEFO (Cantando)',
      image: 'images/expressoes/fefo_exp_jukebox.png',
      border: '#ec4899',
      glow: 'rgba(236, 72, 153, 0.45)'
    },
    panic: {
      label: 'Modo Pânico (Sensor Ruído / Sobrecarga)',
      image: 'images/expressoes/fefo_exp_panico.png',
      border: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.6)'
    }
  };

  let currentMode = 'happy';

  // Web Audio synthesizer feedback for simulator modes
  function playModeFeedback(modeKey) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.05);

      if (modeKey === 'happy') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (modeKey === 'calm') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (modeKey === 'smart') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(783.99, now + 0.08); // G5
        osc.frequency.setValueAtTime(987.77, now + 0.16); // B5
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now);
        osc.stop(now + 0.38);
      } else if (modeKey === 'sad') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(349.23, now); // F4
        osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.35); // C4 down
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.start(now);
        osc.stop(now + 0.55);
      } else if (modeKey === 'eating') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(587.33, now + 0.16); // D5
        osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (modeKey === 'music') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (modeKey === 'panic') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(329.63, now);
        osc.frequency.linearRampToValueAtTime(440, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {}
  }

  function updateDisplay(withSound = false) {
    const mode = modes[currentMode] || modes.happy;

    simImg.style.opacity = '0.35';
    simImg.style.transform = 'scale(0.96)';

    setTimeout(() => {
      simImg.src = mode.image;
      if (faceLabel) faceLabel.textContent = mode.label;
      simScreen.style.borderColor = mode.border;
      simScreen.style.boxShadow = `0 0 30px ${mode.glow}, inset 0 0 20px rgba(0,0,0,0.8)`;

      simImg.style.opacity = '1';
      simImg.style.transform = 'scale(1)';
    }, 110);

    if (withSound) {
      playModeFeedback(currentMode);
    }
  }

  // Clicar na tela para tocar o som de feedback
  simScreen.style.cursor = 'pointer';
  simScreen.addEventListener('click', () => {
    updateDisplay(true);
  });

  simButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      simButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const modeKey = btn.getAttribute('data-mode');
      currentMode = modeKey;
      updateDisplay(true);
    });
  });

  // Carregamento inicial
  updateDisplay(false);
}

// 2. FAQ Accordion Toggle
function initFaqAccordion() {
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(q => {
    q.addEventListener('click', () => {
      const item = q.parentElement;
      const isActive = item.classList.contains('active');

      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

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


// ==========================================================================
// 4. FEFO VIDEO STUDIO ENGINE - "1. O Jogo das Cores"
// ==========================================================================

const storyData = {
  title: "1. O Jogo das Cores",
  scenes: [
    {
      sceneIdx: 0,
      title: "Cena 1: Manhã no Jardim",
      imageSrc: "images/fefo_sapo_jardim.jpg",
      bgHue: 120,
      dialogues: [
        { speaker: "NARRADOR", text: "Em uma manhã ensolarada, FEFO passeava pelo jardim quando encontrou o Sapo pulando perto das flores.", duration: 7.5, voicePitch: 1.0, voiceRate: 0.95 },
        { speaker: "SAPO", text: "Coaxá, coaxá! Oi, FEFO! Quer brincar do Jogo das Cores?", duration: 5.5, voicePitch: 1.3, voiceRate: 1.0 },
        { speaker: "FEFO", text: "Quero! Como funciona?", duration: 3.5, voicePitch: 1.4, voiceRate: 1.1 }
      ]
    },
    {
      sceneIdx: 1,
      title: "Cena 2: As Regras do Jogo",
      imageSrc: "images/fefo_sapo_jardim.jpg",
      bgHue: 90,
      dialogues: [
        { speaker: "SAPO", text: "Um de nós escolhe uma cor. Depois, procuramos alguma coisa dessa cor no jardim. Não é preciso correr nem pular. Cada um participa do seu jeito.", duration: 9.5, voicePitch: 1.3, voiceRate: 1.0 }
      ]
    },
    {
      sceneIdx: 2,
      title: "Cena 3: A Flor Vermelha",
      imageSrc: "images/fefo_flor_vermelha.jpg",
      bgHue: 0,
      dialogues: [
        { speaker: "FEFO", text: "FEFO olhou ao redor e viu uma flor vermelha... Eu escolho o vermelho!", duration: 6.0, voicePitch: 1.4, voiceRate: 1.05 },
        { speaker: "SAPO", text: "Encontrei! A flor é vermelha. Agora escolho o amarelo.", duration: 5.5, voicePitch: 1.3, voiceRate: 1.0 }
      ]
    },
    {
      sceneIdx: 3,
      title: "Cena 4: A Borboleta Amarela",
      imageSrc: "images/fefo_borboleta_amarela.jpg",
      bgHue: 50,
      dialogues: [
        { speaker: "FEFO", text: "FEFO observou com atenção... Achei! A borboleta tem asas amarelas!", duration: 6.5, voicePitch: 1.4, voiceRate: 1.05 }
      ]
    },
    {
      sceneIdx: 4,
      title: "Cena 5: Imaginação e Cores",
      imageSrc: "images/fefo_cores_imaginacao.jpg",
      bgHue: 280,
      dialogues: [
        { speaker: "NARRADOR", text: "Os amigos continuaram procurando as cores azul, verde, rosa e laranja. Quando não encontravam uma cor, imaginavam juntos um objeto que poderia tê-la.", duration: 9.5, voicePitch: 1.0, voiceRate: 0.95 }
      ]
    },
    {
      sceneIdx: 5,
      title: "Cena 6: Descanso na Grama",
      imageSrc: "images/fefo_sapo_grama.jpg",
      bgHue: 150,
      dialogues: [
        { speaker: "SAPO", text: "Depois de algum tempo, sentaram-se na grama para descansar... Quantas cores encontramos!", duration: 6.5, voicePitch: 1.3, voiceRate: 0.95 },
        { speaker: "FEFO", text: "Descobri que posso observar detalhes que antes passavam despercebidos.", duration: 6.0, voicePitch: 1.4, voiceRate: 1.0 }
      ]
    },
    {
      sceneIdx: 6,
      title: "Cena 7: Brincar do Seu Jeito",
      imageSrc: "images/fefo_sapo_grama.jpg",
      bgHue: 200,
      dialogues: [
        { speaker: "NARRADOR", text: "FEFO aprendeu que existem muitas maneiras de brincar. Observar, imaginar, apontar ou falar também são formas de participar. E, quando cada amigo pode brincar do seu jeito, a diversão fica ainda mais colorida.", duration: 12.0, voicePitch: 1.0, voiceRate: 0.92 }
      ]
    }
  ]
};

function initFefoVideoStudio() {
  const canvas = document.getElementById('video-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const container = document.getElementById('canvas-container');
  const overlay = document.getElementById('canvas-overlay');
  const btnPlayOverlay = document.getElementById('btn-play-overlay');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnRestart = document.getElementById('btn-restart');
  const btnMute = document.getElementById('btn-mute');
  const btnExport = document.getElementById('btn-export-video');
  const selectScene = document.getElementById('select-scene');
  const subtitleBox = document.getElementById('subtitle-box');
  const speakerTag = document.getElementById('speaker-tag');
  const subtitleText = document.getElementById('subtitle-text');
  const timelineProgress = document.getElementById('timeline-progress');
  const statusText = document.getElementById('video-status-text');
  const btnAspect169 = document.getElementById('btn-aspect-169');
  const btnAspect916 = document.getElementById('btn-aspect-916');
  const scriptCards = document.querySelectorAll('.script-card');

  // State variables
  let isPlaying = false;
  let isMuted = false;
  let isRecording = false;
  let currentSceneIdx = 0;
  let currentDialogueIdx = 0;
  let dialogueTimeElapsed = 0;
  let animationFrameId = null;
  let lastTimestamp = 0;
  let totalStoryDuration = 0;
  let elapsedStoryTime = 0;

  // Preload Images
  const loadedImages = {};
  storyData.scenes.forEach(scene => {
    const img = new Image();
    img.src = scene.imageSrc;
    loadedImages[scene.imageSrc] = img;
  });

  // Calculate Total Story Duration
  storyData.scenes.forEach(s => {
    s.dialogues.forEach(d => {
      totalStoryDuration += d.duration;
    });
  });

  // Audio Context for sound effects
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Play musical tone / croak for dialogue entries
  function playDialogueSynthSound(speaker) {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (speaker === 'SAPO') {
        // Frog croak sound effect
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (speaker === 'FEFO') {
        // Cute robot synth chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // Soft chord for Narrator
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(329.63, now); // E4
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch(e) {
      console.log('Audio synth error', e);
    }
  }

  // Web Speech Synthesis Narration
  let synthUtterance = null;

  function speakDialogue(dialogue) {
    if (isMuted || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop previous

    const utterance = new SpeechSynthesisUtterance(dialogue.text);
    utterance.lang = 'pt-BR';
    utterance.pitch = dialogue.voicePitch || 1.0;
    utterance.rate = dialogue.voiceRate || 1.0;

    // Try to select a PT-BR voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt'));
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    synthUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  // Particle System for Canvas visual effects
  const particles = [];
  for (let i = 0; i < 35; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 8 + 4,
      colorHue: Math.random() * 360,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -Math.random() * 0.8 - 0.4,
      alpha: Math.random() * 0.7 + 0.3
    });
  }

  // Main Render & Animation Loop
  function render(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (isPlaying) {
      dialogueTimeElapsed += delta;
      elapsedStoryTime += delta;

      const currentScene = storyData.scenes[currentSceneIdx];
      const currentDialogue = currentScene.dialogues[currentDialogueIdx];

      if (dialogueTimeElapsed >= currentDialogue.duration) {
        // Advance to next dialogue or scene
        dialogueTimeElapsed = 0;
        currentDialogueIdx++;

        if (currentDialogueIdx >= currentScene.dialogues.length) {
          currentDialogueIdx = 0;
          currentSceneIdx++;

          if (currentSceneIdx >= storyData.scenes.length) {
            // Story Completed!
            finishStoryPlayback();
            return;
          }

          // Update UI for new scene
          selectScene.value = currentSceneIdx;
          updateScriptCards();
        }

        // Trigger new dialogue sound & speech
        const nextDialogue = storyData.scenes[currentSceneIdx].dialogues[currentDialogueIdx];
        updateSubtitles(nextDialogue);
        playDialogueSynthSound(nextDialogue.speaker);
        speakDialogue(nextDialogue);
      }

      // Update Timeline Progress
      const progressPercent = Math.min(100, (elapsedStoryTime / totalStoryDuration) * 100);
      timelineProgress.style.width = `${progressPercent}%`;
    }

    // DRAW CANVAS SCENE
    const scene = storyData.scenes[currentSceneIdx];
    const dialogue = scene.dialogues[currentDialogueIdx];
    const img = loadedImages[scene.imageSrc];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Image Background with Ken Burns Pan/Zoom
    if (img && img.complete && img.naturalWidth > 0) {
      const zoom = 1.0 + Math.sin(timestamp * 0.0005) * 0.04;
      const offsetX = Math.cos(timestamp * 0.0003) * 15;
      const offsetY = Math.sin(timestamp * 0.0003) * 10;

      ctx.save();
      ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
      ctx.scale(zoom, zoom);

      // Fit image cover
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;

      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      // Fallback gradient background
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, `hsl(${scene.bgHue}, 60%, 20%)`);
      grad.addColorStop(1, '#05030a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Animated Overlay Vignette & Lighting
    const vigGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.3, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Floating Magical Particles
    particles.forEach(p => {
      p.y += p.vy;
      p.x += p.vx;
      if (p.y < -20) p.y = canvas.height + 20;
      if (p.x < -20) p.x = canvas.width + 20;
      if (p.x > canvas.width + 20) p.x = -20;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.colorHue}, 90%, 70%, ${p.alpha})`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = `hsl(${p.colorHue}, 90%, 70%)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 4. Scene Title Badge Top Left (embedded in video)
    ctx.fillStyle = 'rgba(10, 6, 25, 0.75)';
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(30, 30, 320, 48, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText('FEFO PET • O JOGO DAS CORES', 48, 60);

    // 5. Embedded Subtitles at Bottom of Canvas (Crucial for exported Video File!)
    if (dialogue) {
      const boxWidth = canvas.width - 120;
      const boxHeight = 90;
      const boxX = 60;
      const boxY = canvas.height - 120;

      // Subtitle Background Card
      ctx.fillStyle = 'rgba(10, 6, 20, 0.88)';
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 16);
      ctx.fill();
      ctx.stroke();

      // Speaker Label
      let speakerColor = '#8b5cf6';
      if (dialogue.speaker === 'SAPO') speakerColor = '#10b981';
      if (dialogue.speaker === 'FEFO') speakerColor = '#06b6d4';

      ctx.fillStyle = speakerColor;
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText(`[${dialogue.speaker}]`, boxX + 24, boxY + 36);

      // Subtitle Text Wrapped
      ctx.fillStyle = '#ffffff';
      ctx.font = '500 20px Outfit, sans-serif';

      const maxTextWidth = boxWidth - 160;
      const words = dialogue.text.split(' ');
      let line = '';
      let lineY = boxY + 36;

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxTextWidth && i > 0) {
          ctx.fillText(line, boxX + 140, lineY);
          line = words[i] + ' ';
          lineY += 26;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, boxX + 140, lineY);
    }

    animationFrameId = requestAnimationFrame(render);
  }

  // Start Animation Engine
  animationFrameId = requestAnimationFrame(render);

  // Update Subtitle UI
  function updateSubtitles(dialogue) {
    if (!dialogue) return;
    speakerTag.textContent = dialogue.speaker;
    speakerTag.className = `speaker-tag ${dialogue.speaker.toLowerCase()}`;
    subtitleText.textContent = dialogue.text;
  }

  // Update Active Script Card
  function updateScriptCards() {
    scriptCards.forEach((card, idx) => {
      if (idx === currentSceneIdx) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  // Start Playback
  function playStory() {
    isPlaying = true;
    overlay.classList.add('hidden');
    btnPlayPause.textContent = '⏸ Pausar';
    statusText.textContent = `Reproduzindo ${storyData.scenes[currentSceneIdx].title}`;

    const currentDialogue = storyData.scenes[currentSceneIdx].dialogues[currentDialogueIdx];
    updateSubtitles(currentDialogue);
    playDialogueSynthSound(currentDialogue.speaker);
    speakDialogue(currentDialogue);
  }

  // Pause Playback
  function pauseStory() {
    isPlaying = false;
    btnPlayPause.textContent = '▶ Reproduzir';
    statusText.textContent = 'Pausado';
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Finish Story Playback
  function finishStoryPlayback() {
    isPlaying = false;
    currentSceneIdx = 0;
    currentDialogueIdx = 0;
    dialogueTimeElapsed = 0;
    elapsedStoryTime = 0;
    timelineProgress.style.width = '100%';
    overlay.classList.remove('hidden');
    btnPlayPause.textContent = '▶ Reproduzir';
    statusText.textContent = 'Historinha Concluída! 🎉';
    subtitleText.textContent = 'Historinha concluída! Clique no Play para assistir novamente.';

    if (isRecording) {
      stopVideoExport();
    }
  }

  // Reset Story
  function resetStory() {
    pauseStory();
    currentSceneIdx = 0;
    currentDialogueIdx = 0;
    dialogueTimeElapsed = 0;
    elapsedStoryTime = 0;
    timelineProgress.style.width = '0%';
    selectScene.value = 0;
    updateScriptCards();
    updateSubtitles(storyData.scenes[0].dialogues[0]);
    statusText.textContent = 'Reiniciado';
  }

  // Event Listeners for Controls
  btnPlayOverlay.addEventListener('click', playStory);

  btnPlayPause.addEventListener('click', () => {
    if (isPlaying) {
      pauseStory();
    } else {
      playStory();
    }
  });

  btnRestart.addEventListener('click', () => {
    resetStory();
    playStory();
  });

  btnMute.addEventListener('click', () => {
    isMuted = !isMuted;
    btnMute.textContent = isMuted ? '🔇 Mudo' : '🔊 Som Ativo';
    if (isMuted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  });

  selectScene.addEventListener('change', (e) => {
    currentSceneIdx = parseInt(e.target.value);
    currentDialogueIdx = 0;
    dialogueTimeElapsed = 0;

    // Recalculate elapsed story time
    elapsedStoryTime = 0;
    for (let s = 0; s < currentSceneIdx; s++) {
      storyData.scenes[s].dialogues.forEach(d => elapsedStoryTime += d.duration);
    }

    updateScriptCards();
    const dialogue = storyData.scenes[currentSceneIdx].dialogues[0];
    updateSubtitles(dialogue);

    if (isPlaying) {
      playDialogueSynthSound(dialogue.speaker);
      speakDialogue(dialogue);
    }
  });

  scriptCards.forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.getAttribute('data-scene-idx'));
      selectScene.value = idx;
      selectScene.dispatchEvent(new Event('change'));
    });
  });

  // Aspect Ratio Toggle
  btnAspect169.addEventListener('click', () => {
    container.classList.remove('aspect-916');
    btnAspect169.classList.add('active');
    btnAspect916.classList.remove('active');
    canvas.width = 1280;
    canvas.height = 720;
  });

  btnAspect916.addEventListener('click', () => {
    container.classList.add('aspect-916');
    btnAspect916.classList.add('active');
    btnAspect169.classList.remove('active');
    canvas.width = 720;
    canvas.height = 1280;
  });


  // ==========================================================================
  // MEDIA RECORDER & VIDEO EXPORT (.webm)
  // ==========================================================================

  let mediaRecorder = null;
  let recordedChunks = [];

  btnExport.addEventListener('click', () => {
    if (isRecording) {
      stopVideoExport();
    } else {
      startVideoExport();
    }
  });

  function startVideoExport() {
    try {
      resetStory();

      const stream = canvas.captureStream(30); // 30 fps video stream

      recordedChunks = [];
      const options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `FEFO_O_Jogo_das_Cores_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);

        statusText.textContent = 'Vídeo exportado com sucesso!';
        btnExport.innerHTML = '<span>📹 Baixar Vídeo (.webm)</span>';
        btnExport.classList.remove('btn-danger');
        isRecording = false;
      };

      mediaRecorder.start();
      isRecording = true;
      btnExport.innerHTML = '<span>⏹ Parar & Salvar Vídeo</span>';
      btnExport.classList.add('btn-danger');
      statusText.textContent = 'Gravando vídeo HD em tempo real...';

      playStory();

    } catch (err) {
      alert('Erro ao iniciar a gravação do vídeo: ' + err.message);
      console.error(err);
    }
  }

  function stopVideoExport() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }
}


// 5. FEFO Real Photo Gallery & Lightbox Logic
function initRealPhotoGallery() {
  const tabs = document.querySelectorAll('.gallery-tab');
  const cards = document.querySelectorAll('.gallery-card');
  const modal = document.getElementById('lightbox-modal');
  const modalImg = document.getElementById('lightbox-img');
  const modalTitle = document.getElementById('lightbox-title');
  const modalDesc = document.getElementById('lightbox-desc');
  const modalClose = document.getElementById('lightbox-close');
  const heroImgTrigger = document.getElementById('hero-img-trigger');

  if (!modal) return;

  // Filter tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');

      cards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  // Open Lightbox on card click
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const fullSrc = card.getAttribute('data-full');
      const title = card.getAttribute('data-title') || '';
      const desc = card.getAttribute('data-desc') || '';

      openLightbox(fullSrc, title, desc);
    });
  });

  // Hero Image trigger lightbox
  if (heroImgTrigger) {
    heroImgTrigger.addEventListener('click', () => {
      const imgEl = document.getElementById('hero-img-element');
      openLightbox(
        imgEl ? imgEl.src : 'images/portfolio/page_03_img_03.png',
        'FEFO Pet — Protótipo Físico V1',
        'Tecnologia embarcada nacional com expressividade facial na tela, cromoterapia e suporte háptico tátil.'
      );
    });
  }

  // Also attach lightbox to any portfolio card images
  document.querySelectorAll('.card-img, .material-img, .team-avatar-img, .app-mockup-img, .cause-mascot-img').forEach(img => {
    img.style.cursor = 'pointer';
    img.setAttribute('title', 'Clique para ampliar a imagem');
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      const title = img.getAttribute('alt') || 'FEFO Pet';
      const card = img.closest('.glass-card') || img.parentElement;
      const descEl = card ? (card.querySelector('p') || card.querySelector('.team-role')) : null;
      const desc = descEl ? descEl.textContent : '';
      openLightbox(img.src, title, desc);
    });
  });

  function openLightbox(src, title, desc) {
    modalImg.src = src;
    modalTitle.textContent = title;
    modalDesc.textContent = desc;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeLightbox);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target === modalClose) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      closeLightbox();
    }
  });
}


// ==========================================================================
// FEFO Pet - Versão de Testes Interativa (teste.js)
// Implementação das 7 Sugestões:
// 1. Modelo 3D Interativo do FEFO (WebGL / Three.js)
// 2. Modo Redução Sensorial (Reduced Motion)
// 3. Ilustrações Vetoriais SVG
// 4. Microinterações Hápticas & Som de Clique (Web Audio API)
// 5. Barra de Leitura Estilizada
// 14. Mural Interativo de Depoimentos
// 15. Lista de Espera & Registro de Interesse
// ==========================================================================



// --------------------------------------------------------------------------
// 5. Barra de Progresso de Leitura Estilizada
// --------------------------------------------------------------------------
function initReadingProgressBar() {
  const progressBar = document.getElementById('reading-progress-bar');
  if (!progressBar) return;

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (docHeight > 0) {
      const scrolled = (scrollTop / docHeight) * 100;
      progressBar.style.width = scrolled + '%';
    }
  }, { passive: true });
}

// --------------------------------------------------------------------------
// 2. Modo Redução Sensorial & Controle de Áudio
// --------------------------------------------------------------------------
let audioFeedbackEnabled = true;

function initSensoryAndAudioControls() {
  const sensoryBtn = document.getElementById('sensory-toggle-btn');
  const audioBtn = document.getElementById('audio-toggle-btn');

  // Verifica preferência do sistema
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reduced-sensory');
    if (sensoryBtn) sensoryBtn.classList.add('active');
  }

  if (sensoryBtn) {
    sensoryBtn.addEventListener('click', () => {
      const isReduced = document.documentElement.classList.toggle('reduced-sensory');
      sensoryBtn.classList.toggle('active', isReduced);
      sensoryBtn.setAttribute('aria-pressed', isReduced ? 'true' : 'false');
      playUiPop(isReduced ? 320 : 540);
    });
  }

  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      audioFeedbackEnabled = !audioFeedbackEnabled;
      audioBtn.classList.toggle('active', !audioFeedbackEnabled);
      audioBtn.innerHTML = audioFeedbackEnabled ? '<span>🔊</span><span class="audio-text">Som</span>' : '<span>🔇</span><span class="audio-text">Mudo</span>';
      if (audioFeedbackEnabled) playUiPop(660);
    });
  }
}

// --------------------------------------------------------------------------
// 4. Microinterações Hápticas & Síntese Sonora (Web Audio API)
// --------------------------------------------------------------------------
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playUiPop(freq = 520, duration = 0.08) {
  if (!audioFeedbackEnabled) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

function playPurrSound() {
  if (!audioFeedbackEnabled) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, ctx.currentTime);
    osc.frequency.setValueAtTime(115, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(95, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {}
}

function initButtonAudioFeedback() {
  const interactiveElements = document.querySelectorAll('.btn, .demo-btn, .theme-toggle-btn, .theme-option, .exp-pill, .led-color-btn, .pet-action-hero-btn');
  interactiveElements.forEach(el => {
    el.addEventListener('click', () => playUiPop(560));
    el.addEventListener('mouseenter', () => playUiPop(440, 0.04));
  });
}

// --------------------------------------------------------------------------
// 1. Modelo 3D Interativo do FEFO (WebGL Three.js)
// --------------------------------------------------------------------------
let fefoPetGroup = null;
let earLeds = [];
let screenMesh = null;
let currentExpression = 'happy';
const expressionTextures = {};

const expressionImageMap = {
  happy: 'images/expressoes/fefo_exp_alegre_1.png',
  calm: 'images/expressoes/fefo_exp_calmo_1.png',
  smart: 'images/expressoes/fefo_exp_esperto.png',
  sad: 'images/expressoes/fefo_exp_triste.png',
  eating: 'images/expressoes/fefo_exp_comendo.png',
  music: 'images/expressoes/fefo_exp_jukebox.png',
  panic: 'images/expressoes/fefo_exp_panico.png'
};

function playModeAudioFeedback(modeKey) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.05);

    if (modeKey === 'happy') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (modeKey === 'calm') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (modeKey === 'smart') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(783.99, now + 0.08);
      osc.frequency.setValueAtTime(987.77, now + 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (modeKey === 'sad') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(349.23, now);
      osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if (modeKey === 'eating') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(587.33, now + 0.16);
      osc.frequency.setValueAtTime(783.99, now + 0.24);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (modeKey === 'music') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.1);
      osc.frequency.setValueAtTime(659.25, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (modeKey === 'panic') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(329.63, now);
      osc.frequency.linearRampToValueAtTime(440, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {}
}

function initFefo3DViewer() {
  const container = document.getElementById('fefo-3d-viewport-wrapper');
  const canvas = document.getElementById('fefo-3d-canvas');
  const loadingOverlay = document.getElementById('fefo-3d-loading');
  const loadingText = document.getElementById('fefo-3d-loading-text');

  if (!container || !canvas || typeof THREE === 'undefined') {
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
    initFallback3DCanvas(canvas);
    return;
  }

  const width = container.clientWidth || 400;
  const height = container.clientHeight || 400;

  // Cena, Câmera e Renderizador Three.js
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 0.1, 3.4);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  } catch (err) {
    console.warn('WebGL não suportado ou desativado. Ativando fallback 2D:', err);
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
    initFallback3DCanvas(canvas);
    return;
  }

  // Iluminação Harmoniosa do Pet FEFO
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.35);
  dirLight1.position.set(3, 5, 4);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xa78bfa, 0.85);
  dirLight2.position.set(-3, -2, -3);
  scene.add(dirLight2);

  const rimLight = new THREE.PointLight(0xec4899, 2.0, 10);
  rimLight.position.set(-2.5, 2, -2);
  scene.add(rimLight);

  fefoPetGroup = new THREE.Group();
  scene.add(fefoPetGroup);

  // Pré-carregar todas as 6 texturas faciais
  const texLoader = new THREE.TextureLoader();
  Object.keys(expressionImageMap).forEach(key => {
    texLoader.load(expressionImageMap[key], (tex) => {
      expressionTextures[key] = tex;
      if (key === currentExpression && screenMesh) {
        screenMesh.material.map = tex;
        screenMesh.material.needsUpdate = true;
      }
    });
  });

  function setModelExpression(expKey) {
    currentExpression = expKey;
    if (screenMesh) {
      if (expressionTextures[expKey]) {
        screenMesh.material.map = expressionTextures[expKey];
        screenMesh.material.needsUpdate = true;
      } else {
        texLoader.load(expressionImageMap[expKey] || expressionImageMap.happy, (tex) => {
          expressionTextures[expKey] = tex;
          screenMesh.material.map = tex;
          screenMesh.material.needsUpdate = true;
        });
      }
    }
  }

  // Carregar Modelo Oficial do FEFO (models/fefo_pet.glb) com timeout de resiliência
  if (typeof THREE.GLTFLoader !== 'undefined') {
    const gltfLoader = new THREE.GLTFLoader();
    const modelUrl = 'models/fefo_pet.glb';
    let loaded = false;

    // Timeout de segurança: se o download de 46MB demorar mais de 8s, usa o modelo procedural rápido
    const loadTimeout = setTimeout(() => {
      if (!loaded && fefoPetGroup && fefoPetGroup.children.length === 0) {
        console.warn('O download do modelo GLB 3D excedeu o tempo limite. Ativando modelo estilizado procedural...');
        buildProceduralModel();
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
      }
    }, 8000);

    gltfLoader.load(
      modelUrl,
      (gltf) => {
        if (loaded) return;
        loaded = true;
        clearTimeout(loadTimeout);

        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) {
              child.geometry.computeVertexNormals();
              child.geometry.center();

              const box = new THREE.Box3().setFromBufferAttribute(child.geometry.attributes.position);
              const size = box.getSize(new THREE.Vector3());
              const maxDim = Math.max(size.x, size.y, size.z);
              const s = 2.2 / maxDim;
              child.geometry.scale(s, s, s);
            }

            child.material = new THREE.MeshStandardMaterial({
              color: 0x8b5cf6,
              roughness: 0.38,
              metalness: 0.12
            });
          }
        });

        fefoPetGroup.add(gltf.scene);

        // Tela Digital frontal ajustada ao recorte do chassi 3D oficial
        const initialTex = expressionTextures[currentExpression] || null;
        const screenGeo = new THREE.PlaneGeometry(0.72, 0.48);
        const screenMat = new THREE.MeshBasicMaterial({
          map: initialTex,
          toneMapped: false
        });
        screenMesh = new THREE.Mesh(screenGeo, screenMat);
        screenMesh.position.set(0, 0.165, 0.545);
        fefoPetGroup.add(screenMesh);

        // Fundo escuro atrás da tela
        const backGeo = new THREE.PlaneGeometry(0.74, 0.50);
        const backMat = new THREE.MeshBasicMaterial({ color: 0x070412 });
        const backMesh = new THREE.Mesh(backGeo, backMat);
        backMesh.position.set(0, 0.165, 0.54);
        fefoPetGroup.add(backMesh);

        // LEDs das Orelhinhas que reagem à Cromoterapia
        const ledGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const ledMatL = new THREE.MeshStandardMaterial({
          color: 0xec4899,
          emissive: 0xec4899,
          emissiveIntensity: 2.2,
          roughness: 0.2
        });
        const ledMatR = ledMatL.clone();

        const earL = new THREE.Mesh(ledGeo, ledMatL);
        earL.position.set(-0.42, 0.92, 0.08);
        fefoPetGroup.add(earL);
        earLeds.push(earL);

        const earR = new THREE.Mesh(ledGeo, ledMatR);
        earR.position.set(0.42, 0.92, 0.08);
        fefoPetGroup.add(earR);
        earLeds.push(earR);

        if (!initialTex) {
          setModelExpression(currentExpression);
        }

        if (loadingOverlay) {
          loadingOverlay.classList.add('hidden');
        }
      },
      (xhr) => {
        if (xhr.total && loadingText) {
          const pct = Math.min(100, Math.round((xhr.loaded / xhr.total) * 100));
          loadingText.textContent = `🐾 Carregando FEFO 3D Oficial... ${pct}%`;
        }
      },
      (err) => {
        if (loaded) return;
        loaded = true;
        clearTimeout(loadTimeout);
        console.warn('Carregamento do GLB indisponível, ativando modelo estilizado:', err);
        buildProceduralModel();
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
      }
    );
  } else {
    buildProceduralModel();
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
  }

  function buildProceduralModel() {
    const bodyGeo = new THREE.SphereGeometry(1.1, 32, 32);
    bodyGeo.scale(1, 0.92, 0.95);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.5, metalness: 0.15 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    fefoPetGroup.add(bodyMesh);

    const earGeo = new THREE.ConeGeometry(0.35, 0.65, 16);
    const earMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.4 });
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      emissive: 0xec4899,
      emissiveIntensity: 1.8,
      roughness: 0.2
    });

    const earLeft = new THREE.Mesh(earGeo, earMat);
    earLeft.position.set(-0.65, 0.95, 0.1);
    earLeft.rotation.z = 0.35;
    earLeft.rotation.x = -0.1;
    fefoPetGroup.add(earLeft);

    const earLeftLed = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 16), ledMat);
    earLeftLed.position.set(-0.62, 0.92, 0.16);
    earLeftLed.rotation.z = 0.35;
    earLeftLed.rotation.x = -0.1;
    fefoPetGroup.add(earLeftLed);
    earLeds.push(earLeftLed);

    const earRight = new THREE.Mesh(earGeo, earMat);
    earRight.position.set(0.65, 0.95, 0.1);
    earRight.rotation.z = -0.35;
    earRight.rotation.x = -0.1;
    fefoPetGroup.add(earRight);

    const earRightLed = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 16), ledMat.clone());
    earRightLed.position.set(0.62, 0.92, 0.16);
    earRightLed.rotation.z = -0.35;
    earRightLed.rotation.x = -0.1;
    fefoPetGroup.add(earRightLed);
    earLeds.push(earRightLed);

    const screenFrameGeo = new THREE.BoxGeometry(1.15, 0.85, 0.1);
    const screenFrameMat = new THREE.MeshStandardMaterial({ color: 0x1f143d, roughness: 0.3 });
    const screenFrame = new THREE.Mesh(screenFrameGeo, screenFrameMat);
    screenFrame.position.set(0, 0.05, 0.96);
    fefoPetGroup.add(screenFrame);

    const screenGeo = new THREE.PlaneGeometry(1.05, 0.75);
    const screenMat = new THREE.MeshBasicMaterial({ map: expressionTextures[currentExpression] || null, toneMapped: false });
    screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.05, 1.02);
    fefoPetGroup.add(screenMesh);

    const pawGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const pawMat = new THREE.MeshStandardMaterial({ color: 0x6d28d9, roughness: 0.5 });
    const pawL = new THREE.Mesh(pawGeo, pawMat);
    pawL.position.set(-0.45, -0.85, 0.75);
    pawL.scale.set(1, 0.7, 1.3);
    fefoPetGroup.add(pawL);

    const pawR = new THREE.Mesh(pawGeo, pawMat);
    pawR.position.set(0.45, -0.85, 0.75);
    pawR.scale.set(1, 0.7, 1.3);
    fefoPetGroup.add(pawR);

    setModelExpression(currentExpression);
  }

  // Controles de Arrastar com Mouse / Toque 360°
  let isDragging = false;
  let prevMousePos = { x: 0, y: 0 };
  let targetRotation = { x: 0, y: 0 };

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - prevMousePos.x;
    const deltaY = e.clientY - prevMousePos.y;
    targetRotation.y += deltaX * 0.008;
    targetRotation.x += deltaY * 0.005;
    targetRotation.x = Math.max(-0.4, Math.min(0.4, targetRotation.x));
    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointerup', () => { isDragging = false; });

  // Loop de Animação Contínua
  let clock = new THREE.Clock();
  let bounceAnim = { active: false, time: 0 };

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (!document.documentElement.classList.contains('reduced-sensory')) {
      fefoPetGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.04;
    } else {
      fefoPetGroup.position.y = 0;
    }

    fefoPetGroup.rotation.y += (targetRotation.y - fefoPetGroup.rotation.y) * 0.15;
    fefoPetGroup.rotation.x += (targetRotation.x - fefoPetGroup.rotation.x) * 0.15;

    if (bounceAnim.active) {
      bounceAnim.time += delta * 6;
      const s = 1 + Math.sin(bounceAnim.time) * 0.2;
      fefoPetGroup.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
      if (bounceAnim.time >= Math.PI) {
        bounceAnim.active = false;
        fefoPetGroup.scale.set(1, 1, 1);
      }
    }

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Gatilho: Botão "Fazer Carinho 💜"
  const petBtn = document.getElementById('pet-fazer-carinho-btn');
  if (petBtn) {
    petBtn.addEventListener('click', () => {
      bounceAnim = { active: true, time: 0 };
      playPurrSound();
      const prev = currentExpression;
      setModelExpression('smart');
      createFloatingHearts(container);
      setTimeout(() => {
        setModelExpression(prev);
      }, 1600);
    });
  }

  // Seletor de Cores do LED
  document.querySelectorAll('.led-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.led-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const hexColor = parseInt(btn.getAttribute('data-hex').replace('#', '0x'));
      earLeds.forEach(led => {
        if (led.material) {
          led.material.color.setHex(hexColor);
          if (led.material.emissive) led.material.emissive.setHex(hexColor);
        }
      });
      if (rimLight) rimLight.color.setHex(hexColor);
      playUiPop(720);
    });
  });

  // Seletor de Expressões da Tela 3D
  document.querySelectorAll('.exp-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.exp-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const exp = btn.getAttribute('data-exp');
      setModelExpression(exp);
      playModeAudioFeedback(exp);
    });
  });
}

function createFloatingHearts(container) {
  for (let i = 0; i < 6; i++) {
    const heart = document.createElement('div');
    heart.className = 'fefo-3d-heart-fx';
    heart.textContent = ['💜', '💖', '✨', '🐾'][Math.floor(Math.random() * 4)];
    heart.style.left = (40 + Math.random() * 20) + '%';
    heart.style.top = (50 + Math.random() * 10) + '%';
    heart.style.animationDelay = (i * 0.12) + 's';
    container.appendChild(heart);
    setTimeout(() => heart.remove(), 1400);
  }
}

// Fallback Canvas 2D se WebGL/Three.js não estiver disponível
function initFallback3DCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = 400;
  canvas.height = 400;
  ctx.fillStyle = '#160e2c';
  ctx.fillRect(0, 0, 400, 400);
  ctx.fillStyle = '#8b5cf6';
  ctx.beginPath();
  ctx.arc(200, 200, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#00f2fe';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🐾 FEFO Pet 3D', 200, 200);
}

// --------------------------------------------------------------------------
// 14. Mural de Depoimentos com Áudio Simulado
// --------------------------------------------------------------------------
function initTestimonialsAudio() {
  const audioButtons = document.querySelectorAll('.testimonial-audio-btn');
  audioButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const isPlaying = btn.classList.contains('playing');
      audioButtons.forEach(b => {
        b.classList.remove('playing');
        b.innerHTML = '<span>🔊 Ouvir Relato em Áudio</span>';
      });

      if (!isPlaying) {
        btn.classList.add('playing');
        btn.innerHTML = '<span>⏸️ Reproduzindo Relato...</span>';
        playPurrSound();
        playUiPop(520, 0.3);

        setTimeout(() => {
          btn.classList.remove('playing');
          btn.innerHTML = '<span>🔊 Ouvir Relato em Áudio</span>';
        }, 5000);
      }
    });
  });
}

// --------------------------------------------------------------------------
// 15. Central de Lista de Espera & Validação do Lead
// --------------------------------------------------------------------------
function initWaitlistForm() {
  const form = document.getElementById('waitlist-form');
  const modal = document.getElementById('waitlist-ticket-modal');
  const closeBtn = document.getElementById('close-ticket-btn');
  const ticketSpan = document.getElementById('ticket-number-display');

  if (!form || !modal) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('lead-name').value.trim();
    const email = document.getElementById('lead-email').value.trim();
    const phone = document.getElementById('lead-phone').value.trim();
    const role = document.getElementById('lead-role').value;
    const qty = document.getElementById('lead-qty').value;

    if (!name || !email) {
      alert('Por favor, preencha nome e e-mail para prosseguir.');
      return;
    }

    // Gerar Número de Protocolo Simbólico
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const ticketCode = `FEFO-2026-${randomNum}`;

    // Salvar no localStorage
    try {
      const savedLeads = JSON.parse(localStorage.getItem('fefo-leads') || '[]');
      savedLeads.push({ ticketCode, name, email, phone, role, qty, date: new Date().toISOString() });
      localStorage.setItem('fefo-leads', JSON.stringify(savedLeads));
    } catch (err) {}

    // Exibir Modal
    if (ticketSpan) ticketSpan.textContent = ticketCode;
    modal.classList.add('open');
    playUiPop(880, 0.2);

    form.reset();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('open');
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
}
