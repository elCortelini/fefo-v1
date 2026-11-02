# ==============================================================================
# PIPELINE OFICIAL DE SÍNTESE DE VOZ DO MASCOTE FEFO (OPÇÃO 1 - V2 NATURAL)
# 1. Fala Nativa PT-BR (0% Sotaque) via Edge-TTS Neural Studio
# 2. Modulação Neural Nativa de Pitch e Velocidade (Zero Som Metalizado, Zero Efeito Esquilo)
# 3. Normalização de Pico e Saída WAV 24kHz 16-bit Mono (Padrão FEFO)
# ==============================================================================
import asyncio
import io
import os
import time
from pathlib import Path
from typing import Optional, Tuple

import edge_tts
import numpy as np
import pydub
import soundfile as sf

DEFAULT_VOICE = "pt-BR-ThalitaMultilingualNeural"

async def synthesize_fefo_voice(
    text: str,
    ref_audio_path: Optional[str] = None,
    voice: str = DEFAULT_VOICE,
    pitch_semitones: float = 0.0,
    pitch_hz: int = 18,
    speed: float = 1.0,
    target_sr: int = 24000
) -> Tuple[bytes, float]:
    """
    Sintetiza a voz do mascote FEFO com dicção 100% brasileira e natural.
    A modulação tonal é feita de forma nativa pelo vocoder neural, eliminando
    completamente qualquer som metalizado (phase vocoder) ou efeito de esquilo.
    """
    t0 = time.time()
    clean_text = (text or "").strip()
    if not clean_text:
        raise ValueError("Texto vazio para síntese de voz.")

    # 1. Mapeamento de velocidade e pitch para SSML Neural
    rate_pct = int(round((speed - 1.0) * 100))
    rate_str = f"{rate_pct:+d}%" if rate_pct != 0 else "+0%"

    # Se pitch_semitones vier de configurações legadas (ex: 7.0), converte para modulação suave em Hz
    if pitch_semitones > 0 and pitch_hz == 18:
        # 1 semitone ~= 3-4 Hz de elevação vocal natural
        effective_hz = int(np.clip(pitch_semitones * 2.5, 5, 30))
    else:
        effective_hz = int(np.clip(pitch_hz, -20, 40))

    pitch_str = f"{effective_hz:+d}Hz"

    # Seleção de voz suportada
    supported_voices = {
        "thalita": "pt-BR-ThalitaMultilingualNeural",
        "francisca": "pt-BR-FranciscaNeural",
        "antonio": "pt-BR-AntonioNeural"
    }
    voice_key = (voice or "").lower()
    selected_voice = DEFAULT_VOICE
    for k, v in supported_voices.items():
        if k in voice_key:
            selected_voice = v
            break
    if "neural" in voice_key:
        selected_voice = voice

    # 2. Síntese Neural Nativa de Alta Fidelidade (Microsoft Azure Speech Vocoder)
    comm = edge_tts.Communicate(
        text=clean_text,
        voice=selected_voice,
        pitch=pitch_str,
        rate=rate_str
    )
    mp3_buf = io.BytesIO()
    async for chunk in comm.stream():
        if chunk.get("type") == "audio":
            mp3_buf.write(chunk["data"])
    mp3_buf.seek(0)

    # 3. Decodificação para PCM float32 mono no sample rate desejado
    seg = pydub.AudioSegment.from_file(mp3_buf, format="mp3")
    seg = seg.set_frame_rate(target_sr).set_channels(1)
    samples = np.array(seg.get_array_of_samples(), dtype=np.float32) / 32768.0

    # 4. Normalização de Pico Suave (-0.5 dBFS)
    max_amp = np.max(np.abs(samples))
    if max_amp > 0:
        samples = (samples / max_amp) * 0.94

    # 5. Exportação WAV 24kHz 16-bit PCM (formato nativo do reprodutor FEFO)
    out_buf = io.BytesIO()
    sf.write(out_buf, samples, target_sr, format="WAV", subtype="PCM_16")
    wav_bytes = out_buf.getvalue()
    elapsed = time.time() - t0

    return wav_bytes, round(elapsed, 2)

def generate_fefo_sync(
    text: str,
    ref_audio_path: Optional[str] = None,
    voice: str = DEFAULT_VOICE,
    pitch_semitones: float = 0.0,
    pitch_hz: int = 18,
    speed: float = 1.0
) -> Tuple[bytes, float]:
    """Wrapper síncrono para os servidores HTTP"""
    return asyncio.run(synthesize_fefo_voice(
        text=text,
        ref_audio_path=ref_audio_path,
        voice=voice,
        pitch_semitones=pitch_semitones,
        pitch_hz=pitch_hz,
        speed=speed
    ))
