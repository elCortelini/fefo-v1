// lib/utils/permission_check.dart

import 'dart:developer' as developer;
import 'dart:io'; // Import para verificar a plataforma (Android/iOS)
import 'package:permission_handler/permission_handler.dart';

class PermissionCheck {
  static Future<void> verificarTodasAsPermissoes() async {
    developer.log('--- DEBUG: Executando verificarTodasAsPermissoes ---',
        name: 'PermissionCheck');

    // Lista de permissões que nosso app precisa no Android.
    final Map<Permission, String> permissoesAndroid = {
      Permission.notification: 'Notificações',
      Permission.bluetoothScan: 'Scan de Bluetooth',
      Permission.bluetoothConnect: 'Conexão Bluetooth',
      Permission.location:
          'Localização', // Necessária para o scan de Bluetooth em algumas versões
    };

    bool algumaPermissaoNegada = false;

    if (Platform.isAndroid) {
      for (var permissao in permissoesAndroid.entries) {
        final status = await permissao.key.status;
        developer.log(
            'Verificando permissão: ${permissao.value} - Status atual: $status',
            name: 'PermissionCheck');

        if (status.isDenied) {
          // Se a permissão foi negada, solicita ao usuário.
          developer.log('Solicitando permissão para: ${permissao.value}',
              name: 'PermissionCheck');
          final novoStatus = await permissao.key.request();
          developer.log('Novo status para ${permissao.value}: $novoStatus',
              name: 'PermissionCheck');
          if (novoStatus.isPermanentlyDenied) {
            algumaPermissaoNegada = true;
          }
        } else if (status.isPermanentlyDenied) {
          algumaPermissaoNegada = true;
        }
      }
    }

    if (algumaPermissaoNegada) {
      // Se alguma permissão foi negada permanentemente, idealmente
      // você mostraria uma mensagem explicando ao usuário como habilitar
      // manualmente nas configurações do celular.
      developer.log(
          'AVISO: Uma ou mais permissões foram negadas permanentemente.',
          name: 'PermissionCheck');
      // await openAppSettings(); // Esta função abre as configs do app para o usuário.
    } else {
      developer.log(
          'Todas as permissões necessárias foram concedidas ou já estavam concedidas.',
          name: 'PermissionCheck');
    }
  }
}
