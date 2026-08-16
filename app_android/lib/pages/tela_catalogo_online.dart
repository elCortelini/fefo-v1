import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_verde.dart';
import '../widgets/pagina_base.dart';
import '../widgets/progresso_operacao.dart';

class TelaCatalogoOnline extends StatefulWidget {
  const TelaCatalogoOnline({super.key});

  @override
  State<TelaCatalogoOnline> createState() => _TelaCatalogoOnlineState();
}

class _TelaCatalogoOnlineState extends State<TelaCatalogoOnline> {
  static const _urlKey = 'fefo_catalog_url';
  static const _defaultCatalogUrl =
      'https://raw.githubusercontent.com/elCortelini/fefo-v1/main/repository/catalog.json';

  final _urlController = TextEditingController();
  final Set<String> _selectedPaths = {};
  List<_OnlineItem> _items = const [];
  _OnlineFirmware? _onlineFirmware;
  _OnlineApp? _onlineApp;
  String _status = 'Informe o link público do catalog.json no Google Drive.';
  bool _busy = false;
  String? _activeDownloadPath;
  double _activeDownloadProgress = 0;

  List<int> _manifestBytes(Map<String, dynamic> manifest) =>
      utf8.encode(const JsonEncoder.withIndent('  ').convert(manifest));

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initialize());
  }

  Future<void> _initialize() async {
    final manager = context.read<BluetoothManager>();
    if (manager.isConnected) {
      setState(() => _status = 'Lendo arquivos instalados no FEFO...');
      await manager.enviarComando('CATALOG GET');
      await manager.enviarComando('SD INFO');
      await Future<void>.delayed(const Duration(milliseconds: 700));
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
      ..connectionTimeout = const Duration(seconds: 20);
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
      final bytes = await _download(url);
      final decoded = jsonDecode(utf8.decode(bytes));
      if (decoded is! Map) throw const FormatException('JSON inválido');
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
        _status = '${items.length} item(ns) no catálogo.';
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
      'firmware': manager.firmwareVersion ?? '0.0.74',
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

  Future<bool> _confirm(String title, String message, String action) async {
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(title),
            content: Text(message),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancelar'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text(action),
              ),
            ],
          ),
        ) ??
        false;
  }

  Future<void> _installItems(Iterable<_OnlineItem> requested) async {
    final manager = context.read<BluetoothManager>();
    final items = requested
        .where((item) => item.url.isNotEmpty && item.path.isNotEmpty)
        .toList();
    if (!manager.isConnected || items.isEmpty) return;
    final confirmed = await _confirm(
      'Instalar no FEFO?',
      '${items.length} item(ns) serão baixados e instalados automaticamente.',
      'Instalar',
    );
    if (!confirmed) return;

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
      if (mounted) {
        setState(() {
          _activeDownloadPath = null;
          _activeDownloadProgress = 0;
        });
      }
      await manager.enviarArquivosPorWifi(uploads, checksums: checksums);
      if (mounted) {
        setState(() {
          _selectedPaths.removeAll(items.map((e) => e.path));
          _status = '${items.length} item(ns) instalado(s). Reconecte ao FEFO.';
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
    if (!manager.isConnected ||
        firmware.url.isEmpty ||
        firmware.checksum.isEmpty) {
      return;
    }
    final current = manager.firmwareVersion ?? 'desconhecida';
    final confirmed = await _confirm(
      'Atualizar firmware?',
      'Versão atual: $current\nNova versão: ${firmware.version}\n\n'
          '${firmware.notes}\n\nNão desligue o FEFO durante a atualização.',
      'Atualizar',
    );
    if (!confirmed) return;
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
                'Firmware v${firmware.version} enviado com sucesso! O PET FEFO está reiniciando. Reconecte o Bluetooth.'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 6),
          ),
        );
        Navigator.of(context).popUntil((route) => route.isFirst);
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
    final confirmed = await _confirm(
      'Atualizar aplicativo?',
      'Será baixado o FEFO App v${app.version}. O Android abrirá a instalação ao final.',
      'Baixar e instalar',
    );
    if (!confirmed) return;
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
    final installed = <String, String>{
      for (final item in manager.audioItems) item.path: item.checksum,
      for (final item in manager.faces) item.path: item.checksum,
    };
    final availableItems =
        _items.where((item) => !installed.containsKey(item.path)).toList();
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
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 12),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                'Catálogo online',
                maxLines: 1,
                softWrap: false,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Billotilde',
                  fontSize: 52,
                  color: Color(0xFF318134),
                ),
              ),
            ),
          ),
          if (_onlineApp != null)
            Builder(builder: (context) {
              final app = _onlineApp!;
              const installedVersion = 63;
              final hasUpdate = app.build > installedVersion;
              return Card(
                margin: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                color: hasUpdate
                    ? Colors.blue.shade50
                    : Colors.white.withValues(alpha: 0.95),
                child: ListTile(
                  leading: Icon(Icons.android,
                      color: hasUpdate
                          ? Colors.blue.shade800
                          : Colors.green.shade700),
                  title: Text('FEFO App v${app.version}'),
                  subtitle: Text(
                      hasUpdate ? app.notes : 'Aplicativo já está atualizado.'),
                  trailing: FilledButton(
                    onPressed:
                        hasUpdate && !_busy ? () => _installApp(app) : null,
                    child: Text(hasUpdate ? 'Atualizar app' : 'Atualizado'),
                  ),
                ),
              );
            }),
          if (_onlineFirmware != null)
            Builder(builder: (context) {
              final firmware = _onlineFirmware!;
              final currentVersion = manager.firmwareVersion;
              final isConnected = manager.isConnected;
              final isAlreadyUpdated = isConnected &&
                  currentVersion != null &&
                  _compareVersions(firmware.version, currentVersion) <= 0;

              // Se o PET estiver conectado e a versão já for igual ou superior à do servidor,
              // o card SUME da página conforme solicitado pelo usuário.
              if (isAlreadyUpdated) {
                return const SizedBox.shrink();
              }

              final hasUpdate = isConnected &&
                  currentVersion != null &&
                  _compareVersions(firmware.version, currentVersion) > 0;

              String subtitulo;
              String botaoTexto;
              bool habilitado;

              if (!isConnected) {
                subtitulo =
                    'Versão do Servidor: v${firmware.version}\nConecte o PET via Bluetooth para instalar esta versão.\n${firmware.notes}';
                botaoTexto = 'Conecte o PET';
                habilitado = false;
              } else {
                subtitulo =
                    'Sua versão: v$currentVersion ➔ Nova versão: v${firmware.version}\n${firmware.notes}';
                botaoTexto = 'Atualizar';
                habilitado = !_busy;
              }

              return Card(
                margin: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                color: hasUpdate
                    ? Colors.orange.shade50
                    : Colors.white.withValues(alpha: 0.95),
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
                    ListTile(
                      leading: Icon(
                        hasUpdate ? Icons.system_update : Icons.verified_user,
                        color: hasUpdate
                            ? Colors.orange.shade800
                            : Colors.green.shade700,
                        size: 32,
                      ),
                      title: Text(
                        'Firmware PET FEFO v${firmware.version}',
                        style: const TextStyle(
                          fontFamily: 'KGPen',
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      subtitle: Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          subtitulo,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade800,
                          ),
                        ),
                      ),
                      trailing: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: hasUpdate
                              ? Colors.orange.shade800
                              : Colors.green.shade700,
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
          Card(
            margin: const EdgeInsets.fromLTRB(12, 8, 12, 2),
            color: Colors.white.withValues(alpha: 0.92),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                'SD livre: ${_formatBytes(manager.sdFreeBytes)}  •  '
                'Selecionado: ${_formatBytes(selectedDownloadBytes)}\n'
                'Livre após instalar: ${_formatBytes(freeAfterSelection)}',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: freeAfterSelection != null && freeAfterSelection < 0
                      ? Colors.red.shade800
                      : Colors.black,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          if (!manager.uploading && _activeDownloadPath == null)
            Padding(
              padding: const EdgeInsets.all(10),
              child: Text(
                manager.uploading
                    ? '${manager.statusMensagem}\n'
                        '${(manager.uploadProgress * 100).clamp(0, 100).toStringAsFixed(0)}%\n'
                        'Aguarde. Não feche o app nem desligue o FEFO.'
                    : _status,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white),
              ),
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
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(
                  color: selected
                      ? const Color(0xFFFFD89A)
                      : Colors.white.withValues(alpha: 0.88),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Column(
                  children: [
                    ListTile(
                      leading: Checkbox(
                        value: selected,
                        onChanged: _busy
                            ? null
                            : (value) => setState(() {
                                  if (value == true) {
                                    _selectedPaths.add(item.path);
                                  } else {
                                    _selectedPaths.remove(item.path);
                                  }
                                }),
                      ),
                      title: Text(
                        item.title,
                        style: const TextStyle(
                          fontFamily: 'KGPen',
                          fontSize: 28,
                          color: Color(0xFF4B5563),
                          height: 1.05,
                        ),
                      ),
                      subtitle: Text(
                        '${item.menu.isEmpty ? item.type : item.menu} • '
                        '${_formatBytes(item.size)}',
                        style: const TextStyle(
                          fontFamily: 'KGPen',
                          fontSize: 18,
                          color: Colors.black87,
                        ),
                      ),
                      onTap: _busy
                          ? null
                          : () => setState(() {
                                selected
                                    ? _selectedPaths.remove(item.path)
                                    : _selectedPaths.add(item.path);
                              }),
                      trailing: IconButton(
                        tooltip: 'Instalar',
                        icon: const Icon(Icons.download),
                        onPressed: _busy ? null : () => _installItems([item]),
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
  final String title, type, path, url, checksum, menu, id;
  final int size;

  const _OnlineItem(
    this.title,
    this.type,
    this.path,
    this.url,
    this.checksum,
    this.menu,
    this.id,
    this.size,
  );

  bool get isFace =>
      type.toLowerCase().contains('face') || path.endsWith('.raw');

  Map<String, dynamic> get manifestEntry => {
        'id': id,
        'titulo': title,
        if (menu.isNotEmpty) 'menu': menu,
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
