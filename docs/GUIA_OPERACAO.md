# Guia de operação e teste do FEFO

## Uso normal

1. Ligue o FEFO e aguarde a tela indicar que está pronto.
2. Abra o app e toque em conectar/buscar FEFO.
3. Selecione o único dispositivo válido `FEFO_BLE_Vnnn`.
4. Aguarde a sincronização. O menu é montado a partir do conteúdo informado pelo próprio FEFO.
5. Use Jukebox, Faces, Luzes, Vibrações ou Pânico.

Se o BLE cair durante uso comum, o app volta à tela inicial. Durante uma atualização, o app deve manter a tela de progresso até concluir ou informar uma falha recuperável.

## Instalar conteúdo pelo Catálogo Online

1. O celular precisa estar conectado à internet e ao FEFO por BLE.
2. Abra **Catálogo Online**. Itens já instalados e firmware igual/anterior não devem aparecer.
3. Marque um ou mais áudios/faces e confira o espaço calculado do microSD.
4. Confirme a instalação.
5. O app baixa os arquivos pela internet.
6. O FEFO abre uma rede temporária `FEFO_WIFI_xxxx`; o app entra nela automaticamente.
7. Acompanhe o progresso abaixo de cada item e na tela da CYD.
8. Ao terminar, o FEFO reinicia. Reconecte por BLE e confirme o novo inventário.

Faces disponíveis para baixar aparecem somente no Catálogo Online. A página **Faces do Fefo** lista somente as faces que o inventário do SD informa como instaladas.

## Excluir conteúdo

Abra o menu de destino do conteúdo já instalado e toque na lixeira ao lado do item. Confirme a exclusão. Para várias exclusões, selecione os itens disponíveis na interface correspondente e confirme uma única operação. Depois do reinício/reconexão, o arquivo não pode aparecer no inventário.

## Atualizar o firmware

1. Abra o Catálogo Online conectado ao FEFO.
2. Uma atualização só aparece se sua versão for numericamente superior à versão reportada por `APP SYNC`.
3. Confirme a OTA e não desligue o FEFO.
4. Acompanhe a barra de progresso no app e na CYD.
5. Após validação, o FEFO reinicia na nova partição.
6. Reconecte e confirme a versão exibida.

Se a versão atual continuar aparecendo, não repita indefinidamente: confirme se o app recebeu a versão real do firmware e se o catálogo usa um número superior.

## Faces

- **Modo Faces ligado:** o visor exibe a face selecionada.
- **Modo Faces desligado:** o visor mostra o painel/estado atual do FEFO.
- toque em uma miniatura instalada para mostrá-la;
- **Faces aleatórias:** percorre todas as faces instaladas a cada 3 segundos em loop;
- modo ligado/desligado e aleatório são persistidos e devem sobreviver ao reinício.

## Roteiro mínimo de aceite

### Inicialização e BLE

- ligar dez vezes sem reset espontâneo;
- conectar, desconectar e reconectar cinco vezes;
- confirmar firmware, app, espaço e inventário.

### Áudio

- tocar uma música curta e uma longa;
- testar play, pause, stop e volume;
- observar ruído e resets com LEDs ativos;
- confirmar título amigável e menu correto.

### Atualizações

- instalar dois áudios de uma vez;
- instalar duas faces de uma vez;
- interromper uma transferência e confirmar que a próxima sessão se recupera;
- testar cartão quase cheio;
- apagar conteúdo e conferir arquivo real + inventário;
- fazer OTA e conferir que a mesma versão some do catálogo.

### Faces e atuadores

- selecionar cada face e reiniciar;
- testar ciclo aleatório por pelo menos dois minutos;
- testar cada intensidade/efeito LED;
- testar vibrações e pânico.

## Recuperação de falhas

- **BLE não encontra:** confirme Bluetooth/permissões, reinicie o FEFO e busque novamente.
- **SD não aparece:** desligue, reinsira o cartão FAT32 e ligue; não remova energizado durante escrita.
- **Wi-Fi não associa:** encerre a tentativa, aguarde o FEFO voltar ao BLE e tente novamente; confirme permissões de dispositivos próximos/localização exigidas pelo Android.
- **Transferência interrompida:** não trate o item como instalado até ele constar no inventário após reconexão.
- **OTA falhou:** não repita sem confirmar alimentação estável, arquivo correto e espaço de partição; se o FEFO ainda inicia, mantenha a versão anterior.
- **Reinícios em áudio/transferência:** capture o monitor serial desde o boot, incluindo a causa do reset.

## Cuidados

Não desligue durante gravação de arquivo ou OTA. Use alimentação USB estável. O Google Drive e o celular fazem parte do caminho de atualização; o FEFO em si não acessa a internet.
