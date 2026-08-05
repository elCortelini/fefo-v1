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

TRACKER_FILE = TOOLS_DIR / '.content_tracker.json'

SDCARD_DIR = ROOT / 'sdcard'
SD_AUDIO_DIR = SDCARD_DIR / 'usr' / 'a'
SD_FACES_DIR = SDCARD_DIR / 'usr' / 'f'
SD_JSON = SDCARD_DIR / 'fefo.json'

REPO_DIR = ROOT / 'repository'
REPO_AUDIO_DIR = REPO_DIR / 'audio'
REPO_FACES_DIR = REPO_DIR / 'faces'
REPO_JSON = REPO_DIR / 'catalog.json'

TARGET_WIDTH = 480
TARGET_HEIGHT = 320

AUDIO_EXTENSIONS = {'.wav', '.mp3', '.flac', '.ogg', '.m4a', '.mpeg', '.mpg'}
FACE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.raw', '.bin'}


def get_file_hash(path: Path) -> str:
    h = sha256()
    with open(path, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def load_tracker() -> dict:
    if TRACKER_FILE.exists():
        try:
            with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {"processed_hashes": {}}


def save_tracker(tracker_data: dict):
    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(tracker_data, f, indent=2, ensure_ascii=False)


def parse_filename(stem: str):
    """
    Regra de títulos e menus:
    - Sem hífen: Titulo ("Jukebox do Fefo")
    - 1 hífen: Menu-Titulo
    - 2 hífens: Menu-Submenu-Titulo
    - >2 hífens: Menu > Submenu1 > Submenu2 - Titulo
    """
    parts = [p.strip() for p in stem.split('-') if p.strip()]
    if len(parts) == 1:
        return "Jukebox do Fefo", parts[0]
    elif len(parts) == 2:
        return parts[0], parts[1]
    else:
        menu_path = " > ".join(parts[:-1])
        title = parts[-1]
        return menu_path, title


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


def convert_face(src_path: Path, dest_path: Path):
    print(f"  [CONVERTENDO FACE] {src_path.name} -> {dest_path.name}")
    if src_path.suffix.lower() in ('.raw', '.bin'):
        dest_path.write_bytes(src_path.read_bytes())
        return

    with Image.open(src_path) as img:
        img = img.convert('RGB')
        img = img.resize((TARGET_WIDTH, TARGET_HEIGHT), Image.LANCZOS)
        with open(dest_path, 'wb') as f:
            for y in range(TARGET_HEIGHT):
                for x in range(TARGET_WIDTH):
                    r, g, b = img.getpixel((x, y))
                    rgb565 = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
                    f.write(struct.pack('<H', rgb565))


def update_catalog_files(new_audios: list, new_faces: list):
    if not new_audios and not new_faces:
        return

    # 1. sdcard/fefo.json
    sd_data = {"schema": 1, "catalogVersion": 1, "menus": [{"id": "jukebox_fefo", "titulo": "Jukebox do Fefo"}], "faces": [], "audio": [], "activities": []}
    if SD_JSON.exists():
        with open(SD_JSON, 'r', encoding='utf-8') as f:
            sd_data = json.load(f)

    sd_data["catalogVersion"] = int(sd_data.get("catalogVersion", 1)) + 1

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
    SD_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    SD_FACES_DIR.mkdir(parents=True, exist_ok=True)
    REPO_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    REPO_FACES_DIR.mkdir(parents=True, exist_ok=True)

    tracker = load_tracker()
    processed_hashes = tracker.get("processed_hashes", {})

    print("==================================================")
    print("  AUTOMAÇÃO DE ATUALIZAÇÃO DE CONTEÚDO FEFO PET")
    print("==================================================")

    audio_files = sorted([p for p in AUDIO_INBOX.iterdir() if p.is_file() and p.suffix.lower() in AUDIO_EXTENSIONS])
    face_files = sorted([p for p in FACES_INBOX.iterdir() if p.is_file() and p.suffix.lower() in FACE_EXTENSIONS])

    new_audios = []
    new_faces = []
    added_summary = []

    audio_idx = get_next_audio_index()
    face_idx = get_next_face_index()

    # Processar Áudios
    for src in audio_files:
        src_hash = get_file_hash(src)
        if src_hash in processed_hashes:
            print(f"[IGNORADO] Áudio '{src.name}' já foi processado anteriormente.")
            continue

        menu, titulo = parse_filename(src.stem)
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

    # Atualizar catálogos e tracker
    if new_audios or new_faces:
        update_catalog_files(new_audios, new_faces)
        tracker["processed_hashes"] = processed_hashes
        save_tracker(tracker)
        git_push_changes(added_summary)
    else:
        print("\nNenhum novo arquivo de áudio ou face para processar.")


if __name__ == '__main__':
    main()
