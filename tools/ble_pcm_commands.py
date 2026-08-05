#!/usr/bin/env python3
"""Gera comandos BLE FEFO para enviar um arquivo WAV ao SD card.

Uso:
  python tools/ble_pcm_commands.py caminho/audio.wav > comandos.txt

O formato padrão usa pacotes confiáveis:
  FB <arquivo> <tamanho>
  FX <sequencia> <hex> <sum8>
  FE

O checksum sum8 é a soma dos bytes do pacote limitada a 8 bits.
"""

from __future__ import annotations

import argparse
from pathlib import Path


def sum8(data: bytes) -> int:
    return sum(data) & 0xFF


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Gera comandos BLE para upload WAV no FEFO."
    )
    parser.add_argument("input", type=Path, help="Arquivo .wav de entrada")
    parser.add_argument(
        "-n",
        "--name",
        help="Nome do arquivo no FEFO. Padrao: nome do arquivo de entrada",
    )
    parser.add_argument(
        "-c",
        "--chunk",
        type=int,
        default=80,
        help="Bytes por pacote. Padrao: 80, seguro para o buffer BLE atual.",
    )
    parser.add_argument(
        "--legacy-fd",
        action="store_true",
        help="Usa FD <hex> sem sequencia/checksum.",
    )
    parser.add_argument(
        "--max-bytes",
        type=int,
        default=0,
        help="Limita o envio aos primeiros N bytes do arquivo.",
    )
    args = parser.parse_args()

    input_path = args.input
    if not input_path.exists() or not input_path.is_file():
        raise SystemExit(f"Arquivo nao encontrado: {input_path}")

    if args.chunk < 1 or args.chunk > 100:
        raise SystemExit("Use chunk entre 1 e 100 bytes.")

    data = input_path.read_bytes()
    if args.max_bytes:
        if args.max_bytes < 1:
            raise SystemExit("--max-bytes deve ser maior que zero.")
        data = data[: args.max_bytes]
    fefo_name = args.name or input_path.name
    if not fefo_name.lower().endswith(".wav"):
        fefo_name += ".wav"

    print(f"FB {fefo_name} {len(data)}")
    for seq, offset in enumerate(range(0, len(data), args.chunk)):
        chunk = data[offset : offset + args.chunk]
        hex_payload = chunk.hex().upper()
        if args.legacy_fd:
            print(f"FD {hex_payload}")
        else:
            print(f"FX {seq} {hex_payload} {sum8(chunk):02X}")
    print("FE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
