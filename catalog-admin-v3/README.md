# FEFO Catalog Admin v3 🤖

Administrador Web de Catálogo Pedagógico e Interativo para o Ecossistema do robô FEFO (Versão 3).

---

## 🌟 Principais Recursos & Arquitetura

### 1. Sistema de Duplo Versionamento
* **Versão Global do Catálogo (`v3.001`, `v3.002`...):**
  - Exibida de forma permanente na barra de rodapé da aplicação.
  - Botão de incremento rápido `+0.001` e edição direta com clique duplo.
* **Código do Tema (`tXX.YY`):**
  - Padrão estruturado onde `tXX` representa o tema/eixo e `.YY` representa a versão interna do conteúdo (ex: `t01.01`, `t01.02`, `t02.01`).
  - Validação estrita via regex (`^t\d{2}\.\d{2}$`) com sugestão automática inteligente baseada no eixo selecionado e temas existentes.

### 2. Estrutura Pedagógica & Interativa
* **8 Eixos Temáticos Estruturantes:**
  - Rotina & Hábitos, Autocuidado & Higiene, Emoções & Autorregulação, Alimentação Saudável, Socialização & Empatia, Movimento & Coordenação, Linguagem & Imaginação, Ciência & Natureza.
* **Materiais Físicos & Mídias:**
  - Áudio da historinha narrada.
  - Livrinho ilustrado em PDF.
  - Bobie Gods (personagens em PDF para montagem ou imagens).
  - Caderno de Atividades impressas em PDF.
* **Interações Físicas no Robô FEFO:**
  - **Treck-Treck:** Atividade tátil e motora com áudio guia, duração e resposta de hardware.
  - **Cards RFID:** Tags físicas com UID, áudio associado e perfil sensorial exclusivo.
  - **Músicas & Mindfulness:** Faixas rítmicas ou momentos de respiração guiada.
  - **Desafios Interativos:**
    * *Modo Card RFID:* Validação de aproximação de tag esperada com áudios de pergunta, sucesso e erro.
    * *Modo Áudio Reflexivo:* Condução guiada com pausa silenciosa programada em segundos e conclusão.

### 3. Simulador Sensorial de Hardware
* Preview em tempo real dos efeitos no robô:
  - Anel de LEDs RGB personalizável.
  - Display OLED dos olhos do FEFO com expressões em pixel-art (Feliz, Animado, Comemorando, Zen, Cantando, Piscando).
  - Medidor de vibração tátil com padrões pré-configurados.

### 4. Usabilidade & Conformidade com as 7 Leis de UX
* **Lei de Fitts:** Botões de ação com alvos de toque amplos (mínimo de 48px), bem distribuídos.
* **Lei de Hick:** Redução de sobrecarga cognitiva através de abas bem definidas e filtragem por eixos.
* **Efeito Zeigarnik:** Barra de completude visual no formulário em 5 etapas.
* **Lei de Jakob:** Convenções familiares de UI com navegação intuitiva.
* **Gradiente de Meta:** Stepper numerado indicando progresso de 1 a 5.
* **Efeito Von Restorff:** Destaque inequívoco para o botão primário de salvar e publicar.
* **Lei de Miller:** Formulário particionado em blocos lógicos (*chunks*) de até 5-7 campos por etapa.

---

## 🚀 Como Executar

Por ser uma aplicação **Vanilla HTML5/CSS3/JavaScript Local-First**, ela não requer servidores pesados ou dependências externas:

1. Abra o arquivo `index.html` em qualquer navegador web moderno.
2. Ou sirva via servidor estático local (ex: Python ou VSCode Live Server):
   ```bash
   python -m http.server 8080
   ```
   E acesse `http://localhost:8080/GITHUB/catalog-admin-v3/`.

---

## 🔒 Preservação do Legado
* Os diretórios e arquivos legados `GITHUB/catalog-admin/` e `GITHUB/repository/catalog.json` permanecem intactos.
* A nova versão opera isoladamente com o arquivo `GITHUB/repository/catalog-v3.json`.
