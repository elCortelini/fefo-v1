# Estrutura do microSD

Referência atual: firmware v069. A pasta `sdcard/` é a imagem-modelo que deve ser copiada para a raiz de um cartão FAT32.

```text
sdcard/
├── fefo.json       títulos, menus e metadados locais
├── sys/
│   ├── a/          áudios protegidos do sistema
│   ├── f/          faces protegidas do sistema
│   ├── c/          configuração persistente criada pelo firmware
│   ├── db/         índices internos criados pelo firmware
│   └── log/        log interno criado pelo firmware
├── usr/
│   ├── a/          áudios instaláveis pelo usuário
│   └── f/          faces instaláveis pelo usuário
├── act/             atividades declarativas futuras
├── cfg/             configuração de conteúdo
├── log/             registros auxiliares
└── tmp/             transferências temporárias
```

Arquivos de usuário válidos:

- áudio: `/usr/a/aNNNN.wav`, WAV PCM mono, 16 bits, 22.050 Hz;
- face: `/usr/f/fNNNN.raw`, RGB565 little-endian, 480×320, 307.200 bytes.

Use nomes físicos ASCII curtos. Título e menu amigáveis ficam em `fefo.json`. O campo `menu` controla em qual Jukebox o app mostra o áudio. O estado instalado, porém, é determinado pelo inventário dos arquivos reais enviado pelo FEFO; o JSON fornece nomes e organização.

## Preparar um cartão manualmente

1. Formate em FAT32.
2. Copie o conteúdo de `sdcard/` para a raiz, não a pasta `sdcard`.
3. Confirme `X:\fefo.json` e `X:\usr\a\...`.
4. Ejete com segurança e insira no FEFO desligado.
5. Ligue, conecte pelo app e confira o inventário.

Nunca retire o cartão durante reprodução, transferência ou atualização de catálogo.
