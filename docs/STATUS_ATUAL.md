# Status atual e fases do FEFO

Revisão documental: 16 de agosto de 2026. Referência: firmware v077 e aplicativo v068.

## Critério usado

- **Concluída:** implementada e usada com sucesso no protótipo.
- **Em validação:** implementada, mas ainda exige regressão formal ou contém defeito recente.
- **Pendente:** não implementada ou insuficiente para uma entrega de produção.

## Matriz das fases

| Fase | Entrega | Estado | Evidência e observação |
|---|---|---|---|
| 0 | Placa CYD e periféricos básicos | Concluída | Display ILI9488, microSD, DAC, NeoPixel, motor, microfone e RGB possuem drivers e diagnóstico. O toque permanece desabilitado. |
| 1 | Firmware modular e estado do dispositivo | Concluída | Serviços separados para áudio, BLE, display, armazenamento, LEDs, vibração, pânico, diagnóstico e atualização. |
| 2 | Controle BLE e persistência | Concluída | Nordic UART, sincronização do app, comandos, catálogo local, configuração persistente e reconexão. |
| 3 | Conteúdo no microSD | Concluída | Áudios WAV em `/usr/a`, faces RAW em `/usr/f`, metadados em `fefo.json` e nomes de exibição no app. |
| 4 | Aplicativo Android | Em validação | Conexão, menu, jukebox, LEDs, vibrações, pânico, catálogo e faces estão implementados. A interface sofreu mudanças recentes e precisa de regressão em vários aparelhos Android. |
| 5 | Catálogo online e transferência Wi-Fi | Em validação | Celular baixa do Google Drive e transfere pela rede temporária do FEFO. Instalação múltipla existe. É necessário testar interrupção, pouco espaço, redes Android diferentes e consistência pós-reinício. |
| 6 | Firmware OTA | Em validação | OTA por Wi-Fi está operacional e já atualizou a placa. Comparação de versão existe. Faltam rollback, assinatura criptográfica e ensaio sistemático de falha de energia. |
| 7 | Faces | Em validação | Download pelo catálogo, inventário local, miniaturas, seleção, liga/desliga e ciclo aleatório de 3 s foram implementados na v069/App v038 e preservados na v070. Precisa de validação final no hardware. |
| 8 | Qualidade e produto | Pendente | Testes, telemetria, recuperação, segurança, documentação de fabricação, distribuição controlada e aceite de campo. |

## O que está pronto

- Identificação de versão do firmware e do app.
- Descoberta de apenas dispositivos BLE FEFO válidos.
- Sincronização inicial de versão, capacidade, estado, conteúdo e espaço do SD.
- Reprodução WAV PCM mono, 16 bits, 22,05 kHz pelo DAC do ESP32.
- Player por menu, volume, progresso visual e exclusão com confirmação.
- Menu dinâmico a partir do campo `menu` do catálogo local.
- Efeitos de luz terapêutica, intensidade iniciando em 25% e indicação da seleção.
- Padrões de vibração e comando de pânico imediato.
- Catálogo remoto de firmware, áudio e faces com tamanho e checksum SHA-256.
- Seleção de vários arquivos para instalação.
- Transferência automática celular → FEFO por ponto de acesso Wi-Fi temporário.
- Barra de progresso no app e na tela da CYD durante transferências.
- Atualização OTA com validação de tamanho e SHA-256.
- Filtro para não oferecer firmware igual ou anterior ao instalado.
- Faces RAW RGB565 480×320 no SD, seleção individual e modo aleatório.
- Persistência do modo de faces e da opção aleatória após reinício.
- Scripts de conversão de áudio e preparação do catálogo.

## O que ainda falta

### Prioridade alta

1. Executar uma regressão completa do App v067 + Firmware v077 em uma CYD real: instalar e apagar vários áudios, reinstalar pelo catálogo, instalar faces, reiniciar, validar menus, tocar áudio, alternar faces e atualizar firmware/app.
2. Criar recuperação transacional: arquivo temporário, confirmação de checksum, troca atômica e limpeza automática após uma transferência interrompida.
3. Implementar rollback ou imagem de recuperação para OTA e impedir que falha de energia deixe o equipamento sem inicialização.
4. Continuar controlando o tamanho do firmware: a v070 reduziu a ocupação de aproximadamente 97,4% para 88,2%. O BIN caiu de 1.914.672 para 1.740.480 bytes, recuperando 174.192 bytes. A pendência crítica foi resolvida, mas cada release deve continuar sendo medida.
5. Criar testes automatizados do protocolo, parsing dos JSONs, comparação de versões e estados de instalação. Atualmente só existe o teste Flutter padrão e projetos de diagnóstico manual.

### Prioridade média

- Remover a lógica pendente dos botões de acerto/erro em `app_android/lib/pages/tela_cards.dart` ou ocultar a tela até existir uma especificação.
- Validar permissões e associação ao `FEFO_WIFI_xxxx` em Android 8 a 15 e em fabricantes diferentes.
- Exibir mensagens de erro orientadas à recuperação para SD ausente, SD cheio, checksum inválido, Wi-Fi recusado e OTA incompatível.
- Definir política de releases: conservar a atual e as duas anteriores como recuperação; arquivar as demais fora da pasta operacional.
- Automatizar a geração coerente de `catalog.json`, `fefo.json`, checksums, tamanhos, upload e links públicos.
- Adicionar assinatura do catálogo e do firmware. SHA-256 detecta corrupção, mas não comprova autoria.

### Antes de produção

- Ensaio de horas de áudio para confirmar ausência de resets e ruído aceitável.
- Testes de cartão cheio, removido, corrompido e lento.
- Testes de bateria/alimentação durante áudio, Wi-Fi e LEDs.
- Identidade e senha Wi-Fi únicas por aparelho, ou outro mecanismo de autenticação.
- Política de privacidade, permissões Android, suporte e procedimento de assistência.
- Processo reprodutível de fabricação, gravação inicial e aceite de cada unidade.

## Riscos conhecidos

| Risco | Impacto | Tratamento recomendado |
|---|---|---|
| Flash OTA quase cheia | Impede evolução ou causa falha de build | Medir por release, remover código/telas legadas e rever partições com cautela. |
| Google Drive como CDN | Links, cotas ou confirmações podem mudar | Manter plano de migração para armazenamento HTTP estável. |
| Poucos testes | Regressões reaparecem após ajustes de interface/protocolo | Testar parser e fluxo com mocks; manter roteiro físico por versão. |
| Atualização sem assinatura | Catálogo adulterado pode distribuir binário não autorizado | Assinar manifesto e verificar chave pública no firmware/app. |
| Estado distribuído | App, `fefo.json`, arquivos reais e catálogo remoto podem divergir | Inventário gerado pelo FEFO deve ser a fonte do estado instalado. |

## Definição de “versão pronta”

Uma release só deve ser publicada quando firmware e app compilarem, o catálogo validar, o roteiro de operação deste repositório passar na CYD real e os artefatos tiverem versão, tamanho e checksum registrados.
