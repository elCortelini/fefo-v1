import os
import io
import re
import sys
import time
import zipfile
from pathlib import Path
import pydub
from pydub.silence import split_on_silence
import speech_recognition as sr

# Garante saida UTF-8 no Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

SRC_DIR = Path(r"Z:\FEFO\Materiais_Brutos_Notebook\audiosFEFO")
OUT_DIR = Path(r"Z:\FEFO\fefo_dataset")
WAVS_DIR = OUT_DIR / "wavs"
METADATA_FILE = OUT_DIR / "metadata.csv"
METADATA_JSONL = OUT_DIR / "train.jsonl"
ZIP_FILE = Path(r"Z:\FEFO\fefo_training_dataset.zip")

WAVS_DIR.mkdir(parents=True, exist_ok=True)

recognizer = sr.Recognizer()

# Lista de arquivos alvo
AUDIO_FILES = [
    "ficofelizporvc.wav",
    "respeitarcolegas.wav",
    "respirefundo.wav",
    "vamosfazerjuntos.wav",
    "VOZ base CLonar p FEFO.mp3",
    "FEFO - palavrinhas magicas - all.mp3",
    "FEFO - SIm e Não.mp3",
    "fefo fefo fefo.mp3",
    "meu corpo 1 a 12.mp3",
    "meu corpo 12 a 26.mp3",
    "rotina escolar 1 a 30.mp3",
    "desafios e brincadeiras.mp3",
    "girafa, tamandua e coruja.mp3",
    "coruja, onça e capivara.mp3",
    "cabra, ovelha, leao e macaco.mp3",
    "cao, gato, galinha e coelho.mp3",
    "rato, vaca, cavalo e porco.mp3"
]

def clean_transcript(text: str) -> str:
    t = text.strip()
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"[^\w\s\.,!\?áéíóúâêîôûãõàèìòùçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇ-]", "", t)
    return t

def transcribe_audio_chunk(chunk_wav_bytes) -> str:
    buf = io.BytesIO(chunk_wav_bytes)
    with sr.AudioFile(buf) as src:
        audio = recognizer.record(src)
    for attempt in range(3):
        try:
            res = recognizer.recognize_google(audio, language="pt-BR")
            return clean_transcript(res)
        except sr.UnknownValueError:
            return ""
        except sr.RequestError:
            time.sleep(1.5)
        except Exception:
            return ""
    return ""

def main():
    print("=" * 60)
    print("INICIANDO PREPARACAO AUTOMATIZADA DO DATASET DO FEFO")
    print(f"Diretorio fonte: {SRC_DIR}")
    print(f"Diretorio de saida: {OUT_DIR}")
    print("=" * 60)

    dataset_records = []
    chunk_index = 0
    total_audio_seconds = 0.0

    for fname in AUDIO_FILES:
        fpath = SRC_DIR / fname
        if not fpath.exists():
            continue

        print(f"\n[*] Processando: {fname}...")
        try:
            audio = pydub.AudioSegment.from_file(str(fpath))
            audio = audio.set_frame_rate(24000).set_channels(1)

            # Silencia e fatia
            chunks = split_on_silence(
                audio,
                min_silence_len=350,
                silence_thresh=audio.dBFS - 15,
                keep_silence=180
            )

            # Re-fatia se chunks forem muito longos (> 10s) ou agrupa se forem muito curtos (< 1.2s)
            processed_chunks = []
            cur_acc = pydub.AudioSegment.empty()

            for ch in chunks:
                if len(ch) < 1200:
                    cur_acc += ch
                    if len(cur_acc) >= 1500:
                        processed_chunks.append(cur_acc)
                        cur_acc = pydub.AudioSegment.empty()
                elif len(ch) > 10000:
                    # divide em pedacos de ~6s
                    for sub_start in range(0, len(ch), 6000):
                        sub = ch[sub_start:sub_start+6000]
                        if len(sub) >= 1500:
                            processed_chunks.append(sub)
                else:
                    if len(cur_acc) > 0:
                        processed_chunks.append(cur_acc)
                        cur_acc = pydub.AudioSegment.empty()
                    processed_chunks.append(ch)

            if len(cur_acc) >= 1500:
                processed_chunks.append(cur_acc)

            print(f"   -> {len(processed_chunks)} trechos identificados.")

            for i, chunk in enumerate(processed_chunks):
                dur_sec = len(chunk) / 1000.0
                if dur_sec < 1.4 or dur_sec > 11.0:
                    continue

                raw_buf = io.BytesIO()
                chunk.export(raw_buf, format="wav")
                wav_bytes = raw_buf.getvalue()

                text = transcribe_audio_chunk(wav_bytes)
                if not text or len(text.split()) < 2:
                    continue

                chunk_index += 1
                out_name = f"fefo_{chunk_index:04d}.wav"
                out_path = WAVS_DIR / out_name

                # Salva WAV 24kHz mono PCM 16-bit normalizado (-0.5 dBFS)
                norm_chunk = chunk.normalize(headroom=0.5)
                norm_chunk.export(str(out_path), format="wav")

                total_audio_seconds += dur_sec
                dataset_records.append({
                    "audio_file": f"wavs/{out_name}",
                    "text": text,
                    "duration": round(dur_sec, 2)
                })
                print(f"   [{chunk_index:03d}] {out_name} ({dur_sec:.1f}s): {text[:55]}...")

        except Exception as e:
            print(f"   [!] Erro ao processar {fname}: {e}")

    # Salva metadata.csv (formato F5-TTS: audio_file|text)
    import csv, json
    with open(METADATA_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter="|")
        writer.writerow(["audio_file", "text"])
        for r in dataset_records:
            writer.writerow([r["audio_file"], r["text"]])

    # Salva train.jsonl
    with open(METADATA_JSONL, "w", encoding="utf-8") as f:
        for r in dataset_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print("\n" + "=" * 60)
    print("CONCLUIDO COM SUCESSO!")
    print(f"Total de segmentos limpos e transcritos: {len(dataset_records)}")
    print(f"Tempo total de audio para treino: {total_audio_seconds:.1f} segundos ({total_audio_seconds/60.0:.2f} minutos)")
    print("=" * 60)

    # Compacta em fefo_training_dataset.zip
    print(f"\n[*] Compactando dataset em {ZIP_FILE}...")
    with zipfile.ZipFile(ZIP_FILE, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(METADATA_FILE, arcname="metadata.csv")
        zf.write(METADATA_JSONL, arcname="train.jsonl")
        for r in dataset_records:
            w_file = WAVS_DIR / Path(r["audio_file"]).name
            zf.write(w_file, arcname=r["audio_file"])

    zip_size_mb = os.path.getsize(ZIP_FILE) / (1024 * 1024)
    print(f"[OK] Dataset pronto! Tamanho do arquivo ZIP: {zip_size_mb:.2f} MB")

if __name__ == "__main__":
    main()
