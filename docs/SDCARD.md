# Estrutura do microSD

A pasta `sdcard/` na raiz do projeto é o modelo que deve ser copiado para a raiz de um cartão FAT32.

```text
sdcard/
├── fefo.json       catálogo enviado ao aplicativo
├── sys/
│   ├── a/          áudios protegidos do sistema
│   └── f/          faces protegidas do sistema
├── usr/
│   ├── a/          áudios instaláveis pelo usuário
│   └── f/          faces instaláveis pelo usuário
├── act/             atividades declarativas
├── cfg/             configurações de conteúdo
├── log/             logs técnicos
└── tmp/             transferências ainda não validadas
```

## Convenção de nomes

- áudio: `a0001.wav`;
- face: `f0001.raw`;
- atividade: `x0001.json`;
- apenas letras ASCII minúsculas, números e sublinhado;
- comandos BLE usam somente o ID (`a0001`, `f0001` ou `x0001`), nunca o caminho completo.

## Como copiar

1. Insira o microSD em um leitor conectado ao computador.
2. Confirme a letra, capacidade e conteúdo da unidade antes de copiar.
3. Abra a pasta `sdcard/` deste projeto.
4. Selecione todo o conteúdo dentro dela, não a pasta `sdcard` em si.
5. Copie para a raiz do cartão.

O resultado correto é `X:\\fefo.json`, e não `X:\\sdcard\\fefo.json`.

Pastas vazias existem no workspace para facilitar a cópia, mas futuramente o `StorageService` também deverá recriá-las automaticamente.
