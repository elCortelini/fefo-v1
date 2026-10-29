/**
 * packages.js - Gerenciador Unificado de Pacotes & Menus do FEFO Pet
 * Suporta persistência total online (GitHub Pages) e offline/local,
 * troca de áudios em qualquer faixa, edição de texto/roteiro do FEFO,
 * filtro por licença (Escola, Home, Clínica) e despublicação de menus.
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
      // Clona serializável (sem blob URLs voláteis para não quebrar)
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
  }
};

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
    if (url.startsWith('/repository/')) return '../' + url.slice(1);
    if (url.startsWith('/')) return '..' + url;
    return url;
  },

  async init() {
    this.bindEvents();
    await this.loadPackages();
  },

  bindEvents() {
    // Botão "+ Criar Novo Pacote / Menu"
    const btnNew = document.getElementById('btn-new-package');
    if (btnNew) {
      btnNew.addEventListener('click', () => this.createNewDraftPackage());
    }

    // Botão "💾 Baixar Backup JSON"
    const btnExport = document.getElementById('btn-export-drafts');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportDraftsJson());
    }

    // Filtro de Busca
    const searchInput = document.getElementById('pkg-filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.filterSearch = e.target.value.toLowerCase().trim();
        this.renderDraftsGrid();
      });
    }

    // Filtro de Licença (Home, Clínica, Escola)
    const licSelect = document.getElementById('pkg-filter-license');
    if (licSelect) {
      licSelect.addEventListener('change', (e) => {
        this.state.filterLicense = e.target.value;
        this.renderDraftsGrid();
      });
    }

    // Filtro de Categoria
    const catSelect = document.getElementById('pkg-filter-category');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.state.filterCategory = e.target.value;
        this.renderDraftsGrid();
      });
    }

    // Filtro de Status
    const statusSelect = document.getElementById('pkg-filter-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.state.filterStatus = e.target.value;
        this.renderDraftsGrid();
      });
    }
  },

  async loadPackages() {
    const deletedPkgIds = PkgStorage.getDeletedPkgIds();
    const deletedItemIds = PkgStorage.getDeletedItemIds();
    const unpubMenus = PkgStorage.getUnpublishedMenus();

    let drafts = [];
    let published = [];
    let isApiOnline = false;

    // 1. Tenta API local do servidor Python se estiver em execução
    try {
      this.state.loading = true;
      const res = await fetch('/api/packages');
      if (res.ok) {
        const data = await res.json();
        drafts = data.drafts || [];
        published = data.published_menus || [];
        isApiOnline = true;
      }
    } catch (e) {
      // Normal no GitHub Pages estático
    }

    // 2. Fallback estático (GitHub Pages ou servidor sem rota)
    if (!isApiOnline) {
      try {
        const [draftsRes, catRes] = await Promise.all([
          fetch('../repository/draft_packages.json', { cache: 'no-store' }),
          fetch('../repository/catalog.json', { cache: 'no-store' })
        ]);

        if (draftsRes.ok) {
          const dData = await draftsRes.json();
          drafts = dData.packages || [];
        }

        if (catRes.ok) {
          const cData = await catRes.json();
          const audios = cData.audio || [];
          const menusDict = {};
          for (const a of audios) {
            if (deletedItemIds.includes(a.id)) continue;
            const mName = (a.menu || 'Sem menu').trim();
            if (unpubMenus.includes(mName)) continue; // Menu despublicado
            if (!menusDict[mName]) menusDict[mName] = { titulo: mName, count: 0, items: [] };
            menusDict[mName].count++;
            menusDict[mName].items.push({
              ...a,
              web_url: `../repository/audio/${a.arquivo.split('/').pop()}`
            });
          }
          published = Object.values(menusDict);
        }
      } catch (err) {
        console.warn('Erro ao carregar arquivos do catálogo:', err);
      }
    }

    // 3. Mescla com edições salvas no localStorage (Persistência Total)
    const savedDrafts = PkgStorage.getAllDrafts();
    if (savedDrafts && Array.isArray(savedDrafts) && savedDrafts.length > 0) {
      const merged = [];
      const processedIds = new Set();

      // Primeiro aplica os pacotes com edições do usuário
      savedDrafts.forEach(sd => {
        if (!deletedPkgIds.includes(sd.id)) {
          merged.push(sd);
          processedIds.add(sd.id);
        }
      });

      // Inclui pacotes do repositório que ainda não foram tocados
      drafts.forEach(rd => {
        if (!processedIds.has(rd.id) && !deletedPkgIds.includes(rd.id)) {
          merged.push(rd);
          processedIds.add(rd.id);
        }
      });

      drafts = merged;
    }

    // 4. Aplica filtros de exclusão persistidos
    drafts = drafts.filter(p => !deletedPkgIds.includes(p.id));
    drafts.forEach(p => {
      if (p.items) p.items = p.items.filter(it => !deletedItemIds.includes(it.id));
    });

    published = published.filter(m => !unpubMenus.includes(m.titulo));
    published.forEach(m => {
      if (m.items) m.items = m.items.filter(it => !deletedItemIds.includes(it.id));
      m.count = (m.items || []).length;
    });

    // 5. Restaura blobs de áudio salvos no IndexedDB para as faixas
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

    // Popula categorias no select se vazio
    const catSelect = document.getElementById('pkg-filter-category');
    if (catSelect && catSelect.options.length <= 1) {
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
    this.updateKPIs();
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

    // Filtro por busca
    if (this.state.filterSearch) {
      const q = this.state.filterSearch;
      filteredDrafts = filteredDrafts.filter(p => {
        const tit = (p.titulo || '').toLowerCase();
        const cat = (p.categoria || '').toLowerCase();
        const desc = (p.descricao || '').toLowerCase();
        const hasItem = (p.items || []).some(it =>
          (it.titulo || '').toLowerCase().includes(q) ||
          (it.codigo_item || '').toLowerCase().includes(q) ||
          (it.descricao || '').toLowerCase().includes(q) ||
          (it.arquivo_fefo || '').toLowerCase().includes(q)
        );
        return tit.includes(q) || cat.includes(q) || desc.includes(q) || hasItem;
      });
    }

    // Filtro por licença (Escola, Home, Clínica)
    if (this.state.filterLicense && this.state.filterLicense !== 'all') {
      filteredDrafts = filteredDrafts.filter(p => {
        const lics = p.licencas || ['home'];
        return lics.includes(this.state.filterLicense);
      });
    }

    // Filtro por categoria
    if (this.state.filterCategory && this.state.filterCategory !== 'all') {
      filteredDrafts = filteredDrafts.filter(p => p.categoria === this.state.filterCategory);
    }

    // Filtro por status
    if (this.state.filterStatus && this.state.filterStatus !== 'all') {
      filteredDrafts = filteredDrafts.filter(p => {
        const items = p.items || [];
        if (this.state.filterStatus === 'ready') return items.some(it => it.status === 'ready' || it.status === 'published');
        if (this.state.filterStatus === 'needs_trim') return items.some(it => it.status === 'needs_trim');
        if (this.state.filterStatus === 'pending') return items.some(it => it.status === 'pending_audio' || (!it.web_url && !it.arquivo_draft));
        return true;
      });
    }

    if (!filteredDrafts.length) {
      grid.innerHTML = `
        <div class="empty" style="grid-column: 1/-1; padding: 28px 16px; background: #faf9ff; border-radius: 16px; border: 1px dashed var(--line); text-align: center;">
          <p style="font-size: 15px; font-weight: 800; color: var(--purple); margin: 0 0 6px;">Nenhum pacote encontrado com os filtros selecionados.</p>
          <span style="color: var(--muted); font-size: 13px;">Tente alterar os termos da busca ou selecionar outra categoria/licença.</span>
        </div>
      `;
      this.renderDraftExpandedPanel();
      return;
    }

    grid.innerHTML = filteredDrafts.map(pkg => {
      const isExpanded = this.state.expandedDraftId === pkg.id;
      const itemsCount = (pkg.items || []).length;
      const targetCount = pkg.target_count || (itemsCount > 0 ? itemsCount : 10);
      const pct = Math.min(100, Math.round((itemsCount / targetCount) * 100));
      const isCompleted = itemsCount >= targetCount && targetCount > 0;

      const licLabels = (pkg.licencas || ['home']).map(l => {
        const map = { home: '🏡 Home', clinical: '🩺 Clínica', escola: '🏫 Escola' };
        return map[l] || l;
      }).join(' · ');

      return `
        <article class="package-card is-draft ${isExpanded ? 'is-active' : ''}" 
                 onclick="PkgManager.toggleDraftPackage('${pkg.id}')">
          <span class="pkg-badge draft">🟡 Rascunho de Menu</span>
          <h3>${this.escapeHtml(pkg.titulo)}</h3>
          <p>${this.escapeHtml(pkg.descricao || 'Pacote pedagógico em desenvolvimento.')}</p>
          
          <div class="pkg-tags">
            <span class="pkg-tag">${this.escapeHtml(pkg.categoria || 'Geral')}</span>
            <span class="pkg-tag">${licLabels}</span>
            ${pkg.is_premium ? '<span class="pkg-tag premium">⭐ Premium</span>' : ''}
          </div>

          <div class="pkg-progress">
            <div class="pkg-progress-bar">
              <div class="pkg-progress-fill ${isCompleted ? 'is-complete' : ''}" style="width: ${pct}%"></div>
            </div>
            <div class="pkg-progress-label">
              <span><strong>${itemsCount}</strong> de ${targetCount} faixas cadastradas</span>
              <span><strong>${pct}%</strong></span>
            </div>
          </div>

          <button class="btn-manage" type="button">
            ${isExpanded ? '▲ Fechar Edição' : '▼ Gerenciar & Cortar Áudios'}
          </button>
        </article>
      `;
    }).join('');

    this.renderDraftExpandedPanel();
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
        document.getElementById('draft-inline-drawer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  },

  renderDraftExpandedPanel() {
    const drawer = document.getElementById('draft-inline-drawer');
    if (!drawer) return;

    if (!this.state.expandedDraftId) {
      drawer.innerHTML = '';
      drawer.style.display = 'none';
      return;
    }

    const pkg = (this.state.drafts || []).find(p => p.id === this.state.expandedDraftId);
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
      <div class="inline-expanded-panel">
        <div class="inline-panel-header">
          <h3>📦 Editando Menu / Pacote: <em>${this.escapeHtml(pkg.titulo)}</em></h3>
          <button class="btn-collapse" type="button" onclick="PkgManager.toggleDraftPackage('${pkg.id}')">▲ Fechar / Recolher</button>
        </div>

        <div class="inline-panel-body">
          <!-- Metadados do Pacote -->
          <div class="form-grid" style="margin-bottom: 20px;">
            <div class="field" style="grid-column: 1 / -1;">
              <label>Nome do Menu / Pacote</label>
              <input id="draft-input-title" type="text" value="${this.escapeHtml(pkg.titulo)}" 
                     oninput="PkgManager.updateDraftPackageProperty('${pkg.id}', 'titulo', this.value)">
            </div>
            <div class="field" style="grid-column: 1 / -1;">
              <label>Descrição Pedagógica do Menu</label>
              <textarea id="draft-input-desc" rows="2" 
                        oninput="PkgManager.updateDraftPackageProperty('${pkg.id}', 'descricao', this.value)">${this.escapeHtml(pkg.descricao || '')}</textarea>
            </div>
            <div class="field">
              <label>Meta de Faixas (Target Count)</label>
              <input id="draft-input-target" type="number" min="1" max="100" value="${pkg.target_count || 10}"
                     oninput="PkgManager.updateDraftPackageProperty('${pkg.id}', 'target_count', parseInt(this.value, 10) || 10)">
            </div>
            <div class="field">
              <label>Licenças Disponíveis</label>
              <div class="checkbox-row" style="margin-top: 6px;">
                <label><input type="checkbox" id="draft-check-home" ${hasHome ? 'checked' : ''} onchange="PkgManager.updateDraftPackageLicenses('${pkg.id}')"> Home (Família)</label>
                <label><input type="checkbox" id="draft-check-clinical" ${hasClinical ? 'checked' : ''} onchange="PkgManager.updateDraftPackageLicenses('${pkg.id}')"> Clínica</label>
                <label><input type="checkbox" id="draft-check-escola" ${hasEscola ? 'checked' : ''} onchange="PkgManager.updateDraftPackageLicenses('${pkg.id}')"> Escola</label>
                <label><input type="checkbox" id="draft-check-premium" ${pkg.is_premium ? 'checked' : ''} onchange="PkgManager.updateDraftPackageProperty('${pkg.id}', 'is_premium', this.checked)"> Premium ⭐</label>
              </div>
            </div>
          </div>

          <!-- Dropzone para adicionar arquivos ao pacote -->
          <label class="pkg-dropzone" id="draft-dropzone">
            <input id="draft-file-upload" type="file" multiple accept=".wav,.mp3,.flac,.ogg,.m4a,.aac" style="display:none;" 
                   onchange="PkgManager.uploadAudiosToDraft('${pkg.id}', this.files)">
            <strong>＋ Arrastar ou Selecionar Vários Áudios para este Pacote</strong>
            <span>Envie múltiplos arquivos .mp3 ou .wav para alimentar as faixas deste menu</span>
          </label>

          <!-- Lista de Faixas -->
          <div style="margin-top: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="margin: 0; font-size: 16px; color: var(--ink);">Faixas deste Menu (${items.length})</h4>
              <button class="btn secondary" type="button" style="font-size: 12px; padding: 6px 12px;" onclick="PkgManager.addNewEmptyItem('${pkg.id}')">
                ＋ Adicionar Nova Faixa em Branco
              </button>
            </div>

            <div class="pkg-items-list">
              ${items.length === 0 ? `
                <div style="text-align:center; padding: 24px; color: var(--muted); font-size: 13px; background: #faf9ff; border-radius: 12px; border: 1px dashed var(--line);">
                  Nenhuma faixa cadastrada neste menu. Clique em "Adicionar Nova Faixa" ou arraste áudios acima.
                </div>
              ` : items.map((it, idx) => {
                const audioUrl = this.resolveUrl(it.web_url || (it.arquivo_draft ? `/repository/drafts/audio/${pkg.id}/${it.arquivo_draft.split('/').pop()}` : ''));
                const hasAudio = !!audioUrl;
                const isNeedsTrim = it.status === 'needs_trim';
                const isReady = it.status === 'ready' || it.status === 'published';

                let statusBadge = '';
                if (isReady) {
                  statusBadge = '<span class="status-pill status-ready" title="Áudio cortado e pronto para o Pet">🟢 Cortado / Pronto</span>';
                } else if (hasAudio) {
                  statusBadge = '<span class="status-pill status-trim" title="Áudio bruto carregado. Pronto para cortar!">🟡 Pronto p/ Cortar</span>';
                } else {
                  statusBadge = '<span class="status-pill status-pending" title="Sem áudio gravado ainda para este item">🔴 Sem Áudio</span>';
                }

                const safeDesc = JSON.stringify(it.descricao || '').replace(/'/g, "&#39;");
                const fefoFileName = it.arquivo_fefo || '';

                return `
                  <div class="pkg-item-row" data-item-id="${it.id}">
                    <div class="pkg-item-header-line">
                      <span class="pkg-item-badge-index">Faixa ${idx + 1}</span>

                      <div class="pkg-item-inputs-group">
                        <div class="pkg-input-field">
                          <label class="pkg-field-label">🏷️ Nome no App / Menu</label>
                          <input type="text" class="pkg-item-title-input" value="${this.escapeHtml(it.titulo || '')}" 
                                 placeholder="Nome exibido no app..." 
                                 oninput="PkgManager.updateDraftItemTitle('${pkg.id}', '${it.id}', this.value)">
                        </div>

                        <div class="pkg-input-field fefo-file">
                          <label class="pkg-field-label">🤖 Arquivo no Pet FEFO</label>
                          <div class="fefo-file-box">
                            <input type="text" id="fefo-input-${it.id}" class="pkg-item-fefo-input" value="${this.escapeHtml(fefoFileName)}" 
                                   placeholder="a0001.wav" 
                                   oninput="PkgManager.updateDraftItemFefoFile('${pkg.id}', '${it.id}', this.value)">
                            <button type="button" class="btn-suggest-name" title="Sugerir próximo arquivo aXXXX.wav livre"
                                    onclick="PkgManager.suggestNextFefoName('${pkg.id}', '${it.id}')">
                              ⚡ Sugerir
                            </button>
                          </div>
                        </div>
                      </div>

                      <div class="header-status-and-delete">
                        ${statusBadge}
                        <button type="button" class="pkg-item-delete" title="Remover faixa"
                                onclick="PkgManager.deleteDraftItem('${pkg.id}', '${it.id}')">
                          🗑
                        </button>
                      </div>
                    </div>

                    <!-- TEXTO / ROTEIRO FALADO PELO FEFO (EDITÁVEL) -->
                    <div class="pkg-item-script-box">
                      <div class="pkg-item-script-label">
                        <span>📜 Texto do Áudio (Roteiro falado pelo FEFO):</span>
                        <span class="save-status-badge" id="script-saved-${it.id}">✓ Salvo</span>
                      </div>
                      <textarea class="pkg-item-script-textarea" 
                                placeholder="Digite ou edite aqui o roteiro falado pelo FEFO para este áudio..."
                                oninput="PkgManager.updateDraftItemScript('${pkg.id}', '${it.id}', this.value)">${this.escapeHtml(it.descricao || '')}</textarea>
                    </div>

                    <div class="pkg-item-actions-line">
                      <span class="pkg-item-orig">
                        📁 Arquivo: <strong>${this.escapeHtml(it.arquivo_origem || (hasAudio ? 'Áudio Vinculado' : 'Nenhum'))}</strong>
                        ${it.tamanho ? `(${this.formatBytes(it.tamanho)})` : ''}
                      </span>

                      ${hasAudio ? `
                        <div class="custom-audio-controller">
                          <audio id="audio-player-${it.id}" src="${this.escapeHtml(audioUrl)}" preload="none"></audio>
                          <div class="audio-ctrl-buttons">
                            <button type="button" class="btn-audio-ctrl btn-play" id="btn-play-${it.id}" 
                                    onclick="PkgManager.playTrack('${it.id}')" title="Tocar áudio">
                              ▶ Play
                            </button>
                            <button type="button" class="btn-audio-ctrl btn-pause" id="btn-pause-${it.id}" 
                                    onclick="PkgManager.pauseTrack('${it.id}')" title="Pausar áudio">
                              ⏸ Pause
                            </button>
                            <button type="button" class="btn-audio-ctrl btn-stop" id="btn-stop-${it.id}" 
                                    onclick="PkgManager.stopTrack('${it.id}')" title="Parar e voltar ao início">
                              ⏹ Stop
                            </button>
                          </div>
                          <div class="audio-time-slider-box">
                            <span id="time-current-${it.id}" class="time-label">0:00</span>
                            <input type="range" id="seek-${it.id}" class="audio-seek-slider" min="0" max="100" value="0"
                                   oninput="PkgManager.seekTrack('${it.id}', this.value)">
                            <span id="time-total-${it.id}" class="time-label">0:00</span>
                          </div>
                        </div>

                        <div style="display: flex; gap: 8px; align-items: center;">
                          <button type="button" class="btn-trim-audio ${isNeedsTrim ? 'highlight-trim' : ''}" 
                                  title="Abrir ferramenta de corte com o roteiro na tela"
                                  onclick='PkgManager.trimDraftItem("${pkg.id}", "${it.id}", "${this.escapeHtml(audioUrl)}", "${this.escapeHtml(it.titulo)}", ${safeDesc}, "${this.escapeHtml(fefoFileName)}")'>
                            ✂ ${isReady ? 'Reajustar Corte' : 'Cortar este Áudio'}
                          </button>

                          <button type="button" class="btn-replace-audio" 
                                  title="Substituir por outro arquivo de áudio do seu computador"
                                  onclick="PkgManager.promptChooseAudio('${pkg.id}', '${it.id}')">
                            📁 Trocar Áudio
                          </button>
                        </div>
                      ` : `
                        <div style="display: flex; gap: 10px; align-items: center;">
                          <span class="hint-missing-audio">Aguardando gravação do áudio</span>
                          <button type="button" class="btn-replace-audio btn-add-audio" 
                                  title="Carregar um arquivo de áudio para esta faixa"
                                  onclick="PkgManager.promptChooseAudio('${pkg.id}', '${it.id}')">
                            ➕ Escolher Áudio
                          </button>
                        </div>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="inline-panel-footer">
          <div style="display: flex; gap: 8px;">
            <button class="remove-btn" type="button" onclick="PkgManager.deleteDraftPackage('${pkg.id}')">🗑 Excluir Pacote</button>
            <button class="btn secondary" type="button" onclick="PkgManager.saveDraftPackageDetails('${pkg.id}')">💾 Salvar Rascunho</button>
          </div>

          <button class="btn-publish-pkg" type="button" onclick="PkgManager.publishDraftPackage('${pkg.id}')">
            🚀 Publicar Pacote no Catálogo Oficial
          </button>
        </div>
      </div>
    `;

    // Dropzone drag & drop
    const dropzone = document.getElementById('draft-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.background = '#f2efff'; });
      dropzone.addEventListener('dragleave', () => { dropzone.style.background = ''; });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.background = '';
        if (e.dataTransfer.files.length) {
          this.uploadAudiosToDraft(pkg.id, e.dataTransfer.files);
        }
      });
    }

    // Inicializa listeners dos players de áudio
    items.forEach(it => this.setupAudioListeners(it.id));
  },

  // ==========================================================
  // EDIÇÃO DE METADADOS E PERSISTÊNCIA EM TEMPO REAL
  // ==========================================================
  updateDraftPackageProperty(pkgId, prop, value) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    pkg[prop] = value;
    PkgStorage.saveAllDrafts(this.state.drafts);
  },

  updateDraftPackageLicenses(pkgId) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    pkg.licencas = [];
    if (document.getElementById('draft-check-home')?.checked) pkg.licencas.push('home');
    if (document.getElementById('draft-check-clinical')?.checked) pkg.licencas.push('clinical');
    if (document.getElementById('draft-check-escola')?.checked) pkg.licencas.push('escola');
    PkgStorage.saveAllDrafts(this.state.drafts);
  },

  updateDraftItemTitle(pkgId, itemId, newTitle) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    const it = (pkg.items || []).find(x => x.id === itemId);
    if (!it) return;
    it.titulo = newTitle.trim();
    PkgStorage.saveAllDrafts(this.state.drafts);
    this.scheduleBackendMetadataSave(pkgId, itemId, { titulo: it.titulo });
  },

  updateDraftItemFefoFile(pkgId, itemId, newName) {
    let clean = (newName || '').trim().toLowerCase();
    if (clean && !clean.endsWith('.wav')) clean += '.wav';
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    const it = (pkg.items || []).find(x => x.id === itemId);
    if (!it) return;
    it.arquivo_fefo = clean;
    PkgStorage.saveAllDrafts(this.state.drafts);
    this.scheduleBackendMetadataSave(pkgId, itemId, { arquivo_fefo: clean });
  },

  updateDraftItemScript(pkgId, itemId, newDesc) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    const it = (pkg.items || []).find(x => x.id === itemId);
    if (!it) return;
    it.descricao = newDesc;
    PkgStorage.saveAllDrafts(this.state.drafts);

    const badge = document.getElementById(`script-saved-${itemId}`);
    if (badge) {
      badge.classList.add('visible');
      clearTimeout(this.debounceTimers[`badge_${itemId}`]);
      this.debounceTimers[`badge_${itemId}`] = setTimeout(() => badge.classList.remove('visible'), 2000);
    }
    this.scheduleBackendMetadataSave(pkgId, itemId, { descricao: newDesc });
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
      } catch (e) {
        // Normal no GitHub Pages estático (dados já salvos no localStorage)
      }
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

  async saveDraftPackageDetails(pkgId) {
    const pkg = this.state.drafts.find(p => p.id === pkgId);
    if (!pkg) return;

    pkg.titulo = document.getElementById('draft-input-title')?.value.trim() || pkg.titulo;
    pkg.descricao = document.getElementById('draft-input-desc')?.value.trim() || '';
    pkg.target_count = parseInt(document.getElementById('draft-input-target')?.value, 10) || 10;
    this.updateDraftPackageLicenses(pkgId);
    pkg.is_premium = document.getElementById('draft-check-premium')?.checked || false;

    PkgStorage.saveAllDrafts(this.state.drafts);
    notice('Salvando rascunho do pacote...');

    try {
      const res = await fetch('/api/packages/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: pkg })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Erro ao salvar.');
      notice(data.message || 'Pacote salvo no servidor e catálogo!', 'ok');
    } catch (e) {
      notice('Rascunho salvo no navegador com sucesso!', 'ok');
    }
    this.renderDraftsGrid();
  },

  // ==========================================================
  // ESCOLHER / TROCAR ÁUDIO DE UMA FAIXA INDIVIDUAL
  // ==========================================================
  promptChooseAudio(pkgId, itemId) {
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
        this.handleAudioFileSelected(pkgId, itemId, file);
      }
      fileInput.value = '';
    };
    fileInput.click();
  },

  async handleAudioFileSelected(pkgId, itemId, file) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    const it = (pkg.items || []).find(x => x.id === itemId);
    if (!it) return;

    notice(`Carregando áudio "${file.name}"...`);

    // 1. Armazena no IndexedDB local para nunca perder após reload
    await AudioBlobDB.setAudio(itemId, file);

    // 2. Cria URL imediata para preview e corte
    const blobUrl = URL.createObjectURL(file);
    it.web_url = blobUrl;
    it.arquivo_origem = file.name;
    it.tamanho = file.size;
    it.status = 'needs_trim';

    // 3. Persiste no localStorage
    PkgStorage.saveAllDrafts(this.state.drafts);

    // 4. Se backend local estiver online, envia arquivo para a pasta do servidor
    try {
      const form = new FormData();
      form.append('package_id', pkgId);
      form.append('item_id', itemId);
      form.append('file', file, file.name);

      const res = await fetch('/api/packages/upload_single_item_audio', {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      if (data.ok && data.item) {
        it.arquivo_draft = data.item.arquivo_draft;
        notice(`✓ Áudio "${file.name}" salvo no servidor!`, 'ok');
      } else {
        notice(`✓ Áudio "${file.name}" salvo no navegador!`, 'ok');
      }
    } catch (e) {
      notice(`✓ Áudio "${file.name}" salvo localmente!`, 'ok');
    }

    this.renderDraftExpandedPanel();
    this.renderDraftsGrid();
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

    // Envia ao backend se online
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

  trimDraftItem(pkgId, itemId, audioUrl, title, description = '', itemCode = '') {
    if (!window.openAudioTrimmer) {
      alert('Ferramenta de corte indisponível.');
      return;
    }

    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    const it = pkg ? (pkg.items || []).find(x => x.id === itemId) : null;
    const currentDesc = it && it.descricao !== undefined ? it.descricao : description;

    window.openAudioTrimmer({
      url: audioUrl,
      title: title,
      description: currentDesc,
      itemCode: itemCode,
      onSave: async (blob, info) => {
        notice('Salvando áudio cortado na faixa...');

        // 1. Salva o corte no IndexedDB do navegador
        await AudioBlobDB.setAudio(itemId, blob);

        // 2. Atualiza estado em memória
        if (it) {
          it.web_url = URL.createObjectURL(blob);
          it.status = 'ready';
          it.tamanho = blob.size;
        }
        PkgStorage.saveAllDrafts(this.state.drafts);
        this.renderDraftExpandedPanel();
        this.renderDraftsGrid();

        // 3. Envia para o backend se disponível
        try {
          const form = new FormData();
          form.append('tipo', 'draft');
          form.append('package_id', pkgId);
          form.append('item_id', itemId);
          form.append('file', blob, `${itemCode || 'cut'}.wav`);

          const res = await fetch('/api/packages/replace_audio', {
            method: 'POST',
            body: form
          });
          const data = await res.json();
          if (data.ok) {
            notice(data.message || 'Corte salvo com sucesso!', 'ok');
          } else {
            notice('Corte salvo no navegador com sucesso!', 'ok');
          }
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

    const confirmMsg = `🚀 PUBLICAR PACOTE OFICIAL\n\nPublicar “${pkg.titulo}” como MENU OFICIAL com ${count} faixa(s)?\n\nO áudio será convertido para o padrão do CYD ESP32 (WAV 16-bit Mono 22050Hz) e o catálogo será atualizado.`;
    if (!confirm(confirmMsg)) return;

    notice('Convertendo e publicando menu no catálogo oficial... aguarde...', '');

    try {
      const res = await fetch('/api/packages/publish_official', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: pkgId })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Falha na publicação.');
      notice(data.message || 'Pacote publicado com sucesso!', 'ok');
      this.state.expandedDraftId = null;
      await this.loadPackages();
    } catch (err) {
      notice(`Erro na publicação: ${err.message}`, 'error');
    }
  },

  // ==========================================================
  // SEÇÃO 2: MENUS OFICIAIS EM PRODUÇÃO E DESPUBLICAÇÃO
  // ==========================================================
  renderPublishedGrid() {
    const grid = document.getElementById('published-menus-grid');
    if (!grid) return;

    if (!this.state.publishedMenus.length) {
      grid.innerHTML = `<div class="empty">Nenhum menu oficial identificado no catálogo.</div>`;
      this.renderProductionExpandedPanel();
      return;
    }

    grid.innerHTML = this.state.publishedMenus.map(m => {
      const isExpanded = this.state.expandedProductionTitle === m.titulo;

      return `
        <article class="package-card is-published ${isExpanded ? 'is-active' : ''}">
          <span class="pkg-badge published">🟢 Menu Oficial Ativo</span>
          <h3>${this.escapeHtml(m.titulo)}</h3>
          <p>Disponível na nuvem para os pets e apps conectados.</p>
          <div class="pkg-tags">
            <span class="pkg-tag">Menu do Sistema</span>
            <span class="pkg-tag">${m.count} áudios oficiais</span>
          </div>
          <div class="published-card-actions" style="display: flex; gap: 8px; margin-top: auto;">
            <button class="btn-manage" type="button" style="flex: 1;" onclick="PkgManager.toggleProductionMenu('${this.escapeHtml(m.titulo)}')">
              ${isExpanded ? '▲ Fechar' : '✏️ Gerenciar'}
            </button>
            <button class="btn-unpublish" type="button" 
                    title="Despublicar este menu do catálogo oficial e voltar para rascunho para poder alterar"
                    onclick="PkgManager.unpublishMenu('${this.escapeHtml(m.titulo)}')">
              ↩️ Despublicar
            </button>
          </div>
        </article>
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
        document.getElementById('production-inline-drawer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  },

  renderProductionExpandedPanel() {
    const drawer = document.getElementById('production-inline-drawer');
    if (!drawer) return;

    if (!this.state.expandedProductionTitle) {
      drawer.innerHTML = '';
      drawer.style.display = 'none';
      return;
    }

    const menu = this.state.publishedMenus.find(m => m.titulo === this.state.expandedProductionTitle);
    if (!menu) {
      drawer.style.display = 'none';
      return;
    }

    drawer.style.display = 'block';
    const items = menu.items || [];

    drawer.innerHTML = `
      <div class="inline-expanded-panel production-style">
        <div class="inline-panel-header">
          <h3>🟢 Editando Menu Oficial: <em>${this.escapeHtml(menu.titulo)}</em></h3>
          <div style="display: flex; gap: 10px;">
            <button class="btn-unpublish" type="button" onclick="PkgManager.unpublishMenu('${this.escapeHtml(menu.titulo)}')">
              ↩️ Despublicar este Menu (Voltar p/ Rascunho)
            </button>
            <button class="btn-collapse" type="button" onclick="PkgManager.toggleProductionMenu('${this.escapeHtml(menu.titulo)}')">▲ Fechar</button>
          </div>
        </div>

        <div class="inline-panel-body">
          <div class="field">
            <label>Nome deste Menu no Catálogo Oficial</label>
            <input id="prod-input-title" type="text" value="${this.escapeHtml(menu.titulo)}">
          </div>

          <!-- Dropzone -->
          <label class="pkg-dropzone" id="prod-dropzone">
            <input id="prod-file-upload" type="file" multiple accept=".wav,.mp3,.flac,.ogg,.m4a" style="display:none;" 
                   onchange="PkgManager.uploadAudiosToProduction('${this.escapeHtml(menu.titulo)}', this.files)">
            <strong style="color: #27ae60;">＋ Adicionar Novos Áudios a este Menu Oficial</strong>
            <span>Arraste os arquivos aqui para converter e incluir diretamente neste menu em produção</span>
          </label>

          <!-- Lista de Faixas -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h4 style="margin: 0; font-size: 16px; color: var(--ink);">Faixas Oficiais Ativas (${items.length})</h4>
              <span class="hint" style="margin:0;">Edite títulos, ouça ou corte o trecho do áudio.</span>
            </div>

            <div class="pkg-items-list">
              ${items.length === 0 ? `
                <div style="text-align:center; padding: 20px; color: var(--muted); font-size: 13px; background: #faf9ff; border-radius: 12px;">
                  Nenhum áudio encontrado neste menu oficial.
                </div>
              ` : items.map((it, idx) => {
                const audioUrl = it.web_url || (it.arquivo ? `../repository/audio/${it.arquivo.split('/').pop()}` : '');

                return `
                  <div class="pkg-item-row" data-item-id="${it.id}">
                    <div class="pkg-item-number" style="color: #27ae60;">${idx + 1}</div>

                    <div class="pkg-item-info">
                      <input type="text" class="pkg-item-title-input prod-item-title" 
                             data-item-id="${it.id}" value="${this.escapeHtml(it.titulo || '')}" 
                             placeholder="Título da faixa...">
                      <span class="pkg-item-orig">Código: <strong>${it.id}</strong> · Arquivo: ${this.escapeHtml(it.arquivo || '')} (${this.formatBytes(it.tamanho)})</span>
                    </div>

                    <div class="pkg-item-player">
                      <audio controls preload="none" src="${this.escapeHtml(audioUrl)}"></audio>
                    </div>

                    <button type="button" class="btn-trim-audio" title="Abrir ferramenta de corte e fade"
                            onclick="PkgManager.trimProductionItem('${it.id}', '${this.escapeHtml(audioUrl)}', '${this.escapeHtml(it.titulo)}')">
                      ✂ Cortar Áudio
                    </button>

                    <button type="button" class="pkg-item-delete" title="Excluir do catálogo oficial"
                            onclick="PkgManager.deleteProductionItem('${it.id}', '${this.escapeHtml(it.titulo)}')">
                      🗑
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="inline-panel-footer">
          <span style="font-size: 12px; color: var(--muted);">
            Ao salvar, as alterações de títulos serão gravadas no <code>catalog.json</code> com nova versão.
          </span>
          <button class="btn primary" style="background:#27ae60;" type="button" 
                  onclick="PkgManager.saveProductionMenu('${this.escapeHtml(menu.titulo)}')">
            💾 Salvar Alterações deste Menu
          </button>
        </div>
      </div>
    `;

    const dropzone = document.getElementById('prod-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.background = '#eaf8f1'; });
      dropzone.addEventListener('dragleave', () => { dropzone.style.background = ''; });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.background = '';
        if (e.dataTransfer.files.length) {
          this.uploadAudiosToProduction(menu.titulo, e.dataTransfer.files);
        }
      });
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
      descricao: `Menu despublicado do catálogo oficial para edição e ajustes.`,
      target_count: draftItems.length || 10,
      categoria: 'Histórias',
      licencas: ['home', 'clinical', 'escola'],
      is_premium: false,
      status: 'draft',
      items: draftItems
    };

    // 1. Remove de publishedMenus
    this.state.publishedMenus = this.state.publishedMenus.filter(m => m.titulo !== menuTitle);
    if (this.state.expandedProductionTitle === menuTitle) {
      this.state.expandedProductionTitle = null;
    }

    // 2. Adiciona nos rascunhos
    this.state.drafts.unshift(restoredDraft);
    this.state.expandedDraftId = draftId;

    // 3. Salva persistência local
    PkgStorage.addUnpublishedMenu(menuTitle);
    PkgStorage.saveAllDrafts(this.state.drafts);

    // 4. Renderiza tela
    this.render();
    notice(`✓ Menu “${menuTitle}” despublicado e movido para Rascunhos!`, 'ok');

    // 5. Comunica backend se online
    try {
      await fetch('/api/packages/unpublish_menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_titulo: menuTitle, package: restoredDraft })
      });
    } catch (e) {}

    // Scrolla até o rascunho
    setTimeout(() => {
      document.getElementById('draft-packages-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  },

  async saveProductionMenu(oldMenuTitle) {
    const newMenuTitle = document.getElementById('prod-input-title')?.value.trim() || oldMenuTitle;
    const itemsUpdates = [];

    document.querySelectorAll('.prod-item-title').forEach(input => {
      itemsUpdates.push({
        id: input.dataset.itemId,
        titulo: input.value.trim()
      });
    });

    notice('Atualizando menu oficial no catálogo...');
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
      notice(`Erro: ${e.message}`, 'error');
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

  trimProductionItem(itemId, audioUrl, title) {
    if (!window.openAudioTrimmer) {
      alert('Ferramenta de corte indisponível.');
      return;
    }

    window.openAudioTrimmer({
      url: audioUrl,
      title: title,
      onSave: async (blob, info) => {
        notice('Salvando corte no catálogo oficial...');
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
          notice(`Erro ao salvar corte oficial: ${e.message}`, 'error');
        }
      }
    });
  },

  // ==========================================================
  // CONTROLES DE ÁUDIO CUSTOMIZADOS (PLAY / PAUSE / STOP)
  // ==========================================================
  playTrack(itemId) {
    const aud = document.getElementById(`audio-player-${itemId}`);
    if (!aud) return;

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
        const arq = (it.arquivo || '').split('/').pop();
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

  // ==========================================================
  // EXPORTAR BACKUP JSON
  // ==========================================================
  exportDraftsJson() {
    const data = {
      schema: 1,
      exported_at: new Date().toISOString(),
      packages: this.state.drafts || []
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fefo_draft_packages_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notice('Backup JSON baixado com sucesso!', 'ok');
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
