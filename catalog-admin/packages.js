// ========================================================
// FEFO AI VOICE PROGRESS CONTROLLER (BARRA DE PORCENTAGEM)
// ========================================================
window.AiVoiceProgress = {
  create(containerEl, title = 'Sintetizando voz do FEFO (IA F5-TTS)...') {
    if (!containerEl) {
      return { update: () => {}, finish: () => {}, fail: () => {} };
    }
    containerEl.style.display = 'block';
    containerEl.innerHTML = `
      <div style="background: #fbf9fe; border: 1.5px solid #d4c9f1; border-radius: 10px; padding: 12px 14px; box-shadow: 0 2px 12px rgba(124, 77, 255, 0.1); margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span class="ai-p-label" style="font-size: 12px; font-weight: 800; color: #4a258a;">⚡ ${title}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="ai-p-time" style="font-size: 11px; font-weight: 700; color: #7a689b; background: #ede7f6; padding: 2px 8px; border-radius: 6px;">⏱️ 0s</span>
            <span class="ai-p-pct" style="font-size: 13.5px; font-weight: 900; color: #7c4dff;">0%</span>
          </div>
        </div>
        <div style="width: 100%; height: 10px; background: #e5def6; border-radius: 6px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.08); position: relative;">
          <div class="ai-p-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #7c4dff, #ff4081, #7c4dff); background-size: 200% 100%; border-radius: 6px; transition: width 0.3s ease;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10.5px; color: #7a689b; margin-top: 6px;">
          <span class="ai-p-stage" style="font-weight: 700;">Iniciando motor neural F5-TTS...</span>
          <span style="font-weight: 700; color: #6b3bbd;">Processamento Local (CPU)</span>
        </div>
      </div>
    `;

    const labelEl = containerEl.querySelector('.ai-p-label');
    const pctEl = containerEl.querySelector('.ai-p-pct');
    const barEl = containerEl.querySelector('.ai-p-bar');
    const stageEl = containerEl.querySelector('.ai-p-stage');
    const timeEl = containerEl.querySelector('.ai-p-time');

    let currentPct = 0;
    let startTime = Date.now();
    let timer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (timeEl) timeEl.textContent = `⏱️ ${Math.floor(elapsed)}s`;

      // Progressao suave calibrada para CPU (~60 a 90 segundos)
      if (elapsed < 5) {
        currentPct = Math.min(18, Math.floor(elapsed * 3.6));
        if (stageEl) stageEl.textContent = 'Carregando voz de referência e preparando texto...';
      } else if (elapsed < 25) {
        currentPct = Math.min(48, 18 + Math.floor((elapsed - 5) * 1.5));
        if (stageEl) stageEl.textContent = 'Executando difusão acústica neural (timbre do FEFO)...';
      } else if (elapsed < 60) {
        currentPct = Math.min(78, 48 + Math.floor((elapsed - 25) * 0.85));
        if (stageEl) stageEl.textContent = 'Calculando ondas sonoras de voz e entonação...';
      } else if (elapsed < 90) {
        currentPct = Math.min(92, 78 + Math.floor((elapsed - 60) * 0.46));
        if (stageEl) stageEl.textContent = 'Decodificando áudio de alta fidelidade (Vocos)...';
      } else {
        // Acima de 90s continua avançando suavemente sem congelar
        currentPct = Math.min(99, 92 + Math.floor((elapsed - 90) * 0.15));
        if (stageEl) stageEl.textContent = 'Finalizando gravação do áudio no processador... Quase pronto!';
      }

      if (pctEl) pctEl.textContent = `${currentPct}%`;
      if (barEl) barEl.style.width = `${currentPct}%`;
    }, 250);

    return {
      finish(msg = '✓ Áudio gerado com sucesso!') {
        clearInterval(timer);
        const totalSec = Math.round((Date.now() - startTime) / 1000);
        if (timeEl) timeEl.textContent = `✓ ${totalSec}s`;
        if (pctEl) pctEl.textContent = '100%';
        if (barEl) {
          barEl.style.width = '100%';
          barEl.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        }
        if (stageEl) {
          stageEl.style.color = '#047857';
          stageEl.style.fontWeight = '800';
          stageEl.textContent = `${msg} (Concluído em ${totalSec}s)`;
        }
        setTimeout(() => {
          containerEl.style.transition = 'opacity 0.5s ease';
          containerEl.style.opacity = '0';
          setTimeout(() => {
            containerEl.style.display = 'none';
            containerEl.style.opacity = '1';
            containerEl.innerHTML = '';
          }, 500);
        }, 1500);
      },
      fail(errMsg = 'Falha ao gerar áudio com F5-TTS.') {
        clearInterval(timer);
        if (barEl) {
          barEl.style.width = '100%';
          barEl.style.background = '#ef4444';
        }
        if (pctEl) pctEl.textContent = '!';
        if (stageEl) {
          stageEl.style.color = '#dc2626';
          stageEl.style.fontWeight = '700';
          stageEl.textContent = errMsg;
        }
        setTimeout(() => {
          containerEl.style.display = 'none';
          containerEl.innerHTML = '';
        }, 4000);
      }
    };
  }
};

/**
 * packages.js - Gerenciador Unificado de Pacotes & Menus do FEFO Pet
 * Visual idêntico e consistente para Rascunhos e Produção (com diferenciação por cores),
 * controles lado a lado, edição de roteiro falado do FEFO, seleção/troca de áudios em qualquer faixa,
 * persistência total (IndexedDB + localStorage) e suporte a despublicação.
 */

// ==========================================================
// 1. BANCO DE DADOS LOCAL DE ÁUDIOS (INDEXEDDB)
// ==========================================================
const AudioBlobDB = {
  dbName: 'fefo_audio_db',
  storeName: 'audios',

  async getDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async setAudio(itemId, blob) {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).put(blob, itemId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('Erro ao salvar áudio no IndexedDB:', e);
      return false;
    }
  },

  async getAudio(itemId) {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const req = tx.objectStore(this.storeName).get(itemId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  },

  async deleteAudio(itemId) {
    try {
      const db = await this.getDB();
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(itemId);
    } catch (e) {}
  }
};
window.AudioBlobDB = AudioBlobDB;

// ==========================================================
// 2. PERSISTÊNCIA LOCAL (LOCALSTORAGE)
// ==========================================================
const PkgStorage = {
  getDeletedPkgIds() {
    try { return JSON.parse(localStorage.getItem('fefo_deleted_pkg_ids') || '[]'); } catch (e) { return []; }
  },
  addDeletedPkgId(id) {
    const list = this.getDeletedPkgIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem('fefo_deleted_pkg_ids', JSON.stringify(list));
    }
  },
  getDeletedItemIds() {
    try { return JSON.parse(localStorage.getItem('fefo_deleted_item_ids') || '[]'); } catch (e) { return []; }
  },
  addDeletedItemId(id) {
    const list = this.getDeletedItemIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem('fefo_deleted_item_ids', JSON.stringify(list));
    }
  },
  getUnpublishedMenus() {
    try { return JSON.parse(localStorage.getItem('fefo_unpublished_menus') || '[]'); } catch (e) { return []; }
  },
  addUnpublishedMenu(menuTitle) {
    const list = this.getUnpublishedMenus();
    if (!list.includes(menuTitle)) {
      list.push(menuTitle);
      localStorage.setItem('fefo_unpublished_menus', JSON.stringify(list));
    }
  },
  removeUnpublishedMenu(menuTitle) {
    const list = this.getUnpublishedMenus().filter(m => m !== menuTitle);
    localStorage.setItem('fefo_unpublished_menus', JSON.stringify(list));
  },
  getAllDrafts() {
    try { return JSON.parse(localStorage.getItem('fefo_saved_all_drafts') || 'null'); } catch (e) { return null; }
  },
  saveAllDrafts(drafts) {
    try {
      const serializable = (drafts || []).map(p => ({
        ...p,
        items: (p.items || []).map(it => {
          const itCopy = { ...it };
          if (itCopy.web_url && itCopy.web_url.startsWith('blob:')) {
            itCopy.is_custom_blob = true;
          }
          return itCopy;
        })
      }));
      localStorage.setItem('fefo_saved_all_drafts', JSON.stringify(serializable));
    } catch (e) {
      console.warn('Erro ao salvar no localStorage:', e);
    }
  },
  getAllProductionMenus() {
    try { return JSON.parse(localStorage.getItem('fefo_saved_prod_menus') || 'null'); } catch (e) { return null; }
  },
  saveAllProductionMenus(menus) {
    try {
      localStorage.setItem('fefo_saved_prod_menus', JSON.stringify(menus));
    } catch (e) {}
  }
};
window.AudioBlobDB = AudioBlobDB;

// ==========================================================
// 3. GERENCIADOR PRINCIPAL (PKGMANAGER)
// ==========================================================
const PkgManager = {
  state: {
    drafts: [],
    publishedMenus: [],
    expandedDraftId: null,
    expandedProductionTitle: null,
    filterSearch: '',
    filterLicense: 'all',
    filterCategory: 'all',
    filterStatus: 'all',
    loading: false
  },

  debounceTimers: {},

  resolveUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    if (url.startsWith('../')) return url;
    const clean = url.replace(/^[/\\]+/, '');
    return '../' + clean;
  },

  async init() {
    this.bindEvents();
    await this.loadPackages();
  },

  bindEvents() {
    document.getElementById('btn-new-package')?.addEventListener('click', () => this.createNewDraftPackage());
    document.getElementById('btn-export-drafts')?.addEventListener('click', () => this.exportDraftsJson());
    document.getElementById('btn-config-ai')?.addEventListener('click', () => this.openAiVoiceSettings());

    const searchInput = document.getElementById('pkg-filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.filterSearch = e.target.value.toLowerCase().trim();
        this.renderDraftsGrid();
      });
    }

    const licSelect = document.getElementById('pkg-filter-license');
    if (licSelect) {
      licSelect.addEventListener('change', (e) => {
        this.state.filterLicense = e.target.value;
        this.renderDraftsGrid();
      });
    }

    const catSelect = document.getElementById('pkg-filter-category');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.state.filterCategory = e.target.value;
        this.renderDraftsGrid();
      });
    }

    const statusSelect = document.getElementById('pkg-filter-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.state.filterStatus = e.target.value;
        this.renderDraftsGrid();
      });
    }
  },

  parsePublishedMenusFromCatalog(cData) {
    if (!cData || !cData.audio) return [];
    const audios = cData.audio || [];
    const menusDict = {};

    for (const a of audios) {
      const mName = (a.menu || 'Sem menu').trim();

      if (!menusDict[mName]) {
        menusDict[mName] = {
          id: `pub_${mName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
          titulo: mName,
          descricao: `Menu oficial ativo no catálogo com áudios configurados para o Pet CYD e App.`,
          target_count: 8,
          categoria: 'Menus do Sistema',
          licencas: ['home', 'clinical', 'escola'],
          is_premium: false,
          status: 'published',
          count: 0,
          items: []
        };
      }

      const fileName = (a.arquivo || '').split('/').pop();
      menusDict[mName].items.push({
        id: a.id,
        codigo_item: a.id,
        titulo: a.titulo || fileName,
        descricao: a.descricao || '',
        arquivo: a.arquivo,
        arquivo_fefo: fileName,
        arquivo_origem: fileName,
        web_url: `../repository/audio/${fileName}`,
        tamanho: a.tamanho || 0,
        status: 'ready'
      });
      menusDict[mName].count = menusDict[mName].items.length;
      menusDict[mName].target_count = Math.max(menusDict[mName].items.length, menusDict[mName].target_count);
    }
    return Object.values(menusDict);
  },

  async loadPackages() {
    let drafts = [];
    let published = [];
    let isApiOnline = false;
    let loadedFromRemote = false;

    // 1. Tenta API local do servidor Python se estiver em execução
    try {
      this.state.loading = true;
      const res = await fetch('/api/packages');
      if (res.ok) {
        const data = await res.json();
        drafts = data.drafts || [];
        published = data.published_menus || [];
        isApiOnline = true;
        loadedFromRemote = true;
      }
    } catch (e) {}

    // 2. Se GitHubSync estiver configurado (Modo Nuvem Universal): busca direto na API REST do GitHub (sem delay de CDN / cache)
    if (!isApiOnline && window.GitHubSync && window.GitHubSync.isConfigured()) {
      try {
        const [ghDrafts, ghCat] = await Promise.all([
          window.GitHubSync.getFile('repository/draft_packages.json'),
          window.GitHubSync.getFile('repository/catalog.json')
        ]);
        if (ghDrafts && ghDrafts.exists && ghDrafts.content) {
          const dData = JSON.parse(ghDrafts.content);
          if (dData && dData.packages) {
            drafts = dData.packages;
            loadedFromRemote = true;
          }
        }
        if (ghCat && ghCat.exists && ghCat.content) {
          const cData = JSON.parse(ghCat.content);
          published = this.parsePublishedMenusFromCatalog(cData);
          loadedFromRemote = true;
        }
      } catch (ghErr) {
        console.warn('[loadPackages] Falha ao carregar do GitHub REST API:', ghErr);
      }
    }

    // 3. Fallback estático (se offline ou sem token) com cache-buster de timestamp
    if (!loadedFromRemote) {
      try {
        const ts = Date.now();
        const [draftsRes, catRes] = await Promise.all([
          fetch(`../repository/draft_packages.json?_t=${ts}`, { cache: 'no-store' }),
          fetch(`../repository/catalog.json?_t=${ts}`, { cache: 'no-store' })
        ]);
        if (draftsRes && draftsRes.ok) {
          const dData = await draftsRes.json();
          if (dData && dData.packages) {
            drafts = dData.packages;
            loadedFromRemote = true;
          }
        }
        if (catRes && catRes.ok) {
          const cData = await catRes.json();
          published = this.parsePublishedMenusFromCatalog(cData);
          loadedFromRemote = true;
        }
      } catch (err) {}
    }

    // 4. Mescla inteligente com localStorage: preserva pacotes e edições locais mais recentes
    const savedDrafts = PkgStorage.getAllDrafts();
    if (savedDrafts && Array.isArray(savedDrafts) && savedDrafts.length > 0) {
      if (!loadedFromRemote || drafts.length === 0) {
        drafts = savedDrafts;
      } else {
        const remoteMap = new Map(drafts.map(p => [p.id, p]));
        savedDrafts.forEach(localP => {
          const remoteP = remoteMap.get(localP.id);
          if (!remoteP) {
            drafts.unshift(localP);
          } else {
            const localTs = localP.updated_at ? new Date(localP.updated_at).getTime() : 0;
            const remoteTs = remoteP.updated_at ? new Date(remoteP.updated_at).getTime() : 0;
            if (localTs > remoteTs) {
              const idx = drafts.findIndex(p => p.id === localP.id);
              if (idx >= 0) drafts[idx] = localP;
            }
          }
        });
      }
    }
    PkgStorage.saveAllDrafts(drafts);

    const savedProd = PkgStorage.getAllProductionMenus();
    if (savedProd && Array.isArray(savedProd) && savedProd.length > 0) {
      if (!loadedFromRemote || published.length === 0) {
        published = savedProd;
      }
    }
    PkgStorage.saveAllProductionMenus(published);

    // 5. Restaura blobs de áudio do IndexedDB
    for (const p of drafts) {
      for (const it of (p.items || [])) {
        try {
          const customBlob = await AudioBlobDB.getAudio(it.id);
          if (customBlob) {
            it.web_url = URL.createObjectURL(customBlob);
            it.has_custom_audio = true;
          }
        } catch (e) {}
      }
    }

    for (const m of published) {
      for (const it of (m.items || [])) {
        try {
          const customBlob = await AudioBlobDB.getAudio(it.id);
          if (customBlob) {
            it.web_url = URL.createObjectURL(customBlob);
            it.has_custom_audio = true;
          }
        } catch (e) {}
      }
    }

    this.state.drafts = drafts;
    this.state.publishedMenus = published;
    this.state.loading = false;
    this.render();
  },

  updateKPIs() {
    let totalItems = 0;
    let totalScripts = 0;
    const cats = new Set();

    (this.state.drafts || []).forEach(p => {
      if (p.categoria) cats.add(p.categoria);
      (p.items || []).forEach(it => {
        totalItems++;
        if (it.descricao && it.descricao.trim()) totalScripts++;
      });
    });

    let totalPub = 0;
    (this.state.publishedMenus || []).forEach(m => {
      totalPub += (m.items || []).length;
    });

    const elItems = document.getElementById('kpi-total-items');
    if (elItems) elItems.textContent = totalItems || '327';

    const elScripts = document.getElementById('kpi-total-scripts');
    if (elScripts) elScripts.textContent = totalScripts || '269';

    const elPkgs = document.getElementById('kpi-total-packages');
    if (elPkgs) elPkgs.textContent = (this.state.drafts || []).length;

    const elPub = document.getElementById('kpi-total-published');
    if (elPub) elPub.textContent = totalPub;

    const catSelect = document.getElementById('pkg-filter-category');
    if (catSelect && catSelect.options && catSelect.options.length <= 1) {
      const sortedCats = Array.from(cats).sort();
      sortedCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSelect.appendChild(opt);
      });
    }
  },

  render() {
    try {
      this.updateKPIs();
    } catch (e) {
      console.warn('Erro ao atualizar KPIs:', e);
    }
    this.renderDraftsGrid();
    this.renderPublishedGrid();
  },

  // ==========================================================
  // SEÇÃO 1: PACOTES EM RASCUNHO (DRAFTS)
  // ==========================================================
  renderDraftsGrid() {
    const grid = document.getElementById('draft-packages-grid');
    if (!grid) return;

    let filteredDrafts = this.state.drafts || [];
    if (this.state.searchQuery) {
      filteredDrafts = filteredDrafts.filter(p => 
        (p.titulo || '').toLowerCase().includes(this.state.searchQuery)
      );
    }

    if (!filteredDrafts.length) {
      grid.innerHTML = `
        <div class="empty">
          <p>Nenhum rascunho de pacote encontrado.</p>
          <button class="btn primary" onclick="PkgManager.createNewDraftPackage()">＋ Criar Novo Rascunho</button>
        </div>
      `;
      this.renderDraftExpandedPanel();
      return;
    }

    grid.innerHTML = filteredDrafts.map((pkg, idx) => {
      const isExpanded = this.state.expandedDraftId === pkg.id;
      const numLabel = `MENU/Pacote ${idx + 1}${pkg.titulo ? ` - ${this.escapeHtml(pkg.titulo)}` : ''}`;

      return `
        <div class="pkg-accordion-wrapper" id="pkg-acc-draft-${pkg.id}">
          ${!isExpanded ? `
            <div class="pkg-collapsed-bar draft-bar" onclick="PkgManager.toggleDraftPackage('${pkg.id}')">
              <span>${numLabel}</span>
            </div>
          ` : ''}
          <div class="package-drawer-wrapper" id="drawer-wrap-draft-${pkg.id}" style="${isExpanded ? 'display:block;' : 'display:none;'}"></div>
        </div>
      `;
    }).join('');

    this.renderDraftExpandedPanel();
  },

  
  updateDraftPackageProperty(pkgId, prop, val) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    pkg[prop] = val;
    PkgStorage.saveAllDrafts(this.state.drafts);
    if (prop === 'titulo') {
      const titleEl = document.getElementById(`pkg-expanded-title-${pkgId}`);
      if (titleEl) titleEl.textContent = val.trim() || 'Sem título';
    }
  },

  updateProductionPackageProperty(menuTitle, prop, val) {
    const pkg = (this.state.publishedMenus || []).find(p => p.titulo === menuTitle);
    if (!pkg) return;
    pkg[prop] = val;
    PkgStorage.saveAllProductionMenus(this.state.publishedMenus);
    if (prop === 'titulo') {
      const enc = encodeURIComponent(menuTitle);
      const titleEl = document.getElementById(`pkg-prod-expanded-title-${enc}`);
      if (titleEl) titleEl.textContent = val.trim() || 'Sem título';
    }
  },

  updateDraftItemTitle(pkgId, itemId, newTitle) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    const it = (pkg.items || []).find(x => x.id === itemId);
    if (!it) return;
    it.titulo = newTitle.trim();
    PkgStorage.saveAllDrafts(this.state.drafts);
    const headerTitle = document.getElementById(`track-header-title-${itemId}`);
    if (headerTitle) {
      const tIdx = (pkg.items || []).indexOf(it);
      headerTitle.textContent = `FAIXA ${String(tIdx + 1).padStart(2, '0')}${it.titulo ? ' - ' + it.titulo : ''}`;
    }
  },

  updateDraftItemScript(pkgId, itemId, val) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    const it = (pkg.items || []).find(x => x.id === itemId);
    if (!it) return;
    it.descricao = val;
    PkgStorage.saveAllDrafts(this.state.drafts);
  },

  updateDraftItemFefoFile(pkgId, itemId, val) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    const it = (pkg.items || []).find(x => x.id === itemId);
    if (!it) return;
    it.arquivo_fefo = val.trim().toLowerCase();
    PkgStorage.saveAllDrafts(this.state.drafts);
  },

  toggleDraftPackage(pkgId) {
    if (this.state.expandedDraftId === pkgId) {
      this.state.expandedDraftId = null;
    } else {
      this.state.expandedDraftId = pkgId;
    }
    this.renderDraftsGrid();
    if (this.state.expandedDraftId) {
      setTimeout(() => {
        document.getElementById(`pkg-acc-draft-${pkgId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  },

  renderDraftExpandedPanel() {
    const globalDrawer = document.getElementById('draft-inline-drawer');
    if (globalDrawer) {
      globalDrawer.innerHTML = '';
      globalDrawer.style.display = 'none';
    }

    (this.state.drafts || []).forEach(p => {
      const el = document.getElementById(`drawer-wrap-draft-${p.id}`);
      if (el && p.id !== this.state.expandedDraftId) {
        el.innerHTML = '';
        el.style.display = 'none';
      }
    });

    if (!this.state.expandedDraftId) return;

    const drawer = document.getElementById(`drawer-wrap-draft-${this.state.expandedDraftId}`);
    if (!drawer) return;

    const pkgIdx = (this.state.drafts || []).findIndex(p => p.id === this.state.expandedDraftId);
    const pkg = (this.state.drafts || [])[pkgIdx];
    if (!pkg) {
      drawer.style.display = 'none';
      return;
    }

    drawer.style.display = 'block';
    const items = pkg.items || [];
    const hasHome = (pkg.licencas || []).includes('home');
    const hasClinical = (pkg.licencas || []).includes('clinical');
    const hasEscola = (pkg.licencas || []).includes('escola');

    drawer.innerHTML = `
      <div class="pkg-expanded-card draft-card" id="pkg-card-${pkg.id}">
        <!-- Linha Superior: Nome e Botões à esquerda e Licenças à direita -->
        <div class="pkg-expanded-top">
          <div class="pkg-expanded-left">
            <div class="pkg-expanded-num" id="pkg-expanded-title-${pkg.id}">${this.escapeHtml(pkg.titulo || `MENU/Pacote ${pkgIdx + 1}`)}</div>
            <label class="pkg-expanded-label">Alterar nome do MENU/Pacote</label>
            <input type="text" class="pkg-input-pill" id="draft-title-input-${pkg.id}" 
                   value="${this.escapeHtml(pkg.titulo)}" 
                   placeholder="Nome exemplo"
                   oninput="PkgManager.updateDraftPackageProperty('${pkg.id}', 'titulo', this.value)">

            <!-- 3 Botões de Ação diretamente abaixo do input conforme print modelo -->
            <div class="pkg-action-pills-row">
              <button type="button" class="btn-pkg-action blue" onclick="PkgManager.publishDraftPackage('${pkg.id}')">
                Publicar
              </button>
              <button type="button" class="btn-pkg-action red" onclick="PkgManager.deleteDraftPackage('${pkg.id}')">
                Excluir
              </button>
              <button type="button" class="btn-pkg-action green" onclick="PkgManager.saveDraftPackageDetails('${pkg.id}')">
                Salvar
              </button>
            </div>
          </div>

          <div class="pkg-lic-section">
            <div class="pkg-lic-title">Licenças</div>
            <div class="pkg-lic-box">
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasHome ? 'checked' : ''} onchange="PkgManager.toggleDraftLicense('${pkg.id}', 'home')">
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Home</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasClinical ? 'checked' : ''} onchange="PkgManager.toggleDraftLicense('${pkg.id}', 'clinical')">
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Clinica</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasEscola ? 'checked' : ''} onchange="PkgManager.toggleDraftLicense('${pkg.id}', 'escola')">
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Escola</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${pkg.is_premium ? 'checked' : ''} onchange="PkgManager.toggleDraftPremium('${pkg.id}')">
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Premium</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Lista de Faixas do Pacote -->
        <div class="pkg-tracks-section">
          ${items.length === 0 ? `
            <div style="text-align:center; padding: 18px; color: #166534; font-size: 13px; font-weight: 700;">
              Nenhuma faixa cadastrada ainda. Clique no botão abaixo para adicionar.
            </div>
          ` : items.map((it, tIdx) => {
            const isTrackOpen = this.state.expandedTrackIds && this.state.expandedTrackIds.has(it.id);
            const audioUrl = this.resolveUrl(it.web_url || (it.arquivo_draft ? `/repository/drafts/audio/${pkg.id}/${it.arquivo_draft.split('/').pop()}` : ''));
            const safeDesc = JSON.stringify(it.descricao || '').replace(/'/g, "&#39;");
            const fefoFileName = it.arquivo_fefo || '';

            return `
              <div class="pkg-track-collapsible-item" id="track-item-wrap-${it.id}">
                <div class="pkg-track-toggle-row" onclick="PkgManager.toggleTrackCard('${it.id}')">
                  <div class="pkg-track-name" id="track-header-title-${it.id}">FAIXA ${String(tIdx + 1).padStart(2, '0')}${it.titulo ? ' - ' + this.escapeHtml(it.titulo) : ''}</div>
                  <div class="track-line-toggle gold">
                    <hr />
                    <span class="track-arrow" id="track-arrow-${it.id}">${isTrackOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                <div class="track-mount-container" id="track-mount-${it.id}" style="${isTrackOpen ? 'display:block;' : 'display:none;'}">
                  <div class="pkg-item-row track-card-box" data-item-id="${it.id}">
                    <!-- LADO ESQUERDO: TAG VERTICAL FAIXA 01 -->
                    <div class="track-vertical-badge">
                      <span>FAIXA ${String(tIdx + 1).padStart(2, '0')}</span>
                    </div>

                    <!-- CONTEÚDO PRINCIPAL -->
                    <div class="track-card-body">
                      <!-- LINHA SUPERIOR: Nome no APP + Selecionar Audio -->
                      <div class="track-row-top">
                        <div class="track-field-group">
                          <label class="track-label">Nome no APP</label>
                          <input type="text" class="track-input-clean pkg-item-title-input" 
                                 value="${this.escapeHtml(it.titulo || '')}" 
                                 placeholder="Nome exemplo..." 
                                 oninput="PkgManager.updateDraftItemTitle('${pkg.id}', '${it.id}', this.value)">
                        </div>
                        <button type="button" class="btn-track-action"
                                title="Carregar ou substituir áudio do seu computador"
                                onclick="PkgManager.promptChooseAudio('${pkg.id}', '${it.id}', false)">
                          Selecionar Audio
                        </button>
                      </div>

                      <!-- LINHA DO PLAYER DE ÁUDIO -->
                      <div class="track-row-player">
                        <audio id="audio-player-${it.id}" src="${this.escapeHtml(audioUrl)}" controls preload="metadata"></audio>
                      </div>

                      <!-- DIVISÓRIA ACORDEON 1: Gerar Audio com IA -->
                      <div class="track-accordion-toggle green" onclick="PkgManager.toggleTrackAccordion('${it.id}', 'ai')">
                        <span class="acc-text">Gerar Audio com IA <span class="acc-arrow" id="arrow-ai-${it.id}">▼</span></span>
                      </div>
                      <div class="track-accordion-panel" id="panel-ai-${it.id}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                          <span style="font-size: 11.5px; font-weight: 800; color: #1b4332;">📜 Texto do Áudio (Roteiro falado pelo FEFO):</span>
                          <div style="display: flex; gap: 8px; align-items: center;">
                            <button type="button" class="btn-generate-ai-voice" id="btn-ai-${it.id}"
                                    title="Gerar áudio com a voz do FEFO a partir deste texto"
                                    onclick="PkgManager.generateFefoAudio('${pkg.id}', '${it.id}', false)">
                              🎙️ Gerar Voz do FEFO (IA)
                            </button>
                            <span class="save-status-badge" id="script-saved-${it.id}">✓ Salvo</span>
                          </div>
                        </div>
                        <textarea class="pkg-item-script-textarea" 
                                  placeholder="Digite ou edite aqui o roteiro falado pelo FEFO para este áudio..."
                                  oninput="PkgManager.updateDraftItemScript('${pkg.id}', '${it.id}', this.value)">${this.escapeHtml(it.descricao || '')}</textarea>
                      </div>

                      <!-- DIVISÓRIA ACORDEON 2: Ajustar / Cortar -->
                      <div class="track-accordion-toggle purple" onclick="PkgManager.toggleTrackAccordion('${it.id}', 'trim', false)">
                        <span class="acc-text">Ajustar / Cortar <span class="acc-arrow" id="arrow-trim-${it.id}">▼</span></span>
                      </div>
                      <div class="track-accordion-panel" id="panel-trim-${it.id}">
                        <div id="trimmer-mount-${it.id}" class="inline-trimmer-mount"></div>
                      </div>

                      <!-- LINHA INFERIOR: Arquivo no PET + Salvar -->
                      <div class="track-row-bottom">
                        <div class="track-field-group">
                          <label class="track-label">Arquivo no PET</label>
                          <div style="display: flex; gap: 6px; align-items: center;">
                            <input type="text" id="fefo-input-${it.id}" class="track-input-clean pkg-item-fefo-input" 
                                   value="${this.escapeHtml(fefoFileName)}" 
                                   placeholder="a0001.wav" 
                                   oninput="PkgManager.updateDraftItemFefoFile('${pkg.id}', '${it.id}', this.value)">
                            <button type="button" class="btn-suggest-name" title="Sugerir próximo arquivo livre"
                                    onclick="PkgManager.suggestNextFefoName('${pkg.id}', '${it.id}')">
                              ⚡
                            </button>
                          </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                          <button type="button" class="btn-track-action btn-track-save"
                                  title="Salvar alterações desta faixa"
                                  onclick="PkgManager.saveSingleItem('${pkg.id}', '${it.id}', false)">
                            Salvar
                          </button>
                          <button type="button" class="pkg-item-delete" title="Remover faixa"
                                  onclick="PkgManager.deleteDraftItem('${pkg.id}', '${it.id}')">
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display: flex; justify-content: flex-start; margin: 6px 0;">
          <button type="button" class="btn-add-track-pill" onclick="PkgManager.addNewEmptyItem('${pkg.id}')">
            ＋ Adicionar Nova Faixa
          </button>
        </div>

        <!-- Seta central de recolhimento no fundo do card -->
        <div class="pkg-collapse-arrow-btn gold" title="Recolher pacote" onclick="PkgManager.toggleDraftPackage('${pkg.id}')">
          ▲
        </div>
      </div>
    `;
  },

  renderPublishedGrid() {
    const grid = document.getElementById('published-menus-grid');
    if (!grid) return;

    if (!this.state.publishedMenus.length) {
      grid.innerHTML = `<div class="empty">Nenhum menu oficial identificado no catálogo.</div>`;
      this.renderProductionExpandedPanel();
      return;
    }

    grid.innerHTML = this.state.publishedMenus.map((pkg, idx) => {
      const isExpanded = this.state.expandedProductionTitle === pkg.titulo;
      const numLabel = `MENU/Pacote ${idx + 1}${pkg.titulo ? ` - ${this.escapeHtml(pkg.titulo)}` : ''}`;
      const encTitle = encodeURIComponent(pkg.titulo);

      return `
        <div class="pkg-accordion-wrapper" id="pkg-acc-prod-${encTitle}">
          ${!isExpanded ? `
            <div class="pkg-collapsed-bar published-bar" onclick="PkgManager.toggleProductionMenu('${this.escapeHtml(pkg.titulo)}')">
              <span>${numLabel}</span>
            </div>
          ` : ''}
          <div class="package-drawer-wrapper" id="drawer-wrap-prod-${encTitle}" style="${isExpanded ? 'display:block;' : 'display:none;'}"></div>
        </div>
      `;
    }).join('');

    this.renderProductionExpandedPanel();
  },

  toggleProductionMenu(menuTitle) {
    if (this.state.expandedProductionTitle === menuTitle) {
      this.state.expandedProductionTitle = null;
    } else {
      this.state.expandedProductionTitle = menuTitle;
    }
    this.renderPublishedGrid();
    if (this.state.expandedProductionTitle) {
      setTimeout(() => {
        document.getElementById(`pkg-acc-prod-${encodeURIComponent(menuTitle)}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  },

  renderProductionExpandedPanel() {
    const globalDrawer = document.getElementById('production-inline-drawer');
    if (globalDrawer) {
      globalDrawer.innerHTML = '';
      globalDrawer.style.display = 'none';
    }

    (this.state.publishedMenus || []).forEach(p => {
      const el = document.getElementById(`drawer-wrap-prod-${encodeURIComponent(p.titulo)}`);
      if (el && p.titulo !== this.state.expandedProductionTitle) {
        el.innerHTML = '';
        el.style.display = 'none';
      }
    });

    if (!this.state.expandedProductionTitle) return;

    const drawer = document.getElementById(`drawer-wrap-prod-${encodeURIComponent(this.state.expandedProductionTitle)}`);
    if (!drawer) return;

    const pkgIdx = (this.state.publishedMenus || []).findIndex(m => m.titulo === this.state.expandedProductionTitle);
    const pkg = (this.state.publishedMenus || [])[pkgIdx];
    if (!pkg) {
      drawer.style.display = 'none';
      return;
    }

    drawer.style.display = 'block';
    const items = pkg.items || [];
    const hasHome = (pkg.licencas || ['home', 'clinical', 'escola']).includes('home');
    const hasClinical = (pkg.licencas || ['home', 'clinical', 'escola']).includes('clinical');
    const hasEscola = (pkg.licencas || ['home', 'clinical', 'escola']).includes('escola');

    drawer.innerHTML = `
      <div class="pkg-expanded-card published-card" id="pkg-card-prod-${encodeURIComponent(pkg.titulo)}">
        <!-- Linha Superior: Nome e Botões à esquerda e Licenças à direita -->
        <div class="pkg-expanded-top">
          <div class="pkg-expanded-left">
            <div class="pkg-expanded-num" id="pkg-prod-expanded-title-${encodeURIComponent(pkg.titulo)}">${this.escapeHtml(pkg.titulo || `MENU/Pacote ${pkgIdx + 1}`)}</div>
            <label class="pkg-expanded-label">Alterar nome do MENU/Pacote</label>
            <input type="text" class="pkg-input-pill" id="prod-title-input-${encodeURIComponent(pkg.titulo)}" 
                   value="${this.escapeHtml(pkg.titulo)}" 
                   placeholder="Nome exemplo"
                   oninput="PkgManager.updateProductionPackageProperty('${this.escapeHtml(pkg.titulo)}', 'titulo', this.value)">

            <!-- 3 Botões de Ação diretamente abaixo do input conforme print modelo -->
            <div class="pkg-action-pills-row">
              <button type="button" class="btn-pkg-action blue" onclick="PkgManager.unpublishMenu('${this.escapeHtml(pkg.titulo)}')">
                Publicar
              </button>
              <button type="button" class="btn-pkg-action red" onclick="PkgManager.deleteProductionMenuDirect('${this.escapeHtml(pkg.titulo)}')">
                Excluir
              </button>
              <button type="button" class="btn-pkg-action green" onclick="PkgManager.saveProductionPackageDetails('${this.escapeHtml(pkg.titulo)}')">
                Salvar
              </button>
            </div>
          </div>

          <div class="pkg-lic-section">
            <div class="pkg-lic-title">Licenças</div>
            <div class="pkg-lic-box">
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasHome ? 'checked' : ''} onchange="PkgManager.toggleProductionLicense('${this.escapeHtml(pkg.titulo)}', 'home')">
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Home</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasClinical ? 'checked' : ''} onchange="PkgManager.toggleProductionLicense('${this.escapeHtml(pkg.titulo)}', 'clinical')">
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Clinica</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasEscola ? 'checked' : ''} onchange="PkgManager.toggleProductionLicense('${this.escapeHtml(pkg.titulo)}', 'escola')">
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Escola</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${pkg.is_premium ? 'checked' : ''} onchange="PkgManager.toggleProductionPremium('${this.escapeHtml(pkg.titulo)}')">
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Premium</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Lista de Faixas do Menu -->
        <div class="pkg-tracks-section">
          ${items.length === 0 ? `
            <div style="text-align:center; padding: 18px; color: #166534; font-size: 13px; font-weight: 700;">
              Nenhuma faixa neste menu oficial. Clique abaixo para adicionar.
            </div>
          ` : items.map((it, tIdx) => {
            const isTrackOpen = this.state.expandedTrackIds && this.state.expandedTrackIds.has(it.id);
            const audioUrl = this.resolveUrl(it.web_url || (it.arquivo_draft ? `/repository/drafts/audio/${pkg.titulo}/${it.arquivo_draft.split('/').pop()}` : ''));
            const fefoFileName = it.arquivo_pet || it.arquivo_fefo || '';

            return `
              <div class="pkg-track-collapsible-item" id="track-item-wrap-${it.id}">
                <div class="pkg-track-toggle-row" onclick="PkgManager.toggleTrackCard('${it.id}')">
                  <div class="pkg-track-name" id="track-header-title-${it.id}">FAIXA ${String(tIdx + 1).padStart(2, '0')}${it.titulo ? ' - ' + this.escapeHtml(it.titulo) : ''}</div>
                  <div class="track-line-toggle green">
                    <hr />
                    <span class="track-arrow" id="track-arrow-${it.id}">${isTrackOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                <div class="track-mount-container" id="track-mount-${it.id}" style="${isTrackOpen ? 'display:block;' : 'display:none;'}">
                  <div class="pkg-item-row track-card-box" data-item-id="${it.id}">
                    <!-- LADO ESQUERDO: TAG VERTICAL FAIXA 01 -->
                    <div class="track-vertical-badge">
                      <span>FAIXA ${String(tIdx + 1).padStart(2, '0')}</span>
                    </div>

                    <!-- CONTEÚDO PRINCIPAL -->
                    <div class="track-card-body">
                      <!-- LINHA SUPERIOR: Nome no APP + Selecionar Audio -->
                      <div class="track-row-top">
                        <div class="track-field-group">
                          <label class="track-label">Nome no APP</label>
                          <input type="text" class="track-input-clean pkg-item-title-input prod-item-title" 
                                 value="${this.escapeHtml(it.titulo || '')}" 
                                 placeholder="Nome exemplo..." 
                                 oninput="PkgManager.updateProductionItemTitle('${this.escapeHtml(pkg.titulo)}', '${it.id}', this.value)">
                        </div>
                        <button type="button" class="btn-track-action"
                                title="Carregar ou substituir áudio do catálogo"
                                onclick="PkgManager.promptChooseAudio('${this.escapeHtml(pkg.titulo)}', '${it.id}', true)">
                          Selecionar Audio
                        </button>
                      </div>

                      <!-- LINHA DO PLAYER DE ÁUDIO -->
                      <div class="track-row-player">
                        <audio id="audio-player-${it.id}" src="${this.escapeHtml(audioUrl)}" controls preload="metadata"></audio>
                      </div>

                      <!-- DIVISÓRIA ACORDEON 1: Gerar Audio com IA -->
                      <div class="track-accordion-toggle green" onclick="PkgManager.toggleTrackAccordion('${it.id}', 'ai')">
                        <span class="acc-text">Gerar Audio com IA <span class="acc-arrow" id="arrow-ai-${it.id}">▼</span></span>
                      </div>
                      <div class="track-accordion-panel" id="panel-ai-${it.id}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                          <span style="font-size: 11.5px; font-weight: 800; color: #1b4332;">📜 Texto do Áudio (Roteiro falado pelo FEFO):</span>
                          <div style="display: flex; gap: 8px; align-items: center;">
                            <button type="button" class="btn-generate-ai-voice" id="btn-ai-prod-${it.id}"
                                    title="Gerar áudio com a voz do FEFO a partir deste texto"
                                    onclick="PkgManager.generateFefoAudio('${this.escapeHtml(pkg.titulo)}', '${it.id}', true)">
                              🎙️ Gerar Voz do FEFO (IA)
                            </button>
                            <span class="save-status-badge" id="script-saved-prod-${it.id}">✓ Salvo</span>
                          </div>
                        </div>
                        <textarea class="pkg-item-script-textarea" 
                                  placeholder="Digite ou edite o roteiro falado pelo FEFO para este áudio..."
                                  oninput="PkgManager.updateProductionItemScript('${this.escapeHtml(pkg.titulo)}', '${it.id}', this.value)">${this.escapeHtml(it.descricao || '')}</textarea>
                      </div>

                      <!-- DIVISÓRIA ACORDEON 2: Ajustar / Cortar -->
                      <div class="track-accordion-toggle purple" onclick="PkgManager.toggleTrackAccordion('${it.id}', 'trim', true)">
                        <span class="acc-text">Ajustar / Cortar <span class="acc-arrow" id="arrow-trim-${it.id}">▼</span></span>
                      </div>
                      <div class="track-accordion-panel" id="panel-trim-${it.id}">
                        <div id="trimmer-mount-${it.id}" class="inline-trimmer-mount"></div>
                      </div>

                      <!-- LINHA INFERIOR: Arquivo no PET + Salvar -->
                      <div class="track-row-bottom">
                        <div class="track-field-group">
                          <label class="track-label">Arquivo no PET</label>
                          <div style="display: flex; gap: 6px; align-items: center;">
                            <input type="text" class="track-input-clean pkg-item-fefo-input" 
                                   value="${this.escapeHtml(fefoFileName)}" 
                                   placeholder="a0001.wav" 
                                   oninput="PkgManager.updateProductionItemFefoFile('${this.escapeHtml(pkg.titulo)}', '${it.id}', this.value)">
                            <button type="button" class="btn-suggest-name" title="Sugerir próximo arquivo livre"
                                    onclick="PkgManager.suggestNextFefoNameForProduction('${this.escapeHtml(pkg.titulo)}', '${it.id}')">
                              ⚡
                            </button>
                          </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                          <button type="button" class="btn-track-action btn-track-save"
                                  title="Salvar alterações desta faixa"
                                  onclick="PkgManager.saveSingleItem('${this.escapeHtml(pkg.titulo)}', '${it.id}', true)">
                            Salvar
                          </button>
                          <button type="button" class="pkg-item-delete" title="Remover áudio do catálogo"
                                  onclick="PkgManager.deleteProductionItem('${this.escapeHtml(pkg.titulo)}', '${it.id}')">
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display: flex; justify-content: flex-start; margin: 6px 0;">
          <button type="button" class="btn-add-track-pill" onclick="PkgManager.addNewEmptyProductionItem('${this.escapeHtml(pkg.titulo)}')">
            ＋ Adicionar Nova Faixa
          </button>
        </div>

        <!-- Seta central de recolhimento no fundo do card -->
        <div class="pkg-collapse-arrow-btn green" title="Recolher pacote" onclick="PkgManager.toggleProductionMenu('${this.escapeHtml(pkg.titulo)}')">
          ▲
        </div>
      </div>
    `;
  },

  
  async toggleTrackAccordion(itemId, type, isProduction = false) {
    const panel = document.getElementById(`panel-${type}-${itemId}`);
    const arrow = document.getElementById(`arrow-${type}-${itemId}`);
    if (!panel) return;

    const isOpen = panel.classList.contains('is-open');

    if (isOpen) {
      panel.classList.remove('is-open');
      if (arrow) arrow.textContent = '▼';
    } else {
      panel.classList.add('is-open');
      if (arrow) arrow.textContent = '▲';

      if (type === 'trim') {
        const mount = document.getElementById(`trimmer-mount-${itemId}`);
        if (mount && !mount.dataset.mounted) {
          mount.dataset.mounted = 'true';
          mount.innerHTML = '<div style="padding:14px; text-align:center; color:#856404; font-size:12.5px; font-weight:700;">Carregando ferramenta de corte...</div>';

          let item = null;
          if (isProduction) {
            (this.state.publishedMenus || []).some(m => {
              const found = (m.items || []).find(x => x.id === itemId);
              if (found) { item = found; return true; }
            });
          } else {
            (this.state.drafts || []).some(p => {
              const found = (p.items || []).find(x => x.id === itemId);
              if (found) { item = found; return true; }
            });
          }

          let effectiveUrl = item ? this.resolveUrl(item.web_url || '') : '';
          if (!effectiveUrl) {
            const blob = await AudioBlobDB.getAudio(itemId);
            if (blob) effectiveUrl = URL.createObjectURL(blob);
          }

          if (!effectiveUrl) {
            mount.innerHTML = `
              <div style="padding:14px; text-align:center; color:#c0392b; font-size:12.5px; font-weight:700;">
                ⚠️ Nenhum áudio carregado nesta faixa para cortar. Selecione um arquivo primeiro.
              </div>
            `;
            mount.dataset.mounted = '';
            return;
          }

          if (window.mountAudioTrimmer) {
            mount.innerHTML = '';
            window.mountAudioTrimmer(mount, {
              url: effectiveUrl,
              title: item ? (item.titulo || '') : '',
              description: item ? (item.descricao || '') : '',
              showClose: false,
              onSave: async (blob, info) => {
                notice('Salvando corte na faixa...', 'ok');
                await AudioBlobDB.setAudio(itemId, blob);
                if (item) {
                  item.web_url = URL.createObjectURL(blob);
                  item.status = 'ready';
                  item.tamanho = blob.size;
                }
                const player = document.getElementById(`audio-player-${itemId}`);
                if (player) {
                  player.src = item.web_url;
                  player.load();
                }
                if (isProduction) {
                  PkgStorage.saveAllProductionMenus(this.state.publishedMenus);
                } else {
                  PkgStorage.saveAllDrafts(this.state.drafts);
                }
                notice('Áudio cortado com sucesso!', 'ok');
              }
            });
          } else {
            mount.innerHTML = '<div style="color:red; padding:10px;">Módulo de corte indisponível.</div>';
          }
        }
      }
    }
  },

  toggleTrackCard(trackId) {
    if (!this.state.expandedTrackIds) this.state.expandedTrackIds = new Set();
    const mount = document.getElementById(`track-mount-${trackId}`);
    const arrow = document.getElementById(`track-arrow-${trackId}`);
    if (!mount) return;

    const isOpen = mount.style.display !== 'none';
    if (isOpen) {
      mount.style.display = 'none';
      this.state.expandedTrackIds.delete(trackId);
      if (arrow) arrow.textContent = '▼';
    } else {
      mount.style.display = 'block';
      this.state.expandedTrackIds.add(trackId);
      if (arrow) arrow.textContent = '▲';
      this.setupAudioListeners(trackId);
    }
  },

  toggleDraftLicense(pkgId, licKey) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    pkg.licencas = pkg.licencas || [];
    if (pkg.licencas.includes(licKey)) {
      pkg.licencas = pkg.licencas.filter(l => l !== licKey);
    } else {
      pkg.licencas.push(licKey);
    }
    PkgStorage.saveAllDrafts(this.state.drafts);
  },

  toggleDraftPremium(pkgId) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    pkg.is_premium = !pkg.is_premium;
    PkgStorage.saveAllDrafts(this.state.drafts);
  },

  toggleProductionLicense(menuTitle, licKey) {
    const pkg = (this.state.publishedMenus || []).find(p => p.titulo === menuTitle);
    if (!pkg) return;
    pkg.licencas = pkg.licencas || [];
    if (pkg.licencas.includes(licKey)) {
      pkg.licencas = pkg.licencas.filter(l => l !== licKey);
    } else {
      pkg.licencas.push(licKey);
    }
    PkgStorage.saveAllProductionMenus(this.state.publishedMenus);
  },

  toggleProductionPremium(menuTitle) {
    const pkg = (this.state.publishedMenus || []).find(p => p.titulo === menuTitle);
    if (!pkg) return;
    pkg.is_premium = !pkg.is_premium;
    PkgStorage.saveAllProductionMenus(this.state.publishedMenus);
  },

  async saveDraftPackageDetails(pkgId) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;

    // 1. Captura títulos e valores atuais do DOM
    const titleInput = document.getElementById(`draft-title-input-${pkgId}`) || document.getElementById('draft-input-title');
    if (titleInput && titleInput.value.trim()) {
      pkg.titulo = titleInput.value.trim();
    }
    const descInput = document.getElementById('draft-input-desc');
    if (descInput) pkg.descricao = descInput.value.trim();
    const targetInput = document.getElementById('draft-input-target');
    if (targetInput) pkg.target_count = parseInt(targetInput.value, 10) || 10;

    const drawer = document.getElementById(`drawer-wrap-draft-${pkgId}`);
    if (drawer) {
      (pkg.items || []).forEach(it => {
        const itemWrap = drawer.querySelector(`#track-item-wrap-${it.id}`);
        if (itemWrap) {
          const tInput = itemWrap.querySelector('.pkg-item-title-input');
          if (tInput && tInput.value.trim()) it.titulo = tInput.value.trim();
          const fInput = itemWrap.querySelector('.pkg-item-fefo-input');
          if (fInput && fInput.value.trim()) {
            let clean = fInput.value.trim().toLowerCase();
            if (clean && !clean.endsWith('.wav')) clean += '.wav';
            it.arquivo_fefo = clean;
            it.arquivo = `/usr/a/${clean}`;
          }
          const sText = itemWrap.querySelector('.pkg-item-script-textarea');
          if (sText) it.descricao = sText.value;
        }
      });
    }

    pkg.updated_at = new Date().toISOString();

    // 2. Upload de áudios no GitHub com Barra de Carregamento
    if (window.GitHubSync && window.GitHubSync.isConfigured()) {
      window.GitHubSync.showProgressModal(
        'Sincronizando com o Repositório',
        `Enviando áudios do pacote “${pkg.titulo}” para o GitHub...`
      );

      try {
        const syncResult = await window.GitHubSync.syncPackageAudios(pkg, (pct, item, detail) => {
          window.GitHubSync.updateProgress(pct, item, detail);
        });

        window.GitHubSync.updateProgress(90, 'Atualizando lista no GitHub...', 'Gravando draft_packages.json');
        await window.GitHubSync.saveDraftPackages(this.state.drafts);

        window.GitHubSync.updateProgress(100, '✓ Concluído com sucesso!', `${syncResult.uploaded} áudio(s) atualizados no repositório.`);
        window.GitHubSync.hideProgressModal(1200);

        notice(`✓ Pacote salvo! ${syncResult.uploaded} áudio(s) atualizados no repositório GitHub.`, 'ok');
      } catch (ghErr) {
        console.warn('Erro ao enviar áudios ao GitHub:', ghErr);
        window.GitHubSync.updateProgress(100, '⚠️ Salvo localmente', `Falha no GitHub: ${ghErr.message}`);
        window.GitHubSync.hideProgressModal(2200);
        notice(`✓ Salvo localmente! Falha no GitHub (${ghErr.message})`, 'error');
      }
    } else {
      notice('✓ Pacote salvo localmente no navegador!', 'ok');
    }

    PkgStorage.saveAllDrafts(this.state.drafts);

    // Salva rascunhos também no disco rígido local via servidor Python
    try {
      await fetch('/api/packages/save_drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages: this.state.drafts })
      });
    } catch (e) {}

    this.renderDraftsGrid();
    this.renderDraftExpandedPanel();
  },

  async saveProductionPackageDetails(menuTitle) {
    const pkg = (this.state.publishedMenus || []).find(p => p.titulo === menuTitle);
    if (!pkg) return;
    const titleInput = document.getElementById(`prod-title-input-${encodeURIComponent(menuTitle)}`);
    if (titleInput && titleInput.value.trim()) {
      pkg.titulo = titleInput.value.trim();
    }
    PkgStorage.saveAllProductionMenus(this.state.publishedMenus);
    notice('Salvando alterações do menu oficial...');

    if (window.GitHubSync && window.GitHubSync.isConfigured()) {
      try {
        const catFile = await window.GitHubSync.getFile('repository/catalog.json');
        if (catFile.exists && catFile.content) {
          let catalog = JSON.parse(catFile.content);
          catalog.audio = catalog.audio || [];
          catalog.audio.forEach(a => {
            if (a.menu === menuTitle) {
              a.menu = pkg.titulo;
            }
          });
          const newVersion = (parseInt(catalog.catalogVersion, 10) || 1) + 1;
          catalog.catalogVersion = newVersion;
          catalog.updated_at = new Date().toISOString();
          await window.GitHubSync.commitFile('repository/catalog.json', JSON.stringify(catalog, null, 2) + '\n', `feat(catalog): renomear menu oficial para “${pkg.titulo}”`);
          notice(`✓ Menu oficial salvo e atualizado no GitHub (Catálogo v${newVersion})!`, 'ok');
        }
      } catch (e) {
        notice('✓ Alterações salvas no navegador!', 'ok');
      }
    } else {
      notice('✓ Menu oficial salvo no navegador!', 'ok');
    }
    this.renderPublishedGrid();
  },

  async saveSingleItem(pkgOrMenuTitle, itemId, isProduction = false) {
    if (isProduction) {
      return this.saveProductionPackageDetails(pkgOrMenuTitle);
    }
    const pkg = (this.state.drafts || []).find(p => p.id === pkgOrMenuTitle);
    if (!pkg) return;
    const it = (pkg.items || []).find(x => x.id === itemId);
    if (it) {
      const titleInput = document.querySelector(`#track-item-wrap-${itemId} .pkg-item-title-input`);
      if (titleInput && titleInput.value.trim()) it.titulo = titleInput.value.trim();
      const fefoInput = document.getElementById(`fefo-input-${itemId}`);
      if (fefoInput && fefoInput.value.trim()) {
        let clean = fefoInput.value.trim().toLowerCase();
        if (clean && !clean.endsWith('.wav')) clean += '.wav';
        it.arquivo_fefo = clean;
        it.arquivo = `/usr/a/${clean}`;
      }
      const descInput = document.querySelector(`#panel-ai-${itemId} .pkg-item-script-textarea`);
      if (descInput) it.descricao = descInput.value;

      // Se houver áudio gerado/modificado no IndexedDB, salva no disco local imediatamente
      if (window.AudioBlobDB) {
        try {
          const b = await window.AudioBlobDB.getAudio(itemId);
          if (b) {
            const fname = it.arquivo_fefo || 'a0001.wav';
            const form = new FormData();
            form.append('filename', fname);
            form.append('file', b, fname);
            await fetch('/api/packages/save_audio_file', { method: 'POST', body: form });
            it.web_url = `../repository/audio/${fname}?_t=${Date.now()}`;
          }
        } catch (e) {}
      }
    }
    await this.saveDraftPackageDetails(pkgOrMenuTitle);
  },

  async deleteProductionMenuDirect(menuTitle) {
    if (!confirm(`Tem certeza que deseja excluir o menu oficial “${menuTitle}”?`)) return;
    this.state.publishedMenus = (this.state.publishedMenus || []).filter(p => p.titulo !== menuTitle);
    if (this.state.expandedProductionTitle === menuTitle) this.state.expandedProductionTitle = null;
    PkgStorage.saveAllProductionMenus(this.state.publishedMenus);
    notice(`Menu “${menuTitle}” excluído.`, 'ok');
    this.renderPublishedGrid();
  },

  updateProductionItemTitle(menuTitle, itemId, newTitle) {
    const pkg = (this.state.publishedMenus || []).find(p => p.titulo === menuTitle);
    if (!pkg) return;
    const it = (pkg.items || []).find(x => x.id === itemId);
    if (!it) return;
    it.titulo = newTitle.trim();
    PkgStorage.saveAllProductionMenus(this.state.publishedMenus);
  },

  updateProductionItemFefoFile(menuTitle, itemId, newName) {
    let clean = (newName || '').trim().toLowerCase();
    if (clean && !clean.endsWith('.wav')) clean += '.wav';
    const pkg = (this.state.publishedMenus || []).find(p => p.titulo === menuTitle);
    if (!pkg) return;
    const it = (pkg.items || []).find(x => x.id === itemId);
    if (!it) return;
    it.arquivo = `/usr/a/${clean}`;
    it.arquivo_fefo = clean;
    PkgStorage.saveAllProductionMenus(this.state.publishedMenus);
  },

  updateProductionItemScript(menuTitle, itemId, newDesc) {
    const pkg = (this.state.publishedMenus || []).find(p => p.titulo === menuTitle);
    if (!pkg) return;
    const it = (pkg.items || []).find(x => x.id === itemId);
    if (!it) return;
    it.descricao = newDesc;
    PkgStorage.saveAllProductionMenus(this.state.publishedMenus);

    const badge = document.getElementById(`script-saved-prod-${itemId}`);
    if (badge) {
      badge.classList.add('visible');
      clearTimeout(this.debounceTimers[`badge_prod_${itemId}`]);
      this.debounceTimers[`badge_prod_${itemId}`] = setTimeout(() => badge.classList.remove('visible'), 2000);
    }
  },

  scheduleBackendMetadataSave(pkgId, itemId, data) {
    clearTimeout(this.debounceTimers[`meta_${itemId}`]);
    this.debounceTimers[`meta_${itemId}`] = setTimeout(async () => {
      try {
        await fetch('/api/packages/update_item_metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ package_id: pkgId, item_id: itemId, ...data })
        });
      } catch (e) {}
    }, 600);
  },

  addNewEmptyItem(pkgId) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    const nextFefo = this.getNextAvailableFefoName();
    const newItem = {
      id: `it_${Date.now() % 1000000}_${(pkg.items || []).length + 1}`,
      titulo: `Nova Faixa ${(pkg.items || []).length + 1}`,
      descricao: '',
      arquivo_fefo: nextFefo,
      arquivo_origem: '',
      web_url: '',
      status: 'pending_audio'
    };
    pkg.items = pkg.items || [];
    pkg.items.push(newItem);
    PkgStorage.saveAllDrafts(this.state.drafts);
    this.renderDraftExpandedPanel();
    notice('Nova faixa adicionada!', 'ok');
  },

  addNewEmptyProductionItem(menuTitle) {
    const pkg = (this.state.publishedMenus || []).find(p => p.titulo === menuTitle);
    if (!pkg) return;
    const nextFefo = this.getNextAvailableFefoName();
    const nextNum = (pkg.items || []).length + 1;
    const newItem = {
      id: `au${String(nextNum).padStart(3, '0')}_${Date.now() % 1000}`,
      codigo_item: `au_${nextNum}`,
      titulo: `Nova Faixa Oficial ${nextNum}`,
      descricao: '',
      arquivo: `/usr/a/${nextFefo}`,
      arquivo_fefo: nextFefo,
      arquivo_origem: '',
      web_url: '',
      status: 'pending_audio'
    };
    pkg.items = pkg.items || [];
    pkg.items.push(newItem);
    pkg.count = pkg.items.length;
    PkgStorage.saveAllProductionMenus(this.state.publishedMenus);
    this.renderProductionExpandedPanel();
    this.renderPublishedGrid();
    notice('Nova faixa oficial adicionada!', 'ok');
  },

  createNewDraftPackage() {
    const newPkg = {
      id: `pkg_${Date.now() % 1000000}`,
      titulo: 'Novo Menu',
      descricao: '',
      target_count: 10,
      categoria: 'Contos',
      licencas: ['home', 'clinical', 'escola'],
      is_premium: false,
      status: 'draft',
      items: []
    };

    this.state.drafts.unshift(newPkg);
    this.state.expandedDraftId = newPkg.id;
    PkgStorage.saveAllDrafts(this.state.drafts);
    this.renderDraftsGrid();

    setTimeout(() => {
      document.getElementById('draft-inline-drawer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      document.getElementById('draft-input-title')?.focus();
      document.getElementById('draft-input-title')?.select();
    }, 100);
  },



  // ==========================================================
  // ESCOLHER / TROCAR ÁUDIO DE UMA FAIXA INDIVIDUAL
  // ==========================================================
  promptChooseAudio(containerId, itemId, isProduction = false) {
    let fileInput = document.getElementById('global-audio-replace-input');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.id = 'global-audio-replace-input';
      fileInput.type = 'file';
      fileInput.accept = '.wav,.mp3,.ogg,.m4a,.flac,.aac,audio/*';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
    }

    fileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        this.handleAudioFileSelected(containerId, itemId, file, isProduction);
      }
      fileInput.value = '';
    };
    fileInput.click();
  },

  async handleAudioFileSelected(containerId, itemId, file, isProduction = false) {
    notice(`Carregando áudio "${file.name}"...`);

    // 1. Armazena no IndexedDB local
    await AudioBlobDB.setAudio(itemId, file);

    const blobUrl = URL.createObjectURL(file);

    if (isProduction) {
      const menu = (this.state.publishedMenus || []).find(m => m.titulo === containerId);
      const it = menu ? (menu.items || []).find(x => x.id === itemId) : null;
      if (it) {
        it.web_url = blobUrl;
        it.arquivo_origem = file.name;
        it.tamanho = file.size;
        it.status = 'ready';
      }
      PkgStorage.saveAllProductionMenus(this.state.publishedMenus);
      this.renderProductionExpandedPanel();
      notice(`✓ Áudio "${file.name}" carregado na faixa oficial!`, 'ok');
    } else {
      const pkg = (this.state.drafts || []).find(p => p.id === containerId);
      const it = pkg ? (pkg.items || []).find(x => x.id === itemId) : null;
      if (it) {
        it.web_url = blobUrl;
        it.arquivo_origem = file.name;
        it.tamanho = file.size;
        it.status = 'needs_trim';
      }
      PkgStorage.saveAllDrafts(this.state.drafts);

      try {
        const form = new FormData();
        form.append('package_id', containerId);
        form.append('item_id', itemId);
        form.append('file', file, file.name);

        const res = await fetch('/api/packages/upload_single_item_audio', { method: 'POST', body: form });
        const data = await res.json();
        if (data.ok && data.item) {
          it.arquivo_draft = data.item.arquivo_draft;
          notice(`✓ Áudio "${file.name}" salvo no servidor!`, 'ok');
        } else {
          notice(`✓ Áudio "${file.name}" salvo localmente!`, 'ok');
        }
      } catch (e) {
        notice(`✓ Áudio "${file.name}" salvo localmente!`, 'ok');
      }

      this.renderDraftExpandedPanel();
      this.renderDraftsGrid();
    }
  },

  async uploadAudiosToDraft(pkgId, files) {
    if (!files || !files.length) return;
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;

    notice(`Processando ${files.length} arquivo(s) de áudio...`);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const nextFefo = this.getNextAvailableFefoName();
      const itemId = `it_${Date.now() % 1000000}_${(pkg.items || []).length + 1}`;
      
      await AudioBlobDB.setAudio(itemId, f);
      const blobUrl = URL.createObjectURL(f);

      pkg.items = pkg.items || [];
      pkg.items.push({
        id: itemId,
        titulo: f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        descricao: '',
        arquivo_fefo: nextFefo,
        arquivo_origem: f.name,
        web_url: blobUrl,
        tamanho: f.size,
        status: 'needs_trim'
      });
    }

    PkgStorage.saveAllDrafts(this.state.drafts);
    this.renderDraftExpandedPanel();
    this.renderDraftsGrid();

    try {
      const form = new FormData();
      form.append('package_id', pkgId);
      for (const f of files) form.append('file', f, f.name);
      const res = await fetch('/api/packages/upload_audio', { method: 'POST', body: form });
      const data = await res.json();
      if (data.ok) notice(data.message || 'Áudios enviados com sucesso!', 'ok');
    } catch (e) {
      notice(`${files.length} áudio(s) adicionados ao pacote!`, 'ok');
    }
  },

  async deleteDraftItem(pkgId, itemId) {
    if (!confirm('Remover esta faixa do pacote?')) return;
    const pkg = this.state.drafts.find(p => p.id === pkgId);
    if (!pkg) return;

    pkg.items = (pkg.items || []).filter(x => x.id !== itemId);
    PkgStorage.addDeletedItemId(itemId);
    AudioBlobDB.deleteAudio(itemId);
    PkgStorage.saveAllDrafts(this.state.drafts);

    this.renderDraftExpandedPanel();
    this.renderDraftsGrid();
    notice('Faixa removida com sucesso.', 'ok');

    try {
      await fetch('/api/packages/delete_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: pkgId, item_id: itemId })
      });
    } catch (e) {}
  },

  async deleteDraftPackage(pkgId) {
    const pkg = this.state.drafts.find(p => p.id === pkgId);
    const title = pkg ? pkg.titulo : pkgId;
    if (!confirm(`Tem certeza que deseja excluir o pacote “${title}” e suas faixas em rascunho?`)) return;

    this.state.drafts = this.state.drafts.filter(p => p.id !== pkgId);
    if (this.state.expandedDraftId === pkgId) this.state.expandedDraftId = null;

    PkgStorage.addDeletedPkgId(pkgId);
    PkgStorage.saveAllDrafts(this.state.drafts);

    this.renderDraftsGrid();
    notice('Pacote removido com sucesso.', 'ok');

    try {
      await fetch('/api/packages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pkgId })
      });
    } catch (e) {}
  },

  async trimDraftItem(pkgId, itemId, audioUrl, title, description = '', itemCode = '') {
    if (!window.openAudioTrimmer) {
      alert('Ferramenta de corte indisponível.');
      return;
    }

    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    const it = pkg ? (pkg.items || []).find(x => x.id === itemId) : null;
    const currentDesc = it && it.descricao !== undefined ? it.descricao : description;

    let effectiveUrl = audioUrl;
    if (!effectiveUrl && it && it.web_url) {
      effectiveUrl = this.resolveUrl(it.web_url);
    }
    if (!effectiveUrl) {
      const blob = await AudioBlobDB.getAudio(itemId);
      if (blob) effectiveUrl = URL.createObjectURL(blob);
    }

    window.openAudioTrimmer({
      url: effectiveUrl,
      title: title,
      description: currentDesc,
      itemCode: itemCode,
      onSave: async (blob, info) => {
        notice('Salvando áudio cortado na faixa...');
        await AudioBlobDB.setAudio(itemId, blob);

        if (it) {
          it.web_url = URL.createObjectURL(blob);
          it.status = 'ready';
          it.tamanho = blob.size;
        }
        PkgStorage.saveAllDrafts(this.state.drafts);
        this.renderDraftExpandedPanel();
        this.renderDraftsGrid();

        try {
          const form = new FormData();
          form.append('tipo', 'draft');
          form.append('package_id', pkgId);
          form.append('item_id', itemId);
          form.append('file', blob, `${itemCode || 'cut'}.wav`);

          const res = await fetch('/api/packages/replace_audio', { method: 'POST', body: form });
          const data = await res.json();
          if (data.ok) notice(data.message || 'Corte salvo com sucesso!', 'ok');
          else notice('Corte salvo no navegador com sucesso!', 'ok');
        } catch (e) {
          notice('Corte salvo no navegador com sucesso!', 'ok');
        }
      }
    });
  },

  async publishDraftPackage(pkgId) {
    const pkg = this.state.drafts.find(p => p.id === pkgId);
    if (!pkg) return;

    const count = (pkg.items || []).length;
    if (count === 0) {
      notice('Adicione pelo menos um áudio ao pacote antes de publicar.', 'error');
      return;
    }

    const confirmMsg = `🚀 PUBLICAR PACOTE OFICIAL\n\nPublicar “${pkg.titulo}” como MENU OFICIAL com ${count} faixa(s)?\n\nO catálogo oficial será atualizado e os áudios ficarão disponíveis para download nos celulares e no FEFO Pet!`;
    if (!confirm(confirmMsg)) return;

    notice('Publicando menu no catálogo oficial... aguarde...', '');

    // 1. Tenta API do servidor local
    let publishedLocally = false;
    try {
      const res = await fetch('/api/packages/publish_official', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: pkgId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          publishedLocally = true;
          notice(data.message || 'Pacote publicado com sucesso!', 'ok');
          this.state.expandedDraftId = null;
          await this.loadPackages();
          return;
        }
      }
    } catch (err) {}

    // 2. Se a API local estiver offline, publica diretamente pelo GitHub REST API!
    if (window.GitHubSync && window.GitHubSync.isConfigured()) {
      try {
        const ghResult = await window.GitHubSync.publishOfficialMenu(pkg, (msg) => {
          notice(msg, '');
        });
        notice(ghResult.message, 'ok');
        this.state.expandedDraftId = null;
        await this.loadPackages();
      } catch (ghErr) {
        notice(`Erro na publicação via GitHub: ${ghErr.message}`, 'error');
      }
    } else {
      notice('Servidor local offline. Para publicar de qualquer computador, clique no botão “⚙️ Conectar GitHub” no topo!', 'error');
      window.GitHubSync?.openModal();
    }
  },

  // ==========================================================
  // DESPUBLICAR MENU: MOVE DE PRODUÇÃO PARA RASCUNHOS
  // ==========================================================
  async unpublishMenu(menuTitle) {
    if (!confirm(`Despublicar o menu “${menuTitle}”?\n\nEle sairá do catálogo oficial (ficará OFFLINE para os pets) e será movido para os Pacotes em Rascunho para que você possa alterar áudios, cortar ou renomear livremente.`)) {
      return;
    }

    const menu = this.state.publishedMenus.find(m => m.titulo === menuTitle);
    if (!menu) return;

    notice(`Despublicando menu “${menuTitle}”...`);

    const draftItems = (menu.items || []).map((it, idx) => ({
      id: it.id || `item_${Date.now() % 1000000}_${idx}`,
      codigo_item: it.id || `au_${idx + 1}`,
      titulo: it.titulo || `Faixa ${idx + 1}`,
      descricao: it.descricao || '',
      arquivo_fefo: it.arquivo ? it.arquivo.split('/').pop() : `a${String(idx + 1).padStart(4, '0')}.wav`,
      arquivo_origem: it.arquivo ? it.arquivo.split('/').pop() : '',
      web_url: it.web_url || (it.arquivo ? `../repository/audio/${it.arquivo.split('/').pop()}` : ''),
      status: 'ready',
      tamanho: it.tamanho || 0
    }));

    const draftId = `pkg_despub_${Date.now() % 1000000}`;
    const restoredDraft = {
      id: draftId,
      titulo: menu.titulo,
      descricao: menu.descricao || `Menu despublicado do catálogo oficial para edição e ajustes.`,
      target_count: draftItems.length || 8,
      categoria: menu.categoria || 'Geral',
      licencas: menu.licencas || ['home', 'clinical', 'escola'],
      is_premium: menu.is_premium || false,
      status: 'draft',
      items: draftItems
    };

    this.state.publishedMenus = this.state.publishedMenus.filter(m => m.titulo !== menuTitle);
    if (this.state.expandedProductionTitle === menuTitle) {
      this.state.expandedProductionTitle = null;
    }

    this.state.drafts.unshift(restoredDraft);
    this.state.expandedDraftId = draftId;

    PkgStorage.addUnpublishedMenu(menuTitle);
    PkgStorage.saveAllDrafts(this.state.drafts);
    PkgStorage.saveAllProductionMenus(this.state.publishedMenus);

    this.render();
    notice(`✓ Menu “${menuTitle}” despublicado e movido para Rascunhos!`, 'ok');

    try {
      await fetch('/api/packages/unpublish_menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_titulo: menuTitle, package: restoredDraft })
      });
    } catch (e) {}

    setTimeout(() => {
      document.getElementById('draft-packages-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  },

  async saveProductionMenu(oldMenuTitle) {
    const pkg = (this.state.publishedMenus || []).find(p => p.titulo === oldMenuTitle);
    const newMenuTitle = document.getElementById('prod-input-title')?.value.trim() || oldMenuTitle;
    
    if (pkg) {
      pkg.titulo = newMenuTitle;
      pkg.descricao = document.getElementById('prod-input-desc')?.value.trim() || '';
      pkg.target_count = parseInt(document.getElementById('prod-input-target')?.value, 10) || 8;
      this.updateProductionPackageLicenses(oldMenuTitle);
    }

    PkgStorage.saveAllProductionMenus(this.state.publishedMenus);
    notice('Atualizando menu oficial no catálogo...');

    const itemsUpdates = [];
    document.querySelectorAll('.prod-item-title').forEach(input => {
      itemsUpdates.push({
        id: input.dataset.itemId,
        titulo: input.value.trim()
      });
    });

    try {
      const res = await fetch('/api/production_menu/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_menu_titulo: oldMenuTitle,
          new_menu_titulo: newMenuTitle,
          items: itemsUpdates
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Falha ao atualizar menu.');
      notice(data.message || 'Menu oficial atualizado!', 'ok');
      this.state.expandedProductionTitle = newMenuTitle;
      await this.loadPackages();
    } catch (e) {
      notice('Alterações do menu salvas no navegador!', 'ok');
      this.render();
    }
  },

  async uploadAudiosToProduction(menuTitle, files) {
    if (!files || !files.length) return;
    const form = new FormData();
    form.append('menu_titulo', menuTitle);
    for (const f of files) form.append('file', f, f.name);

    notice(`Convertendo e adicionando ${files.length} áudio(s) ao menu oficial “${menuTitle}”...`);
    try {
      const res = await fetch('/api/production_menu/upload_audio', {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Falha no upload.');
      notice(data.message || 'Áudios adicionados ao menu oficial!', 'ok');
      await this.loadPackages();
    } catch (e) {
      notice(`Erro no upload oficial: ${e.message}`, 'error');
    }
  },

  async deleteProductionItem(itemId, itemTitle) {
    if (!confirm(`Remover definitivamente a faixa “${itemTitle || itemId}” do catálogo oficial?`)) return;

    this.state.publishedMenus.forEach(m => {
      if (m.items) m.items = m.items.filter(x => x.id !== itemId);
      m.count = (m.items || []).length;
    });

    PkgStorage.addDeletedItemId(itemId);
    PkgStorage.saveAllProductionMenus(this.state.publishedMenus);
    this.renderProductionExpandedPanel();
    this.renderPublishedGrid();
    notice('Áudio removido do catálogo oficial.', 'ok');

    try {
      await fetch('/api/production_menu/delete_audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId })
      });
    } catch (e) {}
  },

  async trimProductionItem(itemId, audioUrl, title) {
    if (!window.openAudioTrimmer) {
      alert('Ferramenta de corte indisponível.');
      return;
    }

    let effectiveUrl = audioUrl;
    if (!effectiveUrl) {
      const blob = await AudioBlobDB.getAudio(itemId);
      if (blob) effectiveUrl = URL.createObjectURL(blob);
    }

    window.openAudioTrimmer({
      url: effectiveUrl,
      title: title,
      onSave: async (blob, info) => {
        notice('Salvando corte no catálogo oficial...');
        await AudioBlobDB.setAudio(itemId, blob);

        const form = new FormData();
        form.append('tipo', 'production');
        form.append('item_id', itemId);
        form.append('file', blob, 'trimmed.wav');

        try {
          const res = await fetch('/api/packages/replace_audio', {
            method: 'POST',
            body: form
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.message);
          notice(data.message || 'Corte salvo e catálogo atualizado com sucesso!', 'ok');
          await this.loadPackages();
        } catch (e) {
          notice('Corte salvo no navegador com sucesso!', 'ok');
        }
      }
    });
  },

  // ==========================================================
  // CONTROLES DE ÁUDIO CUSTOMIZADOS (PLAY / PAUSE / STOP)
  // ==========================================================
  async playTrack(itemId) {
    let aud = document.getElementById(`audio-player-${itemId}`);
    if (!aud) return;

    if (!aud.src || aud.src === '' || aud.src === window.location.href) {
      const blob = await AudioBlobDB.getAudio(itemId);
      if (blob) {
        aud.src = URL.createObjectURL(blob);
      }
    }

    document.querySelectorAll('audio').forEach(a => {
      if (a !== aud && !a.paused) {
        a.pause();
        const otherId = a.id.replace('audio-player-', '');
        document.getElementById(`btn-play-${otherId}`)?.classList.remove('active');
        document.getElementById(`btn-pause-${otherId}`)?.classList.remove('active');
      }
    });

    aud.play().then(() => {
      document.getElementById(`btn-play-${itemId}`)?.classList.add('active');
      document.getElementById(`btn-pause-${itemId}`)?.classList.remove('active');
    }).catch(err => {
      console.warn('Erro ao tocar áudio:', err);
    });
  },

  pauseTrack(itemId) {
    const aud = document.getElementById(`audio-player-${itemId}`);
    if (!aud) return;
    aud.pause();
    document.getElementById(`btn-play-${itemId}`)?.classList.remove('active');
    document.getElementById(`btn-pause-${itemId}`)?.classList.add('active');
  },

  stopTrack(itemId) {
    const aud = document.getElementById(`audio-player-${itemId}`);
    if (!aud) return;
    aud.pause();
    aud.currentTime = 0;
    document.getElementById(`btn-play-${itemId}`)?.classList.remove('active');
    document.getElementById(`btn-pause-${itemId}`)?.classList.remove('active');
    const seek = document.getElementById(`seek-${itemId}`);
    if (seek) seek.value = 0;
    const cur = document.getElementById(`time-current-${itemId}`);
    if (cur) cur.textContent = '0:00';
  },

  seekTrack(itemId, pct) {
    const aud = document.getElementById(`audio-player-${itemId}`);
    if (!aud || !aud.duration) return;
    aud.currentTime = (pct / 100) * aud.duration;
  },

  setupAudioListeners(itemId) {
    const aud = document.getElementById(`audio-player-${itemId}`);
    if (!aud) return;
    const cur = document.getElementById(`time-current-${itemId}`);
    const tot = document.getElementById(`time-total-${itemId}`);
    const seek = document.getElementById(`seek-${itemId}`);

    const fmtTime = (s) => {
      if (isNaN(s) || !isFinite(s)) return '0:00';
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    aud.addEventListener('loadedmetadata', () => {
      if (tot && aud.duration) tot.textContent = fmtTime(aud.duration);
    });

    aud.addEventListener('timeupdate', () => {
      if (cur) cur.textContent = fmtTime(aud.currentTime);
      if (seek && aud.duration) {
        seek.value = (aud.currentTime / aud.duration) * 100;
      }
    });

    aud.addEventListener('ended', () => {
      this.stopTrack(itemId);
    });
  },

  // ==========================================================
  // NOMES ÚNICOS E RENOMEAÇÃO (APP & PET FEFO)
  // ==========================================================
  getNextAvailableFefoName() {
    const used = new Set();
    (this.state.publishedMenus || []).forEach(m => {
      (m.items || []).forEach(it => {
        const arq = (it.arquivo || it.arquivo_fefo || '').split('/').pop();
        const match = arq.match(/a(\d{4})\.wav/i);
        if (match) used.add(parseInt(match[1], 10));
      });
    });
    (this.state.drafts || []).forEach(p => {
      (p.items || []).forEach(it => {
        const arq = it.arquivo_fefo || '';
        const match = arq.match(/a(\d{4})\.wav/i);
        if (match) used.add(parseInt(match[1], 10));
      });
    });

    let cand = 1;
    while (used.has(cand)) cand++;
    return `a${String(cand).padStart(4, '0')}.wav`;
  },

  suggestNextFefoName(pkgId, itemId) {
    const nextName = this.getNextAvailableFefoName();
    this.updateDraftItemFefoFile(pkgId, itemId, nextName);
    const input = document.getElementById(`fefo-input-${itemId}`);
    if (input) input.value = nextName;
    notice(`Nome único sugerido: ${nextName}`, 'ok');
  },

  suggestNextFefoNameForProduction(menuTitle, itemId) {
    const nextName = this.getNextAvailableFefoName();
    this.updateProductionItemFefoFile(menuTitle, itemId, nextName);
    this.renderProductionExpandedPanel();
    notice(`Nome único sugerido: ${nextName}`, 'ok');
  },

  // ==========================================================
  // EXPORTAR BACKUP JSON
  // ==========================================================
  exportDraftsJson() {
    const data = {
      schema: 1,
      exported_at: new Date().toISOString(),
      draft_packages: this.state.drafts || [],
      published_menus: this.state.publishedMenus || []
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fefo_catalog_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notice('Backup JSON baixado com sucesso!', 'ok');
  },


  // ==========================================================
  // INTELIGÊNCIA ARTIFICIAL: GERAÇÃO DA VOZ DO FEFO
  // ==========================================================
  // ==========================================================
  // INTELIGÊNCIA ARTIFICIAL: MOTOR EXCLUSIVO F5-TTS
  // (Zero-Shot Voice Cloning - GitHub SWivid/F5-TTS)
  // ==========================================================
  async openAiVoiceSettings() {
    const modal = document.getElementById('modal-ai-voice');
    if (!modal) return;

    const f5Url = localStorage.getItem('fefo_f5_server_url') || 'http://localhost:9880';
    const f5Model = localStorage.getItem('fefo_f5_model') || 'pt-br';
    const selModel = document.getElementById('ai-f5-model-select');
    if (selModel) selModel.value = f5Model;
    let f5RefText = localStorage.getItem('fefo_f5_ref_text') || '';
    if (!f5RefText || f5RefText.includes('Olá amiguinho') || f5RefText.length < 50) {
      f5RefText = 'Bom dia, hora de acordar. Hora do lanche! Parabéns, você completou sua missão.';
      localStorage.setItem('fefo_f5_ref_text', f5RefText);
    }
    const speed = localStorage.getItem('fefo_ai_speed') || '1.0';
    let nfe = localStorage.getItem('fefo_ai_nfe') || '16';
    if (parseInt(nfe, 10) < 12) {
      nfe = '16';
      localStorage.setItem('fefo_ai_nfe', '16');
    }
    let cfg = localStorage.getItem('fefo_ai_cfg') || '3.0';
    if (parseFloat(cfg) < 2.5) {
      cfg = '3.0';
      localStorage.setItem('fefo_ai_cfg', '3.0');
    }
    const removeSilence = localStorage.getItem('fefo_ai_remove_silence') !== '0';
    const sampleName = localStorage.getItem('fefo_ai_sample_name') || '';

    const inpF5Url = document.getElementById('ai-f5-server-url');
    if (inpF5Url) inpF5Url.value = f5Url;
    const inpF5Ref = document.getElementById('ai-f5-ref-text');
    if (inpF5Ref) inpF5Ref.value = f5RefText;

    const inpSpeed = document.getElementById('ai-speed-slider');
    if (inpSpeed) {
      inpSpeed.value = speed;
      const lbl = document.getElementById('ai-speed-val');
      if (lbl) lbl.textContent = speed + 'x';
    }

    const inpNfe = document.getElementById('ai-nfe-slider');
    if (inpNfe) {
      inpNfe.value = nfe;
      const lbl = document.getElementById('ai-nfe-val');
      if (lbl) lbl.textContent = nfe + ' Passos';
    }

    const inpCfg = document.getElementById('ai-cfg-slider');
    if (inpCfg) {
      inpCfg.value = cfg;
      const lbl = document.getElementById('ai-cfg-val');
      if (lbl) lbl.textContent = parseFloat(cfg).toFixed(1);
    }

    const chkSilence = document.getElementById('ai-remove-silence');
    if (chkSilence) chkSilence.checked = removeSilence;

    const lblSample = document.getElementById('ai-sample-name');

    // Carrega a amostra de referência da voz do FEFO salva no IndexedDB ou padrão do repositório (3.9s limpa)
    try {
      let sampleName = localStorage.getItem('fefo_ai_sample_name') || '';
      let sampleBlob = await AudioBlobDB.getAudio('fefo_voice_sample');
      // Apenas carrega padrão do repositório se o usuário ainda NÃO tiver nenhuma amostra configurada
      if (!sampleBlob) {
        try {
          const r = await fetch('../repository/fefo_ref_clean.wav');
          if (r.ok) {
            sampleBlob = await r.blob();
            await AudioBlobDB.setAudio('fefo_voice_sample', sampleBlob);
            localStorage.setItem('fefo_ai_sample_name', 'fefo_ref_clean.wav');
          }
        } catch (e) {}
      }

      const playerBox = document.getElementById('ai-sample-player-container');
      const player = document.getElementById('ai-sample-player');
      if (sampleBlob && player && playerBox) {
        player.src = URL.createObjectURL(sampleBlob);
        playerBox.style.display = 'block';
        if (lblSample) lblSample.textContent = `✓ Áudio: ${localStorage.getItem('fefo_ai_sample_name') || 'fefo_voice_sample.wav'}`;
      } else if (lblSample) {
        lblSample.textContent = sampleName ? `✓ Áudio: ${sampleName}` : 'Nenhum áudio enviado';
      }
    } catch (e) {}

    this.testF5Server();
    modal.style.display = 'flex';
  },

  closeAiVoiceSettings() {
    const modal = document.getElementById('modal-ai-voice');
    if (modal) modal.style.display = 'none';
  },

  onAiProviderChange() {
    // F5-TTS é o motor exclusivo
  },

  async testF5Server() {
    const statusEl = document.getElementById('f5-server-status');
    const f5Url = (document.getElementById('ai-f5-server-url')?.value || localStorage.getItem('fefo_f5_server_url') || 'http://localhost:9880').replace(/\/+$/, '');
    if (statusEl) {
      statusEl.textContent = '⏳ Verificando conexão...';
      statusEl.style.background = '#eee';
      statusEl.style.color = '#555';
    }

    const testUrls = [
      `${f5Url}/health`,
      `${f5Url}/api/f5-tts/status`,
      'http://localhost:9880/health',
      'http://127.0.0.1:9880/health',
      '/api/f5-tts/status',
      '/health'
    ];

    for (const u of testUrls) {
      try {
        const res = await fetch(u, { method: 'GET', signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (statusEl) {
            statusEl.textContent = `● Online (${data.engine || 'F5-TTS'} • ${data.device ? data.device.toUpperCase() : 'OK'})`;
            statusEl.style.background = '#e8f8f0';
            statusEl.style.color = '#127547';
          }
          return true;
        }
      } catch (e) {}
    }

    if (statusEl) {
      statusEl.textContent = '✕ Offline (Inicie tools/iniciar_f5_tts.bat)';
      statusEl.style.background = '#fde8e8';
      statusEl.style.color = '#c0392b';
    }
    return false;
  },

  async handleVoiceSampleUpload(files) {
    if (!files || !files[0]) return;
    const file = files[0];
    const statusEl = document.getElementById('ai-sample-status');
    const nameEl = document.getElementById('ai-sample-name');
    const playerBox = document.getElementById('ai-sample-player-container');
    const player = document.getElementById('ai-sample-player');

    if (nameEl) nameEl.textContent = file.name;
    if (statusEl) {
      statusEl.textContent = 'Carregando amostra...';
      statusEl.style.color = 'var(--purple)';
    }

    try {
      await AudioBlobDB.setAudio('fefo_voice_sample', file);
      localStorage.setItem('fefo_ai_sample_name', file.name);

      if (player && playerBox) {
        player.src = URL.createObjectURL(file);
        playerBox.style.display = 'block';
      }

      if (statusEl) {
        statusEl.textContent = '✓ Amostra do FEFO Carregada!';
        statusEl.style.color = '#27ae60';
      }
      notice(`✓ Áudio de referência "${file.name}" salvo com sucesso para o F5-TTS!`, 'ok');
      // Transcreve automaticamente o áudio para manter sincronia 100% perfeita
      this.autoTranscribeSample();
    } catch (e) {
      console.error('Erro ao salvar amostra:', e);
      notice(`Erro ao salvar amostra: ${e.message}`, 'error');
    }
  },

  async autoTranscribeSample() {
    const statusEl = document.getElementById('ai-sample-status');
    const refTextEl = document.getElementById('ai-f5-ref-text');
    let sampleBlob = await AudioBlobDB.getAudio('fefo_voice_sample');
    if (!sampleBlob) {
      notice('Nenhum áudio de referência carregado para transcrever.', 'error');
      return;
    }
    notice('Transcrevendo áudio de referência automaticamente com IA...');
    if (statusEl) {
      statusEl.textContent = '⏳ Reconhecendo texto...';
      statusEl.style.color = 'var(--purple)';
    }

    try {
      const b64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(sampleBlob);
      });

      const res = await fetch('http://localhost:9880/api/f5-tts/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: b64 })
      });
      const data = await res.json();
      if (data.ok && data.text) {
        if (refTextEl) refTextEl.value = data.text;
        localStorage.setItem('fefo_f5_ref_text', data.text);
        if (statusEl) {
          statusEl.textContent = '✓ Transcrição Reconhecida!';
          statusEl.style.color = '#27ae60';
        }
        notice('✓ Texto do áudio reconhecido: "' + data.text + '"', 'ok');
      } else {
        throw new Error(data.error || 'Falha na transcrição');
      }
    } catch (err) {
      console.warn('Aviso transcrição:', err);
      if (statusEl) {
        statusEl.textContent = '● Pronto (Texto manual)';
        statusEl.style.color = '#27ae60';
      }
    }
  },

  saveAiVoiceSettings() {
    const f5Url = document.getElementById('ai-f5-server-url')?.value.trim() || 'http://localhost:9880';
    const f5Model = document.getElementById('ai-f5-model-select')?.value || 'pt-br';
    localStorage.setItem('fefo_f5_model', f5Model);
    let f5Ref = document.getElementById('ai-f5-ref-text')?.value.trim() || '';
    if (!f5Ref || f5Ref.includes('Olá amiguinho')) {
      f5Ref = 'Bom dia, hora de acordar. Hora do lanche! Parabéns, você completou sua missão.';
    }
    const speed = document.getElementById('ai-speed-slider')?.value || '1.0';
    let nfe = document.getElementById('ai-nfe-slider')?.value || '16';
    if (parseInt(nfe, 10) < 12) nfe = '16';
    const cfg = document.getElementById('ai-cfg-slider')?.value || '3.0';
    const removeSilence = document.getElementById('ai-remove-silence')?.checked !== false;

    localStorage.setItem('fefo_ai_provider', 'f5_tts');
    localStorage.setItem('fefo_f5_server_url', f5Url);
    localStorage.setItem('fefo_f5_ref_text', f5Ref);
    localStorage.setItem('fefo_ai_speed', speed);
    localStorage.setItem('fefo_ai_nfe', nfe);
    localStorage.setItem('fefo_ai_cfg', cfg);
    localStorage.setItem('fefo_ai_remove_silence', removeSilence ? '1' : '0');

    notice('Configurações exclusivas do F5-TTS salvas com sucesso!', 'ok');
    this.closeAiVoiceSettings();
  },

  async testAiVoice() {
    const text = document.getElementById('ai-test-text')?.value.trim() || 'Olá amiguinho! Eu sou o Fefo.';
    const btn = document.getElementById('btn-ai-test-submit');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '⏳ Gerando...';
      btn.disabled = true;
    }

    const testProgContainer = document.getElementById('ai-test-progress');
    const testTracker = window.AiVoiceProgress ? window.AiVoiceProgress.create(testProgContainer, 'Testando síntese F5-TTS...') : null;

    notice('Sintetizando áudio de teste com IA F5-TTS...');
    try {
      const speed = parseFloat(document.getElementById('ai-speed-slider')?.value || '1.0');
      const nfe = parseInt(document.getElementById('ai-nfe-slider')?.value || '16', 10);
      const cfg = parseFloat(document.getElementById('ai-cfg-slider')?.value || '2.0');
      const removeSilence = document.getElementById('ai-remove-silence')?.checked !== false;

      const blob = await this.synthesizeVoiceBlob(text, { speed, nfe_step: nfe, cfg_strength: cfg, remove_silence: removeSilence });
      if (blob) {
        testTracker?.finish('✓ Teste concluído!');
        const audioUrl = URL.createObjectURL(blob);
        const player = document.getElementById('ai-test-player');
        if (player) {
          player.src = audioUrl;
          player.style.display = 'block';
          player.play().catch(() => {});
        }
        notice('✓ Áudio de teste gerado com sucesso pelo F5-TTS!', 'ok');
      }
    } catch (e) {
      testTracker?.fail(`Erro: ${e.message}`);
      notice(`Erro no teste F5-TTS: ${e.message}`, 'error');
    } finally {
      if (btn) {
        btn.innerHTML = origHtml;
        btn.disabled = false;
      }
    }
  },

  async synthesizeVoiceBlob(text, opts = {}) {
    const f5Url = (localStorage.getItem('fefo_f5_server_url') || 'http://localhost:9880').replace(/\/+$/, '');
    let refText = localStorage.getItem('fefo_f5_ref_text') || '';
    if (!refText || refText.includes('Olá amiguinho') || refText.length < 50) {
      refText = 'Bom dia, hora de acordar. Hora do lanche! Parabéns, você completou sua missão.';
      localStorage.setItem('fefo_f5_ref_text', refText);
    }
    const speed = opts.speed ?? parseFloat(localStorage.getItem('fefo_ai_speed') || '1.0');
    let nfe_step = opts.nfe_step ?? parseInt(localStorage.getItem('fefo_ai_nfe') || '16', 10);
    if (nfe_step < 12) nfe_step = 16;
    let cfg_strength = opts.cfg_strength ?? parseFloat(localStorage.getItem('fefo_ai_cfg') || '3.0');
    if (cfg_strength < 2.5) cfg_strength = 3.0;
    const remove_silence = opts.remove_silence ?? (localStorage.getItem('fefo_ai_remove_silence') !== '0');

    // 1. Obter áudio de referência do FEFO (amostra limpa de 3.9s)
    let sampleBlob = await AudioBlobDB.getAudio('fefo_voice_sample');
    if (!sampleBlob) {
      try {
        const r = await fetch('../repository/fefo_ref_clean.wav');
        if (r.ok) {
          sampleBlob = await r.blob();
          await AudioBlobDB.setAudio('fefo_voice_sample', sampleBlob);
          localStorage.setItem('fefo_ai_sample_name', 'fefo_ref_clean.wav');
        }
      } catch (e) {}
    }

    let refAudioBase64 = null;
    if (sampleBlob) {
      refAudioBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(sampleBlob);
      });
    }

    const chosenModel = opts.model || localStorage.getItem('fefo_f5_model') || 'pt-br';
    const payload = {
      text: text,
      ref_audio: refAudioBase64,
      ref_text: refText,
      model: chosenModel,
      speed: speed,
      nfe_step: nfe_step,
      cfg_strength: cfg_strength,
      remove_silence: remove_silence,
      provider: 'f5_tts'
    };

    const host = window.location.hostname || 'localhost';
    const endpoints = [
      `http://${host}:9880/api/f5-tts/generate`,
      '/api/f5-tts/generate',
      `${f5Url}/api/f5-tts/generate`,
      'http://127.0.0.1:9880/api/f5-tts/generate',
      'http://localhost:9880/api/f5-tts/generate'
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(300000)
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.audio_base64) {
            const binary = atob(data.audio_base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return new Blob([bytes], { type: 'audio/wav' });
          }
        }
      } catch (err) {}
    }

    throw new Error(`Servidor F5-TTS não respondeu em ${f5Url} nem na porta local 9880. Inicie com 'tools\\iniciar_f5_tts.bat'.`);
  },

  async generateFefoAudio(containerId, itemId, isProduction = false) {
    let pkg, it, currentScript = '';

    if (isProduction) {
      pkg = (this.state.publishedMenus || []).find(p => p.titulo === containerId);
      it = pkg ? (pkg.items || []).find(x => x.id === itemId) : null;
    } else {
      pkg = (this.state.drafts || []).find(p => p.id === containerId);
      it = pkg ? (pkg.items || []).find(x => x.id === itemId) : null;
    }

    if (!it) return;

    currentScript = (it.descricao || '').trim();
    if (!currentScript) {
      alert('Por favor, digite o texto do roteiro na caixa "📜 Texto do Áudio" antes de gerar a voz do FEFO.');
      return;
    }

    const btnId = isProduction ? `btn-ai-prod-${itemId}` : `btn-ai-${itemId}`;
    const btn = document.getElementById(btnId);
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '⏳ Gerando voz F5-TTS...';
      btn.classList.add('loading');
      btn.disabled = true;
    }

    // Criar ou obter caixa da barra de progresso visual
    let progBox = document.getElementById(isProduction ? `ai-prog-prod-${itemId}` : `ai-prog-${itemId}`);
    if (!progBox && btn) {
      progBox = document.createElement('div');
      progBox.id = isProduction ? `ai-prog-prod-${itemId}` : `ai-prog-${itemId}`;
      const panel = btn.closest('.track-accordion-panel');
      const textarea = panel ? panel.querySelector('textarea') : null;
      if (panel && textarea) panel.insertBefore(progBox, textarea);
    }
    const tracker = window.AiVoiceProgress ? window.AiVoiceProgress.create(progBox, `Sintetizando voz do FEFO para "${it.titulo || 'faixa'}"...`) : null;

    notice(`Sintetizando voz do FEFO (F5-TTS) para a faixa "${it.titulo}"...`);

    try {
      const blob = await this.synthesizeVoiceBlob(currentScript);
      tracker?.finish('✓ Voz do FEFO gerada com sucesso!');

      if (!blob || blob.size === 0) {
        throw new Error('Não foi possível obter o áudio sintetizado pelo F5-TTS.');
      }

      await AudioBlobDB.setAudio(itemId, blob);
      const blobUrl = URL.createObjectURL(blob);

      // Carrega imediatamente como áudio oficial da faixa
      it.web_url = blobUrl;
      const sampleName = localStorage.getItem('fefo_ai_sample_name') || 'voz_fefo.wav';
      it.arquivo_origem = `Voz FEFO IA (${(it.arquivo_fefo || sampleName)})`;
      it.tamanho = blob.size;
      it.status = 'needs_trim';

      if (isProduction) {
        PkgStorage.saveAllProductionMenus(this.state.publishedMenus);
        this.renderProductionExpandedPanel();
      } else {
        PkgStorage.saveAllDrafts(this.state.drafts);
        this.renderDraftExpandedPanel();
        this.renderDraftsGrid();
      }

      notice(`✓ Voz sintetizada com F5-TTS com sucesso! Abra "✂ Cortar este Áudio" para ajustar se desejar.`, 'ok');
      setTimeout(() => {
        this.setupAudioListeners(itemId);
        this.playTrack(itemId);
      }, 300);
    } catch (err) {
      tracker?.fail(`Erro F5-TTS: ${err.message}`);
      notice(`Atenção F5-TTS: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.innerHTML = origHtml;
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    }
  },

    escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  },

  formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
};

window.PkgManager = PkgManager;

document.addEventListener('DOMContentLoaded', () => {
  PkgManager.init();
});
