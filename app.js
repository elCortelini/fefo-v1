// ==========================================================================
// FEFO Pet - Interactive Logic & Story Video Studio Engine
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initFaceSimulator();
  initFaqAccordion();
  initSmoothScroll();
  initFefoVideoStudio();
  initRealPhotoGallery();
});

// 1. FEFO Interactive Screen & Mode Simulator
function initFaceSimulator() {
  const faceEmoji = document.getElementById('sim-emoji');
  const faceLabel = document.getElementById('sim-label');
  const simScreen = document.getElementById('sim-screen');
  const simButtons = document.querySelectorAll('.demo-btn');

  if (!faceEmoji) return;

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
        imgEl ? imgEl.src : 'images/fefo_dispositivo_ligado_tela.jpg',
        'FEFO Pet — Protótipo V1 Real em Funcionamento',
        'Robô assistivo com chassi 3D, tela OLED afetiva e anel de iluminação NeoPixel RGB para cromoterapia.'
      );
    });
  }

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
