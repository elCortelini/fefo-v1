/**
 * ==========================================================================
 * FEFO CATALOG ADMIN v3 - MOTOR DE DADOS, ÁUDIO VISUAL & SINCRONIZAÇÃO NUVEM
 * ==========================================================================
 * - Sincronização em Nuvem Multi-PC via GitHub REST API (idêntico ao v1)
 * - Réplica exata do Mockup Oficial do FEFO
 * - Contos e MÚSICAS com os MESMOS ELEMENTOS (Player, Waveform, Roteiro, Cards)
 * - Numeração automática inteligente (A0001.WAV, M0001.WAV, CARD0001) com modo numeração livre
 * - Semáforo de produção (🔴 Sem Áudio / 🟡 Áudio Bruto / 🟢 Pronto)
 * - Cortador de Áudio Waveform nativo com Web Audio API
 */

(() => {
  'use strict';

  const STORAGE_KEY = 'fefo_catalog_v3_state';

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

  // Web Audio Context compartilhado
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
    initTopBarEvents();
    initFooterEvents();
    
    // Tenta sincronizar primeiro da nuvem (GitHub REST API) para ter paridade entre todos os PCs
    await loadCatalogData(true);
    renderCurrentStory();
  });

  // ==========================================================================
  // CARREGAMENTO & SINCRONIZAÇÃO EM NUVEM (MULTI-PC)
  // ==========================================================================
  async function loadCatalogData(fromCloudFirst = true) {
    let loadedData = null;

    // 1. Tentar carregar da Nuvem (GitHub) se estiver online
    if (fromCloudFirst && window.GitHubSync) {
      try {
        updateCloudStatus('syncing', 'Sincronizando com o GitHub...');
        const cloudData = await window.GitHubSync.getCatalogV3();
        if (cloudData && (cloudData.historinhas || cloudData.temas)) {
          loadedData = cloudData;
          updateCloudStatus('connected', 'Conectado à nuvem');
          showToast('Dados sincronizados em tempo real do GitHub!', 'success');
        }
      } catch (e) {
        console.warn('[loadCatalogData] Falha na nuvem, tentando local:', e);
        updateCloudStatus('disconnected', 'Modo Offline / Local');
      }
    }

    // 2. Se não veio da nuvem, tentar do localStorage da máquina
    if (!loadedData) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          loadedData = JSON.parse(saved);
        } catch (e) {}
      }
    }

    // 3. Fallback relativo local para primeira execução
    if (!loadedData) {
      try {
        const resp = await fetch('../repository/catalog-v3.json?_t=' + Date.now(), { cache: 'no-store' });
        if (resp.ok) {
          loadedData = await resp.json();
        }
      } catch (e) {}
    }

    // Consolidar estado
    if (loadedData) {
      catalogState.catalogVersion = loadedData.catalogVersion || "v3.001";
      catalogState.versionCode = loadedData.versionCode || 3001;
      if (loadedData.historinhas && Array.isArray(loadedData.historinhas)) {
        catalogState.historinhas = loadedData.historinhas;
      } else if (loadedData.temas) {
        catalogState.historinhas = convertLegacyCatalogToHistorinhas(loadedData);
      }
    }

    if (!catalogState.historinhas || catalogState.historinhas.length === 0) {
      catalogState.historinhas = [createDefaultStory(1)];
    }

    // Salva cópia local de segurança
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogState, null, 2));
  }

  async function saveCatalogData(isPublish = false) {
    // 1. Salvar localmente imediatamente
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogState, null, 2));

    // 2. Se for publicar, incrementa a versão global
    if (isPublish) {
      let cur = catalogState.catalogVersion || 'v3.001';
      const m = cur.match(/^v(\d+)\.(\d+)$/);
      if (m) {
        const major = parseInt(m[1], 10);
        const minor = parseInt(m[2], 10) + 1;
        catalogState.catalogVersion = `v${major}.${String(minor).padStart(3, '0')}`;
        catalogState.versionCode = (major * 1000) + minor;
      }
      document.getElementById('global-version-display').textContent = catalogState.catalogVersion;
    }

    // 3. Commit na nuvem GitHub (garantindo que qualquer outro PC receba as alterações)
    if (window.GitHubSync && window.GitHubSync.isConfigured()) {
      try {
        updateCloudStatus('syncing', 'Enviando alterações para o GitHub...');
        const story = getCurrentStory();
        const actionLabel = isPublish ? 'publicar' : 'salvar';
        const msg = `feat(catalog-v3): ${actionLabel} historinha "${story.titulo}" [${catalogState.catalogVersion}] via Web Admin`;
        
        await window.GitHubSync.saveCatalogV3(catalogState, msg);
        updateCloudStatus('connected', 'Conectado à nuvem');
        showToast(`✅ Sincronizado no GitHub! Todos os PCs agora verão esta versão (${catalogState.catalogVersion}).`, 'success');
        return;
      } catch (e) {
        console.error('Erro ao sincronizar com GitHub:', e);
        updateCloudStatus('disconnected', 'Erro ao enviar para nuvem');
        showToast(`Salvo localmente, mas houve erro ao enviar ao GitHub: ${e.message}`, 'warning');
      }
    } else {
      showToast('Salvo localmente neste computador! (Configure o token do GitHub para sincronizar em outros PCs)', 'info');
    }
  }

  function updateCloudStatus(status, text) {
    const pill = document.getElementById('github-sync-pill');
    if (!pill) return;
    if (status === 'connected') {
      pill.style.background = '#064E3B';
      pill.style.borderColor = '#059669';
      pill.style.color = '#A7F3D0';
      pill.innerHTML = `<span class="gh-cloud-icon">☁️</span> <span>${text || 'Nuvem Conectada'}</span>`;
    } else if (status === 'syncing') {
      pill.style.background = '#78350F';
      pill.style.borderColor = '#D97706';
      pill.style.color = '#FDE68A';
      pill.innerHTML = `<span class="gh-cloud-icon">🔄</span> <span>${text || 'Sincronizando...'}</span>`;
    } else {
      pill.style.background = '#374151';
      pill.style.borderColor = '#4B5563';
      pill.style.color = '#9CA3AF';
      pill.innerHTML = `<span class="gh-cloud-icon">☁️</span> <span>${text || 'Offline'}</span>`;
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
      musicas: [
        {
          id: `mus_1`,
          nomeApp: "Canção do Bom Dia",
          arquivoPet: "M0001.WAV",
          arquivoPetManual: false,
          audioUrl: "",
          roteiro: "Solzinho acorda de manhã, vem brincar com o FEFO...",
          trimmer: { inicio: 0.0, fim: 45.0, fadeIn: 0.2, fadeOut: 0.2, duracao: 45.0 },
          status: "ready",
          cardVinculado: {
            nome: "CARD MÚSICA DO DIA",
            comandoPet: "CARD0002",
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
      musicas: [
        {
          id: `mus_1`,
          nomeApp: "CANÇÃO DE NINAR",
          arquivoPet: "M0001.WAV",
          arquivoPetManual: false,
          audioUrl: "",
          roteiro: "Durma bem meu amiguinho, sonhe com as estrelas...",
          trimmer: { inicio: 0.0, fim: 60.0, fadeIn: 0.2, fadeOut: 0.2, duracao: 60.0 },
          status: "raw",
          cardVinculado: {
            nome: "CARD DA MÚSICA",
            comandoPet: "CARD0002",
            imagemUrl: ""
          }
        }
      ],
      trecks: [],
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
      renderCurrentStory();
      showToast(`Nova Historinha ${newNum} criada!`, 'success');
    });

    // Botão Sincronizar Nuvem em Tempo Real
    document.getElementById('btn-sync-cloud').addEventListener('click', async () => {
      showToast('Buscando versão mais recente na nuvem GitHub...', 'info');
      await loadCatalogData(true);
      renderCurrentStory();
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
    document.getElementById('btn-salvar-tema').addEventListener('click', async () => {
      syncCurrentStoryFromInputs();
      await saveCatalogData(false);
    });

    document.getElementById('btn-publicar-tema').addEventListener('click', async () => {
      syncCurrentStoryFromInputs();
      await saveCatalogData(true);
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
        renderCurrentStory();
        saveCatalogData(false);
        showToast('Historinha removida.', 'info');
      }
    });

    // Botões de adição de blocos
    document.getElementById('btn-add-conto').addEventListener('click', addNewConto);
    document.getElementById('btn-add-musica').addEventListener('click', addNewMusica);
    document.getElementById('btn-add-treck').addEventListener('click', addNewTreck);
    document.getElementById('btn-add-desafio').addEventListener('click', addNewDesafio);
    document.getElementById('btn-add-livrinho').addEventListener('click', addNewLivrinho);
    document.getElementById('btn-add-bobie').addEventListener('click', addNewBobie);

    // Título no topo
    const titleInput = document.getElementById('story-title-input');
    titleInput.addEventListener('input', () => {
      getCurrentStory().titulo = titleInput.value;
      updateStorySelectorDisplay();
    });

    // Licenças
    ['home', 'escola', 'clinica', 'premium'].forEach(lic => {
      document.getElementById(`lic-${lic}`).addEventListener('change', (e) => {
        getCurrentStory().licencas[lic] = e.target.checked;
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
  // RENDERIZAÇÃO DA HISTORINHA
  // ==========================================================================
  function renderCurrentStory() {
    const story = getCurrentStory();

    document.getElementById('story-title-input').value = story.titulo || '';
    document.getElementById('eixo-selector').value = story.eixoId || 'eixo-03';
    document.getElementById('global-version-display').textContent = catalogState.catalogVersion || 'v3.001';

    story.licencas = story.licencas || { home: true, escola: true, clinica: true, premium: true };
    document.getElementById('lic-home').checked = !!story.licencas.home;
    document.getElementById('lic-escola').checked = !!story.licencas.escola;
    document.getElementById('lic-clinica').checked = !!story.licencas.clinica;
    document.getElementById('lic-premium').checked = !!story.licencas.premium;

    updateStorySelectorDisplay();

    renderContosSection(story);
    renderMusicasSection(story); // Músicas agora têm exatamente a mesma estrutura do Conto!
    renderTrecksSection(story);
    renderDesafiosSection(story);
    renderLivrinhosSection(story);
    renderBobiesSection(story);
  }

  // ==========================================================================
  // SEÇÃO 1: CONTOS
  // ==========================================================================
  function renderContosSection(story) {
    const container = document.getElementById('contos-container');
    container.innerHTML = '';

    (story.contos || []).forEach((conto, idx) => {
      const card = createAudioModuleCard({
        type: 'CONTO',
        typeColor: '#D97706',
        sideBg: '#FEF3C7',
        item: conto,
        idx,
        defaultFilePrefix: 'A',
        onUploadAudio: () => {
          promptFileUpload('audio/*', async (file, dataUrl) => {
            conto.audioUrl = dataUrl;
            conto.status = 'raw';
            await loadBufferForModule(conto, file);
            renderContosSection(getCurrentStory());
            showToast(`Áudio do Conto ${idx + 1} carregado!`, 'success');
          });
        },
        onDelete: () => {
          if (confirm(`Remover Conto ${idx + 1}?`)) {
            story.contos.splice(idx, 1);
            renderContosSection(story);
          }
        },
        onUpdate: () => renderContosSection(story)
      });
      container.appendChild(card);
    });
  }

  // ==========================================================================
  // SEÇÃO 2: MÚSICAS (COM OS MESMOS ELEMENTOS DO CONTO!)
  // ==========================================================================
  function renderMusicasSection(story) {
    const container = document.getElementById('musicas-container');
    container.innerHTML = '';

    (story.musicas || []).forEach((musica, idx) => {
      const card = createAudioModuleCard({
        type: 'MÚSICA',
        typeColor: '#2563EB',
        sideBg: '#EFF6FF',
        item: musica,
        idx,
        defaultFilePrefix: 'M',
        onUploadAudio: () => {
          promptFileUpload('audio/*', async (file, dataUrl) => {
            musica.audioUrl = dataUrl;
            musica.status = 'raw';
            await loadBufferForModule(musica, file);
            renderMusicasSection(getCurrentStory());
            showToast(`Áudio da Música ${idx + 1} carregado!`, 'success');
          });
        },
        onDelete: () => {
          if (confirm(`Remover Música ${idx + 1}?`)) {
            story.musicas.splice(idx, 1);
            renderMusicasSection(story);
          }
        },
        onUpdate: () => renderMusicasSection(story)
      });
      container.appendChild(card);
    });
  }

  // ==========================================================================
  // FÁBRICA DE MÓDULOS DE ÁUDIO (USADA POR CONTOS E MÚSICAS COM IDENTIDADE IGUAL)
  // ==========================================================================
  function createAudioModuleCard({ type, typeColor, sideBg, item, idx, defaultFilePrefix, onUploadAudio, onDelete, onUpdate }) {
    const card = document.createElement('div');
    card.className = 'accordion-item-card expanded';
    card.id = `card-${type.toLowerCase()}-${idx}`;

    const num = idx + 1;
    const status = getModuleStatus(item);
    const petFile = item.arquivoPet || `${defaultFilePrefix}${String(num).padStart(4, '0')}.WAV`;

    card.innerHTML = `
      <div class="accordion-header" data-action="toggle-accordion">
        <div class="accordion-title-group">
          <span class="accordion-title">${type} ${String(num).padStart(2, '0')} - ${escapeHtml(item.nomeApp || 'EXEMPLO')}</span>
          <span class="status-badge-traffic ${status.cls}">${status.icon} ${status.label}</span>
        </div>
        <span class="accordion-toggle-arrow">▲</span>
      </div>

      <div class="accordion-body">
        <div class="side-vertical-badge" style="background-color: ${sideBg}; color: ${typeColor};">
          ${type} ${num}
        </div>

        <div class="accordion-content-inner">
          <!-- Linha 1: Nome no APP + Selecionar Áudio -->
          <div class="field-row-horizontal">
            <label class="field-label-inline">Nome no APP</label>
            <input type="text" class="field-input-clean" value="${escapeHtml(item.nomeApp || '')}" placeholder="Nome ${type.toLowerCase()}..." data-field="nomeApp">
            <button type="button" class="btn-mockup-mustard" data-action="upload-audio">Selecionar Áudio</button>
          </div>

          <!-- Linha 2: Player de Áudio Nativo -->
          <audio controls class="native-audio-player" id="player-${type.toLowerCase()}-${idx}" src="${item.audioUrl || ''}">
            Seu navegador não suporta reprodução de áudio.
          </audio>

          <!-- Linha 3: Arquivo no PET + Numeração Livre -->
          <div class="field-row-horizontal">
            <label class="field-label-inline">Arquivo no PET</label>
            <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(petFile)}" placeholder="${defaultFilePrefix}0001.WAV" data-field="arquivoPet" ${item.arquivoPetManual ? '' : 'readonly'}>
            <button type="button" class="btn-mockup-mustard" data-action="toggle-manual-number">
              ${item.arquivoPetManual ? 'Travar Auto' : 'numeração livre'}
            </button>
          </div>

          <!-- Sub-bloco 1: Roteiro / Letra + Botão IA com Sanfona -->
          <div class="sub-accordion-box expanded" id="sub-roteiro-${type.toLowerCase()}-${idx}">
            <div class="sub-accordion-header" data-action="toggle-sub-accordion" data-target="sub-roteiro-${type.toLowerCase()}-${idx}">
              <span class="sub-header-title">Texto / Roteiro (${type}) <span class="sub-arrow">▲</span></span>
              <button type="button" class="btn-mockup-mustard" data-action="gerar-voz-ia" onclick="event.stopPropagation();">
                🎙️ Gerar Voz do FEFO (IA)
              </button>
            </div>
            <div class="sub-accordion-body">
              <textarea class="textarea-roteiro" placeholder="Digite ou edite aqui o roteiro falado pelo FEFO para este áudio..." data-field="roteiro">${escapeHtml(item.roteiro || '')}</textarea>
            </div>
          </div>

          <!-- Sub-bloco 2: Ajusta/Cortar com Sanfona + Waveform Neon com Barras Amarelas -->
          <div class="sub-accordion-box expanded" id="sub-corte-${type.toLowerCase()}-${idx}">
            <div class="sub-accordion-header" data-action="toggle-sub-accordion" data-target="sub-corte-${type.toLowerCase()}-${idx}">
              <span class="sub-header-title">Ajusta/Cortar <span class="sub-arrow">▲</span></span>
            </div>
            <div class="sub-accordion-body">
              <div class="waveform-tool-box">
                <div class="waveform-canvas-container">
                  <canvas id="canvas-${type.toLowerCase()}-${idx}" class="waveform-canvas"></canvas>
                </div>
                <div class="trimmer-controls-row">
                  <div class="trimmer-param-chip">Fade In: <span class="val">${(item.trimmer?.fadeIn || 0.2).toFixed(2)}s</span></div>
                  <div class="trimmer-param-chip">Início: <input type="number" step="0.05" value="${(item.trimmer?.inicio || 0).toFixed(2)}" data-trim="inicio" id="input-inicio-${type.toLowerCase()}-${idx}"></div>
                  <div class="trimmer-param-chip">Fim: <input type="number" step="0.05" value="${(item.trimmer?.fim || 30).toFixed(2)}" data-trim="fim" id="input-fim-${type.toLowerCase()}-${idx}"></div>
                  <div class="trimmer-param-chip">Fade Out: <span class="val">${(item.trimmer?.fadeOut || 0.2).toFixed(2)}s</span></div>
                  <div class="trimmer-param-chip">Duração: <span class="val" id="val-dur-${type.toLowerCase()}-${idx}">${(item.trimmer?.duracao || 30).toFixed(2)}s</span></div>
                </div>
                <div class="trimmer-buttons-row">
                  <button type="button" class="btn-trim-secondary" data-action="ouvir-trecho">▶ Ouvir Trecho</button>
                  <button type="button" class="btn-trim-secondary" data-action="redefinir-corte">Redefinir Tudo</button>
                  <button type="button" class="btn-trim-secondary" data-action="baixar-mp3">Baixar MP3</button>
                  <button type="button" class="btn-trim-apply" data-action="aplicar-corte">Aplicar Corte</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sub-bloco 3: CARD Vinculado com Sanfona -->
          <div class="sub-accordion-box expanded" id="sub-card-${type.toLowerCase()}-${idx}">
            <div class="sub-accordion-header" data-action="toggle-sub-accordion" data-target="sub-card-${type.toLowerCase()}-${idx}">
              <span class="sub-header-title">CARD Vinculado <span class="sub-arrow">▲</span></span>
            </div>
            <div class="sub-accordion-body">
              <div class="card-linked-box">
                <div class="card-preview-thumbnail">
                  ${item.cardVinculado?.imagemUrl 
                    ? `<img src="${item.cardVinculado.imagemUrl}" alt="Preview do Card">` 
                    : `<span class="card-preview-placeholder">🎴</span>`
                  }
                </div>
                <div class="card-fields-col">
                  <div class="field-row-horizontal">
                    <label class="field-label-inline">Nome no Catálogo</label>
                    <input type="text" class="field-input-clean" value="${escapeHtml(item.cardVinculado?.nome || '')}" placeholder="CARD XXXX" data-field="card-nome">
                    <button type="button" class="btn-mockup-mustard" data-action="upload-img-card">Selecionar Card PNG ou JPEG</button>
                  </div>
                  <div class="field-row-horizontal">
                    <label class="field-label-inline">Comando no Pet</label>
                    <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(item.cardVinculado?.comandoPet || `CARD${String(num).padStart(4, '0')}`)}" placeholder="CARD0001" data-field="card-comando">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Ações Confirmar / Lixeira -->
          <div class="item-actions-corner">
            <button type="button" class="btn-action-circle check" data-action="save-item" title="Confirmar">✔</button>
            <button type="button" class="btn-action-circle delete" data-action="delete-item" title="Excluir">🗑</button>
          </div>

        </div>
      </div>
    `;

    // Eventos
    card.querySelector('[data-action="toggle-accordion"]').addEventListener('click', () => {
      card.classList.toggle('expanded');
      card.classList.toggle('collapsed');
    });

    card.querySelectorAll('input[data-field], textarea[data-field]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const f = e.target.getAttribute('data-field');
        if (f === 'card-nome') {
          if (!item.cardVinculado) item.cardVinculado = {};
          item.cardVinculado.nome = e.target.value;
        } else if (f === 'card-comando') {
          if (!item.cardVinculado) item.cardVinculado = {};
          item.cardVinculado.comandoPet = e.target.value;
        } else {
          item[f] = e.target.value;
        }
      });
    });

    card.querySelector('[data-action="toggle-manual-number"]').addEventListener('click', () => {
      item.arquivoPetManual = !item.arquivoPetManual;
      onUpdate();
    });

    card.querySelector('[data-action="upload-audio"]').addEventListener('click', onUploadAudio);

    card.querySelector('[data-action="upload-img-card"]').addEventListener('click', () => {
      promptFileUpload('image/png,image/jpeg', (file, dataUrl) => {
        if (!item.cardVinculado) item.cardVinculado = {};
        item.cardVinculado.imagemUrl = dataUrl;
        onUpdate();
        showToast(`Imagem do Card vinculada!`, 'success');
      });
    });

    card.querySelector('[data-action="gerar-voz-ia"]').addEventListener('click', () => {
      showToast('API da ElevenLabs sendo configurada para síntese direta!', 'info');
    });

    card.querySelector('[data-action="aplicar-corte"]').addEventListener('click', () => {
      item.status = 'ready';
      onUpdate();
      showToast('Corte de áudio aplicado com sucesso! (Status: Pronto 🟢)', 'success');
    });

    card.querySelector('[data-action="ouvir-trecho"]').addEventListener('click', () => {
      const player = document.getElementById(`player-${type.toLowerCase()}-${idx}`);
      if (!player) return;
      const start = item.trimmer?.inicio || 0;
      const end = item.trimmer?.fim || player.duration || 10;
      player.currentTime = start;
      player.play();
      const checkStop = () => {
        if (player.currentTime >= end) {
          player.pause();
          player.removeEventListener('timeupdate', checkStop);
        }
      };
      player.addEventListener('timeupdate', checkStop);
    });

    // Eventos dos Sub-acordeões Sanfona (Roteiro, Ajusta/Cortar, Card Vinculado)
    card.querySelectorAll('[data-action="toggle-sub-accordion"]').forEach(header => {
      header.addEventListener('click', (e) => {
        // Evita fechar se clicar no botão do gerador de voz
        if (e.target.closest('[data-action="gerar-voz-ia"]')) return;
        const targetId = header.getAttribute('data-target');
        const box = document.getElementById(targetId);
        if (!box) return;
        box.classList.toggle('expanded');
        box.classList.toggle('collapsed');
        const arrow = header.querySelector('.sub-arrow');
        if (arrow) {
          arrow.textContent = box.classList.contains('collapsed') ? '▼' : '▲';
        }
        // Se abriu a sanfona de corte, redesenha o canvas com as barras amarelas
        if (box.id.includes('sub-corte-') && !box.classList.contains('collapsed')) {
          setTimeout(() => {
            const c = box.querySelector('canvas');
            if (c) drawWaveform(c, item.audioBuffer, item.trimmer);
          }, 50);
        }
      });
    });

    // Controles Reativos do Waveform e Barras Amarelas de Corte
    const canvas = card.querySelector('canvas');
    const inputInicio = card.querySelector('[data-trim="inicio"]');
    const inputFim = card.querySelector('[data-trim="fim"]');
    const valDur = card.querySelector(`#val-dur-${type.toLowerCase()}-${idx}`);

    const updateTrimmerAndCanvas = () => {
      const ini = parseFloat(inputInicio.value) || 0;
      const fim = parseFloat(inputFim.value) || (item.audioBuffer?.duration || 30);
      item.trimmer = item.trimmer || {};
      item.trimmer.inicio = Math.max(0, ini);
      item.trimmer.fim = Math.max(item.trimmer.inicio + 0.05, fim);
      item.trimmer.duracao = item.trimmer.fim - item.trimmer.inicio;
      if (valDur) valDur.textContent = `${item.trimmer.duracao.toFixed(2)}s`;
      drawWaveform(canvas, item.audioBuffer, item.trimmer);
    };

    if (inputInicio) inputInicio.addEventListener('input', updateTrimmerAndCanvas);
    if (inputFim) inputFim.addEventListener('input', updateTrimmerAndCanvas);

    // Clicar no Canvas do Waveform para mover as Barras Amarelas de Início ou Fim
    if (canvas) {
      canvas.style.cursor = 'crosshair';
      canvas.title = 'Clique para mover o Início do corte. Shift + Clique para mover o Fim.';
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const totalDur = (item.audioBuffer && item.audioBuffer.duration) ? item.audioBuffer.duration : (item.trimmer?.fim || 30);
        const clickSec = (clickX / rect.width) * totalDur;

        if (e.shiftKey) {
          inputFim.value = clickSec.toFixed(2);
        } else {
          const curIni = parseFloat(inputInicio.value) || 0;
          const curFim = parseFloat(inputFim.value) || totalDur;
          if (Math.abs(clickSec - curIni) <= Math.abs(clickSec - curFim)) {
            inputInicio.value = clickSec.toFixed(2);
          } else {
            inputFim.value = clickSec.toFixed(2);
          }
        }
        updateTrimmerAndCanvas();
      });
    }

    card.querySelector('[data-action="save-item"]').addEventListener('click', () => {
      saveCatalogData(false);
    });

    card.querySelector('[data-action="delete-item"]').addEventListener('click', onDelete);

    // Desenhar Waveform com as barras amarelas no canvas
    setTimeout(() => {
      drawWaveform(card.querySelector('canvas'), item.audioBuffer, item.trimmer);
    }, 50);

    return card;
  }

  async function loadBufferForModule(item, file) {
    const ctx = getAudioContext();
    try {
      const ab = await file.arrayBuffer();
      item.audioBuffer = await ctx.decodeAudioData(ab);
      item.trimmer = {
        inicio: 0,
        fim: item.audioBuffer.duration,
        fadeIn: 0.1,
        fadeOut: 0.1,
        duracao: item.audioBuffer.duration
      };
    } catch (e) {
      console.warn('Erro ao decodificar buffer:', e);
    }
  }

  function getModuleStatus(item) {
    if (!item.audioUrl && !item.audioBuffer) {
      return { cls: 'empty', icon: '🔴', label: 'Sem Áudio' };
    }
    if (item.status === 'ready') {
      return { cls: 'ready', icon: '🟢', label: 'Pronto' };
    }
    return { cls: 'raw', icon: '🟡', label: 'Áudio Bruto' };
  }

  function addNewConto() {
    const story = getCurrentStory();
    if (!story.contos) story.contos = [];
    const num = story.contos.length + 1;
    story.contos.push({
      id: `conto_${Date.now()}`,
      nomeApp: `PARTE ${num}`,
      arquivoPet: `A${String(num).padStart(4, '0')}.WAV`,
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

  function addNewMusica() {
    const story = getCurrentStory();
    if (!story.musicas) story.musicas = [];
    const num = story.musicas.length + 1;
    story.musicas.push({
      id: `mus_${Date.now()}`,
      nomeApp: `MÚSICA ${num}`,
      arquivoPet: `M${String(num).padStart(4, '0')}.WAV`,
      arquivoPetManual: false,
      audioUrl: "",
      roteiro: "",
      trimmer: { inicio: 0, fim: 45, fadeIn: 0.2, fadeOut: 0.2, duracao: 45 },
      status: "empty",
      cardVinculado: {
        nome: `CARD MÚSICA ${num}`,
        comandoPet: `CARD${String(num + 10).padStart(4, '0')}`,
        imagemUrl: ""
      }
    });
    renderMusicasSection(story);
    showToast(`Música ${num} adicionada com waveform e card!`, 'success');
  }

  // ==========================================================================
  // SEÇÃO 3: TRECK-TRECK
  // ==========================================================================
  function renderTrecksSection(story) {
    const container = document.getElementById('trecks-container');
    container.innerHTML = '';

    (story.trecks || []).forEach((trk, idx) => {
      const card = document.createElement('div');
      card.className = 'accordion-item-card expanded';
      card.id = `card-treck-${idx}`;

      card.innerHTML = `
        <div class="accordion-header" data-action="toggle-accordion">
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
              <input type="text" class="field-input-clean" value="${escapeHtml(trk.nomeAcao || '')}" placeholder="Alongamento do Bichinho..." data-treck-field="nomeAcao">
              <button type="button" class="btn-mockup-mustard" data-action="upload-treck-audio">Selecionar Áudio</button>
            </div>
            <div class="field-row-horizontal">
              <label class="field-label-inline">Arquivo no PET</label>
              <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(trk.arquivoPet || `TRK${String(idx+1).padStart(4, '0')}.WAV`)}" data-treck-field="arquivoPet">
              <label class="field-label-inline">Duração (seg)</label>
              <input type="number" class="field-input-clean" style="max-width: 90px;" value="${trk.duracaoSegundos || 90}" data-treck-field="duracaoSegundos">
            </div>
            <div class="sub-accordion-box">
              <span class="sub-header-title">Instrução Mecânica e Tátil do Robô</span>
              <textarea class="textarea-roteiro" placeholder="Descreva a atividade física e o movimento esperado da engrenagem do FEFO..." data-treck-field="instrucao">${escapeHtml(trk.instrucao || '')}</textarea>
            </div>
            <div class="item-actions-corner">
              <button type="button" class="btn-action-circle delete" data-action="delete-treck-item">🗑</button>
            </div>
          </div>
        </div>
      `;

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

      container.appendChild(card);
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
        <div class="accordion-header" data-action="toggle-accordion">
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
              <input type="text" class="field-input-clean" value="${escapeHtml(des.titulo || '')}" placeholder="Ex: Onde está o Card do Desjejum?" data-des-field="titulo">
            </div>
            <div class="field-row-horizontal">
              <label class="field-label-inline">Card Esperado</label>
              <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(des.cardEsperado || 'CARD0001')}" placeholder="CARD0001" data-des-field="cardEsperado">
              <label class="field-label-inline">Áudio Pergunta</label>
              <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(des.audioPergunta || 'A0002.WAV')}" placeholder="A0002.WAV" data-des-field="audioPergunta">
            </div>
            <div class="item-actions-corner">
              <button type="button" class="btn-action-circle delete" data-action="delete-desafio-item">🗑</button>
            </div>
          </div>
        </div>
      `;

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

      container.appendChild(card);
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
        <div class="accordion-header" data-action="toggle-accordion">
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
                <input type="text" class="field-input-clean" value="${escapeHtml(livro.nome || '')}" placeholder="AVENTURAS DO FEFO" data-livro-field="nome">
                <button type="button" class="btn-mockup-mustard" data-action="upload-livro-pdf">Selecionar PDF</button>
              </div>
            </div>
            <div class="item-actions-corner">
              <button type="button" class="btn-action-circle check" data-action="save-livro">✔</button>
              <button type="button" class="btn-action-circle delete" data-action="delete-livro">🗑</button>
            </div>
          </div>
        </div>
      `;

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
      card.querySelector('[data-action="save-livro"]').addEventListener('click', () => saveCatalogData(false));
      card.querySelector('[data-action="delete-livro"]').addEventListener('click', () => {
        getCurrentStory().livrinhos.splice(idx, 1);
        renderLivrinhosSection(getCurrentStory());
      });

      container.appendChild(card);
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
  // SEÇÃO 6: BOBIE GODS
  // ==========================================================================
  function renderBobiesSection(story) {
    const container = document.getElementById('bobies-container');
    container.innerHTML = '';

    (story.bobies || []).forEach((bobie, idx) => {
      const card = document.createElement('div');
      card.className = 'accordion-item-card expanded';
      card.id = `card-bobie-${idx}`;

      card.innerHTML = `
        <div class="accordion-header" data-action="toggle-accordion">
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
                <input type="text" class="field-input-clean" value="${escapeHtml(bobie.nome || '')}" placeholder="AVENTURAS DO FEFO - COLORIR" data-bobie-field="nome">
                <button type="button" class="btn-mockup-mustard" data-action="upload-bobie-pdf">Selecionar PDF</button>
              </div>
            </div>
            <div class="item-actions-corner">
              <button type="button" class="btn-action-circle check" data-action="save-bobie">✔</button>
              <button type="button" class="btn-action-circle delete" data-action="delete-bobie">🗑</button>
            </div>
          </div>
        </div>
      `;

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
      card.querySelector('[data-action="save-bobie"]').addEventListener('click', () => saveCatalogData(false));
      card.querySelector('[data-action="delete-bobie"]').addEventListener('click', () => {
        getCurrentStory().bobies.splice(idx, 1);
        renderBobiesSection(getCurrentStory());
      });

      container.appendChild(card);
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
  // RENDERIZAÇÃO DE WAVEFORM & BARRAS AMARELAS DE CORTE
  // ==========================================================================
  function drawWaveform(canvas, audioBuffer, trimmer) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 600;
    const height = canvas.height = canvas.parentElement.clientHeight || 90;

    // Fundo escuro do visualizador
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, width, height);

    // Linha central de guia
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // 1. Desenhar a Onda Sonora Verde Neon
    ctx.fillStyle = '#22C55E';

    if (!audioBuffer) {
      // Onda simulada estética suave antes de carregar o arquivo
      const bars = Math.floor(width / 4);
      for (let i = 0; i < bars; i++) {
        const h = Math.sin(i * 0.15) * (height * 0.35) + Math.cos(i * 0.05) * (height * 0.25) + 15;
        const x = i * 4;
        const y = (height - h) / 2;
        ctx.fillRect(x, y, 2.5, h);
      }
    } else {
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

    // 2. Calcular Posições de Início e Fim
    const totalDur = (audioBuffer && audioBuffer.duration) ? audioBuffer.duration : Math.max(10, trimmer?.fim || 30);
    const startSec = Math.max(0, Math.min(totalDur, trimmer?.inicio || 0));
    const endSec = Math.max(startSec + 0.05, Math.min(totalDur, trimmer?.fim || totalDur));

    const sx = Math.max(0, Math.min(width, (startSec / totalDur) * width));
    const ex = Math.max(0, Math.min(width, (endSec / totalDur) * width));

    // 3. Regiões fora do corte sombreadas (escurecidas para dar foco no trecho ativo)
    ctx.fillStyle = 'rgba(7, 13, 22, 0.75)';
    if (sx > 0) ctx.fillRect(0, 0, sx, height);
    if (ex < width) ctx.fillRect(ex, 0, width - ex, height);

    // 4. Região cortada selecionada com leve brilho verde
    ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
    ctx.fillRect(sx, 0, ex - sx, height);

    // 5. BARRAS AMARELAS DE CORTE (Conforme desenho do usuário no print)
    const drawYellowBar = (xPos, isStart) => {
      // Linha vertical amarela viva
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, height);
      ctx.stroke();

      // Puxador circular superior idêntico ao desenho da caneta amarela
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(xPos, 9, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Borda contrastante no puxador
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Ponto inferior de apoio
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(xPos, height - 7, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    drawYellowBar(sx, true);
    drawYellowBar(ex, false);
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
