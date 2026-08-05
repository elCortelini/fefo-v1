# FEFO V0.0.5 - Audio desligado

Data: 28/07/2026

Esta versao mantem o firmware principal sem audio para estabilizar os demais
modulos de bancada.

## Decisao

- `board::kAudioEnabled = false`;
- `board::kAudioBootTestEnabled = false`;
- o boot nao inicializa I2S0/DMA;
- o boot nao cria a tarefa `fefo_audio`;
- o teste sequencial de arquivos PCM do microSD nao inicia;
- o modo panico continua comandando o motor, mas nao solicita sirene;
- o GPIO 26 permanece em repouso com `dacWrite(board::kAudioOutput, 0)`.

## O que continua ativo

- display TFT;
- microSD e leitura de arquivos de face;
- BLE;
- LEDs;
- motor;
- modo panico sem sirene.

## Como reativar depois

Quando o audio voltar para teste, altere em `include/board/Fefo35Board.h`:

```cpp
inline constexpr bool kAudioEnabled = true;
```

O teste automatico de audio no boot so deve ser reativado quando for realmente
necessario:

```cpp
inline constexpr bool kAudioBootTestEnabled = true;
```
