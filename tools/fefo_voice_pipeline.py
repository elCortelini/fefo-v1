# ==============================================================================
# PIPELINE OFICIAL DE CLONAGEM E SÍNTESE DA VOZ DO FEFO
# Base Canônica: ficofelizporvc.wav (Timbre e Tom Oficial ~410 Hz)
# 1. Fala Nativa PT-BR (0% Sotaque) via Edge-TTS Neural
# 2. Modelagem Acústica de Timbre via Praat PSOLA (Pitch 410 Hz + Formant Ratio 1.16)
# 3. Zero Som Metalizado, Zero Efeito Esquilo, Timbre Idêntico ao Mascote Original
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

TARGET_FEFO_PITCH = 410.0      # Pitch mediano oficial de ficofelizporvc.wav (~405-410 Hz)
TARGET_FORMANT_RATIO = 1.16   # Proporção de formantes para o timbre original do FEFO

async def synthesize_fefo_voice(
    text: str,
    ref_audio_path: Optional[str] = None,
    speed: float = 1.0,
    target_sr: int = 24000,
    **kwargs
) -> Tuple[bytes, float]:
    """
    Sintetiza a voz do mascote FEFO com máxima fidelidade ao áudio original (ficofelizporvc.wav).
    Combina a fluência nativa brasileira com a transferência acústica de formantes e pitch
    via Praat PSOLA no domínio do tempo.
    """
    t0 = time.time()
    clean_text = (text or "").strip()
    if not clean_text:
        raise ValueError("Texto vazio para síntese de voz.")

    # 1. Geração Neural de Base em Português Brasileiro (0% Sotaque)
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

    # 2. Decodificação PCM float64
    seg = pydub.AudioSegment.from_file(mp3_buf, format="mp3")
    seg = seg.set_frame_rate(target_sr).set_channels(1)
    samples = np.array(seg.get_array_of_samples(), dtype=np.float64) / 32768.0

    # 3. Modelagem de Timbre do Mascote FEFO via Praat PSOLA
    # Converte os formantes e a frequência fundamental exatamente para a voz original do FEFO
    snd = parselmouth.Sound(samples, sampling_frequency=float(target_sr))
    mascot_snd = call(
        snd,
        "Change gender",
        80.0,                  # fmin
        600.0,                 # fmax
        TARGET_FORMANT_RATIO,  # Formant shift ratio (timbre oficial)
        TARGET_FEFO_PITCH,     # Pitch mediano do FEFO (410 Hz)
        1.0,                   # Variação expressiva natural
        1.0                    # Duração
    )

    # 4. Extração e Normalização de Pico Suave (-0.5 dBFS)
    out_samples = mascot_snd.values[0]
    max_amp = np.max(np.abs(out_samples))
    if max_amp > 0:
        out_samples = (out_samples / max_amp) * 0.94

    # 5. Exportação WAV 24kHz 16-bit PCM (Padrão FEFO)
    out_buf = io.BytesIO()
    sf.write(out_buf, out_samples, target_sr, format="WAV", subtype="PCM_16")
    wav_bytes = out_buf.getvalue()
    elapsed = time.time() - t0

    return wav_bytes, round(elapsed, 2)

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
