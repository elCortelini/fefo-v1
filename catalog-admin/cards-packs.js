/**
 * cards-packs.js - Gerenciador Unificado de Pacotes de Cards do FEFO Pet
 * 
 * Mesma aparência, mesmas funções e mesmo comportamento dos Pacotes de Áudios:
 * - Barras recolhidas em degradê âmbar (Rascunhos) e verde (Publicados)
 * - Título com alteração em tempo real e 3 botões de ação: [ Publicar ] [ Excluir ] [ Salvar ]
 * - Caixa de Licenças lilás/azul pastel (#bfd0fe) com ícones 🏠 e checkboxes circulares brancos
 * - Cards em estilo sanfona com linha divisória e seta central (CARD 01 - Nome)
 * - Tag vertical lateral esquerda "CARD 01"
 * - ESPAÇO DEDICADO PARA UPLOAD DA IMAGEM DO CARD (drag & drop, preview instantâneo e persistência)
 * - Cortador de áudio integrado (Waveform inline montado via mountAudioTrimmer)
 * - Gerador de fala por IA integrado (com roteiro e sintetizador da voz do FEFO)
 * - Seta central de recolhimento no rodapé de cada pacote
 * - Sincronização direta com GitHub via REST API
 */

// ==========================================================
// 1. BANCO DE IMAGENS DOS CARDS (INDEXEDDB)
// ==========================================================
const CardImageDB = {
  dbName: 'fefo_card_images_db',
  storeName: 'card_images',

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

  async setImage(cardId, blob) {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).put(blob, cardId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('Erro ao salvar imagem do card no IndexedDB:', e);
      return false;
    }
  },

  async getImage(cardId) {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const req = tx.objectStore(this.storeName).get(cardId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  },

  async deleteImage(cardId) {
    try {
      const db = await this.getDB();
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(cardId);
    } catch (e) {}
  }
};
window.CardImageDB = CardImageDB;

// ==========================================================
// 2. PERSISTÊNCIA LOCAL (LOCALSTORAGE)
// ==========================================================
const CardPackStorage = {
  getDeletedPackIds() {
    try { return JSON.parse(localStorage.getItem('fefo_deleted_card_pack_ids') || '[]'); } catch (e) { return []; }
  },
  addDeletedPackId(id) {
    const list = this.getDeletedPackIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem('fefo_deleted_card_pack_ids', JSON.stringify(list));
    }
  },
  getDeletedCardIds() {
    try { return JSON.parse(localStorage.getItem('fefo_deleted_card_ids') || '[]'); } catch (e) { return []; }
  },
  addDeletedCardId(id) {
    const list = this.getDeletedCardIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem('fefo_deleted_card_ids', JSON.stringify(list));
    }
  },
  getCustomCardPacks() {
    try { return JSON.parse(localStorage.getItem('fefo_custom_card_packs') || '[]'); } catch (e) { return []; }
  },
  saveCustomCardPacks(packs) {
    try { localStorage.setItem('fefo_custom_card_packs', JSON.stringify(packs)); } catch (e) {}
  },
  getPublishedCardPacks() {
    try { return JSON.parse(localStorage.getItem('fefo_published_card_packs') || '[]'); } catch (e) { return []; }
  },
  savePublishedCardPacks(packs) {
    try { localStorage.setItem('fefo_published_card_packs', JSON.stringify(packs)); } catch (e) {}
  }
};
window.CardPackStorage = CardPackStorage;

// ==========================================================
// 3. GERENCIADOR DE PACOTES DE CARDS
// ==========================================================
const CardPackManager = {
  state: {
    drafts: [],
    published: [],
    expandedDraftId: null,
    expandedProductionId: null,
    expandedCardIds: new Set(),
    debounceTimers: {},
    loading: false
  },

  async init() {
    this.bindEvents();
    await this.loadCardPacks();
  },

  bindEvents() {
    // Alternância global das abas
    document.querySelectorAll('.main-top-tabs .main-tab-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = btn.dataset.tab;
        if (typeof window.switchMainTab === 'function') {
          window.switchMainTab(tabId);
        }
      });
    });

    document.getElementById('btn-new-card-pack')?.addEventListener('click', () => this.createNewCardPack());
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  resolveUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
    if (url.startsWith('/')) return `..${url}`;
    return url;
  },

  async loadCardPacks() {
    let drafts = [];
    let published = [];
    let isApiOnline = false;
    let loadedFromRemote = false;

    // 1. Tenta API do servidor local
    try {
      this.state.loading = true;
      const res = await fetch('/api/card_packs');
      if (res.ok) {
        const data = await res.json();
        drafts = data.drafts || [];
        published = data.published || [];
        isApiOnline = true;
        loadedFromRemote = true;
      }
    } catch (e) {}

    // 2. Se GitHubSync estiver configurado (Modo Nuvem Universal): busca direto da API do GitHub
    if (!isApiOnline && window.GitHubSync && window.GitHubSync.isConfigured()) {
      try {
        const [ghDrafts, ghCat] = await Promise.all([
          window.GitHubSync.getFile('repository/draft_card_packs.json'),
          window.GitHubSync.getFile('repository/catalog.json')
        ]);
        if (ghDrafts && ghDrafts.exists && ghDrafts.content) {
          const dData = JSON.parse(ghDrafts.content);
          if (dData && dData.card_packs) {
            drafts = dData.card_packs;
            loadedFromRemote = true;
          }
        }
        if (ghCat && ghCat.exists && ghCat.content) {
          const cData = JSON.parse(ghCat.content);
          if (cData && cData.card_packs) {
            published = cData.card_packs;
            loadedFromRemote = true;
          }
        }
      } catch (ghErr) {
        console.warn('[loadCardPacks] Falha ao carregar do GitHub REST API:', ghErr);
      }
    }

    // 3. Fallback estático com cache-buster de timestamp
    if (!loadedFromRemote) {
      try {
        const ts = Date.now();
        const [draftsRes, catRes] = await Promise.all([
          fetch(`../repository/draft_card_packs.json?_t=${ts}`, { cache: 'no-store' }),
          fetch(`../repository/catalog.json?_t=${ts}`, { cache: 'no-store' })
        ]);
        if (draftsRes && draftsRes.ok) {
          const dData = await draftsRes.json();
          if (dData && dData.card_packs) {
            drafts = dData.card_packs;
            loadedFromRemote = true;
          }
        }
        if (catRes && catRes.ok) {
          const cData = await catRes.json();
          if (cData && cData.card_packs) {
            published = cData.card_packs;
            loadedFromRemote = true;
          }
        }
      } catch (err) {}
    }

    // 4. Mescla inteligente com localStorage: preserva pacotes e edições locais mais recentes
    const savedDrafts = CardPackStorage.getCustomCardPacks();
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
    CardPackStorage.saveCustomCardPacks(drafts);

    const savedProd = CardPackStorage.getPublishedCardPacks();
    if (savedProd && Array.isArray(savedProd) && savedProd.length > 0) {
      if (!loadedFromRemote || published.length === 0) {
        published = savedProd;
      }
    }
    CardPackStorage.savePublishedCardPacks(published);

    this.state.drafts = drafts;
    this.state.published = published;
    this.state.loading = false;

    this.render();
  },

  render() {
    this.renderDraftsGrid();
    this.renderPublishedGrid();
  },

  // ==========================================================
  // SEÇÃO 1: PACOTES DE CARDS EM RASCUNHO (DRAFTS)
  // ==========================================================
  renderDraftsGrid() {
    const grid = document.getElementById('draft-card-packs-grid');
    if (!grid) return;

    if (!this.state.drafts.length) {
      grid.innerHTML = `
        <div class="empty">
          <p>Nenhum rascunho de pacote de cards encontrado.</p>
          <button class="btn primary" onclick="CardPackManager.createNewCardPack()">＋ Criar Novo Pacote de Cards</button>
        </div>
      `;
      this.renderDraftExpandedPanel();
      return;
    }

    grid.innerHTML = this.state.drafts.map((pkg, idx) => {
      const isExpanded = this.state.expandedDraftId === pkg.id;
      const numLabel = `PACOTE DE CARDS ${idx + 1}${pkg.titulo ? ` - ${this.escapeHtml(pkg.titulo)}` : ''}`;

      return `
        <div class="pkg-accordion-wrapper" id="pkg-acc-draft-${pkg.id}">
          ${!isExpanded ? `
            <div class="pkg-collapsed-bar draft-bar" onclick="CardPackManager.toggleDraftPackage('${pkg.id}')">
              <span>${numLabel}</span>
            </div>
          ` : ''}
          <div class="package-drawer-wrapper" id="drawer-wrap-draft-${pkg.id}" style="${isExpanded ? 'display:block;' : 'display:none;'}"></div>
        </div>
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
        document.getElementById(`pkg-acc-draft-${pkgId}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  },

  renderDraftExpandedPanel() {
    const globalDrawer = document.getElementById('card-pack-inline-drawer');
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
    const cards = pkg.cards || [];
    const hasHome = (pkg.licencas || []).includes('home');
    const hasClinical = (pkg.licencas || []).includes('clinical');
    const hasEscola = (pkg.licencas || []).includes('escola');

    drawer.innerHTML = `
      <div class="pkg-expanded-card draft-card" id="pkg-card-${pkg.id}">
        <!-- Linha Superior: Nome e Botões à esquerda e Licenças à direita -->
        <div class="pkg-expanded-top">
          <div class="pkg-expanded-left">
            <div class="pkg-expanded-num" id="cardpack-expanded-title-${pkg.id}">
              ${this.escapeHtml(pkg.titulo || `PACOTE DE CARDS ${pkgIdx + 1}`)}
            </div>
            <label class="pkg-expanded-label">Alterar nome do Pacote de Cards</label>
            <input type="text" class="pkg-input-pill" id="draft-title-input-${pkg.id}" 
                   value="${this.escapeHtml(pkg.titulo)}" 
                   placeholder="Nome do pacote de cards..."
                   oninput="CardPackManager.updateDraftPackageProperty('${pkg.id}', 'titulo', this.value)">

            <!-- 3 Botões de Ação diretamente abaixo do input -->
            <div class="pkg-action-pills-row">
              <button type="button" class="btn-pkg-action blue" onclick="CardPackManager.publishCardPackOfficial('${pkg.id}')">
                Publicar
              </button>
              <button type="button" class="btn-pkg-action red" onclick="CardPackManager.deleteCardPack('${pkg.id}')">
                Excluir
              </button>
              <button type="button" class="btn-pkg-action green" onclick="CardPackManager.saveCardPackDetails('${pkg.id}')">
                Salvar
              </button>
            </div>
          </div>

          <div class="pkg-lic-section">
            <div class="pkg-lic-title">Licenças</div>
            <div class="pkg-lic-box">
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasHome ? 'checked' : ''} onchange="CardPackManager.toggleDraftLicense('${pkg.id}', 'home')">
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Home</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasClinical ? 'checked' : ''} onchange="CardPackManager.toggleDraftLicense('${pkg.id}', 'clinical')">
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Clinica</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasEscola ? 'checked' : ''} onchange="CardPackManager.toggleDraftLicense('${pkg.id}', 'escola')">
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Escola</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${pkg.is_premium ? 'checked' : ''} onchange="CardPackManager.toggleDraftPremium('${pkg.id}')">
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Premium</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Lista de Cards do Pacote -->
        <div class="pkg-tracks-section">
          ${cards.length === 0 ? `
            <div style="text-align:center; padding: 18px; color: #166534; font-size: 13px; font-weight: 700;">
              Nenhum card cadastrado ainda. Clique no botão abaixo para adicionar.
            </div>
          ` : cards.map((c, cIdx) => this.renderCardItem(pkg.id, c, cIdx, false)).join('')}
        </div>

        <div style="display: flex; justify-content: flex-start; margin: 6px 0;">
          <button type="button" class="btn-add-track-pill" onclick="CardPackManager.addNewEmptyCardItem('${pkg.id}')">
            ＋ Adicionar Novo Card
          </button>
        </div>

        <!-- Seta central de recolhimento no fundo do card -->
        <div class="pkg-collapse-arrow-btn gold" title="Recolher pacote" onclick="CardPackManager.toggleDraftPackage('${pkg.id}')">
          ▲
        </div>
      </div>
    `;

    // Hidrata imagens salvas no IndexedDB
    cards.forEach(async (c) => {
      if (window.CardImageDB) {
        const imgBlob = await window.CardImageDB.getImage(c.id);
        if (imgBlob) {
          const imgEl = document.getElementById(`card-img-preview-${c.id}`);
          if (imgEl) imgEl.src = URL.createObjectURL(imgBlob);
        }
      }
    });
  },

  // ==========================================================
  // RENDERIZAÇÃO DO ITEM DE CARD (SANFONA + UPLOAD DA IMAGEM)
  // ==========================================================
  renderCardItem(packId, c, cIdx, isProduction = false) {
    const isCardOpen = this.state.expandedCardIds && this.state.expandedCardIds.has(c.id);
    const audioUrl = this.resolveUrl(c.audio_url || '');
    const cCode = c.codigo_acao || c.id || `c${String(cIdx + 1).padStart(4, '0')}`;
    const cardTitle = c.titulo || '';
    const hasImage = Boolean(c.mini_card_img);

    return `
      <div class="pkg-track-collapsible-item" id="card-item-wrap-${c.id}">
        <!-- Linha da Barra de Alternância do Card -->
        <div class="pkg-track-toggle-row" onclick="CardPackManager.toggleCardItemOpen('${c.id}')">
          <div class="pkg-track-name" id="card-header-title-${c.id}">
            CARD ${String(cIdx + 1).padStart(2, '0')}${cardTitle ? ' - ' + this.escapeHtml(cardTitle) : ''}
          </div>
          <div class="track-line-toggle ${isProduction ? 'green' : 'gold'}">
            <hr />
            <span class="track-arrow" id="card-arrow-${c.id}">${isCardOpen ? '▲' : '▼'}</span>
          </div>
        </div>

        <!-- Conteúdo Interno Expandido do Card -->
        <div class="track-mount-container" id="card-mount-${c.id}" style="${isCardOpen ? 'display:block;' : 'display:none;'}">
          <div class="pkg-item-row track-card-box" data-item-id="${c.id}">
            
            <!-- LADO ESQUERDO: TAG VERTICAL CARD 01 -->
            <div class="track-vertical-badge">
              <span>CARD ${String(cIdx + 1).padStart(2, '0')}</span>
            </div>

            <!-- CONTEÚDO PRINCIPAL -->
            <div class="track-card-body">
              
              <!-- LINHA SUPERIOR: Nome no APP + Selecionar Áudio -->
              <div class="track-row-top">
                <div class="track-field-group">
                  <label class="track-label">Nome do Card no APP</label>
                  <input type="text" class="track-input-clean pkg-item-title-input" 
                         value="${this.escapeHtml(cardTitle)}" 
                         placeholder="Ex: Alegria & Sorriso" 
                         oninput="CardPackManager.updateCardItemTitle('${packId}', '${c.id}', this.value, ${isProduction})">
                </div>
                <button type="button" class="btn-track-action"
                        title="Carregar ou substituir áudio do seu computador"
                        onclick="CardPackManager.promptChooseAudio('${packId}', '${c.id}', ${isProduction})">
                  Selecionar Audio
                </button>
              </div>

              <!-- ESPAÇO DEDICADO PARA UPLOAD DA IMAGEM DO CARD (SOLICITADO) -->
              <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 14px; padding: 14px; margin: 6px 0 10px; display: flex; align-items: center; gap: 18px; flex-wrap: wrap;">
                
                <!-- Moldura da Imagem (Proporção 3:4) -->
                <div class="card-upload-area ${hasImage ? 'has-image' : ''}" 
                     id="card-upload-area-${c.id}"
                     style="width: 110px; height: 145px; border-radius: 12px; cursor: pointer; flex-shrink: 0;"
                     onclick="document.getElementById('card-file-input-${c.id}').click()"
                     ondragover="event.preventDefault(); this.classList.add('drag-over');"
                     ondragleave="this.classList.remove('drag-over');"
                     ondrop="CardPackManager.handleCardImageDrop(event, '${packId}', '${c.id}', ${isProduction})">
                  
                  <img id="card-img-preview-${c.id}" src="${this.escapeHtml(c.mini_card_img || '')}" style="display: ${hasImage ? 'block' : 'none'}; width: 100%; height: 100%; object-fit: cover; border-radius: 10px;" alt="Card">
                  
                  <div class="card-upload-placeholder" id="card-placeholder-${c.id}" style="display: ${hasImage ? 'none' : 'flex'};">
                    <span class="icon" style="font-size: 28px;">🃏</span>
                    <span class="text-main" style="font-size: 10.5px;">Arraste ou clique</span>
                    <span class="text-sub" style="font-size: 9.5px;">(JPG / PNG)</span>
                  </div>

                  <div class="card-upload-overlay">
                    <button type="button" class="btn-card-img-action change" onclick="event.stopPropagation(); document.getElementById('card-file-input-${c.id}').click()">
                      📷 Trocar
                    </button>
                    <button type="button" class="btn-card-img-action remove" onclick="event.stopPropagation(); CardPackManager.removeCardImage('${packId}', '${c.id}', ${isProduction})">
                      ✕ Remover
                    </button>
                  </div>

                  <input type="file" id="card-file-input-${c.id}" accept="image/jpeg,image/png,image/webp,image/*" style="display:none;" 
                         onchange="CardPackManager.handleCardImageSelected('${packId}', '${c.id}', this.files[0], ${isProduction})">
                </div>

                <!-- Instruções e Botão de Envio de Imagem -->
                <div style="flex: 1; min-width: 200px;">
                  <div style="font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 2px;">
                    📷 Imagem do Card Interativo (App FEFO)
                  </div>
                  <div style="font-size: 11.5px; color: #64748b; line-height: 1.4; margin-bottom: 8px;">
                    Esta é a miniatura ilustrada que as crianças e terapeutas veem na tela do celular ao selecionar este card.
                  </div>
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <button type="button" class="btn-track-action" onclick="document.getElementById('card-file-input-${c.id}').click()">
                      ${hasImage ? '📷 Substituir Imagem' : '📷 Enviar Imagem do Card'}
                    </button>
                    ${hasImage ? `
                      <span class="pill green" style="font-size: 11px;">✓ Imagem Carregada</span>
                    ` : `
                      <span class="pill" style="font-size: 11px; background: #fffbeb; color: #92400e;">Aguardando Imagem</span>
                    `}
                  </div>
                </div>

              </div>

              <!-- LINHA DO PLAYER DE ÁUDIO -->
              <div class="track-row-player">
                <audio id="audio-player-${c.id}" src="${this.escapeHtml(audioUrl)}" controls preload="metadata"></audio>
              </div>

              <!-- DIVISÓRIA ACORDEON 1: Gerar Audio com IA -->
              <div class="track-accordion-toggle green" onclick="CardPackManager.toggleCardAccordion('${c.id}', 'ai')">
                <span class="acc-text">Gerar Audio com IA <span class="acc-arrow" id="arrow-ai-${c.id}">▼</span></span>
              </div>
              <div class="track-accordion-panel" id="panel-ai-${c.id}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 11.5px; font-weight: 800; color: #1b4332;">📜 Texto do Áudio (Roteiro falado pelo FEFO):</span>
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <button type="button" class="btn-generate-ai-voice" id="btn-ai-${c.id}"
                            title="Gerar áudio com a voz do FEFO a partir deste texto"
                            onclick="CardPackManager.generateCardAiSpeech('${packId}', '${c.id}', ${isProduction})">
                      🎙️ Gerar Voz do FEFO (IA)
                    </button>
                    <span class="save-status-badge" id="script-saved-${c.id}">✓ Salvo</span>
                  </div>
                </div>
                <textarea class="pkg-item-script-textarea" 
                          placeholder="Digite ou edite aqui o roteiro falado pelo FEFO ao acionar este card..."
                          oninput="CardPackManager.updateCardScript('${packId}', '${c.id}', this.value, ${isProduction})">${this.escapeHtml(c.descricao || '')}</textarea>
              </div>

              <!-- DIVISÓRIA ACORDEON 2: Ajustar / Cortar -->
              <div class="track-accordion-toggle purple" onclick="CardPackManager.toggleCardAccordion('${c.id}', 'trim', ${isProduction})">
                <span class="acc-text">Ajustar / Cortar <span class="acc-arrow" id="arrow-trim-${c.id}">▼</span></span>
              </div>
              <div class="track-accordion-panel" id="panel-trim-${c.id}">
                <div id="trimmer-mount-${c.id}" class="inline-trimmer-mount"></div>
              </div>

              <!-- LINHA INFERIOR: Código no APP + Salvar + Excluir -->
              <div class="track-row-bottom">
                <div class="track-field-group">
                  <label class="track-label">Código no APP (Trigger)</label>
                  <div style="display: flex; gap: 6px; align-items: center;">
                    <input type="text" class="track-input-clean pkg-item-fefo-input" 
                           value="${this.escapeHtml(cCode)}" 
                           placeholder="c0001" 
                           oninput="CardPackManager.updateCardAction('${packId}', '${c.id}', this.value, ${isProduction})">
                  </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <button type="button" class="btn-track-action btn-track-save"
                          title="Salvar alterações deste card"
                          onclick="CardPackManager.saveSingleCardItem('${packId}', '${c.id}', ${isProduction})">
                    Salvar
                  </button>
                  ${!isProduction ? `
                    <button type="button" class="pkg-item-delete" title="Remover card"
                            onclick="CardPackManager.deleteCardItem('${packId}', '${c.id}')">
                      🗑
                    </button>
                  ` : ''}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ==========================================================
  // CONTROLE DE ABERTURA E FECHAMENTO DO CARD
  // ==========================================================
  toggleCardItemOpen(cardId) {
    if (!this.state.expandedCardIds) this.state.expandedCardIds = new Set();
    const mount = document.getElementById(`card-mount-${cardId}`);
    const arrow = document.getElementById(`card-arrow-${cardId}`);
    if (!mount) return;

    const isOpen = mount.style.display !== 'none';
    if (isOpen) {
      mount.style.display = 'none';
      this.state.expandedCardIds.delete(cardId);
      if (arrow) arrow.textContent = '▼';
    } else {
      mount.style.display = 'block';
      this.state.expandedCardIds.add(cardId);
      if (arrow) arrow.textContent = '▲';
    }
  },

  // ==========================================================
  // ACORDEÕES INTERNOS: IA E FERRAMENTA DE CORTE (WAVEFORM)
  // ==========================================================
  async toggleCardAccordion(cardId, type, isProduction = false) {
    const panel = document.getElementById(`panel-${type}-${cardId}`);
    const arrow = document.getElementById(`arrow-${type}-${cardId}`);
    if (!panel) return;

    const isOpen = panel.classList.contains('is-open');

    if (isOpen) {
      panel.classList.remove('is-open');
      if (arrow) arrow.textContent = '▼';
    } else {
      panel.classList.add('is-open');
      if (arrow) arrow.textContent = '▲';

      if (type === 'trim') {
        const mount = document.getElementById(`trimmer-mount-${cardId}`);
        if (mount && !mount.dataset.mounted) {
          mount.dataset.mounted = 'true';
          mount.innerHTML = '<div style="padding:14px; text-align:center; color:#856404; font-size:12.5px; font-weight:700;">Carregando ferramenta de corte...</div>';

          let card = null;
          const list = isProduction ? this.state.published : this.state.drafts;
          list.some(p => {
            const found = (p.cards || []).find(x => x.id === cardId);
            if (found) { card = found; return true; }
          });

          let effectiveUrl = card ? this.resolveUrl(card.audio_url || '') : '';
          if (!effectiveUrl && window.AudioBlobDB) {
            const blob = await window.AudioBlobDB.getAudio(cardId);
            if (blob) effectiveUrl = URL.createObjectURL(blob);
          }

          if (!effectiveUrl) {
            mount.innerHTML = `
              <div style="padding:14px; text-align:center; color:#c0392b; font-size:12.5px; font-weight:700;">
                ⚠️ Nenhum áudio carregado neste card para cortar. Selecione um arquivo primeiro em “Selecionar Audio”.
              </div>
            `;
            mount.dataset.mounted = '';
            return;
          }

          if (window.mountAudioTrimmer) {
            mount.innerHTML = '';
            window.mountAudioTrimmer(mount, {
              url: effectiveUrl,
              title: card ? (card.titulo || '') : '',
              description: card ? (card.descricao || '') : '',
              showClose: false,
              onSave: async (blob, info) => {
                notice('Salvando corte do áudio do card...', 'ok');
                if (window.AudioBlobDB) await window.AudioBlobDB.setAudio(cardId, blob);
                if (card) {
                  card.audio_url = URL.createObjectURL(blob);
                  card.tamanho_audio = blob.size;
                }
                const player = document.getElementById(`audio-player-${cardId}`);
                if (player) {
                  player.src = card.audio_url;
                  player.load();
                }
                if (isProduction) CardPackStorage.savePublishedCardPacks(this.state.published);
                else CardPackStorage.saveCustomCardPacks(this.state.drafts);
                notice('Áudio do card cortado com sucesso!', 'ok');
              }
            });
          } else {
            mount.innerHTML = '<div style="color:red; padding:10px;">Módulo de corte indisponível.</div>';
          }
        }
      }
    }
  },

  // ==========================================================
  // MANIPULAÇÃO DA IMAGEM DO CARD (DRAG & DROP / UPLOAD / REMOÇÃO)
  // ==========================================================
  handleCardImageDrop(event, packId, cardId, isProduction = false) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.handleCardImageSelected(packId, cardId, file, isProduction);
    }
  },

  async handleCardImageSelected(packId, cardId, file, isProduction = false) {
    if (!file) return;
    notice(`Carregando imagem "${file.name}"...`);

    // 1. Armazena no IndexedDB local
    await CardImageDB.setImage(cardId, file);

    const blobUrl = URL.createObjectURL(file);

    // 2. Atualiza estado
    const packsList = isProduction ? this.state.published : this.state.drafts;
    const pack = packsList.find(p => p.id === packId);
    const card = pack?.cards?.find(c => c.id === cardId);
    if (card) {
      card.mini_card_img = blobUrl;
    }

    if (isProduction) {
      CardPackStorage.savePublishedCardPacks(this.state.published);
    } else {
      CardPackStorage.saveCustomCardPacks(this.state.drafts);
    }

    // 3. Atualiza UI imediatamente
    const previewEl = document.getElementById(`card-img-preview-${cardId}`);
    const placeholderEl = document.getElementById(`card-placeholder-${cardId}`);
    const uploadArea = document.getElementById(`card-upload-area-${cardId}`);

    if (previewEl) {
      previewEl.src = blobUrl;
      previewEl.style.display = 'block';
    }
    if (placeholderEl) placeholderEl.style.display = 'none';
    if (uploadArea) uploadArea.classList.add('has-image');

    notice(`✓ Imagem do card carregada com sucesso!`, 'ok');
  },

  async removeCardImage(packId, cardId, isProduction = false) {
    if (!confirm('Remover a imagem deste card?')) return;

    await CardImageDB.deleteImage(cardId);

    const packsList = isProduction ? this.state.published : this.state.drafts;
    const pack = packsList.find(p => p.id === packId);
    const card = pack?.cards?.find(c => c.id === cardId);
    if (card) {
      card.mini_card_img = '';
    }

    if (isProduction) {
      CardPackStorage.savePublishedCardPacks(this.state.published);
    } else {
      CardPackStorage.saveCustomCardPacks(this.state.drafts);
    }

    const previewEl = document.getElementById(`card-img-preview-${cardId}`);
    const placeholderEl = document.getElementById(`card-placeholder-${cardId}`);
    const uploadArea = document.getElementById(`card-upload-area-${cardId}`);

    if (previewEl) {
      previewEl.src = '';
      previewEl.style.display = 'none';
    }
    if (placeholderEl) placeholderEl.style.display = 'flex';
    if (uploadArea) uploadArea.classList.remove('has-image');

    notice('Imagem do card removida.');
  },

  // ==========================================================
  // SELEÇÃO E GERENCIAMENTO DE ÁUDIO DO CARD
  // ==========================================================
  promptChooseAudio(packId, cardId, isProduction = false) {
    let inp = document.getElementById('global-card-audio-input');
    if (!inp) {
      inp = document.createElement('input');
      inp.id = 'global-card-audio-input';
      inp.type = 'file';
      inp.accept = '.wav,.mp3,.ogg,.m4a,.flac,audio/*';
      inp.style.display = 'none';
      document.body.appendChild(inp);
    }

    inp.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        this.handleAudioFileSelected(packId, cardId, file, isProduction);
      }
      inp.value = '';
    };
    inp.click();
  },

  async handleAudioFileSelected(packId, cardId, file, isProduction = false) {
    notice(`Carregando áudio "${file.name}"...`);

    if (window.AudioBlobDB) {
      await window.AudioBlobDB.setAudio(cardId, file);
    }

    const blobUrl = URL.createObjectURL(file);
    const packsList = isProduction ? this.state.published : this.state.drafts;
    const pack = packsList.find(p => p.id === packId);
    const card = pack?.cards?.find(c => c.id === cardId);
    if (card) {
      card.audio_url = blobUrl;
      card.arquivo_audio = file.name;
      card.tamanho_audio = file.size;
    }

    if (isProduction) {
      CardPackStorage.savePublishedCardPacks(this.state.published);
    } else {
      CardPackStorage.saveCustomCardPacks(this.state.drafts);
    }

    const player = document.getElementById(`audio-player-${cardId}`);
    if (player) {
      player.src = blobUrl;
      player.load();
    }

    // Se a ferramenta de corte estiver aberta, reseta para recarregar
    const mount = document.getElementById(`trimmer-mount-${cardId}`);
    if (mount) mount.dataset.mounted = '';

    notice(`✓ Áudio "${file.name}" vinculado ao card!`, 'ok');
  },

  async generateCardAiSpeech(packId, cardId, isProduction = false) {
    const packsList = isProduction ? this.state.published : this.state.drafts;
    const pack = packsList.find(p => p.id === packId);
    const card = pack?.cards?.find(c => c.id === cardId);
    const text = card?.descricao || card?.titulo || '';

    if (!text.trim()) return notice('Digite o texto do roteiro antes de gerar a voz.', 'error');

    notice('Gerando áudio com a voz clonada do FEFO (IA)...');
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
      });
      const data = await res.json();
      if (!data.ok || !data.audio_base64) throw new Error(data.message || 'Falha ao sintetizar.');

      const binary = atob(data.audio_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const audioBlob = new Blob([bytes], { type: 'audio/wav' });

      if (window.AudioBlobDB) await window.AudioBlobDB.setAudio(cardId, audioBlob);
      const blobUrl = URL.createObjectURL(audioBlob);

      if (card) {
        card.audio_url = blobUrl;
        card.tamanho_audio = audioBlob.size;
      }

      if (isProduction) CardPackStorage.savePublishedCardPacks(this.state.published);
      else CardPackStorage.saveCustomCardPacks(this.state.drafts);

      const player = document.getElementById(`audio-player-${cardId}`);
      if (player) {
        player.src = blobUrl;
        player.load();
      }

      const mount = document.getElementById(`trimmer-mount-${cardId}`);
      if (mount) mount.dataset.mounted = '';

      notice('✓ Áudio gerado por IA com sucesso e aplicado ao card!', 'ok');
    } catch (e) {
      notice(`Aviso IA: ${e.message}`, 'error');
    }
  },

  // ==========================================================
  // OPERAÇÕES E METADADOS DO PACOTE DE CARDS
  // ==========================================================
  updateDraftPackageProperty(pkgId, prop, val) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    pkg[prop] = val;
    CardPackStorage.saveCustomCardPacks(this.state.drafts);
    if (prop === 'titulo') {
      const titleEl = document.getElementById(`cardpack-expanded-title-${pkgId}`);
      if (titleEl) titleEl.textContent = val.trim() || 'Sem título';
    }
  },

  updateProductionPackageProperty(packId, prop, val) {
    const pkg = (this.state.published || []).find(p => p.id === packId);
    if (!pkg) return;
    pkg[prop] = val;
    CardPackStorage.savePublishedCardPacks(this.state.published);
    if (prop === 'titulo') {
      const titleEl = document.getElementById(`cardpack-prod-expanded-title-${packId}`);
      if (titleEl) titleEl.textContent = val.trim() || 'Sem título';
    }
  },

  toggleDraftLicense(pkgId, licKey) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    pkg.licencas = pkg.licencas || ['home', 'clinical', 'escola'];
    if (pkg.licencas.includes(licKey)) {
      pkg.licencas = pkg.licencas.filter(l => l !== licKey);
    } else {
      pkg.licencas.push(licKey);
    }
    CardPackStorage.saveCustomCardPacks(this.state.drafts);
  },

  toggleDraftPremium(pkgId) {
    const pkg = (this.state.drafts || []).find(p => p.id === pkgId);
    if (!pkg) return;
    pkg.is_premium = !pkg.is_premium;
    CardPackStorage.saveCustomCardPacks(this.state.drafts);
  },

  updateCardItemTitle(packId, cardId, newTitle, isProduction = false) {
    const packsList = isProduction ? this.state.published : this.state.drafts;
    const pack = packsList.find(p => p.id === packId);
    const card = pack?.cards?.find(c => c.id === cardId);
    if (!card) return;
    card.titulo = newTitle.trim();
    if (isProduction) CardPackStorage.savePublishedCardPacks(this.state.published);
    else CardPackStorage.saveCustomCardPacks(this.state.drafts);

    const headerTitle = document.getElementById(`card-header-title-${cardId}`);
    if (headerTitle) {
      const cIdx = (pack.cards || []).indexOf(card);
      headerTitle.textContent = `CARD ${String(cIdx + 1).padStart(2, '0')}${card.titulo ? ' - ' + card.titulo : ''}`;
    }
  },

  updateCardAction(packId, cardId, val, isProduction = false) {
    const packsList = isProduction ? this.state.published : this.state.drafts;
    const pack = packsList.find(p => p.id === packId);
    const card = pack?.cards?.find(c => c.id === cardId);
    if (!card) return;
    card.codigo_acao = val.trim();

    if (isProduction) CardPackStorage.savePublishedCardPacks(this.state.published);
    else CardPackStorage.saveCustomCardPacks(this.state.drafts);
  },

  updateCardScript(packId, cardId, val, isProduction = false) {
    const packsList = isProduction ? this.state.published : this.state.drafts;
    const pack = packsList.find(p => p.id === packId);
    const card = pack?.cards?.find(c => c.id === cardId);
    if (!card) return;
    card.descricao = val;

    if (isProduction) CardPackStorage.savePublishedCardPacks(this.state.published);
    else CardPackStorage.saveCustomCardPacks(this.state.drafts);

    const badge = document.getElementById(`script-saved-${cardId}`);
    if (badge) {
      badge.classList.add('visible');
      clearTimeout(this.state.debounceTimers[`badge_${cardId}`]);
      this.state.debounceTimers[`badge_${cardId}`] = setTimeout(() => badge.classList.remove('visible'), 2000);
    }
  },

  async saveSingleCardItem(packId, cardId, isProduction = false) {
    if (isProduction) {
      CardPackStorage.savePublishedCardPacks(this.state.published);
      notice('✓ Alterações do card salvas!', 'ok');
      return;
    }
    await this.saveCardPackDetails(packId);
  },

  addNewEmptyCardItem(packId) {
    const pack = this.state.drafts.find(p => p.id === packId);
    if (!pack) return;
    pack.cards = pack.cards || [];
    const nextNum = pack.cards.length + 1;
    const nextCode = `c${String(nextNum).padStart(4, '0')}`;

    const newCard = {
      id: `card_${Date.now() % 1000000}_${nextNum}`,
      titulo: `Novo Card ${nextNum}`,
      codigo_acao: nextCode,
      mini_card_img: '',
      audio_url: '',
      arquivo_audio: `${nextCode}.wav`,
      descricao: ''
    };

    pack.cards.push(newCard);
    this.state.expandedCardIds.add(newCard.id);
    CardPackStorage.saveCustomCardPacks(this.state.drafts);
    this.renderDraftExpandedPanel();
    notice('Novo card adicionado ao pacote!', 'ok');
  },

  deleteCardItem(packId, cardId) {
    if (!confirm('Excluir este card do pacote?')) return;
    const pack = this.state.drafts.find(p => p.id === packId);
    if (!pack) return;
    pack.cards = (pack.cards || []).filter(c => c.id !== cardId);
    this.state.expandedCardIds.delete(cardId);
    CardPackStorage.addDeletedCardId(cardId);
    CardPackStorage.saveCustomCardPacks(this.state.drafts);
    this.renderDraftExpandedPanel();
    notice('Card excluído.', 'ok');
  },

  createNewCardPack() {
    const nextIdx = (this.state.drafts || []).length + 1;
    const newPack = {
      id: `pack_cards_${Date.now() % 1000000}`,
      titulo: `Novo Pacote de Cards ${nextIdx}`,
      descricao: '',
      target_count: 8,
      categoria: 'Cards Terapêuticos',
      licencas: ['home', 'clinical', 'escola'],
      is_premium: false,
      status: 'draft',
      cards: []
    };

    this.state.drafts.unshift(newPack);
    this.state.expandedDraftId = newPack.id;
    CardPackStorage.saveCustomCardPacks(this.state.drafts);
    this.renderDraftsGrid();

    setTimeout(() => {
      document.getElementById(`pkg-acc-draft-${newPack.id}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      document.getElementById(`draft-title-input-${newPack.id}`)?.focus();
      document.getElementById(`draft-title-input-${newPack.id}`)?.select();
    }, 100);
  },

  // ==========================================================
  // SALVAR E PUBLICAR PACOTE DE CARDS (LOCAL + GITHUB API)
  // ==========================================================
  async saveCardPackDetails(packId) {
    const pack = (this.state.drafts || []).find(p => p.id === packId);
    if (!pack) return;

    const titleInput = document.getElementById(`draft-title-input-${packId}`);
    if (titleInput && titleInput.value.trim()) {
      pack.titulo = titleInput.value.trim();
    }

    // Captura valores dos campos de cada card presentes no DOM
    const drawer = document.getElementById(`drawer-wrap-draft-${packId}`);
    if (drawer) {
      (pack.cards || []).forEach(c => {
        const cardWrap = drawer.querySelector(`#card-item-wrap-${c.id}`);
        if (cardWrap) {
          const tInput = cardWrap.querySelector('.pkg-item-title-input');
          if (tInput && tInput.value.trim()) c.titulo = tInput.value.trim();
          const fInput = cardWrap.querySelector('.pkg-item-fefo-input');
          if (fInput && fInput.value.trim()) c.codigo_acao = fInput.value.trim();
          const sText = cardWrap.querySelector('.pkg-item-script-textarea');
          if (sText) c.descricao = sText.value;
        }
      });
    }

    pack.updated_at = new Date().toISOString();
    CardPackStorage.saveCustomCardPacks(this.state.drafts);
    notice('Salvando pacote de cards...');

    if (window.GitHubSync && window.GitHubSync.isConfigured()) {
      notice('☁️ Salvando pacote de cards diretamente no GitHub...');
      try {
        await window.GitHubSync.saveDraftCardPacks(this.state.drafts);
        notice('✓ Pacote de cards salvo com sucesso no GitHub e localmente!', 'ok');
      } catch (ghErr) {
        console.warn('Erro ao salvar no GitHub:', ghErr);
        notice(`✓ Salvo localmente! Falha no GitHub (${ghErr.message})`, 'error');
      }
    } else {
      notice('✓ Pacote de cards salvo localmente no navegador! (Conecte o GitHub no topo para sincronizar entre PCs)', 'ok');
    }

    this.renderDraftsGrid();
  },

  async deleteCardPack(packId) {
    if (!confirm('Tem certeza que deseja excluir este pacote de cards?')) return;

    this.state.drafts = this.state.drafts.filter(p => p.id !== packId);
    if (this.state.expandedDraftId === packId) {
      this.state.expandedDraftId = null;
    }

    CardPackStorage.addDeletedPackId(packId);
    CardPackStorage.saveCustomCardPacks(this.state.drafts);
    this.renderDraftsGrid();
    notice('Pacote de cards excluído com sucesso.', 'ok');

    try {
      await fetch('/api/card_packs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: packId })
      });
    } catch (e) {}
  },

  async publishCardPackOfficial(packId) {
    const pack = this.state.drafts.find(p => p.id === packId);
    if (!pack) return;

    const count = (pack.cards || []).length;
    if (count === 0) {
      notice('Adicione pelo menos um card ao pacote antes de publicar.', 'error');
      return;
    }

    const confirmMsg = `🚀 PUBLICAR PACOTE DE CARDS OFICIAL\n\nPublicar “${pack.titulo}” com ${count} card(s) no catálogo oficial?\n\nAs imagens e os áudios vinculados serão disponibilizados no catálogo para o App móvel do FEFO!`;
    if (!confirm(confirmMsg)) return;

    notice('Publicando pacote de cards oficial... aguarde...', '');

    // 1. Tenta API do servidor local
    let publishedLocally = false;
    try {
      const res = await fetch('/api/card_packs/publish_official', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          publishedLocally = true;
          notice(data.message || 'Pacote de cards publicado!', 'ok');
          this.state.expandedDraftId = null;
          await this.loadCardPacks();
          return;
        }
      }
    } catch (err) {}

    // 2. Se offline, publica via GitHub REST API!
    if (window.GitHubSync && window.GitHubSync.isConfigured()) {
      try {
        const ghRes = await window.GitHubSync.publishOfficialCardPack(pack, (msg) => {
          notice(msg, '');
        });
        notice(ghRes.message, 'ok');
        this.state.expandedDraftId = null;
        await this.loadCardPacks();
      } catch (ghErr) {
        notice(`Erro na publicação via GitHub: ${ghErr.message}`, 'error');
      }
    } else {
      notice('Servidor local offline. Conecte seu token do GitHub no topo para publicar de qualquer computador!', 'error');
      window.GitHubSync?.openModal();
    }
  },

  // ==========================================================
  // SEÇÃO 2: PACOTES DE CARDS PUBLICADOS (PRODUÇÃO)
  // ==========================================================
  renderPublishedGrid() {
    const grid = document.getElementById('published-card-packs-grid');
    if (!grid) return;

    if (!this.state.published.length) {
      grid.innerHTML = `<div class="empty">Nenhum pacote de cards oficial publicado ainda.</div>`;
      this.renderProductionExpandedPanel();
      return;
    }

    grid.innerHTML = this.state.published.map((pkg, idx) => {
      const isExpanded = this.state.expandedProductionId === pkg.id;
      const numLabel = `PACOTE DE CARDS ${idx + 1}${pkg.titulo ? ` - ${this.escapeHtml(pkg.titulo)}` : ''}`;

      return `
        <div class="pkg-accordion-wrapper" id="pkg-acc-prod-${pkg.id}">
          ${!isExpanded ? `
            <div class="pkg-collapsed-bar published-bar" onclick="CardPackManager.toggleProductionPackage('${pkg.id}')">
              <span>${numLabel}</span>
            </div>
          ` : ''}
          <div class="package-drawer-wrapper" id="drawer-wrap-prod-${pkg.id}" style="${isExpanded ? 'display:block;' : 'display:none;'}"></div>
        </div>
      `;
    }).join('');

    this.renderProductionExpandedPanel();
  },

  toggleProductionPackage(packId) {
    if (this.state.expandedProductionId === packId) {
      this.state.expandedProductionId = null;
    } else {
      this.state.expandedProductionId = packId;
    }
    this.renderPublishedGrid();

    if (this.state.expandedProductionId) {
      setTimeout(() => {
        document.getElementById(`pkg-acc-prod-${packId}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  },

  renderProductionExpandedPanel() {
    (this.state.published || []).forEach(p => {
      const el = document.getElementById(`drawer-wrap-prod-${p.id}`);
      if (el && p.id !== this.state.expandedProductionId) {
        el.innerHTML = '';
        el.style.display = 'none';
      }
    });

    if (!this.state.expandedProductionId) return;

    const drawer = document.getElementById(`drawer-wrap-prod-${this.state.expandedProductionId}`);
    if (!drawer) return;

    const pkgIdx = (this.state.published || []).findIndex(p => p.id === this.state.expandedProductionId);
    const pkg = (this.state.published || [])[pkgIdx];
    if (!pkg) {
      drawer.style.display = 'none';
      return;
    }

    drawer.style.display = 'block';
    const cards = pkg.cards || [];
    const hasHome = (pkg.licencas || ['home', 'clinical', 'escola']).includes('home');
    const hasClinical = (pkg.licencas || ['home', 'clinical', 'escola']).includes('clinical');
    const hasEscola = (pkg.licencas || ['home', 'clinical', 'escola']).includes('escola');

    drawer.innerHTML = `
      <div class="pkg-expanded-card published-card" id="pkg-card-prod-${pkg.id}">
        <!-- Linha Superior -->
        <div class="pkg-expanded-top">
          <div class="pkg-expanded-left">
            <div class="pkg-expanded-num" id="cardpack-prod-expanded-title-${pkg.id}">
              ${this.escapeHtml(pkg.titulo || `PACOTE DE CARDS ${pkgIdx + 1}`)}
            </div>
            <label class="pkg-expanded-label">Alterar nome do Pacote de Cards</label>
            <input type="text" class="pkg-input-pill" id="prod-title-input-${pkg.id}" 
                   value="${this.escapeHtml(pkg.titulo)}" 
                   placeholder="Nome exemplo..." 
                   oninput="CardPackManager.updateProductionPackageProperty('${pkg.id}', 'titulo', this.value)">

            <!-- 3 Botões de Ação -->
            <div class="pkg-action-pills-row">
              <button type="button" class="btn-pkg-action blue" onclick="notice('Pacote já publicado oficialmente no catálogo.', 'ok')">
                Publicado
              </button>
              <button type="button" class="btn-pkg-action red" onclick="CardPackManager.deleteCardPack('${pkg.id}')">
                Excluir
              </button>
              <button type="button" class="btn-pkg-action green" onclick="CardPackManager.saveCardPackDetails('${pkg.id}')">
                Salvar
              </button>
            </div>
          </div>

          <div class="pkg-lic-section">
            <div class="pkg-lic-title">Licenças</div>
            <div class="pkg-lic-box">
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasHome ? 'checked' : ''} disabled>
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Home</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasClinical ? 'checked' : ''} disabled>
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Clinica</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasEscola ? 'checked' : ''} disabled>
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Escola</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${pkg.is_premium ? 'checked' : ''} disabled>
                <span class="lic-icon">🏠</span>
                <span class="lic-name">Premium</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Lista de Cards Oficiais -->
        <div class="pkg-tracks-section">
          ${cards.map((c, cIdx) => this.renderCardItem(pkg.id, c, cIdx, true)).join('')}
        </div>

        <!-- Seta central de recolhimento no fundo do card -->
        <div class="pkg-collapse-arrow-btn green" title="Recolher pacote" onclick="CardPackManager.toggleProductionPackage('${pkg.id}')">
          ▲
        </div>
      </div>
    `;
  }
};

window.CardPackManager = CardPackManager;

// Inicializa assim que a página carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CardPackManager.init());
} else {
  CardPackManager.init();
}
