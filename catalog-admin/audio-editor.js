/**
 * audio-editor.js - Ferramenta de Corte de Áudio Visual (Waveform Trimmer) FEFO Pet
 * Suporta modo inline (dentro do acordeon da faixa) e modo modal flutuante.
 */

(() => {
  function fmt(val) {
    return `${Number(val).toFixed(2)}s`;
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
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

  /**
   * Monta o Waveform Trimmer dentro de um container DOM qualquer.
   */
  function mountAudioTrimmer(container, options = {}) {
    if (!container) return null;

    if (container._trimmerInstance && typeof container._trimmerInstance.destroy === 'function') {
      container._trimmerInstance.destroy();
    }

    const {
      url,
      title = 'Áudio',
      description = '',
      itemCode = '',
      onSave = null,
      showClose = false,
      onClose = null
    } = options;

    const html = `
      <div class="audio-trimmer-container inline-trimmer-card">
        ${showClose ? `
          <div class="trimmer-header" style="margin-bottom: 8px;">
            <button type="button" class="editor-close" title="Fechar">✕</button>
          </div>
        ` : ''}

        ${description && description.trim() ? `
          <div class="trimmer-script-box">
            <div class="trimmer-script-header">
              <span class="trimmer-script-badge">📜 ROTEIRO / FALA DO FEFO</span>
            </div>
            <p class="trimmer-script-text">"${escapeHtml(description.trim())}"</p>
          </div>
        ` : ''}

        <div class="trimmer-canvas-box">
          <canvas class="trimmer-waveform" style="width:100%; height:140px; display:block; cursor:ew-resize;"></canvas>
          <audio hidden></audio>
        </div>

        <div class="trimmer-controls-grid">
          <label>
            <span>Fade In: <output class="trimmer-fadein-val">0.0s</output></span>
            <input class="trimmer-fadein-slider" type="range" min="0" max="5" step="0.1" value="0">
          </label>
          <label>
            <span>Início: <output class="trimmer-start-val">0.00s</output></span>
            <input class="trimmer-start-slider" type="range" min="0" max="1" step="0.01" value="0">
          </label>
          <label>
            <span>Fim: <output class="trimmer-end-val">0.00s</output></span>
            <input class="trimmer-end-slider" type="range" min="0" max="1" step="0.01" value="1">
          </label>
          <label>
            <span>Fade Out: <output class="trimmer-fadeout-val">0.0s</output></span>
            <input class="trimmer-fadeout-slider" type="range" min="0" max="5" step="0.1" value="0">
          </label>
          <label>
            <span>Zoom: <output class="trimmer-zoom-val">1x</output></span>
            <input class="trimmer-zoom-slider" type="range" min="1" max="20" step="1" value="1">
          </label>
        </div>

        <div class="trimmer-bottom-bar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button type="button" class="editor-play" title="Ouvir o trecho selecionado">▶ Ouvir Trecho</button>
            <button type="button" class="editor-reset">↶ Redefinir Tudo</button>
          </div>
          <div class="editor-status" style="display: none;">Ajuste as réguas para cortar.</div>
          <button type="button" class="editor-save" style="background:#22c55e; color:#fff;">✓ Aplicar Corte</button>
        </div>
      </div>
    `;

    container.innerHTML = html;

    const canvas = container.querySelector('.trimmer-waveform');
    const audio = container.querySelector('audio');
    const start = container.querySelector('.trimmer-start-slider');
    const end = container.querySelector('.trimmer-end-slider');
    const zoom = container.querySelector('.trimmer-zoom-slider');
    const fadeIn = container.querySelector('.trimmer-fadein-slider');
    const fadeOut = container.querySelector('.trimmer-fadeout-slider');

    const startOut = container.querySelector('.trimmer-start-val');
    const endOut = container.querySelector('.trimmer-end-val');
    const zoomOut = container.querySelector('.trimmer-zoom-val');
    const fadeInOut = container.querySelector('.trimmer-fadein-val');
    const fadeOutOut = container.querySelector('.trimmer-fadeout-val');

    const playBtn = container.querySelector('.editor-play');
    const resetBtn = container.querySelector('.editor-reset');
    const saveBtn = container.querySelector('.editor-save');
    const statusEl = container.querySelector('.editor-status');
    const closeBtn = container.querySelector('.editor-close');

    let buffer = null;
    let dragging = null;
    let animationFrame = 0;
    let isDestroyed = false;

    function setStatus(msg, kind = '') {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = `editor-status ${kind}`;
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
      if (!buffer || !canvas || isDestroyed) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(200, Math.floor(rect.width || canvas.clientWidth || 750));
      const height = Math.max(80, Math.floor(rect.height || canvas.clientHeight || 150));
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);

      const ctx = canvas.getContext('2d');
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
      [sx, ex].forEach((mx) => {
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
      if (!audio.paused && !isDestroyed) {
        animationFrame = requestAnimationFrame(animate);
      }
    }

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
        audio.play().catch(e => setStatus(`Erro ao reproduzir: ${e.message}`, 'error'));
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

    // Pointer events on canvas
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

    // Save cut
    saveBtn.addEventListener('click', async () => {
      if (!buffer || !onSave) return;
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

        const targetRate = 22050;
        let finalData = result;
        if (rate !== targetRate) {
          const newLen = Math.max(1, Math.round(len * targetRate / rate));
          const resampled = new Float32Array(newLen);
          const ratio = (len - 1) / Math.max(1, newLen - 1);
          for (let i = 0; i < newLen; i++) {
            const pos = i * ratio;
            const idx = Math.floor(pos);
            const frac = pos - idx;
            const s0 = result[idx] || 0;
            const s1 = result[idx + 1] !== undefined ? result[idx + 1] : s0;
            resampled[i] = s0 + frac * (s1 - s0);
          }
          finalData = resampled;
        }

        const blob = encodeWav(finalData, targetRate);
        await onSave(blob, {
          duration: Number(end.value) - Number(start.value),
          start: Number(start.value),
          end: Number(end.value)
        });
      } catch (err) {
        setStatus(`Erro ao cortar áudio: ${err.message}`, 'error');
        saveBtn.disabled = false;
      }
    });

    if (closeBtn && onClose) {
      closeBtn.addEventListener('click', onClose);
    }

    // ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      if (buffer && !isDestroyed) {
        draw();
      }
    });
    resizeObserver.observe(canvas);

    // Carregamento do áudio
    saveBtn.disabled = true;
    setStatus('Carregando e decodificando áudio na memória...', '');

    (async () => {
      try {
        let arrayBuf;
        if (url instanceof Blob) {
          arrayBuf = await url.arrayBuffer();
          audio.src = URL.createObjectURL(url);
        } else {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Falha ao baixar áudio (HTTP ${res.status}).`);
          arrayBuf = await res.arrayBuffer();
          audio.src = url;
        }

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        buffer = await audioCtx.decodeAudioData(arrayBuf);

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
        setTimeout(sync, 50);
        setTimeout(sync, 200);
        setStatus(`Áudio carregado (${fmt(buffer.duration)}). Arraste os seletores azuis para definir o início e o fim.`, 'ok');
      } catch (err) {
        setStatus(`Não foi possível carregar o áudio: ${err.message}`, 'error');
      }
    })();

    const instance = {
      destroy() {
        isDestroyed = true;
        cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        if (audio) {
          audio.pause();
          audio.removeAttribute('src');
        }
        buffer = null;
      }
    };

    container._trimmerInstance = instance;
    return instance;
  }

  // Modal Trimmer para compatibilidade
  let activeModal = null;
  let activeInstance = null;

  function closeTrimmer() {
    if (activeInstance) {
      activeInstance.destroy();
      activeInstance = null;
    }
    if (activeModal) {
      activeModal.style.display = 'none';
      activeModal.innerHTML = '';
    }
  }

  function openAudioTrimmer(options) {
    let modal = document.getElementById('audio-trimmer-modal');
    if (!modal) {
      const html = `<div id="audio-trimmer-modal" class="audio-trimmer-backdrop" style="display:none;"></div>`;
      document.body.insertAdjacentHTML('beforeend', html);
      modal = document.getElementById('audio-trimmer-modal');
    }

    activeModal = modal;
    modal.style.display = 'flex';

    activeInstance = mountAudioTrimmer(modal, {
      ...options,
      showClose: true,
      onClose: closeTrimmer,
      onSave: async (blob, info) => {
        if (options.onSave) {
          await options.onSave(blob, info);
        }
        closeTrimmer();
      }
    });
  }

  window.mountAudioTrimmer = mountAudioTrimmer;
  window.openAudioTrimmer = openAudioTrimmer;
  window.closeAudioTrimmer = closeTrimmer;
})();
