# ==============================================================================
# SERVIDOR DA API LOCAL DE SÍNTESE DE VOZ IA DO FEFO - MOTOR EXCLUSIVO F5-TTS
# (Suporte a F5-TTS Base Oficial para fidelidade do mascote + PT-BR + Reconhecimento)
# ==============================================================================
import os
import sys
import time
import uuid
import base64
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Patch torchaudio.load para usar soundfile no Windows (evita erro de torchcodec/FFmpeg DLLs ausentes)
try:
    import soundfile as sf
    import torch
    import torchaudio

    def _soundfile_load(uri, *args, **kwargs):
        data, sr = sf.read(str(uri), dtype='float32')
        if data.ndim == 1:
            tensor = torch.from_numpy(data).unsqueeze(0)
        else:
            tensor = torch.from_numpy(data.T)
        return tensor, sr

    torchaudio.load = _soundfile_load
except Exception as _patch_err:
    print(f'[Aviso] Falha ao aplicar patch soundfile no torchaudio: {_patch_err}')

# Inicializacao do FastAPI
app = FastAPI(
    title="FEFO F5-TTS AI Voice Server",
    description="Motor de clonagem de voz Zero-Shot com F5-TTS Base Oficial e PT-BR para o FEFO",
    version="2.1.0"
)

# CORS irrestrito para comunicacao com o painel admin (localhost:8765 ou arquivo local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton dos modelos F5-TTS
_f5_instances = {}
_model_loading = False

def get_device() -> str:
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch, "xpu") and torch.xpu.is_available():
            return "xpu"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"

def get_f5_model(model_name: str = "base"):
    global _f5_instances, _model_loading
    m_key = "pt-br" if (model_name and "pt" in model_name.lower()) else "base"
    if m_key in _f5_instances:
        return _f5_instances[m_key]
    _model_loading = True
    try:
        from f5_tts.api import F5TTS
        device = get_device()
        if m_key == "pt-br":
            print(f"[F5-TTS] Carregando modelo PT-BR (firstpixel/F5-TTS-pt-br) no {device}...")
            from huggingface_hub import hf_hub_download
            ptbr_ckpt = hf_hub_download(repo_id="firstpixel/F5-TTS-pt-br", filename="pt-br/model_last.safetensors")
            inst = F5TTS(model="F5TTS_v1_Base", ckpt_file=ptbr_ckpt, device=device)
            print("[F5-TTS] Modelo PT-BR carregado!")
        else:
            print(f"[F5-TTS] Carregando modelo Base Oficial F5-TTS (fidelidade máxima ao timbre e agudos do mascote) no {device}...")
            inst = F5TTS(model="F5TTS_v1_Base", device=device)
            print("[F5-TTS] Modelo Base Oficial carregado!")
        _f5_instances[m_key] = inst
        return inst
    finally:
        _model_loading = False

DEFAULT_REF_TEXT = "Bom dia, hora de acordar. Hora do lanche! Parabéns, você completou sua missão."

class GenerateRequest(BaseModel):
    text: str
    ref_audio: Optional[str] = None          # Base64 string, data URI ou caminho de arquivo
    ref_text: Optional[str] = ""             # Transcricao do audio de referencia (opcional)
    model: Optional[str] = "base"            # 'base' (fiel ao timbre caricato/agudo) ou 'pt-br'
    speed: Optional[float] = 1.0             # Velocidade da fala (0.5 a 2.0)
    remove_silence: Optional[bool] = False   # Remover silencio excessivo
    nfe_step: Optional[int] = 16            # Passos de inferencia ODE (16 a 32 para audio limpo sem som metalico)
    cfg_strength: Optional[float] = 3.0      # Intensidade CFG (3.0 para fidelidade maxima ao timbre do FEFO)
    sway_sampling_coef: Optional[float] = -1 # Coeficiente sway

class TranscribeRequest(BaseModel):
    audio: str                               # Base64 ou data URI

@app.get("/")
@app.get("/health")
@app.get("/api/f5-tts/status")
def health():
    device = get_device()
    active_model = "base" if "base" in _f5_instances else ("pt-br" if "pt-br" in _f5_instances else "none")
    return {
        "ok": True,
        "status": "online",
        "engine": "F5-TTS (Base Oficial Fiel / PT-BR)",
        "active_model": active_model,
        "github": "https://github.com/SWivid/F5-TTS",
        "device": device,
        "model_loaded": len(_f5_instances) > 0,
        "loading": _model_loading
    }

@app.post("/api/f5-tts/preload")
def preload(model: Optional[str] = "base"):
    get_f5_model(model or "base")
    return {"ok": True, "message": f"Modelo F5-TTS ({model}) carregado na memoria com sucesso."}

@app.post("/api/f5-tts/transcribe")
def transcribe_audio(req: TranscribeRequest):
    temp_path = None
    try:
        import speech_recognition as sr_mod
        temp_path = _save_ref_audio_to_temp(req.audio)
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

def _save_ref_audio_to_temp(ref_audio_str: str) -> str:
    """Extrai audio de base64 ou data URI e salva em arquivo temporario .wav"""
    if os.path.exists(ref_audio_str):
        return ref_audio_str
    
    # Remove prefixo data URI se houver
    if "," in ref_audio_str and "base64" in ref_audio_str:
        ref_audio_str = ref_audio_str.split(",", 1)[1]
    
    audio_bytes = base64.b64decode(ref_audio_str)
    
    # Criar arquivo temporario
    temp_ref = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    temp_ref.write(audio_bytes)
    temp_ref.flush()
    temp_ref.close()
    return temp_ref.name

@app.post("/api/f5-tts/generate")
def generate(req: GenerateRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Texto para sintese ausente.")

    chosen_model = req.model or "base"
    f5 = get_f5_model(chosen_model)

    temp_ref_path = None
    ref_file = None
    ref_text = (req.ref_text or "").strip()
    if not ref_text or "Olá amiguinho" in ref_text:
        ref_text = DEFAULT_REF_TEXT

    # No CPU, 16 passos eliminam o som metalico mantendo alta velocidade com audio de 3.9s a 7.5s
    nfe = int(req.nfe_step or 16)
    if get_device() == "cpu":
        nfe = min(max(nfe, 12), 20)

    repo_root = Path(__file__).resolve().parent.parent
    clean_candidate = repo_root / "repository" / "fefo_ref_clean.wav"

    try:
        if req.ref_audio:
            temp_ref_path = _save_ref_audio_to_temp(req.ref_audio)
            ref_file = temp_ref_path
        else:
            # Tentar encontrar audio de referencia padrao do FEFO no repositorio
            candidates = [
                clean_candidate,
                repo_root / "repository" / "fefo_voice_sample.wav",
                repo_root / "repository" / "audio" / "a0001.wav",
            ]
            for c in candidates:
                if c.exists():
                    ref_file = str(c)
                    break

        if not ref_file or not os.path.exists(ref_file):
            raise HTTPException(
                status_code=400,
                detail="Nenhum audio de referencia fornecido ou encontrado no repositorio."
            )

        # Arquivo temporario para a saida
        temp_out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp_out.close()
        out_wav_path = temp_out.name

        t0 = time.time()
        print(f"[F5-TTS ({chosen_model})] Sintetizando '{text[:40]}...' (ref: {ref_file}, speed: {req.speed})...")
        f5.infer(
            ref_file=ref_file,
            ref_text=ref_text,
            gen_text=text,
            speed=float(req.speed or 1.0),
            nfe_step=nfe,
            cfg_strength=float(req.cfg_strength or 3.0),
            sway_sampling_coef=float(req.sway_sampling_coef or -1),
            remove_silence=bool(req.remove_silence),
            file_wave=out_wav_path
        )
        elapsed = time.time() - t0
        print(f"[F5-TTS ({chosen_model})] Sintese concluida em {elapsed:.2f}s!")

        with open(out_wav_path, "rb") as f:
            wav_bytes = f.read()

        b64_audio = base64.b64encode(wav_bytes).decode("ascii")

        return {
            "ok": True,
            "engine": "F5-TTS",
            "model": chosen_model,
            "audio_base64": b64_audio,
            "data_uri": f"data:audio/wav;base64,{b64_audio}",
            "elapsed_seconds": round(elapsed, 2),
            "size_bytes": len(wav_bytes)
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro na sintese F5-TTS: {str(e)}")

    finally:
        if temp_ref_path and os.path.exists(temp_ref_path):
            try: os.unlink(temp_ref_path)
            except Exception: pass
        if 'out_wav_path' in locals() and os.path.exists(out_wav_path):
            try: os.unlink(out_wav_path)
            except Exception: pass

def main():
    host = "0.0.0.0"
    port = 9880
    print("=" * 60)
    print("   INICIANDO SERVIDOR F5-TTS - CLONAGEM DE VOZ IA DO FEFO")
    print("=" * 60)
    print(f"Dispositivo detectado: {get_device()}")
    print(f"Servidor disponivel em: http://127.0.0.1:{port}")
    print("Pressione Ctrl+C para encerrar.")
    print("=" * 60)
    uvicorn.run(app, host=host, port=port, log_level="info")

if __name__ == "__main__":
    main()
