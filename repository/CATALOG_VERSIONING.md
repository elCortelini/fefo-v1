# Versionamento dos catálogos online

O catálogo oficial é `catalog.json` e usa `catalogVersion` crescente. A revisão
atual é **72** e contém o app v1.126 e o firmware v1.101.

Para migração temporária de aparelhos que ainda usam o app v1.119, use:

`https://raw.githubusercontent.com/elCortelini/fefo-v1/main/repository/catalog-legacy-v1.119.json`

Esse catálogo é a versão **legacy-app-1.119 / revisão 1**. Ele mantém o app
v1.119 como versão instalada e oferece primeiro o firmware v1.101. Depois que o
Fefo reiniciar, volte o endereço para o catálogo oficial e atualize o app.

Todo catálogo publicado deve ter um arquivo `.sig` correspondente e assinaturas
válidas para o conteúdo exato e para a representação canônica.
