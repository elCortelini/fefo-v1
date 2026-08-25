import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_pincelada.dart';
import '../widgets/pagina_base.dart';
import '../widgets/progresso_operacao.dart';
import '../design_system/fefo_components.dart';

class TelaFacesFefo extends StatefulWidget {
  const TelaFacesFefo({super.key});

  @override
  State<TelaFacesFefo> createState() => _TelaFacesFefoState();
}

class _TelaFacesFefoState extends State<TelaFacesFefo> {
  static const _catalogUrl =
      'https://drive.google.com/uc?export=download&id=1paHhyR8jJlBlpffqsYA0ofYIzyLPlO72';

  List<_FaceOnline> _online = const [];
  final Map<String, Future<ui.Image?>> _thumbnails = {};
  final bool _busy = false;
  String _status = 'Carregando faces...';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initialize());
  }

  Future<void> _initialize() async {
    final manager = context.read<BluetoothManager>();
    if (manager.isConnected) {
      await manager.enviarComando('CATALOG GET');
      await manager.refreshFaceStatus();
    }
    try {
      final bytes = await _download(_catalogUrl);
      final decoded = jsonDecode(utf8.decode(bytes));
      final rawFaces = decoded is Map ? decoded['faces'] : null;
      final faces = rawFaces is List
          ? rawFaces
              .whereType<Map>()
              .map((value) => _FaceOnline.fromJson(value))
              .where((face) => face.path.isNotEmpty && face.url.isNotEmpty)
              .toList()
          : <_FaceOnline>[];
      if (!mounted) return;
      setState(() {
        _online = faces;
        _status = 'Toque em uma face instalada para exibi-la na CYD.';
      });
    } catch (error) {
      if (mounted) setState(() => _status = 'Falha ao carregar faces: $error');
    }
  }

  Future<Uint8List> _download(String url) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 20);
    try {
      final response = await (await client.getUrl(Uri.parse(url))).close();
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException('HTTP ${response.statusCode}');
      }
      final output = <int>[];
      await for (final part in response) {
        output.addAll(part);
      }
      return Uint8List.fromList(output);
    } finally {
      client.close();
    }
  }

  Future<ui.Image?> _loadThumbnail(_FaceOnline face) {
    return _thumbnails.putIfAbsent(face.path, () async {
      final raw = await _download(face.url);
      if (raw.length != 480 * 320 * 2) return null;
      final rgba = Uint8List(480 * 320 * 4);
      for (var source = 0, target = 0;
          source < raw.length;
          source += 2, target += 4) {
        final pixel = raw[source] | (raw[source + 1] << 8);
        rgba[target] = (((pixel >> 11) & 0x1f) * 255 ~/ 31);
        rgba[target + 1] = (((pixel >> 5) & 0x3f) * 255 ~/ 63);
        rgba[target + 2] = ((pixel & 0x1f) * 255 ~/ 31);
        rgba[target + 3] = 255;
      }
      final completer = Completer<ui.Image?>();
      ui.decodeImageFromPixels(
        rgba,
        480,
        320,
        ui.PixelFormat.rgba8888,
        (image) => completer.complete(image),
      );
      return completer.future;
    });
  }

  @override
  Widget build(BuildContext context) {
    final manager = context.watch<BluetoothManager>();
    final installed = manager.faces.map((face) => face.path).toSet();
    final installedFaces =
        _online.where((face) => installed.contains(face.path)).toList();

    return PaginaBase(
      child: Column(
        children: [
          const SizedBox(height: 20),
          Text(
            'Faces do Fefo',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: 'Billotilde',
              fontSize: 52,
              color: Theme.of(context).colorScheme.secondary,
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 14),
            child: Text(
              'Escolha um rostinho para exibir. Após a seleção, o FEFO retorna ao modo aleatório automaticamente.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'KGPen',
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                FefoPageSubtitle(text: _status),
                const SizedBox(height: 10),
                if (installedFaces.isEmpty)
                  const FefoPageSubtitle(text: 'Nenhuma face instalada.'),
                _faceGrid(installedFaces, manager: manager),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: BotaoPincelada(
              texto: 'Voltar',
              cor: const Color(0xFF318134),
              larguraPercentual: 0.72,
              aoPressionar: () => Navigator.pop(context),
            ),
          ),
        ],
      ),
    );
  }

  Widget _faceGrid(
    List<_FaceOnline> faces, {
    required BluetoothManager manager,
  }) {
    if (faces.isEmpty) return const SizedBox.shrink();
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: faces.length,
      itemBuilder: (context, index) {
        final face = faces[index];
        final selected = manager.currentFacePath == face.path;
        final deleting =
            manager.uploading && manager.operationPath == face.path;
        return FefoContentCard(
          title: face.title,
          subtitle: selected ? 'Face exibida no FEFO' : 'Rostinho do FEFO',
          icon: Icons.face_retouching_natural_rounded,
          selected: selected,
          onTap: !_busy ? () => manager.showFace(face.path) : null,
          leading: SizedBox(
            width: 72,
            height: 52,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: FutureBuilder<ui.Image?>(
                future: _loadThumbnail(face),
                builder: (context, snapshot) => snapshot.hasData
                    ? RawImage(image: snapshot.data, fit: BoxFit.cover)
                    : const Center(child: CircularProgressIndicator()),
              ),
            ),
          ),
          trailing: IconButton(
            tooltip: 'Excluir face',
            onPressed: manager.uploading ? null : () => _confirmarExclusao(face),
            icon: const Icon(Icons.delete_outline_rounded),
            color: Theme.of(context).colorScheme.secondary,
          ),
        );
      },
    );
  }

  Future<void> _confirmarExclusao(_FaceOnline face) async {
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Excluir face?'),
            content: Text('${face.title}\n\nA face será removida do FEFO.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: const Text('Cancelar'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(dialogContext, true),
                child: const Text('Excluir'),
              ),
            ],
          ),
        ) ??
        false;
    if (!confirmed || !mounted) return;
    await context.read<BluetoothManager>().removerFacePorWifi(face.path);
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => FefoSectionHeader(title: text);
}

const _faceTextStyle = TextStyle(
  fontFamily: 'KGPen',
  fontSize: 23,
  color: Color(0xFF4B5563),
);

class _FaceOnline {
  final int id;
  final String title;
  final String path;
  final String url;
  final String checksum;

  const _FaceOnline({
    required this.id,
    required this.title,
    required this.path,
    required this.url,
    required this.checksum,
  });

  factory _FaceOnline.fromJson(Map raw) {
    final value = Map<String, dynamic>.from(raw);
    final rawId = (value['id'] ?? '').toString();
    return _FaceOnline(
      id: int.tryParse(rawId.replaceAll(RegExp('[^0-9]'), '')) ?? 0,
      title: (value['titulo'] ?? value['name'] ?? 'Face').toString(),
      path: (value['arquivo'] ?? value['path'] ?? '').toString(),
      url: (value['url'] ?? '').toString(),
      checksum: (value['checksum'] ?? '').toString(),
    );
  }
}
