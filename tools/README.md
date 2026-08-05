# Tools

Scripts for preparing audio and face image assets for the FEFO firmware.

## Audio FEFO

The original recordings are kept in `audiosFEFO/`. The SD card model lives in
`sdcard/`, and playable user audio belongs in `sdcard/usr/a/`.

To convert every audio file located directly in `audiosFEFO/` to the format used
by the firmware (WAV PCM, mono, 16-bit, 22.05 kHz), run from the project root:

```powershell
.\tools\convert_audio.ps1
```

The converted files are written directly to `sdcard/usr/a/`. Existing files with
the same name are replaced, while source recordings in `audiosFEFO/` are never
modified. To include files inside subfolders, add `-Recurse`.

Custom source and destination folders are still supported:

```powershell
.\tools\convert_audio.ps1 -Source .\incoming -Destination .\sdcard\usr\a
```

To prepare the complete current Jukebox set, rename the tracks sequentially and
update `sdcard/fefo.json`, run:

```powershell
.\tools\prepare_jukebox.ps1
```

## General asset conversion

The older combined converter still reads source files from `assets/audio/` and
`assets/faces/`.

Run the conversion script to generate:

- `build/audio/` with WAV files converted to 16 kHz, mono, 16-bit PCM.
- `build/faces/` with images converted to RAW RGB565 for the display.

Then copy the generated files to the `sdcard/` root or use the upload helper.

## Requirements

- Python 3
- ffmpeg installed and available in PATH
- Pillow installed (`pip install -r tools/requirements.txt`)
