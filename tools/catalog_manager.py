from __future__ import annotations
import csv, io, json, os, re, shutil, subprocess, sys, time, webbrowser
from email.parser import BytesParser
from email.policy import default
from hashlib import sha256
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / 'repository/catalog.json'

DRAFT_PACKAGES_FILE = ROOT / 'repository/draft_packages.json'
DRAFT_CARD_PACKS_FILE = ROOT / 'repository/draft_card_packs.json'
DRAFT_FACES_PACKS_FILE = ROOT / 'repository/draft_faces_packs.json'
DRAFT_SYSTEM_PACKS_FILE = ROOT / 'repository/draft_system_packs.json'
SYSTEM_METADATA_FILE = ROOT / 'repository/system_sounds.json'

DRAFTS_AUDIO_DIR = ROOT / 'repository/drafts/audio'
DRAFTS_CARDS_DIR = ROOT / 'repository/drafts/cards'
DRAFTS_FACES_DIR = ROOT / 'repository/drafts/faces'
DRAFTS_SYSTEM_DIR = ROOT / 'repository/drafts/system'

SD_DIR = ROOT / 'fefo_firmware/sdcard'
SD_AUDIO_DIR = SD_DIR / 'usr/a'
SD_FACES_DIR = SD_DIR / 'usr/f'
SD_CARDS_DIR = SD_DIR / 'usr/c'
SD_SYS_AUDIO_DIR = SD_DIR / 'sys/a'
SD_JSON = SD_DIR / 'fefo.json'

REPO_AUDIO_DIR = ROOT / 'repository/audio'
REPO_FACES_DIR = ROOT / 'repository/faces'
REPO_CARDS_DIR = ROOT / 'repository/cards'
REPO_SYSTEM_DIR = ROOT / 'repository/system'

# Garante criação de todas as pastas
for folder in (REPO_AUDIO_DIR, REPO_FACES_DIR, REPO_CARDS_DIR, REPO_SYSTEM_DIR,
               SD_AUDIO_DIR, SD_FACES_DIR, SD_CARDS_DIR, SD_SYS_AUDIO_DIR,
               DRAFTS_AUDIO_DIR, DRAFTS_CARDS_DIR, DRAFTS_FACES_DIR, DRAFTS_SYSTEM_DIR):
    folder.mkdir(parents=True, exist_ok=True)

def get_signing_key_path() -> Path:
    env_key = os.environ.get('FEFO_SIGNING_KEY')
    if env_key and Path(env_key).exists(): return Path(env_key)
    standard_paths = [
        Path(r'D:\Downloads\FEFO\fefo-signing-private.pem'),
        Path.home() / 'FEFO' / 'fefo-signing-private.pem',
        ROOT / 'fefo-signing-private.pem',
    ]
    for p in standard_paths:
        if p.exists(): return p
    return standard_paths[0]

def slugify(text: str) -> str:
    s = re.sub(r'[^\w\s-]', '', text.lower())
    return re.sub(r'[-\s]+', '_', s).strip('-_')

def get_next_audio_index() -> int:
    max_idx = 0
    for folder in (SD_AUDIO_DIR, REPO_AUDIO_DIR):
        if folder.exists():
            for p in folder.glob('a*.wav'):
                m = re.search(r'a(\d{4})\.wav$', p.name, re.IGNORECASE)
                if m: max_idx = max(max_idx, int(m.group(1)))
    if CATALOG.exists():
        try:
            cat = json.loads(CATALOG.read_text(encoding='utf-8'))
            for item in cat.get('audio', []):
                m = re.search(r'a(\d{4})\.wav$', item.get('arquivo', ''), re.IGNORECASE)
                if m: max_idx = max(max_idx, int(m.group(1)))
                m_id = re.search(r'au(\d+)', str(item.get('id', '')), re.IGNORECASE)
                if m_id: max_idx = max(max_idx, int(m_id.group(1)))
        except Exception: pass
    return max_idx + 1

def get_next_card_index() -> int:
    max_idx = 0
    for folder in (SD_CARDS_DIR, REPO_CARDS_DIR, DRAFTS_CARDS_DIR):
        if folder.exists():
            for p in folder.glob('c*.*'):
                m = re.search(r'c(\d{4})\.', p.name, re.IGNORECASE)
                if m: max_idx = max(max_idx, int(m.group(1)))
    return max_idx + 1

def get_next_face_index() -> int:
    max_idx = 0
    for folder in (SD_FACES_DIR, REPO_FACES_DIR, DRAFTS_FACES_DIR):
        if folder.exists():
            for p in folder.glob('f*.*'):
                m = re.search(r'f(\d{4})\.', p.name, re.IGNORECASE)
                if m: max_idx = max(max_idx, int(m.group(1)))
    if CATALOG.exists():
        try:
            cat = json.loads(CATALOG.read_text(encoding='utf-8'))
            for f in cat.get('faces', []):
                m = re.search(r'f(\d{4})', f.get('arquivo', ''), re.IGNORECASE)
                if m: max_idx = max(max_idx, int(m.group(1)))
                m_id = re.search(r'fa(\d+)', str(f.get('id', '')), re.IGNORECASE)
                if m_id: max_idx = max(max_idx, int(m_id.group(1)))
        except Exception: pass
    return max_idx + 1

def load_json_file(path: Path, default_data: dict) -> dict:
    if path.exists():
        try: return json.loads(path.read_text(encoding='utf-8'))
        except Exception: pass
    return default_data

def save_json_file(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def convert_audio_to_fefo_standard(src: Path, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-i', str(src), '-vn', '-ac', '1', '-ar', '22050',
        '-c:a', 'pcm_s16le', str(dest)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Erro convertendo áudio {src.name}: {res.stderr or res.stdout}")

def convert_image_to_fefo_rgb565(src: Path, raw_dest: Path, png_preview_dest: Path):
    img = Image.open(src).convert('RGB')
    img = img.resize((480, 320), Image.Resampling.LANCZOS)
    png_preview_dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(png_preview_dest, 'PNG')

    raw_dest.parent.mkdir(parents=True, exist_ok=True)
    raw_bytes = bytearray()
    for y in range(320):
        for x in range(480):
            r, g, b = img.getpixel((x, y))
            rgb565 = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
            raw_bytes.append((rgb565 >> 8) & 0xFF)
            raw_bytes.append(rgb565 & 0xFF)
    raw_dest.write_bytes(raw_bytes)

def format_card_image_for_app(img_bytes: bytes, dest_jpg: Path, sd_jpg: Path):
    """
    Formata imagem para visualização no App Fefo Mobile (proporção de card, max 600x800).
    Cards NÃO são exibidos na tela do FEFO (CYD ESP32), apenas no aplicativo móvel.
    """
    dest_jpg.parent.mkdir(parents=True, exist_ok=True)
    sd_jpg.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(io.BytesIO(img_bytes)) as img:
        img = img.convert('RGB')
        img.thumbnail((600, 800), Image.Resampling.LANCZOS)
        img.save(dest_jpg, 'JPEG', quality=90, optimize=True)
        shutil.copy2(dest_jpg, sd_jpg)

def sign_catalog_locally():
    key = get_signing_key_path()
    if not key.exists():
        print(f"[Aviso] Chave de assinatura não encontrada em {key}.")
        return
    try:
        subprocess.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
                        str(ROOT / 'tools/sign_catalog.ps1'), '-Catalog', str(CATALOG), '-PrivateKey', str(key)],
                       cwd=ROOT, check=True)
    except Exception as e:
        print(f"[Aviso] Erro em sign_catalog.ps1: {e}")

class Handler(SimpleHTTPRequestHandler):
    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            pass

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200); self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ('/', '/catalog-admin', '/catalog-admin.html'):
            self.send_response(302); self.send_header('Location', '/catalog-admin/index.html'); self.end_headers()
            return

        if parsed.path == '/api/pedagogical_catalog':
            ped_file = ROOT / 'repository/pedagogical_catalog.json'
            data_dict = load_json_file(ped_file, {'items': []})
            data = json.dumps({'ok': True, 'catalog': data_dict}, ensure_ascii=False).encode('utf-8')
            self.send_response(200); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
            return

        if parsed.path == '/api/config':
            cfg_file = ROOT / 'local_config.json'
            cfg_data = load_json_file(cfg_file, {})
            data = json.dumps({'ok': True, 'config': cfg_data}, ensure_ascii=False).encode('utf-8')
            self.send_response(200); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
            return

        # 1. ABA ÁUDIOS & MENUS
        if parsed.path == '/api/packages':
            drafts = load_json_file(DRAFT_PACKAGES_FILE, {"packages": []})
            published = []
            if CATALOG.exists():
                try:
                    cat = json.loads(CATALOG.read_text(encoding='utf-8'))
                    menus_dict = {}
                    for a in cat.get('audio', []):
                        mName = (a.get('menu') or 'Sem menu').strip()
                        if mName not in menus_dict: menus_dict[mName] = {'titulo': mName, 'count': 0, 'items': []}
                        menus_dict[mName]['count'] += 1
                        clean_file = Path(a.get('arquivo', '')).name
                        menus_dict[mName]['items'].append({
                            'id': a.get('id'), 'titulo': a.get('titulo'),
                            'arquivo': a.get('arquivo'), 'tamanho': a.get('tamanho'),
                            'checksum': a.get('checksum'), 'web_url': f"/repository/audio/{clean_file}"
                        })
                    published = list(menus_dict.values())
                except Exception: pass
            data = json.dumps({'ok': True, 'drafts': drafts.get('packages', []), 'published_menus': published}, ensure_ascii=False).encode('utf-8')
            self.send_response(200); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
            return

        # 2. ABA CARDS
        if parsed.path == '/api/card_packs':
            drafts = load_json_file(DRAFT_CARD_PACKS_FILE, {"card_packs": []})
            published = []
            if CATALOG.exists():
                try:
                    c = json.loads(CATALOG.read_text(encoding='utf-8'))
                    published = c.get('card_packs', [])
                except Exception: pass
            data = json.dumps({'ok': True, 'drafts': drafts.get('card_packs', []), 'published': published}, ensure_ascii=False).encode('utf-8')
            self.send_response(200); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
            return

        # 3. ABA ROSTINHOS (FACES) COM PASTA CONFIGURÁVEL E NOME DE EXIBIÇÃO NO APP
        if parsed.path == '/api/face_packs':
            drafts = load_json_file(DRAFT_FACES_PACKS_FILE, {"face_packs": []})
            published_faces = []
            if CATALOG.exists():
                try:
                    cat = json.loads(CATALOG.read_text(encoding='utf-8'))
                    for f in cat.get('faces', []):
                        arq = f.get('arquivo', '')
                        stem = Path(arq).stem
                        published_faces.append({
                            'id': f.get('id'),
                            'titulo': f.get('titulo', f.get('id')),
                            'arquivo': arq,
                            'arquivo_real': f"{stem}.raw",
                            'pasta': str(Path(arq).parent).replace('\\', '/') + '/',
                            'preview_url': f"/repository/faces/preview_{stem}.png"
                        })
                except Exception: pass
            data = json.dumps({'ok': True, 'drafts': drafts.get('face_packs', []), 'published_faces': published_faces}, ensure_ascii=False).encode('utf-8')
            self.send_response(200); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
            return

        # 4. ABA SONS DO SISTEMA COM PASTA CONFIGURÁVEL
        if parsed.path == '/api/system_packs':
            drafts = load_json_file(DRAFT_SYSTEM_PACKS_FILE, {"system_packs": []})
            meta = load_json_file(SYSTEM_METADATA_FILE, {"sounds": {}})
            sounds_dict = meta.setdefault('sounds', {})
            active_sounds = []
            if SD_SYS_AUDIO_DIR.exists():
                for p in SD_SYS_AUDIO_DIR.glob('*.wav'):
                    s_info = sounds_dict.get(p.name, {})
                    active_sounds.append({
                        'arquivo': p.name,
                        'evento': s_info.get('evento', p.stem),
                        'titulo': s_info.get('titulo', p.stem.replace('_', ' ').capitalize()),
                        'pasta': s_info.get('pasta', '/sys/a/'),
                        'web_url': f"/fefo_firmware/sdcard/sys/a/{p.name}"
                    })
            data = json.dumps({'ok': True, 'drafts': drafts.get('system_packs', []), 'active_sounds': active_sounds}, ensure_ascii=False).encode('utf-8')
            self.send_response(200); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
            return

        return super().do_GET()

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            body = self.rfile.read(length)
            content_type = self.headers.get('Content-Type', '')

            # ====================================================
            # 1. ROTAS DE ÁUDIOS & MENUS
            # ====================================================
            if self.path == '/api/packages/save':
                payload = json.loads(body.decode('utf-8'))
                pkg = payload.get('package')
                drafts_data = load_json_file(DRAFT_PACKAGES_FILE, {"packages": []})
                packages = drafts_data.setdefault('packages', [])
                pkg_id = pkg.get('id') or f"pkg_{slugify(pkg['titulo'])}_{int(os.times().elapsed * 1000) % 100000}"
                pkg['id'] = pkg_id
                idx = next((i for i, p in enumerate(packages) if p.get('id') == pkg_id), -1)
                if idx >= 0: packages[idx] = {**packages[idx], **pkg}
                else: pkg.setdefault('status', 'draft'); pkg.setdefault('items', []); packages.append(pkg)
                save_json_file(DRAFT_PACKAGES_FILE, drafts_data)
                result = {'ok': True, 'package': pkg, 'message': f'Pacote “{pkg["titulo"]}” salvo com sucesso!'}

            elif self.path == '/api/packages/delete':
                payload = json.loads(body.decode('utf-8'))
                pkg_id = payload.get('id')
                drafts_data = load_json_file(DRAFT_PACKAGES_FILE, {"packages": []})
                drafts_data['packages'] = [p for p in drafts_data.get('packages', []) if p.get('id') != pkg_id]
                save_json_file(DRAFT_PACKAGES_FILE, drafts_data)
                if pkg_id:
                    pkg_dir = DRAFTS_AUDIO_DIR / pkg_id
                    if pkg_dir.exists():
                        shutil.rmtree(pkg_dir, ignore_errors=True)
                result = {'ok': True, 'message': 'Pacote removido com sucesso.'}

            elif self.path == '/api/packages/delete_item':
                payload = json.loads(body.decode('utf-8'))
                pkg_id = payload.get('package_id')
                item_id = payload.get('item_id')
                drafts_data = load_json_file(DRAFT_PACKAGES_FILE, {"packages": []})
                pkg = next((p for p in drafts_data.get('packages', []) if p.get('id') == pkg_id), None)
                if pkg and 'items' in pkg:
                    pkg['items'] = [it for it in pkg['items'] if it.get('id') != item_id]
                    save_json_file(DRAFT_PACKAGES_FILE, drafts_data)
                result = {'ok': True, 'message': 'Faixa removida com sucesso.'}

            elif self.path == '/api/packages/update_item_metadata':
                payload = json.loads(body.decode('utf-8'))
                pkg_id = payload.get('package_id')
                item_id = payload.get('item_id')
                new_title = payload.get('titulo')
                new_fefo = payload.get('arquivo_fefo')
                new_desc = payload.get('descricao')
                drafts_data = load_json_file(DRAFT_PACKAGES_FILE, {'packages': []})
                pkg = next((p for p in drafts_data.get('packages', []) if p.get('id') == pkg_id), None)
                if pkg:
                    it = next((x for x in pkg.get('items', []) if x.get('id') == item_id), None)
                    if it:
                        if new_title is not None and isinstance(new_title, str):
                            it['titulo'] = new_title.strip()
                        if new_fefo is not None and isinstance(new_fefo, str):
                            clean_fefo = new_fefo.strip()
                            if clean_fefo and not clean_fefo.lower().endswith('.wav'):
                                clean_fefo += '.wav'
                            it['arquivo_fefo'] = clean_fefo
                        if new_desc is not None and isinstance(new_desc, str):
                            it['descricao'] = new_desc.strip()
                        save_json_file(DRAFT_PACKAGES_FILE, drafts_data)
                        result = {'ok': True, 'message': 'Faixa atualizada com sucesso.'}
                    else:
                        result = {'ok': False, 'message': 'Faixa não encontrada.'}
                else:
                    result = {'ok': False, 'message': 'Pacote não encontrado.'}

            elif self.path == '/api/tts/generate':
                payload = json.loads(body.decode('utf-8'))
                text = payload.get('text', '').strip()
                voice_id = payload.get('voice_id') or os.environ.get('ELEVENLABS_VOICE_ID', '')
                api_key = payload.get('api_key') or os.environ.get('ELEVENLABS_API_KEY', '')
                provider = payload.get('provider', 'auto')
                pkg_id = payload.get('package_id')
                item_id = payload.get('item_id')
                speed = float(payload.get('speed', 1.0))
                pitch = int(payload.get('pitch', 10))
                stability = float(payload.get('stability', 0.5))
                similarity = float(payload.get('similarity', 0.8))

                if not text: raise ValueError('Texto ausente para geração de áudio.')

                # 1. Geração via ElevenLabs se configurado
                if api_key and (provider == 'elevenlabs' or provider == 'auto'):
                    import urllib.request
                    vid = voice_id or '21m00Tcm4TlvDq8ikWAM'
                    url = f"https://api.elevenlabs.io/v1/text-to-speech/{vid}"
                    req_data = json.dumps({
                        "text": text,
                        "model_id": "eleven_multilingual_v2",
                        "voice_settings": {
                            "stability": stability,
                            "similarity_boost": similarity,
                            "use_speaker_boost": True
                        }
                    }).encode('utf-8')
                    req = urllib.request.Request(url, data=req_data, headers={
                        "Content-Type": "application/json",
                        "xi-api-key": api_key
                    })
                    with urllib.request.urlopen(req) as resp:
                        audio_bytes = resp.read()
                else:
                    # 2. Fallback com edge-tts de alta velocidade
                    import asyncio, edge_tts
                    tmp_mp3 = ROOT / f"temp_tts_{int(time.time()*1000)%100000}.mp3"
                    pitch_str = f"+{pitch}Hz" if pitch >= 0 else f"{pitch}Hz"
                    rate_pct = int((speed - 1.0) * 100)
                    rate_str = f"+{rate_pct}%" if rate_pct >= 0 else f"{rate_pct}%"
                    async def run_edge():
                        communicate = edge_tts.Communicate(text, 'pt-BR-ThalitaNeural', pitch=pitch_str, rate=rate_str)
                        await communicate.save(str(tmp_mp3))
                    asyncio.run(run_edge())
                    audio_bytes = tmp_mp3.read_bytes()
                    if tmp_mp3.exists(): tmp_mp3.unlink()

                # Salva arquivo WAV convertido na pasta de rascunhos
                out_dir = DRAFTS_AUDIO_DIR / (pkg_id or 'tts')
                out_dir.mkdir(parents=True, exist_ok=True)
                out_name = f"tts_{item_id or 'fefo'}_{int(time.time()*1000)%100000}.wav"
                dest_wav = out_dir / out_name

                tmp_in = ROOT / f"temp_in_{out_name}.mp3"
                tmp_in.write_bytes(audio_bytes)
                convert_audio_to_fefo_standard(tmp_in, dest_wav)
                if tmp_in.exists(): tmp_in.unlink()

                # Atualiza item no draft se informado
                if pkg_id and item_id:
                    drafts_data = load_json_file(DRAFT_PACKAGES_FILE, {"packages": []})
                    pkg = next((p for p in drafts_data.get('packages', []) if p.get('id') == pkg_id), None)
                    if pkg:
                        it = next((x for x in pkg.get('items', []) if x.get('id') == item_id), None)
                        if it:
                            it['arquivo_draft'] = str(dest_wav.relative_to(ROOT)).replace('\\', '/')
                            it['web_url'] = f"/repository/drafts/audio/{pkg_id}/{out_name}"
                            it['arquivo_origem'] = f"Voz IA FEFO ({out_name})"
                            it['tamanho'] = dest_wav.stat().st_size
                            it['status'] = 'ready'
                            save_json_file(DRAFT_PACKAGES_FILE, drafts_data)

                result = {
                    'ok': True,
                    'web_url': f"/repository/drafts/audio/{pkg_id or 'tts'}/{out_name}",
                    'message': '✓ Áudio gerado com a voz do FEFO com sucesso!'
                }

            elif self.path == '/api/tts/clone_sample':
                msg = BytesParser(policy=default).parsebytes(b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + body)
                api_key = None; voice_name = 'Voz do FEFO'; audio_data = None; filename = 'sample.mp3'
                for part in msg.walk():
                    if part.get_content_disposition() != 'form-data': continue
                    name = part.get_param('name', header='content-disposition')
                    if name == 'api_key': api_key = part.get_content().strip()
                    elif name == 'voice_name': voice_name = part.get_content().strip()
                    elif name == 'file' and part.get_filename():
                        filename = part.get_filename()
                        audio_data = part.get_payload(decode=True)

                if not audio_data: raise ValueError('Arquivo de áudio da voz de referência ausente.')

                sample_dir = ROOT / 'repository/voice_samples'
                sample_dir.mkdir(parents=True, exist_ok=True)
                clean_name = re.sub(r'[^\w\.-]', '_', filename)
                sample_file = sample_dir / clean_name
                sample_file.write_bytes(audio_data)

                voice_id = None
                if api_key:
                    import urllib.request
                    boundary = f"----WebKitFormBoundary{int(time.time()*1000)}"
                    body_parts = []
                    body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\n{voice_name}\r\n".encode('utf-8'))
                    body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"description\"\r\n\r\nVoz clonada do FEFO Pet\r\n".encode('utf-8'))
                    body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"{clean_name}\"\r\nContent-Type: audio/mpeg\r\n\r\n".encode('utf-8') + audio_data + b"\r\n")
                    body_parts.append(f"--{boundary}--\r\n".encode('utf-8'))
                    full_body = b"".join(body_parts)

                    req = urllib.request.Request("https://api.elevenlabs.io/v1/voices/add", data=full_body, headers={
                        "Content-Type": f"multipart/form-data; boundary={boundary}",
                        "xi-api-key": api_key
                    })
                    try:
                        with urllib.request.urlopen(req) as resp:
                            res_json = json.loads(resp.read().decode('utf-8'))
                            voice_id = res_json.get('voice_id')
                    except Exception as err:
                        raise ValueError(f"Erro ElevenLabs ao clonar: {err}")

                result = {
                    'ok': True,
                    'voice_id': voice_id,
                    'sample_url': f"/repository/voice_samples/{clean_name}",
                    'message': f"✓ Amostra '{filename}' salva e voz clonada com sucesso!" if voice_id else f"✓ Amostra '{filename}' salva como voz de referência!"
                }

            elif self.path == '/api/packages/upload_single_item_audio':
                msg = BytesParser(policy=default).parsebytes(b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + body)
                pkg_id = None; item_id = None; audio_data = None; filename = 'audio.wav'
                for part in msg.walk():
                    if part.get_content_disposition() != 'form-data': continue
                    name = part.get_param('name', header='content-disposition')
                    if name == 'package_id': pkg_id = part.get_content().strip()
                    elif name == 'item_id': item_id = part.get_content().strip()
                    elif name == 'file' and part.get_filename():
                        filename = part.get_filename()
                        audio_data = part.get_payload(decode=True)

                if not pkg_id or not item_id or not audio_data:
                    raise ValueError('Dados incompletos para upload de áudio.')

                clean_filename = re.sub(r'[^\w\.-]', '_', filename)
                pkg_dir = DRAFTS_AUDIO_DIR / pkg_id
                pkg_dir.mkdir(parents=True, exist_ok=True)
                dest_file = pkg_dir / clean_filename
                dest_file.write_bytes(audio_data)

                drafts_data = load_json_file(DRAFT_PACKAGES_FILE, {'packages': []})
                pkg = next((p for p in drafts_data.get('packages', []) if p.get('id') == pkg_id), None)
                if pkg:
                    it = next((x for x in pkg.get('items', []) if x.get('id') == item_id), None)
                    if it:
                        it['arquivo_origem'] = filename
                        it['arquivo_draft'] = str(dest_file.relative_to(ROOT)).replace('\\', '/')
                        it['web_url'] = f'/repository/drafts/audio/{pkg_id}/{clean_filename}'
                        it['tamanho'] = len(audio_data)
                        it['status'] = 'needs_trim'
                        save_json_file(DRAFT_PACKAGES_FILE, drafts_data)
                        result = {'ok': True, 'item': it, 'message': f'✓ Áudio “{filename}” carregado na faixa!'}
                    else:
                        result = {'ok': False, 'message': 'Faixa não encontrada no pacote.'}
                else:
                    result = {'ok': False, 'message': 'Pacote não encontrado.'}

            elif self.path == '/api/packages/unpublish_menu':
                payload = json.loads(body.decode('utf-8'))
                menu_titulo = payload.get('menu_titulo')
                restored_pkg = payload.get('package')
                if not menu_titulo: raise ValueError('menu_titulo ausente.')

                cat = json.loads(CATALOG.read_text(encoding='utf-8'))
                audios = cat.get('audio', [])
                cat['audio'] = [a for a in audios if a.get('menu') != menu_titulo]
                new_ver = int(cat.get('catalogVersion', 1)) + 1
                cat['catalogVersion'] = new_ver
                CATALOG.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                sign_catalog_locally()

                if restored_pkg:
                    drafts_data = load_json_file(DRAFT_PACKAGES_FILE, {'packages': []})
                    pkgs = drafts_data.setdefault('packages', [])
                    idx = next((i for i, p in enumerate(pkgs) if p.get('id') == restored_pkg.get('id') or p.get('titulo') == menu_titulo), -1)
                    if idx >= 0: pkgs[idx] = restored_pkg
                    else: pkgs.insert(0, restored_pkg)
                    save_json_file(DRAFT_PACKAGES_FILE, drafts_data)

                result = {'ok': True, 'catalogVersion': new_ver, 'message': f'✓ Menu “{menu_titulo}” despublicado e transferido para os rascunhos!'}

            elif self.path == '/api/packages/upload_audio':
                msg = BytesParser(policy=default).parsebytes(b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + body)
                pkg_id = None; uploaded_items = []
                for part in msg.walk():
                    if part.get_content_disposition() != 'form-data': continue
                    name = part.get_param('name', header='content-disposition')
                    if name == 'package_id': pkg_id = part.get_content().strip()
                    elif name == 'file' and part.get_filename(): uploaded_items.append((part.get_filename(), part.get_payload(decode=True)))

                drafts_data = load_json_file(DRAFT_PACKAGES_FILE, {"packages": []})
                pkg = next((p for p in drafts_data.get('packages', []) if p.get('id') == pkg_id), None)
                pkg_dir = DRAFTS_AUDIO_DIR / pkg_id
                pkg_dir.mkdir(parents=True, exist_ok=True)
                items = pkg.setdefault('items', [])
                for filename, file_data in uploaded_items:
                    clean_filename = re.sub(r'[^\w\.-]', '_', filename)
                    dest_file = pkg_dir / clean_filename
                    dest_file.write_bytes(file_data)
                    stem = dest_file.stem.replace('_', ' ').replace('-', ' ').strip()
                    stem = re.sub(r'^\d+[\s\.-]*', '', stem)
                    items.append({
                        'id': f"item_{int(os.times().elapsed * 1000) % 100000}_{len(items) + 1}",
                        'titulo': stem.capitalize() or filename, 'submenu': '',
                        'arquivo_origem': filename,
                        'arquivo_draft': str(dest_file.relative_to(ROOT)).replace('\\', '/'),
                        'web_url': f"/repository/drafts/audio/{pkg_id}/{clean_filename}",
                        'tamanho': len(file_data), 'status': 'ready'
                    })
                save_json_file(DRAFT_PACKAGES_FILE, drafts_data)
                result = {'ok': True, 'package': pkg, 'message': f'{len(uploaded_items)} áudio(s) adicionado(s)!'}

            elif self.path == '/api/packages/replace_audio':
                msg = BytesParser(policy=default).parsebytes(b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + body)
                tipo = 'draft'; pkg_id = None; item_id = None; new_file_bytes = None
                for part in msg.walk():
                    if part.get_content_disposition() != 'form-data': continue
                    name = part.get_param('name', header='content-disposition')
                    if name == 'tipo': tipo = part.get_content().strip()
                    elif name == 'package_id': pkg_id = part.get_content().strip()
                    elif name == 'item_id': item_id = part.get_content().strip()
                    elif name == 'file': new_file_bytes = part.get_payload(decode=True)

                if tipo == 'draft':
                    drafts_data = load_json_file(DRAFT_PACKAGES_FILE, {"packages": []})
                    pkg = next((p for p in drafts_data.get('packages', []) if p.get('id') == pkg_id), None)
                    it = next((x for x in pkg.get('items', []) if x.get('id') == item_id), None)
                    dest = ROOT / it.get('arquivo_draft')
                    dest.write_bytes(new_file_bytes)
                    it['tamanho'] = len(new_file_bytes)
                    save_json_file(DRAFT_PACKAGES_FILE, drafts_data)
                    result = {'ok': True, 'message': f'✓ Trecho cortado salvo na faixa “{it.get("titulo")}”.'}
                else:
                    cat = json.loads(CATALOG.read_text(encoding='utf-8'))
                    it = next((x for x in cat.get('audio', []) if x.get('id') == item_id), None)
                    canon_name = Path(it.get('arquivo', '')).name
                    repo_dest = REPO_AUDIO_DIR / canon_name
                    sd_dest = SD_AUDIO_DIR / canon_name
                    tmp_wav = ROOT / 'temp_cut.wav'
                    tmp_wav.write_bytes(new_file_bytes)
                    convert_audio_to_fefo_standard(tmp_wav, repo_dest)
                    shutil.copy2(repo_dest, sd_dest)
                    if tmp_wav.exists(): tmp_wav.unlink()
                    file_bytes = repo_dest.read_bytes()
                    it['tamanho'] = len(file_bytes)
                    it['checksum'] = sha256(file_bytes).hexdigest()
                    new_ver = int(cat.get('catalogVersion', 1)) + 1
                    cat['catalogVersion'] = new_ver
                    CATALOG.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                    sign_catalog_locally()
                    result = {'ok': True, 'message': f'✓ Trecho cortado na faixa oficial “{it.get("titulo")}” (Catálogo v{new_ver}).'}

            elif self.path == '/api/production_menu/save':
                payload = json.loads(body.decode('utf-8'))
                old_menu = payload.get('old_menu_titulo')
                new_menu = payload.get('new_menu_titulo') or old_menu
                items_updates = payload.get('items', [])
                cat = json.loads(CATALOG.read_text(encoding='utf-8'))
                changed = False
                for a in cat.get('audio', []):
                    if a.get('menu') == old_menu:
                        if old_menu != new_menu: a['menu'] = new_menu; changed = True
                        upd = next((x for x in items_updates if x.get('id') == a.get('id')), None)
                        if upd and upd.get('titulo') and upd.get('titulo') != a.get('titulo'):
                            a['titulo'] = upd.get('titulo').strip(); changed = True
                if changed:
                    new_ver = int(cat.get('catalogVersion', 1)) + 1
                    cat['catalogVersion'] = new_ver
                    CATALOG.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                    sign_catalog_locally()
                    result = {'ok': True, 'message': f'✓ Menu oficial “{new_menu}” atualizado (v{new_ver})!'}
                else: result = {'ok': True, 'message': 'Nenhuma alteração detectada.'}

            elif self.path == '/api/packages/publish_official':
                payload = json.loads(body.decode('utf-8'))
                pkg_id = payload.get('package_id')
                drafts_data = load_json_file(DRAFT_PACKAGES_FILE, {"packages": []})
                pkg = next((p for p in drafts_data.get('packages', []) if p.get('id') == pkg_id), None)
                items = pkg.get('items', [])
                menu_titulo = pkg.get('titulo', '').strip()
                cat = json.loads(CATALOG.read_text(encoding='utf-8'))
                cat_audios = cat.setdefault('audio', [])
                audio_idx = get_next_audio_index()
                for it in items:
                    draft_file = ROOT / it.get('arquivo_draft')
                    if not draft_file.exists(): draft_file = DRAFTS_AUDIO_DIR / pkg_id / Path(it.get('arquivo_draft', '')).name
                    dest_name = f"a{audio_idx:04d}.wav"
                    repo_dest = REPO_AUDIO_DIR / dest_name
                    sd_dest = SD_AUDIO_DIR / dest_name
                    convert_audio_to_fefo_standard(draft_file, repo_dest)
                    shutil.copy2(repo_dest, sd_dest)
                    file_bytes = repo_dest.read_bytes()
                    cat_audios.append({
                        "id": f"au{audio_idx:03d}", "titulo": it.get('titulo', dest_name),
                        "menu": menu_titulo, "arquivo": f"/usr/a/{dest_name}",
                        "tamanho": len(file_bytes), "checksum": sha256(file_bytes).hexdigest(),
                        "tipo": "audio", "url": f"https://raw.githubusercontent.com/elCortelini/fefo-v1/main/repository/audio/{dest_name}"
                    })
                    audio_idx += 1
                new_version = int(catalog.get('catalogVersion', 1)) + 1
                catalog['catalogVersion'] = new_version
                CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                pkg['status'] = 'published'; pkg['published_version'] = new_version; pkg['published_count'] = len(items)
                save_json_file(DRAFT_PACKAGES_FILE, drafts_data)
                sign_catalog_locally()
                result = {'ok': True, 'catalogVersion': new_version, 'count': len(items), 'menu': menu_titulo, 'message': f'🎉 Pacote “{menu_titulo}” publicado como Menu Oficial v{new_version}!'}

            # ====================================================
            # 2. ROTAS DE CARDS (c0001.jpg + áudio)
            # ====================================================
            elif self.path == '/api/card_packs/save':
                payload = json.loads(body.decode('utf-8'))
                pack = payload.get('pack')
                drafts_data = load_json_file(DRAFT_CARD_PACKS_FILE, {"card_packs": []})
                packs = drafts_data.setdefault('card_packs', [])
                pack_id = pack.get('id') or f"pack_cards_{slugify(pack['titulo'])}_{int(os.times().elapsed * 1000) % 100000}"
                pack['id'] = pack_id
                idx = next((i for i, p in enumerate(packs) if p.get('id') == pack_id), -1)
                if idx >= 0: packs[idx] = {**packs[idx], **pack}
                else: pack.setdefault('status', 'draft'); pack.setdefault('cards', []); packs.append(pack)
                save_json_file(DRAFT_CARD_PACKS_FILE, drafts_data)
                result = {'ok': True, 'pack': pack, 'message': f'Pacote de Cards “{pack["titulo"]}” salvo com sucesso!'}

            elif self.path == '/api/card_packs/delete':
                payload = json.loads(body.decode('utf-8'))
                pack_id = payload.get('id')
                drafts_data = load_json_file(DRAFT_CARD_PACKS_FILE, {"card_packs": []})
                drafts_data['card_packs'] = [p for p in drafts_data.get('card_packs', []) if p.get('id') != pack_id]
                save_json_file(DRAFT_CARD_PACKS_FILE, drafts_data)
                result = {'ok': True, 'message': 'Pacote de cards excluído.'}

            elif self.path == '/api/card_packs/upload_card':
                msg = BytesParser(policy=default).parsebytes(b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + body)
                pack_id = None; card_id = None; card_titulo = ''; card_acao = ''
                img_data = None; audio_data = None
                for part in msg.walk():
                    if part.get_content_disposition() != 'form-data': continue
                    name = part.get_param('name', header='content-disposition')
                    if name == 'pack_id': pack_id = part.get_content().strip()
                    elif name == 'card_id': card_id = part.get_content().strip()
                    elif name == 'titulo': card_titulo = part.get_content().strip()
                    elif name == 'codigo_acao': card_acao = part.get_content().strip()
                    elif name == 'image_file' and part.get_filename(): img_data = part.get_payload(decode=True)
                    elif name == 'audio_file' and part.get_filename(): audio_data = part.get_payload(decode=True)

                drafts_data = load_json_file(DRAFT_CARD_PACKS_FILE, {"card_packs": []})
                pack = next((p for p in drafts_data.get('card_packs', []) if p.get('id') == pack_id), None)
                cards = pack.setdefault('cards', [])
                existing_card = next((c for c in cards if c.get('id') == card_id), None) if card_id else None

                if not existing_card:
                    c_idx = get_next_card_index()
                    c_num = f"c{c_idx:04d}"
                    existing_card = {
                        'id': c_num, 'codigo': c_num,
                        'titulo': card_titulo or f"Card {c_idx}",
                        'codigo_acao': card_acao or c_num,
                        'mini_card_img': '', 'audio_url': ''
                    }
                    cards.append(existing_card)
                else:
                    c_num = existing_card.get('codigo', existing_card.get('id'))
                    if card_titulo: existing_card['titulo'] = card_titulo
                    if card_acao: existing_card['codigo_acao'] = card_acao

                if img_data:
                    dest_jpg = REPO_CARDS_DIR / f"{c_num}.jpg"
                    sd_jpg = SD_CARDS_DIR / f"{c_num}.jpg"
                    format_card_image_for_app(img_data, dest_jpg, sd_jpg)
                    existing_card['mini_card_img'] = f"/repository/cards/{c_num}.jpg"

                if audio_data:
                    tmp_wav = ROOT / f"temp_{c_num}.wav"
                    tmp_wav.write_bytes(audio_data)
                    dest_wav = REPO_CARDS_DIR / f"{c_num}.wav"
                    sd_wav = SD_CARDS_DIR / f"{c_num}.wav"
                    convert_audio_to_fefo_standard(tmp_wav, dest_wav)
                    shutil.copy2(dest_wav, sd_wav)
                    if tmp_wav.exists(): tmp_wav.unlink()
                    existing_card['audio_url'] = f"/repository/cards/{c_num}.wav"

                save_json_file(DRAFT_CARD_PACKS_FILE, drafts_data)
                result = {'ok': True, 'card': existing_card, 'message': f'✓ Card {c_num} formatado e atualizado para o App com sucesso!'}

            elif self.path == '/api/card_packs/delete_card':
                payload = json.loads(body.decode('utf-8'))
                pack_id = payload.get('pack_id'); card_id = payload.get('card_id')
                drafts_data = load_json_file(DRAFT_CARD_PACKS_FILE, {"card_packs": []})
                pack = next((p for p in drafts_data.get('card_packs', []) if p.get('id') == pack_id), None)
                if pack:
                    pack['cards'] = [c for c in pack.get('cards', []) if c.get('id') != card_id]
                    save_json_file(DRAFT_CARD_PACKS_FILE, drafts_data)
                result = {'ok': True, 'message': 'Card excluído.'}

            elif self.path == '/api/card_packs/publish_official':
                payload = json.loads(body.decode('utf-8'))
                pack_id = payload.get('pack_id')
                drafts_data = load_json_file(DRAFT_CARD_PACKS_FILE, {"card_packs": []})
                pack = next((p for p in drafts_data.get('card_packs', []) if p.get('id') == pack_id), None)
                if not pack: raise ValueError('Pacote de cards não encontrado.')

                cat = json.loads(CATALOG.read_text(encoding='utf-8'))
                cat_card_packs = cat.setdefault('card_packs', [])
                existing_p = next((p for p in cat_card_packs if p.get('id') == pack_id), None)
                published_pack = {
                    'id': pack['id'],
                    'titulo': pack['titulo'],
                    'descricao': pack.get('descricao', ''),
                    'status': 'published',
                    'cards': pack.get('cards', [])
                }
                if existing_p: existing_p.update(published_pack)
                else: cat_card_packs.append(published_pack)

                pack['status'] = 'published'
                save_json_file(DRAFT_CARD_PACKS_FILE, drafts_data)
                new_ver = int(cat.get('catalogVersion', 1)) + 1
                cat['catalogVersion'] = new_ver
                CATALOG.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                sign_catalog_locally()
                result = {'ok': True, 'catalogVersion': new_ver, 'message': f'🎉 Pacote de Cards “{pack["titulo"]}” publicado oficialmente no catálogo v{new_ver}!'}

            # ====================================================
            # 3. ROTAS DE ROSTINHOS (FACES) COM PASTA E TÍTULO NO APP
            # ====================================================
            elif self.path == '/api/face_packs/save':
                payload = json.loads(body.decode('utf-8'))
                pack = payload.get('pack')
                drafts_data = load_json_file(DRAFT_FACES_PACKS_FILE, {"face_packs": []})
                packs = drafts_data.setdefault('face_packs', [])
                pack_id = pack.get('id') or f"pack_faces_{slugify(pack['titulo'])}_{int(os.times().elapsed * 1000) % 100000}"
                pack['id'] = pack_id
                pack.setdefault('pasta_destino', '/usr/f/')
                idx = next((i for i, p in enumerate(packs) if p.get('id') == pack_id), -1)
                if idx >= 0: packs[idx] = {**packs[idx], **pack}
                else: pack.setdefault('status', 'draft'); pack.setdefault('faces', []); packs.append(pack)
                save_json_file(DRAFT_FACES_PACKS_FILE, drafts_data)
                result = {'ok': True, 'pack': pack, 'message': f'Pacote de Rostinhos “{pack["titulo"]}” salvo com sucesso!'}

            elif self.path == '/api/face_packs/upload_face':
                msg = BytesParser(policy=default).parsebytes(b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + body)
                pack_id = None; titulo_app = 'Nova Expressão'; pasta_dest = '/usr/f/'; img_data = None
                for part in msg.walk():
                    if part.get_content_disposition() != 'form-data': continue
                    name = part.get_param('name', header='content-disposition')
                    if name == 'pack_id': pack_id = part.get_content().strip()
                    elif name == 'titulo': titulo_app = part.get_content().strip()
                    elif name == 'pasta_destino': pasta_dest = part.get_content().strip()
                    elif name == 'file' and part.get_filename(): img_data = part.get_payload(decode=True)

                if not img_data: raise ValueError('Imagem da face ausente.')
                f_idx = get_next_face_index()
                f_name = f"f{f_idx:04d}"

                raw_dest = REPO_FACES_DIR / f"{f_name}.raw"
                preview_dest = REPO_FACES_DIR / f"preview_{f_name}.png"
                sd_target_folder = SD_DIR / pasta_dest.strip('/')
                sd_target_folder.mkdir(parents=True, exist_ok=True)
                sd_raw = sd_target_folder / f"{f_name}.raw"

                tmp_img = ROOT / f"temp_{f_name}.png"
                tmp_img.write_bytes(img_data)
                convert_image_to_fefo_rgb565(tmp_img, raw_dest, preview_dest)
                shutil.copy2(raw_dest, sd_raw)
                if tmp_img.exists(): tmp_img.unlink()

                face_item = {
                    'id': f"fa{f_idx:03d}",
                    'titulo': titulo_app, # Nome exibido no app
                    'arquivo_real': f"{f_name}.raw", # Nome físico real
                    'arquivo': f"{pasta_dest.rstrip('/')}/{f_name}.raw",
                    'pasta': pasta_dest,
                    'preview_url': f"/repository/faces/preview_{f_name}.png",
                    'tamanho': 307200
                }

                # Salva no pacote rascunho se especificado
                if pack_id:
                    drafts_data = load_json_file(DRAFT_FACES_PACKS_FILE, {"face_packs": []})
                    pack = next((p for p in drafts_data.get('face_packs', []) if p.get('id') == pack_id), None)
                    if pack:
                        pack.setdefault('faces', []).append(face_item)
                        save_json_file(DRAFT_FACES_PACKS_FILE, drafts_data)

                # Também adiciona ao catalog.json oficial para ficar imediatamente disponível
                cat = json.loads(CATALOG.read_text(encoding='utf-8'))
                faces_list = cat.setdefault('faces', [])
                faces_list.append({
                    "id": face_item['id'],
                    "arquivo": face_item['arquivo'],
                    "tamanho": 307200,
                    "checksum": sha256(raw_dest.read_bytes()).hexdigest(),
                    "tipo": "face",
                    "titulo": titulo_app,
                    "url": f"https://raw.githubusercontent.com/elCortelini/fefo-v1/main/repository/faces/{f_name}.raw"
                })
                new_ver = int(cat.get('catalogVersion', 1)) + 1
                cat['catalogVersion'] = new_ver
                CATALOG.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                sign_catalog_locally()

                result = {'ok': True, 'face': face_item, 'message': f'✓ Rostinho “{titulo_app}” ({f_name}.raw) salvo em {pasta_dest}!'}

            elif self.path == '/api/face_packs/update_title':
                payload = json.loads(body.decode('utf-8'))
                face_id = payload.get('face_id')
                novo_titulo = payload.get('titulo')
                cat = json.loads(CATALOG.read_text(encoding='utf-8'))
                it = next((f for f in cat.get('faces', []) if f.get('id') == face_id), None)
                if it:
                    it['titulo'] = novo_titulo.strip()
                    new_ver = int(cat.get('catalogVersion', 1)) + 1
                    cat['catalogVersion'] = new_ver
                    CATALOG.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                    sign_catalog_locally()
                    result = {'ok': True, 'message': f'✓ Nome exibido no app atualizado para “{novo_titulo}”!'}
                else: raise ValueError('Rostinho não encontrado.')

            elif self.path == '/api/face_packs/delete_face':
                payload = json.loads(body.decode('utf-8'))
                face_id = payload.get('face_id')
                cat = json.loads(CATALOG.read_text(encoding='utf-8'))
                cat['faces'] = [f for f in cat.get('faces', []) if f.get('id') != face_id]
                new_ver = int(cat.get('catalogVersion', 1)) + 1
                cat['catalogVersion'] = new_ver
                CATALOG.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                sign_catalog_locally()
                result = {'ok': True, 'message': 'Rostinho excluído do catálogo.'}

            # ====================================================
            # 4. ROTAS DE SONS DO SISTEMA COM PASTA E CORTE
            # ====================================================
            elif self.path == '/api/system_packs/save':
                payload = json.loads(body.decode('utf-8'))
                pack = payload.get('pack')
                drafts_data = load_json_file(DRAFT_SYSTEM_PACKS_FILE, {"system_packs": []})
                packs = drafts_data.setdefault('system_packs', [])
                pack_id = pack.get('id') or f"pack_sys_{slugify(pack['titulo'])}_{int(os.times().elapsed * 1000) % 100000}"
                pack['id'] = pack_id
                pack.setdefault('pasta_destino', '/sys/a/')
                idx = next((i for i, p in enumerate(packs) if p.get('id') == pack_id), -1)
                if idx >= 0: packs[idx] = {**packs[idx], **pack}
                else: pack.setdefault('status', 'draft'); pack.setdefault('sounds', []); packs.append(pack)
                save_json_file(DRAFT_SYSTEM_PACKS_FILE, drafts_data)
                result = {'ok': True, 'pack': pack, 'message': f'Pacote de Sons “{pack["titulo"]}” salvo com sucesso!'}

            elif self.path == '/api/system_packs/upload_sound':
                msg = BytesParser(policy=default).parsebytes(b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + body)
                pack_id = None; titulo = 'Novo Alerta'; evento = 'alerta_sistema'; pasta_dest = '/sys/a/'; audio_data = None
                for part in msg.walk():
                    if part.get_content_disposition() != 'form-data': continue
                    name = part.get_param('name', header='content-disposition')
                    if name == 'pack_id': pack_id = part.get_content().strip()
                    elif name == 'titulo': titulo = part.get_content().strip()
                    elif name == 'evento': evento = part.get_content().strip()
                    elif name == 'pasta_destino': pasta_dest = part.get_content().strip()
                    elif name == 'file' and part.get_filename(): audio_data = part.get_payload(decode=True)

                if not audio_data: raise ValueError('Arquivo de áudio ausente.')
                clean_name = f"{slugify(evento)}.wav"
                tmp_file = ROOT / 'temp_sys.wav'
                tmp_file.write_bytes(audio_data)

                dest_repo = REPO_SYSTEM_DIR / clean_name
                sd_target_folder = SD_DIR / pasta_dest.strip('/')
                sd_target_folder.mkdir(parents=True, exist_ok=True)
                dest_sd = sd_target_folder / clean_name

                convert_audio_to_fefo_standard(tmp_file, dest_repo)
                shutil.copy2(dest_repo, dest_sd)
                if tmp_file.exists(): tmp_file.unlink()

                # Atualiza metadados
                meta = load_json_file(SYSTEM_METADATA_FILE, {"sounds": {}})
                meta.setdefault('sounds', {})[clean_name] = {
                    'arquivo': clean_name,
                    'evento': evento,
                    'titulo': titulo,
                    'pasta': pasta_dest
                }
                save_json_file(SYSTEM_METADATA_FILE, meta)

                sound_item = {
                    'id': f"sys_{int(os.times().elapsed * 1000) % 100000}",
                    'titulo': titulo,
                    'evento': evento,
                    'arquivo': clean_name,
                    'pasta': pasta_dest,
                    'web_url': f"/fefo_firmware/sdcard/sys/a/{clean_name}",
                    'tamanho': dest_repo.stat().st_size
                }

                if pack_id:
                    drafts_data = load_json_file(DRAFT_SYSTEM_PACKS_FILE, {"system_packs": []})
                    pack = next((p for p in drafts_data.get('system_packs', []) if p.get('id') == pack_id), None)
                    if pack:
                        pack.setdefault('sounds', []).append(sound_item)
                        save_json_file(DRAFT_SYSTEM_PACKS_FILE, drafts_data)

                result = {'ok': True, 'sound': sound_item, 'message': f'✓ Som “{titulo}” ({clean_name}) salvo em {pasta_dest}!'}

            elif self.path == '/api/system_packs/update_sound':
                payload = json.loads(body.decode('utf-8'))
                arquivo = payload.get('arquivo')
                novo_titulo = payload.get('titulo', '').strip()
                novo_evento = payload.get('evento', '').strip()
                meta = load_json_file(SYSTEM_METADATA_FILE, {"sounds": {}})
                sounds_dict = meta.setdefault('sounds', {})
                if arquivo in sounds_dict:
                    if novo_titulo: sounds_dict[arquivo]['titulo'] = novo_titulo
                    if novo_evento: sounds_dict[arquivo]['evento'] = novo_evento
                else:
                    sounds_dict[arquivo] = {
                        'arquivo': arquivo,
                        'titulo': novo_titulo or Path(arquivo).stem.replace('_', ' ').capitalize(),
                        'evento': novo_evento or Path(arquivo).stem,
                        'pasta': '/sys/a/'
                    }
                save_json_file(SYSTEM_METADATA_FILE, meta)
                result = {'ok': True, 'message': f'✓ Som “{arquivo}” atualizado com sucesso!'}

            elif self.path == '/api/system_packs/replace_audio':
                msg = BytesParser(policy=default).parsebytes(b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + body)
                arquivo = None; pasta_dest = '/sys/a/'; new_file_bytes = None
                for part in msg.walk():
                    if part.get_content_disposition() != 'form-data': continue
                    name = part.get_param('name', header='content-disposition')
                    if name == 'arquivo': arquivo = part.get_content().strip()
                    elif name == 'pasta_destino': pasta_dest = part.get_content().strip()
                    elif name == 'file': new_file_bytes = part.get_payload(decode=True)

                if not arquivo or not new_file_bytes: raise ValueError('Arquivo ou dados ausentes.')
                tmp_wav = ROOT / 'temp_cut_sys.wav'
                tmp_wav.write_bytes(new_file_bytes)

                dest_repo = REPO_SYSTEM_DIR / arquivo
                dest_sd = (SD_DIR / pasta_dest.strip('/')) / arquivo
                convert_audio_to_fefo_standard(tmp_wav, dest_repo)
                shutil.copy2(dest_repo, dest_sd)
                if tmp_wav.exists(): tmp_wav.unlink()

                result = {'ok': True, 'message': f'✓ Trecho cortado salvo com sucesso em {arquivo}!'}

            elif self.path == '/api/system_packs/delete_sound':
                payload = json.loads(body.decode('utf-8'))
                arquivo = payload.get('arquivo')
                pasta_dest = payload.get('pasta_destino', '/sys/a/')
                f_sd = (SD_DIR / pasta_dest.strip('/')) / arquivo
                f_repo = REPO_SYSTEM_DIR / arquivo
                if f_sd.exists(): f_sd.unlink()
                if f_repo.exists(): f_repo.unlink()
                meta = load_json_file(SYSTEM_METADATA_FILE, {"sounds": {}})
                if arquivo in meta.get('sounds', {}):
                    del meta['sounds'][arquivo]
                    save_json_file(SYSTEM_METADATA_FILE, meta)
                result = {'ok': True, 'message': f'Som {arquivo} removido.'}

            else: raise ValueError(f'Endpoint desconhecido: {self.path}')

            data = json.dumps(result, ensure_ascii=False).encode('utf-8')
            self.send_response(200); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)

        except Exception as e:
            import traceback
            sys.stderr.write(f'[catalog_manager] Erro em {self.path}: {e}\n')
            traceback.print_exc(file=sys.stderr)
            err_data = json.dumps({'ok': False, 'message': str(e)}, ensure_ascii=False).encode('utf-8')
            self.send_response(500); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(err_data))); self.end_headers(); self.wfile.write(err_data)

    def log_message(self, format, *args):
        sys.stderr.write(f"[catalog_manager] {args[0]} - {args[1]}\n")

if __name__ == '__main__':
    os.chdir(ROOT)
    url = 'http://127.0.0.1:8765/catalog-admin/index.html'
    try:
        server = ThreadingHTTPServer(('127.0.0.1', 8765), Handler)
    except OSError as e:
        if '10048' in str(e) or 'address already in use' in str(e).lower():
            print(f'[Aviso] O Administrador de Catálogo já está em execução!')
            print(f'Abrindo no navegador: {url}')
            try: webbrowser.open(url)
            except Exception: pass
            sys.exit(0)
        raise e

    print(f'Administrador do Catálogo FEFO Pet em execução: {url}')
    try: webbrowser.open(url)
    except Exception: pass
    while True:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor encerrado.")
            break
        except Exception as e:
            sys.stderr.write(f'[catalog_manager] Aviso no servidor: {e}\n')
            time.sleep(0.5)
