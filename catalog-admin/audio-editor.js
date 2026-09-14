(() => {
  let fileInput = document.querySelector('#audio-editor-file');
  if (!fileInput) {
    const host = document.querySelector('.import-card');
    if (!host) return;
    host.insertAdjacentHTML('afterend', `<section class="card audio-editor-card"><p class="eyebrow">EDIÇÃO RÁPIDA</p><h2>Cortar e ajustar áudio</h2><p>Edite o trecho no navegador. Ao salvar, somente o áudio editado será adicionado ao catálogo.</p><div class="audio-editor"><input id="audio-editor-file" class="editor-file" type="file" accept="audio/*"><audio id="audio-editor-preview" controls hidden></audio><canvas id="audio-editor-waveform" aria-label="Forma de onda do áudio"></canvas><div class="editor-controls"><label>Início <output id="audio-editor-start-value">0.00s</output><input id="audio-editor-start" type="range" min="0" max="1" step="0.01" value="0" disabled></label><label>Fim <output id="audio-editor-end-value">0.00s</output><input id="audio-editor-end" type="range" min="0" max="1" step="0.01" value="1" disabled></label><label>Fade in <output>segundos</output><input id="audio-editor-fade-in" type="range" min="0" max="10" step="0.1" value="0"></label><label>Fade out <output>segundos</output><input id="audio-editor-fade-out" type="range" min="0" max="10" step="0.1" value="0"></label></div><div class="editor-actions"><button id="audio-editor-save" class="btn primary" type="button" disabled>Salvar áudio editado</button><span id="audio-editor-status" class="editor-status" role="status">Selecione um áudio para começar.</span></div></div></section>`);
    fileInput = document.querySelector('#audio-editor-file');
  }
  const canvas = document.querySelector('#audio-editor-waveform');
  const start = document.querySelector('#audio-editor-start');
  const end = document.querySelector('#audio-editor-end');
  const startOut = document.querySelector('#audio-editor-start-value');
  const endOut = document.querySelector('#audio-editor-end-value');
  const fadeIn = document.querySelector('#audio-editor-fade-in');
  const fadeOut = document.querySelector('#audio-editor-fade-out');
  const save = document.querySelector('#audio-editor-save');
  const status = document.querySelector('#audio-editor-status');
  const audio = document.querySelector('#audio-editor-preview');
  let sourceFile = null;
  let buffer = null;

  const fmt = value => `${Number(value).toFixed(2)}s`;
  const setStatus = (message, kind = '') => {
    status.textContent = message;
    status.className = `editor-status ${kind}`;
  };
  const draw = () => {
    if (!buffer) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    const width = rect.width, height = rect.height;
    ctx.fillStyle = '#211d35'; ctx.fillRect(0, 0, width, height);
    const data = buffer.getChannelData(0), step = Math.max(1, Math.ceil(data.length / width));
    ctx.strokeStyle = '#d9c9ff'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const from = x * step, to = Math.min(data.length, from + step);
      let min = 1, max = -1;
      for (let i = from; i < to; i++) { min = Math.min(min, data[i]); max = Math.max(max, data[i]); }
      ctx.moveTo(x, (1 + min) * height / 2); ctx.lineTo(x, (1 + max) * height / 2);
    }
    ctx.stroke();
    ctx.fillStyle = '#7657c555';
    ctx.fillRect(width * Number(start.value) / buffer.duration, 0,
      width * (Number(end.value) - Number(start.value)) / buffer.duration, height);
  };
  const updateRange = () => {
    if (!buffer) return;
    if (Number(start.value) >= Number(end.value)) {
      if (document.activeElement === start) start.value = Math.max(0, Number(end.value) - .01);
      else end.value = Math.min(buffer.duration, Number(start.value) + .01);
    }
    startOut.textContent = fmt(start.value); endOut.textContent = fmt(end.value); draw();
  };
  const encodeWav = (data, sampleRate) => {
    const bytes = new ArrayBuffer(44 + data.length * 2), view = new DataView(bytes);
    const write = (offset, text) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
    write(0, 'RIFF'); view.setUint32(4, 36 + data.length * 2, true); write(8, 'WAVE'); write(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data');
    view.setUint32(40, data.length * 2, true);
    for (let i = 0; i < data.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true);
    return new Blob([bytes], {type: 'audio/wav'});
  };
  fileInput.addEventListener('change', async () => {
    sourceFile = fileInput.files[0]; if (!sourceFile) return;
    try {
      buffer = await new AudioContext().decodeAudioData(await sourceFile.arrayBuffer());
      start.max = end.max = buffer.duration; start.value = 0; end.value = buffer.duration;
      fadeIn.max = fadeOut.max = Math.min(10, buffer.duration / 2);
      audio.src = URL.createObjectURL(sourceFile); audio.hidden = false; save.disabled = false;
      updateRange(); setStatus(`Áudio carregado: ${sourceFile.name}`); draw();
    } catch { setStatus('Não foi possível ler este áudio.', 'error'); }
  });
  [start, end].forEach(input => input.addEventListener('input', updateRange));
  window.addEventListener('resize', draw);
  save.addEventListener('click', () => {
    if (!buffer || !sourceFile) return;
    const rate = buffer.sampleRate, from = Math.floor(Number(start.value) * rate), to = Math.floor(Number(end.value) * rate);
    const result = new Float32Array(to - from), original = buffer.getChannelData(0);
    const inSamples = Math.floor(Number(fadeIn.value) * rate), outSamples = Math.floor(Number(fadeOut.value) * rate);
    for (let i = 0; i < result.length; i++) {
      let gain = 1;
      if (inSamples && i < inSamples) gain *= i / inSamples;
      if (outSamples && i >= result.length - outSamples) gain *= (result.length - i) / outSamples;
      result[i] = original[from + i] * gain;
    }
    const base = sourceFile.name.replace(/\.[^.]+$/, '') || 'audio-editado';
    const edited = new File([encodeWav(result, rate)], `${base}-editado.wav`, {type:'audio/wav'});
    const target = document.querySelector('#files');
    const transfer = new DataTransfer(); transfer.items.add(edited); target.files = transfer.files;
    target.dispatchEvent(new Event('change', {bubbles:true}));
    setStatus(`✓ ${edited.name} foi salvo para o catálogo. O áudio original não será enviado.`, 'ok');
    fileInput.value = ''; sourceFile = null; buffer = null; audio.hidden = true; save.disabled = true;
  });
})();
