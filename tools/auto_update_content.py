#!/usr/bin/env python3
"""
Ferramenta de Automação de Conteúdo FEFO Pet
- Monitora FEFO_novos_conteudos/audio e FEFO_novos_conteudos/faces
- Evita re-upload/conversão por hash SHA-256
- Converte áudios para WAV PCM 16-bit Mono 22050Hz
- Converte imagens/faces para RGB565 RAW 480x320
- Atualiza sdcard/fefo.json e repository/catalog.json
- Faz commit e git push para o GitHub automaticamente
"""

import csv
import json
import os
import re
import struct
import sys
from hashlib import sha256
from pathlib import Path
from subprocess import run, CalledProcessError

try:
    from PIL import Image
except ImportError:
    print("Biblioteca Pillow não instalada. Instalando...")
    run([sys.executable, "-m", "pip", "install", "Pillow"], check=True)
    from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TOOLS_DIR = ROOT / 'tools'
INBOX_DIR = ROOT / 'FEFO_novos_conteudos'
AUDIO_INBOX = INBOX_DIR / 'audio'
FACES_INBOX = INBOX_DIR / 'faces'
VIDEO_INBOX = INBOX_DIR / 'video'

CSV_FILE = INBOX_DIR / 'Catalogo_Online_Planilha.csv'
CSV_FILE_LEGACY = INBOX_DIR / 'metadados_conteudo.csv'

TRACKER_FILE = TOOLS_DIR / '.content_tracker.json'

SDCARD_DIR = ROOT / 'fefo_firmware' / 'sdcard'
SD_AUDIO_DIR = SDCARD_DIR / 'usr' / 'a'
SD_FACES_DIR = SDCARD_DIR / 'usr' / 'f'
SD_VIDEO_DIR = SDCARD_DIR / 'usr' / 'v'
SD_JSON = SDCARD_DIR / 'fefo.json'

REPO_DIR = ROOT / 'repository'
REPO_AUDIO_DIR = REPO_DIR / 'audio'
REPO_FACES_DIR = REPO_DIR / 'faces'
REPO_VIDEO_DIR = REPO_DIR / 'video'
REPO_JSON = REPO_DIR / 'catalog.json'

TARGET_WIDTH = 480
TARGET_HEIGHT = 320

AUDIO_EXTENSIONS = {'.wav', '.mp3', '.flac', '.ogg', '.m4a', '.mpeg', '.mpg'}
FACE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.raw', '.bin'}
VIDEO_EXTENSIONS = {'.mp4', '.mkv', '.avi', '.mov', '.webm'}


def detect_type_by_extension(ext: str) -> str:
    ext = f".{ext.lstrip('.')}".lower()
    if ext in AUDIO_EXTENSIONS:
        return 'audio'
    elif ext in FACE_EXTENSIONS:
        return 'face'
    elif ext in VIDEO_EXTENSIONS:
        return 'video'
    return 'audio'


def load_metadata_csv() -> dict:
    metadata = {}
    csv_path = CSV_FILE if CSV_FILE.exists() else (CSV_FILE_LEGACY if CSV_FILE_LEGACY.exists() else None)
    if not csv_path:
        return metadata

    encodings = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']
    content = None
    for enc in encodings:
        try:
            with open(csv_path, 'r', encoding=enc) as f:
                content = f.read()
                break
        except UnicodeDecodeError:
            continue

    if not content:
        return metadata

    delimiter = ';' if ';' in content else ','
    reader = csv.DictReader(content.splitlines(), delimiter=delimiter)
    for row in reader:
        clean_row = {(k.strip() if k else ''): (v.strip() if v else '') for k, v in row.items()}
        filename = clean_row.get('arquivo_origem', '').strip().lower()
        if filename:
            ext = clean_row.get('extensao', '').strip().lower()
            if not ext and '.' in filename:
                ext = filename.rsplit('.', 1)[-1]
                clean_row['extensao'] = ext

            tipo = clean_row.get('tipo', '').strip().lower()
            if not tipo:
                tipo = detect_type_by_extension(ext)
                clean_row['tipo'] = tipo

            metadata[filename] = clean_row
    return metadata


def append_to_metadata_csv(new_entries: list):
    """
    Adiciona novos itens processados à planilha Catalogo_Online_Planilha.csv
    sem sobrescrever o que já existe.
    """
    if not new_entries:
        return

    csv_path = CSV_FILE
    file_exists = csv_path.exists()
    fieldnames = ['arquivo_origem', 'titulo', 'menu_principal', 'submenu', 'tipo', 'extensao', 'publicar', 'observacoes']

    with open(csv_path, 'a', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';')
        if not file_exists or csv_path.stat().st_size == 0:
            writer.writeheader()

        for entry in new_entries:
            writer.writerow({
                'arquivo_origem': entry.get('arquivo_origem', ''),
                'titulo': entry.get('titulo', ''),
                'menu_principal': entry.get('menu_principal', ''),
                'submenu': entry.get('submenu', ''),
                'tipo': entry.get('tipo', 'audio'),
                'extensao': entry.get('extensao', ''),
                'publicar': entry.get('publicar', 'Sim'),
                'observacoes': entry.get('observacoes', 'Cadastrado automaticamente')
            })
    print(f"  [PLANILHA ATUALIZADA] {len(new_entries)} novo(s) item(ns) inserido(s) em {csv_path.name}")


def parse_filename(stem: str):
    """
    Regra de títulos e menus:
    - Sem hífen: Titulo ("Jukebox do Fefo")
    - 1 hífen: Menu-Titulo
    - 2 hífens: Menu-Submenu-Titulo
    - >2 hífens: Menu-Submenu1-Submenu2-Titulo
    Retorna (menu_principal, submenu, titulo, menu_path_completo)
    """
    parts = [p.strip() for p in stem.split('-') if p.strip()]
    if len(parts) == 1:
        return "Jukebox do Fefo", "", parts[0], "Jukebox do Fefo"
    elif len(parts) == 2:
        return parts[0], "", parts[1], parts[0]
    elif len(parts) == 3:
        menu_path = f"{parts[0]} > {parts[1]}"
        return parts[0], parts[1], parts[2], menu_path
    else:
        menu_principal = parts[0]
        submenu = " > ".join(parts[1:-1])
        title = parts[-1]
        menu_path = f"{menu_principal} > {submenu}"
        return menu_principal, submenu, title, menu_path



def get_next_audio_index() -> int:
    max_idx = 0
    if SD_AUDIO_DIR.exists():
        for p in SD_AUDIO_DIR.glob('a*.wav'):
            match = re.search(r'a(\d{4})\.wav$', p.name, re.IGNORECASE)
            if match:
                max_idx = max(max_idx, int(match.group(1)))
    return max_idx + 1


def get_next_face_index() -> int:
    max_idx = 0
    if SD_FACES_DIR.exists():
        for p in SD_FACES_DIR.glob('f*.raw'):
            match = re.search(r'f(\d{4})\.raw$', p.name, re.IGNORECASE)
            if match:
                max_idx = max(max_idx, int(match.group(1)))
    return max_idx + 1


def convert_audio(src_path: Path, dest_path: Path):
    print(f"  [CONVERTENDO ÁUDIO] {src_path.name} -> {dest_path.name}")
    cmd = [
        'ffmpeg',
        '-hide_banner',
        '-loglevel', 'error',
        '-y',
        '-i', str(src_path),
        '-vn',
        '-ac', '1',
        '-ar', '22050',
        '-c:a', 'pcm_s16le',
        str(dest_path)
    ]
    run(cmd, check=True)


def get_next_video_index() -> int:
    max_idx = 0
    if SD_VIDEO_DIR.exists():
        for p in SD_VIDEO_DIR.glob('v*.mp4'):
            match = re.search(r'v(\d{4})\.mp4$', p.name, re.IGNORECASE)
            if match:
                max_idx = max(max_idx, int(match.group(1)))
    return max_idx + 1


def convert_video(src_path: Path, dest_path: Path):
    print(f"  [PROCESSANDO VÍDEO] {src_path.name} -> {dest_path.name}")
    # Copia diretamente ou ajusta formato via ffmpeg se necessário
    if src_path.suffix.lower() == '.mp4':
        dest_path.write_bytes(src_path.read_bytes())
    else:
        cmd = [
            'ffmpeg',
            '-hide_banner',
            '-loglevel', 'error',
            '-y',
            '-i', str(src_path),
            '-c:v', 'libx264',
            '-c:a', 'aac',
            str(dest_path)
        ]
        run(cmd, check=True)


def update_catalog_files(new_audios: list, new_faces: list, new_videos: list = None):
    if new_videos is None:
        new_videos = []
    if not new_audios and not new_faces and not new_videos:
        return

    # 1. sdcard/fefo.json
    sd_data = {"schema": 1, "catalogVersion": 1, "menus": [{"id": "jukebox_fefo", "titulo": "Jukebox do Fefo"}], "faces": [], "audio": [], "videos": [], "activities": []}
    if SD_JSON.exists():
        with open(SD_JSON, 'r', encoding='utf-8') as f:
            sd_data = json.load(f)

    sd_data["catalogVersion"] = int(sd_data.get("catalogVersion", 1)) + 1
    if "videos" not in sd_data:
        sd_data["videos"] = []

    for a in new_audios:
        sd_data["audio"].append({
            "id": a["id"],
            "titulo": a["titulo"],
            "menu": a["menu"],
            "arquivo": a["arquivo"],
            "tamanho": a["tamanho"],
            "checksum": a["checksum"]
        })

    for f in new_faces:
        sd_data["faces"].append({
            "id": f["id"],
            "arquivo": f["arquivo"],
            "tamanho": f["tamanho"],
            "checksum": f["checksum"]
        })

    for v in new_videos:
        sd_data["videos"].append({
            "id": v["id"],
            "titulo": v["titulo"],
            "menu": v["menu"],
            "arquivo": v["arquivo"],
            "tamanho": v["tamanho"],
            "checksum": v["checksum"]
        })

    with open(SD_JSON, 'w', encoding='utf-8') as f:
        json.dump(sd_data, f, indent=2, ensure_ascii=False)
    print(f"  [ATUALIZADO] {SD_JSON.relative_to(ROOT)}")

    # 2. repository/catalog.json
    repo_data = {}
    if REPO_JSON.exists():
        with open(REPO_JSON, 'r', encoding='utf-8') as f:
            repo_data = json.load(f)

    repo_data["catalogVersion"] = int(repo_data.get("catalogVersion", 1)) + 1
    if "audio" not in repo_data:
        repo_data["audio"] = []
    if "faces" not in repo_data:
        repo_data["faces"] = []
    if "videos" not in repo_data:
        repo_data["videos"] = []

    repo_base_url = "https://raw.githubusercontent.com/elCortelini/fefo-v1/main/repository"

    for a in new_audios:
        repo_data["audio"].append({
            "id": a["id"],
            "titulo": a["titulo"],
            "menu": a["menu"],
            "arquivo": a["arquivo"],
            "tamanho": a["tamanho"],
            "checksum": a["checksum"],
            "tipo": "audio",
            "url": f"{repo_base_url}/audio/{Path(a['arquivo']).name}"
        })

    for f in new_faces:
        repo_data["faces"].append({
            "id": f["id"],
            "arquivo": f["arquivo"],
            "tamanho": f["tamanho"],
            "checksum": f["checksum"],
            "tipo": "face",
            "url": f"{repo_base_url}/faces/{Path(f['arquivo']).name}"
        })

    for v in new_videos:
        repo_data["videos"].append({
            "id": v["id"],
            "titulo": v["titulo"],
            "menu": v["menu"],
            "arquivo": v["arquivo"],
            "tamanho": v["tamanho"],
            "checksum": v["checksum"],
            "tipo": "video",
            "url": f"{repo_base_url}/video/{Path(v['arquivo']).name}"
        })

    with open(REPO_JSON, 'w', encoding='utf-8') as f:
        json.dump(repo_data, f, indent=2, ensure_ascii=False)
    print(f"  [ATUALIZADO] {REPO_JSON.relative_to(ROOT)}")



def git_push_changes(added_summary: list):
    print("\n--- SINCRONIZANDO COM O GITHUB ---")
    try:
        run(['git', 'add', '-A'], cwd=ROOT, check=True)

        status_out = run(['git', 'status', '--porcelain'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
        if not status_out.strip():
            print("Nenhuma alteração pendente para commit.")
            return

        commit_msg = "feat(catalog): atualização de conteúdos do FEFO Pet\n\n" + "\n".join(added_summary)
        run(['git', 'commit', '-m', commit_msg], cwd=ROOT, check=True)
        print("Commit realizado com sucesso.")

        print("Enviando para o repositório remoto (git push origin main)...")
        run(['git', 'push', 'origin', 'main'], cwd=ROOT, check=True)
        print(">>> PUSH CONCLUÍDO COM SUCESSO! Conteúdos disponíveis online no GitHub. <<<")
    except CalledProcessError as e:
        print(f"ERRO durante a sincronização com o Git: {e}")


def main():
    AUDIO_INBOX.mkdir(parents=True, exist_ok=True)
    FACES_INBOX.mkdir(parents=True, exist_ok=True)
    VIDEO_INBOX.mkdir(parents=True, exist_ok=True)
    SD_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    SD_FACES_DIR.mkdir(parents=True, exist_ok=True)
    SD_VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    REPO_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    REPO_FACES_DIR.mkdir(parents=True, exist_ok=True)
    REPO_VIDEO_DIR.mkdir(parents=True, exist_ok=True)

    tracker = load_tracker()
    processed_hashes = tracker.get("processed_hashes", {})
    metadata_map = load_metadata_csv()
    if metadata_map:
        print(f"[INFO] Planilha de metadados carregada com {len(metadata_map)} item(ns).")

    print("==================================================")
    print("  AUTOMAÇÃO DE ATUALIZAÇÃO DE CONTEÚDO FEFO PET")
    print("==================================================")

    audio_files = sorted([p for p in AUDIO_INBOX.iterdir() if p.is_file() and p.suffix.lower() in AUDIO_EXTENSIONS])
    face_files = sorted([p for p in FACES_INBOX.iterdir() if p.is_file() and p.suffix.lower() in FACE_EXTENSIONS])
    video_files = sorted([p for p in VIDEO_INBOX.iterdir() if p.is_file() and p.suffix.lower() in VIDEO_EXTENSIONS])

    new_audios = []
    new_faces = []
    new_videos = []
    new_csv_rows = []
    added_summary = []

    audio_idx = get_next_audio_index()
    face_idx = get_next_face_index()
    video_idx = get_next_video_index()

    # Processar Áudios
    for src in audio_files:
        src_hash = get_file_hash(src)
        if src_hash in processed_hashes:
            print(f"[IGNORADO] Áudio '{src.name}' já foi processado anteriormente.")
            continue

        meta = metadata_map.get(src.name.lower(), {})
        publicar = meta.get('publicar', 'Sim').strip().lower()
        if publicar in ('não', 'nao', 'false', '0', 'n'):
            print(f"[IGNORADO - CSV] Áudio '{src.name}' marcado para NÃO publicar.")
            continue

        titulo_meta = meta.get('titulo')
        menu_principal = meta.get('menu_principal')
        submenu = meta.get('submenu')

        if titulo_meta:
            titulo = titulo_meta
            if menu_principal and submenu:
                menu = f"{menu_principal} > {submenu}"
            elif menu_principal:
                menu = menu_principal
            else:
                _, _, _, menu = parse_filename(src.stem)
        else:
            menu_principal, submenu, titulo, menu = parse_filename(src.stem)
            new_csv_rows.append({
                'arquivo_origem': src.name,
                'titulo': titulo,
                'menu_principal': menu_principal,
                'submenu': submenu,
                'tipo': 'audio',
                'extensao': src.suffix.lstrip('.'),
                'publicar': 'Sim',
                'observacoes': 'Gerado automaticamente pelo script'
            })

        file_name = f"a{audio_idx:04d}.wav"
        au_id = f"au{audio_idx:03d}"

        sd_dest = SD_AUDIO_DIR / file_name
        repo_dest = REPO_AUDIO_DIR / file_name

        convert_audio(src, sd_dest)
        # Copiar para repository/audio
        repo_dest.write_bytes(sd_dest.read_bytes())

        size = sd_dest.stat().st_size
        conv_checksum = get_file_hash(sd_dest)

        item = {
            "id": au_id,
            "titulo": titulo,
            "menu": menu,
            "arquivo": f"/usr/a/{file_name}",
            "tamanho": size,
            "checksum": conv_checksum
        }
        new_audios.append(item)
        processed_hashes[src_hash] = {"type": "audio", "name": src.name, "id": au_id, "out": file_name}
        added_summary.append(f"- Áudio: '{titulo}' (Menu: '{menu}') -> {file_name}")
        print(f"  -> Processado: ID {au_id} | Menu: '{menu}' | Título: '{titulo}'")
        audio_idx += 1

    # Processar Faces
    for src in face_files:
        src_hash = get_file_hash(src)
        if src_hash in processed_hashes:
            print(f"[IGNORADO] Face '{src.name}' já foi processada anteriormente.")
            continue

        meta = metadata_map.get(src.name.lower(), {})
        publicar = meta.get('publicar', 'Sim').strip().lower()
        if publicar in ('não', 'nao', 'false', '0', 'n'):
            print(f"[IGNORADO - CSV] Face '{src.name}' marcada para NÃO publicar.")
            continue

        if src.name.lower() not in metadata_map:
            new_csv_rows.append({
                'arquivo_origem': src.name,
                'titulo': src.stem,
                'menu_principal': 'Faces',
                'submenu': '',
                'tipo': 'face',
                'extensao': src.suffix.lstrip('.'),
                'publicar': 'Sim',
                'observacoes': 'Gerada automaticamente pelo script'
            })

        file_name = f"f{face_idx:04d}.raw"
        fa_id = f"fa{face_idx:03d}"

        sd_dest = SD_FACES_DIR / file_name
        repo_dest = REPO_FACES_DIR / file_name

        convert_face(src, sd_dest)
        repo_dest.write_bytes(sd_dest.read_bytes())

        size = sd_dest.stat().st_size
        conv_checksum = get_file_hash(sd_dest)

        item = {
            "id": fa_id,
            "arquivo": f"/usr/f/{file_name}",
            "tamanho": size,
            "checksum": conv_checksum
        }
        new_faces.append(item)
        processed_hashes[src_hash] = {"type": "face", "name": src.name, "id": fa_id, "out": file_name}
        added_summary.append(f"- Face: '{src.name}' -> {file_name}")
        print(f"  -> Processada Face: ID {fa_id} | Arquivo: {file_name}")
        face_idx += 1

    # Processar Vídeos
    for src in video_files:
        src_hash = get_file_hash(src)
        if src_hash in processed_hashes:
            print(f"[IGNORADO] Vídeo '{src.name}' já foi processado anteriormente.")
            continue

        meta = metadata_map.get(src.name.lower(), {})
        publicar = meta.get('publicar', 'Sim').strip().lower()
        if publicar in ('não', 'nao', 'false', '0', 'n'):
            print(f"[IGNORADO - CSV] Vídeo '{src.name}' marcado para NÃO publicar.")
            continue

        titulo_meta = meta.get('titulo')
        menu_principal = meta.get('menu_principal')
        submenu = meta.get('submenu')

        if titulo_meta:
            titulo = titulo_meta
            if menu_principal and submenu:
                menu = f"{menu_principal} > {submenu}"
            elif menu_principal:
                menu = menu_principal
            else:
                _, _, _, menu = parse_filename(src.stem)
        else:
            menu_principal, submenu, titulo, menu = parse_filename(src.stem)
            new_csv_rows.append({
                'arquivo_origem': src.name,
                'titulo': titulo,
                'menu_principal': menu_principal,
                'submenu': submenu,
                'tipo': 'video',
                'extensao': src.suffix.lstrip('.'),
                'publicar': 'Sim',
                'observacoes': 'Gerado automaticamente pelo script'
            })

        file_name = f"v{video_idx:04d}.mp4"
        vi_id = f"vi{video_idx:03d}"

        sd_dest = SD_VIDEO_DIR / file_name
        repo_dest = REPO_VIDEO_DIR / file_name

        convert_video(src, sd_dest)
        repo_dest.write_bytes(sd_dest.read_bytes())

        size = sd_dest.stat().st_size
        conv_checksum = get_file_hash(sd_dest)

        item = {
            "id": vi_id,
            "titulo": titulo,
            "menu": menu,
            "arquivo": f"/usr/v/{file_name}",
            "tamanho": size,
            "checksum": conv_checksum
        }
        new_videos.append(item)
        processed_hashes[src_hash] = {"type": "video", "name": src.name, "id": vi_id, "out": file_name}
        added_summary.append(f"- Vídeo: '{titulo}' (Menu: '{menu}') -> {file_name}")
        print(f"  -> Processado Vídeo: ID {vi_id} | Menu: '{menu}' | Título: '{titulo}'")
        video_idx += 1

    # Atualizar catálogos, planilha e tracker
    if new_audios or new_faces or new_videos:
        append_to_metadata_csv(new_csv_rows)
        update_catalog_files(new_audios, new_faces, new_videos)
        tracker["processed_hashes"] = processed_hashes
        save_tracker(tracker)
        git_push_changes(added_summary)
    else:
        print("\nNenhum novo arquivo de áudio, face ou vídeo para processar.")



if __name__ == '__main__':
    main()
