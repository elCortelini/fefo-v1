// lib/managers/bluetooth_manager.dart
//
// Gerenciador BLE do FEFO.
//
// A placa usa BLE no padrão Nordic UART Service:
// - RX: característica onde o app escreve comandos.
// - TX: característica onde a placa notifica respostas/status.

import 'dart:async';
import 'dart:convert';
import 'dart:io'
    show
        Platform,
        HttpClient,
        HttpException,
        HttpServer,
        HttpStatus,
        InternetAddress,
        SocketException;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/firmware_version.dart';
import 'dart:developer' as developer;

class _ParsedAudioName {
  final String menu;
  final String submenu;
  final String title;

  const _ParsedAudioName({
    required this.menu,
    required this.submenu,
    required this.title,
  });
}

class FefoAudioItem {
  final int id;
  final String path;
  final String catalogTitle;
  final String catalogGroup;
  final String catalogSubmenu;
  final String checksum;

  const FefoAudioItem({
    required this.id,
    required this.path,
    this.catalogTitle = '',
    this.catalogGroup = '',
    this.catalogSubmenu = '',
    this.checksum = '',
  });

  String get fileName {
    final parts = path.split('/').where((part) => part.isNotEmpty).toList();
    return parts.isEmpty ? path : parts.last;
  }

  String get token {
    final point = fileName.lastIndexOf('.');
    if (point <= 0) return fileName;
    return fileName.substring(0, point);
  }

  _ParsedAudioName get _parsed {
    final rawName = fileName;
    final dotIndex = rawName.lastIndexOf('.');
    final nameWithoutExt =
        dotIndex > 0 ? rawName.substring(0, dotIndex) : rawName;

    if (nameWithoutExt.contains(' - ')) {
      final parts = nameWithoutExt
          .split(' - ')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();
      if (parts.length >= 3) {
        return _ParsedAudioName(
          menu: parts[0],
          submenu: parts[1],
          title: parts.sublist(2).join(' - '),
        );
      } else if (parts.length == 2) {
        return _ParsedAudioName(menu: parts[0], submenu: '', title: parts[1]);
      }
    } else if (nameWithoutExt.contains('-')) {
      final parts = nameWithoutExt
          .split('-')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();
      if (parts.length >= 3) {
        return _ParsedAudioName(
          menu: parts[0],
          submenu: parts[1],
          title: parts.sublist(2).join('-'),
        );
      } else if (parts.length == 2) {
        return _ParsedAudioName(menu: parts[0], submenu: '', title: parts[1]);
      }
    }
    return _ParsedAudioName(
      menu: '',
      submenu: '',
      title: nameWithoutExt.replaceAll('_', ' ').trim(),
    );
  }

  String get title {
    if (catalogTitle.trim().isNotEmpty) return catalogTitle.trim();
    final pTitle = _parsed.title;
    if (pTitle.isNotEmpty) return pTitle;
    return token.replaceAll('_', ' ').replaceAll('-', ' ').trim();
  }

  String get group {
    if (catalogGroup.trim().isNotEmpty) return catalogGroup.trim();
    final pMenu = _parsed.menu;
    if (pMenu.isNotEmpty) return _normalizarGrupo(pMenu);
    if (path.toLowerCase().startsWith('/usr/a/')) {
      return 'Jukebox do Fefo';
    }
    final parts = path.split('/').where((part) => part.isNotEmpty).toList();
    if (parts.length >= 3) {
      return _normalizarGrupo(parts[parts.length - 2]);
    }
    if (parts.length == 2) {
      return _normalizarGrupo(parts.first);
    }
    return 'Áudios do FEFO';
  }

  String get submenu {
    if (catalogSubmenu.trim().isNotEmpty) return catalogSubmenu.trim();
    return _parsed.submenu;
  }

  static String _normalizarGrupo(String raw) {
    switch (raw.toLowerCase()) {
      case 'a':
      case 'audio':
      case 'audios':
        return 'Áudios do FEFO';
      case 'sys':
      case 'usr':
        return 'Sistema';
      case 'jb':
      case 'jukeb':
        return 'Jukebox';
      case 'relax':
        return 'Relaxamento';
      case 'seg':
        return 'Aventuras seguras';
      case 'corpo':
        return 'Meu corpo';
      default:
        return raw
            .replaceAll('_', ' ')
            .replaceAll('-', ' ')
            .replaceAll(RegExp(r'\s+'), ' ')
            .trim();
    }
  }

  factory FefoAudioItem.fromJson(Map<String, dynamic> json) {
    final rawId = json['id'];
    final parsedId = rawId is num
        ? rawId.toInt()
        : int.tryParse(
              rawId?.toString().replaceAll(RegExp(r'[^0-9]'), '') ?? '',
            ) ??
            0;
    var group = (json['group'] ?? json['menu'])?.toString() ?? '';
    var submenu = (json['submenu'] ?? json['secao'])?.toString() ?? '';
    // Catálogos antigos e externos podem representar a hierarquia no próprio
    // campo menu: "Menu principal > Submenu".
    if (submenu.trim().isEmpty && group.contains('>')) {
      final parts = group
          .split('>')
          .map((part) => part.trim())
          .where((part) => part.isNotEmpty)
          .toList();
      if (parts.isNotEmpty) {
        group = parts.first;
        submenu = parts.skip(1).join(' > ');
      }
    }
    return FefoAudioItem(
      id: parsedId,
      path: (json['path'] ?? json['arquivo'])?.toString() ?? '',
      catalogTitle: (json['title'] ?? json['titulo'])?.toString() ?? '',
      catalogGroup: group,
      catalogSubmenu: submenu,
      checksum: json['checksum']?.toString() ?? '',
    );
  }
}

class FefoCatalogItem {
  final int id;
  final String name;
  final String command;
  final String path;
  final String checksum;

  const FefoCatalogItem({
    required this.id,
    this.name = '',
    this.command = '',
    this.path = '',
    this.checksum = '',
  });

  factory FefoCatalogItem.fromJson(Map<String, dynamic> json) {
    final rawId = json['id'];
    final parsedId = rawId is num
        ? rawId.toInt()
        : int.tryParse(
              rawId?.toString().replaceAll(RegExp(r'[^0-9]'), '') ?? '',
            ) ??
            0;
    return FefoCatalogItem(
      id: parsedId,
      name: (json['name'] ?? json['titulo'])?.toString() ?? '',
      command: json['command']?.toString() ?? '',
      path: (json['path'] ?? json['arquivo'])?.toString() ?? '',
      checksum: json['checksum']?.toString() ?? '',
    );
  }
}

class BluetoothManager extends ChangeNotifier {
  static final Guid _serviceUuid = Guid('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
  static final Guid _rxUuid = Guid('6e400002-b5a3-f393-e0a9-e50e24dcca9e');
  static final Guid _txUuid = Guid('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
  static const String _bleNamePrefix = 'FEFO_BLE_V';
  static const MethodChannel _wifiChannel = MethodChannel('fefo/wifi');

  static const String _prefKeyId = 'fefo_ble_id';
  static const String _prefKeyNome = 'fefo_nome';
  static const String _prefKeyCatalogCache = 'fefo_catalog_cache_json';
  static const String _prefKeyFavorites = 'fefo_favorite_audio_paths';
  static const String _prefKeyDarkMode = 'fefo_dark_mode';

  BluetoothManager() {
    carregarCatalogoDoCache();
    _preferenciasVisuaisFuture = _carregarPreferenciasVisuais();
  }

  Future<void>? _preferenciasVisuaisFuture;

  Future<void> _carregarPreferenciasVisuais() async {
    final prefs = await SharedPreferences.getInstance();
    _favoritos = (prefs.getStringList(_prefKeyFavorites) ?? const []).toSet();
    _darkMode = prefs.getBool(_prefKeyDarkMode) ?? false;
    notifyListeners();
  }

  Future<void> carregarCatalogoDoCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedJson = prefs.getString(_prefKeyCatalogCache);
      if (cachedJson != null && cachedJson.isNotEmpty) {
        _aplicarCatalogoJson(cachedJson, saveToCache: false);
      }
    } catch (e) {
      developer.log('Erro ao carregar catálogo em cache: $e',
          name: 'BluetoothManager');
    }
  }

  BluetoothDevice? _connectedDevice;
  BluetoothCharacteristic? _rxCharacteristic;
  BluetoothCharacteristic? _txCharacteristic;

  StreamSubscription<List<ScanResult>>? _scanSubscription;
  StreamSubscription<List<int>>? _txSubscription;
  StreamSubscription<BluetoothConnectionState>? _connectionSubscription;

  bool _isConnecting = false;
  bool _isScanning = false;
  String? _caminhoAudioAtivo;
  String? _audioSelecionado;
  String? _audioPlayPendente;
  Timer? _audioPlayPendenteTimer;
  String _statusMensagem = 'Desconectado';
  String? _ultimoComandoEnviado;
  String? _ultimaRespostaRecebida;
  String? _firmwareVersion;
  String? _protocolVersion;
  String? _lastUpdateResult;
  bool? _panicEnabled;
  bool _recebendoCatalogo = false;
  final List<String> _catalogoJsonLines = [];
  final List<ScanResult> _devicesList = [];
  final List<String> _mensagensRecebidas = [];
  final List<FefoAudioItem> _audioItems = [];
  final List<FefoCatalogItem> _ledEffects = [];
  final List<FefoCatalogItem> _vibrationEffects = [];
  final List<FefoCatalogItem> _faces = [];
  bool _uploading = false;
  double _uploadProgress = 0;
  String? _uploadCurrentPath;
  String? _operationPath;
  double _uploadItemProgress = 0;
  double _audioProgress = 0;
  int _audioPosSec = 0;
  int _audioTotalSec = 0;
  int _audioVolume = 50;
  int _ledCount = 35;
  int? _ledPatternSelecionado;
  int? _vibracaoSelecionada;
  String _audioControlState = 'idle';
  bool _audioPaused = false;
  Set<String> _favoritos = <String>{};
  bool _darkMode = false;
  bool _faceModeEnabled = false;
  bool _faceRandomEnabled = true;
  bool _developerModeEnabled = false;
  String? _currentFacePath;
  Timer? _audioProgressTimer;
  List<FefoAudioItem> _audioQueue = const [];
  int _audioQueueIndex = -1;
  Timer? _keepAliveTimer;
  Timer? _autoReconnectTimer;
  bool _autoReconnectInProgress = false;
  bool _intentionalDisconnect = false;
  bool _unexpectedDisconnectEvent = false;
  int? _bateriaPercentual = 100;
  bool? _lastTransferSucceeded;
  int? _sdTotalBytes;
  int? _sdUsedBytes;
  int? _sdFreeBytes;
  final List<Completer<String>> _lineWaiters = [];
  Completer<void>? _catalogReadCompleter;

  bool get isConnected => _connectedDevice != null && _rxCharacteristic != null;
  bool consumeUnexpectedDisconnect() {
    final occurred = _unexpectedDisconnectEvent;
    _unexpectedDisconnectEvent = false;
    return occurred;
  }

  bool get isConnecting => _isConnecting;
  bool get isScanning => _isScanning;
  int? get bateriaPercentual => _bateriaPercentual;
  bool get bateriaBaixa => (_bateriaPercentual ?? 100) <= 20;
  BluetoothDevice? get connectedDevice => _connectedDevice;
  String get dispositivoConectadoNome {
    if (_connectedDevice == null) return '';
    if (_connectedDevice!.platformName.isNotEmpty)
      return _connectedDevice!.platformName;
    if (_connectedDevice!.advName.isNotEmpty) return _connectedDevice!.advName;
    return 'FEFO BLE';
  }

  bool get lendoCatalogo => _recebendoCatalogo;
  bool get catalogLoaded =>
      !_recebendoCatalogo && (_audioItems.isNotEmpty || _faces.isNotEmpty);
  String? get caminhoAudioAtivo => _caminhoAudioAtivo;
  String? get audioSelecionado => _audioSelecionado;
  List<ScanResult> get devicesList => List.unmodifiable(_devicesList);
  String get statusMensagem => _statusMensagem;
  String? get ultimoComandoEnviado => _ultimoComandoEnviado;
  String? get ultimaRespostaRecebida => _ultimaRespostaRecebida;
  String? get firmwareVersion => _firmwareVersion;
  String? get protocolVersion => _protocolVersion;
  String? get lastUpdateResult => _lastUpdateResult;
  bool? get panicEnabled => _panicEnabled;
  bool get recebendoCatalogo => _recebendoCatalogo;
  List<String> get mensagensRecebidas => List.unmodifiable(_mensagensRecebidas);
  List<FefoAudioItem> get audioItems => List.unmodifiable(_audioItems);
  List<FefoCatalogItem> get ledEffects => List.unmodifiable(_ledEffects);
  List<FefoCatalogItem> get vibrationEffects =>
      List.unmodifiable(_vibrationEffects);
  int? get ledPatternSelecionado => _ledPatternSelecionado;
  int? get vibracaoSelecionada => _vibracaoSelecionada;
  List<FefoCatalogItem> get faces => List.unmodifiable(_faces);
  bool get uploading => _uploading;
  double get uploadProgress => _uploadProgress;
  String? get uploadCurrentPath => _uploadCurrentPath;
  String? get operationPath => _operationPath;
  double get uploadItemProgress => _uploadItemProgress;
  double get audioProgress => _audioProgress;
  int get audioPosSec => _audioPosSec;
  int get audioTotalSec => _audioTotalSec;
  String get posTimeFormatted {
    final m = _audioPosSec ~/ 60;
    final s = _audioPosSec % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  String get totalTimeFormatted {
    final m = _audioTotalSec ~/ 60;
    final s = _audioTotalSec % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  String get audioAtivoTitulo {
    if (_caminhoAudioAtivo == null || _caminhoAudioAtivo!.isEmpty) {
      return 'Nenhum áudio em execução';
    }
    for (final item in _audioItems) {
      if (audioRefAtivo(item.path) || audioRefAtivo(item.token)) {
        return item.title.isNotEmpty ? item.title : item.fileName;
      }
    }
    final baseName = _caminhoAudioAtivo!.split('/').last;
    return baseName.replaceAll('.wav', '').replaceAll('.mp3', '');
  }

  int get audioVolume => _audioVolume;
  int get ledCount => _ledCount;
  bool get audioPaused => _audioPaused;
  bool get audioPlaying => _audioControlState == 'playing';
  bool get audioStopped => _audioControlState == 'stopped';
  bool get darkMode => _darkMode;
  bool isFavorite(String path) => _favoritos.contains(path);

  bool audioRefAtivo(String ref) {
    final ativo = _caminhoAudioAtivo ?? _audioSelecionado;
    if (ativo == null || ativo.trim().isEmpty || ref.trim().isEmpty) {
      return false;
    }
    String normalizar(String value) {
      var limpo = value.trim().toLowerCase();
      if (limpo.startsWith('p:')) limpo = limpo.substring(2).trim();
      if (limpo.startsWith('play ')) limpo = limpo.substring(5).trim();
      final base = limpo.split('/').last;
      return base.replaceFirst(RegExp(r'\.(wav|mp3|ogg)$'), '');
    }

    return normalizar(ativo) == normalizar(ref);
  }

  Future<void> alternarFavoritoPorCaminho(String path) async {
    await _preferenciasVisuaisFuture;
    final prefs = await SharedPreferences.getInstance();
    if (!_favoritos.add(path)) _favoritos.remove(path);
    notifyListeners();
    await prefs.setStringList(_prefKeyFavorites, _favoritos.toList());
  }

  List<FefoAudioItem> get favoriteAudios =>
      _audioItems.where((item) => _favoritos.contains(item.path)).toList();

  Future<void> alternarFavorito(FefoAudioItem item) async {
    // Aguarda a leitura inicial para que ela não sobrescreva um toque feito
    // logo ao abrir a tela.
    await _preferenciasVisuaisFuture;
    final prefs = await SharedPreferences.getInstance();
    if (!_favoritos.add(item.path)) _favoritos.remove(item.path);
    notifyListeners();
    await prefs.setStringList(_prefKeyFavorites, _favoritos.toList());
  }

  Future<void> setDarkMode(bool enabled) async {
    _darkMode = enabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefKeyDarkMode, enabled);
    notifyListeners();
  }

  bool get faceModeEnabled => _faceModeEnabled;
  bool get faceRandomEnabled => _faceRandomEnabled;
  bool get developerModeEnabled => _developerModeEnabled;
  String? get currentFacePath => _currentFacePath;
  bool? get lastTransferSucceeded => _lastTransferSucceeded;
  void acknowledgeUpdateResult() {
    _lastTransferSucceeded = null;
    notifyListeners();
  }

  bool get aguardandoReconexao =>
      _lastTransferSucceeded == true && !isConnected && !_uploading;
  int? get sdTotalBytes => _sdTotalBytes;
  int? get sdUsedBytes => _sdUsedBytes;
  int? get sdFreeBytes => _sdFreeBytes;

  Map<String, List<FefoAudioItem>> get audioGroups {
    final groups = <String, List<FefoAudioItem>>{};
    for (final item in _audioItems) {
      groups.putIfAbsent(item.group, () => []).add(item);
    }
    return groups;
  }

  void _setStatus(String msg) {
    _statusMensagem = msg;
    developer.log(msg, name: 'BluetoothManager');
    notifyListeners();
  }

  String nomeDoDispositivo(ScanResult result) {
    final advName = result.advertisementData.advName;
    if (advName.isNotEmpty) return advName;

    final platformName = result.device.platformName;
    if (platformName.isNotEmpty) return platformName;

    return 'FEFO BLE (${result.device.remoteId})';
  }

  Future<bool> solicitarPermissoes() async {
    final permissions = <Permission>[
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.locationWhenInUse,
    ];

    final statuses = await permissions.request();
    return statuses.values.every(
      (status) => status.isGranted || status.isLimited,
    );
  }

  Future<void> carregarDispositivosPareados() async {
    if (!await solicitarPermissoes()) {
      _setStatus('Permissões de Bluetooth necessárias.');
      return;
    }

    if (!await FlutterBluePlus.isSupported) {
      _setStatus('Este aparelho não suporta BLE.');
      return;
    }

    _isScanning = true;
    _devicesList.clear();
    _setStatus('Buscando FEFO por BLE...');

    try {
      if (!kIsWeb && Platform.isAndroid) {
        await FlutterBluePlus.turnOn();
      }

      await _scanSubscription?.cancel();
      _scanSubscription = FlutterBluePlus.onScanResults.listen((results) {
        final unicos = <String, ScanResult>{};
        for (final result in results.where(_isFefoScanResult)) {
          final id = result.device.remoteId.toString();
          final anterior = unicos[id];
          if (anterior == null || result.rssi > anterior.rssi) {
            unicos[id] = result;
          }
        }
        final encontrados = unicos.values.toList()
          ..sort((a, b) => b.rssi.compareTo(a.rssi));

        _devicesList
          ..clear()
          ..addAll(encontrados);

        notifyListeners();
      });

      await FlutterBluePlus.startScan(timeout: const Duration(seconds: 10));
      await FlutterBluePlus.isScanning
          .where((scanning) => scanning == false)
          .first;

      _setStatus(
        _devicesList.isEmpty
            ? 'Nenhum FEFO BLE encontrado.'
            : 'FEFO encontrado. Toque para conectar.',
      );
    } catch (e) {
      _setStatus('Erro ao buscar BLE: $e');
    } finally {
      _isScanning = false;
      notifyListeners();
    }
  }

  /// Localiza e conecta automaticamente ao último FEFO conhecido.
  /// A confirmação visual do usuário não é necessária; permissões do Android
  /// continuam sendo respeitadas quando o sistema ainda não as concedeu.
  Future<bool> conectarAutomaticamenteAoFefo() async {
    if (isConnected) return true;
    if (!await solicitarPermissoes()) {
      _setStatus('Permissões de Bluetooth necessárias para conectar ao PET.');
      return false;
    }
    if (!await FlutterBluePlus.isSupported) {
      _setStatus('Este aparelho não suporta BLE.');
      return false;
    }

    final prefs = await SharedPreferences.getInstance();
    final savedId = prefs.getString(_prefKeyId);
    final encontrados = <String, ScanResult>{};
    _isScanning = true;
    _setStatus('Conectando automaticamente ao PET FEFO...');
    final subscription = FlutterBluePlus.onScanResults.listen((results) {
      for (final result in results.where(_isFefoScanResult)) {
        encontrados[result.device.remoteId.toString()] = result;
      }
    });
    try {
      if (!kIsWeb && Platform.isAndroid) await FlutterBluePlus.turnOn();
      await FlutterBluePlus.startScan(timeout: const Duration(seconds: 12));
      await FlutterBluePlus.isScanning
          .where((scanning) => scanning == false)
          .first;
    } catch (e) {
      _setStatus('Falha ao localizar o PET: $e');
      return false;
    } finally {
      await subscription.cancel();
      _isScanning = false;
    }
    final result = (savedId != null ? encontrados[savedId] : null) ??
        (encontrados.isEmpty ? null : encontrados.values.first);
    if (result == null) {
      _setStatus('PET FEFO não encontrado. Ligue o PET e tente novamente.');
      return false;
    }
    await connectToDevice(result);
    return isConnected;
  }

  bool _isFefoScanResult(ScanResult result) {
    final name = nomeDoDispositivo(result).toUpperCase();
    final services = result.advertisementData.serviceUuids;
    return name.startsWith(_bleNamePrefix) && services.contains(_serviceUuid);
  }

  Future<void> connectToDevice(ScanResult result) async {
    if (_isConnecting) return;

    await disconnectFromDevice();

    final device = result.device;
    _isConnecting = true;
    _setStatus('Conectando ao ${nomeDoDispositivo(result)}...');

    try {
      await device.connect(
        license: License.nonprofit,
        timeout: const Duration(seconds: 15),
        autoConnect: false,
      );

      _connectedDevice = device;
      _connectionSubscription = device.connectionState.listen((state) {
        if (state == BluetoothConnectionState.disconnected) {
          final unexpected = !_intentionalDisconnect;
          _cleanup();
          if (unexpected) {
            _unexpectedDisconnectEvent = true;
            _setStatus('Conexão BLE perdida. Procurando o FEFO novamente...');
            _iniciarReconexaoAutomatica();
          }
        }
      });

      if (!kIsWeb && Platform.isAndroid) {
        await device.requestMtu(512);
      }

      await _discoverUartCharacteristics(device);
      await _setupNotifications();

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKeyId, device.remoteId.toString());
      await prefs.setString(_prefKeyNome, nomeDoDispositivo(result));

      _setStatus('Conectado por BLE. Pronto para comandos.');
      _iniciarKeepAlive();
      await enviarComando('APP SYNC');
      // Só libera a conexão para as telas depois que o catálogo inteiro foi
      // recebido; caso contrário o menu pode ser montado com a lista antiga.
      await lerCatalogoAtualizado();
      await setVolume(50);
    } catch (e) {
      _setStatus('Falha ao conectar BLE: $e');
      await disconnectFromDevice();
    } finally {
      _isConnecting = false;
      notifyListeners();
    }
  }

  Future<void> _discoverUartCharacteristics(BluetoothDevice device) async {
    final services = await device.discoverServices();

    for (final service in services) {
      if (service.uuid != _serviceUuid) continue;

      for (final characteristic in service.characteristics) {
        if (characteristic.uuid == _rxUuid) {
          _rxCharacteristic = characteristic;
        } else if (characteristic.uuid == _txUuid) {
          _txCharacteristic = characteristic;
        }
      }
    }

    if (_rxCharacteristic == null || _txCharacteristic == null) {
      throw Exception('Serviço UART FEFO não encontrado.');
    }
  }

  Future<void> _setupNotifications() async {
    if (_txCharacteristic == null) return;

    await _txSubscription?.cancel();
    _txSubscription = _txCharacteristic!.onValueReceived.listen((value) {
      final texto = utf8.decode(value, allowMalformed: true);
      for (final line in const LineSplitter().convert(texto)) {
        _processarLinhaRecebida(line.trim());
      }
    });

    await _txCharacteristic!.setNotifyValue(true);
  }

  void _processarLinhaRecebida(String texto) {
    if (texto.isEmpty) return;

    _ultimaRespostaRecebida = texto;
    _mensagensRecebidas.add(texto);
    for (final waiter in List<Completer<String>>.from(_lineWaiters)) {
      if (!waiter.isCompleted) waiter.complete(texto);
    }
    _lineWaiters.clear();
    if (_mensagensRecebidas.length > 80) {
      _mensagensRecebidas.removeAt(0);
    }

    _interpretarLinhaDeCatalogo(texto);
    _setStatus('FEFO: $texto');
  }

  void _interpretarLinhaDeCatalogo(String texto) {
    if (texto.startsWith('OK SD ')) {
      _sdTotalBytes = int.tryParse(_extrairCampo(texto, 'TOTAL') ?? '');
      _sdUsedBytes = int.tryParse(_extrairCampo(texto, 'USED') ?? '');
      _sdFreeBytes = int.tryParse(_extrairCampo(texto, 'FREE') ?? '');
      notifyListeners();
      return;
    }
    if (texto.startsWith('UPDATE LAST ')) {
      _lastUpdateResult = texto.substring(12).trim();
      notifyListeners();
      return;
    }
    if (texto.startsWith('BEGIN APP SYNC')) {
      _firmwareVersion = _extrairCampo(texto, 'FW') ?? _firmwareVersion;
      _protocolVersion = _extrairCampo(texto, 'PROTO') ?? _protocolVersion;
      _audioItems.clear();
      _faces.clear();
      notifyListeners();
      return;
    }

    if (texto.startsWith('STATE MIC=') || texto.startsWith('OK STATUS')) {
      final batStr = _extrairCampo(texto, 'BAT');
      if (batStr != null) {
        final val = int.tryParse(batStr.replaceAll('%', '').trim());
        if (val != null) {
          _bateriaPercentual = val;
        }
      }
      final panic = _extrairCampo(texto, 'PANIC_EN');
      if (panic != null) {
        _panicEnabled = panic.toUpperCase() == 'ON';
      }
      notifyListeners();
      return;
    }

    if (texto.startsWith('OK AUDIO ')) {
      final state = _extrairCampo(texto, 'STATE')?.toUpperCase();
      final position = int.tryParse(_extrairCampo(texto, 'POS') ?? '') ?? 0;
      final size = int.tryParse(_extrairCampo(texto, 'SIZE') ?? '') ?? 0;
      final file = _extrairCampo(texto, 'FILE');
      if (file != null && file != '-') {
        _caminhoAudioAtivo = file;
      }
      _audioPosSec = int.tryParse(_extrairCampo(texto, 'POS_SEC') ?? '') ??
          (position ~/ 32000);
      _audioTotalSec = int.tryParse(_extrairCampo(texto, 'TOTAL_SEC') ?? '') ??
          (size ~/ 32000);
      _audioVolume =
          int.tryParse(_extrairCampo(texto, 'VOL') ?? '') ?? _audioVolume;
      _audioPaused = state == 'PAUSED';
      if (state == 'PLAYING' || state == 'PAUSED') {
        _audioPlayPendente = null;
        _audioPlayPendenteTimer?.cancel();
        _audioPlayPendenteTimer = null;
        _audioControlState = state == 'PAUSED' ? 'paused' : 'playing';
      }
      if (size > 0) {
        _audioProgress = (position / size).clamp(0.0, 1.0);
      }
      if (state == 'IDLE') {
        // O PET pode enviar um IDLE intermediário enquanto abre o arquivo.
        if (_audioPlayPendente != null) {
          notifyListeners();
          return;
        }
        _caminhoAudioAtivo = null;
        _audioSelecionado = null;
        _audioProgress = 0;
        _audioPosSec = 0;
        _audioTotalSec = 0;
        _audioPaused = false;
        _audioProgressTimer?.cancel();
        if (_audioQueueIndex >= 0 &&
            _audioQueueIndex + 1 < _audioQueue.length) {
          _audioQueueIndex++;
          final fila = List<FefoAudioItem>.from(_audioQueue);
          final proximo = _audioQueueIndex;
          Future<void>.microtask(() async {
            await _playAudio(fila[proximo].token, resetQueue: false);
            _audioQueue = fila;
            _audioQueueIndex = proximo;
          });
        } else {
          _audioQueue = const [];
          _audioQueueIndex = -1;
        }
      }
      notifyListeners();
      return;
    }

    if (texto.startsWith('OK VOL ')) {
      _audioVolume =
          int.tryParse(_extrairCampo(texto, 'VOL') ?? texto.split(' ').last) ??
              _audioVolume;
      notifyListeners();
      return;
    }

    if (texto.startsWith('OK FACE MODE=')) {
      _faceModeEnabled = _extrairCampo(texto, 'MODE') == 'ON';
      _faceRandomEnabled = _extrairCampo(texto, 'RANDOM') == 'ON';
      final current = _extrairCampo(texto, 'CURRENT');
      _currentFacePath = current == '-' ? null : current;
      notifyListeners();
      return;
    }

    if (texto == 'OK MODE FACES') {
      _faceModeEnabled = true;
      notifyListeners();
      return;
    }
    if (texto == 'OK MODE BLE') {
      _faceModeEnabled = false;
      notifyListeners();
      return;
    }
    if (texto == 'OK FACE RANDOM ON' || texto == 'OK FACE RANDOM OFF') {
      _faceRandomEnabled = texto.endsWith('ON');
      notifyListeners();
      return;
    }

    if (texto.startsWith('OK PANIC')) {
      if (texto.contains(' EN=ON') || texto.endsWith(' ON')) {
        _panicEnabled = true;
      } else if (texto.contains(' EN=OFF') || texto.endsWith(' OFF')) {
        _panicEnabled = false;
      }
      notifyListeners();
      return;
    }

    if (texto.startsWith('APP AUDIO ')) {
      final match = RegExp(r'^APP AUDIO\s+(\d+)\s+(.+)$').firstMatch(texto);
      if (match != null) {
        _adicionarAudioCatalogo(
          FefoAudioItem(
            id: int.tryParse(match.group(1) ?? '') ?? _audioItems.length + 1,
            path: match.group(2)?.trim() ?? '',
          ),
        );
      }
      return;
    }

    if (texto.startsWith('APP FACE ')) {
      final match = RegExp(r'^APP FACE\s+(\d+)\s+(.+)$').firstMatch(texto);
      if (match != null) {
        final path = match.group(2)?.trim() ?? '';
        if (path.isNotEmpty && !_faces.any((face) => face.path == path)) {
          _faces.add(
            FefoCatalogItem(
              id: int.tryParse(match.group(1) ?? '') ?? _faces.length + 1,
              path: path,
            ),
          );
          notifyListeners();
        }
      }
      return;
    }

    if (texto == 'BEGIN CATALOG') {
      _recebendoCatalogo = true;
      _catalogoJsonLines.clear();
      notifyListeners();
      return;
    }

    if (texto.startsWith('END CATALOG')) {
      _recebendoCatalogo = false;
      _aplicarCatalogoJson(_catalogoJsonLines.join('\n'));
      _catalogoJsonLines.clear();
      final completed = _catalogReadCompleter;
      _catalogReadCompleter = null;
      if (completed != null && !completed.isCompleted) completed.complete();
      notifyListeners();
      return;
    }

    if (_recebendoCatalogo) {
      _catalogoJsonLines.add(texto);
      return;
    }

    if (texto == 'ERR CATALOG NOT_FOUND') {
      Future.microtask(() async {
        await enviarComando('CATALOG BUILD');
        await enviarComando('CATALOG GET');
      });
      return;
    }
  }

  String? _extrairCampo(String texto, String campo) {
    final match = RegExp('$campo=([^\\s]+)').firstMatch(texto);
    return match?.group(1);
  }

  void _aplicarCatalogoJson(String rawJson, {bool saveToCache = true}) {
    try {
      final decoded = jsonDecode(rawJson);
      if (decoded is! Map<String, dynamic>) return;

      // APP SYNC informa a versao realmente em execucao. O manifesto do
      // SDCard pode ser antigo e nao deve sobrescrever esse valor.
      _firmwareVersion ??= decoded['firmware']?.toString();
      _protocolVersion = decoded['protocol']?.toString() ?? _protocolVersion;

      final audios = decoded['audios'] ?? decoded['audio'];
      if (audios is List) {
        _audioItems.clear();
        for (final audio in audios) {
          if (audio is Map<String, dynamic>) {
            _adicionarAudioCatalogo(FefoAudioItem.fromJson(audio));
          } else if (audio is Map) {
            _adicionarAudioCatalogo(
              FefoAudioItem.fromJson(Map<String, dynamic>.from(audio)),
            );
          }
        }
      }

      _lerItensCatalogo(decoded['led_effects'], _ledEffects);
      _lerItensCatalogo(decoded['vibration_effects'], _vibrationEffects);
      _lerItensCatalogo(decoded['faces'], _faces);
      _garantirEfeitosPadrao();
      if (saveToCache) {
        SharedPreferences.getInstance().then((prefs) {
          prefs.setString(_prefKeyCatalogCache, rawJson);
        });
      }
      notifyListeners();
    } catch (e) {
      developer.log('Erro ao ler fefo.json: $e', name: 'BluetoothManager');
    }
  }

  void _garantirEfeitosPadrao() {
    if (_ledEffects.isEmpty) {
      _ledEffects.addAll(List.generate(10, (index) {
        const names = [
          'Confete neon',
          'Onda tropical',
          'Foguete',
          'Pulsos de festa',
          'Fogo divertido',
          'Ping-pong',
          'Arco-íris',
          'Estrelas',
          'Balada pastel',
          'Chuva colorida',
        ];
        final id = index + 1;
        return FefoCatalogItem(id: id, name: names[index], command: 'LED $id');
      }));
    }
    if (_vibrationEffects.isEmpty) {
      _vibrationEffects.addAll(List.generate(10, (index) {
        const names = [
          'Metralhadora',
          'Batida dupla',
          'SOS intenso',
          'Onda forte',
          'Triplo impacto',
          'Sirene',
          'Marcha',
          'Crescendo',
          'Festa',
          'Pulso'
        ];
        final id = index + 1;
        return FefoCatalogItem(
          id: id,
          name: names[index],
          command: 'VIBRA $id',
        );
      }));
    }
  }

  void _lerItensCatalogo(dynamic raw, List<FefoCatalogItem> destino) {
    if (raw is! List) return;
    destino
      ..clear()
      ..addAll(
        raw.whereType<Map>().map(
              (item) => FefoCatalogItem.fromJson(
                Map<String, dynamic>.from(item),
              ),
            ),
      );
  }

  Future<void> atualizarCatalogo() async {
    await enviarComando('CATALOG BUILD');
    await Future<void>.delayed(const Duration(milliseconds: 250));
    await enviarComando('CATALOG GET');
  }

  Future<void> lerCatalogoAtualizado() async {
    final completed = Completer<void>();
    _catalogReadCompleter = completed;
    try {
      await enviarComando('CATALOG GET');
      await completed.future.timeout(const Duration(seconds: 8));
    } on TimeoutException {
      // O catálogo recebido até aqui continua válido para uso offline.
    } finally {
      if (identical(_catalogReadCompleter, completed)) {
        _catalogReadCompleter = null;
      }
    }
  }

  Future<void> enviarArquivo(
    String destino,
    List<int> bytes,
  ) async {
    if (!isConnected || bytes.isEmpty || _uploading) return;
    _uploading = true;
    _uploadProgress = 0;
    _uploadCurrentPath = null;
    _uploadItemProgress = 0;
    notifyListeners();

    try {
      await enviarComando('FILE BEGIN $destino ${bytes.length}');
      await Future<void>.delayed(const Duration(milliseconds: 180));
      const chunkSize = 80;
      var sequence = 0;
      for (var offset = 0; offset < bytes.length; offset += chunkSize) {
        final end = (offset + chunkSize).clamp(0, bytes.length).toInt();
        final chunk = bytes.sublist(offset, end);
        final hex = chunk
            .map((value) => value.toRadixString(16).padLeft(2, '0'))
            .join()
            .toUpperCase();
        final checksum =
            chunk.fold<int>(0, (sum, value) => (sum + value) & 0xFF);
        await enviarComando(
          'FX $sequence $hex ${checksum.toRadixString(16).padLeft(2, '0').toUpperCase()}',
        );
        sequence++;
        _uploadProgress = end / bytes.length;
        notifyListeners();
        await Future<void>.delayed(const Duration(milliseconds: 55));
      }
      await enviarComando('FILE END');
      await Future<void>.delayed(const Duration(milliseconds: 350));
      await atualizarCatalogo();
    } finally {
      _uploading = false;
      notifyListeners();
    }
  }

  Future<String> _aguardarLinha(bool Function(String) aceita,
      {Duration timeout = const Duration(seconds: 12)}) async {
    final limite = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(limite)) {
      final completer = Completer<String>();
      _lineWaiters.add(completer);
      final restante = limite.difference(DateTime.now());
      final line =
          await completer.future.timeout(restante, onTimeout: () => '');
      _lineWaiters.remove(completer);
      if (line.isNotEmpty && aceita(line)) return line;
    }
    throw TimeoutException('O FEFO nao respondeu ao inicio do Wi-Fi.');
  }

  Future<void> enviarArquivosPorWifi(Map<String, List<int>> arquivos,
      {Map<String, String> checksums = const {},
      List<String> excluir = const []}) async {
    if (!isConnected) {
      throw StateError(
          'Conecte novamente ao FEFO antes de iniciar a transferência.');
    }
    if (arquivos.isEmpty) {
      throw ArgumentError('Nenhum arquivo foi preparado para transferência.');
    }
    if (_uploading) {
      throw StateError('Já existe uma transferência em andamento.');
    }
    _uploading = true;
    _lastTransferSucceeded = null;
    _uploadProgress = 0;
    notifyListeners();
    try {
      final respostaFuture = _aguardarLinha((line) =>
          line.startsWith('OK WIFI PUSH ') || line.startsWith('ERR WIFI'));
      await enviarComando('WIFI PUSH START');
      final resposta = await respostaFuture;
      if (!resposta.startsWith('OK ')) throw Exception(resposta);
      final ssid = _extrairCampo(resposta, 'SSID');
      final pass = _extrairCampo(resposta, 'PASS');
      final ip = _extrairCampo(resposta, 'IP');
      final token = _extrairCampo(resposta, 'TOKEN');
      if ([ssid, pass, ip, token].any((v) => v == null || v.isEmpty)) {
        throw Exception('Dados da rede FEFO incompletos.');
      }
      await _wifiChannel.invokeMethod<bool>('connect', {
        'ssid': ssid,
        'password': pass,
      });
      _setStatus('Wi-Fi conectado. Aguardando o servidor do FEFO...');
      await _aguardarServidorWifi(ip!, token!);
      _setStatus('Wi-Fi do FEFO conectado. Iniciando gravação no SDCard...');
      for (final path in excluir) {
        final deleteClient = HttpClient();
        try {
          final request =
              await deleteClient.deleteUrl(Uri.parse('http://$ip/file'));
          request.headers.set('X-Fefo-Token', token);
          request.headers.set('X-Fefo-Path', path);
          final response = await request.close();
          final body = await utf8.decoder.bind(response).join();
          if (response.statusCode != 200 && response.statusCode != 404) {
            throw HttpException('$body (${response.statusCode})');
          }
        } finally {
          deleteClient.close();
        }
      }
      final total =
          arquivos.values.fold<int>(0, (sum, bytes) => sum + bytes.length);
      var enviados = 0;
      for (final entry in arquivos.entries) {
        _uploadCurrentPath = entry.key;
        _uploadItemProgress = 0;
        _setStatus('Gravando ${entry.key} no FEFO...');
        Object? lastError;
        var stored = false;
        for (var attempt = 1; attempt <= 3 && !stored; attempt++) {
          final client = HttpClient()
            ..connectionTimeout = const Duration(seconds: 15);
          try {
            final request = await client.putUrl(Uri.parse('http://$ip/file'));
            request.headers.set('X-Fefo-Token', token);
            request.headers.set('X-Fefo-Path', entry.key);
            final checksum = checksums[entry.key] ?? '';
            if (checksum.isNotEmpty) {
              request.headers
                  .set('X-Fefo-Sha256', checksum.replaceFirst('sha256:', ''));
            }
            request.contentLength = entry.value.length;
            const block = 64 * 1024;
            for (var offset = 0; offset < entry.value.length; offset += block) {
              final end = (offset + block).clamp(0, entry.value.length).toInt();
              request.add(entry.value.sublist(offset, end));
              await request.flush();
              _uploadProgress = (enviados + end) / total;
              _uploadItemProgress = end / entry.value.length;
              notifyListeners();
            }
            final response = await request.close();
            final body = await utf8.decoder.bind(response).join();
            if (response.statusCode != 200) {
              throw HttpException('$body (${response.statusCode})');
            }
            stored = true;
            enviados += entry.value.length;
          } on SocketException catch (error) {
            lastError = error;
            if (attempt < 3) {
              _setStatus(
                  'Conexão instável; repetindo ${entry.key} ($attempt/3)...');
              await Future<void>.delayed(const Duration(seconds: 1));
            }
          } on TimeoutException catch (error) {
            lastError = error;
            if (attempt < 3) {
              _setStatus(
                  'Tempo esgotado; repetindo ${entry.key} ($attempt/3)...');
              await Future<void>.delayed(const Duration(seconds: 1));
            }
          } finally {
            client.close(force: true);
          }
        }
        if (!stored) {
          throw lastError ??
              HttpException('O FEFO não confirmou ${entry.key}.');
        }
      }
      final finishClient = HttpClient();
      try {
        try {
          final finish =
              await finishClient.postUrl(Uri.parse('http://$ip/finish'));
          finish.headers.set('X-Fefo-Token', token);
          finish.contentLength = 0;
          await (await finish.close()).drain<void>();
        } on SocketException {
          // O FEFO reinicia logo após aceitar /finish e pode encerrar o socket
          // antes de o Android receber a resposta — inclusive durante postUrl.
        } on HttpException {
          // Todos os arquivos já foram confirmados individualmente neste ponto.
          // Uma conexão abortada aqui significa que o reboot foi iniciado.
        } on TimeoutException {
          // O reinício pode ocorrer antes de o Android concluir a leitura.
        }
      } finally {
        finishClient.close();
      }
      await _wifiChannel.invokeMethod<bool>('disconnect');
      _lastTransferSucceeded = true;
      _setStatus('Concluído. Reconecte o Bluetooth.');
    } catch (_) {
      _lastTransferSucceeded = false;
      // /finish não é cancelamento: no firmware ele confirma a transferência
      // e reinicia o PET. Em uma falha de rede, apenas desconectamos o Android
      // e deixamos o servidor expirar para o BLE ser reativado sem reboot.
      rethrow;
    } finally {
      try {
        await _wifiChannel.invokeMethod<bool>('disconnect');
      } catch (_) {}
      _uploading = false;
      _uploadCurrentPath = null;
      _uploadItemProgress = 0;
      notifyListeners();
    }
  }

  Future<void> _aguardarServidorWifi(String ip, String token) async {
    Object? lastError;
    // Compatibilidade com o transporte que funcionava nas versões anteriores:
    // basta o PET responder ao socket local; não exigir corpo/status evita que
    // Android trate o fechamento rápido da resposta como falha da conexão.
    for (var attempt = 1; attempt <= 15; attempt++) {
      final client = HttpClient()
        ..connectionTimeout = const Duration(seconds: 2);
      try {
        final request = await client.getUrl(Uri.parse('http://$ip/ping'));
        request.headers.set('X-Fefo-Token', token);
        await (await request.close()).drain<void>();
        return;
      } catch (error) {
        lastError = error;
        _setStatus('Aguardando servidor do FEFO ($attempt/15)...');
        await Future<void>.delayed(const Duration(milliseconds: 700));
      } finally {
        client.close(force: true);
      }
    }
    throw HttpException(
      'Servidor do FEFO inacessível em $ip. Verifique se o Wi‑Fi do PET foi conectado: $lastError',
    );
  }

  Future<void> enviarArquivosViaHotspot(Map<String, List<int>> arquivos,
      {Map<String, String> checksums = const {},
      List<String> excluir = const []}) async {
    if (!isConnected) {
      throw StateError(
          'Conecte novamente ao FEFO antes de iniciar a transferência.');
    }
    if (arquivos.isEmpty) {
      throw ArgumentError('Nenhum arquivo foi preparado para transferência.');
    }
    if (_uploading) {
      throw StateError('Já existe uma transferência em andamento.');
    }
    _uploading = true;
    _uploadProgress = 0;
    notifyListeners();
    HttpServer? server;
    try {
      _setStatus('Criando rede temporária no celular...');
      final hotspot =
          await _wifiChannel.invokeMapMethod<String, dynamic>('startHotspot');
      final ssid = hotspot?['ssid']?.toString() ?? '';
      final password = hotspot?['password']?.toString() ?? '';
      final securityType = hotspot?['securityType'] as int? ?? 1;
      if (ssid.isEmpty || password.isEmpty) {
        throw Exception('O Android não forneceu as credenciais do hotspot.');
      }
      if (securityType != 1 && securityType != 2) {
        throw Exception(
            'O Android criou um hotspot WPA3 incompatível com este FEFO (tipo $securityType).');
      }
      const port = 8080;
      final token = DateTime.now().microsecondsSinceEpoch.toRadixString(16);
      server =
          await HttpServer.bind(InternetAddress.anyIPv4, port, shared: true);
      final entries = arquivos.entries.toList();
      final total = entries.fold<int>(0, (sum, e) => sum + e.value.length);
      var enviados = 0;
      final completed = Completer<bool>();
      server.listen((request) async {
        try {
          if (request.uri.queryParameters['token'] != token) {
            request.response.statusCode = HttpStatus.forbidden;
          } else if (request.uri.path == '/plan') {
            final lines = <String>[
              ...excluir.map((path) => 'DELETE $path'),
              for (var i = 0; i < entries.length; i++)
                'FILE ${entries[i].key} ${entries[i].value.length} '
                    '${(checksums[entries[i].key] ?? '-').replaceFirst('sha256:', '')} /file/$i',
            ];
            request.response.write('${lines.join('\n')}\n');
          } else if (request.uri.path.startsWith('/file/')) {
            final index = int.tryParse(request.uri.path.substring(6));
            if (index == null || index < 0 || index >= entries.length) {
              request.response.statusCode = HttpStatus.notFound;
            } else {
              final entry = entries[index];
              request.response.contentLength = entry.value.length;
              const block = 64 * 1024;
              for (var offset = 0;
                  offset < entry.value.length;
                  offset += block) {
                final end =
                    (offset + block).clamp(0, entry.value.length).toInt();
                request.response.add(entry.value.sublist(offset, end));
                await request.response.flush();
                _uploadProgress = (enviados + end) / total;
                _setStatus('Enviando ${entry.key} ao FEFO...');
              }
              enviados += entry.value.length;
            }
          } else if (request.uri.path == '/complete') {
            final ok = request.uri.queryParameters['ok'] == '1';
            if (!completed.isCompleted) completed.complete(ok);
            request.response.write(ok ? 'OK' : 'FAILED');
          } else {
            request.response.statusCode = HttpStatus.notFound;
          }
        } finally {
          await request.response.close();
        }
      });
      final respostaFuture = _aguardarLinha((line) =>
          line.startsWith('OK WIFI PULL') || line.startsWith('ERR WIFI'));
      await enviarComando('WIFI PULL START $ssid|$password|$port|$token');
      final resposta = await respostaFuture;
      if (!resposta.startsWith('OK ')) throw Exception(resposta);
      _setStatus('FEFO conectando ao hotspot do celular...');
      final ok = await completed.future.timeout(const Duration(seconds: 50));
      if (!ok) throw Exception('O FEFO rejeitou a atualização.');
      _setStatus('Atualização concluída. O FEFO está reiniciando...');
    } finally {
      await server?.close(force: true);
      try {
        await _wifiChannel.invokeMethod<bool>('stopHotspot');
      } catch (_) {}
      _uploading = false;
      notifyListeners();
    }
  }

  Future<bool> removerArquivo(String path) async {
    if (!isConnected || path.isEmpty) return false;
    final start = _mensagensRecebidas.length;
    await enviarComando('DELETE AUDIO $path');
    for (var attempt = 0; attempt < 30; attempt++) {
      await Future<void>.delayed(const Duration(milliseconds: 100));
      final novas = _mensagensRecebidas.skip(start);
      for (final line in novas) {
        final match =
            RegExp(r'^CONFIRM DELETE AUDIO .+ CODE=(\d+)$').firstMatch(line);
        if (match == null) continue;
        await enviarComando('DELETE CONFIRM ${match.group(1)}');
        await Future<void>.delayed(const Duration(milliseconds: 350));
        await atualizarCatalogo();
        return true;
      }
    }
    return false;
  }

  Future<void> removerAudioPorWifi(String path) async {
    if (path.isEmpty) {
      throw ArgumentError('Caminho do áudio inválido.');
    }
    if (!isConnected) {
      throw StateError('Conecte novamente ao FEFO antes de excluir.');
    }
    _operationPath = path;
    notifyListeners();
    final manifest = <String, dynamic>{
      'schema': 1,
      'firmware': _firmwareVersion ?? fefoFirmwareVersion,
      'audio': _audioItems
          .where((item) => item.path != path)
          .map((item) => {
                'id': item.id,
                'titulo': item.title,
                'menu': item.group,
                'arquivo': item.path,
                'checksum': item.checksum,
              })
          .toList(),
      'faces': _faces
          .map((item) => {
                'id': item.id,
                'titulo': item.name,
                'arquivo': item.path,
                'checksum': item.checksum,
              })
          .toList(),
      'led_effects': _ledEffects
          .map((item) => {
                'id': item.id,
                'name': item.name,
                'command': item.command,
              })
          .toList(),
      'vibration_effects': _vibrationEffects
          .map((item) => {
                'id': item.id,
                'name': item.name,
                'command': item.command,
              })
          .toList(),
    };
    final bytes =
        utf8.encode(const JsonEncoder.withIndent(' ').convert(manifest));
    try {
      await enviarArquivosPorWifi(
        {'/fefo.json': bytes},
        excluir: [path],
      );
    } finally {
      _operationPath = null;
      notifyListeners();
    }
  }

  Future<void> instalarFacePorWifi({
    required int id,
    required String title,
    required String path,
    required String checksum,
    required List<int> fileBytes,
  }) async {
    if (!isConnected || path.isEmpty || fileBytes.isEmpty) return;
    final faces = [
      ..._faces.where((item) => item.path != path).map((item) => {
            'id': item.id,
            'titulo': item.name,
            'arquivo': item.path,
            'checksum': item.checksum,
          }),
      {
        'id': id,
        'titulo': title,
        'arquivo': path,
        'tamanho': fileBytes.length,
        'checksum': checksum,
      },
    ];
    final manifest = _manifestoAtual(faces: faces);
    await enviarArquivosPorWifi(
      {
        path: fileBytes,
        '/fefo.json': utf8.encode(
          const JsonEncoder.withIndent(' ').convert(manifest),
        ),
      },
      checksums: {path: checksum},
    );
  }

  Future<void> removerFacePorWifi(String path) async {
    if (!isConnected || path.isEmpty) return;
    _operationPath = path;
    notifyListeners();
    final faces = _faces
        .where((item) => item.path != path)
        .map((item) => {
              'id': item.id,
              'titulo': item.name,
              'arquivo': item.path,
              'checksum': item.checksum,
            })
        .toList();
    final manifest = _manifestoAtual(faces: faces);
    try {
      await enviarArquivosPorWifi(
        {
          '/fefo.json': utf8.encode(
            const JsonEncoder.withIndent(' ').convert(manifest),
          ),
        },
        excluir: [path],
      );
    } finally {
      _operationPath = null;
      notifyListeners();
    }
  }

  Map<String, dynamic> _manifestoAtual({
    required List<Map<String, dynamic>> faces,
  }) {
    return {
      'schema': 1,
      'firmware': _firmwareVersion ?? fefoFirmwareVersion,
      'audio': _audioItems
          .map((item) => {
                'id': item.id,
                'titulo': item.title,
                'menu': item.group,
                'arquivo': item.path,
                'checksum': item.checksum,
              })
          .toList(),
      'faces': faces,
      'led_effects': _ledEffects
          .map((item) => {
                'id': item.id,
                'name': item.name,
                'command': item.command,
              })
          .toList(),
      'vibration_effects': _vibrationEffects
          .map((item) => {
                'id': item.id,
                'name': item.name,
                'command': item.command,
              })
          .toList(),
    };
  }

  static const Map<String, String> _catalogoPredefinidoTitulos = {
    '/usr/a/a0001.wav': 'AS CORES',
    'a0001': 'AS CORES',
    '/usr/a/a0002.wav': 'Brincar com o Fefo 2',
    'a0002': 'Brincar com o Fefo 2',
    '/usr/a/a0003.wav': 'COMIDA SAUDÁVEL',
    'a0003': 'COMIDA SAUDÁVEL',
    '/usr/a/a0004.wav': 'CONHECENDO O CORPO',
    'a0004': 'CONHECENDO O CORPO',
    '/usr/a/a0005.wav': 'HIGIENE',
    'a0005': 'HIGIENE',
    '/usr/a/a0006.wav': 'HORA DE DORMIR',
    'a0006': 'HORA DE DORMIR',
    '/usr/a/a0007.wav': 'OS NÚMEROS',
    'a0007': 'OS NÚMEROS',
    '/usr/a/a0008.wav': 'Pipoquinha Disco',
    'a0008': 'Pipoquinha Disco',
    '/usr/a/a0009.wav': 'Respeitando os Colegas 2',
    'a0009': 'Respeitando os Colegas 2',
    '/usr/a/a0010.wav': 'RESPIRAR',
    'a0010': 'RESPIRAR',
    '/usr/a/a0011.wav': 'SONS DOS ANIMAIS',
    'a0011': 'SONS DOS ANIMAIS',
    '/usr/a/a0012.wav': 'Contando Números',
    'a0012': 'Contando Números',
    '/usr/a/a0013.wav': 'Cuide dos Animais',
    'a0013': 'Cuide dos Animais',
    '/usr/a/a0014.wav': 'Dicas de Segurança',
    'a0014': 'Dicas de Segurança',
    '/usr/a/a0015.wav': 'Frutas Saudáveis',
    'a0015': 'Frutas Saudáveis',
    '/rotina/rotina01.wav': 'Bom Dia com Fefo',
    'rotina01': 'Bom Dia com Fefo',
    '/rotina/rotina02.wav': 'Hora de Escovar os Dentes',
    'rotina02': 'Hora de Escovar os Dentes',
    '/rotina/rotina03.wav': 'Hora do Banho',
    'rotina03': 'Hora do Banho',
    '/rotina/rotina04.wav': 'Hora de Comer',
    'rotina04': 'Hora de Comer',
    '/rotina/rotina05.wav': 'Hora de Guardar os Brinquedos',
    'rotina05': 'Hora de Guardar os Brinquedos',
    '/rotina/rotina06.wav': 'Boa Noite',
    'rotina06': 'Boa Noite',
  };

  static const Map<String, String> _catalogoPredefinidoGrupos = {
    '/usr/a/a0001.wav': 'Jukebox do Fefo',
    'a0001': 'Jukebox do Fefo',
    '/usr/a/a0002.wav': 'Jukebox do Fefo',
    'a0002': 'Jukebox do Fefo',
    '/usr/a/a0003.wav': 'Jukebox do Fefo',
    'a0003': 'Jukebox do Fefo',
    '/usr/a/a0004.wav': 'Jukebox do Fefo',
    'a0004': 'Jukebox do Fefo',
    '/usr/a/a0005.wav': 'Jukebox do Fefo',
    'a0005': 'Jukebox do Fefo',
    '/usr/a/a0006.wav': 'Jukebox do Fefo',
    'a0006': 'Jukebox do Fefo',
    '/usr/a/a0007.wav': 'Jukebox do Fefo',
    'a0007': 'Jukebox do Fefo',
    '/usr/a/a0008.wav': 'Jukebox do Fefo',
    'a0008': 'Jukebox do Fefo',
    '/usr/a/a0009.wav': 'Jukebox do Fefo',
    'a0009': 'Jukebox do Fefo',
    '/usr/a/a0010.wav': 'Jukebox do Fefo',
    'a0010': 'Jukebox do Fefo',
    '/usr/a/a0011.wav': 'Jukebox do Fefo',
    'a0011': 'Jukebox do Fefo',
    '/usr/a/a0012.wav': 'Jukebox do Fefo 2',
    'a0012': 'Jukebox do Fefo 2',
    '/usr/a/a0013.wav': 'Jukebox do Fefo 2',
    'a0013': 'Jukebox do Fefo 2',
    '/usr/a/a0014.wav': 'Jukebox do Fefo 2',
    'a0014': 'Jukebox do Fefo 2',
    '/usr/a/a0015.wav': 'Jukebox do Fefo 2',
    'a0015': 'Jukebox do Fefo 2',
    '/rotina/rotina01.wav': 'Minha Rotina',
    'rotina01': 'Minha Rotina',
    '/rotina/rotina02.wav': 'Minha Rotina',
    'rotina02': 'Minha Rotina',
    '/rotina/rotina03.wav': 'Minha Rotina',
    'rotina03': 'Minha Rotina',
    '/rotina/rotina04.wav': 'Minha Rotina',
    'rotina04': 'Minha Rotina',
    '/rotina/rotina05.wav': 'Minha Rotina',
    'rotina05': 'Minha Rotina',
    '/rotina/rotina06.wav': 'Minha Rotina',
    'rotina06': 'Minha Rotina',
  };

  FefoAudioItem _enriquecerItemComCatalogo(FefoAudioItem item) {
    var title = item.catalogTitle.trim();
    var group = item.catalogGroup.trim();
    var submenu = item.catalogSubmenu.trim();

    if (title.isEmpty) {
      title = _catalogoPredefinidoTitulos[item.path] ??
          _catalogoPredefinidoTitulos[item.token] ??
          _catalogoPredefinidoTitulos[item.fileName] ??
          '';
    }

    if (group.isEmpty) {
      group = _catalogoPredefinidoGrupos[item.path] ??
          _catalogoPredefinidoGrupos[item.token] ??
          _catalogoPredefinidoGrupos[item.fileName] ??
          '';
    }

    if (title.isEmpty) {
      var clean = item.token.replaceAll('_', ' ').replaceAll('-', ' ').trim();
      if (clean.length > 2 && RegExp(r'^[a-zA-Z]+\d+$').hasMatch(clean)) {
        clean = clean.replaceAllMapped(
          RegExp(r'^([a-zA-Z]+)(\d+)$'),
          (m) => '${m[1]} ${m[2]}',
        );
      }
      title = clean
          .split(' ')
          .map((w) => w.isNotEmpty
              ? (w[0].toUpperCase() + w.substring(1).toLowerCase())
              : '')
          .join(' ');
    }

    return FefoAudioItem(
      id: item.id,
      path: item.path,
      catalogTitle: title,
      catalogGroup: group,
      catalogSubmenu: submenu,
      checksum: item.checksum,
    );
  }

  void _adicionarAudioCatalogo(FefoAudioItem item) {
    if (item.path.isEmpty) return;
    final itemEnriquecido = _enriquecerItemComCatalogo(item);
    final idx =
        _audioItems.indexWhere((audio) => audio.path == itemEnriquecido.path);
    if (idx >= 0) {
      _audioItems[idx] = itemEnriquecido;
    } else {
      _audioItems.add(itemEnriquecido);
    }
  }

  Future<void> enviarComando(String comando) async {
    await _enviarComandoNormalizado(
      _normalizarComando(comando),
      origemParaEstado: comando,
    );
  }

  Future<void> playAudio(String audioRef) async {
    await _playAudio(audioRef, resetQueue: true);
  }

  Future<void> _playAudio(String audioRef, {required bool resetQueue}) async {
    if (resetQueue) {
      _audioQueue = const [];
      _audioQueueIndex = -1;
    }
    // Atualiza o player flutuante antes do BLE responder, para que a escolha
    // do usuário apareça imediatamente em qualquer tela.
    _audioSelecionado = audioRef;
    _caminhoAudioAtivo = audioRef;
    _audioPlayPendente = audioRef;
    _audioPlayPendenteTimer?.cancel();
    _audioPlayPendenteTimer = Timer(const Duration(seconds: 8), () {
      _audioPlayPendente = null;
      _audioPlayPendenteTimer = null;
      notifyListeners();
    });
    _audioProgress = 0;
    _audioPaused = false;
    _audioControlState = 'playing';
    notifyListeners();
    await _enviarComandoNormalizado(
      _comandoPlayParaAudio(audioRef),
      origemParaEstado: audioRef,
    );
    _audioProgressTimer?.cancel();
    _audioProgressTimer =
        Timer.periodic(const Duration(milliseconds: 500), (_) {
      if (!isConnected) {
        _audioProgressTimer?.cancel();
        return;
      }
      enviarComando('AUDIO STATUS');
    });
    notifyListeners();
  }

  Future<void> tocarAudio(String audioRef) async {
    await playAudio(audioRef);
  }

  Future<void> tocarTodos(List<FefoAudioItem> audios) async {
    if (audios.isEmpty) return;
    _audioQueue = List<FefoAudioItem>.from(audios);
    final atual = _caminhoAudioAtivo;
    final indiceAtual = atual == null
        ? -1
        : _audioQueue.indexWhere((item) =>
            item.path == atual ||
            item.token == atual ||
            atual.endsWith(item.fileName));
    _audioQueueIndex = indiceAtual >= 0 ? indiceAtual : 0;
    await _playAudio(_audioQueue[_audioQueueIndex].token, resetQueue: false);
  }

  void selecionarAudio(String audioRef) {
    playAudio(audioRef);
  }

  Future<void> stopAudio() async {
    _audioQueue = const [];
    _audioQueueIndex = -1;
    await _enviarComandoNormalizado('STOP');
    _audioProgressTimer?.cancel();
    _audioProgress = 0;
    _audioPaused = false;
    _audioControlState = 'stopped';
    _caminhoAudioAtivo = null;
    _audioSelecionado = null;
    _audioPlayPendente = null;
    _audioPlayPendenteTimer?.cancel();
    _audioPlayPendenteTimer = null;
    notifyListeners();
  }

  Future<void> pauseAudio() async {
    await _enviarComandoNormalizado('PAUSE');
    _audioPaused = true;
    _audioControlState = 'paused';
    notifyListeners();
  }

  Future<void> resumeAudio() async {
    await _enviarComandoNormalizado('RESUME');
    _audioPaused = false;
    _audioControlState = 'playing';
    notifyListeners();
  }

  Future<void> seekAudio(double percentage) async {
    final pct = percentage.clamp(0.0, 1.0);
    _audioProgress = pct;
    notifyListeners();
    final pctInt = (pct * 100).round();
    await _enviarComandoNormalizado('SEEK $pctInt');
  }

  Future<void> removerVariosAudios(List<String> paths) async {
    final validPaths = paths.where((p) => p.isNotEmpty).toSet().toList();
    if (validPaths.isEmpty) return;
    if (!isConnected) {
      throw StateError('Conecte novamente ao FEFO antes de excluir.');
    }
    for (final path in validPaths) {
      final respostaFuture = _aguardarLinha((line) =>
          line.startsWith('OK DELETE') ||
          line.startsWith('ERR DELETE') ||
          line.startsWith('CONFIRM DELETE'));
      await enviarComando('DELETE DIRECT $path');
      final resp = await respostaFuture.timeout(const Duration(seconds: 5));
      if (resp.startsWith('CONFIRM DELETE')) {
        final codeStr = _extrairCampo(resp, 'CODE');
        if (codeStr == null)
          throw StateError('Código de exclusão inválido para $path.');
        final confirmFuture = _aguardarLinha((line) =>
            line.startsWith('OK DELETE') || line.startsWith('ERR DELETE'));
        await enviarComando('DELETE CONFIRM $codeStr');
        final confirm = await confirmFuture.timeout(const Duration(seconds: 5));
        if (!confirm.startsWith('OK DELETE')) {
          throw StateError(
              'O FEFO não confirmou a exclusão de $path: $confirm');
        }
      } else if (!resp.startsWith('OK DELETE')) {
        throw StateError('O FEFO não excluiu $path: $resp');
      }
      _audioItems.removeWhere((item) => item.path == path);
      await Future<void>.delayed(const Duration(milliseconds: 150));
    }
    notifyListeners();
    await enviarComando('CATALOG GET');
  }

  Future<void> removerVariosAudiosPorWifi(List<String> paths) async {
    final validPaths = paths.where((p) => p.isNotEmpty).toList();
    if (validPaths.isEmpty) return;
    if (!isConnected) {
      throw StateError('Conecte novamente ao FEFO antes de excluir.');
    }
    _operationPath = validPaths.first;
    notifyListeners();
    final pathSet = validPaths.toSet();
    final manifest = <String, dynamic>{
      'schema': 1,
      'firmware': _firmwareVersion ?? fefoFirmwareVersion,
      'audio': _audioItems
          .where((item) => !pathSet.contains(item.path))
          .map((item) => {
                'id': item.id,
                'titulo': item.title,
                'menu': item.group,
                'submenu': item.submenu,
                'arquivo': item.path,
                'checksum': item.checksum,
              })
          .toList(),
      'faces': _faces
          .map((item) => {
                'id': item.id,
                'titulo': item.name,
                'arquivo': item.path,
                'checksum': item.checksum,
              })
          .toList(),
      'led_effects': _ledEffects
          .map((item) => {
                'id': item.id,
                'name': item.name,
                'command': item.command,
              })
          .toList(),
      'vibration_effects': _vibrationEffects
          .map((item) => {
                'id': item.id,
                'name': item.name,
                'command': item.command,
              })
          .toList(),
    };
    final bytes =
        utf8.encode(const JsonEncoder.withIndent(' ').convert(manifest));
    try {
      await enviarArquivosPorWifi(
        {'/fefo.json': bytes},
        excluir: validPaths,
      );
    } finally {
      _operationPath = null;
      notifyListeners();
    }
  }

  Future<void> setVolume(int volume) async {
    _audioVolume = volume.clamp(0, 100);
    notifyListeners();
    await _enviarComandoNormalizado('VOL ${volume.clamp(0, 100)}');
  }

  Future<void> enviarComandoDeVolume(int volume) async => setVolume(volume);

  Future<void> refreshFaceStatus() async => enviarComando('FACE?');

  Future<void> setFaceMode(bool enabled) async {
    if (enabled) await enviarComando('DIAG OFF');
    final responseFuture = _aguardarLinha(
      (line) => line.startsWith('OK MODE ') || line.startsWith('ERR MODE '),
    );
    await enviarComando(enabled ? 'MODE FACES' : 'MODE BLE');
    final response = await responseFuture;
    _faceModeEnabled = response == 'OK MODE FACES';
    notifyListeners();
    if (response.startsWith('OK ')) await enviarComando('CONFIG SAVE');
    await refreshFaceStatus();
  }

  Future<void> setFaceRandom(bool enabled) async {
    final responseFuture = _aguardarLinha(
      (line) =>
          line == 'OK FACE RANDOM ON' ||
          line == 'OK FACE RANDOM OFF' ||
          line.startsWith('ERR FACE '),
    );
    await enviarComando(enabled ? 'FACE RANDOM ON' : 'FACE RANDOM OFF');
    final response = await responseFuture;
    if (response.startsWith('OK ')) {
      _faceRandomEnabled = enabled;
      await enviarComando('CONFIG SAVE');
    }
    notifyListeners();
  }

  Future<void> showFace(String path) async {
    await enviarComando('DIAG OFF');
    if (!_faceModeEnabled) await enviarComando('MODE FACES');
    await enviarComando('FACE $path');
    _faceModeEnabled = true;
    _faceRandomEnabled = false;
    _currentFacePath = path;
    notifyListeners();
  }

  Future<bool> setDeveloperMode(bool enabled) async {
    final responseFuture = _aguardarLinha(
      (line) => line == 'OK DIAG ON' || line == 'OK DIAG OFF',
    );
    await enviarComando(enabled ? 'DIAG ON' : 'DIAG OFF');
    final response = await responseFuture;
    if (response == (enabled ? 'OK DIAG ON' : 'OK DIAG OFF')) {
      _developerModeEnabled = enabled;
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<void> setBrightness(int brightness) async {
    await _enviarComandoNormalizado('BRILHO ${brightness.clamp(0, 100)}');
  }

  Future<void> setLedCount(int count) async {
    const allowed = {15, 20, 25, 30, 35};
    if (!allowed.contains(count)) return;
    await enviarComando('LED COUNT $count');
    await enviarComando('CONFIG SAVE');
    _ledCount = count;
    notifyListeners();
  }

  Future<void> setLedPattern(int pattern) async {
    final escolhido = pattern.clamp(1, 10);
    _ledPatternSelecionado = escolhido;
    notifyListeners();
    await _enviarComandoNormalizado('LED $escolhido');
  }

  Future<void> desligarLeds() async {
    _ledPatternSelecionado = null;
    await _enviarComandoNormalizado('LED OFF');
    notifyListeners();
  }

  Future<void> ronronar() async {
    await _enviarComandoNormalizado('RONRONAR');
  }

  Future<void> vibrar(int pattern) async {
    final escolhido = pattern.clamp(1, 10);
    _vibracaoSelecionada = escolhido;
    notifyListeners();
    await _enviarComandoNormalizado('VIBRA $escolhido');
  }

  Future<void> setPanicEnabled(bool enabled) async {
    await _enviarComandoNormalizado(enabled ? 'PANIC ON' : 'PANIC OFF');
    _panicEnabled = enabled;
    notifyListeners();
  }

  Future<void> refreshPanicStatus() async {
    await _enviarComandoNormalizado('PANIC STATUS');
  }

  Future<void> _enviarComandoNormalizado(
    String comandoNormalizado, {
    String? origemParaEstado,
  }) async {
    if (!isConnected || _rxCharacteristic == null) {
      _setStatus('FEFO não conectado.');
      return;
    }

    try {
      _ultimoComandoEnviado = comandoNormalizado;
      await _rxCharacteristic!.write(
        utf8.encode('$comandoNormalizado\n'),
        withoutResponse: false,
      );

      _atualizarEstadoLocalAposComando(
        origemParaEstado ?? comandoNormalizado,
        comandoNormalizado,
      );
      _setStatus('Enviado: $comandoNormalizado');
    } catch (e) {
      _setStatus('Erro ao enviar comando: $e');
      await disconnectFromDevice();
    }
  }

  String _normalizarComando(String comandoOriginal) {
    final comando = comandoOriginal.trim();
    final lower = comando.toLowerCase();

    if (comando.isEmpty) return 'STATUS';

    if (lower.startsWith('volume:')) {
      final valor = lower.split(':').last;
      return 'VOL $valor';
    }

    if (lower == 'stop') return 'STOP';
    if (lower == 'pause') return 'PAUSE';
    if (lower == 'resume' || lower == 'play') return 'RESUME';
    if (lower == 'rxready') return 'APP SYNC';
    if (lower == 'wifi-on') return 'APP SYNC';

    if (lower.startsWith('vibracao')) {
      final numero = int.tryParse(lower.replaceAll(RegExp(r'[^0-9]'), ''));
      return 'VIBRA ${(numero ?? 1).clamp(1, 10)}';
    }

    // O firmware atual não possui VIBRA 0/STOP VIBRA; os padrões têm duração
    // curta e param sozinhos. Mantemos STATUS como fallback seguro.
    if (lower == 'stopvib') return 'STATUS';

    if (lower.startsWith('efeitoluz')) {
      final numero = int.tryParse(lower.replaceAll(RegExp(r'[^0-9]'), ''));
      return 'LED ${((numero ?? 0) + 1).clamp(1, 10)}';
    }

    if (lower == '/luz/off') return 'BRILHO 0';

    if (lower.startsWith('/luz/')) {
      return _converterComandoDeLuzAntigo(lower);
    }

    if (comando.startsWith('/')) {
      return _comandoPlayParaAudio(comando);
    }

    return comando;
  }

  String _comandoPlayParaAudio(String audioRef) {
    final ref = audioRef.trim();
    if (ref.isEmpty) return 'STATUS';

    final upper = ref.toUpperCase();
    if (upper.startsWith('P:') || upper.startsWith('PLAY ')) return ref;

    // O app usa tokens curtos para o firmware resolver no índice do SDCard.
    // Ex.: /rotina/rotina01.wav -> P:rotina01
    return 'P:${_extrairNomeSemExtensao(ref)}';
  }

  String _extrairNomeSemExtensao(String caminho) {
    final arquivo = caminho.split('/').where((parte) => parte.isNotEmpty).last;
    final ponto = arquivo.lastIndexOf('.');
    if (ponto <= 0) return arquivo;
    return arquivo.substring(0, ponto);
  }

  String _converterComandoDeLuzAntigo(String comando) {
    final numero = int.tryParse(comando.replaceAll(RegExp(r'[^0-9]'), ''));
    return 'LED ${(numero ?? 1).clamp(1, 10)}';
  }

  void _atualizarEstadoLocalAposComando(
    String comandoOriginal,
    String comandoNormalizado,
  ) {
    final upper = comandoNormalizado.toUpperCase();

    if (comandoOriginal.startsWith('/')) {
      _caminhoAudioAtivo = comandoOriginal;
    } else if (upper.startsWith('PLAY ')) {
      _caminhoAudioAtivo = comandoNormalizado.substring(5).trim();
    } else if (upper.startsWith('P:')) {
      _caminhoAudioAtivo = comandoOriginal;
    } else if (upper == 'STOP') {
      _caminhoAudioAtivo = null;
    }

    notifyListeners();
  }

  Future<void> disconnectFromDevice() async {
    final device = _connectedDevice;
    _intentionalDisconnect = true;
    _autoReconnectTimer?.cancel();
    _autoReconnectTimer = null;
    _cleanup();
    try {
      await device?.disconnect();
    } finally {
      _intentionalDisconnect = false;
    }
  }

  void _iniciarKeepAlive() {
    _keepAliveTimer?.cancel();
    _keepAliveTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (isConnected) {
        enviarComando('PING');
      } else {
        _keepAliveTimer?.cancel();
      }
    });
  }

  void _iniciarReconexaoAutomatica() {
    if (_autoReconnectTimer != null) return;
    _autoReconnectTimer =
        Timer.periodic(const Duration(seconds: 15), (_) async {
      if (isConnected) {
        _autoReconnectTimer?.cancel();
        _autoReconnectTimer = null;
        return;
      }
      if (_autoReconnectInProgress) return;
      _autoReconnectInProgress = true;
      try {
        await conectarAutomaticamenteAoFefo();
        if (isConnected) {
          _autoReconnectTimer?.cancel();
          _autoReconnectTimer = null;
        }
      } finally {
        _autoReconnectInProgress = false;
      }
    });
  }

  void _cleanup() {
    _rxCharacteristic = null;
    _txCharacteristic = null;
    _connectedDevice = null;
    _caminhoAudioAtivo = null;
    _audioSelecionado = null;
    _audioPlayPendente = null;
    _audioPlayPendenteTimer?.cancel();
    _audioPlayPendenteTimer = null;
    _audioProgressTimer?.cancel();
    _keepAliveTimer?.cancel();
    _audioProgress = 0;
    _audioPaused = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _scanSubscription?.cancel();
    _txSubscription?.cancel();
    _connectionSubscription?.cancel();
    _audioProgressTimer?.cancel();
    _audioPlayPendenteTimer?.cancel();
    _keepAliveTimer?.cancel();
    _autoReconnectTimer?.cancel();
    _connectedDevice?.disconnect();
    super.dispose();
  }
}
