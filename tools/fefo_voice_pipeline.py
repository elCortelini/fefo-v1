# ==============================================================================
# PIPELINE OFICIAL DE CLONAGEM E SÍNTESE DA VOZ DO FEFO
# Base Canônica: ficofelizporvc.wav (Timbre e Tom Oficial ~410 Hz)
# 1. Se modelo treinado (models/fefo_model.safetensors) existir: executa F5-TTS Treinado
# 2. Caso contrário: executa Síntese PT-BR calibrada via Praat PSOLA (Pitch 410 Hz + Formant Ratio 1.16)
# ==============================================================================
import asyncio
import io
import os
import time
from pathlib import Path
from typing import Optional, Tuple

import edge_tts
import numpy as np
import parselmouth
from parselmouth.praat import call
import pydub
import soundfile as sf

REPO_ROOT = Path(__file__).resolve().parent.parent
FEFO_TRAINED_CKPT = REPO_ROOT / "models" / "fefo_model.safetensors"
DEFAULT_BASE_AUDIO = REPO_ROOT / "repository" / "ficofelizporvc.wav"

TARGET_FEFO_PITCH = 410.0      # Pitch mediano oficial de ficofelizporvc.wav (~405-410 Hz)
TARGET_FORMANT_RATIO = 1.16   # Proporção de formantes para o timbre original do FEFO

# Cache do modelo F5-TTS caso exista
_f5_model_cache = None
_vocoder_cache = None

def get_trained_f5_model():
    global _f5_model_cache, _vocoder_cache
    if _f5_model_cache is None and FEFO_TRAINED_CKPT.exists():
        try:
            import torch, torchaudio
            def safe_torchaudio_load(filepath, *args, **kwargs):
                data, sr = sf.read(str(filepath), dtype='float32')
                tensor = torch.from_numpy(data).unsqueeze(0) if data.ndim == 1 else torch.from_numpy(data.T)
                return tensor, sr
            torchaudio.load = safe_torchaudio_load

            from f5_tts.infer.utils_infer import load_model, load_vocoder
            from f5_tts.model import DiT

            dev = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"[FEFO Voice] Carregando modelo dedicado treinado: {FEFO_TRAINED_CKPT} ({dev})...")
            _vocoder_cache = load_vocoder(vocoder_name='vocos', is_local=False, device=dev)
            _f5_model_cache = load_model(
                DiT,
                dict(dim=1024, depth=22, heads=16, ff_mult=2, text_dim=512, conv_layers=4),
                str(FEFO_TRAINED_CKPT),
                mel_spec_type='vocos',
                vocab_file='',
                device=dev
            )
            print("[FEFO Voice] Modelo dedicado do FEFO carregado com sucesso!")
        except Exception as e:
            print(f"[FEFO Voice] Aviso ao carregar modelo dedicado: {e}")
            _f5_model_cache = None
    return _f5_model_cache, _vocoder_cache

async def synthesize_fefo_voice(
    text: str,
    ref_audio_path: Optional[str] = None,
    speed: float = 1.0,
    target_sr: int = 24000,
    **kwargs
) -> Tuple[bytes, float]:
    """
    Sintetiza a voz do mascote FEFO com máxima fidelidade.
    Se o modelo treinado (models/fefo_model.safetensors) estiver presente, usa-o diretamente.
    Caso contrário, sintetiza com a calibração acústica Praat PSOLA no tom e formantes de ficofelizporvc.wav.
    """
    t0 = time.time()
    clean_text = (text or "").strip()
    if not clean_text:
        raise ValueError("Texto vazio para síntese de voz.")

    # Prioridade 1: Modelo Dedicado Treinado do FEFO
    f5_model, vocoder = get_trained_f5_model()
    if f5_model is not None and vocoder is not None:
        try:
            import torch
            from f5_tts.infer.utils_infer import infer_process, preprocess_ref_audio_text
            dev = "cuda" if torch.cuda.is_available() else "cpu"

            ref_audio = ref_audio_path if (ref_audio_path and os.path.exists(ref_audio_path)) else str(DEFAULT_BASE_AUDIO)
            ref_text = "fico feliz por você. fefo ama ver você sorrir e conquistar suas metas"

            ref_audio_prep, ref_text_prep = preprocess_ref_audio_text(ref_audio, ref_text)
            wav, sr, _ = infer_process(
                ref_audio_prep,
                ref_text_prep,
                clean_text,
                f5_model,
                vocoder=vocoder,
                mel_spec_type='vocos',
                target_rms=0.15,
                cross_fade_duration=0.15,
                nfe_step=16,
                cfg_strength=2.0,
                sway_sampling_coef=-1.0,
                speed=speed,
                device=dev
            )
            out_buf = io.BytesIO()
            sf.write(out_buf, wav, sr, format="WAV", subtype="PCM_16")
            return out_buf.getvalue(), round(time.time() - t0, 2)
        except Exception as e:
            print(f"[FEFO Voice] Falha na síntese do modelo treinado, usando fallback PSOLA: {e}")

    # Prioridade 2: Síntese Nativa PT-BR Calibrada com Praat PSOLA
    rate_pct = int(round((speed - 1.0) * 100))
    rate_str = f"{rate_pct:+d}%" if rate_pct != 0 else "+0%"

    comm = edge_tts.Communicate(
        text=clean_text,
        voice="pt-BR-ThalitaMultilingualNeural",
        pitch="+0Hz",
        rate=rate_str
    )
    mp3_buf = io.BytesIO()
    async for chunk in comm.stream():
        if chunk.get("type") == "audio":
            mp3_buf.write(chunk["data"])
    mp3_buf.seek(0)

    seg = pydub.AudioSegment.from_file(mp3_buf, format="mp3")
    seg = seg.set_frame_rate(target_sr).set_channels(1)
    samples = np.array(seg.get_array_of_samples(), dtype=np.float64) / 32768.0

    snd = parselmouth.Sound(samples, sampling_frequency=float(target_sr))
    mascot_snd = call(
        snd,
        "Change gender",
        80.0,
        600.0,
        TARGET_FORMANT_RATIO,
        TARGET_FEFO_PITCH,
        1.0,
        1.0
    )

    out_samples = mascot_snd.values[0]
    max_amp = np.max(np.abs(out_samples))
    if max_amp > 0:
        out_samples = (out_samples / max_amp) * 0.94

    out_buf = io.BytesIO()
    sf.write(out_buf, out_samples, target_sr, format="WAV", subtype="PCM_16")
    return out_buf.getvalue(), round(time.time() - t0, 2)

def generate_fefo_sync(
    text: str,
    ref_audio_path: Optional[str] = None,
    speed: float = 1.0,
    **kwargs
) -> Tuple[bytes, float]:
    """Wrapper síncrono para os servidores HTTP"""
    return asyncio.run(synthesize_fefo_voice(
        text=text,
        ref_audio_path=ref_audio_path,
        speed=speed
    ))
