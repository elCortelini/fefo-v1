#!/usr/bin/env python3
"""Gera comandos BLE para OTA do firmware FEFO.

Uso recomendado depois de compilar:
  python tools/ble_ota_commands.py .pio/build/fefo35/firmware.bin > ota_ble.txt

Formato gerado:
  OTA BEGIN <tamanho> <md5>
  OTA DATA <hex>
  ...
  OTA END

Depois de `OTA END` responder validado, envie manualmente:
  OTA REBOOT
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Gera comandos BLE para OTA do firmware FEFO."
    )
    parser.add_argument("firmware", type=Path, help="Arquivo firmware.bin")
    parser.add_argument(
        "-c",
        "--chunk",
        type=int,
        default=80,
        help="Bytes por pacote OTA DATA. Padrao: 80.",
    )
    parser.add_argument(
        "--max-bytes",
        type=int,
        default=0,
        help="Somente para diagnostico: limita a N bytes. Nao use para OTA real.",
    )
    args = parser.parse_args()

    firmware_path = args.firmware
    if not firmware_path.exists() or not firmware_path.is_file():
        raise SystemExit(f"Firmware nao encontrado: {firmware_path}")
    if args.chunk < 1 or args.chunk > 96:
        raise SystemExit("Use chunk entre 1 e 96 bytes.")

    data = firmware_path.read_bytes()
    if args.max_bytes:
      if args.max_bytes < 1:
          raise SystemExit("--max-bytes deve ser maior que zero.")
      data = data[: args.max_bytes]

    md5 = hashlib.md5(data).hexdigest()
    print(f"OTA BEGIN {len(data)} {md5}")
    for offset in range(0, len(data), args.chunk):
        chunk = data[offset : offset + args.chunk]
        print(f"OTA DATA {chunk.hex().upper()}")
    print("OTA END")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
