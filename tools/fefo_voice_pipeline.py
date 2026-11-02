# ==============================================================================
# PIPELINE OFICIAL DE SÍNTESE E CLONAGEM DE VOZ DO MASCOTE FEFO (OPÇÃO 1)
# 1. Fala Nativa PT-BR (0% Sotaque) via Edge-TTS Neural Brasileiro
# 2. Conversão de Voz / Pitch & Formant Shift para Registro do Mascote (~440 Hz)
# 3. Spectral Matching EQ baseado no Áudio de Referência do FEFO
# ==============================================================================
import asyncio
import io
import os
import time
from pathlib import Path
from typing import Optional, Tuple

import edge_tts
import librosa
import numpy as np
import pydub
from scipy import signal
from scipy.ndimage import gaussian_filter1d
import soundfile as sf

async def synthesize_fefo_voice(
    text: str,
    ref_audio_path: Optional[str] = None,
    voice: str = "pt-BR-ThalitaMultilingualNeural",
    pitch_semitones: float = 7.0,
    speed: float = 1.0,
    target_sr: int = 24000
) -> Tuple[bytes, float]:
    """
    Executa a sintese neural com fala nativa brasileira (0% sotaque)
    e converte para o timbre alegre e agudo do mascote FEFO.
    """
    t0 = time.time()
    clean_text = (text or "").strip()
    if not clean_text:
        raise ValueError("Texto vazio para síntese de voz.")

    # 1. Ajuste de velocidade SSML
    rate_pct = int(round((speed - 1.0) * 100))
    rate_str = f"{rate_pct:+d}%" if rate_pct != 0 else "+0%"

    # 2. Sintese Neural Nativa PT-BR via Edge-TTS
    comm = edge_tts.Communicate(
        text=clean_text,
        voice=voice,
        pitch="+20Hz",
        rate=rate_str
    )
    mp3_buf = io.BytesIO()
    async for chunk in comm.stream():
        if chunk.get("type") == "audio":
            mp3_buf.write(chunk["data"])
    mp3_buf.seek(0)

    # 3. Decodificacao para PCM float32 24kHz mono
    seg = pydub.AudioSegment.from_file(mp3_buf, format="mp3")
    seg = seg.set_frame_rate(target_sr).set_channels(1)
    samples = np.array(seg.get_array_of_samples(), dtype=np.float32) / 32768.0

    # 4. Modelagem de Timbre do Mascote (Pitch Shift para faixa de 430-450 Hz)
    if pitch_semitones != 0:
        y_mascot = librosa.effects.pitch_shift(samples, sr=target_sr, n_steps=pitch_semitones)
    else:
        y_mascot = samples

    # 5. Spectral Matching EQ: Mapeia o envelope espectral para a assinatura do FEFO
    if ref_audio_path and os.path.exists(ref_audio_path):
        try:
            ref_y, _ = librosa.load(ref_audio_path, sr=target_sr)
            n_fft = 2048
            f_ref, pxx_ref = signal.welch(ref_y, fs=target_sr, nperseg=n_fft)
            f_src, pxx_src = signal.welch(y_mascot, fs=target_sr, nperseg=n_fft)

            filter_mag = np.sqrt((pxx_ref + 1e-6) / (pxx_src + 1e-6))
            filter_mag_smooth = gaussian_filter1d(filter_mag, sigma=3)
            filter_mag_smooth = np.clip(filter_mag_smooth, 0.5, 2.0)

            D = librosa.stft(y_mascot, n_fft=n_fft)
            freqs = librosa.fft_frequencies(sr=target_sr, n_fft=n_fft)
            filter_interp = np.interp(freqs, f_ref, filter_mag_smooth)

            D_matched = D * filter_interp[:, np.newaxis]
            y_mascot = librosa.istft(D_matched, length=len(y_mascot))
        except Exception as e:
            print(f"[FEFO Voice Pipeline] Aviso Spectral Matching: {e}")

    # 6. Normalizacao de Pico (-0.7 dBFS)
    max_amp = np.max(np.abs(y_mascot))
    if max_amp > 0:
        y_mascot = y_mascot / max_amp * 0.92

    # 7. Exportacao WAV 24kHz 16-bit PCM (padrao do FEFO)
    out_buf = io.BytesIO()
    sf.write(out_buf, y_mascot, target_sr, format="WAV", subtype="PCM_16")
    wav_bytes = out_buf.getvalue()
    elapsed = time.time() - t0

    return wav_bytes, round(elapsed, 2)

def generate_fefo_sync(
    text: str,
    ref_audio_path: Optional[str] = None,
    voice: str = "pt-BR-ThalitaMultilingualNeural",
    pitch_semitones: float = 7.0,
    speed: float = 1.0
) -> Tuple[bytes, float]:
    """Wrapper sincrono para integracao rapida nos servidores HTTP"""
    return asyncio.run(synthesize_fefo_voice(
        text=text,
        ref_audio_path=ref_audio_path,
        voice=voice,
        pitch_semitones=pitch_semitones,
        speed=speed
    ))
