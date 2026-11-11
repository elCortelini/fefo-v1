/**
 * ==========================================================================
 * FEFO CATALOG ADMIN v3 - MOTOR DE DADOS, ÁUDIO VISUAL & UX
 * ==========================================================================
 * - Réplica exata do Mockup Oficial do FEFO
 * - Múltiplos Contos, Músicas, Treck-Trecks, Desafios, Livrinhos e Bobie Gods
 * - Acordeão Sanfonado Inteligente em cada item
 * - Numeração automática inteligente (A0001.WAV, CARD0001) com modo numeração livre
 * - Semáforo de produção (🔴 Sem Áudio / 🟡 Áudio Bruto / 🟢 Pronto)
 * - Cortador de Áudio Waveform nativo com Web Audio API
 */

(() => {
  'use strict';

  const STORAGE_KEY = 'fefo_catalog_v3_state';
  const DEFAULT_REPO_URL = '../repository/catalog-v3.json';

  // 8 Eixos Temáticos Oficiais
  const EIXOS_OFICIAIS = [
    { id: "eixo-01", nome: "Rotina & Hábitos", icone: "⏰" },
    { id: "eixo-02", nome: "Autocuidado & Higiene", icone: "🪥" },
    { id: "eixo-03", nome: "Emoções & Autorregulação", icone: "💛" },
    { id: "eixo-04", nome: "Alimentação Saudável", icone: "🍎" },
    { id: "eixo-05", nome: "Socialização & Empatia", icone: "🤝" },
    { id: "eixo-06", nome: "Movimento & Coordenação", icone: "🏃" },
    { id: "eixo-07", nome: "Linguagem & Imaginação", icone: "📚" },
    { id: "eixo-08", nome: "Ciência & Natureza", icone: "🌱" }
  ];

  // Estado Central do Catálogo v3
  let catalogState = {
    schema: 3,
    catalogVersion: "v3.001",
    versionCode: 3001,
    historinhas: []
  };

  let currentStoryIndex = 0;

  // Gerenciador de Contexto de Áudio Web Audio API
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

  // ==========================================================================
  // INICIALIZAÇÃO
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    initEixoSelector();
    await loadCatalogData();
    initTopBarEvents();
    initFooterEvents();
    renderCurrentStory();
  });

  // ==========================================================================
  // CARREGAMENTO & PERSISTÊNCIA (LOCAL-FIRST)
  // ==========================================================================
  async function loadCatalogData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        catalogState = JSON.parse(saved);
      } catch (e) {
        console.warn('Erro ao ler do localStorage, reiniciando semente...');
      }
    }

    if (!catalogState.historinhas || catalogState.historinhas.length === 0) {
      try {
        const resp = await fetch(DEFAULT_REPO_URL);
        if (resp.ok) {
          const raw = await resp.json();
          catalogState.catalogVersion = raw.catalogVersion || "v3.001";
          catalogState.historinhas = convertLegacyCatalogToHistorinhas(raw);
        }
      } catch (e) {
        console.info('Repositório local não alcançado, criando semente...');
      }
    }

    if (!catalogState.historinhas || catalogState.historinhas.length === 0) {
      catalogState.historinhas = [createDefaultStory(1)];
    }

    saveState(false);
  }

  function saveState(notify = true) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogState, null, 2));
    if (notify) {
      showToast('Alterações salvas com sucesso no navegador!', 'success');
    }
  }

  function convertLegacyCatalogToHistorinhas(raw) {
    if (!raw.temas || raw.temas.length === 0) return [createDefaultStory(1)];
    return raw.temas.map((t, idx) => ({
      id: `hist_${idx + 1}`,
      codigo: t.codigo || `t01.${String(idx + 1).padStart(2, '0')}`,
      titulo: t.titulo || `Historinha ${idx + 1}`,
      eixoId: t.eixoId || "eixo-03",
      licencas: { home: true, escola: true, clinica: true, premium: true },
      contos: [
        {
          id: `conto_1`,
          nomeApp: "A VINDA",
          arquivoPet: "A0001.WAV",
          arquivoPetManual: false,
          audioUrl: t.materiais?.historiaAudio?.url || "",
          roteiro: "Olá amiguinho! O FEFO chegou para viver muitas aventuras com você na Terra!",
          trimmer: { inicio: 0.50, fim: 51.37, fadeIn: 0.2, fadeOut: 0.2, duracao: 50.87 },
          status: "ready",
          cardVinculado: {
            nome: "CARD FEFO CHEGOU",
            comandoPet: "CARD0001",
            imagemUrl: ""
          }
        }
      ],
      trecks: [
        {
          id: `trk_1`,
          nomeAcao: t.interacoesFefo?.treckTreck?.titulo || "Alongamento da Manhã",
          arquivoPet: "TRK0001.WAV",
          duracaoSegundos: 90,
          instrucao: "Gire a catraca do robô acompanhando o som rítmico...",
          status: "ready"
        }
      ],
      musicas: [
        {
          id: `mus_1`,
          titulo: "Canção de Ninar do FEFO",
          arquivoPet: "M0001.WAV",
          status: "ready"
        }
      ],
      desafios: [
        {
          id: `des_1`,
          tipo: "card_rfid",
          titulo: "Onde está o Card do Amiguinho?",
          cardEsperado: "CARD0001",
          audioPergunta: "A0002.WAV"
        }
      ],
      livrinhos: [
        {
          id: `livro_1`,
          nome: "AVENTURAS DO FEFO",
          pdfUrl: t.materiais?.livrinhoPdf?.url || "",
          capaUrl: ""
        }
      ],
      bobies: [
        {
          id: `bobie_1`,
          nome: "AVENTURAS DO FEFO - COLORIR",
          pdfUrl: "",
          capaUrl: ""
        }
      ]
    }));
  }

  function createDefaultStory(num) {
    return {
      id: `hist_${Date.now()}`,
      codigo: `t01.${String(num).padStart(2, '0')}`,
      titulo: `Historinha ${num} - O fefo vindo para terra`,
      eixoId: "eixo-03",
      licencas: { home: true, escola: true, clinica: true, premium: true },
      contos: [
        {
          id: `conto_1`,
          nomeApp: "A VINDA",
          arquivoPet: "A0001.WAV",
          arquivoPetManual: false,
          audioUrl: "",
          roteiro: "Digite ou edite aqui o roteiro falado pelo FEFO para este áudio...",
          trimmer: { inicio: 0.50, fim: 51.37, fadeIn: 0.2, fadeOut: 0.2, duracao: 50.87 },
          status: "raw",
          cardVinculado: {
            nome: "CARD 001",
            comandoPet: "CARD0001",
            imagemUrl: ""
          }
        }
      ],
      trecks: [],
      musicas: [],
      desafios: [],
      livrinhos: [
        {
          id: `livro_1`,
          nome: "AVENTURAS DO FEFO",
          pdfUrl: "",
          capaUrl: ""
        }
      ],
      bobies: [
        {
          id: `bobie_1`,
          nome: "AVENTURAS DO FEFO - COLORIR",
          pdfUrl: "",
          capaUrl: ""
        }
      ]
    };
  }

  // ==========================================================================
  // CONFIGURAÇÃO DOS EIXOS & TOP-BAR
  // ==========================================================================
  function initEixoSelector() {
    const sel = document.getElementById('eixo-selector');
    sel.innerHTML = '';
    EIXOS_OFICIAIS.forEach(eixo => {
      const opt = document.createElement('option');
      opt.value = eixo.id;
      opt.textContent = `${eixo.icone} ${eixo.nome}`;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', () => {
      const story = getCurrentStory();
      story.eixoId = sel.value;
      saveState(false);
      updateStorySelectorDisplay();
    });
  }

  function initTopBarEvents() {
    document.getElementById('select-historinha').addEventListener('change', (e) => {
      currentStoryIndex = parseInt(e.target.value, 10) || 0;
      renderCurrentStory();
    });

    document.getElementById('btn-nova-historinha').addEventListener('click', () => {
      const newNum = catalogState.historinhas.length + 1;
      const newStory = createDefaultStory(newNum);
      catalogState.historinhas.push(newStory);
      currentStoryIndex = catalogState.historinhas.length - 1;
      saveState(false);
      renderCurrentStory();
      showToast(`Nova Historinha ${newNum} criada!`, 'success');
    });

    const fileInput = document.getElementById('input-import-json');
    document.getElementById('btn-import-catalog').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (parsed.historinhas && Array.isArray(parsed.historinhas)) {
            catalogState = parsed;
          } else if (parsed.temas) {
            catalogState.historinhas = convertLegacyCatalogToHistorinhas(parsed);
          }
          currentStoryIndex = 0;
          saveState(false);
          renderCurrentStory();
          showToast(`Catálogo ${file.name} importado com sucesso!`, 'success');
        } catch (err) {
          showToast('Erro ao importar JSON. Verifique a sintaxe.', 'error');
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });

    document.getElementById('btn-export-catalog').addEventListener('click', exportCatalogJson);
  }

  function initFooterEvents() {
    document.getElementById('btn-salvar-tema').addEventListener('click', () => {
      syncCurrentStoryFromInputs();
      saveState(true);
    });

    document.getElementById('btn-publicar-tema').addEventListener('click', () => {
      syncCurrentStoryFromInputs();
      // Incrementar versão global
      let cur = catalogState.catalogVersion || 'v3.001';
      const m = cur.match(/^v(\d+)\.(\d+)$/);
      if (m) {
        const major = parseInt(m[1], 10);
        const minor = parseInt(m[2], 10) + 1;
        catalogState.catalogVersion = `v${major}.${String(minor).padStart(3, '0')}`;
        catalogState.versionCode = (major * 1000) + minor;
      }
      saveState(false);
      exportCatalogJson();
      document.getElementById('global-version-display').textContent = catalogState.catalogVersion;
      showToast(`Historinha publicada! Versão atualizada para ${catalogState.catalogVersion}`, 'success');
    });

    document.getElementById('btn-excluir-tema').addEventListener('click', () => {
      if (catalogState.historinhas.length <= 1) {
        showToast('Não é possível excluir a única historinha do catálogo!', 'warning');
        return;
      }
      const story = getCurrentStory();
      if (confirm(`Tem certeza de que deseja excluir "${story.titulo}"?`)) {
        catalogState.historinhas.splice(currentStoryIndex, 1);
        currentStoryIndex = Math.max(0, currentStoryIndex - 1);
        saveState(false);
        renderCurrentStory();
        showToast('Historinha removida.', 'info');
      }
    });

    // Seção de botões de adicionar
    document.getElementById('btn-add-conto').addEventListener('click', addNewConto);
    document.getElementById('btn-add-treck').addEventListener('click', addNewTreck);
    document.getElementById('btn-add-musica').addEventListener('click', addNewMusica);
    document.getElementById('btn-add-desafio').addEventListener('click', addNewDesafio);
    document.getElementById('btn-add-livrinho').addEventListener('click', addNewLivrinho);
    document.getElementById('btn-add-bobie').addEventListener('click', addNewBobie);

    // Edição do título no topo
    const titleInput = document.getElementById('story-title-input');
    titleInput.addEventListener('input', () => {
      getCurrentStory().titulo = titleInput.value;
      updateStorySelectorDisplay();
    });

    // Licenças
    ['home', 'escola', 'clinica', 'premium'].forEach(lic => {
      document.getElementById(`lic-${lic}`).addEventListener('change', (e) => {
        getCurrentStory().licencas[lic] = e.target.checked;
        saveState(false);
      });
    });
  }

  function getCurrentStory() {
    if (!catalogState.historinhas[currentStoryIndex]) {
      currentStoryIndex = 0;
    }
    return catalogState.historinhas[currentStoryIndex];
  }

  function updateStorySelectorDisplay() {
    const sel = document.getElementById('select-historinha');
    sel.innerHTML = '';
    catalogState.historinhas.forEach((h, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${h.codigo || 't01.' + (idx+1)}: ${h.titulo}`;
      if (idx === currentStoryIndex) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  // ==========================================================================
  // RENDERIZAÇÃO DA HISTORINHA ATUAL (FIEL AO MOCKUP)
  // ==========================================================================
  function renderCurrentStory() {
    const story = getCurrentStory();

    // 1. Topo: Título, Eixo e Licenças
    document.getElementById('story-title-input').value = story.titulo || '';
    document.getElementById('eixo-selector').value = story.eixoId || 'eixo-03';
    document.getElementById('global-version-display').textContent = catalogState.catalogVersion || 'v3.001';

    story.licencas = story.licencas || { home: true, escola: true, clinica: true, premium: true };
    document.getElementById('lic-home').checked = !!story.licencas.home;
    document.getElementById('lic-escola').checked = !!story.licencas.escola;
    document.getElementById('lic-clinica').checked = !!story.licencas.clinica;
    document.getElementById('lic-premium').checked = !!story.licencas.premium;

    updateStorySelectorDisplay();

    // 2. Renderizar Contos
    renderContosSection(story);

    // 3. Renderizar Treck-Treck
    renderTrecksSection(story);

    // 4. Renderizar Músicas
    renderMusicasSection(story);

    // 5. Renderizar Desafios
    renderDesafiosSection(story);

    // 6. Renderizar Livrinhos
    renderLivrinhosSection(story);

    // 7. Renderizar Bobie Gods
    renderBobiesSection(story);
  }

  // ==========================================================================
  // SEÇÃO 1: CONTOS (WAVEFORM + ROTEIRO + CARD VINCULADO)
  // ==========================================================================
  function renderContosSection(story) {
    const container = document.getElementById('contos-container');
    container.innerHTML = '';

    (story.contos || []).forEach((conto, idx) => {
      const card = document.createElement('div');
      card.className = 'accordion-item-card expanded';
      card.id = `card-conto-${idx}`;

      const status = getContoStatus(conto);
      const contoNum = idx + 1;

      card.innerHTML = `
        <!-- Cabeçalho Sanfonado com Semáforo -->
        <div class="accordion-header" data-action="toggle-accordion" data-target="card-conto-${idx}">
          <div class="accordion-title-group">
            <span class="accordion-title">CONTO ${String(contoNum).padStart(2, '0')} - ${escapeHtml(conto.nomeApp || 'EXEMPLO')}</span>
            <span class="status-badge-traffic ${status.cls}">${status.icon} ${status.label}</span>
          </div>
          <span class="accordion-toggle-arrow">▲</span>
        </div>

        <div class="accordion-body">
          <!-- Faixa Vertical Amarela -->
          <div class="side-vertical-badge">
            CONTO ${contoNum}
          </div>

          <div class="accordion-content-inner">
            
            <!-- Linha 1: Nome no APP + Selecionar Áudio -->
            <div class="field-row-horizontal">
              <label class="field-label-inline">Nome no APP</label>
              <input type="text" class="field-input-clean" value="${escapeHtml(conto.nomeApp || '')}" placeholder="Nome do conto..." data-idx="${idx}" data-field="nomeApp">
              <button type="button" class="btn-mockup-mustard" data-idx="${idx}" data-action="upload-audio-conto">Selecionar Áudio</button>
            </div>

            <!-- Linha 2: Player de Áudio Nativo -->
            <audio controls class="native-audio-player" id="player-conto-${idx}" src="${conto.audioUrl || ''}">
              Seu navegador não suporta reprodução de áudio.
            </audio>

            <!-- Linha 3: Arquivo no PET + Numeração Livre -->
            <div class="field-row-horizontal">
              <label class="field-label-inline">Arquivo no PET</label>
              <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(conto.arquivoPet || getNextAudioFileName(idx))}" placeholder="A0001.WAV" data-idx="${idx}" data-field="arquivoPet" ${conto.arquivoPetManual ? '' : 'readonly'}>
              <button type="button" class="btn-mockup-mustard" data-idx="${idx}" data-action="toggle-manual-number" title="Alternar entre numeração automática e edição livre">
                ${conto.arquivoPetManual ? 'Travar Auto' : 'numeração livre'}
              </button>
            </div>

            <!-- Linha 4: Roteiro do Áudio + Gerar Voz IA (ElevenLabs / F5-TTS) -->
            <div class="sub-accordion-box">
              <div class="sub-accordion-header">
                <span class="sub-header-title">Roteiro do Áudio ▲</span>
                <button type="button" class="btn-mockup-mustard" data-idx="${idx}" data-action="gerar-voz-ia">
                  🎙️ Gerar Voz do FEFO (IA)
                </button>
              </div>
              <textarea class="textarea-roteiro" placeholder="Digite ou edite aqui o roteiro falado pelo FEFO para este áudio..." data-idx="${idx}" data-field="roteiro">${escapeHtml(conto.roteiro || '')}</textarea>
            </div>

            <!-- Linha 5: Ajusta/Cortar com Waveform Neon -->
            <div class="sub-accordion-box">
              <div class="sub-header-title" style="margin-bottom: 0.65rem;">Ajusta/Cortar ▲</div>
              <div class="waveform-tool-box">
                <div class="waveform-canvas-container">
                  <canvas id="canvas-conto-${idx}" class="waveform-canvas"></canvas>
                </div>
                <div class="trimmer-controls-row">
                  <div class="trimmer-param-chip">Fade In: <span class="val" id="val-fadein-${idx}">${(conto.trimmer?.fadeIn || 0.2).toFixed(2)}s</span></div>
                  <div class="trimmer-param-chip">Início: <input type="number" step="0.05" value="${(conto.trimmer?.inicio || 0).toFixed(2)}" data-idx="${idx}" data-trim="inicio" id="input-inicio-${idx}"></div>
                  <div class="trimmer-param-chip">Fim: <input type="number" step="0.05" value="${(conto.trimmer?.fim || 10).toFixed(2)}" data-idx="${idx}" data-trim="fim" id="input-fim-${idx}"></div>
                  <div class="trimmer-param-chip">Fade Out: <span class="val" id="val-fadeout-${idx}">${(conto.trimmer?.fadeOut || 0.2).toFixed(2)}s</span></div>
                  <div class="trimmer-param-chip">Duração: <span class="val" id="val-duracao-${idx}">${(conto.trimmer?.duracao || 10).toFixed(2)}s</span></div>
                </div>
                <div class="trimmer-buttons-row">
                  <button type="button" class="btn-trim-secondary" data-idx="${idx}" data-action="ouvir-trecho">▶ Ouvir Trecho</button>
                  <button type="button" class="btn-trim-secondary" data-idx="${idx}" data-action="redefinir-corte">Redefinir Tudo</button>
                  <button type="button" class="btn-trim-secondary" data-idx="${idx}" data-action="baixar-mp3">Baixar MP3</button>
                  <button type="button" class="btn-trim-apply" data-idx="${idx}" data-action="aplicar-corte">Aplicar Corte</button>
                </div>
              </div>
            </div>

            <!-- Linha 6: CARD Vinculado -->
            <div class="sub-accordion-box">
              <div class="sub-header-title" style="margin-bottom: 0.65rem;">CARD Vinculado ▲</div>
              <div class="card-linked-box">
                <div class="card-preview-thumbnail">
                  ${conto.cardVinculado?.imagemUrl 
                    ? `<img src="${conto.cardVinculado.imagemUrl}" alt="Preview do Card">` 
                    : `<span class="card-preview-placeholder">🎴</span>`
                  }
                </div>
                <div class="card-fields-col">
                  <div class="field-row-horizontal">
                    <label class="field-label-inline">Nome no Catálogo</label>
                    <input type="text" class="field-input-clean" value="${escapeHtml(conto.cardVinculado?.nome || '')}" placeholder="CARD XXXX" data-idx="${idx}" data-field="card-nome">
                    <button type="button" class="btn-mockup-mustard" data-idx="${idx}" data-action="upload-img-card">Selecionar Card PNG ou JPEG</button>
                  </div>
                  <div class="field-row-horizontal">
                    <label class="field-label-inline">Comando no Pet</label>
                    <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(conto.cardVinculado?.comandoPet || `CARD${String(idx+1).padStart(4, '0')}`)}" placeholder="CARD0001" data-idx="${idx}" data-field="card-comando">
                  </div>
                </div>
              </div>
            </div>

            <!-- Ações: Botão Confirmar Verde e Lixeira Vermelha -->
            <div class="item-actions-corner">
              <button type="button" class="btn-action-circle check" data-idx="${idx}" data-action="save-conto-item" title="Confirmar Conto">✔</button>
              <button type="button" class="btn-action-circle delete" data-idx="${idx}" data-action="delete-conto-item" title="Excluir Conto">🗑</button>
            </div>

          </div>
        </div>
      `;

      container.appendChild(card);
      initContoEvents(card, idx, conto);
      drawWaveform(document.getElementById(`canvas-conto-${idx}`), conto.audioBuffer);
    });
  }

  function getContoStatus(conto) {
    if (!conto.audioUrl && !conto.audioBuffer) {
      return { cls: 'empty', icon: '🔴', label: 'Sem Áudio' };
    }
    if (conto.status === 'ready') {
      return { cls: 'ready', icon: '🟢', label: 'Pronto' };
    }
    return { cls: 'raw', icon: '🟡', label: 'Áudio Bruto' };
  }

  function getNextAudioFileName(idx) {
    return `A${String(idx + 1).padStart(4, '0')}.WAV`;
  }

  function initContoEvents(card, idx, conto) {
    // Acordeão
    card.querySelector('[data-action="toggle-accordion"]').addEventListener('click', () => {
      card.classList.toggle('expanded');
      card.classList.toggle('collapsed');
    });

    // Inputs de texto
    card.querySelectorAll('input[data-field], textarea[data-field]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const f = e.target.getAttribute('data-field');
        if (f === 'card-nome') conto.cardVinculado.nome = e.target.value;
        else if (f === 'card-comando') conto.cardVinculado.comandoPet = e.target.value;
        else conto[f] = e.target.value;
      });
    });

    // Numeração livre
    card.querySelector('[data-action="toggle-manual-number"]').addEventListener('click', () => {
      conto.arquivoPetManual = !conto.arquivoPetManual;
      renderContosSection(getCurrentStory());
    });

    // Upload de Áudio
    card.querySelector('[data-action="upload-audio-conto"]').addEventListener('click', () => {
      promptFileUpload('audio/*', async (file, dataUrl) => {
        conto.audioUrl = dataUrl;
        conto.status = 'raw';
        const ctx = getAudioContext();
        try {
          const ab = await file.arrayBuffer();
          conto.audioBuffer = await ctx.decodeAudioData(ab);
          conto.trimmer = {
            inicio: 0,
            fim: conto.audioBuffer.duration,
            fadeIn: 0.1,
            fadeOut: 0.1,
            duracao: conto.audioBuffer.duration
          };
        } catch (e) {
          console.warn('Erro ao decodificar áudio:', e);
        }
        renderContosSection(getCurrentStory());
        showToast(`Áudio do Conto ${idx + 1} carregado!`, 'success');
      });
    });

    // Upload de Imagem do Card
    card.querySelector('[data-action="upload-img-card"]').addEventListener('click', () => {
      promptFileUpload('image/png,image/jpeg', (file, dataUrl) => {
        if (!conto.cardVinculado) conto.cardVinculado = {};
        conto.cardVinculado.imagemUrl = dataUrl;
        renderContosSection(getCurrentStory());
        showToast('Card vinculado atualizado com sucesso!', 'success');
      });
    });

    // Gerar Voz IA
    card.querySelector('[data-action="gerar-voz-ia"]').addEventListener('click', () => {
      showToast('API da ElevenLabs sendo configurada para síntese direta!', 'info');
    });

    // Controles Trimmer
    card.querySelector('[data-action="aplicar-corte"]').addEventListener('click', () => {
      conto.status = 'ready';
      renderContosSection(getCurrentStory());
      showToast('Corte de áudio aplicado com sucesso! (Status: Pronto 🟢)', 'success');
    });

    card.querySelector('[data-action="ouvir-trecho"]').addEventListener('click', () => {
      playContoTrimmed(conto);
    });

    card.querySelector('[data-action="redefinir-corte"]').addEventListener('click', () => {
      if (conto.audioBuffer) {
        conto.trimmer.inicio = 0;
        conto.trimmer.fim = conto.audioBuffer.duration;
        conto.trimmer.duracao = conto.audioBuffer.duration;
      }
      renderContosSection(getCurrentStory());
    });

    card.querySelector('[data-action="save-conto-item"]').addEventListener('click', () => {
      saveState(true);
    });

    card.querySelector('[data-action="delete-conto-item"]').addEventListener('click', () => {
      if (confirm(`Remover Conto ${idx + 1}?`)) {
        getCurrentStory().contos.splice(idx, 1);
        renderContosSection(getCurrentStory());
      }
    });
  }

  function playContoTrimmed(conto) {
    const player = document.getElementById(`player-conto-${getCurrentStory().contos.indexOf(conto)}`);
    if (!player) return;
    const start = conto.trimmer?.inicio || 0;
    const end = conto.trimmer?.fim || player.duration || 10;
    player.currentTime = start;
    player.play();
    const checkStop = () => {
      if (player.currentTime >= end) {
        player.pause();
        player.removeEventListener('timeupdate', checkStop);
      }
    };
    player.addEventListener('timeupdate', checkStop);
  }

  function addNewConto() {
    const story = getCurrentStory();
    if (!story.contos) story.contos = [];
    const num = story.contos.length + 1;
    story.contos.push({
      id: `conto_${Date.now()}`,
      nomeApp: `PARTE ${num}`,
      arquivoPet: getNextAudioFileName(num - 1),
      arquivoPetManual: false,
      audioUrl: "",
      roteiro: "",
      trimmer: { inicio: 0, fim: 30, fadeIn: 0.2, fadeOut: 0.2, duracao: 30 },
      status: "empty",
      cardVinculado: {
        nome: `CARD ${String(num).padStart(3, '0')}`,
        comandoPet: `CARD${String(num).padStart(4, '0')}`,
        imagemUrl: ""
      }
    });
    renderContosSection(story);
    showToast(`Conto ${num} adicionado!`, 'success');
  }

  // ==========================================================================
  // SEÇÃO 2: TRECK-TRECK (PADRONIZADA)
  // ==========================================================================
  function renderTrecksSection(story) {
    const container = document.getElementById('trecks-container');
    container.innerHTML = '';

    (story.trecks || []).forEach((trk, idx) => {
      const card = document.createElement('div');
      card.className = 'accordion-item-card expanded';
      card.id = `card-treck-${idx}`;

      card.innerHTML = `
        <div class="accordion-header" data-action="toggle-accordion" data-target="card-treck-${idx}">
          <div class="accordion-title-group">
            <span class="accordion-title">TRECK-TRECK ${idx + 1} - ${escapeHtml(trk.nomeAcao || 'AÇÃO MECÂNICA')}</span>
            <span class="status-badge-traffic ${trk.audioUrl ? 'ready' : 'empty'}">${trk.audioUrl ? '🟢 Configurado' : '🔴 Sem Áudio'}</span>
          </div>
          <span class="accordion-toggle-arrow">▲</span>
        </div>

        <div class="accordion-body">
          <div class="side-vertical-badge" style="background-color: #ECFDF5; color: #059669; border-color: #A7F3D0;">
            TRECK ${idx + 1}
          </div>
          <div class="accordion-content-inner">
            <div class="field-row-horizontal">
              <label class="field-label-inline">Nome da Ação</label>
              <input type="text" class="field-input-clean" value="${escapeHtml(trk.nomeAcao || '')}" placeholder="Alongamento do Bichinho..." data-idx="${idx}" data-treck-field="nomeAcao">
              <button type="button" class="btn-mockup-mustard" data-idx="${idx}" data-action="upload-treck-audio">Selecionar Áudio</button>
            </div>
            <div class="field-row-horizontal">
              <label class="field-label-inline">Arquivo no PET</label>
              <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(trk.arquivoPet || `TRK${String(idx+1).padStart(4, '0')}.WAV`)}" data-idx="${idx}" data-treck-field="arquivoPet">
              <label class="field-label-inline">Duração (seg)</label>
              <input type="number" class="field-input-clean" style="max-width: 90px;" value="${trk.duracaoSegundos || 90}" data-idx="${idx}" data-treck-field="duracaoSegundos">
            </div>
            <div class="sub-accordion-box">
              <span class="sub-header-title">Instrução Mecânica e Tátil do Robô</span>
              <textarea class="textarea-roteiro" placeholder="Descreva a atividade física e o movimento esperado da engrenagem do FEFO..." data-idx="${idx}" data-treck-field="instrucao">${escapeHtml(trk.instrucao || '')}</textarea>
            </div>
            <div class="item-actions-corner">
              <button type="button" class="btn-action-circle delete" data-idx="${idx}" data-action="delete-treck-item">🗑</button>
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);
      initTreckEvents(card, idx, trk);
    });
  }

  function initTreckEvents(card, idx, trk) {
    card.querySelector('[data-action="toggle-accordion"]').addEventListener('click', () => {
      card.classList.toggle('expanded');
      card.classList.toggle('collapsed');
    });
    card.querySelectorAll('[data-treck-field]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        trk[e.target.getAttribute('data-treck-field')] = e.target.value;
      });
    });
    card.querySelector('[data-action="upload-treck-audio"]').addEventListener('click', () => {
      promptFileUpload('audio/*', (f, dataUrl) => {
        trk.audioUrl = dataUrl;
        renderTrecksSection(getCurrentStory());
        showToast('Áudio do Treck-Treck adicionado!', 'success');
      });
    });
    card.querySelector('[data-action="delete-treck-item"]').addEventListener('click', () => {
      getCurrentStory().trecks.splice(idx, 1);
      renderTrecksSection(getCurrentStory());
    });
  }

  function addNewTreck() {
    const story = getCurrentStory();
    if (!story.trecks) story.trecks = [];
    story.trecks.push({
      id: `trk_${Date.now()}`,
      nomeAcao: "Nova Ação Mecânica",
      arquivoPet: `TRK${String(story.trecks.length + 1).padStart(4, '0')}.WAV`,
      duracaoSegundos: 90,
      instrucao: ""
    });
    renderTrecksSection(story);
  }

  // ==========================================================================
  // SEÇÃO 3: MÚSICAS & MINDFULNESS
  // ==========================================================================
  function renderMusicasSection(story) {
    const container = document.getElementById('musicas-container');
    container.innerHTML = '';

    (story.musicas || []).forEach((m, idx) => {
      const card = document.createElement('div');
      card.className = 'accordion-item-card expanded';
      card.id = `card-musica-${idx}`;

      card.innerHTML = `
        <div class="accordion-header" data-action="toggle-accordion" data-target="card-musica-${idx}">
          <div class="accordion-title-group">
            <span class="accordion-title">MÚSICA ${idx + 1} - ${escapeHtml(m.titulo || 'FAIXA')}</span>
            <span class="status-badge-traffic ${m.audioUrl ? 'ready' : 'empty'}">${m.audioUrl ? '🟢 Pronta' : '🔴 Sem Áudio'}</span>
          </div>
          <span class="accordion-toggle-arrow">▲</span>
        </div>
        <div class="accordion-body">
          <div class="side-vertical-badge" style="background-color: #EFF6FF; color: #2563EB; border-color: #BFDBFE;">
            MÚSICA ${idx + 1}
          </div>
          <div class="accordion-content-inner">
            <div class="field-row-horizontal">
              <label class="field-label-inline">Título da Música</label>
              <input type="text" class="field-input-clean" value="${escapeHtml(m.titulo || '')}" placeholder="Nome da música..." data-idx="${idx}" data-mus-field="titulo">
              <button type="button" class="btn-mockup-mustard" data-idx="${idx}" data-action="upload-musica-audio">Selecionar Áudio</button>
            </div>
            <div class="field-row-horizontal">
              <label class="field-label-inline">Arquivo no PET</label>
              <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(m.arquivoPet || `M${String(idx+1).padStart(4, '0')}.WAV`)}" data-idx="${idx}" data-mus-field="arquivoPet">
            </div>
            <div class="item-actions-corner">
              <button type="button" class="btn-action-circle delete" data-idx="${idx}" data-action="delete-musica-item">🗑</button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
      initMusicaEvents(card, idx, m);
    });
  }

  function initMusicaEvents(card, idx, m) {
    card.querySelector('[data-action="toggle-accordion"]').addEventListener('click', () => {
      card.classList.toggle('expanded');
      card.classList.toggle('collapsed');
    });
    card.querySelectorAll('[data-mus-field]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        m[e.target.getAttribute('data-mus-field')] = e.target.value;
      });
    });
    card.querySelector('[data-action="upload-musica-audio"]').addEventListener('click', () => {
      promptFileUpload('audio/*', (f, dataUrl) => {
        m.audioUrl = dataUrl;
        renderMusicasSection(getCurrentStory());
        showToast('Áudio da Música carregado!', 'success');
      });
    });
    card.querySelector('[data-action="delete-musica-item"]').addEventListener('click', () => {
      getCurrentStory().musicas.splice(idx, 1);
      renderMusicasSection(getCurrentStory());
    });
  }

  function addNewMusica() {
    const story = getCurrentStory();
    if (!story.musicas) story.musicas = [];
    story.musicas.push({
      id: `mus_${Date.now()}`,
      titulo: "Nova Canção Divertida",
      arquivoPet: `M${String(story.musicas.length + 1).padStart(4, '0')}.WAV`
    });
    renderMusicasSection(story);
  }

  // ==========================================================================
  // SEÇÃO 4: DESAFIOS & ATIVIDADES INTERATIVAS
  // ==========================================================================
  function renderDesafiosSection(story) {
    const container = document.getElementById('desafios-container');
    container.innerHTML = '';

    (story.desafios || []).forEach((des, idx) => {
      const card = document.createElement('div');
      card.className = 'accordion-item-card expanded';
      card.id = `card-desafio-${idx}`;

      card.innerHTML = `
        <div class="accordion-header" data-action="toggle-accordion" data-target="card-desafio-${idx}">
          <div class="accordion-title-group">
            <span class="accordion-title">DESAFIO ${idx + 1} - ${escapeHtml(des.titulo || 'MISSÃO')}</span>
            <span class="status-badge-traffic ready">🟢 Interativo</span>
          </div>
          <span class="accordion-toggle-arrow">▲</span>
        </div>
        <div class="accordion-body">
          <div class="side-vertical-badge" style="background-color: #FAF5FF; color: #7C3AED; border-color: #E9D5FF;">
            DESAFIO ${idx + 1}
          </div>
          <div class="accordion-content-inner">
            <div class="field-row-horizontal">
              <label class="field-label-inline">Título da Missão</label>
              <input type="text" class="field-input-clean" value="${escapeHtml(des.titulo || '')}" placeholder="Ex: Onde está o Card do Desjejum?" data-idx="${idx}" data-des-field="titulo">
            </div>
            <div class="field-row-horizontal">
              <label class="field-label-inline">Card Esperado</label>
              <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(des.cardEsperado || 'CARD0001')}" placeholder="CARD0001" data-idx="${idx}" data-des-field="cardEsperado">
              <label class="field-label-inline">Áudio Pergunta</label>
              <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(des.audioPergunta || 'A0002.WAV')}" placeholder="A0002.WAV" data-idx="${idx}" data-des-field="audioPergunta">
            </div>
            <div class="item-actions-corner">
              <button type="button" class="btn-action-circle delete" data-idx="${idx}" data-action="delete-desafio-item">🗑</button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
      initDesafioEvents(card, idx, des);
    });
  }

  function initDesafioEvents(card, idx, des) {
    card.querySelector('[data-action="toggle-accordion"]').addEventListener('click', () => {
      card.classList.toggle('expanded');
      card.classList.toggle('collapsed');
    });
    card.querySelectorAll('[data-des-field]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        des[e.target.getAttribute('data-des-field')] = e.target.value;
      });
    });
    card.querySelector('[data-action="delete-desafio-item"]').addEventListener('click', () => {
      getCurrentStory().desafios.splice(idx, 1);
      renderDesafiosSection(getCurrentStory());
    });
  }

  function addNewDesafio() {
    const story = getCurrentStory();
    if (!story.desafios) story.desafios = [];
    story.desafios.push({
      id: `des_${Date.now()}`,
      titulo: "Novo Desafio com Card",
      cardEsperado: "CARD0001",
      audioPergunta: "A0002.WAV"
    });
    renderDesafiosSection(story);
  }

  // ==========================================================================
  // SEÇÃO 5: LIVRINHOS ILUSTRADOS EM PDF
  // ==========================================================================
  function renderLivrinhosSection(story) {
    const container = document.getElementById('livrinhos-container');
    container.innerHTML = '';

    (story.livrinhos || []).forEach((livro, idx) => {
      const card = document.createElement('div');
      card.className = 'accordion-item-card expanded';
      card.id = `card-livro-${idx}`;

      card.innerHTML = `
        <div class="accordion-header" data-action="toggle-accordion" data-target="card-livro-${idx}">
          <div class="accordion-title-group">
            <span class="accordion-title">LIVRINHO ${String(idx + 1).padStart(2, '0')} - ${escapeHtml(livro.nome || 'EXEMPLO')}</span>
            <span class="status-badge-traffic ${livro.pdfUrl ? 'ready' : 'empty'}">${livro.pdfUrl ? '🟢 PDF Pronto' : '🔴 Sem PDF'}</span>
          </div>
          <span class="accordion-toggle-arrow">▲</span>
        </div>
        <div class="accordion-body">
          <div class="pdf-material-card-body" style="width: 100%;">
            <div class="pdf-preview-box">
              ${livro.capaUrl ? `<img src="${livro.capaUrl}" alt="Capa">` : `<span style="font-size: 2.25rem;">📖</span>`}
            </div>
            <div class="pdf-fields-col">
              <div class="field-row-horizontal">
                <label class="field-label-inline">Nome no Catálogo</label>
                <input type="text" class="field-input-clean" value="${escapeHtml(livro.nome || '')}" placeholder="AVENTURAS DO FEFO" data-idx="${idx}" data-livro-field="nome">
                <button type="button" class="btn-mockup-mustard" data-idx="${idx}" data-action="upload-livro-pdf">Selecionar PDF</button>
              </div>
            </div>
            <div class="item-actions-corner">
              <button type="button" class="btn-action-circle check" data-action="save-livro">✔</button>
              <button type="button" class="btn-action-circle delete" data-idx="${idx}" data-action="delete-livro">🗑</button>
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);
      initLivroEvents(card, idx, livro);
    });
  }

  function initLivroEvents(card, idx, livro) {
    card.querySelector('[data-action="toggle-accordion"]').addEventListener('click', () => {
      card.classList.toggle('expanded');
      card.classList.toggle('collapsed');
    });
    card.querySelector('input[data-livro-field="nome"]').addEventListener('input', (e) => {
      livro.nome = e.target.value;
    });
    card.querySelector('[data-action="upload-livro-pdf"]').addEventListener('click', () => {
      promptFileUpload('application/pdf', (file, dataUrl) => {
        livro.pdfUrl = dataUrl;
        livro.nomeArquivo = file.name;
        renderLivrinhosSection(getCurrentStory());
        showToast(`PDF do Livrinho "${file.name}" carregado!`, 'success');
      });
    });
    card.querySelector('[data-action="save-livro"]').addEventListener('click', () => saveState(true));
    card.querySelector('[data-action="delete-livro"]').addEventListener('click', () => {
      getCurrentStory().livrinhos.splice(idx, 1);
      renderLivrinhosSection(getCurrentStory());
    });
  }

  function addNewLivrinho() {
    const story = getCurrentStory();
    if (!story.livrinhos) story.livrinhos = [];
    story.livrinhos.push({
      id: `livro_${Date.now()}`,
      nome: "NOVO LIVRINHO ILUSTRADO",
      pdfUrl: "",
      capaUrl: ""
    });
    renderLivrinhosSection(story);
  }

  // ==========================================================================
  // SEÇÃO 6: BOBIE GODS (PARA COLORIR EM PDF)
  // ==========================================================================
  function renderBobiesSection(story) {
    const container = document.getElementById('bobies-container');
    container.innerHTML = '';

    (story.bobies || []).forEach((bobie, idx) => {
      const card = document.createElement('div');
      card.className = 'accordion-item-card expanded';
      card.id = `card-bobie-${idx}`;

      card.innerHTML = `
        <div class="accordion-header" data-action="toggle-accordion" data-target="card-bobie-${idx}">
          <div class="accordion-title-group">
            <span class="accordion-title">BOBIE GOD ${String(idx + 1).padStart(2, '0')} - ${escapeHtml(bobie.nome || 'EXEMPLO')}</span>
            <span class="status-badge-traffic ${bobie.pdfUrl ? 'ready' : 'empty'}">${bobie.pdfUrl ? '🟢 PDF Pronto' : '🔴 Sem PDF'}</span>
          </div>
          <span class="accordion-toggle-arrow">▲</span>
        </div>
        <div class="accordion-body">
          <div class="pdf-material-card-body" style="width: 100%;">
            <div class="pdf-preview-box">
              ${bobie.capaUrl ? `<img src="${bobie.capaUrl}" alt="Capa">` : `<span style="font-size: 2.25rem;">🎨</span>`}
            </div>
            <div class="pdf-fields-col">
              <div class="field-row-horizontal">
                <label class="field-label-inline">Nome no Catálogo</label>
                <input type="text" class="field-input-clean" value="${escapeHtml(bobie.nome || '')}" placeholder="AVENTURAS DO FEFO - COLORIR" data-idx="${idx}" data-bobie-field="nome">
                <button type="button" class="btn-mockup-mustard" data-idx="${idx}" data-action="upload-bobie-pdf">Selecionar PDF</button>
              </div>
            </div>
            <div class="item-actions-corner">
              <button type="button" class="btn-action-circle check" data-action="save-bobie">✔</button>
              <button type="button" class="btn-action-circle delete" data-idx="${idx}" data-action="delete-bobie">🗑</button>
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);
      initBobieEvents(card, idx, bobie);
    });
  }

  function initBobieEvents(card, idx, bobie) {
    card.querySelector('[data-action="toggle-accordion"]').addEventListener('click', () => {
      card.classList.toggle('expanded');
      card.classList.toggle('collapsed');
    });
    card.querySelector('input[data-bobie-field="nome"]').addEventListener('input', (e) => {
      bobie.nome = e.target.value;
    });
    card.querySelector('[data-action="upload-bobie-pdf"]').addEventListener('click', () => {
      promptFileUpload('application/pdf,image/png,image/jpeg', (file, dataUrl) => {
        bobie.pdfUrl = dataUrl;
        bobie.nomeArquivo = file.name;
        renderBobiesSection(getCurrentStory());
        showToast(`Bobie God "${file.name}" carregado!`, 'success');
      });
    });
    card.querySelector('[data-action="save-bobie"]').addEventListener('click', () => saveState(true));
    card.querySelector('[data-action="delete-bobie"]').addEventListener('click', () => {
      getCurrentStory().bobies.splice(idx, 1);
      renderBobiesSection(getCurrentStory());
    });
  }

  function addNewBobie() {
    const story = getCurrentStory();
    if (!story.bobies) story.bobies = [];
    story.bobies.push({
      id: `bobie_${Date.now()}`,
      nome: "NOVO BOBIE GOD - COLORIR",
      pdfUrl: "",
      capaUrl: ""
    });
    renderBobiesSection(story);
  }

  // ==========================================================================
  // RENDERIZAÇÃO DE WAVEFORM NO CANVAS (VERDE LIMÃO NEON)
  // ==========================================================================
  function drawWaveform(canvas, audioBuffer) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 600;
    const height = canvas.height = canvas.parentElement.clientHeight || 90;

    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#22C55E';

    if (!audioBuffer) {
      // Onda simulada estética quando ainda não carregou áudio
      const bars = Math.floor(width / 4);
      for (let i = 0; i < bars; i++) {
        const h = Math.sin(i * 0.15) * (height * 0.35) + Math.cos(i * 0.05) * (height * 0.25) + 15;
        const x = i * 4;
        const y = (height - h) / 2;
        ctx.fillRect(x, y, 2.5, h);
      }
      return;
    }

    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      const y = (1 + min) * amp;
      const h = Math.max(2, (max - min) * amp);
      ctx.fillRect(i, y, 1.5, h);
    }
  }

  // ==========================================================================
  // UTILITÁRIOS GLOBAIS
  // ==========================================================================
  function syncCurrentStoryFromInputs() {
    const story = getCurrentStory();
    story.titulo = document.getElementById('story-title-input').value.trim();
    story.eixoId = document.getElementById('eixo-selector').value;
  }

  function promptFileUpload(accept, callback) {
    const input = document.getElementById('file-uploader-general');
    input.accept = accept;
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => callback(file, evt.target.result);
      reader.readAsDataURL(file);
      input.value = '';
    };
    input.click();
  }

  function exportCatalogJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(catalogState, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `catalog-v3_${catalogState.catalogVersion || 'latest'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function showToast(msg, type = 'info') {
    const c = document.getElementById('v3-toast-container');
    const t = document.createElement('div');
    t.className = `v3-toast ${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️'}</span> <span>${escapeHtml(msg)}</span>`;
    c.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(15px)';
      t.style.transition = 'all 0.25s ease';
      setTimeout(() => t.remove(), 250);
    }, 3200);
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[c] || c));
  }

})();
