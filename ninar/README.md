# 🤖 FEFO IA - Ambiente de Desenvolvimento & Produção Sensorial

Esta pasta reúne o **Criador de Ninar** integrado ao site do FEFO: um player web de música relaxante, chuva suave e respiração guiada.

Abra pelo site em [Criador de Ninar](index.html) ou diretamente em `ninar/index.html`.

---

## 📁 Estrutura de Arquivos

| Arquivo | Função |
| :--- | :--- |
| `FEFO - Chuva Relaxante (5 Minutos).wav` | Áudio instrumental completo de 5 minutos (16-bit 44.1kHz Stereo PCM). |
| `FEFO_Player_Relaxante.html` / `index.html` | Reprodutor web com respiração guiada, visualizador relaxante e controles de mixagem. |
| `SoundGenerator.cs` | Motor C# de síntese acústica (ruído rosa de chuva, arpejos de piano, caixinha de música pentatônica). |
| `SimpleHttpServer.cs` | Servidor HTTP local de alta performance com suporte a streaming de áudio (*Range requests*). |
| `iniciar_servidor.bat` | Script de 1 clique para iniciar o servidor local na porta 8080. |
| `gerar_musica_relaxante.bat` | Script de 1 clique para gerar ou remasterizar a trilha de áudio. |
| `dormindo.png` / `fefo deitado.jpg` | Recursos visuais do personagem Fefo integrados ao player. |

---

## 🧠 Parâmetros Neuroacústicos para Crianças Autistas (5 Anos)

* **Tempo**: 54 BPM (induções a ondas Alfa/Teta e ritmo cardíaco em repouso).
* **Escala**: Pentatônica Maior em Fá / Ré menor (sem intervalos de tensão ou dissonâncias).
* **Filtragem**: Filtro passa-baixa aveludado abaixo de 2 kHz (proteção contra hipersensibilidade a agudos).
* **Textura da Chuva**: Ruído rosa com modulação LFO lenta e gotas suaves sintonizadas harmonicamente.

---

## 🚀 Como Iniciar o Servidor Local

1. Dê 2 cliques em `iniciar_servidor.bat`.
2. Acesse no seu navegador: **[http://localhost:8080](http://localhost:8080)**.
