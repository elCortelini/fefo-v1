/**
 * ==========================================================================
 * FEFO CATALOG ADMIN v3 - MOTOR DE DADOS, REGRAS DE NEGÓCIO & UX
 * ==========================================================================
 * - Duplo Versionamento: Versão Global (v3.001) e Código do Tema (tXX.YY)
 * - 8 Eixos Temáticos Gerenciáveis
 * - Materiais Físicos (Livrinho, Bobie Gods, Caderno) & Mídias
 * - Hardware FEFO (Treck-Treck, Cards RFID, Músicas & Mindfulness, Desafios)
 * - Local-First & Exportação JSON
 */

(() => {
  'use strict';

  // Chaves de armazenamento Local-First
  const STORAGE_KEY = 'fefo_catalog_v3_data';
  const DEFAULT_REPO_PATH = '../repository/catalog-v3.json';

  // Estado Central da Aplicação v3
  let catalogState = {
    schema: 3,
    catalogVersion: "v3.001",
    versionCode: 3001,
    lastUpdated: new Date().toISOString(),
    repository: "FEFO Ecosystem v3",
    eixos: [],
    temas: []
  };

  // Estado do Editor de Tema
  let currentEditingIndex = -1; // -1 para novo tema
  let currentStep = 1;
  const TOTAL_STEPS = 5;

  // Buffer temporário para listas dinâmicas no formulário
  let tempBobies = [];
  let tempMusicas = [];
  let tempCardsRfid = [];
  let tempDesafios = [];

  // ==========================================================================
  // INICIALIZAÇÃO DA APLICAÇÃO
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    initSimulator();
    initNavigationTabs();
    initStepper();
    initFilterEvents();
    initModalEvents();
    initGlobalVersionControl();
    initIOEvents();

    await loadCatalogData();
    renderAll();
  });

  // ==========================================================================
  // CARREGAMENTO & PERSISTÊNCIA (LOCAL-FIRST)
  // ==========================================================================
  async function loadCatalogData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        catalogState = JSON.parse(saved);
        showToast('Catálogo v3 carregado do armazenamento local.', 'success');
        return;
      } catch (err) {
        console.error('Falha ao ler dados locais:', err);
      }
    }

    // Tentar carregar do arquivo catalog-v3.json relativo
    try {
      const response = await fetch(DEFAULT_REPO_PATH);
      if (response.ok) {
        catalogState = await response.json();
        saveToLocalStorage(false);
        showToast('Catálogo v3 sincronizado com o repositório.', 'success');
        return;
      }
    } catch (e) {
      console.warn('Repositório remoto inacessível localmente, usando semente padrão.');
    }

    // Semente padrão caso não encontre
    if (!catalogState.eixos || catalogState.eixos.length === 0) {
      catalogState.eixos = getSeedEixos();
    }
  }

  function saveToLocalStorage(notify = true) {
    catalogState.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogState, null, 2));
    updateFooterStats();
    if (notify) {
      showToast('Alterações salvas localmente com sucesso!', 'success');
    }
  }

  function getSeedEixos() {
    return [
      { id: "eixo-01", nome: "Rotina & Hábitos", descricao: "Organização do dia, horários e autonomia.", icone: "⏰", cor: "#FF6B6B" },
      { id: "eixo-02", nome: "Autocuidado & Higiene", descricao: "Escovação dos dentes, banho e cuidado com o corpo.", icone: "🪥", cor: "#4ECDC4" },
      { id: "eixo-03", nome: "Emoções & Autorregulação", descricao: "Identificação e acolhimento das emoções.", icone: "💛", cor: "#FFD166" },
      { id: "eixo-04", nome: "Alimentação Saudável", descricao: "Exploração de sabores e cores no prato.", icone: "🍎", cor: "#06D6A0" },
      { id: "eixo-05", nome: "Socialização & Empatia", descricao: "Compartilhar, gentileza e convivência.", icone: "🤝", cor: "#118AB2" },
      { id: "eixo-06", nome: "Movimento & Coordenação", descricao: "Expressão corporal, dança e equilíbrio.", icone: "🏃", cor: "#8338EC" },
      { id: "eixo-07", nome: "Linguagem & Imaginação", descricao: "Histórias fantásticas, vocabulário e rimas.", icone: "📚", cor: "#3A86FF" },
      { id: "eixo-08", nome: "Ciência & Natureza", descricao: "Ciclos naturais, bichinhos e o mundo ao redor.", icone: "🌱", cor: "#2EC4B6" }
    ];
  }

  // ==========================================================================
  // RENDERIZAÇÃO PRINCIPAL
  // ==========================================================================
  function renderAll() {
    renderTemas();
    renderEixos();
    renderFilterSelects();
    updateFooterStats();
    updateHeaderCounters();
  }

  function updateHeaderCounters() {
    document.getElementById('count-temas').textContent = catalogState.temas ? catalogState.temas.length : 0;
    document.getElementById('count-eixos').textContent = catalogState.eixos ? catalogState.eixos.length : 0;
  }

  function updateFooterStats() {
    const totalTemas = catalogState.temas ? catalogState.temas.length : 0;
    const totalEixos = catalogState.eixos ? catalogState.eixos.length : 0;
    
    document.getElementById('footer-stats').textContent = `${totalTemas} Tema(s) • ${totalEixos} Eixos Ativos`;
    document.getElementById('catalog-global-version').textContent = catalogState.catalogVersion || 'v3.001';
    
    if (catalogState.lastUpdated) {
      const d = new Date(catalogState.lastUpdated);
      document.getElementById('footer-last-sync').textContent = `Atualizado em: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  }

  // ==========================================================================
  // ABA 1: TEMAS PEDAGÓGICOS (RENDER & FILTROS)
  // ==========================================================================
  function renderTemas() {
    const container = document.getElementById('temas-container');
    const emptyState = document.getElementById('temas-empty');
    const searchVal = document.getElementById('search-temas').value.trim().toLowerCase();
    const filterEixo = document.getElementById('filter-eixo').value;
    const sortVal = document.getElementById('sort-temas').value;

    let temas = [...(catalogState.temas || [])];

    // Filtros
    if (filterEixo !== 'todos') {
      temas = temas.filter(t => t.eixoId === filterEixo);
    }
    if (searchVal) {
      temas = temas.filter(t => 
        (t.codigo && t.codigo.toLowerCase().includes(searchVal)) ||
        (t.titulo && t.titulo.toLowerCase().includes(searchVal)) ||
        (t.descricao && t.descricao.toLowerCase().includes(searchVal))
      );
    }

    // Ordenação
    temas.sort((a, b) => {
      if (sortVal === 'codigo-asc') return (a.codigo || '').localeCompare(b.codigo || '');
      if (sortVal === 'codigo-desc') return (b.codigo || '').localeCompare(a.codigo || '');
      if (sortVal === 'titulo-asc') return (a.titulo || '').localeCompare(b.titulo || '');
      return 0;
    });

    container.innerHTML = '';

    if (temas.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    temas.forEach((tema, idx) => {
      const realIndex = catalogState.temas.findIndex(t => t.codigo === tema.codigo);
      const card = createTemaCardElement(tema, realIndex);
      container.appendChild(card);
    });
  }

  function createTemaCardElement(tema, realIndex) {
    const card = document.createElement('article');
    card.className = 'tema-card';

    const eixo = (catalogState.eixos || []).find(e => e.id === tema.eixoId) || {
      nome: 'Eixo Geral',
      icone: '📌',
      cor: '#94A3B8'
    };

    // Verificação de recursos configurados
    const hasAudio = !!(tema.materiais?.historiaAudio?.arquivo || tema.materiais?.historiaAudio?.url);
    const hasLivro = !!(tema.materiais?.livrinhoPdf?.arquivo || tema.materiais?.livrinhoPdf?.url);
    const hasTreck = !!(tema.interacoesFefo?.treckTreck?.ativo);
    const countCards = tema.interacoesFefo?.cardsRfid?.length || 0;
    const countDesafios = tema.interacoesFefo?.desafios?.length || 0;

    card.innerHTML = `
      <div class="tema-card-header">
        <span class="tema-code-pill">${escapeHtml(tema.codigo || 't00.00')}</span>
        <span class="tema-eixo-badge" style="background-color: ${eixo.cor}20; color: ${eixo.cor}; border: 1px solid ${eixo.cor}40;">
          <span>${eixo.icone}</span> ${escapeHtml(eixo.nome)}
        </span>
      </div>

      <div class="tema-card-body">
        <h3 class="tema-card-title">${escapeHtml(tema.titulo || 'Sem Título')}</h3>
        <p class="tema-card-desc">${escapeHtml(tema.descricao || 'Sem descrição cadastrada.')}</p>

        <div class="tema-features">
          <span class="feature-tag ${hasAudio ? 'active' : ''}">🎧 Áudio</span>
          <span class="feature-tag ${hasLivro ? 'active' : ''}">📖 Livrinho</span>
          <span class="feature-tag ${hasTreck ? 'active' : ''}">⚙️ Treck</span>
          <span class="feature-tag ${countCards > 0 ? 'active' : ''}">🎴 ${countCards} Cards</span>
          <span class="feature-tag ${countDesafios > 0 ? 'active' : ''}">🏆 ${countDesafios} Desafios</span>
        </div>
      </div>

      <div class="tema-card-footer">
        <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">
          👶 ${escapeHtml(tema.faixaEtaria || '2 a 5 anos')}
        </span>
        <div class="tema-card-actions">
          <button class="btn btn-secondary btn-chip" data-action="testar" data-index="${realIndex}" title="Testar no Simulador">
            Simular
          </button>
          <button class="btn btn-secondary btn-chip" data-action="editar" data-index="${realIndex}" title="Editar este Tema">
            Editar
          </button>
          <button class="btn btn-danger-outline btn-chip" data-action="excluir" data-index="${realIndex}" title="Excluir Tema">
            Excluir
          </button>
        </div>
      </div>
    `;

    // Eventos de Ação do Card
    card.querySelector('[data-action="editar"]').addEventListener('click', () => openEditorForTema(realIndex));
    card.querySelector('[data-action="excluir"]').addEventListener('click', () => deleteTema(realIndex));
    card.querySelector('[data-action="testar"]').addEventListener('click', () => previewTemaInSimulator(tema));

    return card;
  }

  // ==========================================================================
  // ABA 2: 8 EIXOS TEMÁTICOS (RENDER & GESTÃO)
  // ==========================================================================
  function renderEixos() {
    const container = document.getElementById('eixos-container');
    container.innerHTML = '';

    (catalogState.eixos || []).forEach((eixo, idx) => {
      const temasCount = (catalogState.temas || []).filter(t => t.eixoId === eixo.id).length;

      const card = document.createElement('div');
      card.className = 'eixo-card';
      card.innerHTML = `
        <div class="eixo-icon-box" style="background-color: ${eixo.cor}25; color: ${eixo.cor};">
          ${eixo.icone}
        </div>
        <div class="eixo-card-body">
          <h3>${escapeHtml(eixo.nome)}</h3>
          <p>${escapeHtml(eixo.descricao)}</p>
          <div class="eixo-meta-count">
            📚 ${temasCount} tema(s) associado(s)
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderFilterSelects() {
    const filterSelect = document.getElementById('filter-eixo');
    const modalSelect = document.getElementById('tema-eixo');

    const currentFilter = filterSelect.value;
    filterSelect.innerHTML = '<option value="todos">Todos os Eixos Temáticos</option>';
    modalSelect.innerHTML = '';

    (catalogState.eixos || []).forEach(eixo => {
      const opt1 = document.createElement('option');
      opt1.value = eixo.id;
      opt1.textContent = `${eixo.icone} ${eixo.nome}`;
      filterSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = eixo.id;
      opt2.textContent = `${eixo.icone} ${eixo.nome}`;
      modalSelect.appendChild(opt2);
    });

    if (currentFilter && filterSelect.querySelector(`option[value="${currentFilter}"]`)) {
      filterSelect.value = currentFilter;
    }
  }

  // ==========================================================================
  // ABA 3: SIMULADOR DE HARDWARE DO ROBÔ FEFO
  // ==========================================================================
  function initSimulator() {
    const presetButtons = document.querySelectorAll('.preset-buttons button');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const led = btn.getAttribute('data-test-led');
        const face = btn.getAttribute('data-test-face');
        const vibe = btn.getAttribute('data-test-vibe');
        updateSimulatorHardware({ led, rosto: face, vibracao: vibe });
      });
    });
  }

  function updateSimulatorHardware(profile) {
    if (!profile) return;

    // 1. Atualizar Halo de LED
    const halo = document.getElementById('sim-led-halo');
    const ledHex = document.getElementById('sim-led-hex');
    const color = profile.led || '#00FFCC';
    
    halo.style.borderColor = color;
    halo.style.boxShadow = `0 0 35px ${color}`;
    halo.style.background = `${color}15`;
    ledHex.textContent = color.toUpperCase();

    // 2. Atualizar Display OLED
    const faceContainer = document.getElementById('sim-oled-face');
    const label = document.getElementById('sim-oled-label');
    const faceType = profile.rosto || 'feliz';

    label.textContent = `Rosto: ${faceType.toUpperCase()}`;
    faceContainer.style.color = color;
    faceContainer.style.textShadow = `0 0 10px ${color}`;

    switch (faceType) {
      case 'feliz':
        faceContainer.innerHTML = '<span class="oled-eye left">^</span><span class="oled-mouth">‿</span><span class="oled-eye right">^</span>';
        break;
      case 'animado':
        faceContainer.innerHTML = '<span class="oled-eye left">></span><span class="oled-mouth">ヮ</span><span class="oled-eye right"><</span>';
        break;
      case 'comemorando':
        faceContainer.innerHTML = '<span class="oled-eye left">★</span><span class="oled-mouth">▽</span><span class="oled-eye right">★</span>';
        break;
      case 'zen':
        faceContainer.innerHTML = '<span class="oled-eye left">-</span><span class="oled-mouth">_</span><span class="oled-eye right">-</span>';
        break;
      case 'cantando':
        faceContainer.innerHTML = '<span class="oled-eye left">♪</span><span class="oled-mouth">o</span><span class="oled-eye right">♫</span>';
        break;
      case 'alerta':
      case 'piscando':
        faceContainer.innerHTML = '<span class="oled-eye left">●</span><span class="oled-mouth">_</span><span class="oled-eye right">─</span>';
        break;
      default:
        faceContainer.innerHTML = '<span class="oled-eye left">^</span><span class="oled-mouth">‿</span><span class="oled-eye right">^</span>';
    }

    // 3. Atualizar Vibração
    const vibeName = document.getElementById('sim-vibe-name');
    vibeName.textContent = `Padrão: ${formatVibeName(profile.vibracao)}`;
  }

  function formatVibeName(vibe) {
    switch (vibe) {
      case 'pulsar_suave': return 'Pulsar Suave';
      case 'ritmica': return 'Rítmica Contínua';
      case 'curta': return 'Toque Curto';
      case 'ondas': return 'Ondas Graduais';
      case 'sucesso': return 'Comemoração Sucesso';
      case 'duplo_toque': return 'Duplo Toque';
      default: return 'Padrão Suave';
    }
  }

  function previewTemaInSimulator(tema) {
    // Muda para a aba do simulador e aplica perfil
    document.querySelector('.nav-tab[data-tab="simulador"]').click();

    // Preferência de perfil: desafio > treck > card > padrão
    let profile = { led: "#00FFCC", rosto: "feliz", vibracao: "pulsar_suave" };
    if (tema.interacoesFefo?.treckTreck?.perfilHardware) {
      profile = tema.interacoesFefo.treckTreck.perfilHardware;
    } else if (tema.interacoesFefo?.cardsRfid?.[0]?.perfilHardware) {
      profile = tema.interacoesFefo.cardsRfid[0].perfilHardware;
    }

    updateSimulatorHardware(profile);
    showToast(`Testando perfil do tema ${tema.codigo} no simulador!`, 'info');
  }

  // ==========================================================================
  // NAVEGAÇÃO ENTRE ABAS
  // ==========================================================================
  function initNavigationTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        const targetPane = document.getElementById(`pane-${tab.dataset.tab}`);
        if (targetPane) targetPane.style.display = 'block';
      });
    });
  }

  // ==========================================================================
  // EDITOR DE TEMA (STEPPER & CHUNKS DE MILLER)
  // ==========================================================================
  function initStepper() {
    const stepBtns = document.querySelectorAll('.step-btn');
    stepBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        goToStep(parseInt(btn.dataset.step, 10));
      });
    });

    document.getElementById('btn-step-prev').addEventListener('click', () => {
      if (currentStep > 1) goToStep(currentStep - 1);
    });

    document.getElementById('btn-step-next').addEventListener('click', () => {
      if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
    });
  }

  function goToStep(stepNumber) {
    currentStep = stepNumber;

    // Atualiza Abas do Stepper
    document.querySelectorAll('.step-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.step, 10) === currentStep);
    });

    // Atualiza Painéis do Formulário
    document.querySelectorAll('.form-step').forEach((pane, idx) => {
      pane.style.display = (idx + 1 === currentStep) ? 'block' : 'none';
    });

    // Atualiza Rótulos e Barra de Progresso
    const labels = [
      "Passo 1 de 5: Informações & Eixo",
      "Passo 2 de 5: Materiais Físicos",
      "Passo 3 de 5: FEFO Físico & Músicas",
      "Passo 4 de 5: Cards RFID Interativos",
      "Passo 5 de 5: Desafios & Missões"
    ];

    document.getElementById('stepper-label').textContent = labels[currentStep - 1];
    const pct = Math.round((currentStep / TOTAL_STEPS) * 100);
    document.getElementById('stepper-percent').textContent = `${pct}% concluído`;
    document.getElementById('stepper-progress-fill').style.width = `${pct}%`;

    // Visibilidade dos Botões Anterior/Próximo
    document.getElementById('btn-step-prev').style.visibility = (currentStep === 1) ? 'hidden' : 'visible';
    document.getElementById('btn-step-next').style.display = (currentStep === TOTAL_STEPS) ? 'none' : 'inline-flex';
  }

  function openEditorForTema(index) {
    currentEditingIndex = index;
    goToStep(1);

    if (index >= 0) {
      // Editar existente
      const tema = catalogState.temas[index];
      document.getElementById('modal-tema-title').textContent = `Editar Tema: ${tema.codigo}`;
      document.getElementById('modal-tema-subtitle').textContent = `Atualização de Conteúdo v3`;
      populateFormWithTema(tema);
    } else {
      // Novo Tema
      document.getElementById('modal-tema-title').textContent = 'Cadastrar Novo Tema';
      document.getElementById('modal-tema-subtitle').textContent = 'Novo Tema Pedagógico v3';
      resetTemaForm();
      sugerirProximoCodigoTema();
    }

    document.getElementById('modal-tema-backdrop').style.display = 'flex';
  }

  function closeEditorModal() {
    document.getElementById('modal-tema-backdrop').style.display = 'none';
    currentEditingIndex = -1;
  }

  // Preenche o formulário com dados do tema existente
  function populateFormWithTema(tema) {
    document.getElementById('tema-codigo').value = tema.codigo || '';
    document.getElementById('tema-eixo').value = tema.eixoId || '';
    document.getElementById('tema-titulo').value = tema.titulo || '';
    document.getElementById('tema-descricao').value = tema.descricao || '';
    document.getElementById('tema-faixa-etaria').value = tema.faixaEtaria || '2 a 5 anos';

    // Etapa 2: Materiais
    const mat = tema.materiais || {};
    document.getElementById('mat-hist-titulo').value = mat.historiaAudio?.titulo || '';
    document.getElementById('mat-hist-arquivo').value = mat.historiaAudio?.arquivo || '';
    document.getElementById('mat-hist-duracao').value = mat.historiaAudio?.duracaoSegundos || '';
    document.getElementById('mat-hist-url').value = mat.historiaAudio?.url || '';

    document.getElementById('mat-livro-titulo').value = mat.livrinhoPdf?.titulo || '';
    document.getElementById('mat-livro-arquivo').value = mat.livrinhoPdf?.arquivo || '';
    document.getElementById('mat-livro-paginas').value = mat.livrinhoPdf?.paginas || 12;
    document.getElementById('mat-livro-url').value = mat.livrinhoPdf?.url || '';

    document.getElementById('mat-ativ-titulo').value = mat.atividadesImpressasPdf?.titulo || '';
    document.getElementById('mat-ativ-arquivo').value = mat.atividadesImpressasPdf?.arquivo || '';
    document.getElementById('mat-ativ-url').value = mat.atividadesImpressasPdf?.url || '';

    tempBobies = JSON.parse(JSON.stringify(mat.bobieGods || []));
    renderBobiesList();

    // Etapa 3: FEFO Físico (Treck & Músicas)
    const fefo = tema.interacoesFefo || {};
    const treck = fefo.treckTreck || {};
    document.getElementById('treck-ativo').checked = treck.ativo !== false;
    document.getElementById('treck-titulo').value = treck.titulo || '';
    document.getElementById('treck-arquivo').value = treck.audio || '';
    document.getElementById('treck-duracao').value = treck.duracaoSegundos || 90;
    document.getElementById('treck-desc').value = treck.descricao || '';
    document.getElementById('treck-led').value = treck.perfilHardware?.led || '#FFA500';
    document.getElementById('treck-rosto').value = treck.perfilHardware?.rosto || 'animado';
    document.getElementById('treck-vibracao').value = treck.perfilHardware?.vibracao || 'pulsar_suave';

    tempMusicas = JSON.parse(JSON.stringify(fefo.musicasEMindfulness || []));
    renderMusicasList();

    // Etapa 4: Cards RFID
    tempCardsRfid = JSON.parse(JSON.stringify(fefo.cardsRfid || []));
    renderCardsRfidList();

    // Etapa 5: Desafios
    tempDesafios = JSON.parse(JSON.stringify(fefo.desafios || []));
    renderDesafiosList();
  }

  function resetTemaForm() {
    document.getElementById('form-tema').reset();
    document.getElementById('tema-faixa-etaria').value = '2 a 5 anos';
    document.getElementById('mat-livro-paginas').value = '12';
    document.getElementById('treck-duracao').value = '90';
    document.getElementById('treck-ativo').checked = true;
    document.getElementById('treck-led').value = '#FFA500';

    tempBobies = [];
    tempMusicas = [];
    tempCardsRfid = [];
    tempDesafios = [];

    renderBobiesList();
    renderMusicasList();
    renderCardsRfidList();
    renderDesafiosList();
  }

  // ==========================================================================
  // REGRA DE VERSIONAMENTO DUPLO: SUGESTÃO AUTOMÁTICA DE CÓDIGO
  // ==========================================================================
  function sugerirProximoCodigoTema() {
    const eixoSelect = document.getElementById('tema-eixo');
    const selectedEixoId = eixoSelect.value || (catalogState.eixos?.[0]?.id || 'eixo-01');

    // Extrair número do eixo (ex: eixo-01 -> 1)
    const matchEixo = selectedEixoId.match(/\d+/);
    const eixoNum = matchEixo ? parseInt(matchEixo[0], 10) : 1;

    // Encontrar temas que começam com esse número
    const prefix = `t${String(eixoNum).padStart(2, '0')}.`;
    const existing = (catalogState.temas || [])
      .filter(t => t.codigo && t.codigo.startsWith(prefix))
      .map(t => {
        const parts = t.codigo.split('.');
        return parseInt(parts[1], 10) || 0;
      });

    const nextVer = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    const suggestedCode = `${prefix}${String(nextVer).padStart(2, '0')}`;

    document.getElementById('tema-codigo').value = suggestedCode;
    showToast(`Código sugerido automaticamente: ${suggestedCode}`, 'info');
  }

  // ==========================================================================
  // LISTAS DINÂMICAS: BOBIE GODS
  // ==========================================================================
  function renderBobiesList() {
    const container = document.getElementById('bobies-list-container');
    container.innerHTML = '';

    tempBobies.forEach((bobie, idx) => {
      const item = document.createElement('div');
      item.className = 'dynamic-item-card';
      item.innerHTML = `
        <div style="flex: 1; display: flex; gap: 0.75rem; align-items: center;">
          <span style="font-size: 1.25rem;">🧸</span>
          <input type="text" placeholder="Nome do Bobie" value="${escapeHtml(bobie.nome || '')}" data-idx="${idx}" data-field="nome" style="flex: 2;">
          <select data-idx="${idx}" data-field="tipo" style="flex: 1;">
            <option value="pdf" ${bobie.tipo === 'pdf' ? 'selected' : ''}>PDF (Imprimir)</option>
            <option value="imagem" ${bobie.tipo === 'imagem' ? 'selected' : ''}>Imagem (Visualizar)</option>
          </select>
          <input type="text" placeholder="arquivo.pdf / url" value="${escapeHtml(bobie.url || bobie.arquivo || '')}" data-idx="${idx}" data-field="url" style="flex: 2;" class="mono-input">
        </div>
        <button type="button" class="btn btn-danger-outline btn-chip" data-idx="${idx}" data-action="remove-bobie">✕</button>
      `;

      item.querySelector('[data-action="remove-bobie"]').addEventListener('click', () => {
        tempBobies.splice(idx, 1);
        renderBobiesList();
      });

      item.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', (e) => {
          const field = e.target.getAttribute('data-field');
          tempBobies[idx][field] = e.target.value;
        });
      });

      container.appendChild(item);
    });
  }

  // ==========================================================================
  // LISTAS DINÂMICAS: MÚSICAS & MINDFULNESS
  // ==========================================================================
  function renderMusicasList() {
    const container = document.getElementById('musicas-list-container');
    container.innerHTML = '';

    tempMusicas.forEach((m, idx) => {
      const item = document.createElement('div');
      item.className = 'dynamic-item-card';
      item.style.flexDirection = 'column';
      item.style.alignItems = 'stretch';
      
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; font-size: 0.85rem;">Faixa #${idx + 1}</span>
          <button type="button" class="btn btn-danger-outline btn-chip" data-idx="${idx}" data-action="remove-musica">✕ Remover</button>
        </div>
        <div class="form-row" style="margin-top: 0.5rem; margin-bottom: 0;">
          <div class="form-group col-3">
            <label>Tipo:</label>
            <select data-idx="${idx}" data-field="tipo">
              <option value="musica" ${m.tipo === 'musica' ? 'selected' : ''}>🎶 Música Divertida</option>
              <option value="mindfulness" ${m.tipo === 'mindfulness' ? 'selected' : ''}>🧘 Mindfulness Zen</option>
            </select>
          </div>
          <div class="form-group col-5">
            <label>Título:</label>
            <input type="text" value="${escapeHtml(m.titulo || '')}" data-idx="${idx}" data-field="titulo" placeholder="Nome da música">
          </div>
          <div class="form-group col-4">
            <label>Arquivo Áudio:</label>
            <input type="text" value="${escapeHtml(m.audio || '')}" data-idx="${idx}" data-field="audio" placeholder="musica.mp3" class="mono-input">
          </div>
        </div>
      `;

      item.querySelector('[data-action="remove-musica"]').addEventListener('click', () => {
        tempMusicas.splice(idx, 1);
        renderMusicasList();
      });

      item.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', (e) => {
          const field = e.target.getAttribute('data-field');
          tempMusicas[idx][field] = e.target.value;
        });
      });

      container.appendChild(item);
    });
  }

  // ==========================================================================
  // LISTAS DINÂMICAS: CARDS RFID
  // ==========================================================================
  function renderCardsRfidList() {
    const container = document.getElementById('cards-rfid-container');
    const emptySub = document.getElementById('cards-rfid-empty');
    container.innerHTML = '';

    if (tempCardsRfid.length === 0) {
      emptySub.style.display = 'block';
      return;
    }
    emptySub.style.display = 'none';

    tempCardsRfid.forEach((card, idx) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'rfid-editor-card';

      const hardware = card.perfilHardware || { led: "#00CCFF", rosto: "feliz", vibracao: "curta" };

      cardEl.innerHTML = `
        <div class="card-header-bar">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.25rem;">🎴</span>
            <strong>Card #${idx + 1}</strong>
          </div>
          <button type="button" class="btn btn-danger-outline btn-chip" data-idx="${idx}" data-action="remove-card">✕ Remover Card</button>
        </div>

        <div class="form-row">
          <div class="form-group col-4">
            <label>UID da Tag RFID <span class="required">*</span></label>
            <input type="text" value="${escapeHtml(card.tagUid || '')}" placeholder="Ex: 3A7F2B01" class="mono-input" data-idx="${idx}" data-field="tagUid">
          </div>
          <div class="form-group col-5">
            <label>Nome do Card <span class="required">*</span></label>
            <input type="text" value="${escapeHtml(card.nome || '')}" placeholder="Ex: Card Copinho d'Água" data-idx="${idx}" data-field="nome">
          </div>
          <div class="form-group col-3">
            <label>Áudio Disparado</label>
            <input type="text" value="${escapeHtml(card.audio || '')}" placeholder="card_agua.mp3" class="mono-input" data-idx="${idx}" data-field="audio">
          </div>
        </div>

        <!-- Perfil de Hardware Sensorial do Card -->
        <div class="sensor-profile-row">
          <span class="sensor-title">Perfil Sensorial:</span>
          <div class="sensor-field">
            <label>LED:</label>
            <input type="color" value="${hardware.led || '#00CCFF'}" data-idx="${idx}" data-field="hw-led">
          </div>
          <div class="sensor-field">
            <label>Display OLED:</label>
            <select data-idx="${idx}" data-field="hw-rosto">
              <option value="feliz" ${hardware.rosto === 'feliz' ? 'selected' : ''}>Feliz</option>
              <option value="animado" ${hardware.rosto === 'animado' ? 'selected' : ''}>Animado</option>
              <option value="piscando" ${hardware.rosto === 'piscando' ? 'selected' : ''}>Piscando</option>
              <option value="comemorando" ${hardware.rosto === 'comemorando' ? 'selected' : ''}>Comemorando</option>
              <option value="zen" ${hardware.rosto === 'zen' ? 'selected' : ''}>Zen</option>
            </select>
          </div>
          <div class="sensor-field">
            <label>Vibração:</label>
            <select data-idx="${idx}" data-field="hw-vibe">
              <option value="curta" ${hardware.vibracao === 'curta' ? 'selected' : ''}>Toque Curto</option>
              <option value="duplo_toque" ${hardware.vibracao === 'duplo_toque' ? 'selected' : ''}>Duplo Toque</option>
              <option value="pulsar_suave" ${hardware.vibracao === 'pulsar_suave' ? 'selected' : ''}>Pulsar Suave</option>
              <option value="sucesso" ${hardware.vibracao === 'sucesso' ? 'selected' : ''}>Sucesso</option>
            </select>
          </div>
        </div>
      `;

      cardEl.querySelector('[data-action="remove-card"]').addEventListener('click', () => {
        tempCardsRfid.splice(idx, 1);
        renderCardsRfidList();
      });

      cardEl.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', (e) => {
          const field = e.target.getAttribute('data-field');
          if (field.startsWith('hw-')) {
            if (!tempCardsRfid[idx].perfilHardware) tempCardsRfid[idx].perfilHardware = {};
            if (field === 'hw-led') tempCardsRfid[idx].perfilHardware.led = e.target.value;
            if (field === 'hw-rosto') tempCardsRfid[idx].perfilHardware.rosto = e.target.value;
            if (field === 'hw-vibe') tempCardsRfid[idx].perfilHardware.vibracao = e.target.value;
          } else {
            tempCardsRfid[idx][field] = e.target.value;
          }
        });
      });

      container.appendChild(cardEl);
    });
  }

  // ==========================================================================
  // LISTAS DINÂMICAS: DESAFIOS (CARD RFID OU REFLEXIVO GUIADO)
  // ==========================================================================
  function renderDesafiosList() {
    const container = document.getElementById('desafios-container');
    const emptySub = document.getElementById('desafios-empty');
    container.innerHTML = '';

    if (tempDesafios.length === 0) {
      emptySub.style.display = 'block';
      return;
    }
    emptySub.style.display = 'none';

    tempDesafios.forEach((des, idx) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'desafio-editor-card';

      const isRfid = des.tipo === 'card_rfid';

      cardEl.innerHTML = `
        <div class="card-header-bar">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.25rem;">🏆</span>
            <strong>Desafio #${idx + 1}</strong>
          </div>
          <button type="button" class="btn btn-danger-outline btn-chip" data-idx="${idx}" data-action="remove-desafio">✕ Remover</button>
        </div>

        <div class="form-row">
          <div class="form-group col-4">
            <label>Tipo de Desafio:</label>
            <select data-idx="${idx}" data-field="tipo">
              <option value="card_rfid" ${isRfid ? 'selected' : ''}>Validação por Card RFID</option>
              <option value="reflexivo_guiado" ${!isRfid ? 'selected' : ''}>Áudio Reflexivo c/ Pausa</option>
            </select>
          </div>
          <div class="form-group col-8">
            <label>Título da Missão:</label>
            <input type="text" value="${escapeHtml(des.titulo || '')}" placeholder="Ex: Onde está o Card do Desjejum?" data-idx="${idx}" data-field="titulo">
          </div>
        </div>

        ${isRfid ? `
          <!-- Campos do Modo Card RFID -->
          <div class="form-row">
            <div class="form-group col-4">
              <label>UID do Card Esperado:</label>
              <input type="text" value="${escapeHtml(des.cardEsperadoUid || '')}" placeholder="3A7F2B02" class="mono-input" data-idx="${idx}" data-field="cardEsperadoUid">
            </div>
            <div class="form-group col-4">
              <label>Áudio da Pergunta:</label>
              <input type="text" value="${escapeHtml(des.audioPergunta || '')}" placeholder="pergunta.mp3" class="mono-input" data-idx="${idx}" data-field="audioPergunta">
            </div>
            <div class="form-group col-4">
              <label>Áudio de Sucesso:</label>
              <input type="text" value="${escapeHtml(des.audioSucesso || '')}" placeholder="sucesso.mp3" class="mono-input" data-idx="${idx}" data-field="audioSucesso">
            </div>
          </div>
        ` : `
          <!-- Campos do Modo Reflexivo Guiado -->
          <div class="form-row">
            <div class="form-group col-6">
              <label>Áudio Guia da Reflexão:</label>
              <input type="text" value="${escapeHtml(des.audioGuia || '')}" placeholder="guia_zen.mp3" class="mono-input" data-idx="${idx}" data-field="audioGuia">
            </div>
            <div class="form-group col-3">
              <label>Pausa de Silêncio (segundos):</label>
              <input type="number" value="${des.pausaSegundos || 15}" placeholder="15" data-idx="${idx}" data-field="pausaSegundos">
            </div>
            <div class="form-group col-3">
              <label>Áudio Conclusão:</label>
              <input type="text" value="${escapeHtml(des.audioConclusao || '')}" placeholder="fim_zen.mp3" class="mono-input" data-idx="${idx}" data-field="audioConclusao">
            </div>
          </div>
        `}
      `;

      cardEl.querySelector('[data-action="remove-desafio"]').addEventListener('click', () => {
        tempDesafios.splice(idx, 1);
        renderDesafiosList();
      });

      cardEl.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', (e) => {
          const field = e.target.getAttribute('data-field');
          tempDesafios[idx][field] = e.target.value;
          if (field === 'tipo') {
            renderDesafiosList(); // re-renderiza para alternar os inputs
          }
        });
      });

      container.appendChild(cardEl);
    });
  }

  // ==========================================================================
  // SALVAR TEMA (VALIDAÇÕES E REGRAS)
  // ==========================================================================
  function saveTemaFromForm() {
    const codigoInput = document.getElementById('tema-codigo');
    const codigo = codigoInput.value.trim();
    const titulo = document.getElementById('tema-titulo').value.trim();
    const descricao = document.getElementById('tema-descricao').value.trim();
    const eixoId = document.getElementById('tema-eixo').value;

    // 1. Validação do código: Padrão tXX.YY
    const regexCodigo = /^t\d{2}\.\d{2}$/;
    if (!regexCodigo.test(codigo)) {
      showToast('O código do tema deve seguir o padrão tXX.YY (ex: t01.01, t02.01).', 'error');
      goToStep(1);
      codigoInput.focus();
      return;
    }

    if (!titulo) {
      showToast('Por favor, informe o título da aventura.', 'error');
      goToStep(1);
      document.getElementById('tema-titulo').focus();
      return;
    }

    // Verificar unicidade de código se for novo tema ou edição com alteração
    const duplicateIndex = catalogState.temas.findIndex(t => t.codigo === codigo);
    if (duplicateIndex !== -1 && duplicateIndex !== currentEditingIndex) {
      showToast(`O código ${codigo} já está em uso por outro tema!`, 'error');
      goToStep(1);
      codigoInput.focus();
      return;
    }

    // 2. Montar Objeto Estruturado do Tema
    const temaData = {
      codigo,
      eixoId,
      titulo,
      descricao,
      faixaEtaria: document.getElementById('tema-faixa-etaria').value.trim() || '2 a 5 anos',
      materiais: {
        historiaAudio: {
          titulo: document.getElementById('mat-hist-titulo').value.trim(),
          arquivo: document.getElementById('mat-hist-arquivo').value.trim(),
          duracaoSegundos: parseInt(document.getElementById('mat-hist-duracao').value, 10) || 0,
          url: document.getElementById('mat-hist-url').value.trim()
        },
        livrinhoPdf: {
          titulo: document.getElementById('mat-livro-titulo').value.trim(),
          arquivo: document.getElementById('mat-livro-arquivo').value.trim(),
          paginas: parseInt(document.getElementById('mat-livro-paginas').value, 10) || 12,
          url: document.getElementById('mat-livro-url').value.trim()
        },
        bobieGods: tempBobies,
        atividadesImpressasPdf: {
          titulo: document.getElementById('mat-ativ-titulo').value.trim(),
          arquivo: document.getElementById('mat-ativ-arquivo').value.trim(),
          url: document.getElementById('mat-ativ-url').value.trim()
        }
      },
      interacoesFefo: {
        treckTreck: {
          ativo: document.getElementById('treck-ativo').checked,
          titulo: document.getElementById('treck-titulo').value.trim(),
          audio: document.getElementById('treck-arquivo').value.trim(),
          duracaoSegundos: parseInt(document.getElementById('treck-duracao').value, 10) || 90,
          descricao: document.getElementById('treck-desc').value.trim(),
          perfilHardware: {
            led: document.getElementById('treck-led').value,
            rosto: document.getElementById('treck-rosto').value,
            vibracao: document.getElementById('treck-vibracao').value
          }
        },
        cardsRfid: tempCardsRfid,
        musicasEMindfulness: tempMusicas,
        desafios: tempDesafios
      }
    };

    // 3. Atualizar no Estado
    if (currentEditingIndex >= 0) {
      catalogState.temas[currentEditingIndex] = temaData;
      showToast(`Tema ${codigo} atualizado com sucesso!`, 'success');
    } else {
      catalogState.temas.push(temaData);
      showToast(`Novo tema ${codigo} cadastrado com sucesso!`, 'success');
    }

    saveToLocalStorage(false);
    closeEditorModal();
    renderAll();
  }

  function deleteTema(index) {
    const tema = catalogState.temas[index];
    if (!tema) return;

    if (confirm(`Tem certeza de que deseja remover o tema "${tema.codigo} - ${tema.titulo}"? Esta ação pode ser revertida importando o backup.`)) {
      catalogState.temas.splice(index, 1);
      saveToLocalStorage(false);
      renderAll();
      showToast(`Tema ${tema.codigo} removido.`, 'info');
    }
  }

  // ==========================================================================
  // EVENTOS GLOBAIS DE INTERFACE & IO
  // ==========================================================================
  function initFilterEvents() {
    document.getElementById('search-temas').addEventListener('input', debounce(renderTemas, 200));
    document.getElementById('filter-eixo').addEventListener('change', renderTemas);
    document.getElementById('sort-temas').addEventListener('change', renderTemas);
  }

  function initModalEvents() {
    document.getElementById('btn-novo-tema').addEventListener('click', () => openEditorForTema(-1));
    document.getElementById('btn-empty-novo-tema').addEventListener('click', () => openEditorForTema(-1));
    document.getElementById('btn-close-modal').addEventListener('click', closeEditorModal);
    document.getElementById('btn-cancelar-modal').addEventListener('click', closeEditorModal);
    document.getElementById('btn-salvar-tema').addEventListener('click', saveTemaFromForm);

    document.getElementById('btn-sugerir-codigo').addEventListener('click', sugerirProximoCodigoTema);
    document.getElementById('tema-eixo').addEventListener('change', () => {
      const eixo = catalogState.eixos.find(e => e.id === document.getElementById('tema-eixo').value);
      document.getElementById('tema-eixo-desc').textContent = eixo ? `${eixo.icone} ${eixo.descricao}` : '';
    });

    // Botões de adição dinâmica
    document.getElementById('btn-add-bobie').addEventListener('click', () => {
      tempBobies.push({ nome: 'Novo Bobie', tipo: 'pdf', arquivo: '', url: '' });
      renderBobiesList();
    });

    document.getElementById('btn-add-musica').addEventListener('click', () => {
      tempMusicas.push({ id: `mus_${Date.now()}`, tipo: 'musica', titulo: 'Nova Faixa', audio: '', duracaoSegundos: 120 });
      renderMusicasList();
    });

    document.getElementById('btn-add-card-rfid').addEventListener('click', () => {
      tempCardsRfid.push({
        id: `card_${Date.now()}`,
        tagUid: '',
        nome: 'Novo Card',
        audio: '',
        perfilHardware: { led: '#00CCFF', rosto: 'feliz', vibracao: 'curta' }
      });
      renderCardsRfidList();
    });

    document.getElementById('btn-add-desafio').addEventListener('click', () => {
      tempDesafios.push({
        id: `des_${Date.now()}`,
        tipo: 'card_rfid',
        titulo: 'Nova Missão Interativa',
        cardEsperadoUid: '',
        audioPergunta: '',
        audioSucesso: '',
        perfilHardware: { led: '#00FF66', rosto: 'comemorando', vibracao: 'sucesso' }
      });
      renderDesafiosList();
    });

    // Novo Eixo
    document.getElementById('btn-adicionar-eixo').addEventListener('click', () => {
      const nome = prompt('Nome do novo Eixo Temático:');
      if (!nome) return;
      const icone = prompt('Ícone Emoji para o Eixo (ex: 🌟, 🎨):', '🌟') || '🌟';
      const novoId = `eixo-${String(catalogState.eixos.length + 1).padStart(2, '0')}`;
      catalogState.eixos.push({
        id: novoId,
        nome,
        descricao: 'Diretriz pedagógica personalizada.',
        icone,
        cor: '#0D9488'
      });
      saveToLocalStorage(false);
      renderAll();
      showToast(`Eixo "${nome}" adicionado com sucesso!`, 'success');
    });
  }

  // ==========================================================================
  // CONTROLE DE VERSIONAMENTO GLOBAL DO CATÁLOGO
  // ==========================================================================
  function initGlobalVersionControl() {
    const bumpBtn = document.getElementById('btn-bump-version');
    bumpBtn.addEventListener('click', () => {
      let current = catalogState.catalogVersion || 'v3.001';
      // Extrair parte numérica após 'v'
      const match = current.match(/^v(\d+)\.(\d+)$/);
      if (match) {
        const major = parseInt(match[1], 10);
        let minor = parseInt(match[2], 10) + 1;
        const newVer = `v${major}.${String(minor).padStart(3, '0')}`;
        catalogState.catalogVersion = newVer;
        catalogState.versionCode = (major * 1000) + minor;
        saveToLocalStorage(false);
        updateFooterStats();
        showToast(`Versão do Catálogo incrementada para ${newVer}!`, 'success');
      } else {
        catalogState.catalogVersion = 'v3.002';
        saveToLocalStorage(false);
        updateFooterStats();
      }
    });

    document.getElementById('footer-version-pill').addEventListener('dblclick', () => {
      const manual = prompt('Definir versão global do catálogo manualmente (ex: v3.005):', catalogState.catalogVersion);
      if (manual && manual.trim()) {
        catalogState.catalogVersion = manual.trim();
        saveToLocalStorage(false);
        updateFooterStats();
        showToast(`Versão global definida para ${catalogState.catalogVersion}`, 'info');
      }
    });
  }

  // ==========================================================================
  // IMPORTAÇÃO / EXPORTAÇÃO JSON
  // ==========================================================================
  function initIOEvents() {
    const importInput = document.getElementById('file-import-json');
    const importBtn = document.getElementById('btn-import-json');
    const exportBtn = document.getElementById('btn-export-json');

    importBtn.addEventListener('click', () => importInput.click());

    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (!parsed.schema || parsed.schema < 3) {
            if (!confirm('Este arquivo não parece ser o esquema v3 do FEFO. Deseja tentar importar mesmo assim?')) {
              return;
            }
          }
          catalogState = parsed;
          saveToLocalStorage(false);
          renderAll();
          showToast(`Arquivo ${file.name} importado com sucesso!`, 'success');
        } catch (err) {
          showToast('Erro ao processar arquivo JSON. Verifique a sintaxe.', 'error');
        }
      };
      reader.readAsText(file);
      importInput.value = '';
    });

    exportBtn.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(catalogState, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `catalog-v3_${catalogState.catalogVersion || 'latest'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Download do catalog-v3.json iniciado!', 'success');
    });
  }

  // ==========================================================================
  // TOASTS DE NOTIFICAÇÃO
  // ==========================================================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ==========================================================================
  // UTILITÁRIOS
  // ==========================================================================
  function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

})();
