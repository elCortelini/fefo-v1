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

document.addEventListener('DOMContentLoaded', () => {
  initReadingProgressBar();
  initSensoryAndAudioControls();
  initFefo3DViewer();
  initButtonAudioFeedback();
  initTestimonialsAudio();
  initWaitlistForm();
});

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
      audioBtn.innerHTML = audioFeedbackEnabled ? '<span>🔊 Som Ativo</span>' : '<span>🔇 Mudo</span>';
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
let faceCanvas = null;
let faceTexture = null;
let currentExpression = 'happy';

function initFefo3DViewer() {
  const container = document.getElementById('fefo-3d-viewport-wrapper');
  const canvas = document.getElementById('fefo-3d-canvas');
  if (!container || !canvas || typeof THREE === 'undefined') {
    // Se Three.js não estiver carregado (ex: sem internet), inicializa fallback canvas 2D
    initFallback3DCanvas(canvas);
    return;
  }

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Cena, Câmera e Renderizador Three.js
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 0.5, 4.2);

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Iluminação
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff5ea, 1.2);
  dirLight.position.set(3, 5, 4);
  scene.add(dirLight);

  const rimLight = new THREE.PointLight(0x8b5cf6, 2.5, 10);
  rimLight.position.set(-3, 2, -2);
  scene.add(rimLight);

  // Criar Modelo 3D Procedural Estilizado do FEFO
  fefoPetGroup = new THREE.Group();

  // 1. Corpo Aveludado Principal (Cabeça/Corpo)
  const bodyGeo = new THREE.SphereGeometry(1.1, 32, 32);
  bodyGeo.scale(1, 0.92, 0.95);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    roughness: 0.5,
    metalness: 0.15
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  fefoPetGroup.add(bodyMesh);

  // 2. Orelhas de Gatinho com LED
  const earGeo = new THREE.ConeGeometry(0.35, 0.65, 16);
  const earMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.4 });
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    emissive: 0xec4899,
    emissiveIntensity: 1.8,
    roughness: 0.2
  });

  // Orelha Esquerda
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

  // Orelha Direita
  const earRight = new THREE.Mesh(earGeo, earMat);
  earRight.position.set(0.65, 0.95, 0.1);
  earRight.rotation.z = -0.35;
  earRight.rotation.x = -0.1;
  fefoPetGroup.add(earRight);

  const earRightLed = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 16), ledMat);
  earRightLed.position.set(0.62, 0.92, 0.16);
  earRightLed.rotation.z = -0.35;
  earRightLed.rotation.x = -0.1;
  fefoPetGroup.add(earRightLed);
  earLeds.push(earRightLed);

  // 3. Moldura da Tela Digital Frontal
  const screenFrameGeo = new THREE.BoxGeometry(1.15, 0.85, 0.1);
  const screenFrameMat = new THREE.MeshStandardMaterial({ color: 0x1f143d, roughness: 0.3 });
  const screenFrame = new THREE.Mesh(screenFrameGeo, screenFrameMat);
  screenFrame.position.set(0, 0.05, 0.96);
  fefoPetGroup.add(screenFrame);

  // 4. Tela com Textura Dinâmica (Expressões)
  faceCanvas = document.createElement('canvas');
  faceCanvas.width = 512;
  faceCanvas.height = 384;
  updateFaceCanvasTexture('happy');

  faceTexture = new THREE.CanvasTexture(faceCanvas);
  const screenGeo = new THREE.PlaneGeometry(1.05, 0.75);
  const screenMat = new THREE.MeshBasicMaterial({ map: faceTexture });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, 0.05, 1.02);
  fefoPetGroup.add(screenMesh);

  // 5. Patinhas Frontais Fofas
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

  scene.add(fefoPetGroup);

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

  // Animação Contínua (Loop)
  let clock = new THREE.Clock();
  let bounceAnim = { active: false, time: 0 };

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (!document.documentElement.classList.contains('reduced-sensory')) {
      // Flutuação suave de respiração
      fefoPetGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.05;
      
      // Rotação suave em direção ao target
      fefoPetGroup.rotation.y += (targetRotation.y - fefoPetGroup.rotation.y) * 0.1;
      fefoPetGroup.rotation.x += (targetRotation.x - fefoPetGroup.rotation.x) * 0.1;

      // Animação de Carinho / Pulo
      if (bounceAnim.active) {
        bounceAnim.time += delta * 6;
        const s = 1 + Math.sin(bounceAnim.time) * 0.2;
        fefoPetGroup.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
        if (bounceAnim.time >= Math.PI) {
          bounceAnim.active = false;
          fefoPetGroup.scale.set(1, 1, 1);
        }
      }
    }

    renderer.render(scene, camera);
  }
  animate();

  // Redimensionamento
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
      updateFaceCanvasTexture('love');
      createFloatingHearts(container);
      setTimeout(() => {
        updateFaceCanvasTexture(currentExpression);
      }, 1500);
    });
  }

  // Seletor de Cores do LED
  document.querySelectorAll('.led-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.led-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const hexColor = parseInt(btn.getAttribute('data-hex').replace('#', '0x'));
      earLeds.forEach(led => {
        led.material.color.setHex(hexColor);
        led.material.emissive.setHex(hexColor);
      });
      playUiPop(720);
    });
  });

  // Seletor de Expressões
  document.querySelectorAll('.exp-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.exp-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const exp = btn.getAttribute('data-exp');
      currentExpression = exp;
      updateFaceCanvasTexture(exp);
      playUiPop(600);
    });
  });
}

function updateFaceCanvasTexture(expression) {
  if (!faceCanvas) return;
  const ctx = faceCanvas.getContext('2d');
  const w = faceCanvas.width;
  const h = faceCanvas.height;

  // Fundo tela escura
  ctx.fillStyle = '#0a0518';
  ctx.fillRect(0, 0, w, h);

  // Desenho dos olhos e boquinha em ciano/neon
  ctx.strokeStyle = '#00f2fe';
  ctx.fillStyle = '#00f2fe';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';

  const leftEyeX = w * 0.32;
  const rightEyeX = w * 0.68;
  const eyeY = h * 0.42;

  if (expression === 'happy') {
    // Olhos em arco sorridente ^ ^
    ctx.beginPath();
    ctx.arc(leftEyeX, eyeY + 10, 45, Math.PI, 0, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rightEyeX, eyeY + 10, 45, Math.PI, 0, false);
    ctx.stroke();

    // Boquinha de gato :3
    ctx.beginPath();
    ctx.arc(w * 0.46, h * 0.68, 22, 0, Math.PI, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.54, h * 0.68, 22, 0, Math.PI, false);
    ctx.stroke();
  } else if (expression === 'sleepy') {
    // Olhinhos fechados dormindo - -
    ctx.beginPath();
    ctx.moveTo(leftEyeX - 40, eyeY);
    ctx.lineTo(leftEyeX + 40, eyeY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rightEyeX - 40, eyeY);
    ctx.lineTo(rightEyeX + 40, eyeY);
    ctx.stroke();

    // Boquinha suave
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.68, 15, 0, Math.PI, false);
    ctx.stroke();
  } else if (expression === 'curious') {
    // Olhinhos arregalados O O
    ctx.beginPath();
    ctx.arc(leftEyeX, eyeY, 35, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(rightEyeX, eyeY, 35, 0, Math.PI * 2);
    ctx.fill();

    // Boquinha o
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.72, 18, 0, Math.PI * 2);
    ctx.stroke();
  } else if (expression === 'love') {
    // Olhos de Coração em Rosa ♥ ♥
    ctx.fillStyle = '#ec4899';
    drawHeart(ctx, leftEyeX, eyeY - 20, 45);
    drawHeart(ctx, rightEyeX, eyeY - 20, 45);

    // Boquinha aberta alegre
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.68, 26, 0, Math.PI, false);
    ctx.fill();
  }

  if (faceTexture) faceTexture.needsUpdate = true;
}

function drawHeart(ctx, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.translate(x, y);
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-size / 2, -size / 2, -size, size / 3, 0, size);
  ctx.bezierCurveTo(size, size / 3, size / 2, -size / 2, 0, 0);
  ctx.fill();
  ctx.restore();
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
