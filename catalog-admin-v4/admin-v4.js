/**
 * ==========================================================================
 * FEFO CATALOG ADMIN v4 - GESTOR PEDAGÓGICO, EIXOS TEMÁTICOS & BUNDLES SD
 * ==========================================================================
 * - Eixos Temáticos em Destaque com Pacotes Submissos
 * - Semáforo Oficial: 🟢 PRONTO | 🟡 EM PROCESSO | 🔴 INCOMPLETO
 * - Sanfona Colapsável por Pacote (Fechado por Padrão)
 * - Botão de Download em Cada Item + Download Total no Rodapé do Pacote
 * - Botões de Reordenação (▲ / ▼) para Pacotes e Itens Internos
 * - Exclusão Segura Apenas Dentro do Pacote Aberto
 * - Sincronização em Nuvem Multi-PC via GitHub REST API
 */

(() => {
  'use strict';

  const STORAGE_KEY = 'fefo_catalog_v4_state';

  // 8 Eixos Temáticos Padrão do Ecossistema FEFO
  const EIXOS_PADRAO = [
    { id: "eixo-01", nome: "Rotina & Hábitos", icone: "⏰", descricao: "Organização diária, autonomia e transições suaves." },
    { id: "eixo-02", nome: "Autocuidado & Higiene", icone: "🪥", descricao: "Escovação, banho, cuidados pessoais e saúde do corpo." },
    { id: "eixo-03", nome: "Emoções & Autorregulação", icone: "💛", descricao: "Identificação de sentimentos, calma e respiração guiada." },
    { id: "eixo-04", nome: "Alimentação Saudável", icone: "🍎", descricao: "Relação positiva com alimentos e novas texturas." },
    { id: "eixo-05", nome: "Socialização & Empatia", icone: "🤝", descricao: "Compartilhar, cooperação, amizade e limites gentis." },
    { id: "eixo-06", nome: "Movimento & Coordenação", icone: "🏃", descricao: "Motricidade ampla, dança, ritmo e coordenação motora fina." },
    { id: "eixo-07", nome: "Linguagem & Imaginação", icone: "📚", descricao: "Vocabulário, rimas, contação de histórias e imaginação fértil." },
    { id: "eixo-08", nome: "Ciência & Natureza", icone: "🌱", descricao: "Curiosidade sobre o mundo, animais, plantas e fenômenos naturais." }
  ];

  // Estado Central do Catálogo v4 (Eixos Dinâmicos + Pacotes Submissos)
  let catalogState = {
    schema: 4,
    catalogVersion: "v4.001",
    versionCode: 4001,
    eixos: JSON.parse(JSON.stringify(EIXOS_PADRAO)),
    historinhas: []
  };

  // Conjunto de IDs de pacotes expandidos (por padrão todos começam colapsados)
  const expandedStories = new Set();

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
    initTopBarEvents();
    
    // Tenta sincronizar primeiro da nuvem (GitHub REST API) para ter paridade entre todos os PCs
    await loadCatalogData(true);
    renderCatalogFeed();
  });

  // ==========================================================================
  // CARREGAMENTO & SINCRONIZAÇÃO EM NUVEM (MULTI-PC)
  // ==========================================================================
  async function loadCatalogData(fromCloudFirst = true) {
    let loadedData = null;

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

    if (!loadedData) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          loadedData = JSON.parse(saved);
        } catch (e) {}
      }
    }

    if (!loadedData) {
      try {
        const resp = await fetch('../repository/catalog-v3.json?_t=' + Date.now(), { cache: 'no-store' });
        if (resp.ok) {
          loadedData = await resp.json();
        }
      } catch (e) {}
    }

    if (loadedData) {
      catalogState.catalogVersion = loadedData.catalogVersion || "v4.001";
      catalogState.versionCode = loadedData.versionCode || 4001;

      if (loadedData.eixos && Array.isArray(loadedData.eixos) && loadedData.eixos.length > 0) {
        catalogState.eixos = loadedData.eixos;
      } else {
        catalogState.eixos = JSON.parse(JSON.stringify(EIXOS_PADRAO));
      }

      if (loadedData.historinhas && Array.isArray(loadedData.historinhas)) {
        catalogState.historinhas = loadedData.historinhas;
      } else if (loadedData.temas) {
        catalogState.historinhas = convertLegacyCatalogToHistorinhas(loadedData);
      }
    }

    if (!catalogState.historinhas || catalogState.historinhas.length === 0) {
      catalogState.historinhas = [createDefaultStory(1)];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogState, null, 2));
    const versionDisplay = document.getElementById('global-version-display');
    if (versionDisplay) versionDisplay.textContent = catalogState.catalogVersion;
  }

  async function saveCatalogData(isPublish = false, specificStory = null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogState, null, 2));

    if (isPublish) {
      let cur = catalogState.catalogVersion || 'v4.001';
      const m = cur.match(/^v(\d+)\.(\d+)$/);
      if (m) {
        const major = parseInt(m[1], 10);
        const minor = parseInt(m[2], 10) + 1;
        catalogState.catalogVersion = `v${major}.${String(minor).padStart(3, '0')}`;
        catalogState.versionCode = (major * 1000) + minor;
      }
      const versionDisplay = document.getElementById('global-version-display');
      if (versionDisplay) versionDisplay.textContent = catalogState.catalogVersion;
    }

    if (window.GitHubSync && window.GitHubSync.isConfigured()) {
      try {
        updateCloudStatus('syncing', 'Enviando alterações para o GitHub...');
        const actionLabel = isPublish ? 'publicar' : 'salvar';
        const storyName = specificStory ? `"${specificStory.titulo}"` : 'Catálogo v4';
        const msg = `feat(catalog-v4): ${actionLabel} ${storyName} [${catalogState.catalogVersion}] via Web Admin`;
        
        await window.GitHubSync.saveCatalogV3(catalogState, msg);
        updateCloudStatus('connected', 'Conectado à nuvem');
        showToast(`✅ Sincronizado no GitHub! (${catalogState.catalogVersion})`, 'success');
        return;
      } catch (e) {
        console.error('Erro ao sincronizar com GitHub:', e);
        updateCloudStatus('disconnected', 'Erro ao enviar para nuvem');
        showToast(`Salvo localmente, erro ao enviar ao GitHub: ${e.message}`, 'warning');
      }
    } else {
      showToast(isPublish ? 'Versão local publicada com sucesso!' : 'Alterações salvas localmente!', 'success');
    }
  }

  function updateCloudStatus(status, text) {
    const pill = document.getElementById('github-sync-pill');
    if (!pill) return;
    pill.className = `gh-sync-pill ${status}`;
    pill.title = text;
    const icon = pill.querySelector('.gh-cloud-icon');
    if (icon) {
      icon.textContent = status === 'connected' ? '☁️' : status === 'syncing' ? '🔄' : '⚠️';
    }
  }

  function convertLegacyCatalogToHistorinhas(raw) {
    if (!raw.temas || raw.temas.length === 0) return [createDefaultStory(1)];
    return raw.temas.map((t, idx) => ({
      id: `hist_${idx + 1}`,
      codigo: t.codigo || `t01.${String(idx + 1).padStart(2, '0')}`,
      titulo: t.titulo || `Historinha ${idx + 1}`,
      eixoId: t.eixoId || "eixo-01",
      licencas: { home: true, escola: true, clinica: true, premium: true },
      contos: [
        {
          id: `conto_1`,
          nomeApp: "A VINDA",
          arquivoPet: "a0001.wav",
          arquivoPetManual: false,
          audioUrl: t.materiais?.historiaAudio?.url || "",
          facePet: "f0001.raw",
          roteiro: "Olá amiguinho! O FEFO chegou para viver muitas aventuras com você na Terra!",
          trimmer: { inicio: 0.50, fim: 51.37, fadeIn: 0.2, fadeOut: 0.2, duracao: 50.87 },
          status: t.materiais?.historiaAudio?.url ? "ready" : "raw",
          cardVinculado: {
            nome: "CARD 001",
            comandoPet: "c0001.png",
            imagemUrl: ""
          }
        }
      ],
      musicas: [
        {
          id: `mus_1`,
          nomeApp: "Canção do Bom Dia",
          arquivoPet: "a0011.wav",
          arquivoPetManual: false,
          audioUrl: "",
          facePet: "f0001.raw",
          roteiro: "Solzinho acorda de manhã, vem brincar com o FEFO...",
          trimmer: { inicio: 0, fim: 30, fadeIn: 0.2, fadeOut: 0.2, duracao: 30 },
          status: "empty",
          cardVinculado: {
            nome: "CARD MÚSICA 1",
            comandoPet: "c0011.png",
            imagemUrl: ""
          }
        }
      ],
      trecks: [
        {
          id: `trk_1`,
          nomeAcao: t.interacoesFefo?.treckTreck?.titulo || "Alongamento do Bichinho Preguiça",
          arquivoPet: "TRK0001.WAV",
          duracaoSegundos: 90,
          instrucao: "Gire a catraca do robô acompanhando o som rítmico...",
          audioUrl: ""
        }
      ],
      desafios: [
        {
          id: `des_1`,
          titulo: "Onde está o Card do Amiguinho?",
          cardEsperado: "c0001.png",
          audioPergunta: "a0002.wav",
          facePet: "f0001.raw"
        }
      ],
      livrinhos: [
        {
          id: `livro_1`,
          nome: "Aventuras do FEFO",
          pdfUrl: "",
          capaUrl: ""
        }
      ],
      bobies: [
        {
          id: `bobie_1`,
          nome: "Aventuras do FEFO - Colorir",
          pdfUrl: "",
          capaUrl: ""
        }
      ]
    }));
  }

  function createDefaultStory(num, forcedEixoId = "eixo-01") {
    return {
      id: `hist_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      codigo: `t01.${String(num).padStart(2, '0')}`,
      titulo: `Historinha ${num} - Nova Aventura do FEFO`,
      eixoId: forcedEixoId,
      licencas: { home: true, escola: true, clinica: true, premium: true },
      contos: [
        {
          id: `conto_1`,
          nomeApp: "PARTE 01",
          arquivoPet: "a0001.wav",
          arquivoPetManual: false,
          audioUrl: "",
          facePet: "f0001.raw",
          roteiro: "Digite ou edite aqui o roteiro falado pelo FEFO...",
          trimmer: { inicio: 0, fim: 30, fadeIn: 0.2, fadeOut: 0.2, duracao: 30 },
          status: "empty",
          cardVinculado: {
            nome: "CARD 001",
            comandoPet: "c0001.png",
            imagemUrl: ""
          }
        }
      ],
      musicas: [
        {
          id: `mus_1`,
          nomeApp: "CANÇÃO 01",
          arquivoPet: "a0011.wav",
          arquivoPetManual: false,
          audioUrl: "",
          facePet: "f0001.raw",
          roteiro: "Letra da música...",
          trimmer: { inicio: 0, fim: 45, fadeIn: 0.2, fadeOut: 0.2, duracao: 45 },
          status: "empty",
          cardVinculado: {
            nome: "CARD MÚSICA 1",
            comandoPet: "c0011.png",
            imagemUrl: ""
          }
        }
      ],
      trecks: [
        {
          id: `trk_1`,
          nomeAcao: "Alongamento Tátil",
          arquivoPet: "TRK0001.WAV",
          duracaoSegundos: 60,
          instrucao: "Instruções físicas do robô...",
          audioUrl: ""
        }
      ],
      desafios: [
        {
          id: `des_1`,
          titulo: "Desafio do Card",
          cardEsperado: "c0001.png",
          audioPergunta: "a0002.wav",
          facePet: "f0001.raw"
        }
      ],
      livrinhos: [
        {
          id: `livro_1`,
          nome: "Livrinho Ilustrado",
          pdfUrl: "",
          capaUrl: ""
        }
      ],
      bobies: [
        {
          id: `bobie_1`,
          nome: "Livro de Colorir",
          pdfUrl: "",
          capaUrl: ""
        }
      ]
    };
  }

  // ==========================================================================
  // EVENTOS DA TOP BAR & AÇÕES GLOBAIS
  // ==========================================================================
  function initTopBarEvents() {
    // Botão Sincronizar Nuvem
    const btnSync = document.getElementById('btn-sync-cloud');
    if (btnSync) {
      btnSync.addEventListener('click', async () => {
        showToast('Buscando versão mais recente no GitHub...', 'info');
        await loadCatalogData(true);
        renderCatalogFeed();
      });
    }

    // Botão Importar Catálogo
    const fileInput = document.getElementById('input-import-json');
    const btnImport = document.getElementById('btn-import-catalog');
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', () => fileInput.click());
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
            saveCatalogData(false);
            renderCatalogFeed();
            showToast(`Catálogo "${file.name}" importado com sucesso!`, 'success');
          } catch (err) {
            showToast('Erro ao importar JSON. Verifique a sintaxe.', 'error');
          }
        };
        reader.readAsText(file);
        fileInput.value = '';
      });
    }

    // Botão Baixar JSON Global
    const btnExport = document.getElementById('btn-export-catalog');
    if (btnExport) btnExport.addEventListener('click', exportCatalogJson);

    // Botão Gerar Bundle SD Global
    const btnBundle = document.getElementById('btn-gerar-bundle-sd');
    if (btnBundle) btnBundle.addEventListener('click', () => gerarBundleSD(null));

    // Botão Topo: Adicionar Novo Eixo Temático
    const btnTopAddEixo = document.getElementById('btn-top-add-eixo') || document.getElementById('btn-top-add-pacote');
    if (btnTopAddEixo) {
      btnTopAddEixo.addEventListener('click', () => openEixoModal(null));
    }

    // Inicializa eventos do modal de Eixo Temático
    initEixoModalEvents();
  }

  // ==========================================================================
  // MODAL DE CRIAÇÃO / EDIÇÃO DE EIXO TEMÁTICO
  // ==========================================================================
  let modalEventsInitialized = false;
  function initEixoModalEvents() {
    if (modalEventsInitialized) return;
    modalEventsInitialized = true;

    const backdrop = document.getElementById('modal-eixo-backdrop');
    const btnClose = document.getElementById('btn-close-modal-eixo');
    const btnCancel = document.getElementById('btn-cancel-modal-eixo');
    const btnSave = document.getElementById('btn-save-modal-eixo');
    const emojisList = document.getElementById('quick-emojis-list');
    const inputIcon = document.getElementById('modal-eixo-icone');
    const inputNome = document.getElementById('modal-eixo-nome');

    if (btnClose) btnClose.addEventListener('click', closeEixoModal);
    if (btnCancel) btnCancel.addEventListener('click', closeEixoModal);

    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeEixoModal();
      });
    }

    if (emojisList && inputIcon) {
      emojisList.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-emoji-quick');
        if (btn) {
          const emoji = btn.dataset.emoji;
          if (emoji) inputIcon.value = emoji;
        }
      });
    }

    if (btnSave) {
      btnSave.addEventListener('click', saveEixoFromModal);
    }

    if (inputNome) {
      inputNome.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveEixoFromModal();
        } else if (e.key === 'Escape') {
          closeEixoModal();
        }
      });
    }
  }

  function openEixoModal(eixoToEdit = null) {
    const backdrop = document.getElementById('modal-eixo-backdrop');
    const modalTitle = document.getElementById('modal-eixo-title');
    const inputEditId = document.getElementById('modal-eixo-edit-id');
    const inputNome = document.getElementById('modal-eixo-nome');
    const inputIcon = document.getElementById('modal-eixo-icone');
    const inputDesc = document.getElementById('modal-eixo-descricao');
    const btnSave = document.getElementById('btn-save-modal-eixo');

    if (!backdrop) return;

    if (eixoToEdit) {
      if (modalTitle) modalTitle.textContent = '✏️ Editar Eixo Temático';
      if (inputEditId) inputEditId.value = eixoToEdit.id;
      if (inputNome) inputNome.value = eixoToEdit.nome || '';
      if (inputIcon) inputIcon.value = eixoToEdit.icone || '🎨';
      if (inputDesc) inputDesc.value = eixoToEdit.descricao || '';
      if (btnSave) btnSave.textContent = 'Salvar Alterações';
    } else {
      if (modalTitle) modalTitle.textContent = '🎨 Novo Eixo Temático';
      if (inputEditId) inputEditId.value = '';
      if (inputNome) inputNome.value = '';
      if (inputIcon) inputIcon.value = '🎨';
      if (inputDesc) inputDesc.value = '';
      if (btnSave) btnSave.textContent = 'Confirmar e Criar Eixo';
    }

    backdrop.style.display = 'flex';
    setTimeout(() => {
      if (inputNome) inputNome.focus();
    }, 100);
  }

  function closeEixoModal() {
    const backdrop = document.getElementById('modal-eixo-backdrop');
    if (backdrop) backdrop.style.display = 'none';
  }

  function saveEixoFromModal() {
    const inputEditId = document.getElementById('modal-eixo-edit-id');
    const inputNome = document.getElementById('modal-eixo-nome');
    const inputIcon = document.getElementById('modal-eixo-icone');
    const inputDesc = document.getElementById('modal-eixo-descricao');

    const nome = (inputNome ? inputNome.value : '').trim();
    const icone = (inputIcon ? inputIcon.value : '').trim() || '🎨';
    const descricao = (inputDesc ? inputDesc.value : '').trim();
    const editId = inputEditId ? inputEditId.value : '';

    if (!nome) {
      showToast('Por favor, informe o nome do Eixo Temático.', 'warning');
      if (inputNome) inputNome.focus();
      return;
    }

    if (!catalogState.eixos) {
      catalogState.eixos = JSON.parse(JSON.stringify(EIXOS_PADRAO));
    }

    let targetId = '';
    if (editId) {
      // Edição de Eixo existente
      const existing = catalogState.eixos.find(e => e.id === editId);
      if (existing) {
        existing.nome = nome;
        existing.icone = icone;
        existing.descricao = descricao;
        targetId = existing.id;
        showToast(`Eixo "${nome}" atualizado com sucesso!`, 'success');
      }
    } else {
      // Criação de Novo Eixo Temático
      const newIndex = catalogState.eixos.length + 1;
      let newId = `eixo-${String(newIndex).padStart(2, '0')}`;
      if (catalogState.eixos.some(e => e.id === newId)) {
        newId = `eixo_${Date.now()}`;
      }

      const novoEixo = {
        id: newId,
        nome: nome,
        icone: icone,
        descricao: descricao
      };

      catalogState.eixos.push(novoEixo);
      targetId = novoEixo.id;
      showToast(`🎉 Novo Eixo Temático "${nome}" criado com sucesso!`, 'success');
    }

    saveCatalogData(false);
    closeEixoModal();
    renderCatalogFeed();

    // Scroll e destaque suave no eixo
    if (targetId) {
      setTimeout(() => {
        const el = document.getElementById(`eixo-card-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-eixo');
          setTimeout(() => el.classList.remove('highlight-eixo'), 2500);
        }
      }, 150);
    }
  }

  function moveEixo(eixoIdx, delta) {
    if (!catalogState.eixos) return;
    const newIdx = eixoIdx + delta;
    if (newIdx < 0 || newIdx >= catalogState.eixos.length) return;

    const temp = catalogState.eixos[eixoIdx];
    catalogState.eixos[eixoIdx] = catalogState.eixos[newIdx];
    catalogState.eixos[newIdx] = temp;

    saveCatalogData(false);
    renderCatalogFeed();
    showToast('Ordem dos Eixos Temáticos atualizada!', 'info');
  }

  function deleteEixo(eixoId) {
    if (!catalogState.eixos) return;
    const eixo = catalogState.eixos.find(e => e.id === eixoId);
    if (!eixo) return;

    const pacotesNoEixo = catalogState.historinhas.filter(h => h.eixoId === eixoId);
    if (pacotesNoEixo.length > 0) {
      showToast(`Este eixo possui ${pacotesNoEixo.length} pacote(s) vinculado(s). Mova ou exclua os pacotes antes de remover o eixo.`, 'error');
      return;
    }

    if (confirm(`Tem certeza de que deseja excluir o eixo "${eixo.nome}"?`)) {
      catalogState.eixos = catalogState.eixos.filter(e => e.id !== eixoId);
      saveCatalogData(false);
      renderCatalogFeed();
      showToast(`Eixo "${eixo.nome}" excluído.`, 'info');
    }
  }

  // ==========================================================================
  // SEMÁFORO DE STATUS DO PACOTE (🟢 PRONTO | 🟡 EM PROCESSO | 🔴 INCOMPLETO)
  // ==========================================================================
  function calculateStoryStatus(story) {
    const contos = story.contos || [];
    const musicas = story.musicas || [];
    const cards = (story.desafios || []).length + contos.filter(c => c.cardVinculado?.comandoPet).length;

    const contosProntos = contos.filter(c => c.audioUrl || c.status === 'ready').length;
    const musicasProntas = musicas.filter(m => m.audioUrl || m.status === 'ready').length;

    if (contosProntos > 0 && musicasProntas > 0 && cards > 0) {
      return { cls: 'status-ready', icon: '🟢', label: 'PRONTO' };
    }
    if (contosProntos > 0 || musicasProntas > 0 || contos.some(c => c.roteiro) || cards > 0) {
      return { cls: 'status-process', icon: '🟡', label: 'EM PROCESSO' };
    }
    return { cls: 'status-incomplete', icon: '🔴', label: 'INCOMPLETO' };
  }

  // ==========================================================================
  // RENDERIZAÇÃO DO FEED DE EIXOS & PACOTES (HIERARQUIA PRINCIPAL)
  // ==========================================================================
  function renderCatalogFeed() {
    const container = document.getElementById('eixos-master-container');
    if (!container) return;
    container.innerHTML = '';

    const eixosList = (catalogState.eixos && catalogState.eixos.length > 0) ? catalogState.eixos : EIXOS_PADRAO;

    eixosList.forEach((eixo, eixoIdx) => {
      // Filtra pacotes do eixo
      const eixoStories = catalogState.historinhas.filter(h => h.eixoId === eixo.id || (!h.eixoId && eixo.id === eixosList[0]?.id));

      const eixoWrapper = document.createElement('div');
      eixoWrapper.className = 'eixo-card-wrapper';
      eixoWrapper.id = `eixo-card-${eixo.id}`;

      eixoWrapper.innerHTML = `
        <div class="eixo-header-bar" data-action="toggle-eixo">
          <div class="eixo-title-group">
            <span class="eixo-pin">📌</span>
            <span class="eixo-badge-icone">${escapeHtml(eixo.icone || '🎨')}</span>
            <span class="eixo-name">${escapeHtml(eixo.nome)}</span>
            <span class="eixo-count-chip">${eixoStories.length} ${eixoStories.length === 1 ? 'pacote' : 'pacotes'}</span>
          </div>
          <div class="eixo-actions-group">
            <div class="eixo-order-controls">
              <button type="button" class="btn-eixo-order" data-action="move-eixo-up" title="Mover Eixo para Cima">▲</button>
              <button type="button" class="btn-eixo-order" data-action="move-eixo-down" title="Mover Eixo para Baixo">▼</button>
            </div>
            <button type="button" class="btn-eixo-edit" data-action="edit-eixo" title="Editar Nome e Ícone do Eixo">✏️</button>
            <button type="button" class="btn-eixo-delete" data-action="delete-eixo" title="Excluir Eixo">🗑️</button>
            <button type="button" class="btn-add-pacote-eixo" data-action="add-story-eixo" title="Adicionar Pacote neste Eixo">
              ➕ Novo Pacote
            </button>
            <span class="eixo-toggle-arrow">▼</span>
          </div>
        </div>
        <div class="eixo-stories-container" id="stories-container-${eixo.id}">
          <!-- Pacotes serão inseridos aqui -->
        </div>
      `;

      // Evento de recolher/expandir o eixo
      eixoWrapper.querySelector('[data-action="toggle-eixo"]').addEventListener('click', (e) => {
        if (e.target.closest('.eixo-actions-group')) return;
        eixoWrapper.classList.toggle('collapsed');
      });

      // Botões de reordenação de eixos (▲ / ▼)
      eixoWrapper.querySelector('[data-action="move-eixo-up"]').addEventListener('click', (e) => {
        e.stopPropagation();
        moveEixo(eixoIdx, -1);
      });
      eixoWrapper.querySelector('[data-action="move-eixo-down"]').addEventListener('click', (e) => {
        e.stopPropagation();
        moveEixo(eixoIdx, 1);
      });

      // Botão de editar eixo
      eixoWrapper.querySelector('[data-action="edit-eixo"]').addEventListener('click', (e) => {
        e.stopPropagation();
        openEixoModal(eixo);
      });

      // Botão de excluir eixo
      eixoWrapper.querySelector('[data-action="delete-eixo"]').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteEixo(eixo.id);
      });

      // Botão de adicionar pacote diretamente neste eixo
      eixoWrapper.querySelector('[data-action="add-story-eixo"]').addEventListener('click', (e) => {
        e.stopPropagation();
        addNewPackage(eixo.id);
      });

      const storiesContainer = eixoWrapper.querySelector(`#stories-container-${eixo.id}`);

      if (eixoStories.length === 0) {
        storiesContainer.innerHTML = `
          <div style="text-align: center; padding: 1.5rem; color: #94A3B8; font-size: 0.85rem; font-weight: 600;">
            Nenhum pacote neste eixo ainda. Clique em "➕ Novo Pacote" acima para adicionar.
          </div>
        `;
      } else {
        eixoStories.forEach(story => {
          const globalStoryIdx = catalogState.historinhas.indexOf(story);
          const pkgElement = createPackageElement(story, globalStoryIdx);
          storiesContainer.appendChild(pkgElement);
        });
      }

      container.appendChild(eixoWrapper);
    });
  }

  // ==========================================================================
  // ELEMENTO DO PACOTE (SANFONA MASTER COM SUB-MÓDULOS INTERNOS)
  // ==========================================================================
  function createPackageElement(story, storyIdx) {
    const pkg = document.createElement('div');
    const isExpanded = expandedStories.has(story.id);
    pkg.className = `package-card-wrapper ${isExpanded ? 'expanded' : 'collapsed'}`;
    pkg.id = `pkg-${story.id}`;

    const status = calculateStoryStatus(story);
    const contosCount = (story.contos || []).length;
    const musicasCount = (story.musicas || []).length;
    const cardsCount = ((story.contos || []).filter(c => c.cardVinculado?.comandoPet).length) + ((story.desafios || []).length);
    const ativCount = ((story.livrinhos || []).length) + ((story.bobies || []).length) + ((story.trecks || []).length);

    pkg.innerHTML = `
      <!-- CABEÇALHO DO PACOTE (MINIMIZADO / EXPANDIDO) -->
      <div class="package-header-bar" data-action="toggle-package">
        <div class="package-header-left">
          <div class="package-order-controls" onclick="event.stopPropagation();">
            <button type="button" class="btn-order-arrow" data-action="move-pkg-up" title="Mover Pacote para Cima">▲</button>
            <button type="button" class="btn-order-arrow" data-action="move-pkg-down" title="Mover Pacote para Baixo">▼</button>
          </div>
          <span class="package-icon-folder">📁</span>
          <span class="package-title-display"><strong>${escapeHtml(story.codigo || 't01.01')}</strong> - ${escapeHtml(story.titulo || 'Nova Historinha')}</span>
          <span class="package-status-chip ${status.cls}">${status.icon} ${status.label}</span>
          <span class="package-meta-summary">(${contosCount} Contos • ${musicasCount} Músicas • ${cardsCount} Cards • ${ativCount} Atividades)</span>
        </div>

        <div class="package-header-right">
          <button type="button" class="btn-header-pkg-download" data-action="download-pkg-quick" title="Baixar Pacote Completo (Manifesto SD)" onclick="event.stopPropagation();">
            ⬇ Baixar Pacote
          </button>
          <span class="btn-toggle-package">▼</span>
        </div>
      </div>

      <!-- CORPO DO PACOTE: EDIÇÃO COMPLETA -->
      <div class="package-body-content">
        
        <!-- CABEÇALHO INTERNO DO PACOTE -->
        <section class="sheet-header">
          <div class="eixo-header-row">
            <div class="eixo-tag-badge">
              <span class="pin-icon">📌</span>
              <span class="eixo-label-prefix">EIXO TEMÁTICO:</span>
              <select class="eixo-select-inline" data-field="eixoId">
                ${(catalogState.eixos || EIXOS_PADRAO).map(e => `<option value="${e.id}" ${e.id === (story.eixoId || (catalogState.eixos && catalogState.eixos[0] ? catalogState.eixos[0].id : 'eixo-01')) ? 'selected' : ''}>${escapeHtml(e.icone || '🎨')} ${escapeHtml(e.nome)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="story-title-row">
            <div class="story-title-box">
              <input type="text" class="story-title-input" value="${escapeHtml(story.titulo || '')}" placeholder="Título da Historinha / Tema..." data-field="titulo">
            </div>

            <!-- Licenças -->
            <div class="licenses-box">
              <span class="licenses-title">Licenças</span>
              <div class="licenses-options">
                <label class="license-checkbox-label">
                  <input type="checkbox" data-lic="home" ${story.licencas?.home ? 'checked' : ''}>
                  <span class="custom-check">✔</span> Home
                </label>
                <label class="license-checkbox-label">
                  <input type="checkbox" data-lic="escola" ${story.licencas?.escola ? 'checked' : ''}>
                  <span class="custom-check">✔</span> Escola
                </label>
                <label class="license-checkbox-label">
                  <input type="checkbox" data-lic="clinica" ${story.licencas?.clinica ? 'checked' : ''}>
                  <span class="custom-check">✔</span> Clínica
                </label>
                <label class="license-checkbox-label">
                  <input type="checkbox" data-lic="premium" ${story.licencas?.premium ? 'checked' : ''}>
                  <span class="custom-check">✔</span> Premium
                </label>
              </div>
            </div>
          </div>

          <!-- CHECKLIST DE SAÚDE DO PACOTE -->
          <div class="package-health-card">
            <div class="health-header">
              <span class="health-title">📋 Checklist de Prontidão do Pacote</span>
              <span class="health-status-badge ${status.cls === 'status-ready' ? 'ready' : ''}">${status.icon} ${status.label}</span>
            </div>
            <div class="health-pills-grid">
              <div class="health-pill ${contosCount > 0 ? 'ok' : 'empty'}">
                <span class="pill-dot">${contosCount > 0 ? '✅' : '⚪'}</span>
                <span class="pill-label">Contos:</span>
                <span class="pill-val">${contosCount} (${story.contos?.[0]?.arquivoPet || 'a0001.wav'})</span>
              </div>
              <div class="health-pill ok">
                <span class="pill-dot">✅</span>
                <span class="pill-label">Faces:</span>
                <span class="pill-val">f0001.raw OK</span>
              </div>
              <div class="health-pill ${musicasCount > 0 ? 'ok' : 'empty'}">
                <span class="pill-dot">${musicasCount > 0 ? '✅' : '⚪'}</span>
                <span class="pill-label">Músicas:</span>
                <span class="pill-val">${musicasCount} prontas</span>
              </div>
              <div class="health-pill ${cardsCount > 0 ? 'ok' : 'empty'}">
                <span class="pill-dot">${cardsCount > 0 ? '✅' : '⚪'}</span>
                <span class="pill-label">Cards:</span>
                <span class="pill-val">${cardsCount} cards</span>
              </div>
              <div class="health-pill ${ativCount > 0 ? 'ok' : 'empty'}">
                <span class="pill-dot">${ativCount > 0 ? '✅' : '⚪'}</span>
                <span class="pill-label">Atividades:</span>
                <span class="pill-val">${ativCount} itens</span>
              </div>
            </div>
          </div>
        </section>

        <!-- SEÇÃO 1: CONTOS -->
        <section class="sheet-section">
          <div class="section-row-layout">
            <div class="items-accordion-container" id="contos-container-${story.id}"></div>
            <button type="button" class="btn-add-side btn-add-conto" data-action="add-conto" title="Adicionar Novo Conto">
              <span class="btn-icon">➕</span>
              <span class="btn-label">Novo Conto</span>
            </button>
          </div>
        </section>

        <!-- SEÇÃO 2: TRECK-TRECK -->
        <section class="sheet-section">
          <div class="section-row-layout">
            <div class="items-accordion-container" id="trecks-container-${story.id}"></div>
            <button type="button" class="btn-add-side btn-add-treck" data-action="add-treck" title="Adicionar Novo Treck">
              <span class="btn-icon">➕</span>
              <span class="btn-label">Novo Treck</span>
            </button>
          </div>
        </section>

        <!-- SEÇÃO 3: MÚSICAS -->
        <section class="sheet-section">
          <div class="section-row-layout">
            <div class="items-accordion-container" id="musicas-container-${story.id}"></div>
            <button type="button" class="btn-add-side btn-add-musica" data-action="add-musica" title="Adicionar Nova Música">
              <span class="btn-icon">➕</span>
              <span class="btn-label">Nova Música</span>
            </button>
          </div>
        </section>

        <!-- SEÇÃO 4: DESAFIOS -->
        <section class="sheet-section">
          <div class="section-row-layout">
            <div class="items-accordion-container" id="desafios-container-${story.id}"></div>
            <button type="button" class="btn-add-side btn-add-desafio" data-action="add-desafio" title="Adicionar Novo Desafio">
              <span class="btn-icon">➕</span>
              <span class="btn-label">Novo Desafio</span>
            </button>
          </div>
        </section>

        <!-- SEÇÃO 5: LIVRINHOS -->
        <section class="sheet-section">
          <div class="section-row-layout">
            <div class="items-accordion-container" id="livrinhos-container-${story.id}"></div>
            <button type="button" class="btn-add-side btn-add-livrinho" data-action="add-livrinho" title="Adicionar Novo Livrinho">
              <span class="btn-icon">➕</span>
              <span class="btn-label">Novo Livrinho</span>
            </button>
          </div>
        </section>

        <!-- SEÇÃO 6: BOBIE GODS -->
        <section class="sheet-section">
          <div class="section-row-layout">
            <div class="items-accordion-container" id="bobies-container-${story.id}"></div>
            <button type="button" class="btn-add-side btn-add-bobie" data-action="add-bobie" title="Adicionar Novo Bobie God">
              <span class="btn-icon">➕</span>
              <span class="btn-label">Novo Bobie</span>
            </button>
          </div>
        </section>

        <!-- RODAPÉ DE AÇÕES DO PACOTE -->
        <footer class="sheet-footer-actions">
          <button type="button" class="btn-footer btn-footer-download-total" data-action="download-pkg-total" title="Baixar Todos os Arquivos do Pacote">
            ⬇ Download Total do Pacote
          </button>
          <button type="button" class="btn-footer btn-excluir" data-action="delete-package" title="Excluir este Pacote do Catálogo">
            🗑 Excluir Pacote
          </button>
          <button type="button" class="btn-footer btn-salvar" data-action="save-package">
            💾 Salvar Pacote
          </button>
          <button type="button" class="btn-footer btn-publicar" data-action="publish-package">
            🚀 Publicar
          </button>
        </footer>

      </div>
    `;

    // ------------------------------------------------------------------------
    // EVENTOS DO PACOTE (SANFONA & REORDENAÇÃO)
    // ------------------------------------------------------------------------
    pkg.querySelector('[data-action="toggle-package"]').addEventListener('click', (e) => {
      if (e.target.closest('.package-order-controls') || e.target.closest('[data-action="download-pkg-quick"]')) return;
      if (expandedStories.has(story.id)) {
        expandedStories.delete(story.id);
        pkg.classList.remove('expanded');
        pkg.classList.add('collapsed');
      } else {
        expandedStories.add(story.id);
        pkg.classList.add('expanded');
        pkg.classList.remove('collapsed');
      }
    });

    // Reordenação de Pacotes (▲ / ▼)
    pkg.querySelector('[data-action="move-pkg-up"]').addEventListener('click', () => moveStory(storyIdx, -1));
    pkg.querySelector('[data-action="move-pkg-down"]').addEventListener('click', () => moveStory(storyIdx, 1));

    // Download do Pacote Completo no Header e no Rodapé
    pkg.querySelector('[data-action="download-pkg-quick"]').addEventListener('click', () => gerarBundleSD(story));
    pkg.querySelector('[data-action="download-pkg-total"]').addEventListener('click', () => gerarBundleSD(story));

    // Inputs do Pacote
    pkg.querySelector('[data-field="titulo"]').addEventListener('input', (e) => {
      story.titulo = e.target.value;
      const titleDisplay = pkg.querySelector('.package-title-display');
      if (titleDisplay) titleDisplay.innerHTML = `<strong>${escapeHtml(story.codigo || 't01.01')}</strong> - ${escapeHtml(story.titulo)}`;
    });

    pkg.querySelector('[data-field="eixoId"]').addEventListener('change', (e) => {
      story.eixoId = e.target.value;
      renderCatalogFeed();
      showToast(`Pacote movido para o eixo "${e.target.options[e.target.selectedIndex].text}"!`, 'info');
    });

    // Licenças
    ['home', 'escola', 'clinica', 'premium'].forEach(lic => {
      const chk = pkg.querySelector(`[data-lic="${lic}"]`);
      if (chk) {
        chk.addEventListener('change', (e) => {
          story.licencas = story.licencas || {};
          story.licencas[lic] = e.target.checked;
        });
      }
    });

    // Ações do Rodapé
    pkg.querySelector('[data-action="save-package"]').addEventListener('click', () => {
      saveCatalogData(false, story);
    });

    pkg.querySelector('[data-action="publish-package"]').addEventListener('click', () => {
      saveCatalogData(true, story);
    });

    // Exclusão Segura: só deleta de dentro do pacote
    pkg.querySelector('[data-action="delete-package"]').addEventListener('click', () => {
      if (confirm(`Tem certeza absoluta de que deseja excluir o pacote "${story.titulo}"?\nEsta ação removerá todos os seus áudios e cards associados.`)) {
        catalogState.historinhas.splice(storyIdx, 1);
        expandedStories.delete(story.id);
        saveCatalogData(false);
        renderCatalogFeed();
        showToast('Pacote excluído com sucesso.', 'info');
      }
    });

    // ------------------------------------------------------------------------
    // RENDERIZAÇÃO DOS SUB-MÓDULOS INTERNOS
    // ------------------------------------------------------------------------
    renderSubModules(pkg, story, storyIdx);

    return pkg;
  }

  // ==========================================================================
  // RENDERIZAÇÃO DE TODOS OS SUB-MÓDULOS DE UM PACOTE
  // ==========================================================================
  function renderSubModules(pkg, story, storyIdx) {
    // 1. Contos
    const contosContainer = pkg.querySelector(`#contos-container-${story.id}`);
    contosContainer.innerHTML = '';
    (story.contos || []).forEach((conto, cIdx) => {
      const card = createAudioModuleCard({
        type: 'CONTO',
        typeColor: '#D97706',
        sideBg: '#FEF3C7',
        item: conto,
        idx: cIdx,
        defaultFilePrefix: 'a',
        onMoveUp: () => moveItemInStory(storyIdx, 'contos', cIdx, -1),
        onMoveDown: () => moveItemInStory(storyIdx, 'contos', cIdx, 1),
        onUploadAudio: () => {
          promptFileUpload('audio/*', async (file, dataUrl) => {
            conto.audioUrl = dataUrl;
            conto.status = 'ready';
            await loadBufferForModule(conto, file);
            renderCatalogFeed();
            showToast(`Áudio do Conto ${cIdx + 1} carregado!`, 'success');
          });
        },
        onDelete: () => {
          if (confirm(`Remover Conto ${cIdx + 1}?`)) {
            story.contos.splice(cIdx, 1);
            renderCatalogFeed();
          }
        },
        onUpdate: () => renderCatalogFeed()
      });
      contosContainer.appendChild(card);
    });
    pkg.querySelector('[data-action="add-conto"]').addEventListener('click', () => {
      addNewItemToStory(story, 'contos');
    });

    // 2. Músicas
    const musicasContainer = pkg.querySelector(`#musicas-container-${story.id}`);
    musicasContainer.innerHTML = '';
    (story.musicas || []).forEach((musica, mIdx) => {
      const card = createAudioModuleCard({
        type: 'MÚSICA',
        typeColor: '#2563EB',
        sideBg: '#EFF6FF',
        item: musica,
        idx: mIdx,
        defaultFilePrefix: 'a',
        onMoveUp: () => moveItemInStory(storyIdx, 'musicas', mIdx, -1),
        onMoveDown: () => moveItemInStory(storyIdx, 'musicas', mIdx, 1),
        onUploadAudio: () => {
          promptFileUpload('audio/*', async (file, dataUrl) => {
            musica.audioUrl = dataUrl;
            musica.status = 'ready';
            await loadBufferForModule(musica, file);
            renderCatalogFeed();
            showToast(`Áudio da Música ${mIdx + 1} carregado!`, 'success');
          });
        },
        onDelete: () => {
          if (confirm(`Remover Música ${mIdx + 1}?`)) {
            story.musicas.splice(mIdx, 1);
            renderCatalogFeed();
          }
        },
        onUpdate: () => renderCatalogFeed()
      });
      musicasContainer.appendChild(card);
    });
    pkg.querySelector('[data-action="add-musica"]').addEventListener('click', () => {
      addNewItemToStory(story, 'musicas');
    });

    // 3. Trecks
    const trecksContainer = pkg.querySelector(`#trecks-container-${story.id}`);
    trecksContainer.innerHTML = '';
    (story.trecks || []).forEach((trk, tIdx) => {
      const card = createTreckCard(story, trk, tIdx, storyIdx);
      trecksContainer.appendChild(card);
    });
    pkg.querySelector('[data-action="add-treck"]').addEventListener('click', () => {
      addNewItemToStory(story, 'trecks');
    });

    // 4. Desafios
    const desafiosContainer = pkg.querySelector(`#desafios-container-${story.id}`);
    desafiosContainer.innerHTML = '';
    (story.desafios || []).forEach((des, dIdx) => {
      const card = createDesafioCard(story, des, dIdx, storyIdx);
      desafiosContainer.appendChild(card);
    });
    pkg.querySelector('[data-action="add-desafio"]').addEventListener('click', () => {
      addNewItemToStory(story, 'desafios');
    });

    // 5. Livrinhos
    const livrinhosContainer = pkg.querySelector(`#livrinhos-container-${story.id}`);
    livrinhosContainer.innerHTML = '';
    (story.livrinhos || []).forEach((liv, lIdx) => {
      const card = createLivrinhoCard(story, liv, lIdx, storyIdx);
      livrinhosContainer.appendChild(card);
    });
    pkg.querySelector('[data-action="add-livrinho"]').addEventListener('click', () => {
      addNewItemToStory(story, 'livrinhos');
    });

    // 6. Bobies
    const bobiesContainer = pkg.querySelector(`#bobies-container-${story.id}`);
    bobiesContainer.innerHTML = '';
    (story.bobies || []).forEach((bob, bIdx) => {
      const card = createBobieCard(story, bob, bIdx, storyIdx);
      bobiesContainer.appendChild(card);
    });
    pkg.querySelector('[data-action="add-bobie"]').addEventListener('click', () => {
      addNewItemToStory(story, 'bobies');
    });
  }

  // ==========================================================================
  // CARD DE ÁUDIO COM REORDENAÇÃO & DOWNLOAD (CONTOS E MÚSICAS)
  // ==========================================================================
  function createAudioModuleCard({ type, typeColor, sideBg, item, idx, defaultFilePrefix, onMoveUp, onMoveDown, onUploadAudio, onDelete, onUpdate }) {
    const card = document.createElement('div');
    card.className = 'accordion-item-card expanded';
    card.id = `card-${type.toLowerCase()}-${idx}`;

    const num = idx + 1;
    const status = getModuleStatus(item);
    const petFile = item.arquivoPet || `${defaultFilePrefix}${String(num).padStart(4, '0')}.wav`;

    card.innerHTML = `
      <div class="accordion-header" data-action="toggle-accordion">
        <div class="accordion-title-group">
          <div class="package-order-controls" onclick="event.stopPropagation();">
            <button type="button" class="btn-order-arrow" data-action="move-item-up" title="Mover para Cima">▲</button>
            <button type="button" class="btn-order-arrow" data-action="move-item-down" title="Mover para Baixo">▼</button>
          </div>
          <span class="accordion-title">${type} ${String(num).padStart(2, '0')} - ${escapeHtml(item.nomeApp || 'EXEMPLO')}</span>
          <span class="status-badge-traffic ${status.cls}">${status.icon} ${status.label}</span>
          <button type="button" class="btn-header-download" data-action="quick-download-audio" title="Baixar ${petFile}" onclick="event.stopPropagation();">
            ⬇ Baixar ${petFile}
          </button>
        </div>
        <span class="accordion-toggle-arrow">▲</span>
      </div>

      <div class="accordion-body">
        <div class="side-vertical-badge" style="background-color: ${sideBg}; color: ${typeColor};">
          ${type} ${num}
        </div>

        <div class="accordion-content-inner">
          <!-- Linha 1: Nome no APP + Selecionar Áudio + Baixar Áudio -->
          <div class="field-row-horizontal">
            <label class="field-label-inline">Nome no APP</label>
            <input type="text" class="field-input-clean" value="${escapeHtml(item.nomeApp || '')}" placeholder="Nome ${type.toLowerCase()}..." data-field="nomeApp">
            <button type="button" class="btn-mockup-mustard" data-action="upload-audio">Selecionar Áudio</button>
            <button type="button" class="btn-mockup-download" data-action="download-audio" title="Baixar Arquivo ${petFile}">⬇ Baixar Áudio</button>
          </div>

          <!-- Linha 2: Player de Áudio Nativo -->
          <audio controls class="native-audio-player" id="player-${type.toLowerCase()}-${idx}" src="${item.audioUrl || ''}">
            Seu navegador não suporta reprodução de áudio.
          </audio>

          <!-- Linha 3: Arquivo no PET + Numeração Livre -->
          <div class="field-row-horizontal">
            <label class="field-label-inline">Arquivo no PET</label>
            <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(petFile)}" placeholder="${defaultFilePrefix}0001.wav" data-field="arquivoPet" ${item.arquivoPetManual ? '' : 'readonly'}>
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

          <!-- Sub-bloco 2: Ajusta/Cortar com Sanfona + Waveform -->
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
                  <div class="trimmer-param-chip">Início: <input type="number" step="0.05" value="${(item.trimmer?.inicio || 0).toFixed(2)}" data-trim="inicio"></div>
                  <div class="trimmer-param-chip">Fim: <input type="number" step="0.05" value="${(item.trimmer?.fim || 30).toFixed(2)}" data-trim="fim"></div>
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
                    <button type="button" class="btn-mockup-mustard" data-action="upload-img-card">Selecionar Card</button>
                    <button type="button" class="btn-mockup-download" data-action="download-card-img" title="Baixar Card PNG">⬇ Baixar Card</button>
                  </div>
                  <div class="field-row-horizontal">
                    <label class="field-label-inline">Comando no Pet</label>
                    <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(item.cardVinculado?.comandoPet || `c${String(num).padStart(4, '0')}.png`)}" placeholder="c0001.png" data-field="card-comando">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Ações Confirmar / Lixeira / Download -->
          <div class="item-actions-corner">
            <button type="button" class="btn-action-circle download" data-action="download-item-file" title="Baixar Arquivo (${petFile})">⬇</button>
            <button type="button" class="btn-action-circle check" data-action="save-item" title="Confirmar">✔</button>
            <button type="button" class="btn-action-circle delete" data-action="delete-item" title="Excluir">🗑</button>
          </div>

        </div>
      </div>
    `;

    // Reordenação
    card.querySelector('[data-action="move-item-up"]').addEventListener('click', onMoveUp);
    card.querySelector('[data-action="move-item-down"]').addEventListener('click', onMoveDown);

    // Downloads
    const downloadAction = () => {
      triggerDownloadResource(item.audioUrl, petFile, `FEFO Pet Audio: ${petFile}\nNome: ${item.nomeApp || ''}\nRoteiro: ${item.roteiro || ''}`);
    };
    card.querySelector('[data-action="quick-download-audio"]').addEventListener('click', downloadAction);
    card.querySelector('[data-action="download-audio"]').addEventListener('click', downloadAction);
    card.querySelector('[data-action="download-item-file"]').addEventListener('click', downloadAction);

    // Download do Card
    card.querySelector('[data-action="download-card-img"]').addEventListener('click', () => {
      const cardFile = item.cardVinculado?.comandoPet || `c${String(num).padStart(4, '0')}.png`;
      triggerDownloadResource(item.cardVinculado?.imagemUrl, cardFile, `FEFO Pet Card Specification: ${cardFile}\nNome: ${item.cardVinculado?.nome || ''}`);
    });

    // Sanfona do Card
    card.querySelector('[data-action="toggle-accordion"]').addEventListener('click', (e) => {
      if (e.target.closest('.package-order-controls') || e.target.closest('[data-action="quick-download-audio"]')) return;
      card.classList.toggle('expanded');
      card.classList.toggle('collapsed');
    });

    // Inputs
    card.querySelectorAll('input[data-field], textarea[data-field]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const f = e.target.getAttribute('data-field');
        if (f === 'card-nome') {
          item.cardVinculado = item.cardVinculado || {};
          item.cardVinculado.nome = e.target.value;
        } else if (f === 'card-comando') {
          item.cardVinculado = item.cardVinculado || {};
          item.cardVinculado.comandoPet = e.target.value;
        } else {
          item[f] = e.target.value;
        }
      });
    });

    // Uploads
    card.querySelector('[data-action="upload-audio"]').addEventListener('click', onUploadAudio);
    card.querySelector('[data-action="upload-img-card"]').addEventListener('click', () => {
      promptFileUpload('image/png,image/jpeg', (file, dataUrl) => {
        item.cardVinculado = item.cardVinculado || {};
        item.cardVinculado.imagemUrl = dataUrl;
        const imgThumb = card.querySelector('.card-preview-thumbnail');
        if (imgThumb) imgThumb.innerHTML = `<img src="${dataUrl}" alt="Card">`;
        showToast('Card anexado com sucesso!', 'success');
      });
    });

    // Numeração livre
    card.querySelector('[data-action="toggle-manual-number"]').addEventListener('click', () => {
      item.arquivoPetManual = !item.arquivoPetManual;
      const inp = card.querySelector('input[data-field="arquivoPet"]');
      if (inp) {
        if (item.arquivoPetManual) inp.removeAttribute('readonly');
        else inp.setAttribute('readonly', 'true');
      }
      card.querySelector('[data-action="toggle-manual-number"]').textContent = item.arquivoPetManual ? 'Travar Auto' : 'numeração livre';
    });

    card.querySelector('[data-action="save-item"]').addEventListener('click', () => {
      saveCatalogData(false);
      showToast('Item salvo!', 'success');
    });

    card.querySelector('[data-action="delete-item"]').addEventListener('click', onDelete);

    return card;
  }

  // ==========================================================================
  // CARDS DE TRECK, DESAFIO, LIVRINHO E BOBIE COM REORDENAÇÃO & DOWNLOAD
  // ==========================================================================
  function createTreckCard(story, trk, idx, storyIdx) {
    const card = document.createElement('div');
    card.className = 'accordion-item-card expanded';
    card.innerHTML = `
      <div class="accordion-header" data-action="toggle-accordion">
        <div class="accordion-title-group">
          <div class="package-order-controls" onclick="event.stopPropagation();">
            <button type="button" class="btn-order-arrow" data-action="move-up">▲</button>
            <button type="button" class="btn-order-arrow" data-action="move-down">▼</button>
          </div>
          <span class="accordion-title">TRECK ${idx + 1} - ${escapeHtml(trk.nomeAcao || 'AÇÃO MECÂNICA')}</span>
          <span class="status-badge-traffic ${trk.audioUrl ? 'ready' : 'empty'}">${trk.audioUrl ? '🟢 Configurado' : '🔴 Sem Áudio'}</span>
          <button type="button" class="btn-header-download" data-action="quick-download" onclick="event.stopPropagation();">
            ⬇ Baixar ${trk.arquivoPet || 'TRK0001.WAV'}
          </button>
        </div>
        <span class="accordion-toggle-arrow">▲</span>
      </div>
      <div class="accordion-body">
        <div class="side-vertical-badge" style="background-color: #ECFDF5; color: #059669; border-color: #A7F3D0;">
          TRK ${idx + 1}
        </div>
        <div class="accordion-content-inner">
          <div class="field-row-horizontal">
            <label class="field-label-inline">Nome da Ação</label>
            <input type="text" class="field-input-clean" value="${escapeHtml(trk.nomeAcao || '')}" placeholder="Alongamento..." data-trk-field="nomeAcao">
            <button type="button" class="btn-mockup-mustard" data-action="upload-audio">Selecionar Áudio</button>
            <button type="button" class="btn-mockup-download" data-action="download-audio">⬇ Baixar Áudio</button>
          </div>
          <div class="field-row-horizontal">
            <label class="field-label-inline">Arquivo no PET</label>
            <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(trk.arquivoPet || `TRK${String(idx+1).padStart(4, '0')}.WAV`)}" data-trk-field="arquivoPet">
            <label class="field-label-inline">Duração (seg)</label>
            <input type="number" class="field-input-clean" style="max-width: 90px;" value="${trk.duracaoSegundos || 90}" data-trk-field="duracaoSegundos">
          </div>
          <div class="sub-accordion-box">
            <span class="sub-header-title">Instrução Mecânica e Tátil do Robô</span>
            <textarea class="textarea-roteiro" placeholder="Descreva a atividade física..." data-trk-field="instrucao">${escapeHtml(trk.instrucao || '')}</textarea>
          </div>
          <div class="item-actions-corner">
            <button type="button" class="btn-action-circle download" data-action="download-file" title="Baixar">⬇</button>
            <button type="button" class="btn-action-circle delete" data-action="delete" title="Excluir">🗑</button>
          </div>
        </div>
      </div>
    `;

    card.querySelector('[data-action="move-up"]').addEventListener('click', () => moveItemInStory(storyIdx, 'trecks', idx, -1));
    card.querySelector('[data-action="move-down"]').addEventListener('click', () => moveItemInStory(storyIdx, 'trecks', idx, 1));
    
    const downAction = () => triggerDownloadResource(trk.audioUrl, trk.arquivoPet || `TRK${String(idx+1).padStart(4, '0')}.WAV`, `FEFO Treck Instruction: ${trk.instrucao || ''}`);
    card.querySelector('[data-action="quick-download"]').addEventListener('click', downAction);
    card.querySelector('[data-action="download-audio"]').addEventListener('click', downAction);
    card.querySelector('[data-action="download-file"]').addEventListener('click', downAction);

    card.querySelector('[data-action="toggle-accordion"]').addEventListener('click', (e) => {
      if (e.target.closest('.package-order-controls') || e.target.closest('[data-action="quick-download"]')) return;
      card.classList.toggle('expanded');
      card.classList.toggle('collapsed');
    });

    card.querySelectorAll('[data-trk-field]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        trk[e.target.getAttribute('data-trk-field')] = e.target.value;
      });
    });

    card.querySelector('[data-action="upload-audio"]').addEventListener('click', () => {
      promptFileUpload('audio/*', (f, dataUrl) => {
        trk.audioUrl = dataUrl;
        renderCatalogFeed();
        showToast('Áudio do Treck carregado!', 'success');
      });
    });

    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      story.trecks.splice(idx, 1);
      renderCatalogFeed();
    });

    return card;
  }

  function createDesafioCard(story, des, idx, storyIdx) {
    const card = document.createElement('div');
    card.className = 'accordion-item-card expanded';
    card.innerHTML = `
      <div class="accordion-header" data-action="toggle-accordion">
        <div class="accordion-title-group">
          <div class="package-order-controls" onclick="event.stopPropagation();">
            <button type="button" class="btn-order-arrow" data-action="move-up">▲</button>
            <button type="button" class="btn-order-arrow" data-action="move-down">▼</button>
          </div>
          <span class="accordion-title">DESAFIO ${idx + 1} - ${escapeHtml(des.titulo || 'MISSÃO')}</span>
          <span class="status-badge-traffic ready">🟢 Interativo</span>
          <button type="button" class="btn-header-download" data-action="quick-download" onclick="event.stopPropagation();">
            ⬇ Baixar ${des.audioPergunta || 'a0002.wav'}
          </button>
        </div>
        <span class="accordion-toggle-arrow">▲</span>
      </div>
      <div class="accordion-body">
        <div class="side-vertical-badge" style="background-color: #FAF5FF; color: #7C3AED; border-color: #E9D5FF;">
          DES ${idx + 1}
        </div>
        <div class="accordion-content-inner">
          <div class="field-row-horizontal">
            <label class="field-label-inline">Título da Missão</label>
            <input type="text" class="field-input-clean" value="${escapeHtml(des.titulo || '')}" placeholder="Onde está o Card...?" data-des-field="titulo">
          </div>
          <div class="field-row-horizontal">
            <label class="field-label-inline">Card Esperado</label>
            <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(des.cardEsperado || `c${String(idx+1).padStart(4, '0')}.png`)}" data-des-field="cardEsperado">
            <label class="field-label-inline">Áudio Pergunta</label>
            <input type="text" class="field-input-clean field-input-mono" value="${escapeHtml(des.audioPergunta || 'a0002.wav')}" data-des-field="audioPergunta">
            <button type="button" class="btn-mockup-download" data-action="download-audio">⬇ Baixar Áudio</button>
          </div>
          <div class="item-actions-corner">
            <button type="button" class="btn-action-circle download" data-action="download-file" title="Baixar">⬇</button>
            <button type="button" class="btn-action-circle delete" data-action="delete" title="Excluir">🗑</button>
          </div>
        </div>
      </div>
    `;

    card.querySelector('[data-action="move-up"]').addEventListener('click', () => moveItemInStory(storyIdx, 'desafios', idx, -1));
    card.querySelector('[data-action="move-down"]').addEventListener('click', () => moveItemInStory(storyIdx, 'desafios', idx, 1));
    
    const downAction = () => triggerDownloadResource(des.audioUrl, des.audioPergunta || 'a0002.wav', `FEFO Mission Challenge: ${des.titulo || ''}`);
    card.querySelector('[data-action="quick-download"]').addEventListener('click', downAction);
    card.querySelector('[data-action="download-audio"]').addEventListener('click', downAction);
    card.querySelector('[data-action="download-file"]').addEventListener('click', downAction);

    card.querySelector('[data-action="toggle-accordion"]').addEventListener('click', (e) => {
      if (e.target.closest('.package-order-controls') || e.target.closest('[data-action="quick-download"]')) return;
      card.classList.toggle('expanded');
      card.classList.toggle('collapsed');
    });

    card.querySelectorAll('[data-des-field]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        des[e.target.getAttribute('data-des-field')] = e.target.value;
      });
    });

    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      story.desafios.splice(idx, 1);
      renderCatalogFeed();
    });

    return card;
  }

  function createLivrinhoCard(story, liv, idx, storyIdx) {
    const card = document.createElement('div');
    card.className = 'accordion-item-card expanded';
    card.innerHTML = `
      <div class="accordion-header" data-action="toggle-accordion">
        <div class="accordion-title-group">
          <div class="package-order-controls" onclick="event.stopPropagation();">
            <button type="button" class="btn-order-arrow" data-action="move-up">▲</button>
            <button type="button" class="btn-order-arrow" data-action="move-down">▼</button>
          </div>
          <span class="accordion-title">LIVRINHO ${String(idx + 1).padStart(2, '0')} - ${escapeHtml(liv.nome || 'EXEMPLO')}</span>
          <span class="status-badge-traffic ${liv.pdfUrl ? 'ready' : 'empty'}">${liv.pdfUrl ? '🟢 PDF Pronto' : '🔴 Sem PDF'}</span>
          <button type="button" class="btn-header-download" data-action="quick-download" onclick="event.stopPropagation();">
            ⬇ Baixar PDF
          </button>
        </div>
        <span class="accordion-toggle-arrow">▲</span>
      </div>
      <div class="accordion-body">
        <div class="pdf-material-card-body" style="width: 100%;">
          <div class="pdf-preview-box">
            ${liv.capaUrl ? `<img src="${liv.capaUrl}" alt="Capa">` : `<span style="font-size: 2.25rem;">📖</span>`}
          </div>
          <div class="pdf-fields-col">
            <div class="field-row-horizontal">
              <label class="field-label-inline">Nome no Catálogo</label>
              <input type="text" class="field-input-clean" value="${escapeHtml(liv.nome || '')}" placeholder="LIVRINHO..." data-liv-field="nome">
              <button type="button" class="btn-mockup-mustard" data-action="upload-pdf">Selecionar PDF</button>
              <button type="button" class="btn-mockup-download" data-action="download-pdf">⬇ Baixar PDF</button>
            </div>
          </div>
          <div class="item-actions-corner">
            <button type="button" class="btn-action-circle download" data-action="download-file" title="Baixar">⬇</button>
            <button type="button" class="btn-action-circle delete" data-action="delete" title="Excluir">🗑</button>
          </div>
        </div>
      </div>
    `;

    card.querySelector('[data-action="move-up"]').addEventListener('click', () => moveItemInStory(storyIdx, 'livrinhos', idx, -1));
    card.querySelector('[data-action="move-down"]').addEventListener('click', () => moveItemInStory(storyIdx, 'livrinhos', idx, 1));
    
    const downAction = () => triggerDownloadResource(liv.pdfUrl, `${liv.nome || 'livrinho'}.pdf`, `FEFO PDF: ${liv.nome || ''}`);
    card.querySelector('[data-action="quick-download"]').addEventListener('click', downAction);
    card.querySelector('[data-action="download-pdf"]').addEventListener('click', downAction);
    card.querySelector('[data-action="download-file"]').addEventListener('click', downAction);

    card.querySelector('[data-action="toggle-accordion"]').addEventListener('click', (e) => {
      if (e.target.closest('.package-order-controls') || e.target.closest('[data-action="quick-download"]')) return;
      card.classList.toggle('expanded');
      card.classList.toggle('collapsed');
    });

    card.querySelector('input[data-liv-field="nome"]').addEventListener('input', (e) => {
      liv.nome = e.target.value;
    });

    card.querySelector('[data-action="upload-pdf"]').addEventListener('click', () => {
      promptFileUpload('application/pdf', (f, dataUrl) => {
        liv.pdfUrl = dataUrl;
        liv.nomeArquivo = f.name;
        renderCatalogFeed();
        showToast(`PDF "${f.name}" carregado!`, 'success');
      });
    });

    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      story.livrinhos.splice(idx, 1);
      renderCatalogFeed();
    });

    return card;
  }

  function createBobieCard(story, bob, idx, storyIdx) {
    const card = document.createElement('div');
    card.className = 'accordion-item-card expanded';
    card.innerHTML = `
      <div class="accordion-header" data-action="toggle-accordion">
        <div class="accordion-title-group">
          <div class="package-order-controls" onclick="event.stopPropagation();">
            <button type="button" class="btn-order-arrow" data-action="move-up">▲</button>
            <button type="button" class="btn-order-arrow" data-action="move-down">▼</button>
          </div>
          <span class="accordion-title">BOBIE GOD ${String(idx + 1).padStart(2, '0')} - ${escapeHtml(bob.nome || 'EXEMPLO')}</span>
          <span class="status-badge-traffic ${bob.pdfUrl ? 'ready' : 'empty'}">${bob.pdfUrl ? '🟢 PDF Pronto' : '🔴 Sem PDF'}</span>
          <button type="button" class="btn-header-download" data-action="quick-download" onclick="event.stopPropagation();">
            ⬇ Baixar PDF
          </button>
        </div>
        <span class="accordion-toggle-arrow">▲</span>
      </div>
      <div class="accordion-body">
        <div class="pdf-material-card-body" style="width: 100%;">
          <div class="pdf-preview-box">
            ${bob.capaUrl ? `<img src="${bob.capaUrl}" alt="Capa">` : `<span style="font-size: 2.25rem;">🎨</span>`}
          </div>
          <div class="pdf-fields-col">
            <div class="field-row-horizontal">
              <label class="field-label-inline">Nome no Catálogo</label>
              <input type="text" class="field-input-clean" value="${escapeHtml(bob.nome || '')}" placeholder="COLORIR..." data-bob-field="nome">
              <button type="button" class="btn-mockup-mustard" data-action="upload-pdf">Selecionar PDF</button>
              <button type="button" class="btn-mockup-download" data-action="download-pdf">⬇ Baixar PDF</button>
            </div>
          </div>
          <div class="item-actions-corner">
            <button type="button" class="btn-action-circle download" data-action="download-file" title="Baixar">⬇</button>
            <button type="button" class="btn-action-circle delete" data-action="delete" title="Excluir">🗑</button>
          </div>
        </div>
      </div>
    `;

    card.querySelector('[data-action="move-up"]').addEventListener('click', () => moveItemInStory(storyIdx, 'bobies', idx, -1));
    card.querySelector('[data-action="move-down"]').addEventListener('click', () => moveItemInStory(storyIdx, 'bobies', idx, 1));
    
    const downAction = () => triggerDownloadResource(bob.pdfUrl, `${bob.nome || 'bobie_colorir'}.pdf`, `FEFO Coloring: ${bob.nome || ''}`);
    card.querySelector('[data-action="quick-download"]').addEventListener('click', downAction);
    card.querySelector('[data-action="download-pdf"]').addEventListener('click', downAction);
    card.querySelector('[data-action="download-file"]').addEventListener('click', downAction);

    card.querySelector('[data-action="toggle-accordion"]').addEventListener('click', (e) => {
      if (e.target.closest('.package-order-controls') || e.target.closest('[data-action="quick-download"]')) return;
      card.classList.toggle('expanded');
      card.classList.toggle('collapsed');
    });

    card.querySelector('input[data-bob-field="nome"]').addEventListener('input', (e) => {
      bob.nome = e.target.value;
    });

    card.querySelector('[data-action="upload-pdf"]').addEventListener('click', () => {
      promptFileUpload('application/pdf,image/png,image/jpeg', (f, dataUrl) => {
        bob.pdfUrl = dataUrl;
        bob.nomeArquivo = f.name;
        renderCatalogFeed();
        showToast(`Material de colorir "${f.name}" carregado!`, 'success');
      });
    });

    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      story.bobies.splice(idx, 1);
      renderCatalogFeed();
    });

    return card;
  }

  // ==========================================================================
  // FUNÇÕES DE REORDENAÇÃO & GERENCIAMENTO DE ITENS
  // ==========================================================================
  function moveStory(storyIdx, delta) {
    const newIdx = storyIdx + delta;
    if (newIdx < 0 || newIdx >= catalogState.historinhas.length) return;
    const temp = catalogState.historinhas[storyIdx];
    catalogState.historinhas[storyIdx] = catalogState.historinhas[newIdx];
    catalogState.historinhas[newIdx] = temp;
    saveCatalogData(false);
    renderCatalogFeed();
    showToast('Ordem dos pacotes atualizada!', 'info');
  }

  function moveItemInStory(storyIdx, listKey, itemIdx, delta) {
    const story = catalogState.historinhas[storyIdx];
    if (!story || !story[listKey]) return;
    const newIdx = itemIdx + delta;
    if (newIdx < 0 || newIdx >= story[listKey].length) return;
    const temp = story[listKey][itemIdx];
    story[listKey][itemIdx] = story[listKey][newIdx];
    story[listKey][newIdx] = temp;
    saveCatalogData(false);
    renderCatalogFeed();
    showToast('Item reposicionado!', 'info');
  }

  function addNewPackage(targetEixoId = null) {
    const defaultEixo = (catalogState.eixos && catalogState.eixos[0]) ? catalogState.eixos[0].id : "eixo-01";
    const finalEixoId = targetEixoId || defaultEixo;
    const newNum = catalogState.historinhas.length + 1;
    const newStory = createDefaultStory(newNum, finalEixoId);
    catalogState.historinhas.push(newStory);
    expandedStories.add(newStory.id);
    saveCatalogData(false);
    renderCatalogFeed();
    
    setTimeout(() => {
      const el = document.getElementById(`pkg-${newStory.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    showToast(`Novo Pacote criado no Eixo Selecionado!`, 'success');
  }

  function addNewItemToStory(story, type) {
    if (!story[type]) story[type] = [];
    const num = story[type].length + 1;

    if (type === 'contos') {
      story.contos.push({
        id: `conto_${Date.now()}`,
        nomeApp: `PARTE ${String(num).padStart(2, '0')}`,
        arquivoPet: `a${String(num).padStart(4, '0')}.wav`,
        arquivoPetManual: false,
        audioUrl: "",
        facePet: "f0001.raw",
        roteiro: "",
        trimmer: { inicio: 0, fim: 30, fadeIn: 0.2, fadeOut: 0.2, duracao: 30 },
        status: "empty",
        cardVinculado: {
          nome: `CARD ${String(num).padStart(3, '0')}`,
          comandoPet: `c${String(num).padStart(4, '0')}.png`,
          imagemUrl: ""
        }
      });
    } else if (type === 'musicas') {
      story.musicas.push({
        id: `mus_${Date.now()}`,
        nomeApp: `MÚSICA ${String(num).padStart(2, '0')}`,
        arquivoPet: `a${String(num + 10).padStart(4, '0')}.wav`,
        arquivoPetManual: false,
        audioUrl: "",
        facePet: "f0001.raw",
        roteiro: "",
        trimmer: { inicio: 0, fim: 45, fadeIn: 0.2, fadeOut: 0.2, duracao: 45 },
        status: "empty",
        cardVinculado: {
          nome: `CARD MÚSICA ${num}`,
          comandoPet: `c${String(num + 10).padStart(4, '0')}.png`,
          imagemUrl: ""
        }
      });
    } else if (type === 'trecks') {
      story.trecks.push({
        id: `trk_${Date.now()}`,
        nomeAcao: "Nova Ação Mecânica",
        arquivoPet: `TRK${String(num).padStart(4, '0')}.WAV`,
        duracaoSegundos: 90,
        instrucao: ""
      });
    } else if (type === 'desafios') {
      story.desafios.push({
        id: `des_${Date.now()}`,
        titulo: "Nova Missão Interativa",
        cardEsperado: `c${String(num).padStart(4, '0')}.png`,
        audioPergunta: `a${String(num + 1).padStart(4, '0')}.wav`,
        facePet: "f0001.raw"
      });
    } else if (type === 'livrinhos') {
      story.livrinhos.push({
        id: `liv_${Date.now()}`,
        nome: "NOVO LIVRINHO",
        pdfUrl: "",
        capaUrl: ""
      });
    } else if (type === 'bobies') {
      story.bobies.push({
        id: `bob_${Date.now()}`,
        nome: "NOVO COLORIR",
        pdfUrl: "",
        capaUrl: ""
      });
    }

    renderCatalogFeed();
    showToast(`Novo item adicionado!`, 'success');
  }

  // ==========================================================================
  // DOWNLOAD DIRETO DE ARQUIVOS / RECURSOS DO ITEM
  // ==========================================================================
  function triggerDownloadResource(urlOrBase64, filename, defaultFallbackText = "") {
    if (urlOrBase64 && (urlOrBase64.startsWith('data:') || urlOrBase64.startsWith('http') || urlOrBase64.startsWith('/') || urlOrBase64.startsWith('.'))) {
      const a = document.createElement('a');
      a.href = urlOrBase64;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast(`Baixando "${filename}"...`, 'success');
    } else {
      const content = defaultFallbackText || `FEFO Resource Package\nArquivo: ${filename}\nData: ${new Date().toISOString()}`;
      const blob = new Blob([content], { type: 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      showToast(`Baixando especificação "${filename}"...`, 'info');
    }
  }

  // ==========================================================================
  // DOWNLOAD TOTAL DO PACOTE (MANIFESTO SD / JSON)
  // ==========================================================================
  function gerarBundleSD(targetStory = null) {
    const storiesToExport = targetStory ? [targetStory] : catalogState.historinhas;
    const bundleName = targetStory ? `bundle_sd_${targetStory.codigo || 'h01'}` : `bundle_sd_completo`;

    const manifest = {
      bundle_id: `pkg_${Date.now()}`,
      versao: catalogState.catalogVersion || 'v4.001',
      versao_codigo: catalogState.versionCode || 4001,
      total_pacotes: storiesToExport.length,
      pacotes: storiesToExport.map(story => ({
        id: story.id,
        codigo: story.codigo,
        titulo: story.titulo,
        eixoId: story.eixoId,
        licencas: story.licencas,
        estrutura_sdcard: {
          audio_dir: "/usr/a/",
          faces_dir: "/usr/f/",
          cards_dir: "/usr/c/"
        },
        arquivos_audio: (story.contos || []).map((c, i) => ({
          arquivo: c.arquivoPet || `a${String(i+1).padStart(4, '0')}.wav`,
          tipo: "conto",
          nome_app: c.nomeApp,
          url: c.audioUrl || ""
        })).concat((story.musicas || []).map((m, i) => ({
          arquivo: m.arquivoPet || `a${String(i+11).padStart(4, '0')}.wav`,
          tipo: "musica",
          nome_app: m.nomeApp,
          url: m.audioUrl || ""
        }))),
        arquivos_faces: [
          { arquivo: "f0001.raw", nome: "Face Padrão CYD 480x320 RGB565" }
        ],
        arquivos_cards: (story.contos || []).map((c, i) => ({
          card_id: `c${String(i+1).padStart(4, '0')}.png`,
          uid_rfid: `AUTO_${String(i+1).padStart(3, '0')}`,
          toca_audio: c.arquivoPet || `a${String(i+1).padStart(4, '0')}.wav`,
          mostra_face: c.facePet || "f0001.raw"
        })),
        atividades_didaticas: (story.livrinhos || []).concat(story.bobies || []).map(item => ({
          titulo: item.nome || item.nomeApp,
          arquivo_download: item.pdfUrl || item.imagemUrl || "",
          tipo: "pdf_impressao"
        }))
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(manifest, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${bundleName}_${manifest.versao}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    showToast(`📦 Download do pacote realizado com sucesso!`, 'success');
  }

  function exportCatalogJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(catalogState, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `catalog-v4_${catalogState.catalogVersion || 'latest'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ==========================================================================
  // UTILITÁRIOS GLOBAIS
  // ==========================================================================
  function promptFileUpload(accept, callback) {
    const input = document.getElementById('file-uploader-general');
    if (!input) return;
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

  function showToast(msg, type = 'info') {
    const c = document.getElementById('v3-toast-container');
    if (!c) return;
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
