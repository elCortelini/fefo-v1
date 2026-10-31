/**
 * cards-packs.js - Gerenciador de Pacotes de Cards Interativos do FEFO Pet
 * 
 * Visual idêntico ao Gerenciador de Menus de Áudio:
 * - Barras recolhidas em degradê âmbar (Rascunhos) e verde (Publicados)
 * - Título com alteração em tempo real e 3 botões de ação: [ Publicar ] [ Excluir ] [ Salvar ]
 * - Caixa de Licenças lilás/azul pastel com checkboxes circulares brancos
 * - Lista de Cards em estilo sanfona/accordion (CARD 01 - Nome)
 * - ESPAÇO DEDICADO PARA UPLOAD DE IMAGEM DO CARD (drag & drop, preview instantâneo e IndexedDB)
 * - Cortador de áudio integrado (Waveform com tons de amarelo/ouro harmonizados)
 * - Gerador de fala por IA integrado
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
    expandedPackId: null,
    expandedProductionId: null,
    expandedCardIds: new Set(),
    activeTrimmerCardId: null,
    activeAiCardId: null,
    debounceTimers: {},
    loading: false
  },

  async init() {
    this.bindEvents();
    await this.loadCardPacks();
  },

  bindEvents() {
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

  async loadCardPacks() {
    const deletedPackIds = CardPackStorage.getDeletedPackIds();
    const deletedCardIds = CardPackStorage.getDeletedCardIds();

    let drafts = [];
    let published = [];
    let isApiOnline = false;

    // 1. Tenta API do servidor local
    try {
      this.state.loading = true;
      const res = await fetch('/api/card_packs');
      if (res.ok) {
        const data = await res.json();
        drafts = data.drafts || [];
        published = data.published || [];
        isApiOnline = true;
      }
    } catch (e) {}

    // 2. Fallback estático ou GitHub API direta
    if (!isApiOnline) {
      let dData = null;
      let cData = null;

      try {
        const [draftsRes, catRes] = await Promise.all([
          fetch('../repository/draft_card_packs.json', { cache: 'no-store' }),
          fetch('../repository/catalog.json', { cache: 'no-store' })
        ]);
        if (draftsRes && draftsRes.ok) dData = await draftsRes.json();
        if (catRes && catRes.ok) cData = await catRes.json();
      } catch (err) {}

      // Fallback direto via GitHub REST API se configurado
      if ((!dData || !cData) && window.GitHubSync && window.GitHubSync.isConfigured()) {
        try {
          if (!dData) {
            const ghDrafts = await window.GitHubSync.getFile('repository/draft_card_packs.json');
            if (ghDrafts.exists && ghDrafts.content) dData = JSON.parse(ghDrafts.content);
          }
          if (!cData) {
            const ghCat = await window.GitHubSync.getFile('repository/catalog.json');
            if (ghCat.exists && ghCat.content) cData = JSON.parse(ghCat.content);
          }
        } catch (ghErr) {
          console.warn('[loadCardPacks] Falha no fallback do GitHub API:', ghErr);
        }
      }

      if (dData && dData.card_packs) {
        drafts = dData.card_packs || [];
      }
      if (cData && cData.card_packs) {
        published = cData.card_packs || [];
      }
    }

    // Mescla com edições do localStorage
    const savedDrafts = CardPackStorage.getCustomCardPacks();
    if (savedDrafts && Array.isArray(savedDrafts) && savedDrafts.length > 0) {
      const merged = [];
      const seen = new Set();
      savedDrafts.forEach(sd => {
        if (!deletedPackIds.includes(sd.id)) {
          merged.push(sd);
          seen.add(sd.id);
        }
      });
      drafts.forEach(rd => {
        if (!seen.has(rd.id) && !deletedPackIds.includes(rd.id)) {
          merged.push(rd);
          seen.add(rd.id);
        }
      });
      drafts = merged;
    }

    const savedProd = CardPackStorage.getPublishedCardPacks();
    if (savedProd && Array.isArray(savedProd) && savedProd.length > 0) {
      const prodMap = new Map(savedProd.map(m => [m.id, m]));
      published = published.map(p => prodMap.get(p.id) || p);
    }

    // Filtra IDs excluídos
    drafts = drafts.filter(p => !deletedPackIds.includes(p.id));
    drafts.forEach(p => {
      p.licencas = p.licencas || ['home', 'clinical', 'escola'];
      if (p.cards) p.cards = p.cards.filter(c => !deletedCardIds.includes(c.id));
    });

    published = published.filter(p => !deletedPackIds.includes(p.id));
    published.forEach(p => {
      p.licencas = p.licencas || ['home', 'clinical', 'escola'];
      if (p.cards) p.cards = p.cards.filter(c => !deletedCardIds.includes(c.id));
    });

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
  // RENDERIZAÇÃO: PACOTES DE CARDS EM RASCUNHO
  // ==========================================================
  renderDraftsGrid() {
    const grid = document.getElementById('draft-card-packs-grid');
    if (!grid) return;

    if (!this.state.drafts.length) {
      grid.innerHTML = `
        <div class="empty" style="padding: 24px 16px; background: #faf9ff; border-radius: 14px; border: 1px dashed var(--line);">
          <p style="font-size: 15px; font-weight: 800; color: #d97706; margin: 0 0 4px;">Nenhum pacote de cards em rascunho.</p>
          <span style="color: var(--muted); font-size: 13px;">Clique em <strong>“＋ Criar Novo Pacote de Cards”</strong> acima para começar.</span>
        </div>
      `;
      this.renderExpandedDraftPack();
      return;
    }

    grid.innerHTML = this.state.drafts.map((pack, idx) => {
      const isExpanded = this.state.expandedPackId === pack.id;
      const count = (pack.cards || []).length;
      const packNumStr = `PACOTE ${String(idx + 1).padStart(2, '0')}`;

      return `
        <div class="pkg-collapsed-bar draft-bar ${isExpanded ? 'is-active' : ''}" 
             onclick="CardPackManager.toggleCardPack('${pack.id}')">
          <div class="pkg-bar-left">
            <span class="pkg-bar-num">🃏 ${packNumStr}</span>
            <span class="pkg-bar-title">${this.escapeHtml(pack.titulo || 'Sem título')}</span>
            <span class="pkg-bar-tag">${count} CARDS</span>
            <span class="pkg-badge draft" style="margin: 0;">🟡 RASCUNHO</span>
          </div>
          <div class="pkg-bar-right">
            <span class="pkg-arrow">${isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>
      `;
    }).join('');

    this.renderExpandedDraftPack();
  },

  toggleCardPack(packId) {
    if (this.state.expandedPackId === packId) {
      this.state.expandedPackId = null;
    } else {
      this.state.expandedPackId = packId;
    }
    this.renderDraftsGrid();

    if (this.state.expandedPackId) {
      setTimeout(() => {
        document.getElementById('card-pack-inline-drawer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  },

  renderExpandedDraftPack() {
    const drawer = document.getElementById('card-pack-inline-drawer');
    if (!drawer) return;

    if (!this.state.expandedPackId) {
      drawer.innerHTML = '';
      drawer.style.display = 'none';
      return;
    }

    const packIdx = (this.state.drafts || []).findIndex(p => p.id === this.state.expandedPackId);
    const pack = (this.state.drafts || [])[packIdx];
    if (!pack) {
      drawer.style.display = 'none';
      return;
    }

    drawer.style.display = 'block';
    const cards = pack.cards || [];
    const hasHome = (pack.licencas || []).includes('home');
    const hasClinical = (pack.licencas || []).includes('clinical');
    const hasEscola = (pack.licencas || []).includes('escola');

    drawer.innerHTML = `
      <div class="pkg-expanded-card draft-card" id="cardpack-card-${pack.id}">
        <!-- Topo: Título, Ações e Licenças -->
        <div class="pkg-expanded-top">
          <div class="pkg-expanded-left">
            <div class="pkg-expanded-num" id="cardpack-expanded-title-${pack.id}">
              🃏 PACOTE DE CARDS ${String(packIdx + 1).padStart(2, '0')} - ${this.escapeHtml(pack.titulo || 'Sem título')}
            </div>
            <label class="pkg-expanded-label">Alterar nome do Pacote de Cards</label>
            <input type="text" class="pkg-input-pill" id="cardpack-title-input-${pack.id}" 
                   value="${this.escapeHtml(pack.titulo)}" 
                   placeholder="Ex: Cards das Emoções"
                   oninput="CardPackManager.updatePackTitle('${pack.id}', this.value)">

            <!-- 3 Botões de Ação diretamente abaixo do input -->
            <div class="pkg-action-pills-row">
              <button type="button" class="btn-pkg-action blue" onclick="CardPackManager.publishCardPackOfficial('${pack.id}')">
                Publicar
              </button>
              <button type="button" class="btn-pkg-action red" onclick="CardPackManager.deleteCardPack('${pack.id}')">
                Excluir
              </button>
              <button type="button" class="btn-pkg-action green" onclick="CardPackManager.saveCardPackDetails('${pack.id}')">
                Salvar
              </button>
            </div>
          </div>

          <div class="pkg-lic-section">
            <div class="pkg-lic-title">Licenças</div>
            <div class="pkg-lic-box">
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasHome ? 'checked' : ''} onchange="CardPackManager.togglePackLicense('${pack.id}', 'home')">
                <span class="lic-name">Home</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasClinical ? 'checked' : ''} onchange="CardPackManager.togglePackLicense('${pack.id}', 'clinical')">
                <span class="lic-name">Clínica</span>
              </label>
              <label class="pkg-lic-item">
                <input type="checkbox" ${hasEscola ? 'checked' : ''} onchange="CardPackManager.togglePackLicense('${pack.id}', 'escola')">
                <span class="lic-name">Escola</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Lista de Cards em estilo Sanfona / Accordion -->
        <div style="margin-top: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <span style="font-size: 13px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
              Cards Interativos deste Pacote (${cards.length})
            </span>
          </div>

          <div class="faixas-accordion-list">
            ${cards.length === 0 ? `
              <div style="text-align: center; padding: 24px; color: var(--muted); background: #ffffff; border: 1px dashed var(--line); border-radius: 14px;">
                Nenhum card cadastrado ainda. Clique no botão abaixo para adicionar seu primeiro card interativo!
              </div>
            ` : cards.map((c, idx) => this.renderCardAccordionItem(pack.id, c, idx, false)).join('')}
          </div>

          <!-- Botão Adicionar Card -->
          <button type="button" class="btn-add-faixa" onclick="CardPackManager.addNewCardItem('${pack.id}')" style="margin-top: 14px;">
            ＋ Adicionar Novo Card ao Pacote
          </button>
        </div>
      </div>
    `;

    // Hidrata imagens salvas no IndexedDB para pré-visualização instantânea
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
  // RENDERIZAÇÃO DO ITEM INDIVIDUAL DE CARD (SANFONA + UPLOAD)
  // ==========================================================
  renderCardAccordionItem(packId, c, idx, isProduction = false) {
    const isExpanded = this.state.expandedCardIds.has(c.id);
    const cCode = c.codigo_acao || c.id || `c${String(idx + 1).padStart(4, '0')}`;
    const cardTitle = c.titulo || `Card ${idx + 1}`;
    const hasImage = Boolean(c.mini_card_img);
    const hasAudio = Boolean(c.audio_url);

    return `
      <div class="faixa-accordion-wrapper" id="card-wrapper-${c.id}">
        <!-- Barra de Alternância do Card -->
        <div class="faixa-toggle-bar" onclick="CardPackManager.toggleCardAccordion('${c.id}', ${isProduction})">
          <div class="faixa-toggle-left" style="display: flex; align-items: center; gap: 10px;">
            ${hasImage ? `
              <img src="${this.escapeHtml(c.mini_card_img)}" id="thumb-${c.id}" style="width: 24px; height: 32px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;">
            ` : `
              <span style="font-size: 16px;">🃏</span>
            `}
            <span class="faixa-toggle-num">CARD ${String(idx + 1).padStart(2, '0')}</span>
            <span class="faixa-toggle-name" id="card-header-title-${c.id}">${this.escapeHtml(cardTitle)}</span>
            <span style="font-size: 11px; color: #64748b; font-weight: 700;">(${cCode})</span>
          </div>

          <div class="faixa-toggle-right">
            ${hasImage ? `
              <span class="pill green" style="font-size: 10px;">📷 Imagem OK</span>
            ` : `
              <span class="pill" style="font-size: 10px; background: #fef3c7; color: #92400e;">Sem Imagem</span>
            `}

            ${hasAudio ? `
              <span class="pill green" style="font-size: 10px;">🎵 Áudio OK</span>
            ` : `
              <span class="pill" style="font-size: 10px; background: #fee2e2; color: #991b1b;">Sem Áudio</span>
            `}

            ${!isProduction ? `
              <button type="button" class="btn-remove-track" title="Excluir este card" 
                      onclick="event.stopPropagation(); CardPackManager.deleteCardItem('${packId}', '${c.id}')">✕</button>
            ` : ''}

            <span class="faixa-arrow" id="arrow-card-${c.id}">${isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>

        <!-- Painel Expandido com ESPAÇO PARA UPAR IMAGEM e Controles -->
        <div class="track-accordion-panel" id="panel-card-${c.id}" style="display: ${isExpanded ? 'block' : 'none'};">
          <div class="faixa-inner-box" style="padding: 20px;">
            <div class="card-flex-row">
              
              <!-- 1. ESPAÇO DEDICADO PARA UPLOAD DA IMAGEM DO CARD -->
              <div>
                <label style="display: block; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 6px;">
                  Imagem do Card (App FEFO):
                </label>
                <div class="card-upload-area ${hasImage ? 'has-image' : ''}" 
                     id="card-upload-area-${c.id}"
                     onclick="document.getElementById('card-file-input-${c.id}').click()"
                     ondragover="event.preventDefault(); this.classList.add('drag-over');"
                     ondragleave="this.classList.remove('drag-over');"
                     ondrop="CardPackManager.handleCardImageDrop(event, '${packId}', '${c.id}', ${isProduction})">
                  
                  <img id="card-img-preview-${c.id}" src="${this.escapeHtml(c.mini_card_img || '')}" style="display: ${hasImage ? 'block' : 'none'};" alt="Imagem do Card">
                  
                  <div class="card-upload-placeholder" id="card-placeholder-${c.id}" style="display: ${hasImage ? 'none' : 'flex'};">
                    <span class="icon">🃏</span>
                    <span class="text-main">Clique ou arraste a imagem do Card</span>
                    <span class="text-sub">(JPG, PNG ou WEBP)</span>
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
              </div>

              <!-- 2. METADADOS E CONTROLES DE ÁUDIO -->
              <div class="card-fields-col">
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
                  <div>
                    <label style="display: block; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 4px;">
                      Título / Nome do Card:
                    </label>
                    <input type="text" class="pkg-input-pill" 
                           value="${this.escapeHtml(c.titulo || '')}" 
                           placeholder="Ex: Card Alegria & Sorriso"
                           oninput="CardPackManager.updateCardTitle('${packId}', '${c.id}', this.value, ${isProduction})">
                  </div>
                  <div>
                    <label style="display: block; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 4px;">
                      Código / Ação (App):
                    </label>
                    <input type="text" class="pkg-input-pill" 
                           value="${this.escapeHtml(c.codigo_acao || cCode)}" 
                           placeholder="c0001"
                           oninput="CardPackManager.updateCardAction('${packId}', '${c.id}', this.value, ${isProduction})">
                  </div>
                </div>

                <!-- Barra de Ações de Áudio (Harmonizada) -->
                <div>
                  <label style="display: block; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 6px;">
                    Áudio Vinculado ao Card:
                  </label>
                  <div class="faixa-controls-row">
                    <!-- Botão Play / Pause -->
                    <button type="button" class="btn-faixa-pill blue btn-play-custom" id="btn-play-card-${c.id}" 
                            onclick="CardPackManager.togglePlayCardAudio('${c.id}')">
                      ▶ Ouvir Áudio
                    </button>
                    <button type="button" class="btn-faixa-pill" id="btn-pause-card-${c.id}" style="display:none;" 
                            onclick="CardPackManager.pauseCardAudio('${c.id}')">
                      ❚❚ Pausar
                    </button>

                    <!-- Botão Trocar Áudio -->
                    <button type="button" class="btn-faixa-pill" onclick="CardPackManager.promptChooseCardAudio('${packId}', '${c.id}', ${isProduction})">
                      📁 Trocar Áudio
                    </button>

                    <!-- Botão Ajustar / Cortar Áudio -->
                    <button type="button" class="btn-faixa-pill orange" id="btn-trim-card-${c.id}" 
                            onclick="CardPackManager.toggleCardAccordionTrimmer('${c.id}', '${packId}', ${isProduction})">
                      ✂ Ajustar / Cortar Áudio
                    </button>

                    <!-- Botão Gerar Fala com IA -->
                    <button type="button" class="btn-faixa-pill purple" id="btn-ai-card-${c.id}" 
                            onclick="CardPackManager.toggleCardAccordionAiVoice('${c.id}', '${packId}', ${isProduction})">
                      🎙 Gerar Fala com IA
                    </button>

                    <audio id="audio-player-card-${c.id}" src="${this.escapeHtml(c.audio_url || '')}" preload="none" style="display:none;" 
                           onended="CardPackManager.onCardAudioEnded('${c.id}')"></audio>
                  </div>
                </div>

                <!-- Gavetas Integradas: Cortador de Áudio & IA -->
                <div class="trimmer-integrated-box" id="card-trimmer-box-${c.id}" style="display: none; margin-top: 10px;"></div>
                <div class="ai-integrated-box" id="card-ai-box-${c.id}" style="display: none; margin-top: 10px;"></div>

                <!-- Roteiro Falado / Descrição do Card -->
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <label style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase;">
                      Roteiro Falado / Descrição do Card:
                    </label>
                    <span class="script-saved-badge" id="script-saved-card-${c.id}">✓ Salvo</span>
                  </div>
                  <textarea class="pkg-script-textarea" rows="2" 
                            placeholder="Descreva o som ou a fala do FEFO ao acionar este card..."
                            oninput="CardPackManager.updateCardScript('${packId}', '${c.id}', this.value, ${isProduction})">${this.escapeHtml(c.descricao || '')}</textarea>
                </div>

              </div>

            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ==========================================================
  // CONTROLE DE SANFONA / ACCORDION DOS CARDS
  // ==========================================================
  toggleCardAccordion(cardId, isProduction = false) {
    const panel = document.getElementById(`panel-card-${cardId}`);
    const arrow = document.getElementById(`arrow-card-${cardId}`);
    if (!panel) return;

    if (panel.style.display === 'none' || !panel.style.display) {
      panel.style.display = 'block';
      if (arrow) arrow.textContent = '▲';
      this.state.expandedCardIds.add(cardId);
    } else {
      panel.style.display = 'none';
      if (arrow) arrow.textContent = '▼';
      this.state.expandedCardIds.delete(cardId);
      this.closeCardTrimmer(cardId);
      this.closeCardAiVoice(cardId);
    }
  },

  // ==========================================================
  // UPLOAD E MANIPULAÇÃO DE IMAGEM DO CARD (NOVO)
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
    const thumbEl = document.getElementById(`thumb-${cardId}`);

    if (previewEl) {
      previewEl.src = blobUrl;
      previewEl.style.display = 'block';
    }
    if (placeholderEl) placeholderEl.style.display = 'none';
    if (uploadArea) uploadArea.classList.add('has-image');
    if (thumbEl) thumbEl.src = blobUrl;

    notice(`✓ Imagem do card "${file.name}" carregada com sucesso!`, 'ok');
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
  // CONTROLES DE ÁUDIO & CORTADOR INTEGRADO (HARMONIZADO)
  // ==========================================================
  promptChooseCardAudio(packId, cardId, isProduction = false) {
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
        this.handleCardAudioSelected(packId, cardId, file, isProduction);
      }
      inp.value = '';
    };
    inp.click();
  },

  async handleCardAudioSelected(packId, cardId, file, isProduction = false) {
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

    const player = document.getElementById(`audio-player-card-${cardId}`);
    if (player) player.src = blobUrl;

    notice(`✓ Áudio "${file.name}" vinculado ao card!`, 'ok');
    if (isProduction) this.renderExpandedPublishedPack();
    else this.renderExpandedDraftPack();
  },

  togglePlayCardAudio(cardId) {
    const player = document.getElementById(`audio-player-card-${cardId}`);
    const btnPlay = document.getElementById(`btn-play-card-${cardId}`);
    const btnPause = document.getElementById(`btn-pause-card-${cardId}`);
    if (!player) return;

    document.querySelectorAll('audio').forEach(a => {
      if (a !== player && !a.paused) {
        a.pause();
        const otherId = a.id.replace('audio-player-card-', '');
        document.getElementById(`btn-play-card-${otherId}`)?.classList.remove('active');
        document.getElementById(`btn-pause-card-${otherId}`)?.classList.remove('active');
      }
    });

    player.play().then(() => {
      if (btnPlay) btnPlay.style.display = 'none';
      if (btnPause) btnPause.style.display = 'inline-block';
    }).catch(() => {
      notice('Selecione um áudio para ouvir.', 'error');
    });
  },

  pauseCardAudio(cardId) {
    const player = document.getElementById(`audio-player-card-${cardId}`);
    const btnPlay = document.getElementById(`btn-play-card-${cardId}`);
    const btnPause = document.getElementById(`btn-pause-card-${cardId}`);
    if (player) player.pause();
    if (btnPlay) btnPlay.style.display = 'inline-block';
    if (btnPause) btnPause.style.display = 'none';
  },

  onCardAudioEnded(cardId) {
    const btnPlay = document.getElementById(`btn-play-card-${cardId}`);
    const btnPause = document.getElementById(`btn-pause-card-${cardId}`);
    if (btnPlay) btnPlay.style.display = 'inline-block';
    if (btnPause) btnPause.style.display = 'none';
  },

  // Cortador Integrado do Card
  toggleCardAccordionTrimmer(cardId, packId, isProduction = false) {
    const box = document.getElementById(`card-trimmer-box-${cardId}`);
    if (!box) return;

    if (box.style.display === 'block') {
      this.closeCardTrimmer(cardId);
      return;
    }

    this.closeCardAiVoice(cardId);
    box.style.display = 'block';

    const packsList = isProduction ? this.state.published : this.state.drafts;
    const pack = packsList.find(p => p.id === packId);
    const card = pack?.cards?.find(c => c.id === cardId);
    const audioUrl = card?.audio_url || '';

    if (!audioUrl) {
      box.innerHTML = `
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; text-align: center; color: #92400e; font-size: 13px;">
          Adicione um áudio a este card clicando em <strong>“📁 Trocar Áudio”</strong> antes de abrir o cortador.
        </div>
      `;
      return;
    }

    if (window.mountAudioTrimmer) {
      window.mountAudioTrimmer(box, {
        audioUrl: audioUrl,
        showClose: true,
        onClose: () => this.closeCardTrimmer(cardId),
        onSave: async (blob) => {
          notice('Salvando corte do áudio do card...');
          if (window.AudioBlobDB) {
            await window.AudioBlobDB.setAudio(cardId, blob);
          }
          const cutUrl = URL.createObjectURL(blob);
          if (card) {
            card.audio_url = cutUrl;
            card.tamanho_audio = blob.size;
          }
          if (isProduction) CardPackStorage.savePublishedCardPacks(this.state.published);
          else CardPackStorage.saveCustomCardPacks(this.state.drafts);

          const player = document.getElementById(`audio-player-card-${cardId}`);
          if (player) player.src = cutUrl;

          notice('✓ Corte aplicado ao áudio do card com sucesso!', 'ok');
          this.closeCardTrimmer(cardId);
        }
      });
    }
  },

  closeCardTrimmer(cardId) {
    const box = document.getElementById(`card-trimmer-box-${cardId}`);
    if (box) {
      box.innerHTML = '';
      box.style.display = 'none';
    }
  },

  // Gerador de Fala com IA Integrado
  toggleCardAccordionAiVoice(cardId, packId, isProduction = false) {
    const box = document.getElementById(`card-ai-box-${cardId}`);
    if (!box) return;

    if (box.style.display === 'block') {
      this.closeCardAiVoice(cardId);
      return;
    }

    this.closeCardTrimmer(cardId);
    box.style.display = 'block';

    const packsList = isProduction ? this.state.published : this.state.drafts;
    const pack = packsList.find(p => p.id === packId);
    const card = pack?.cards?.find(c => c.id === cardId);
    const defaultText = card?.descricao || card?.titulo || 'Olá amiguinho! Este é o som do card FEFO.';

    box.innerHTML = `
      <div style="background: #faf8ff; border: 1.5px solid var(--purple); border-radius: 14px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 12px; font-weight: 800; color: var(--purple);">🎙️ GERAR ÁUDIO COM A VOZ CLONADA DO FEFO (IA)</span>
          <button type="button" onclick="CardPackManager.closeCardAiVoice('${cardId}')" style="border:none; background:none; cursor:pointer; font-size:16px; font-weight:bold; color:var(--muted);">✕</button>
        </div>
        <p style="font-size: 12px; color: var(--muted); margin: 0 0 10px;">Digite o texto que a voz do FEFO irá pronunciar para este card:</p>
        <textarea id="ai-text-input-card-${cardId}" rows="2" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid var(--line); border-radius: 8px; font-size: 13px;">${this.escapeHtml(defaultText)}</textarea>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
          <button type="button" class="btn secondary" style="font-size: 12px;" onclick="CardPackManager.closeCardAiVoice('${cardId}')">Cancelar</button>
          <button type="button" class="btn primary" style="font-size: 12px;" onclick="CardPackManager.generateCardAiSpeech('${cardId}', '${packId}', ${isProduction})">⚡ Sintetizar e Aplicar ao Card</button>
        </div>
      </div>
    `;
  },

  closeCardAiVoice(cardId) {
    const box = document.getElementById(`card-ai-box-${cardId}`);
    if (box) {
      box.innerHTML = '';
      box.style.display = 'none';
    }
  },

  async generateCardAiSpeech(cardId, packId, isProduction = false) {
    const text = document.getElementById(`ai-text-input-card-${cardId}`)?.value.trim();
    if (!text) return notice('Digite o texto antes de gerar.', 'error');

    notice('Gerando fala com a voz do FEFO... aguarde...');
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

      const packsList = isProduction ? this.state.published : this.state.drafts;
      const pack = packsList.find(p => p.id === packId);
      const card = pack?.cards?.find(c => c.id === cardId);
      if (card) {
        card.audio_url = blobUrl;
        card.descricao = text;
        card.tamanho_audio = audioBlob.size;
      }

      if (isProduction) CardPackStorage.savePublishedCardPacks(this.state.published);
      else CardPackStorage.saveCustomCardPacks(this.state.drafts);

      const player = document.getElementById(`audio-player-card-${cardId}`);
      if (player) player.src = blobUrl;

      notice('✓ Áudio gerado por IA com sucesso e aplicado ao card!', 'ok');
      this.closeCardAiVoice(cardId);
    } catch (e) {
      notice(`Aviso IA: ${e.message}`, 'error');
    }
  },

  // ==========================================================
  // OPERAÇÕES DO PACOTE DE CARDS (TÍTULO, LICENÇAS, METADADOS)
  // ==========================================================
  updatePackTitle(packId, newTitle) {
    const pack = this.state.drafts.find(p => p.id === packId);
    if (!pack) return;
    pack.titulo = newTitle.trim();
    const packIdx = this.state.drafts.findIndex(p => p.id === packId);
    const headerTitle = document.getElementById(`cardpack-expanded-title-${packId}`);
    if (headerTitle) {
      headerTitle.textContent = `🃏 PACOTE DE CARDS ${String(packIdx + 1).padStart(2, '0')} - ${pack.titulo || 'Sem título'}`;
    }
    CardPackStorage.saveCustomCardPacks(this.state.drafts);
  },

  togglePackLicense(packId, licType) {
    const pack = this.state.drafts.find(p => p.id === packId);
    if (!pack) return;
    pack.licencas = pack.licencas || ['home', 'clinical', 'escola'];
    if (pack.licencas.includes(licType)) {
      pack.licencas = pack.licencas.filter(l => l !== licType);
    } else {
      pack.licencas.push(licType);
    }
    CardPackStorage.saveCustomCardPacks(this.state.drafts);
  },

  updateCardTitle(packId, cardId, val, isProduction = false) {
    const packsList = isProduction ? this.state.published : this.state.drafts;
    const pack = packsList.find(p => p.id === packId);
    const card = pack?.cards?.find(c => c.id === cardId);
    if (!card) return;
    card.titulo = val.trim();
    const headerTitle = document.getElementById(`card-header-title-${cardId}`);
    if (headerTitle) headerTitle.textContent = card.titulo || 'Sem título';

    if (isProduction) CardPackStorage.savePublishedCardPacks(this.state.published);
    else CardPackStorage.saveCustomCardPacks(this.state.drafts);
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

    const badge = document.getElementById(`script-saved-card-${cardId}`);
    if (badge) {
      badge.classList.add('visible');
      clearTimeout(this.state.debounceTimers[`badge_${cardId}`]);
      this.state.debounceTimers[`badge_${cardId}`] = setTimeout(() => badge.classList.remove('visible'), 2000);
    }
  },

  addNewCardItem(packId) {
    const pack = this.state.drafts.find(p => p.id === packId);
    if (!pack) return;
    pack.cards = pack.cards || [];
    const nextNum = pack.cards.length + 1;
    const nextCode = `c${String(nextNum).padStart(4, '0')}`;

    const newCard = {
      id: `card_${Date.now() % 1000000}_${nextNum}`,
      titulo: `Card ${nextNum}`,
      codigo_acao: nextCode,
      mini_card_img: '',
      audio_url: '',
      arquivo_audio: `${nextCode}.wav`,
      descricao: ''
    };

    pack.cards.push(newCard);
    this.state.expandedCardIds.add(newCard.id);
    CardPackStorage.saveCustomCardPacks(this.state.drafts);
    this.renderExpandedDraftPack();
    this.renderDraftsGrid();
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
    this.renderExpandedDraftPack();
    this.renderDraftsGrid();
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
    this.state.expandedPackId = newPack.id;
    CardPackStorage.saveCustomCardPacks(this.state.drafts);
    this.renderDraftsGrid();

    setTimeout(() => {
      document.getElementById('card-pack-inline-drawer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      document.getElementById(`cardpack-title-input-${newPack.id}`)?.focus();
      document.getElementById(`cardpack-title-input-${newPack.id}`)?.select();
    }, 100);
  },

  // ==========================================================
  // SALVAR E PUBLICAR PACOTE DE CARDS (LOCAL + GITHUB API)
  // ==========================================================
  async saveCardPackDetails(packId) {
    const pack = this.state.drafts.find(p => p.id === packId);
    if (!pack) return;

    const titleInput = document.getElementById(`cardpack-title-input-${packId}`);
    if (titleInput && titleInput.value.trim()) {
      pack.titulo = titleInput.value.trim();
    }

    CardPackStorage.saveCustomCardPacks(this.state.drafts);
    notice('Salvando pacote de cards...');

    // 1. Tenta API do servidor Python local
    let savedOnBackend = false;
    try {
      const res = await fetch('/api/card_packs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: pack })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          savedOnBackend = true;
          notice(data.message || 'Pacote de cards salvo no servidor local e repositório!', 'ok');
        }
      }
    } catch (e) {}

    // 2. Se offline, sincroniza direto via GitHub REST API
    if (!savedOnBackend) {
      if (window.GitHubSync && window.GitHubSync.isConfigured()) {
        notice('☁️ Salvando pacote de cards diretamente no GitHub...');
        try {
          await window.GitHubSync.saveDraftCardPacks(this.state.drafts);
          notice('✓ Pacote de cards salvo com sucesso no GitHub!', 'ok');
        } catch (ghErr) {
          notice(`Aviso: Salvo no navegador. Falha no GitHub (${ghErr.message})`, 'error');
        }
      } else {
        notice('✓ Pacote de cards salvo no navegador! (Para salvar no GitHub de qualquer PC, configure seu Token no topo)', 'ok');
      }
    }

    this.renderDraftsGrid();
  },

  async deleteCardPack(packId) {
    if (!confirm('Tem certeza que deseja excluir este pacote de cards?')) return;

    this.state.drafts = this.state.drafts.filter(p => p.id !== packId);
    if (this.state.expandedPackId === packId) {
      this.state.expandedPackId = null;
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
          this.state.expandedPackId = null;
          await this.loadCardPacks();
          return;
        }
      }
    } catch (err) {}

    // 2. Se a API local estiver offline, publica diretamente pelo GitHub REST API!
    if (window.GitHubSync && window.GitHubSync.isConfigured()) {
      try {
        const ghRes = await window.GitHubSync.publishOfficialCardPack(pack, (msg) => {
          notice(msg, '');
        });
        notice(ghRes.message, 'ok');
        this.state.expandedPackId = null;
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
  // PACOTES DE CARDS PUBLICADOS (PRODUÇÃO)
  // ==========================================================
  renderPublishedGrid() {
    const grid = document.getElementById('published-card-packs-grid');
    if (!grid) return;

    if (!this.state.published.length) {
      grid.innerHTML = `<div class="empty">Nenhum pacote de cards oficial publicado ainda.</div>`;
      this.renderExpandedPublishedPack();
      return;
    }

    grid.innerHTML = this.state.published.map((pack, idx) => {
      const isExpanded = this.state.expandedProductionId === pack.id;
      const count = (pack.cards || []).length;
      const packNumStr = `PACOTE ${String(idx + 1).padStart(2, '0')}`;

      return `
        <div class="pkg-collapsed-bar published-bar ${isExpanded ? 'is-active' : ''}" 
             onclick="CardPackManager.togglePublishedCardPack('${pack.id}')">
          <div class="pkg-bar-left">
            <span class="pkg-bar-num">🃏 ${packNumStr}</span>
            <span class="pkg-bar-title">${this.escapeHtml(pack.titulo || 'Sem título')}</span>
            <span class="pkg-bar-tag">${count} CARDS</span>
            <span class="pkg-badge published" style="margin: 0;">🟢 OFICIAL</span>
          </div>
          <div class="pkg-bar-right">
            <span class="pkg-arrow">${isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>
      `;
    }).join('');

    this.renderExpandedPublishedPack();
  },

  togglePublishedCardPack(packId) {
    if (this.state.expandedProductionId === packId) {
      this.state.expandedProductionId = null;
    } else {
      this.state.expandedProductionId = packId;
    }
    this.renderPublishedGrid();

    if (this.state.expandedProductionId) {
      setTimeout(() => {
        document.getElementById('published-card-pack-inline-drawer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  },

  renderExpandedPublishedPack() {
    const drawer = document.getElementById('published-card-pack-inline-drawer');
    if (!drawer) return;

    if (!this.state.expandedProductionId) {
      drawer.innerHTML = '';
      drawer.style.display = 'none';
      return;
    }

    const pack = this.state.published.find(p => p.id === this.state.expandedProductionId);
    if (!pack) {
      drawer.style.display = 'none';
      return;
    }

    drawer.style.display = 'block';
    const cards = pack.cards || [];

    drawer.innerHTML = `
      <div class="pkg-expanded-card published-card" style="border: 2px solid #10b981;">
        <div class="pkg-expanded-top">
          <div class="pkg-expanded-left">
            <div class="pkg-expanded-num" style="color: #065f46;">
              🃏 PACOTE OFICIAL ATIVO - ${this.escapeHtml(pack.titulo)}
            </div>
            <label class="pkg-expanded-label">Nome do Pacote Oficial</label>
            <input type="text" class="pkg-input-pill" value="${this.escapeHtml(pack.titulo)}" readonly style="background: #f1f5f9;">
          </div>
        </div>

        <div style="margin-top: 20px;">
          <h4 style="margin: 0 0 12px; font-size: 14px; font-weight: 800; color: #1e293b; text-transform: uppercase;">
            Cards Ativos no Catálogo Oficial (${cards.length})
          </h4>
          <div class="faixas-accordion-list">
            ${cards.map((c, idx) => this.renderCardAccordionItem(pack.id, c, idx, true)).join('')}
          </div>
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
