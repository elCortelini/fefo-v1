# Diagnóstico isolado dos NeoPixels

Este subprojeto usa apenas `Serial` e Adafruit NeoPixel. Ele não inicializa
tela, touch, SD, BLE, áudio, microfone nem motor; assim, nenhum outro módulo
pode alterar o GPIO 22 ou o periférico RMT durante o teste.

O mesmo `src/main.cpp` executa continuamente duas fases:

1. azul progressivo, `GRB / 800 kHz`, igual ao boot do FEFO 190;
2. magenta progressivo, `GRB / 400 kHz`, para testar a hipótese de timing.

O LCD não é reinicializado e pode conservar a última imagem do firmware
anterior. Para comprovar visualmente a execução, o backlight no GPIO 27 fica
aceso somente durante a fase azul/800 kHz e apagado nas demais fases.

## Core 2 / backend RMT legado do firmware atual

```powershell
.\.venv\Scripts\pio.exe run -d diagnostics\led_isolated
.\.venv\Scripts\pio.exe run -d diagnostics\led_isolated --target upload --upload-port COM7
```

## Core 3.3.7 / backend RMT usado pelo FEFO 190

```powershell
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' `
  --config-file 'C:\Users\Krishna\.arduinoIDE\arduino-cli.yaml' compile `
  --fqbn 'esp32:esp32:esp32:CPUFreq=240,FlashFreq=80,FlashMode=dio,FlashSize=4M,PartitionScheme=default,PSRAM=disabled' `
  --build-path '.build\led-core3' `
  'diagnostics\led_isolated'
```

## Interpretação

- azul funciona no core 2: o erro era o fluxo principal não chamar um efeito;
- core 2 falha e azul funciona no core 3: diferença do backend RMT;
- apenas magenta funciona: a fita requer a temporização de 400 kHz;
- nenhuma fase funciona nos dois cores: a causa não está no fluxo nem no
  backend comparado e deve ser investigada no sinal entre GPIO e primeiro LED.
