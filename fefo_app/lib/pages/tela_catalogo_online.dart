import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../managers/bluetooth_manager.dart';
import '../config/firmware_version.dart';
import '../config/app_version.dart';
import '../widgets/botao_verde.dart';
import '../widgets/pagina_base.dart';
import '../widgets/progresso_operacao.dart';
import '../theme/fefo_theme.dart';
import 'tela_conexao.dart';
import '../design_system/fefo_components.dart';

class TelaCatalogoOnline extends StatefulWidget {
  const TelaCatalogoOnline({super.key});

  @override
  State<TelaCatalogoOnline> createState() => _TelaCatalogoOnlineState();
}

class _TelaCatalogoOnlineState extends State<TelaCatalogoOnline> {
  static const _urlKey = 'fefo_catalog_url';
  static const _catalogCacheKey = 'fefo_online_catalog_cache';
  static const _defaultCatalogUrl =
      'https://raw.githubusercontent.com/elCortelini/fefo-v1/main/repository/catalog.json';
  static const _catalogFallbackUrls = [
    'https://cdn.jsdelivr.net/gh/elCortelini/fefo-v1@main/repository/catalog.json',
    'https://github.com/elCortelini/fefo-v1/raw/refs/heads/main/repository/catalog.json',
  ];

  final _urlController = TextEditingController();
  final Set<String> _selectedPaths = {};
  final Set<String> _justInstalledPaths = {};
  List<_OnlineItem> _items = const [];
  _OnlineFirmware? _onlineFirmware;
  _OnlineApp? _onlineApp;
  String _status = 'Informe o link público do catalog.json no Google Drive.';
  bool _busy = false;
  String? _activeDownloadPath;
  double _activeDownloadProgress = 0;

  List<int> _manifestBytes(Map<String, dynamic> manifest) =>
      utf8.encode(const JsonEncoder.withIndent('  ').convert(manifest));

  Future<bool> _confirmarAcao(String titulo, String mensagem) async {
    if (!mounted) return false;
    return await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: Text(titulo),
            content: Text(mensagem),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: const Text('Cancelar'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(dialogContext, true),
                child: const Text('Continuar'),
              ),
            ],
          ),
        ) ??
        false;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initialize());
  }

  Future<void> _initialize() async {
    final manager = context.read<BluetoothManager>();
    if (manager.isConnected) {
      setState(() => _status = 'Lendo arquivos instalados no FEFO...');
      await manager.lerCatalogoAtualizado();
      await manager.enviarComando('SD INFO');
    }
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    var savedUrl = prefs.getString(_urlKey);
    if (savedUrl == null || savedUrl.contains('drive.google.com')) {
      savedUrl = _defaultCatalogUrl;
      await prefs.setString(_urlKey, savedUrl);
    }
    _urlController.text = savedUrl;
    if (_urlController.text.isNotEmpty) await _loadCatalog();
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<Uint8List> _download(
    String rawUrl, {
    void Function(double progress)? onProgress,
  }) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 8)
      ..idleTimeout = const Duration(seconds: 8);
    try {
      final request = await client.getUrl(Uri.parse(rawUrl));
      final response = await request.close();
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException('HTTP ${response.statusCode}');
      }
      final bytes = <int>[];
      final total = response.contentLength;
      await for (final part in response) {
        bytes.addAll(part);
        if (total > 0) onProgress?.call((bytes.length / total).clamp(0, 1));
      }
      return Uint8List.fromList(bytes);
    } finally {
      client.close();
    }
  }

  Future<void> _loadCatalog() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;
    setState(() {
      _busy = true;
      _status = 'Buscando catálogo online...';
    });
    try {
      Map<String, dynamic>? decoded;
      Object? lastError;
      String? source;
      final endpoints = <String>{url, ..._catalogFallbackUrls};
      for (final endpoint in endpoints) {
        try {
          final bytes = await _download(endpoint);
          final parsed = jsonDecode(utf8.decode(bytes));
          if (parsed is! Map) throw const FormatException('JSON inválido');
          decoded = Map<String, dynamic>.from(parsed);
          source = endpoint;
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(_catalogCacheKey, utf8.decode(bytes));
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (decoded == null) {
        final prefs = await SharedPreferences.getInstance();
        final cached = prefs.getString(_catalogCacheKey);
        if (cached != null && cached.isNotEmpty) {
          final parsed = jsonDecode(cached);
          if (parsed is Map) {
            decoded = Map<String, dynamic>.from(parsed);
            source = 'cache local';
          }
        }
      }
      if (decoded == null) {
        throw HttpException('Nenhuma fonte do catálogo respondeu: $lastError');
      }
      final rawItems = <dynamic>[
        ...?decoded['audio'] as List?,
        ...?decoded['faces'] as List?,
      ];
      final items = rawItems.whereType<Map>().map(_OnlineItem.fromJson).toList()
        ..sort((a, b) {
          final menuCompare = a.menu.compareTo(b.menu);
          return menuCompare != 0 ? menuCompare : a.title.compareTo(b.title);
        });
      final rawFirmware = decoded['firmware'];
      final onlineFirmware = rawFirmware is Map
          ? _OnlineFirmware.fromJson(Map<String, dynamic>.from(rawFirmware))
          : null;
      final rawApp = decoded['app'];
      final onlineApp = rawApp is Map
          ? _OnlineApp.fromJson(Map<String, dynamic>.from(rawApp))
          : null;
      await (await SharedPreferences.getInstance()).setString(_urlKey, url);
      if (!mounted) return;
      setState(() {
        _items = items;
        _onlineFirmware = onlineFirmware;
        _onlineApp = onlineApp;
        _selectedPaths.removeWhere((path) => !items.any((e) => e.path == path));
        _status = source == 'cache local'
            ? '${items.length} item(ns) no catálogo salvo localmente.'
            : '${items.length} item(ns) no catálogo.';
      });
    } catch (e) {
      if (mounted) setState(() => _status = 'Falha ao ler catálogo: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Set<String> _installedPaths(BluetoothManager manager) => {
        ...manager.audioItems.map((e) => e.path),
        ...manager.faces.map((e) => e.path),
      };

  Map<String, dynamic> _criarManifesto(
    BluetoothManager manager, {
    Iterable<_OnlineItem> adicionar = const [],
    Set<String> remover = const {},
  }) {
    final installedPaths = _installedPaths(manager)
      ..addAll(adicionar.map((e) => e.path))
      ..removeAll(remover);
    final online = {for (final item in _items) item.path: item};
    final currentAudio = {
      for (final item in manager.audioItems) item.path: item
    };
    final currentFaces = {for (final item in manager.faces) item.path: item};
    final audios = <Map<String, dynamic>>[];
    final faces = <Map<String, dynamic>>[];

    for (final path in installedPaths.toList()..sort()) {
      final onlineItem = online[path];
      if (onlineItem != null) {
        if (onlineItem.isFace) {
          faces.add(onlineItem.manifestEntry);
        } else {
          audios.add(onlineItem.manifestEntry);
        }
        continue;
      }
      final audio = currentAudio[path];
      if (audio != null) {
        audios.add({
          'id': audio.id,
          'titulo': audio.title,
          'menu': audio.group,
          if (audio.submenu.trim().isNotEmpty) 'submenu': audio.submenu,
          'arquivo': audio.path,
          'checksum': audio.checksum,
        });
        continue;
      }
      final face = currentFaces[path];
      if (face != null) {
        faces.add({
          'id': face.id,
          'titulo': face.name,
          'arquivo': face.path,
          'checksum': face.checksum,
        });
      }
    }

    final menus = <String>{
      for (final entry in audios)
        if ((entry['menu'] ?? '').toString().trim().isNotEmpty)
          entry['menu'].toString().trim(),
    }.toList()
      ..sort();

    return {
      'schema': 1,
      'firmware': manager.firmwareVersion ?? fefoFirmwareVersion,
      'menus': [
        for (final menu in menus) {'id': menu, 'titulo': menu}
      ],
      'audio': audios,
      'faces': faces,
      'led_effects': manager.ledEffects
          .map((e) => {'id': e.id, 'name': e.name, 'command': e.command})
          .toList(),
      'vibration_effects': manager.vibrationEffects
          .map((e) => {'id': e.id, 'name': e.name, 'command': e.command})
          .toList(),
    };
  }

  Future<bool> _ensurePetConnected(BluetoothManager manager) async {
    if (manager.isConnected) return true;
    if (mounted) {
      setState(() => _status = 'Conectando automaticamente ao PET FEFO...');
    }
    final connected = await manager.conectarAutomaticamenteAoFefo();
    if (!connected && mounted) {
      setState(() => _status =
          'Não foi possível conectar automaticamente ao PET. Ligue-o e tente novamente.');
    }
    return connected;
  }

  void _voltarAoMenuConexao() {
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const TelaConexao()),
      (route) => route.isFirst,
    );
  }

  Future<void> _installItems(Iterable<_OnlineItem> requested) async {
    final manager = context.read<BluetoothManager>();
    final items = requested
        .where((item) => item.url.isNotEmpty && item.path.isNotEmpty)
        .toList();
    if (items.isEmpty) {
      if (mounted) {
        setState(() => _status = 'Nenhum item válido foi selecionado.');
      }
      return;
    }
    if (!await _confirmarAcao('Instalar conteúdo?',
        'Os arquivos serão transferidos ao FEFO e ele poderá reiniciar ao concluir.')) {
      return;
    }
    setState(() {
      _busy = true;
      _status = 'Preparando downloads...';
    });
    try {
      final uploads = <String, List<int>>{};
      final checksums = <String, String>{};
      for (var index = 0; index < items.length; index++) {
        final item = items[index];
        if (mounted) {
          setState(() {
            _activeDownloadPath = item.path;
            _activeDownloadProgress = 0;
            _status = 'Baixando ${index + 1}/${items.length}: ${item.title}...';
          });
        }
        uploads[item.path] = await _download(
          item.url,
          onProgress: (progress) {
            if (mounted) setState(() => _activeDownloadProgress = progress);
          },
        );
        final downloaded = uploads[item.path]!;
        if (item.size > 0 && downloaded.length != item.size) {
          throw FormatException('Tamanho inválido para ${item.title}.');
        }
        final actualHash = sha256.convert(downloaded).toString();
        final expectedHash =
            item.checksum.toLowerCase().replaceFirst('sha256:', '');
        if (expectedHash.isNotEmpty && actualHash != expectedHash) {
          throw FormatException('Checksum inválido para ${item.title}.');
        }
        checksums[item.path] = item.checksum;
      }
      final manifest = _criarManifesto(manager, adicionar: items);
      uploads['/fefo.json'] = _manifestBytes(manifest);
      if (mounted) {
        setState(() => _status = 'Conectando ao Wi-Fi temporário do FEFO...');
      }
      if (!await _ensurePetConnected(manager)) return;
      if (mounted) {
        setState(() {
          _activeDownloadPath = null;
          _activeDownloadProgress = 0;
        });
      }
      await manager.enviarArquivosPorWifi(uploads, checksums: checksums);
      if (mounted) {
        setState(() {
          _justInstalledPaths.addAll(items.map((item) => item.path));
          _selectedPaths.removeAll(items.map((e) => e.path));
          _status =
              '${items.length} item(ns) instalado(s). O PET reiniciará e voltará ao menu de conexão.';
        });
      }
    } catch (e) {
      if (mounted) setState(() => _status = 'Falha na atualização: $e');
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _activeDownloadPath = null;
          _activeDownloadProgress = 0;
        });
      }
    }
  }

  int _compareVersions(String left, String right) {
    final a = RegExp(r'\d+')
        .allMatches(left)
        .map((match) => int.parse(match.group(0)!))
        .toList();
    final b = RegExp(r'\d+')
        .allMatches(right)
        .map((match) => int.parse(match.group(0)!))
        .toList();
    for (var i = 0; i < 4; i++) {
      final av = i < a.length ? a[i] : 0;
      final bv = i < b.length ? b[i] : 0;
      if (av != bv) return av.compareTo(bv);
    }
    return 0;
  }

  String _formatBytes(int? bytes) {
    if (bytes == null) return 'aguardando leitura';
    if (bytes >= 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
    }
    if (bytes >= 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    if (bytes >= 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '$bytes B';
  }

  Future<void> _installFirmware(_OnlineFirmware firmware) async {
    final manager = context.read<BluetoothManager>();
    if (firmware.url.isEmpty || firmware.checksum.isEmpty) {
      return;
    }
    if (!await _confirmarAcao('Atualizar firmware?',
        'O FEFO será reiniciado durante o processo. Não desligue o aparelho até terminar.')) {
      return;
    }
    setState(() {
      _busy = true;
      _status = 'Baixando Firmware v${firmware.version}...';
    });
    try {
      _activeDownloadPath = '/firmware.bin';
      _activeDownloadProgress = 0;
      final bytes = await _download(
        firmware.url,
        onProgress: (progress) {
          if (mounted) setState(() => _activeDownloadProgress = progress);
        },
      );
      if (firmware.size > 0 && bytes.length != firmware.size) {
        throw const FormatException(
            'Tamanho do firmware diferente do catálogo.');
      }
      if (mounted) {
        setState(() {
          _activeDownloadPath = null;
          _activeDownloadProgress = 0;
        });
      }
      if (mounted) {
        setState(() => _status = 'Transferindo firmware ao FEFO...');
      }
      if (!await _ensurePetConnected(manager)) return;
      await manager.enviarArquivosPorWifi(
        {'/firmware.bin': bytes},
        checksums: {'/firmware.bin': firmware.checksum},
      );
      if (mounted) {
        setState(() => _status =
            'Firmware enviado. O FEFO está reiniciando na versão ${firmware.version}.');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Firmware v${firmware.version} enviado! O PET reiniciará e voltará ao menu de conexão.'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 6),
          ),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _status = 'Falha no firmware OTA: $e');
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _activeDownloadPath = null;
          _activeDownloadProgress = 0;
        });
      }
    }
  }

  Future<void> _installApp(_OnlineApp app) async {
    if (app.url.isEmpty || app.checksum.isEmpty || _busy) return;
    if (!await _confirmarAcao('Atualizar aplicativo?',
        'O Android abrirá a instalação da nova versão do FEFO App.')) {
      return;
    }
    setState(() {
      _busy = true;
      _activeDownloadPath = '/fefo-app.apk';
      _activeDownloadProgress = 0;
      _status = 'Baixando atualização do aplicativo...';
    });
    try {
      final bytes = await _download(
        app.url,
        onProgress: (progress) {
          if (mounted) setState(() => _activeDownloadProgress = progress);
        },
      );
      if (app.size > 0 && bytes.length != app.size) {
        throw const FormatException('Tamanho do APK diferente do catálogo.');
      }
      final actualHash = sha256.convert(bytes).toString();
      if (actualHash.toLowerCase() !=
          app.checksum.toLowerCase().replaceFirst('sha256:', '')) {
        throw const FormatException('Checksum SHA-256 do APK inválido.');
      }
      final temp = await getTemporaryDirectory();
      final apk = File(
          '${temp.path}${Platform.pathSeparator}fefo-app-${app.build}.apk');
      await apk.writeAsBytes(bytes, flush: true);
      await const MethodChannel('fefo/wifi').invokeMethod<bool>('installApk', {
        'path': apk.path,
      });
      if (mounted) {
        setState(() => _status =
            'APK validado. Confirme a instalação na tela do Android.');
      }
    } catch (e) {
      if (mounted) setState(() => _status = 'Falha ao atualizar o app: $e');
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _activeDownloadPath = null;
          _activeDownloadProgress = 0;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final manager = context.watch<BluetoothManager>();
    final theme = context.watch<FefoThemeController>().current;
    final installed = <String, String>{
      for (final item in manager.audioItems) item.path: item.checksum,
      for (final item in manager.faces) item.path: item.checksum,
    };
    final availableItems = _items
        .where((item) =>
            !installed.containsKey(item.path) &&
            !_justInstalledPaths.contains(item.path))
        .toList();
    final selected = availableItems
        .where((item) => _selectedPaths.contains(item.path))
        .toList();
    final selectedDownloadBytes = selected
        .where((e) => !installed.containsKey(e.path))
        .fold<int>(0, (sum, item) => sum + item.size);
    final freeAfterSelection = manager.sdFreeBytes == null
        ? null
        : manager.sdFreeBytes! - selectedDownloadBytes;

    return PaginaBase(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Column(children: [
          const SizedBox(height: 18),
          FefoPageHeader(
            title: 'Catálogo Online',
            subtitle:
                'App v$fefoAppVersionName  •  Firmware v${manager.firmwareVersion ?? fefoFirmwareVersion}',
          ),
          Container(
            margin: const EdgeInsets.fromLTRB(12, 12, 12, 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
                color: theme.surface,
                borderRadius: BorderRadius.circular(18),
                border:
                    Border.all(color: theme.accent.withValues(alpha: 0.45))),
            child: Row(children: [
              Icon(Icons.sd_storage_rounded, color: theme.accentSecondary),
              const SizedBox(width: 8),
              Expanded(
                  child: Text('SD livre: ${_formatBytes(manager.sdFreeBytes)}',
                      style: TextStyle(
                          fontWeight: FontWeight.bold, color: theme.text))),
            ]),
          ),
          Container(
            margin: const EdgeInsets.fromLTRB(12, 8, 12, 10),
            padding: const EdgeInsets.fromLTRB(20, 18, 16, 16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                  colors: [theme.accentSecondary, theme.accent],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(26),
              boxShadow: const [
                BoxShadow(
                    color: Colors.black26, blurRadius: 12, offset: Offset(0, 5))
              ],
            ),
            child: Row(
              children: [
                Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        shape: BoxShape.circle),
                    child: Icon(Icons.cloud_download_rounded,
                        color: Colors.white, size: 32)),
                const SizedBox(width: 14),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text('Conteúdos disponíveis',
                            maxLines: 1,
                            softWrap: false,
                            style: TextStyle(
                                fontFamily: 'Billotilde',
                                fontSize: 38,
                                color: theme.useLegacyImage
                                    ? Colors.white
                                    : theme.background,
                                height: 1)),
                      ),
                      SizedBox(height: 6),
                      Text('Novos conteúdos para o PET FEFO',
                          style: TextStyle(
                              fontFamily: 'KGPen',
                              fontSize: 15,
                              color: (theme.useLegacyImage
                                      ? Colors.white
                                      : theme.background)
                                  .withValues(alpha: 0.78)))
                    ])),
                IconButton(
                    tooltip: 'Atualizar catálogo',
                    onPressed: _busy ? null : _loadCatalog,
                    icon: Icon(Icons.refresh_rounded,
                        color: theme.useLegacyImage
                            ? Colors.white
                            : theme.background,
                        size: 28)),
              ],
            ),
          ),
          if (_onlineApp != null)
            Builder(builder: (context) {
              final app = _onlineApp!;
              const installedVersion = fefoAppBuildNumber;
              final hasUpdate = app.build > installedVersion;
              if (!hasUpdate) {
                return Card(
                  margin: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                  color: theme.surface,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(
                        color: theme.accentSecondary.withValues(alpha: 0.45)),
                  ),
                  child: ListTile(
                    leading: Icon(Icons.verified_rounded,
                        color: theme.accentSecondary, size: 30),
                    title: Text('Aplicativo atualizado',
                        style: TextStyle(color: theme.text)),
                    subtitle: Text('O FEFO App está na versão mais recente.',
                        style: TextStyle(color: theme.mutedText)),
                  ),
                );
              }
              return Card(
                margin: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                color: hasUpdate ? theme.surface : theme.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: theme.accent.withValues(alpha: 0.4)),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Icon(Icons.android,
                            color: theme.accentSecondary, size: 30),
                        const SizedBox(width: 12),
                        Expanded(
                            child: Text('FEFO App v${app.version}',
                                style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: theme.text))),
                      ]),
                      const SizedBox(height: 8),
                      Text(app.notes, style: TextStyle(color: theme.mutedText)),
                      const SizedBox(height: 10),
                      Align(
                        alignment: Alignment.centerRight,
                        child: FilledButton(
                          onPressed: hasUpdate && !_busy
                              ? () => _installApp(app)
                              : null,
                          child: const Text('Atualizar app'),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          if (_onlineFirmware != null)
            Builder(builder: (context) {
              final firmware = _onlineFirmware!;
              final currentVersion = manager.firmwareVersion;
              final isConnected = manager.isConnected;
              final isAlreadyUpdated = !isConnected ||
                  currentVersion == null ||
                  _compareVersions(firmware.version, currentVersion) <= 0;

              // Se o PET estiver conectado e a versão já for igual ou superior à do servidor,
              // o card SUME da página conforme solicitado pelo usuário.
              if (isAlreadyUpdated) {
                return const SizedBox.shrink();
              }

              const hasUpdate = true;

              String subtitulo;
              String botaoTexto;
              bool habilitado;

              subtitulo =
                  'Sua versão: v$currentVersion ➔ Nova versão: v${firmware.version}\n${firmware.notes}';
              botaoTexto = 'Atualizar';
              habilitado = !_busy;

              return Card(
                margin: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                color: hasUpdate ? theme.surface : theme.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: hasUpdate
                        ? Colors.orange.shade400
                        : Colors.green.shade400,
                    width: 1.5,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Column(children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          hasUpdate ? Icons.system_update : Icons.verified_user,
                          color:
                              hasUpdate ? theme.accent : theme.accentSecondary,
                          size: 32,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Firmware PET FEFO v${firmware.version}',
                            style: const TextStyle(
                              fontFamily: 'KGPen',
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        subtitulo,
                        style: TextStyle(
                          fontSize: 12,
                          color: theme.mutedText,
                        ),
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor:
                              hasUpdate ? theme.accent : theme.accentSecondary,
                        ),
                        onPressed: habilitado
                            ? () => _installFirmware(firmware)
                            : null,
                        child: Text(botaoTexto),
                      ),
                    ),
                    if (_activeDownloadPath == '/firmware.bin' ||
                        (manager.uploading &&
                            manager.uploadCurrentPath == '/firmware.bin'))
                      ProgressoOperacao(
                        status: _activeDownloadPath == '/firmware.bin'
                            ? 'Baixando atualização'
                            : 'Atualizando',
                        progresso: _activeDownloadPath == '/firmware.bin'
                            ? _activeDownloadProgress
                            : manager.uploadItemProgress,
                      ),
                  ]),
                ),
              );
            }),
          if (_busy || manager.uploading || _status.isNotEmpty)
            Container(
              margin: const EdgeInsets.fromLTRB(12, 4, 12, 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                  color: _status.startsWith('Falha')
                      ? Colors.red.shade50
                      : const Color(0xFFFFF4DF),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                      color: _status.startsWith('Falha')
                          ? Colors.red.shade200
                          : const Color(0xFFFFC15A))),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Icon(
                          _status.startsWith('Falha')
                              ? Icons.error_outline
                              : Icons.sync_rounded,
                          color: _status.startsWith('Falha')
                              ? Colors.red.shade800
                              : const Color(0xFFDC4900)),
                      const SizedBox(width: 8),
                      Expanded(
                          child: Text(
                              manager.uploading
                                  ? manager.statusMensagem
                                  : _status,
                              style:
                                  const TextStyle(fontWeight: FontWeight.bold)))
                    ]),
                    if (manager.uploading) ...[
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                          value: manager.uploadProgress.clamp(0, 1),
                          color: const Color(0xFFDC4900),
                          backgroundColor: Colors.white),
                      const SizedBox(height: 5),
                      const Text('Aguarde. O PET reiniciará ao concluir.',
                          style: TextStyle(fontSize: 12, color: Colors.black54))
                    ] else if (_activeDownloadPath != null) ...[
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                          value: _activeDownloadProgress.clamp(0, 1),
                          color: const Color(0xFF318134),
                          backgroundColor: Colors.white),
                      const SizedBox(height: 5),
                      Text(
                          '${(_activeDownloadProgress * 100).clamp(0, 100).toStringAsFixed(0)}%  •  Baixando conteúdo com validação de segurança.',
                          style: const TextStyle(
                              fontSize: 12, color: Colors.black54))
                    ],
                  ]),
            ),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: availableItems.length,
            itemBuilder: (_, index) {
              final item = availableItems[index];
              final selected = _selectedPaths.contains(item.path);
              final downloading = _activeDownloadPath == item.path;
              final transferring =
                  manager.uploading && manager.uploadCurrentPath == item.path;
              final itemProgress = downloading
                  ? _activeDownloadProgress
                  : transferring
                      ? manager.uploadItemProgress
                      : null;
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                padding: const EdgeInsets.fromLTRB(8, 10, 8, 8),
                decoration: BoxDecoration(
                  color: selected
                      ? theme.accent.withValues(alpha: 0.14)
                      : theme.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: selected
                          ? theme.accent
                          : theme.mutedText.withValues(alpha: 0.18)),
                  boxShadow: [
                    BoxShadow(
                        color: theme.background.withValues(alpha: 0.14),
                        blurRadius: 5,
                        offset: Offset(0, 2))
                  ],
                ),
                child: Column(
                  children: [
                    GestureDetector(
                      onLongPress: _busy
                          ? null
                          : () => setState(() {
                                if (selected) {
                                  _selectedPaths.remove(item.path);
                                } else {
                                  _selectedPaths.add(item.path);
                                }
                              }),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(18),
                        onTap: _busy ? null : () => _installItems([item]),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 26,
                                backgroundColor: theme.accentSecondary
                                    .withValues(alpha: .18),
                                child: Icon(
                                  selected
                                      ? Icons.check_circle_rounded
                                      : Icons.audiotrack_rounded,
                                  color: selected
                                      ? theme.accent
                                      : theme.accentSecondary,
                                  size: 28,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.title,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontFamily: 'KGPen',
                                        fontSize: 25,
                                        color: theme.text,
                                        height: 1.05,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      '${item.menu.isEmpty ? item.type : item.menu} • '
                                      '${_formatBytes(item.size)}',
                                      style: TextStyle(
                                        fontFamily: 'KGPen',
                                        fontSize: 17,
                                        color: theme.mutedText,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton.filled(
                                tooltip: selected ? 'Selecionado' : 'Baixar',
                                onPressed:
                                    _busy ? null : () => _installItems([item]),
                                style: IconButton.styleFrom(
                                  backgroundColor: theme.accentSecondary,
                                  foregroundColor: theme.background,
                                ),
                                icon: Icon(selected
                                    ? Icons.check_rounded
                                    : Icons.download_rounded),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    if (itemProgress != null)
                      ProgressoOperacao(
                        status: downloading ? 'Baixando' : 'Instalando',
                        progresso: itemProgress,
                      ),
                  ],
                ),
              );
            },
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 12),
            child: Wrap(
              alignment: WrapAlignment.center,
              spacing: 10,
              runSpacing: 8,
              children: [
                FilledButton.icon(
                  onPressed: _busy ||
                          selected.isEmpty ||
                          (freeAfterSelection != null && freeAfterSelection < 0)
                      ? null
                      : () => _installItems(selected),
                  icon: const Icon(Icons.download),
                  label: Text('Instalar (${selected.length})'),
                ),
              ],
            ),
          ),
          BotaoVerde(
            texto: 'Voltar',
            larguraPercentual: 0.72,
            aoPressionar: () => Navigator.pop(context),
          ),
          const SizedBox(height: 30),
        ]),
      ),
    );
  }
}

class _OnlineItem {
  final String title, type, path, url, checksum, menu, submenu, id;
  final int size;

  const _OnlineItem(
    this.title,
    this.type,
    this.path,
    this.url,
    this.checksum,
    this.menu,
    this.submenu,
    this.id,
    this.size,
  );

  bool get isFace =>
      type.toLowerCase().contains('face') || path.endsWith('.raw');

  Map<String, dynamic> get manifestEntry => {
        'id': id,
        'titulo': title,
        if (menu.isNotEmpty) 'menu': menu,
        if (submenu.isNotEmpty) 'submenu': submenu,
        'arquivo': path,
        'tamanho': size,
        'checksum': checksum,
      };

  factory _OnlineItem.fromJson(Map raw) {
    final map = Map<String, dynamic>.from(raw);
    final path = (map['arquivo'] ?? map['path'] ?? '').toString();
    return _OnlineItem(
      (map['titulo'] ?? map['name'] ?? path).toString(),
      (map['tipo'] ?? (path.endsWith('.raw') ? 'face' : 'áudio')).toString(),
      path,
      (map['url'] ?? map['downloadUrl'] ?? '').toString(),
      (map['checksum'] ?? '').toString(),
      (map['menu'] ?? '').toString(),
      (map['submenu'] ?? map['secao'] ?? '').toString(),
      (map['id'] ?? '').toString(),
      (map['tamanho'] is num) ? (map['tamanho'] as num).toInt() : 0,
    );
  }
}

class _OnlineFirmware {
  final String version, board, url, checksum, notes;
  final int size;

  const _OnlineFirmware({
    required this.version,
    required this.board,
    required this.url,
    required this.checksum,
    required this.notes,
    required this.size,
  });

  factory _OnlineFirmware.fromJson(Map<String, dynamic> map) {
    return _OnlineFirmware(
      version: (map['version'] ?? map['versao'] ?? '').toString(),
      board: (map['board'] ?? '').toString(),
      url: (map['url'] ?? map['downloadUrl'] ?? '').toString(),
      checksum: (map['checksum'] ?? '').toString(),
      notes: (map['notas'] ?? map['notes'] ?? '').toString(),
      size: map['tamanho'] is num ? (map['tamanho'] as num).toInt() : 0,
    );
  }
}

class _OnlineApp {
  final String version, url, checksum, notes;
  final int build, size;

  const _OnlineApp({
    required this.version,
    required this.build,
    required this.url,
    required this.checksum,
    required this.size,
    required this.notes,
  });

  factory _OnlineApp.fromJson(Map<String, dynamic> map) => _OnlineApp(
        version: (map['version'] ?? '').toString(),
        build: (map['build'] as num?)?.toInt() ?? 0,
        url: (map['url'] ?? map['downloadUrl'] ?? '').toString(),
        checksum: (map['checksum'] ?? '').toString(),
        size: (map['tamanho'] as num?)?.toInt() ?? 0,
        notes: (map['notas'] ?? map['notes'] ?? '').toString(),
      );
}
