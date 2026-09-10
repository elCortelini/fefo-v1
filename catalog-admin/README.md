# Administrador do catálogo Fefo

Painel visual para preparar novos áudios, faces e vídeos para o catálogo online.

## Fluxo rápido

1. Abra `catalog-admin/index.html` pelo site ou pelo GitHub Pages.
2. Arraste os arquivos para a caixa de entrada.
3. Revise título, menu, submenu e tipo. O nome do arquivo já preenche esses campos.
4. Clique em **Salvar arquivos no projeto** e selecione a pasta raiz do projeto, ou baixe o cadastro para uso manual.
5. Execute o atualizador de conteúdos existente. Ele converte os arquivos, preserva a compatibilidade com o app, atualiza `repository/catalog.json` e faz a assinatura antes da publicação.

O painel não contém a chave privada de assinatura e não publica sozinho a partir do navegador. Isso é intencional: a chave continua protegida no computador de manutenção.

Conteúdos marcados como **Somente sistema** continuam registrados, mas são filtrados da lista de downloads do app. A exclusão física pede confirmação e remove as cópias do repositório e do SD card do projeto.

## Regra para nomes

- `Titulo.ext` → menu `Jukebox do Fefo`.
- `Menu - Titulo.ext` → menu informado e título informado.
- `Menu - Submenu - Titulo.ext` → menu, submenu e título separados.

Os metadados exportados usam exatamente as colunas aceitas por `tools/auto_update_content.py`.
