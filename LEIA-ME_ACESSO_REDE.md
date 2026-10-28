# Instruções de Acesso ao Projeto FEFO pela Rede Local (`Z:\FEFO\GITHUB`)

Este repositório centralizado no servidor NAS reúne o código-fonte, releases, ferramentas de catálogo e histórico do projeto FEFO.

---

## 1. Como usar o Administrador de Catálogo a partir de qualquer PC da rede

1. **Primeira vez em um computador novo:**
   * Certifique-se de que o computador tem o **Python 3.10+** instalado (com a opção *Add Python to PATH* marcada).
   * Dê dois cliques no arquivo `configurar_pc_novo.cmd`. Ele configurará o Git para aceitar a pasta de rede e instalará a biblioteca `Pillow`.
2. **Para abrir o Administrador:**
   * Dê dois cliques em `Executar_Administrador_Catalogo.cmd`.
   * A tela preta iniciará o servidor e você poderá acessar pelo navegador:
     `http://127.0.0.1:8765/catalog-admin/index.html`

---

## 2. Para Desenvolvedores (Git e Compilação)

* **Repositório Oficial Remoto:**
  O código está sincronizado com a nuvem no GitHub:
  `https://github.com/elCortelini/fefo-v1.git` (branch `main`).

* **Trabalho Concorrente (Mais de 1 pessoa desenvolvendo):**
  * Para desenvolvimento leve (edição de scripts, catalog-admin, documentação), é possível trabalhar direto na pasta de rede `Z:\FEFO\GITHUB`.
  * Se for compilar o **App Flutter** (`fefo_app`) ou o **Firmware ESP32** (`fefo_firmware`), recomenda-se fazer um `git clone` em um disco local (ex.: `C:\` ou `D:\`) daquele PC para evitar que a velocidade da rede limite o tempo de compilação.
