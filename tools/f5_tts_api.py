# ==============================================================================
# SERVIDOR DA API LOCAL DE SÍNTESE DE VOZ DO MASCOTE FEFO - PIPELINE OPÇÃO 1
# Fala Nativa em Português do Brasil (0% Sotaque) + Modelagem de Timbre do Mascote
# ==============================================================================
import os
import sys
import time
import base64
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from tools.fefo_voice_pipeline import generate_fefo_sync

app = FastAPI(
    title="FEFO Voice AI Server",
    description="Motor Oficial de Voz do FEFO: PT-BR Nativo + Modelagem de Timbre Mascote",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    text: str
    ref_audio: Optional[str] = None
    ref_text: Optional[str] = ""
    voice: Optional[str] = "pt-BR-ThalitaMultilingualNeural"
    pitch: Optional[float] = 7.0             # Semitons (+7 = registro perfeito do FEFO)
    speed: Optional[float] = 1.0

class TranscribeRequest(BaseModel):
    audio: str

@app.get("/")
@app.get("/health")
@app.get("/api/f5-tts/status")
@app.get("/api/tts/status")
def health():
    return {
        "ok": True,
        "status": "online",
        "engine": "Voz IA do FEFO (Pipeline Nativo PT-BR + Mascote)",
        "language": "pt-br",
        "voice": "pt-BR-ThalitaMultilingualNeural",
        "accent": "0% Sotaque (Nativo Brasil)",
        "device": "cpu",
        "model_loaded": True,
        "loading": False
    }

@app.post("/api/f5-tts/preload")
@app.post("/api/tts/preload")
def preload():
    return {"ok": True, "message": "Motor de Voz do FEFO pronto e ativo."}

@app.post("/api/f5-tts/transcribe")
def transcribe_audio(req: TranscribeRequest):
    temp_path = None
    try:
        import speech_recognition as sr_mod
        audio_str = req.audio
        if "," in audio_str and "base64" in audio_str:
            audio_str = audio_str.split(",", 1)[1]
        raw_b = base64.b64decode(audio_str)
        temp_f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp_f.write(raw_b)
        temp_f.flush()
        temp_f.close()
        temp_path = temp_f.name

        r = sr_mod.Recognizer()
        with sr_mod.AudioFile(temp_path) as src:
            a = r.record(src)
            text = r.recognize_google(a, language="pt-BR")
        return {"ok": True, "text": text}
    except Exception as e:
        return {"ok": False, "error": str(e), "text": ""}
    finally:
        if temp_path and os.path.exists(temp_path):
            try: os.unlink(temp_path)
            except Exception: pass

@app.post("/api/f5-tts/generate")
@app.post("/api/tts/generate")
def generate(req: GenerateRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Texto para síntese ausente.")

    temp_ref_path = None
    ref_file = None

    try:
        if req.ref_audio:
            audio_str = req.ref_audio
            if "," in audio_str and "base64" in audio_str:
                audio_str = audio_str.split(",", 1)[1]
            raw_b = base64.b64decode(audio_str)
            temp_f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            temp_f.write(raw_b)
            temp_f.flush()
            temp_f.close()
            temp_ref_path = temp_f.name
            ref_file = temp_ref_path
        else:
            for cand in [
                repo_root / "repository" / "fefo_ref_clean.wav",
                repo_root / "repository" / "fefo_voice_sample.wav",
                repo_root / "repository" / "last_used_ref.wav"
            ]:
                if cand.exists():
                    ref_file = str(cand)
                    break

        pitch_val = float(req.pitch if req.pitch is not None else 7.0)
        speed_val = float(req.speed or 1.0)
        voice_val = req.voice or "pt-BR-ThalitaMultilingualNeural"

        print(f"[FEFO Voice] Sintetizando '{text[:40]}...' (Tom: +{pitch_val} st, Velocidade: {speed_val}x)...")
        wav_bytes, elapsed = generate_fefo_sync(
            text=text,
            ref_audio_path=ref_file,
            voice=voice_val,
            pitch_semitones=pitch_val,
            speed=speed_val
        )
        print(f"[FEFO Voice] Síntese concluída em {elapsed:.2f}s!")

        b64_audio = base64.b64encode(wav_bytes).decode("ascii")

        return {
            "ok": True,
            "engine": "FEFO Voice Pipeline PT-BR",
            "audio_base64": b64_audio,
            "data_uri": f"data:audio/wav;base64,{b64_audio}",
            "elapsed_seconds": elapsed,
            "size_bytes": len(wav_bytes)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro na síntese de voz do FEFO: {str(e)}")
    finally:
        if temp_ref_path and os.path.exists(temp_ref_path):
            try: os.unlink(temp_ref_path)
            except Exception: pass

def main():
    host = "0.0.0.0"
    port = 9880
    print("=" * 60)
    print("   INICIANDO MOTOR OFICIAL DE VOZ DO FEFO (OPÇÃO 1)")
    print("   PT-BR Nativo (0% Sotaque) + Modelagem de Timbre do Mascote")
    print("=" * 60)
    print(f"Servidor disponível em: http://127.0.0.1:{port}")
    print("Pressione Ctrl+C para encerrar.")
    print("=" * 60)
    uvicorn.run(app, host=host, port=port, log_level="info")

if __name__ == "__main__":
    main()
