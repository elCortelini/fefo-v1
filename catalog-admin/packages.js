/**
 * packages.js - Gerenciador Unificado de Pacotes & Menus do FEFO Pet
 * Expansão inline (accordion), ferramenta de corte de áudio e edição de produção.
 */

const PkgManager = {
  state: {
    drafts: [],
    publishedMenus: [],
    expandedDraftId: null,
    expandedProductionTitle: null,
    loading: false
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
  },

  async loadPackages() {
    try {
      this.state.loading = true;
      const res = await fetch('/api/packages');
      if (res.ok) {
        const data = await res.json();
        this.state.drafts = data.drafts || [];
        this.state.publishedMenus = data.published_menus || [];
        this.render();
        return;
      }
    } catch (e) {
      // Normal no GitHub Pages estático
    }

    // Fallback estático
    try {
      const [draftsRes, catRes] = await Promise.all([
        fetch('../repository/draft_packages.json', { cache: 'no-store' }),
        fetch('../repository/catalog.json', { cache: 'no-store' })
      ]);
      if (draftsRes.ok) {
        const dData = await draftsRes.json();
        this.state.drafts = dData.packages || [];
      }
      if (catRes.ok) {
        const cData = await catRes.json();
        const audios = cData.audio || [];
        const menusDict = {};
        for (const a of audios) {
          const mName = (a.menu || 'Sem menu').trim();
          if (!menusDict[mName]) menusDict[mName] = { titulo: mName, count: 0, items: [] };
          menusDict[mName].count++;
          menusDict[mName].items.push({
            ...a,
            web_url: `../repository/audio/${a.arquivo.split('/').pop()}`
          });
        }
        this.state.publishedMenus = Object.values(menusDict);
      }
      this.render();
    } catch (err) {
      console.warn('Erro carregando arquivos do catálogo:', err);
    } finally {
      this.state.loading = false;
    }
  },

  render() {
    this.renderDraftsGrid();
    this.renderPublishedGrid();
  },

  // ==========================================================
  // SEÇÃO 1: PACOTES EM RASCUNHO (DRAFTS)
  // ==========================================================
  renderDraftsGrid() {
    const grid = document.getElementById('draft-packages-grid');
    if (!grid) return;

    if (!this.state.drafts.length) {
      grid.innerHTML = `
        <div class="empty" style="grid-column: 1/-1; padding: 28px 16px; background: #faf9ff; border-radius: 16px; border: 1px dashed var(--line);">
          <p style="font-size: 15px; font-weight: 800; color: var(--purple); margin: 0 0 6px;">Nenhum pacote em rascunho no momento.</p>
          <span style="color: var(--muted); font-size: 13px;">Clique em <strong>“＋ Criar Novo Pacote / Menu”</strong> para montar um novo menu (ex.: “Contos de Ninar”).</span>
        </div>
      `;
      this.renderDraftExpandedPanel();
      return;
    }

    grid.innerHTML = this.state.drafts.map(pkg => {
      const isExpanded = this.state.expandedDraftId === pkg.id;
      const itemsCount = (pkg.items || []).length;
      const targetCount = pkg.target_count || (itemsCount > 0 ? itemsCount : 10);
      const pct = Math.min(100, Math.round((itemsCount / targetCount) * 100));
      const isCompleted = itemsCount >= targetCount && targetCount > 0;

      const licLabels = (pkg.licencas || ['home']).map(l => {
        const map = { home: 'Home', clinical: 'Clínica', escola: 'Escola' };
        return map[l] || l;
      }).join(' · ');

      return `
        <article class="package-card is-draft ${isExpanded ? 'is-active' : ''}" 
                 onclick="PkgManager.toggleDraftPackage('${pkg.id}')">
          <span class="pkg-badge draft">🟡 Rascunho / Em Construção</span>
          <h3>${this.escapeHtml(pkg.titulo || 'Sem título')}</h3>
          <p>${this.escapeHtml(pkg.descricao || 'Pacote de conteúdos em elaboração para o menu do app e pet.')}</p>
          
          <div class="pkg-tags">
            <span class="pkg-tag">Menu: ${this.escapeHtml(pkg.titulo)}</span>
            <span class="pkg-tag">${licLabels}</span>
            ${pkg.is_premium ? '<span class="pkg-tag" style="background:#fff2d6;color:#996500;">★ Premium</span>' : ''}
          </div>

          <div class="progress-box">
            <div class="progress-labels">
              <span>Progresso das Faixas</span>
              <span><strong>${itemsCount}</strong> de ${targetCount} (${pct}%)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${isCompleted ? 'completed' : ''}" style="width: ${pct}%"></div>
            </div>
          </div>

          <button class="btn-manage" type="button">
            ${isExpanded ? '▲ Recolher Conteúdo' : `🎧 Gerenciar Áudios (${itemsCount})`}
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

    const pkg = this.state.drafts.find(p => p.id === this.state.expandedDraftId);
    if (!pkg) {
      drawer.style.display = 'none';
      return;
    }

    drawer.style.display = 'block';
    const items = pkg.items || [];

    drawer.innerHTML = `
      <div class="inline-expanded-panel">
        <div class="inline-panel-header">
          <h3>🟡 Editando Pacote / Menu: <em>${this.escapeHtml(pkg.titulo)}</em></h3>
          <button class="btn-collapse" type="button" onclick="PkgManager.toggleDraftPackage('${pkg.id}')">▲ Fechar / Recolher</button>
        </div>

        <div class="inline-panel-body">
          <!-- Metadados -->
          <div class="form-grid-2">
            <div class="field">
              <label>Nome do Menu / Título do Pacote *</label>
              <input id="draft-input-title" type="text" value="${this.escapeHtml(pkg.titulo || '')}" 
                     placeholder="Ex.: Contos de Ninar">
            </div>
            <div class="field">
              <label>Meta de Faixas Previstas</label>
              <input id="draft-input-target" type="number" min="1" max="100" value="${pkg.target_count || 10}">
            </div>
          </div>

          <div class="field">
            <label>Descrição do Conteúdo (Opcional)</label>
            <input id="draft-input-desc" type="text" value="${this.escapeHtml(pkg.descricao || '')}" 
                   placeholder="Ex.: Histórias relaxantes com trilha sonora para hora de dormir.">
          </div>

          <div style="display: flex; gap: 16px; flex-wrap: wrap; background: #faf9ff; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--line);">
            <span style="font-size: 12px; font-weight: 800; color: var(--muted); align-self: center;">Licenças:</span>
            <label class="check"><input id="draft-check-home" type="checkbox" ${(pkg.licencas||[]).includes('home')?'checked':''}> Home</label>
            <label class="check"><input id="draft-check-clinical" type="checkbox" ${(pkg.licencas||[]).includes('clinical')?'checked':''}> Clínica</label>
            <label class="check"><input id="draft-check-escola" type="checkbox" ${(pkg.licencas||[]).includes('escola')?'checked':''}> Escola</label>
            <label class="check" style="margin-left: auto; color: #b27800;"><input id="draft-check-premium" type="checkbox" ${pkg.is_premium?'checked':''}> ★ Premium</label>
          </div>

          <!-- Upload Dropzone -->
          <label class="pkg-dropzone" id="draft-dropzone">
            <input id="draft-file-upload" type="file" multiple accept=".wav,.mp3,.flac,.ogg,.m4a" style="display:none;" 
                   onchange="PkgManager.uploadAudiosToDraft('${pkg.id}', this.files)">
            <strong>＋ Adicionar Áudios a este Pacote</strong>
            <span>Arraste os arquivos de som (.wav, .mp3, etc.) aqui ou clique para selecionar</span>
          </label>

          <!-- Lista de Faixas -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h4 style="margin: 0; font-size: 16px; color: var(--ink);">Faixas Cadastradas (${items.length})</h4>
              <span class="hint" style="margin: 0;">Ouça, ajuste o título ou use a ferramenta de corte em cada áudio.</span>
            </div>

            <div class="pkg-items-list">
              ${items.length === 0 ? `
                <div style="text-align:center; padding: 20px; color: var(--muted); font-size: 13px; background: #faf9ff; border-radius: 12px;">
                  Nenhum áudio neste pacote ainda. Arraste arquivos na caixa acima.
                </div>
              ` : items.map((it, idx) => {
                const audioUrl = it.web_url || (it.arquivo_draft ? `/${it.arquivo_draft}` : '');
                return `
                  <div class="pkg-item-row" data-item-id="${it.id}">
                    <div class="pkg-item-number">${idx + 1}</div>
                    <div class="pkg-item-info">
                      <input type="text" class="pkg-item-title-input" value="${this.escapeHtml(it.titulo || '')}" 
                             placeholder="Título da faixa..." 
                             onchange="PkgManager.updateDraftItemTitle('${pkg.id}', '${it.id}', this.value)">
                      <span class="pkg-item-orig">Arquivo: ${this.escapeHtml(it.arquivo_origem || '')} (${this.formatBytes(it.tamanho)})</span>
                    </div>
                    <div class="pkg-item-player">
                      <audio controls preload="none" src="${this.escapeHtml(audioUrl)}"></audio>
                    </div>
                    <button type="button" class="btn-trim-audio" title="Abrir ferramenta de corte e fade"
                            onclick="PkgManager.trimDraftItem('${pkg.id}', '${it.id}', '${this.escapeHtml(audioUrl)}', '${this.escapeHtml(it.titulo)}')">
                      ✂ Cortar Áudio
                    </button>
                    <button type="button" class="pkg-item-delete" title="Remover faixa"
                            onclick="PkgManager.deleteDraftItem('${pkg.id}', '${it.id}')">
                      🗑
                    </button>
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

    // Configurar drag & drop no dropzone do rascunho
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

    pkg.titulo = document.getElementById('draft-input-title').value.trim() || 'Sem título';
    pkg.descricao = document.getElementById('draft-input-desc').value.trim();
    pkg.target_count = parseInt(document.getElementById('draft-input-target').value, 10) || 10;
    
    pkg.licencas = [];
    if (document.getElementById('draft-check-home').checked) pkg.licencas.push('home');
    if (document.getElementById('draft-check-clinical').checked) pkg.licencas.push('clinical');
    if (document.getElementById('draft-check-escola').checked) pkg.licencas.push('escola');
    pkg.is_premium = document.getElementById('draft-check-premium').checked;

    notice('Salvando rascunho do pacote...');
    try {
      const res = await fetch('/api/packages/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: pkg })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Erro ao salvar.');
      notice(data.message || 'Pacote salvo!', 'ok');
      this.renderDraftsGrid();
    } catch (e) {
      notice(`Erro ao salvar pacote: ${e.message}`, 'error');
    }
  },

  updateDraftItemTitle(pkgId, itemId, newTitle) {
    const pkg = this.state.drafts.find(p => p.id === pkgId);
    if (!pkg) return;
    const it = (pkg.items || []).find(x => x.id === itemId);
    if (it) it.titulo = newTitle.trim();
  },

  async uploadAudiosToDraft(pkgId, files) {
    if (!files || !files.length) return;
    const form = new FormData();
    form.append('package_id', pkgId);
    for (const f of files) form.append('file', f, f.name);

    notice(`Enviando ${files.length} arquivo(s) de áudio para o pacote...`);
    try {
      const res = await fetch('/api/packages/upload_audio', {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Falha no upload.');

      const idx = this.state.drafts.findIndex(p => p.id === pkgId);
      if (idx >= 0) this.state.drafts[idx] = data.package;

      this.renderDraftsGrid();
      notice(data.message || 'Áudios adicionados com sucesso!', 'ok');
    } catch (err) {
      notice(`Erro no upload: ${err.message}`, 'error');
    }
  },

  async deleteDraftItem(pkgId, itemId) {
    if (!confirm('Remover esta faixa do pacote?')) return;
    const pkg = this.state.drafts.find(p => p.id === pkgId);
    if (!pkg) return;

    pkg.items = (pkg.items || []).filter(x => x.id !== itemId);
    this.renderDraftExpandedPanel();

    try {
      await fetch('/api/packages/delete_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: pkgId, item_id: itemId })
      });
      notice('Faixa removida.', 'ok');
    } catch (e) {
      console.error(e);
    }
  },

  async deleteDraftPackage(pkgId) {
    const pkg = this.state.drafts.find(p => p.id === pkgId);
    if (!pkg) return;
    if (!confirm(`Tem certeza que deseja excluir o pacote “${pkg.titulo}” e todos os seus áudios em rascunho?`)) return;

    notice('Excluindo pacote...');
    try {
      const res = await fetch('/api/packages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pkgId })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);

      this.state.drafts = this.state.drafts.filter(p => p.id !== pkgId);
      this.state.expandedDraftId = null;
      this.renderDraftsGrid();
      notice('Pacote removido com sucesso.', 'ok');
    } catch (e) {
      notice(`Erro ao excluir: ${e.message}`, 'error');
    }
  },

  trimDraftItem(pkgId, itemId, audioUrl, title) {
    if (!window.openAudioTrimmer) {
      alert('Ferramenta de corte indisponível.');
      return;
    }
    window.openAudioTrimmer({
      url: audioUrl,
      title: title,
      onSave: async (blob, info) => {
        notice('Salvando áudio cortado no pacote...');
        const form = new FormData();
        form.append('tipo', 'draft');
        form.append('package_id', pkgId);
        form.append('item_id', itemId);
        form.append('file', blob, 'trimmed.wav');

        try {
          const res = await fetch('/api/packages/replace_audio', {
            method: 'POST',
            body: form
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.message);

          notice(data.message || 'Corte salvo com sucesso!', 'ok');
          await this.loadPackages();
        } catch (e) {
          notice(`Erro ao salvar corte: ${e.message}`, 'error');
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
  // SEÇÃO 2: MENUS OFICIAIS EM PRODUÇÃO (EDITÁVEIS)
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
        <article class="package-card is-published ${isExpanded ? 'is-active' : ''}" 
                 onclick="PkgManager.toggleProductionMenu('${this.escapeHtml(m.titulo)}')">
          <span class="pkg-badge published">🟢 Menu Oficial Ativo</span>
          <h3>${this.escapeHtml(m.titulo)}</h3>
          <p>Disponível na nuvem para os pets e apps conectados.</p>
          <div class="pkg-tags">
            <span class="pkg-tag">Menu do Sistema</span>
            <span class="pkg-tag">${m.count} áudios oficiais</span>
          </div>
          
          <button class="btn-manage" type="button">
            ${isExpanded ? '▲ Fechar Edição' : '✏️ EDITAR MENU'}
          </button>
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
          <button class="btn-collapse" type="button" onclick="PkgManager.toggleProductionMenu('${this.escapeHtml(menu.titulo)}')">▲ Fechar / Recolher</button>
        </div>

        <div class="inline-panel-body">
          <div class="field">
            <label>Nome deste Menu no Catálogo Oficial</label>
            <input id="prod-input-title" type="text" value="${this.escapeHtml(menu.titulo)}">
          </div>

          <!-- Dropzone para adicionar novos áudios ao menu oficial -->
          <label class="pkg-dropzone" id="prod-dropzone">
            <input id="prod-file-upload" type="file" multiple accept=".wav,.mp3,.flac,.ogg,.m4a" style="display:none;" 
                   onchange="PkgManager.uploadAudiosToProduction('${this.escapeHtml(menu.titulo)}', this.files)">
            <strong style="color: #27ae60;">＋ Adicionar Novos Áudios a este Menu Oficial</strong>
            <span>Arraste os arquivos aqui para converter e incluir diretamente neste menu em produção</span>
          </label>

          <!-- Lista de Faixas Oficiais -->
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
                const audioUrl = it.web_url || (it.arquivo ? `/repository/audio/${it.arquivo.split('/').pop()}` : '');
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

    // Dropzone drag & drop
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

  async saveProductionMenu(oldMenuTitle) {
    const newMenuTitle = document.getElementById('prod-input-title').value.trim() || oldMenuTitle;
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

    notice('Removendo áudio do catálogo oficial...');
    try {
      const res = await fetch('/api/production_menu/delete_audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);

      notice(data.message || 'Áudio removido do catálogo.', 'ok');
      await this.loadPackages();
    } catch (e) {
      notice(`Erro ao remover: ${e.message}`, 'error');
    }
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
