#!/usr/bin/env python3
import json
import os
import struct
from hashlib import sha256
from pathlib import Path
from subprocess import run, CalledProcessError

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = ROOT / 'assets'
BUILD_DIR = ROOT / 'build'
SDCARD_DIR = ROOT / 'sdcard'

AUDIO_SRC = ASSETS_DIR / 'audio'
FACES_SRC = ASSETS_DIR / 'faces'
AUDIO_OUT = BUILD_DIR / 'audio'
FACES_OUT = BUILD_DIR / 'faces'

SD_AUDIO = SDCARD_DIR / 'usr' / 'a'
SD_FACES = SDCARD_DIR / 'usr' / 'f'

TARGET_WIDTH = 480
TARGET_HEIGHT = 320

AUDIO_EXTENSIONS = {'.wav', '.flac', '.mp3', '.ogg'}
FACE_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp'}
FACE_RAW_EXTENSIONS = {'.bin', '.raw'}


def ensure_dirs():
    AUDIO_OUT.mkdir(parents=True, exist_ok=True)
    FACES_OUT.mkdir(parents=True, exist_ok=True)
    SD_AUDIO.mkdir(parents=True, exist_ok=True)
    SD_FACES.mkdir(parents=True, exist_ok=True)


def convert_audio(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)
    out_wav = AUDIO_OUT / f'{path.stem}.wav'

    print(f'Converting audio: {path.name} -> {out_wav.name}')
    run([
        'ffmpeg',
        '-y',
        '-i', str(path),
        '-ar', '22050',
        '-ac', '1',
        '-sample_fmt', 's16',
        str(out_wav),
    ], check=True)

    return out_wav


def convert_face(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)

    out_path = FACES_OUT / f'{path.stem}.raw'
    print(f'Converting face: {path.name} -> {out_path.name}')

    if path.suffix.lower() in FACE_RAW_EXTENSIONS:
        # Assume raw/bin files are already in the expected RGB565 little-endian format.
        out_path.write_bytes(path.read_bytes())
        return out_path

    with Image.open(path) as image:
        image = image.convert('RGB')
        image = image.resize((TARGET_WIDTH, TARGET_HEIGHT), Image.LANCZOS)

        with open(out_path, 'wb') as f:
            for y in range(TARGET_HEIGHT):
                for x in range(TARGET_WIDTH):
                    r, g, b = image.getpixel((x, y))
                    rgb565 = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
                    f.write(struct.pack('<H', rgb565))

    return out_path


def fingerprint(path: Path) -> str:
    h = sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def copy_to_sd(audio_index=1, face_index=1):
    print('Copying converted assets to sdcard/usr/...')
    audio_map = []
    face_map = []

    for src in sorted(AUDIO_OUT.glob('*.wav')):
        dst_name = f'a{audio_index:04d}.wav'
        dst = SD_AUDIO / dst_name
        dst.write_bytes(src.read_bytes())
        size = dst.stat().st_size
        checksum = fingerprint(dst)
        audio_map.append({'id': f'au{audio_index:03d}', 'arquivo': f'/usr/a/{dst_name}', 'tamanho': size, 'checksum': checksum})
        print(f'  copied audio {src.name} -> {dst_name}')
        audio_index += 1

    for src in sorted(FACES_OUT.glob('*.raw')):
        dst_name = f'f{face_index:04d}.raw'
        dst = SD_FACES / dst_name
        dst.write_bytes(src.read_bytes())
        size = dst.stat().st_size
        checksum = fingerprint(dst)
        face_map.append({'id': f'fa{face_index:03d}', 'arquivo': f'/usr/f/{dst_name}', 'tamanho': size, 'checksum': checksum})
        print(f'  copied face {src.name} -> {dst_name}')
        face_index += 1

    return audio_map, face_map


def build_fefo_json(audio_map, face_map):
    json_path = SDCARD_DIR / 'fefo.json'
    if json_path.exists():
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = {'schema': 1, 'catalogVersion': 1, 'audio': [], 'faces': [], 'activities': []}

    data['audio'] = audio_map
    data['faces'] = face_map

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f'Updated {json_path}')


def main():
    ensure_dirs()

    audio_files = sorted([p for p in AUDIO_SRC.iterdir() if p.suffix.lower() in AUDIO_EXTENSIONS])
    face_files = sorted([p for p in FACES_SRC.iterdir() if p.suffix.lower() in FACE_IMAGE_EXTENSIONS or p.suffix.lower() in FACE_RAW_EXTENSIONS])

    if not audio_files and not face_files:
        print('No source assets found in assets/audio or assets/faces.')
        return

    for audio in audio_files:
        convert_audio(audio)

    for face in face_files:
        convert_face(face)

    audio_map, face_map = copy_to_sd()
    build_fefo_json(audio_map, face_map)
    print('Done. Converted assets are in build/, copied to sdcard/usr/, and fefo.json is updated.')


if __name__ == '__main__':
    main()
