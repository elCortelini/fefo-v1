/**
 * cards-packs.js - Gerenciador Completo de:
 * 1. Pacotes de Cards (c0001.jpg + áudio vinculado)
 * 2. Pacotes de Rostinhos (com pasta destino configurável e edição do nome exibido no app)
 * 3. Pacotes de Sons do Sistema (com pasta destino configurável, corte de áudio, inclusão e exclusão)
 */

// ==========================================================
// 1. GERENCIADOR DE CARDS
// ==========================================================
const CardPackManager = {
  state: { drafts: [], published: [], expandedPackId: null, loading: false },

  async init() {
    this.bindEvents();
    await this.loadCardPacks();
  },

  bindEvents() {
    document.querySelectorAll('.main-tab-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.main-tab-pill').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.main-tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetEl = document.getElementById(btn.dataset.tab);
        if (targetEl) targetEl.classList.add('active');
      });
    });

    const btnNew = document.getElementById('btn-new-card-pack');
    if (btnNew) btnNew.addEventListener('click', () => this.createNewCardPack());
  },

  async loadCardPacks() {
    try {
      this.state.loading = true;
      const res = await fetch('/api/card_packs');
      if (res.ok) {
        const data = await res.json();
        this.state.drafts = data.drafts || [];
        this.state.published = data.published || [];
        this.render();
        return;
      }
    } catch (e) {}

    try {
      const res = await fetch('../repository/draft_card_packs.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        this.state.drafts = data.card_packs || [];
      }
      this.render();
    } catch (err) {
      console.warn('Erro ao carregar pacotes de cards:', err);
    } finally {
      this.state.loading = false;
    }
  },

  render() {
    this.renderDraftsGrid();
    this.renderPublishedGrid();
  },

  renderDraftsGrid() {
    const grid = document.getElementById('draft-card-packs-grid');
    if (!grid) return;

    if (!this.state.drafts.length) {
      grid.innerHTML = `
        <div class="empty" style="grid-column: 1/-1; padding: 28px 16px; background: #faf9ff; border-radius: 16px; border: 1px dashed var(--line);">
          <p style="font-size: 15px; font-weight: 800; color: var(--purple); margin: 0 0 6px;">Nenhum pacote de cards em rascunho.</p>
          <span style="color: var(--muted); font-size: 13px;">Clique em <strong>“＋ Criar Novo Pacote de Cards”</strong> para cadastrar miniaturas (c0001.jpg) com áudios vinculados.</span>
        </div>
      `;
      this.renderExpandedPack();
      return;
    }

    grid.innerHTML = this.state.drafts.map(pack => {
      const isExpanded = this.state.expandedPackId === pack.id;
      const cardsCount = (pack.cards || []).length;
      const targetCount = pack.target_count || (cardsCount > 0 ? cardsCount : 10);
      const pct = Math.min(100, Math.round((cardsCount / targetCount) * 100));

      return `
        <article class="package-card is-draft ${isExpanded ? 'is-active' : ''}" 
                 onclick="CardPackManager.toggleCardPack('${pack.id}')">
          <span class="pkg-badge draft">🟡 Rascunho de Cards</span>
          <h3>🃏 ${this.escapeHtml(pack.titulo || 'Sem título')}</h3>
          <p>${this.escapeHtml(pack.descricao || 'Pacote de miniaturas de cards e áudios vinculados.')}</p>
          
          <div class="pkg-tags">
            <span class="pkg-tag">${cardsCount} cards</span>
            <span class="pkg-tag">Nomenclatura: c0001, c0002...</span>
          </div>

          <div class="progress-box">
            <div class="progress-labels">
              <span>Cards Cadastrados</span>
              <span><strong>${cardsCount}</strong> de ${targetCount} (${pct}%)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${cardsCount>=targetCount?'completed':''}" style="width: ${pct}%"></div>
            </div>
          </div>

          <button class="btn-manage" type="button">
            ${isExpanded ? '▲ Recolher Cards' : `🃏 Gerenciar Cards (${cardsCount})`}
          </button>
        </article>
      `;
    }).join('');

    this.renderExpandedPack();
  },

  toggleCardPack(packId) {
    if (this.state.expandedPackId === packId) this.state.expandedPackId = null;
    else this.state.expandedPackId = packId;
    this.renderDraftsGrid();
    if (this.state.expandedPackId) {
      setTimeout(() => {
        document.getElementById('card-pack-inline-drawer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  },

  renderExpandedPack() {
    const drawer = document.getElementById('card-pack-inline-drawer');
    if (!drawer) return;

    if (!this.state.expandedPackId) {
      drawer.innerHTML = '';
      drawer.style.display = 'none';
      return;
    }

    const pack = this.state.drafts.find(p => p.id === this.state.expandedPackId);
    if (!pack) { drawer.style.display = 'none'; return; }

    drawer.style.display = 'block';
    const cards = pack.cards || [];

    drawer.innerHTML = `
      <div class="inline-expanded-panel">
        <div class="inline-panel-header">
          <h3>🃏 Editando Pacote de Cards: <em>${this.escapeHtml(pack.titulo)}</em></h3>
          <button class="btn-collapse" type="button" onclick="CardPackManager.toggleCardPack('${pack.id}')">▲ Fechar / Recolher</button>
        </div>

        <div class="inline-panel-body">
          <div class="form-grid-2">
            <div class="field">
              <label>Nome do Pacote de Cards *</label>
              <input id="cardpack-input-title" type="text" value="${this.escapeHtml(pack.titulo || '')}">
            </div>
            <div class="field">
              <label>Meta de Cards Previstos</label>
              <input id="cardpack-input-target" type="number" min="1" max="100" value="${pack.target_count || 10}">
            </div>
          </div>

          <div class="field">
            <label>Descrição do Pacote</label>
            <input id="cardpack-input-desc" type="text" value="${this.escapeHtml(pack.descricao || '')}">
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--line); padding-top: 16px;">
            <div>
              <h4 style="margin: 0; font-size: 17px; color: var(--ink);">Cards deste Pacote (${cards.length})</h4>
              <span class="hint" style="margin: 0;">Miniatura (c0001.jpg), áudio vinculado e código de ação.</span>
            </div>
            <button class="btn primary" type="button" style="font-size: 13px; padding: 10px 18px;" 
                    onclick="CardPackManager.addNewCardItem('${pack.id}')">
              ＋ Adicionar Novo Card
            </button>
          </div>

          <div class="cards-interactive-grid">
            ${cards.length === 0 ? `
              <div style="grid-column: 1/-1; text-align: center; padding: 24px; color: var(--muted); background: #faf9ff; border-radius: 14px;">
                Nenhum card cadastrado. Clique no botão acima para adicionar.
              </div>
            ` : cards.map((c, idx) => {
              const miniCardSrc = c.mini_card_img || '';
              const audioUrl = c.audio_url || '';
              const cCode = c.codigo || c.id || `c${String(idx+1).padStart(4,'0')}`;

              return `
                <div class="card-item-box" data-card-id="${c.id}">
                  <button type="button" class="card-delete-corner" title="Excluir este card" 
                          onclick="CardPackManager.deleteCardItem('${pack.id}', '${c.id}')">✕</button>

                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; font-weight: 900; color: var(--purple);">Card #${idx + 1}</span>
                    <span class="pill" style="font-size: 11px; padding: 3px 8px;">${cCode}.jpg</span>
                  </div>

                  <div style="display: flex; gap: 12px; align-items: center; background: #faf9ff; padding: 10px; border-radius: 12px; border: 1px solid var(--line);">
                    <div class="visual-preview" style="width: 80px; height: 80px; flex-shrink: 0;">
                      ${miniCardSrc ? `<img src="${this.escapeHtml(miniCardSrc)}" alt="Miniatura ${cCode}">` : '<span style="font-size:10px;text-align:center;">Sem miniatura</span>'}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
                      <label style="font-size: 11px; font-weight: 800; color: var(--muted);">Miniatura do Card</label>
                      <label class="btn-upload-slot" style="text-align: center; cursor: pointer;">
                        📷 Enviar Miniatura
                        <input type="file" accept="image/*" style="display:none;" 
                               onchange="CardPackManager.uploadCardAsset('${pack.id}', '${c.id}', this.files[0], null)">
                      </label>
                    </div>
                  </div>

                  <div class="card-item-meta">
                    <div class="field">
                      <label style="font-size: 11px;">Título / Nome do Card</label>
                      <input type="text" value="${this.escapeHtml(c.titulo || '')}" 
                             onchange="CardPackManager.updateCardTitle('${pack.id}', '${c.id}', this.value)">
                    </div>
                    <div class="field">
                      <label style="font-size: 11px;">Código / Trigger do Card</label>
                      <input type="text" value="${this.escapeHtml(c.codigo_acao || cCode)}" 
                             onchange="CardPackManager.updateCardAction('${pack.id}', '${c.id}', this.value)">
                    </div>
                  </div>

                  <div>
                    <label style="font-size: 11px; font-weight: 800; color: var(--muted); display: block; margin-bottom: 4px;">Áudio Vinculado</label>
                    <div class="card-item-audio-row">
                      ${audioUrl ? `<audio controls preload="none" src="${this.escapeHtml(audioUrl)}"></audio>` : '<span style="font-size:12px;color:var(--muted);flex:1;">Nenhum som</span>'}
                      ${audioUrl ? `
                        <button type="button" class="btn-trim-audio" title="Cortar áudio"
                                onclick="CardPackManager.trimCardAudio('${pack.id}', '${c.id}', '${this.escapeHtml(audioUrl)}', '${this.escapeHtml(c.titulo)}')">
                          ✂ Cortar
                        </button>
                      ` : ''}
                      <label class="btn-upload-slot" style="white-space:nowrap; cursor:pointer;">
                        ＋ Áudio
                        <input type="file" accept=".wav,.mp3,.flac,.ogg,.m4a" style="display:none;" 
                               onchange="CardPackManager.uploadCardAsset('${pack.id}', '${c.id}', null, this.files[0])">
                      </label>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="inline-panel-footer">
          <div style="display: flex; gap: 8px;">
            <button class="remove-btn" type="button" onclick="CardPackManager.deleteCardPack('${pack.id}')">🗑 Excluir Pacote</button>
            <button class="btn secondary" type="button" onclick="CardPackManager.saveCardPackDetails('${pack.id}')">💾 Salvar Rascunho</button>
          </div>
          <button class="btn-publish-pkg" type="button" onclick="CardPackManager.publishCardPackOfficial('${pack.id}')">
            🚀 Publicar Pacote de Cards Oficial
          </button>
        </div>
      </div>
    `;
  },

  renderPublishedGrid() {
    const grid = document.getElementById('published-card-packs-grid');
    if (!grid) return;
    if (!this.state.published.length) {
      grid.innerHTML = `<div class="empty">Nenhum pacote de cards oficial publicado ainda.</div>`;
      return;
    }
    grid.innerHTML = this.state.published.map(pack => {
      const cardsCount = (pack.cards || []).length;
      return `
        <article class="package-card is-published">
          <span class="pkg-badge published">🟢 Pacote Oficial Ativo</span>
          <h3>🃏 ${this.escapeHtml(pack.titulo)}</h3>
          <p>${this.escapeHtml(pack.descricao || 'Cards disponíveis para o pet.')}</p>
          <div class="pkg-tags">
            <span class="pkg-tag">${cardsCount} cards cadastrados</span>
          </div>
        </article>
      `;
    }).join('');
  },

  createNewCardPack() {
    const newPack = {
      id: `pack_cards_${Date.now() % 1000000}`,
      titulo: 'Novo Pacote de Cards',
      descricao: 'Miniaturas e áudios vinculados para leitura.',
      target_count: 10,
      categoria: 'Cards',
      licencas: ['home', 'clinical', 'escola'],
      is_premium: false,
      status: 'draft',
      cards: []
    };
    this.state.drafts.unshift(newPack);
    this.state.expandedPackId = newPack.id;
    this.renderDraftsGrid();
    setTimeout(() => {
      document.getElementById('card-pack-inline-drawer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      document.getElementById('cardpack-input-title')?.focus();
    }, 100);
  },

  addNewCardItem(packId) {
    const pack = this.state.drafts.find(p => p.id === packId);
    if (!pack) return;
    const cards = pack.cards || (pack.cards = []);
    const cIdx = cards.length + 1;
    const cNum = `c${String(cIdx).padStart(4, '0')}`;
    cards.push({
      id: cNum, codigo: cNum,
      titulo: `Card ${cIdx}`, codigo_acao: cNum,
      mini_card_img: '', audio_url: ''
    });
    this.renderExpandedPack();
  },

  updateCardTitle(packId, cardId, value) {
    const pack = this.state.drafts.find(p => p.id === packId);
    const card = pack && (pack.cards || []).find(c => c.id === cardId);
    if (card) card.titulo = value.trim();
  },

  updateCardAction(packId, cardId, value) {
    const pack = this.state.drafts.find(p => p.id === packId);
    const card = pack && (pack.cards || []).find(c => c.id === cardId);
    if (card) card.codigo_acao = value.trim();
  },

  async deleteCardItem(packId, cardId) {
    if (!confirm('Excluir este card do pacote?')) return;
    const pack = this.state.drafts.find(p => p.id === packId);
    if (!pack) return;
    pack.cards = (pack.cards || []).filter(c => c.id !== cardId);
    this.renderExpandedPack();
    try {
      await fetch('/api/card_packs/delete_card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId, card_id: cardId })
      });
      notice('Card excluído.', 'ok');
    } catch (e) {}
  },

  async uploadCardAsset(packId, cardId, imgFile, audioFile) {
    const form = new FormData();
    form.append('pack_id', packId);
    form.append('card_id', cardId);
    const pack = this.state.drafts.find(p => p.id === packId);
    const card = pack && (pack.cards || []).find(c => c.id === cardId);
    if (card) {
      form.append('titulo', card.titulo || '');
      form.append('codigo_acao', card.codigo_acao || '');
    }
    if (imgFile) form.append('image_file', imgFile, imgFile.name);
    if (audioFile) form.append('audio_file', audioFile, audioFile.name);

    notice('Atualizando arquivos do card...');
    try {
      const res = await fetch('/api/card_packs/upload_card', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      if (pack && data.card) {
        const cIdx = (pack.cards || []).findIndex(c => c.id === cardId);
        if (cIdx >= 0) pack.cards[cIdx] = data.card;
      }
      notice(data.message || 'Card atualizado com sucesso!', 'ok');
      this.renderExpandedPack();
    } catch (err) {
      notice(`Erro ao atualizar card: ${err.message}`, 'error');
    }
  },

  trimCardAudio(packId, cardId, audioUrl, title) {
    if (!window.openAudioTrimmer) return alert('Ferramenta de corte indisponível.');
    window.openAudioTrimmer({
      url: audioUrl, title: title,
      onSave: async (blob) => {
        notice('Salvando corte do áudio do card...');
        await CardPackManager.uploadCardAsset(packId, cardId, null, new File([blob], 'card_cut.wav', { type: 'audio/wav' }));
      }
    });
  },

  async saveCardPackDetails(packId) {
    const pack = this.state.drafts.find(p => p.id === packId);
    if (!pack) return;
    pack.titulo = document.getElementById('cardpack-input-title').value.trim() || 'Sem título';
    pack.descricao = document.getElementById('cardpack-input-desc').value.trim();
    pack.target_count = parseInt(document.getElementById('cardpack-input-target').value, 10) || 10;
    notice('Salvando rascunho do pacote de cards...');
    try {
      const res = await fetch('/api/card_packs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: pack })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      notice(data.message || 'Pacote de cards salvo!', 'ok');
      this.renderDraftsGrid();
    } catch (e) { notice(`Erro: ${e.message}`, 'error'); }
  },

  async deleteCardPack(packId) {
    if (!confirm('Excluir este pacote de cards?')) return;
    try {
      const res = await fetch('/api/card_packs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: packId })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      this.state.drafts = this.state.drafts.filter(p => p.id !== packId);
      this.state.expandedPackId = null;
      this.renderDraftsGrid();
      notice('Pacote de cards excluído.', 'ok');
    } catch (e) { notice(`Erro: ${e.message}`, 'error'); }
  },

  async publishCardPackOfficial(packId) {
    const pack = this.state.drafts.find(p => p.id === packId);
    if (!pack) return;
    const count = (pack.cards || []).length;
    if (count === 0) return notice('Adicione pelo menos um card antes de publicar.', 'error');
    if (!confirm(`Publicar o pacote “${pack.titulo}” com ${count} card(s) no catálogo oficial?`)) return;

    notice('Publicando pacote de cards oficial...', '');
    try {
      const res = await fetch('/api/card_packs/publish_official', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      notice(data.message || 'Pacote de cards publicado!', 'ok');
      await this.loadCardPacks();
    } catch (e) { notice(`Erro na publicação: ${e.message}`, 'error'); }
  },

  escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};

// ==========================================================
// 2. GERENCIADOR DE ROSTINHOS (FACES)
// Com pasta destino configurável e edição do nome exibido no app
// ==========================================================
const FacesManager = {
  state: {
    faces: [],
    pastaDestino: '/usr/f/'
  },

  async init() {
    this.bindEvents();
    await this.loadFaces();
  },

  bindEvents() {
    const folderInput = document.getElementById('faces-folder-path');
    if (folderInput) {
      folderInput.value = this.state.pastaDestino;
      folderInput.addEventListener('change', (e) => {
        this.state.pastaDestino = e.target.value.trim() || '/usr/f/';
        notice(`Pasta destino de rostinhos alterada para: ${this.state.pastaDestino}`, 'ok');
      });
    }

    const inputUpload = document.getElementById('face-file-upload');
    if (inputUpload) {
      inputUpload.addEventListener('change', (e) => {
        if (e.target.files.length) {
          this.uploadFace(e.target.files[0]);
          e.target.value = '';
        }
      });
    }
  },

  async loadFaces() {
    const container = document.getElementById('faces-list-grid');
    if (!container) return;
    try {
      const res = await fetch('/api/face_packs');
      if (!res.ok) throw new Error();
      const data = await res.json();
      this.state.faces = data.published_faces || [];
      document.getElementById('faces-tab-count').textContent = `${this.state.faces.length} rostinhos`;

      if (!this.state.faces.length) {
        container.innerHTML = `<div class="empty">Nenhum rostinho cadastrado no catálogo.</div>`;
        return;
      }

      container.innerHTML = this.state.faces.map(f => `
        <div class="card-item-box" style="position: relative;" data-face-id="${f.id}">
          <button type="button" class="card-delete-corner" title="Excluir rostinho do catálogo" 
                  onclick="FacesManager.deleteFace('${f.id}', '${this.escapeHtml(f.titulo)}')">✕</button>

          <div style="display: flex; gap: 14px; align-items: center;">
            <div style="width: 120px; height: 80px; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); background: #000; flex-shrink: 0;">
              <img src="${f.preview_url}" style="width:100%; height:100%; object-fit: cover;" alt="${this.escapeHtml(f.titulo)}">
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
              <div>
                <label style="font-size: 11px; font-weight: 800; color: var(--purple);">Nome Exibido no App (Título)</label>
                <input type="text" class="pkg-item-title-input" value="${this.escapeHtml(f.titulo)}" 
                       placeholder="Nome que a criança/pais verão no app..." 
                       onchange="FacesManager.updateFaceTitle('${f.id}', this.value)">
              </div>
              <div style="font-size: 11px; color: var(--muted);">
                Nome real do arquivo: <code>${f.arquivo_real || f.arquivo}</code> · Pasta: <code>${f.pasta || '/usr/f/'}</code>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = `<div class="empty">Não foi possível carregar os rostinhos.</div>`;
    }
  },

  async uploadFace(file) {
    const titulo = prompt('Nome ou emoção exibida no app para este rostinho (ex.: Sorriso Feliz, Piscando, Sono):', 'Novo Rostinho');
    if (!titulo) return;

    const pasta = document.getElementById('faces-folder-path')?.value.trim() || this.state.pastaDestino;
    const form = new FormData();
    form.append('titulo', titulo);
    form.append('pasta_destino', pasta);
    form.append('file', file, file.name);

    notice(`Convertendo imagem para 480x320 RGB565 RAW em ${pasta}...`);
    try {
      const res = await fetch('/api/face_packs/upload_face', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      notice(data.message || 'Rostinho cadastrado com sucesso!', 'ok');
      await this.loadFaces();
    } catch (err) {
      notice(`Erro ao cadastrar rostinho: ${err.message}`, 'error');
    }
  },

  async updateFaceTitle(faceId, newTitle) {
    if (!newTitle.trim()) return;
    notice('Atualizando nome exibido no app...');
    try {
      const res = await fetch('/api/face_packs/update_title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ face_id: faceId, titulo: newTitle.trim() })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      notice(data.message || 'Nome atualizado!', 'ok');
    } catch (e) {
      notice(`Erro ao atualizar nome: ${e.message}`, 'error');
    }
  },

  async deleteFace(faceId, faceTitle) {
    if (!confirm(`Excluir definitivamente o rostinho “${faceTitle}” (${faceId}) do catálogo?`)) return;
    notice('Removendo rostinho...');
    try {
      const res = await fetch('/api/face_packs/delete_face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ face_id: faceId })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      notice(data.message || 'Rostinho excluído.', 'ok');
      await this.loadFaces();
    } catch (e) {
      notice(`Erro ao excluir: ${e.message}`, 'error');
    }
  },

  escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};

// ==========================================================
// 3. GERENCIADOR DE SONS DO SISTEMA
// Com pasta destino configurável, corte visual, edição e exclusão
// ==========================================================
const SystemSoundsManager = {
  state: {
    sounds: [],
    pastaDestino: '/sys/a/'
  },

  async init() {
    this.bindEvents();
    await this.loadSounds();
  },

  bindEvents() {
    const folderInput = document.getElementById('system-folder-path');
    if (folderInput) {
      folderInput.value = this.state.pastaDestino;
      folderInput.addEventListener('change', (e) => {
        this.state.pastaDestino = e.target.value.trim() || '/sys/a/';
        notice(`Pasta destino de sons alterada para: ${this.state.pastaDestino}`, 'ok');
      });
    }

    const inputUpload = document.getElementById('system-file-upload');
    if (inputUpload) {
      inputUpload.addEventListener('change', (e) => {
        if (e.target.files.length) {
          this.uploadSound(e.target.files[0]);
          e.target.value = '';
        }
      });
    }
  },

  async loadSounds() {
    const container = document.getElementById('system-sounds-grid');
    if (!container) return;
    try {
      const res = await fetch('/api/system_packs');
      if (!res.ok) throw new Error();
      const data = await res.json();
      this.state.sounds = data.active_sounds || [];
      document.getElementById('system-tab-count').textContent = `${this.state.sounds.length} sons`;

      if (!this.state.sounds.length) {
        container.innerHTML = `<div class="empty">Nenhum som operacional cadastrado em /sys/a/.</div>`;
        return;
      }

      container.innerHTML = this.state.sounds.map(s => `
        <div class="pkg-item-row" style="grid-template-columns: 1fr 200px auto auto;" data-sound-file="${s.arquivo}">
          <div>
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
              <input type="text" value="${this.escapeHtml(s.titulo)}" 
                     placeholder="Título do som"
                     style="font-size: 14px; font-weight: 800; color: var(--ink); padding: 5px 10px; border-radius: 6px; border: 1px solid var(--line); width: 220px;"
                     onchange="SystemSoundsManager.updateSoundMeta('${s.arquivo}', this.value, '${this.escapeHtml(s.evento)}')">
              <span class="pill" style="font-size: 11px;">Evento:</span>
              <input type="text" value="${this.escapeHtml(s.evento)}" 
                     placeholder="evento_id"
                     style="font-size: 12px; font-family: monospace; padding: 5px 8px; border-radius: 6px; border: 1px solid var(--line); width: 140px;"
                     onchange="SystemSoundsManager.updateSoundMeta('${s.arquivo}', '${this.escapeHtml(s.titulo)}', this.value)">
            </div>
            <div style="font-size: 11px; color: var(--muted);">
              Arquivo: <code>${s.arquivo}</code> · Pasta: <code>${s.pasta}</code>
            </div>
          </div>

          <div class="pkg-item-player">
            <audio controls preload="none" src="${s.web_url}"></audio>
          </div>

          <button type="button" class="btn-trim-audio" title="Cortar e aparar som de sistema"
                  onclick="SystemSoundsManager.trimSystemSound('${s.arquivo}', '${s.web_url}', '${this.escapeHtml(s.titulo)}')">
            ✂ Cortar Som
          </button>

          <button type="button" class="pkg-item-delete" title="Excluir este som"
                  onclick="SystemSoundsManager.deleteSound('${s.arquivo}', '${s.pasta}')">
            🗑
          </button>
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = `<div class="empty">Não foi possível carregar os sons de sistema.</div>`;
    }
  },

  async updateSoundMeta(arquivo, novoTitulo, novoEvento) {
    notice('Atualizando informações do som...');
    try {
      const res = await fetch('/api/system_packs/update_sound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arquivo: arquivo, titulo: novoTitulo, evento: novoEvento })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      notice(data.message || 'Som atualizado com sucesso!', 'ok');
    } catch (e) {
      notice(`Erro ao atualizar: ${e.message}`, 'error');
    }
  },

  async uploadSound(file) {
    const rawName = file.name.replace(/\.[^.]+$/, '').toLowerCase();
    const evento = prompt('Evento / Função do som (ex.: alarme_disparo, bateria_fraca, clique_botao, panico):', rawName);
    if (!evento) return;

    const defaultTitle = evento.replace(/_/g, ' ');
    const titulo = prompt('Título / Descrição do som:', defaultTitle);
    const pasta = document.getElementById('system-folder-path')?.value.trim() || this.state.pastaDestino;

    const form = new FormData();
    form.append('evento', evento);
    form.append('titulo', titulo || evento);
    form.append('pasta_destino', pasta);
    form.append('file', file, file.name);

    notice(`Convertendo e salvando som de sistema em ${pasta}...`);
    try {
      const res = await fetch('/api/system_packs/upload_sound', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      notice(data.message || 'Som de sistema adicionado com sucesso!', 'ok');
      await this.loadSounds();
    } catch (err) {
      notice(`Erro ao cadastrar som: ${err.message}`, 'error');
    }
  },

  trimSystemSound(arquivo, audioUrl, title) {
    if (!window.openAudioTrimmer) return alert('Ferramenta de corte indisponível.');
    const pasta = document.getElementById('system-folder-path')?.value.trim() || this.state.pastaDestino;

    window.openAudioTrimmer({
      url: audioUrl, title: title,
      onSave: async (blob) => {
        notice(`Salvando trecho cortado no som de sistema ${arquivo}...`);
        const form = new FormData();
        form.append('arquivo', arquivo);
        form.append('pasta_destino', pasta);
        form.append('file', blob, arquivo);

        try {
          const res = await fetch('/api/system_packs/replace_audio', { method: 'POST', body: form });
          const data = await res.json();
          if (!data.ok) throw new Error(data.message);
          notice(data.message || 'Corte salvo com sucesso!', 'ok');
          await SystemSoundsManager.loadSounds();
        } catch (e) {
          notice(`Erro ao salvar corte: ${e.message}`, 'error');
        }
      }
    });
  },

  async deleteSound(arquivo, pasta) {
    if (!confirm(`Excluir definitivamente o som de sistema “${arquivo}”?`)) return;
    notice('Removendo som...');
    try {
      const res = await fetch('/api/system_packs/delete_sound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arquivo: arquivo, pasta_destino: pasta || '/sys/a/' })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      notice(data.message || 'Som removido.', 'ok');
      await this.loadSounds();
    } catch (e) {
      notice(`Erro ao remover: ${e.message}`, 'error');
    }
  },

  escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};

window.CardPackManager = CardPackManager;
window.FacesManager = FacesManager;
window.SystemSoundsManager = SystemSoundsManager;

document.addEventListener('DOMContentLoaded', () => {
  CardPackManager.init();
  FacesManager.init();
  SystemSoundsManager.init();
});
