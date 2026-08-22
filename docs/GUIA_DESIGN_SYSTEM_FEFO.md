# Design System do FEFO

## Objetivo

Todas as telas devem compartilhar a mesma linguagem visual, sem perder a personalidade afetiva dos conteúdos. A lógica de negócio permanece nas páginas e managers; cores, tipografia, espaçamento e componentes ficam centralizados em `fefo_app/lib/design_system/` e `fefo_app/lib/theme/`.

## Regras para novas telas

1. Use `PaginaBase` como estrutura principal.
2. Use `FefoPageHeader` para título e descrição.
3. Use `Card`, `ListTile`, `FilledButton`, `OutlinedButton` e os componentes em `design_system/`.
4. Não use cores fixas de marca diretamente na tela. Use `Theme.of(context).colorScheme` ou `FefoThemeController.current` quando precisar de uma cor específica do tema.
5. Não use `Billotilde` ou `KGPen` como fonte padrão de interface. A tipografia do sistema é Roboto, com pesos e tamanhos definidos pelo Material 3.
6. Use os espaçamentos de `FefoSpacing` e os raios de `FefoRadii`.
7. Para estados de conexão, erro, sucesso e alerta, use os tokens semânticos de `FefoTokens`.

## Como criar um tema

Adicione uma entrada em `fefoThemes`, preenchendo:

- `accent`: ação principal e destaque;
- `accentSecondary`: apoio visual e ícones;
- `background`: fundo geral;
- `backgroundSecondary`: cor dos gradientes ambientais;
- `surface`: cards, barras e diálogos;
- `text` e `mutedText`: contraste principal e secundário;
- `isDark`: informa o brilho ao Material 3.

O `ThemeData` é produzido automaticamente por `FefoThemeDefinition.toThemeData()`. Uma tela não deve precisar conhecer a implementação interna dos temas.

## Padrão de navegação

`PaginaBase` usa a barra inferior fixa e as rotas de `FefoRoutes`:

- Início;
- Favoritos;
- Conteúdos;
- Configurações.

Páginas secundárias continuam podendo ser abertas com `Navigator.push`, mantendo a barra inferior para facilitar o retorno às áreas principais.

## Conteúdo dinâmico

Menus que dependem do catálogo devem ser compostos por modelos de entrada e filtrados pelo estado real do `BluetoothManager`. Assim, conteúdo inexistente não gera botões vazios e novos grupos podem ser adicionados sem duplicar o layout.
