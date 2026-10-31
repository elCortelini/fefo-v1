/**
 * github-sync.js - Sincronização Direta com GitHub REST API para o FEFO Pet
 * 
 * Permite que o FEFO Catalog Admin funcione em qualquer computador ou dispositivo:
 * 1. Sem precisar rodar o servidor Python local.
 * 2. Salvando rascunhos diretamente em repository/draft_packages.json via GitHub API.
 * 3. Publicando novos menus e faixas oficiais diretamente em repository/catalog.json e repository/audio/.
 * 4. Fazendo upload automático dos áudios convertidos/recortados.
 */

const GitHubSync = {
  storageKeys: {
    token: 'fefo_gh_token',
    repo: 'fefo_gh_repo',
    branch: 'fefo_gh_branch'
  },

  defaultRepo: 'elCortelini/fefo-v1',
  defaultBranch: 'main',

  getToken() {
    return (localStorage.getItem(this.storageKeys.token) || '').trim();
  },

  setToken(token) {
    if (token && token.trim()) {
      localStorage.setItem(this.storageKeys.token, token.trim());
    } else {
      localStorage.removeItem(this.storageKeys.token);
    }
    this.updateStatusBadge();
  },

  getRepo() {
    return (localStorage.getItem(this.storageKeys.repo) || this.defaultRepo).trim();
  },

  setRepo(repo) {
    localStorage.setItem(this.storageKeys.repo, (repo || this.defaultRepo).trim());
  },

  getBranch() {
    return (localStorage.getItem(this.storageKeys.branch) || this.defaultBranch).trim();
  },

  setBranch(branch) {
    localStorage.setItem(this.storageKeys.branch, (branch || this.defaultBranch).trim());
  },

  isConfigured() {
    return Boolean(this.getToken());
  },

  // Utilitários de codificação Base64 e Hash SHA-256
  utf8ToBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  },

  base64ToUtf8(str) {
    const cleanStr = str.replace(/\s/g, '');
    const binary = atob(cleanStr);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  },

  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  async calculateSha256(arrayBuffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Chamadas à API REST do GitHub
  getHeaders() {
    const token = this.getToken();
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async testConnection() {
    const token = this.getToken();
    const repo = this.getRepo();
    if (!token) return { ok: false, message: 'Nenhum token do GitHub configurado.' };

    try {
      const res = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) {
        if (res.status === 401) return { ok: false, message: 'Token inválido ou expirado.' };
        if (res.status === 404) return { ok: false, message: `Repositório “${repo}” não encontrado ou token sem acesso.` };
        return { ok: false, message: `Erro HTTP ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return {
        ok: true,
        repo: data.full_name,
        permissions: data.permissions || {},
        message: `Conectado com sucesso a ${data.full_name}! (Branch: ${this.getBranch()})`
      };
    } catch (e) {
      return { ok: false, message: `Erro ao conectar: ${e.message}` };
    }
  },

  async getFile(filePath) {
    const repo = this.getRepo();
    const branch = this.getBranch();
    const url = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`;

    try {
      const res = await fetch(url, { headers: this.getHeaders(), cache: 'no-store' });
      if (res.status === 404) return { exists: false, sha: null, content: null };
      if (!res.ok) throw new Error(`Falha ao obter ${filePath}: HTTP ${res.status}`);
      const data = await res.json();
      const utf8Content = this.base64ToUtf8(data.content);
      return { exists: true, sha: data.sha, content: utf8Content, raw: data };
    } catch (e) {
      console.warn(`[GitHubSync] getFile erro em ${filePath}:`, e);
      throw e;
    }
  },

  async commitFile(filePath, content, message, isBase64 = false) {
    const repo = this.getRepo();
    const branch = this.getBranch();
    const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;

    // Obtém o sha atual se o arquivo já existir
    let sha = null;
    try {
      const existing = await this.getFile(filePath);
      if (existing.exists) {
        sha = existing.sha;
      }
    } catch (e) {}

    const payload = {
      message: message || `Atualização de ${filePath} via FEFO Admin Web`,
      content: isBase64 ? content : this.utf8ToBase64(content),
      branch: branch
    };
    if (sha) {
      payload.sha = sha;
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`Erro ao enviar ${filePath} para o GitHub (HTTP ${res.status}): ${errData.message || res.statusText}`);
    }

    return await res.json();
  },

  // ==========================================================
  // OPERAÇÕES DO CATÁLOGO DE CONTEÚDO
  // ==========================================================

  /**
   * Salva a lista completa de rascunhos diretamente no GitHub
   */
  async saveDraftPackages(draftsList) {
    if (!this.isConfigured()) throw new Error('Token do GitHub não configurado.');

    const filePath = 'repository/draft_packages.json';
    let fileObj = {
      schema: 1,
      description: "FEFO Content Draft Packages - Grade Completa Pedagógica Unificada com Áudios Vinculados",
      updated_at: new Date().toISOString(),
      packages: draftsList
    };

    const jsonStr = JSON.stringify(fileObj, null, 2) + '\n';
    return await this.commitFile(
      filePath,
      jsonStr,
      `chore(catalog): salvar ${draftsList.length} pacote(s) em rascunho via Web Admin`
    );
  },

  /**
   * Salva um pacote de rascunho específico no arquivo do GitHub
   */
  async saveSingleDraftPackage(pkg) {
    if (!this.isConfigured()) throw new Error('Token do GitHub não configurado.');

    const filePath = 'repository/draft_packages.json';
    let currentDrafts = { packages: [] };
    try {
      const cur = await this.getFile(filePath);
      if (cur.exists && cur.content) {
        currentDrafts = JSON.parse(cur.content);
      }
    } catch (e) {}

    currentDrafts.packages = currentDrafts.packages || [];
    const idx = currentDrafts.packages.findIndex(p => p.id === pkg.id);
    if (idx >= 0) {
      currentDrafts.packages[idx] = pkg;
    } else {
      currentDrafts.packages.unshift(pkg);
    }
    currentDrafts.updated_at = new Date().toISOString();

    const jsonStr = JSON.stringify(currentDrafts, null, 2) + '\n';
    return await this.commitFile(
      filePath,
      jsonStr,
      `feat(drafts): atualizar rascunho “${pkg.titulo}” via Web Admin`
    );
  },

  /**
   * Publica um pacote como Menu Oficial no GitHub:
   * 1. Sobe qualquer áudio novo/recortado para repository/audio/{arquivo_fefo}
   * 2. Atualiza repository/catalog.json (adiciona itens, incrementa versão, atualiza timestamp)
   * 3. Atualiza repository/draft_packages.json (marca como publicado)
   */
  async publishOfficialMenu(pkg, onProgress = () => {}) {
    if (!this.isConfigured()) throw new Error('Token do GitHub não configurado.');

    const items = pkg.items || [];
    if (items.length === 0) throw new Error('O pacote não contém faixas de áudio para publicar.');

    onProgress(`Lendo catálogo oficial do GitHub...`);
    const catFile = await this.getFile('repository/catalog.json');
    if (!catFile.exists || !catFile.content) {
      throw new Error('Não foi possível ler o repository/catalog.json no GitHub.');
    }

    let catalog = JSON.parse(catFile.content);
    catalog.audio = catalog.audio || [];

    // Descobre o próximo ID auXXX e próximo índice aXXXX.wav se necessário
    let maxIdx = 0;
    catalog.audio.forEach(a => {
      const match = (a.arquivo || '').match(/a(\d{4})\.wav/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxIdx) maxIdx = n;
      }
    });

    const repo = this.getRepo();
    const branch = this.getBranch();

    // 1. Processa cada faixa e faz upload do áudio se houver blob no IndexedDB
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      onProgress(`Processando áudio ${i + 1}/${items.length}: “${item.titulo}”...`);

      // Garante nome do arquivo fefo padrão aXXXX.wav
      if (!item.arquivo_fefo || !item.arquivo_fefo.endsWith('.wav')) {
        maxIdx++;
        item.arquivo_fefo = `a${String(maxIdx).padStart(4, '0')}.wav`;
      }

      // Verifica se temos o áudio no banco de dados local (IndexedDB)
      let audioBlob = null;
      if (window.AudioBlobDB) {
        audioBlob = await window.AudioBlobDB.getAudio(item.id);
      }

      let audioBytes = null;
      let checksum = '';
      let fileSize = item.tamanho || 0;

      if (audioBlob) {
        audioBytes = await audioBlob.arrayBuffer();
        fileSize = audioBytes.byteLength;
        checksum = await this.calculateSha256(audioBytes);
        const base64Audio = this.arrayBufferToBase64(audioBytes);

        onProgress(`Enviando áudio “${item.arquivo_fefo}” (${Math.round(fileSize / 1024)} KB) para o GitHub...`);
        await this.commitFile(
          `repository/audio/${item.arquivo_fefo}`,
          base64Audio,
          `feat(audio): upload faixa ${item.arquivo_fefo} (“${item.titulo}”) via Web Admin`,
          true
        );
      } else {
        // Se já está no repositório, mantemos o checksum anterior ou geramos placeholder
        checksum = item.checksum || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      }

      // Adiciona ou atualiza no array catalog.audio
      const destUrl = `https://raw.githubusercontent.com/${repo}/${branch}/repository/audio/${item.arquivo_fefo}`;
      const existingAudioIdx = catalog.audio.findIndex(x => x.arquivo === `/usr/a/${item.arquivo_fefo}`);

      const catalogEntry = {
        id: item.codigo_item || `au${String(catalog.audio.length + 1).padStart(3, '0')}`,
        titulo: item.titulo || item.arquivo_fefo,
        menu: pkg.titulo,
        arquivo: `/usr/a/${item.arquivo_fefo}`,
        tamanho: fileSize,
        checksum: checksum,
        tipo: "audio",
        url: destUrl
      };

      if (existingAudioIdx >= 0) {
        catalog.audio[existingAudioIdx] = { ...catalog.audio[existingAudioIdx], ...catalogEntry };
      } else {
        catalog.audio.push(catalogEntry);
      }
    }

    // 2. Incrementa versão do catálogo e atualiza data
    const newVersion = (parseInt(catalog.catalogVersion, 10) || 1) + 1;
    catalog.catalogVersion = newVersion;
    catalog.updated_at = new Date().toISOString();

    onProgress(`Atualizando catalog.json para versão v${newVersion}...`);
    const newCatStr = JSON.stringify(catalog, null, 2) + '\n';
    await this.commitFile(
      'repository/catalog.json',
      newCatStr,
      `feat(catalog): publicar menu oficial “${pkg.titulo}” (v${newVersion}) via Web Admin`
    );

    // 3. Atualiza repository/draft_packages.json marcando como publicado
    onProgress(`Atualizando lista de rascunhos...`);
    try {
      const draftsFile = await this.getFile('repository/draft_packages.json');
      if (draftsFile.exists && draftsFile.content) {
        let draftsData = JSON.parse(draftsFile.content);
        draftsData.packages = draftsData.packages || [];
        const p = draftsData.packages.find(x => x.id === pkg.id);
        if (p) {
          p.status = 'published';
          p.published_version = newVersion;
          p.published_count = items.length;
        }
        draftsData.updated_at = new Date().toISOString();
        await this.commitFile(
          'repository/draft_packages.json',
          JSON.stringify(draftsData, null, 2) + '\n',
          `chore(drafts): marcar pacote “${pkg.titulo}” como publicado (v${newVersion})`
        );
      }
    } catch (e) {
      console.warn('Aviso ao atualizar draft_packages.json:', e);
    }

    return {
      ok: true,
      catalogVersion: newVersion,
      count: items.length,
      menu: pkg.titulo,
      message: `🎉 Menu “${pkg.titulo}” publicado com sucesso diretamente no GitHub (Catálogo v${newVersion})!`
    };
  },

  // ==========================================================
  // OPERAÇÕES DE PACOTES DE CARDS (CARDS INTERATIVOS)
  // ==========================================================
  async saveDraftCardPacks(packsList) {
    if (!this.isConfigured()) throw new Error('Token do GitHub não configurado.');
    const filePath = 'repository/draft_card_packs.json';
    let fileObj = {
      schema: 1,
      description: "FEFO Interactive Card Packs - Rascunho interno de pacotes de cards interativos, mini cards e ações.",
      updated_at: new Date().toISOString(),
      card_packs: packsList
    };
    const jsonStr = JSON.stringify(fileObj, null, 2) + '\n';
    return await this.commitFile(
      filePath,
      jsonStr,
      `chore(cards): salvar ${packsList.length} pacote(s) de cards via Web Admin`
    );
  },

  async publishOfficialCardPack(pack, onProgress = () => {}) {
    if (!this.isConfigured()) throw new Error('Token do GitHub não configurado.');
    
    onProgress('Lendo catálogo oficial do GitHub...');
    const catFile = await this.getFile('repository/catalog.json');
    if (!catFile.exists || !catFile.content) {
      throw new Error('Não foi possível ler o repository/catalog.json no GitHub.');
    }

    let catalog = JSON.parse(catFile.content);
    catalog.card_packs = catalog.card_packs || [];
    const cards = pack.cards || [];

    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const cCode = c.codigo_acao || c.id || `c${String(i + 1).padStart(4, '0')}`;
      onProgress(`Processando card ${i + 1}/${cards.length}: “${c.titulo || cCode}”...`);

      // 1. Upload da imagem se houver blob no IndexedDB
      if (window.CardImageDB) {
        const imgBlob = await window.CardImageDB.getImage(c.id);
        if (imgBlob) {
          onProgress(`Enviando imagem do card ${cCode}...`);
          const imgBytes = await imgBlob.arrayBuffer();
          const base64Img = this.arrayBufferToBase64(imgBytes);
          const imgFileName = `${cCode}.jpg`;
          await this.commitFile(
            `repository/cards/${imgFileName}`,
            base64Img,
            `feat(cards): upload imagem ${imgFileName} via Web Admin`,
            true
          );
          c.mini_card_img = `/repository/cards/${imgFileName}`;
        }
      }

      // 2. Upload do áudio se houver blob no IndexedDB
      if (window.AudioBlobDB) {
        const audioBlob = await window.AudioBlobDB.getAudio(c.id);
        if (audioBlob) {
          onProgress(`Enviando áudio do card ${cCode}...`);
          const audBytes = await audioBlob.arrayBuffer();
          const base64Aud = this.arrayBufferToBase64(audBytes);
          const audFileName = c.arquivo_audio || `${cCode}.wav`;
          await this.commitFile(
            `repository/audio/${audFileName}`,
            base64Aud,
            `feat(audio): upload audio card ${audFileName} via Web Admin`,
            true
          );
          c.arquivo_audio = audFileName;
          c.audio_url = `/repository/audio/${audFileName}`;
          c.tamanho_audio = audBytes.byteLength;
        }
      }
    }

    const publishedPack = {
      id: pack.id,
      titulo: pack.titulo,
      descricao: pack.descricao || '',
      licencas: pack.licencas || ['home', 'clinical', 'escola'],
      is_premium: Boolean(pack.is_premium),
      status: 'published',
      cards: cards
    };

    const idx = catalog.card_packs.findIndex(p => p.id === pack.id);
    if (idx >= 0) {
      catalog.card_packs[idx] = publishedPack;
    } else {
      catalog.card_packs.push(publishedPack);
    }

    const newVersion = (parseInt(catalog.catalogVersion, 10) || 1) + 1;
    catalog.catalogVersion = newVersion;
    catalog.updated_at = new Date().toISOString();

    onProgress(`Atualizando catalog.json para versão v${newVersion}...`);
    await this.commitFile(
      'repository/catalog.json',
      JSON.stringify(catalog, null, 2) + '\n',
      `feat(catalog): publicar pacote de cards “${pack.titulo}” (v${newVersion}) via Web Admin`
    );

    // Atualiza draft_card_packs.json
    onProgress('Atualizando rascunhos de cards...');
    try {
      const draftsFile = await this.getFile('repository/draft_card_packs.json');
      if (draftsFile.exists && draftsFile.content) {
        let draftsData = JSON.parse(draftsFile.content);
        draftsData.card_packs = draftsData.card_packs || [];
        const p = draftsData.card_packs.find(x => x.id === pack.id);
        if (p) p.status = 'published';
        draftsData.updated_at = new Date().toISOString();
        await this.commitFile(
          'repository/draft_card_packs.json',
          JSON.stringify(draftsData, null, 2) + '\n',
          `chore(cards): marcar pacote de cards “${pack.titulo}” como publicado`
        );
      }
    } catch (e) {}

    return {
      ok: true,
      catalogVersion: newVersion,
      message: `🎉 Pacote de Cards “${pack.titulo}” publicado com sucesso no catálogo oficial v${newVersion}!`
    };
  },

  // ==========================================================
  // INTERFACE DE USUÁRIO (MODAL & BADGE)
  // ==========================================================

  async initUI() {
    this.injectBadge();
    this.injectModal();

    // Auto-hidratação via URL parameter ?gh_token=... ou ?token=...
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('gh_token') || urlParams.get('token');
      if (tokenParam) {
        this.setToken(tokenParam);
        const repoParam = urlParams.get('gh_repo') || urlParams.get('repo');
        if (repoParam) this.setRepo(repoParam);
        const branchParam = urlParams.get('gh_branch') || urlParams.get('branch');
        if (branchParam) this.setBranch(branchParam);

        urlParams.delete('gh_token');
        urlParams.delete('token');
        urlParams.delete('gh_repo');
        urlParams.delete('repo');
        urlParams.delete('gh_branch');
        urlParams.delete('branch');
        const newQuery = urlParams.toString();
        const newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '') + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
        if (window.notice) window.notice('✓ Token do GitHub ativado com sucesso!', 'ok');
      }
    } catch (e) {}

    // Auto-hidratação via /api/config (servidor local) se não houver token no localStorage
    if (!this.getToken()) {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.config?.github_token) {
            this.setToken(data.config.github_token);
            if (data.config.github_repo) this.setRepo(data.config.github_repo);
            if (data.config.github_branch) this.setBranch(data.config.github_branch);
          }
        }
      } catch (e) {}
    }

    await this.updateStatusBadge();
  },

  injectBadge() {
    const header = document.querySelector('.hero');
    if (!header) return;

    if (document.getElementById('github-sync-pill')) return;

    const badgeContainer = document.createElement('div');
    badgeContainer.id = 'github-sync-pill';
    badgeContainer.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
    `;
    badgeContainer.onclick = () => this.openModal();

    header.appendChild(badgeContainer);
  },

  async updateStatusBadge() {
    const pill = document.getElementById('github-sync-pill');
    if (!pill) return;

    // 1. Verifica se a API local do Python está respondendo
    let localOnline = false;
    try {
      const res = await fetch('/api/packages', { method: 'GET', cache: 'no-store' });
      if (res.ok) localOnline = true;
    } catch (e) {}

    if (localOnline) {
      pill.style.background = '#ecfdf5';
      pill.style.borderColor = '#10b981';
      pill.style.color = '#065f46';
      pill.innerHTML = `
        <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:#10b981;"></span>
        <span>Modo Local (Python Ativo)</span>
        <span style="font-size:11px; opacity:0.75; margin-left:4px;">⚙️ GitHub Token</span>
      `;
      return;
    }

    // 2. Servidor local offline: verifica se o token do GitHub está configurado
    if (this.isConfigured()) {
      pill.style.background = '#eef2ff';
      pill.style.borderColor = '#6366f1';
      pill.style.color = '#3730a3';
      pill.innerHTML = `
        <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:#6366f1;"></span>
        <span>GitHub Nuvem Conectado (${this.getBranch()})</span>
        <span style="font-size:11px; opacity:0.8; margin-left:4px;">⚙️ Config</span>
      `;
    } else {
      pill.style.background = '#fffbeb';
      pill.style.borderColor = '#f59e0b';
      pill.style.color = '#92400e';
      pill.innerHTML = `
        <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:#f59e0b; animation: pulse 1.5s infinite;"></span>
        <span>⚙️ Conectar GitHub (Modo Nuvem / Qualquer PC)</span>
      `;
    }
  },

  injectModal() {
    if (document.getElementById('modal-github-config')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-github-config';
    modal.className = 'audio-trimmer-backdrop';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="audio-trimmer-container" style="max-width: 580px; background: #ffffff; color: #1e293b; border: 2px solid #6366f1; border-radius: 16px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.25);">
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 18px;">
          <div>
            <span style="display:inline-block; padding: 3px 10px; border-radius: 999px; background: #6366f1; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 0.5px;">GITHUB CLOUD SYNC</span>
            <h3 style="margin: 6px 0 2px; font-size: 20px; font-weight: 900; color: #0f172a;">Conectar GitHub (Acesso Universal)</h3>
            <p style="margin: 0; font-size: 13px; color: #64748b;">Salve rascunhos e publique menus oficiais de qualquer computador sem precisar de scripts ou servidor local.</p>
          </div>
          <button type="button" onclick="GitHubSync.closeModal()" style="border: none; background: #f1f5f9; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 16px; font-weight: bold; color: #64748b;">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 6px; text-transform: uppercase;">
              Token de Acesso Pessoal (PAT) do GitHub:
            </label>
            <div style="display: flex; gap: 8px;">
              <input type="password" id="gh-input-token" placeholder="ghp_... ou github_pat_..." style="flex: 1; padding: 10px 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 14px; font-family: monospace;">
              <button type="button" onclick="GitHubSync.toggleTokenVisibility()" style="padding: 0 14px; border: 1.5px solid #cbd5e1; border-radius: 10px; background: #f8fafc; cursor: pointer; font-size: 14px;">👁️</button>
            </div>
            <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">
              O token fica salvo apenas no <strong>seu navegador</strong> (localStorage). Nunca é compartilhado.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 6px; text-transform: uppercase;">Repositório:</label>
              <input type="text" id="gh-input-repo" value="${this.defaultRepo}" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13px;">
            </div>
            <div>
              <label style="display: block; font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 6px; text-transform: uppercase;">Branch:</label>
              <input type="text" id="gh-input-branch" value="${this.defaultBranch}" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13px;">
            </div>
          </div>

          <!-- Instruções rápidas de como gerar o token -->
          <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 12px 14px; font-size: 12px; color: #475569; line-height: 1.5;">
            <strong>Como gerar seu Token no GitHub:</strong>
            <ol style="margin: 6px 0 0; padding-left: 18px;">
              <li>Acesse <a href="https://github.com/settings/tokens" target="_blank" style="color: #6366f1; font-weight: 700; text-decoration: underline;">github.com/settings/tokens</a>.</li>
              <li>Clique em <strong>Generate new token (classic)</strong>.</li>
              <li>Marque a permissão (escopo) <strong>repo</strong> (Acesso total para salvar e publicar conteúdos).</li>
              <li>Copie o código gerado e cole no campo acima.</li>
            </ol>
          </div>

          <!-- Mensagem de resultado do teste -->
          <div id="gh-test-result" style="display: none; padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 600;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px;">
          <button type="button" onclick="GitHubSync.clearConfig()" style="background: none; border: none; color: #ef4444; font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: underline;">
            Desconectar / Limpar
          </button>
          <div style="display: flex; gap: 10px;">
            <button type="button" onclick="GitHubSync.handleTest()" style="padding: 9px 16px; border: 1.5px solid #cbd5e1; background: #ffffff; border-radius: 10px; font-size: 13px; font-weight: 700; color: #334155; cursor: pointer;">
              🧪 Testar Conexão
            </button>
            <button type="button" onclick="GitHubSync.handleSave()" style="padding: 9px 20px; border: none; background: #6366f1; color: #ffffff; border-radius: 10px; font-size: 13px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 12px rgba(99,102,241,0.3);">
              💾 Salvar Configurações
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(modal);
  },

  openModal() {
    this.injectModal();
    const tokenInput = document.getElementById('gh-input-token');
    const repoInput = document.getElementById('gh-input-repo');
    const branchInput = document.getElementById('gh-input-branch');
    const resultBox = document.getElementById('gh-test-result');

    if (tokenInput) tokenInput.value = this.getToken();
    if (repoInput) repoInput.value = this.getRepo();
    if (branchInput) branchInput.value = this.getBranch();
    if (resultBox) resultBox.style.display = 'none';

    document.getElementById('modal-github-config').style.display = 'flex';
  },

  closeModal() {
    const modal = document.getElementById('modal-github-config');
    if (modal) modal.style.display = 'none';
  },

  toggleTokenVisibility() {
    const inp = document.getElementById('gh-input-token');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  },

  async handleTest() {
    const token = document.getElementById('gh-input-token')?.value.trim();
    const repo = document.getElementById('gh-input-repo')?.value.trim();
    const branch = document.getElementById('gh-input-branch')?.value.trim();
    const resultBox = document.getElementById('gh-test-result');

    if (!token) {
      this.showTestResult('Cole seu token do GitHub antes de testar.', false);
      return;
    }

    this.showTestResult('Conectando ao GitHub...', null);

    // Salva temporariamente para teste
    localStorage.setItem(this.storageKeys.token, token);
    localStorage.setItem(this.storageKeys.repo, repo || this.defaultRepo);
    localStorage.setItem(this.storageKeys.branch, branch || this.defaultBranch);

    const res = await this.testConnection();
    this.showTestResult(res.message, res.ok);
  },

  showTestResult(msg, isSuccess) {
    const resultBox = document.getElementById('gh-test-result');
    if (!resultBox) return;

    resultBox.style.display = 'block';
    if (isSuccess === null) {
      resultBox.style.background = '#f1f5f9';
      resultBox.style.color = '#334155';
      resultBox.style.border = '1px solid #cbd5e1';
      resultBox.innerHTML = `⏳ ${msg}`;
    } else if (isSuccess) {
      resultBox.style.background = '#ecfdf5';
      resultBox.style.color = '#065f46';
      resultBox.style.border = '1px solid #10b981';
      resultBox.innerHTML = `✓ ${msg}`;
    } else {
      resultBox.style.background = '#fef2f2';
      resultBox.style.color = '#991b1b';
      resultBox.style.border = '1px solid #ef4444';
      resultBox.innerHTML = `✕ ${msg}`;
    }
  },

  async handleSave() {
    const token = document.getElementById('gh-input-token')?.value.trim();
    const repo = document.getElementById('gh-input-repo')?.value.trim();
    const branch = document.getElementById('gh-input-branch')?.value.trim();

    this.setToken(token);
    this.setRepo(repo);
    this.setBranch(branch);

    if (token) {
      const res = await this.testConnection();
      if (res.ok) {
        if (window.notice) window.notice('✓ Conexão com GitHub configurada com sucesso!', 'ok');
      } else {
        if (window.notice) window.notice(`Aviso: ${res.message}`, 'error');
      }
    } else {
      if (window.notice) window.notice('Token removido. Operando no modo local/offline.');
    }

    this.closeModal();
    this.updateStatusBadge();
  },

  clearConfig() {
    if (!confirm('Deseja remover as configurações e o token do GitHub deste navegador?')) return;
    this.setToken('');
    this.setRepo(this.defaultRepo);
    this.setBranch(this.defaultBranch);
    this.closeModal();
    this.updateStatusBadge();
    if (window.notice) window.notice('Configurações do GitHub removidas deste navegador.');
  }
};

window.GitHubSync = GitHubSync;

// Inicializa a UI assim que o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => GitHubSync.initUI());
} else {
  GitHubSync.initUI();
}
