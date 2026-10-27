/**
 * audio-editor.js - Ferramenta de Corte de Áudio Visual (Waveform Trimmer) FEFO Pet
 * Permite selecionar com precisão o trecho de áudio, aplicar fade in/out e salvar.
 */

(() => {
  let modal = null;
  let canvas = null, audio = null;
  let start = null, end = null, zoom = null;
  let startNumber = null, endNumber = null;
  let startOut = null, endOut = null, zoomOut = null;
  let fadeIn = null, fadeOut = null, fadeToggle = null;
  let fadeInOut = null, fadeOutOut = null;
  let saveBtn = null, playBtn = null, resetBtn = null, statusEl = null;

  let buffer = null, currentFileUrl = null, currentTitle = '', onSaveCallback = null;
  let dragging = null, animationFrame = 0, fadeEnabled = false;

  function fmt(val) {
    return `${Number(val).toFixed(2)}s`;
  }

  function setStatus(msg, kind = '') {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = `editor-status ${kind}`;
  }

  function createTrimmerDOM() {
    if (document.getElementById('audio-trimmer-modal')) return;

    const html = `
      <div id="audio-trimmer-modal" class="audio-trimmer-backdrop" style="display:none;">
        <div class="audio-trimmer-container">
          <div class="trimmer-header">
            <div>
              <span class="trimmer-badge">✂ FERRAMENTA DE CORTE</span>
              <h3 id="trimmer-audio-title" style="margin: 4px 0 0; color: #fff; font-size: 18px;">Cortar Áudio</h3>
            </div>
            <button id="trimmer-close" type="button" class="editor-close" title="Fechar">✕</button>
          </div>

          <div class="trimmer-canvas-box">
            <canvas id="trimmer-waveform"></canvas>
            <audio id="trimmer-audio" hidden></audio>
          </div>

          <div class="trimmer-controls-grid">
            <label>
              <span>Início: <output id="trimmer-start-val">0.00s</output></span>
              <input id="trimmer-start-slider" type="range" min="0" max="1" step="0.01" value="0">
            </label>
            <label>
              <span>Fim: <output id="trimmer-end-val">0.00s</output></span>
              <input id="trimmer-end-slider" type="range" min="0" max="1" step="0.01" value="1">
            </label>
            <label>
              <span>Zoom: <output id="trimmer-zoom-val">1x</output></span>
              <input id="trimmer-zoom-slider" type="range" min="1" max="20" step="1" value="1">
            </label>
            <label>
              <span>Fade In: <output id="trimmer-fadein-val">0.0s</output></span>
              <input id="trimmer-fadein-slider" type="range" min="0" max="5" step="0.1" value="0">
            </label>
            <label>
              <span>Fade Out: <output id="trimmer-fadeout-val">0.0s</output></span>
              <input id="trimmer-fadeout-slider" type="range" min="0" max="5" step="0.1" value="0">
            </label>
          </div>

          <div class="trimmer-bottom-bar">
            <button id="trimmer-play" type="button" class="editor-play" title="Ouvir o trecho selecionado">▶ Ouvir Trecho</button>
            <button id="trimmer-reset" type="button" class="editor-reset" style="margin: 0 10px;">↶ Redefinir Tudo</button>
            <div id="trimmer-status" class="editor-status" style="margin: 0; flex: 1;">Ajuste as réguas para cortar.</div>
            <button id="trimmer-save" type="button" class="editor-save" style="background:#2ecc71; color:#fff;">✓ Aplicar Corte</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    modal = document.getElementById('audio-trimmer-modal');
    canvas = document.getElementById('trimmer-waveform');
    audio = document.getElementById('trimmer-audio');
    start = document.getElementById('trimmer-start-slider');
    end = document.getElementById('trimmer-end-slider');
    zoom = document.getElementById('trimmer-zoom-slider');
    fadeIn = document.getElementById('trimmer-fadein-slider');
    fadeOut = document.getElementById('trimmer-fadeout-slider');

    startOut = document.getElementById('trimmer-start-val');
    endOut = document.getElementById('trimmer-end-val');
    zoomOut = document.getElementById('trimmer-zoom-val');
    fadeInOut = document.getElementById('trimmer-fadein-val');
    fadeOutOut = document.getElementById('trimmer-fadeout-val');

    playBtn = document.getElementById('trimmer-play');
    resetBtn = document.getElementById('trimmer-reset');
    saveBtn = document.getElementById('trimmer-save');
    statusEl = document.getElementById('trimmer-status');

    document.getElementById('trimmer-close').addEventListener('click', closeTrimmer);

    // Eventos
    start.addEventListener('input', sync);
    end.addEventListener('input', sync);
    zoom.addEventListener('input', sync);
    fadeIn.addEventListener('input', sync);
    fadeOut.addEventListener('input', sync);

    resetBtn.addEventListener('click', () => {
      if (!buffer) return;
      start.value = 0;
      end.value = buffer.duration;
      zoom.value = 1;
      fadeIn.value = 0;
      fadeOut.value = 0;
      audio.pause();
      audio.currentTime = 0;
      sync();
      setStatus(`Trecho restaurado ao áudio completo (${fmt(buffer.duration)}).`);
    });

    playBtn.addEventListener('click', () => {
      if (!buffer) return;
      if (audio.paused) {
        audio.currentTime = Number(start.value);
        audio.play();
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('play', () => {
      playBtn.textContent = '❚❚ Pausar';
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(animate);
    });

    audio.addEventListener('pause', () => {
      playBtn.textContent = '▶ Ouvir Trecho';
      cancelAnimationFrame(animationFrame);
      draw();
    });

    audio.addEventListener('timeupdate', () => {
      if (buffer && audio.currentTime >= Number(end.value)) {
        audio.pause();
        audio.currentTime = Number(start.value);
      }
    });

    // Canvas Pointer / Arrastar
    canvas.addEventListener('pointerdown', (e) => {
      if (!buffer) return;
      const rect = canvas.getBoundingClientRect();
      const [viewFrom, viewTo] = getView();
      const x = e.clientX - rect.left;
      const sx = ((Number(start.value) - viewFrom) / (viewTo - viewFrom)) * rect.width;
      const ex = ((Number(end.value) - viewFrom) / (viewTo - viewFrom)) * rect.width;
      dragging = Math.abs(x - sx) <= Math.abs(x - ex) ? 'start' : 'end';
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = canvas.getBoundingClientRect();
      const [viewFrom, viewTo] = getView();
      const val = Math.max(viewFrom, Math.min(viewTo, viewFrom + ((e.clientX - rect.left) / rect.width) * (viewTo - viewFrom)));
      if (dragging === 'start') {
        start.value = Math.min(val, Number(end.value) - 0.05);
      } else {
        end.value = Math.max(val, Number(start.value) + 0.05);
      }
      sync();
    });

    canvas.addEventListener('pointerup', () => { dragging = null; });

    // Salvar corte
    saveBtn.addEventListener('click', () => {
      if (!buffer || !onSaveCallback) return;
      setStatus('Processando corte do áudio...', '');
      saveBtn.disabled = true;

      try {
        const rate = buffer.sampleRate;
        const from = Math.floor(Number(start.value) * rate);
        const to = Math.floor(Number(end.value) * rate);
        const len = to - from;
        const result = new Float32Array(len);
        const original = buffer.getChannelData(0);

        const inSamples = Math.floor(Number(fadeIn.value) * rate);
        const outSamples = Math.floor(Number(fadeOut.value) * rate);

        for (let i = 0; i < len; i++) {
          let gain = 1;
          if (inSamples > 0 && i < inSamples) gain *= i / inSamples;
          if (outSamples > 0 && i >= len - outSamples) gain *= (len - i) / outSamples;
          result[i] = original[from + i] * gain;
        }

        const blob = encodeWav(result, rate);
        onSaveCallback(blob, {
          duration: Number(end.value) - Number(start.value),
          start: Number(start.value),
          end: Number(end.value)
        });
        closeTrimmer();
      } catch (err) {
        setStatus(`Erro ao cortar áudio: ${err.message}`, 'error');
        saveBtn.disabled = false;
      }
    });
  }

  function getView() {
    if (!buffer) return [0, 1];
    const duration = buffer.duration;
    const span = duration / Number(zoom.value);
    const center = (Number(start.value) + Number(end.value)) / 2;
    const from = Math.max(0, Math.min(duration - span, center - span / 2));
    return [from, from + span];
  }

  function draw() {
    if (!buffer || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));

    const ctx = canvas.getContext('2d');
    const width = rect.width, height = rect.height;
    ctx.scale(ratio, ratio);

    ctx.fillStyle = '#0f274a';
    ctx.fillRect(0, 0, width, height);

    const [viewFrom, viewTo] = getView();
    const data = buffer.getChannelData(0);
    const first = Math.floor(viewFrom * buffer.sampleRate);
    const last = Math.min(data.length, Math.ceil(viewTo * buffer.sampleRate));
    const step = Math.max(1, Math.ceil((last - first) / width));

    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const from = first + x * step, to = Math.min(last, from + step);
      let min = 1, max = -1;
      for (let i = from; i < to; i++) {
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];
      }
      ctx.moveTo(x, (1 + min) * height / 2);
      ctx.lineTo(x, (1 + max) * height / 2);
    }
    ctx.stroke();

    // Regiões sombreadas fora do corte
    const sx = ((Number(start.value) - viewFrom) / (viewTo - viewFrom)) * width;
    const ex = ((Number(end.value) - viewFrom) / (viewTo - viewFrom)) * width;

    ctx.fillStyle = 'rgba(7, 23, 49, 0.75)';
    if (sx > 0) ctx.fillRect(0, 0, sx, height);
    if (ex < width) ctx.fillRect(ex, 0, width - ex, height);

    // Região selecionada em destaque
    ctx.fillStyle = 'rgba(46, 204, 113, 0.18)';
    ctx.fillRect(Math.max(0, sx), 0, Math.max(0, ex - sx), height);

    // Marcadores de início e fim
    [sx, ex].forEach((mx, i) => {
      ctx.strokeStyle = '#00d2d3';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, height);
      ctx.stroke();

      ctx.fillStyle = '#00d2d3';
      ctx.beginPath();
      ctx.arc(mx, 10, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Cursor de reprodução
    if (!audio.paused && audio.currentTime >= viewFrom && audio.currentTime <= viewTo) {
      const px = ((audio.currentTime - viewFrom) / (viewTo - viewFrom)) * width;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }
  }

  function sync() {
    if (!buffer) return;
    if (Number(start.value) >= Number(end.value)) {
      start.value = Math.max(0, Number(end.value) - 0.05);
    }
    startOut.textContent = fmt(start.value);
    endOut.textContent = fmt(end.value);
    zoomOut.textContent = `${zoom.value}x`;
    fadeInOut.textContent = `${Number(fadeIn.value).toFixed(1)}s`;
    fadeOutOut.textContent = `${Number(fadeOut.value).toFixed(1)}s`;

    if (!audio.paused && (audio.currentTime < Number(start.value) || audio.currentTime >= Number(end.value))) {
      audio.currentTime = Number(start.value);
    }
    draw();
  }

  function animate() {
    draw();
    if (!audio.paused) animationFrame = requestAnimationFrame(animate);
  }

  function encodeWav(data, sampleRate) {
    const bytes = new ArrayBuffer(44 + data.length * 2);
    const view = new DataView(bytes);
    const write = (offset, text) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
    write(0, 'RIFF');
    view.setUint32(4, 36 + data.length * 2, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, data.length * 2, true);
    for (let i = 0; i < data.length; i++) {
      view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true);
    }
    return new Blob([bytes], { type: 'audio/wav' });
  }

  function closeTrimmer() {
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
    }
    if (modal) modal.style.display = 'none';
    buffer = null;
    currentFileUrl = null;
    onSaveCallback = null;
  }

  /**
   * Abre a ferramenta de corte para um áudio específico
   * @param {Object} options
   * @param {string} options.url URL do arquivo de áudio
   * @param {string} options.title Título amigável
   * @param {Function} options.onSave Callback chamado com (blob, info)
   */
  async function openAudioTrimmer({ url, title, onSave }) {
    createTrimmerDOM();
    currentFileUrl = url;
    currentTitle = title || 'Áudio';
    onSaveCallback = onSave;

    document.getElementById('trimmer-audio-title').textContent = `Cortar: ${currentTitle}`;
    modal.style.display = 'flex';
    saveBtn.disabled = true;
    setStatus('Carregando e decodificando áudio na memória...', '');

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Falha ao baixar áudio (HTTP ${res.status}).`);
      const arrayBuf = await res.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      buffer = await audioCtx.decodeAudioData(arrayBuf);

      audio.src = url;
      start.max = buffer.duration;
      end.max = buffer.duration;
      start.value = 0;
      end.value = buffer.duration;
      fadeIn.max = Math.min(10, buffer.duration / 2);
      fadeOut.max = Math.min(10, buffer.duration / 2);
      fadeIn.value = 0;
      fadeOut.value = 0;
      zoom.value = 1;

      saveBtn.disabled = false;
      sync();
      setStatus(`Áudio carregado (${fmt(buffer.duration)}). Arraste os seletores azuis para definir o início e o fim.`, 'ok');
    } catch (err) {
      setStatus(`Não foi possível carregar o áudio: ${err.message}`, 'error');
    }
  }

  window.openAudioTrimmer = openAudioTrimmer;
  window.closeAudioTrimmer = closeTrimmer;
})();
