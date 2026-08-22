// lib/pages/tela_editar_alarme.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/alarm_model.dart';
import '../managers/bluetooth_manager.dart';
import '../widgets/pagina_base.dart';
import '../widgets/botao_pincelada.dart';

class OpcaoDeSom {
  final String nomeAmigavel;
  final String caminhoDoArquivo;
  final String grupo;

  const OpcaoDeSom({
    required this.nomeAmigavel,
    required this.caminhoDoArquivo,
    this.grupo = '',
  });
}

class TelaEditarAlarme extends StatefulWidget {
  final AlarmModel? alarmeInicial;

  const TelaEditarAlarme({super.key, this.alarmeInicial});

  static const List<OpcaoDeSom> opcoesPadrao = [
    OpcaoDeSom(
      nomeAmigavel: 'Pipoquinha Disco',
      caminhoDoArquivo: 'pipoquinha_disco.wav',
      grupo: 'Músicas',
    ),
    OpcaoDeSom(
      nomeAmigavel: 'Bom Dia com Fefo',
      caminhoDoArquivo: '/rotina/rotina01.wav',
      grupo: 'Rotina',
    ),
    OpcaoDeSom(
      nomeAmigavel: 'Hora de Escovar os Dentes',
      caminhoDoArquivo: '/rotina/rotina02.wav',
      grupo: 'Rotina',
    ),
    OpcaoDeSom(
      nomeAmigavel: 'Hora do Banho',
      caminhoDoArquivo: '/rotina/rotina03.wav',
      grupo: 'Rotina',
    ),
    OpcaoDeSom(
      nomeAmigavel: 'Hora de Comer',
      caminhoDoArquivo: '/rotina/rotina04.wav',
      grupo: 'Rotina',
    ),
    OpcaoDeSom(
      nomeAmigavel: 'Hora de Guardar os Brinquedos',
      caminhoDoArquivo: '/rotina/rotina05.wav',
      grupo: 'Rotina',
    ),
    OpcaoDeSom(
      nomeAmigavel: 'Boa Noite',
      caminhoDoArquivo: '/rotina/rotina06.wav',
      grupo: 'Rotina',
    ),
    OpcaoDeSom(
      nomeAmigavel: 'Respire Fundo',
      caminhoDoArquivo: 'respire',
      grupo: 'Exercícios',
    ),
    OpcaoDeSom(
      nomeAmigavel: 'Feliz por Você',
      caminhoDoArquivo: 'feliz',
      grupo: 'Exercícios',
    ),
  ];

  static String getNomeAmigavel(String caminhoDoArquivo, BuildContext context) {
    // Tenta encontrar nas opções padrão
    final padrao = opcoesPadrao.firstWhere(
      (opcao) =>
          opcao.caminhoDoArquivo == caminhoDoArquivo ||
          opcao.caminhoDoArquivo.contains(caminhoDoArquivo),
      orElse: () => const OpcaoDeSom(nomeAmigavel: '', caminhoDoArquivo: ''),
    );
    if (padrao.nomeAmigavel.isNotEmpty) return padrao.nomeAmigavel;

    // Tenta obter do BluetoothManager se disponível
    try {
      final manager = context.read<BluetoothManager>();
      final item = manager.audioItems.firstWhere(
        (audio) =>
            audio.path == caminhoDoArquivo || audio.token == caminhoDoArquivo,
        orElse: () =>
            FefoAudioItem(id: 0, path: caminhoDoArquivo, catalogTitle: ''),
      );
      if (item.title.isNotEmpty) return item.title;
    } catch (_) {}

    // Formata o token como fallback
    final token = caminhoDoArquivo.split('/').where((p) => p.isNotEmpty).last;
    return token
        .replaceAll('_', ' ')
        .replaceAll('-', ' ')
        .replaceAll('.wav', '')
        .trim();
  }

  @override
  State<TelaEditarAlarme> createState() => _TelaEditarAlarmeState();
}

class _TelaEditarAlarmeState extends State<TelaEditarAlarme> {
  final _formKey = GlobalKey<FormState>();
  late String _titulo;
  late TimeOfDay _horario;
  late String _somSelecionado;
  late List<int> _diasSelecionados;

  final List<Map<String, dynamic>> _diasInfo = [
    {'label': 'D', 'nome': 'Domingo', 'valor': 7},
    {'label': 'S', 'nome': 'Segunda', 'valor': 1},
    {'label': 'T', 'nome': 'Terça', 'valor': 2},
    {'label': 'Q', 'nome': 'Quarta', 'valor': 3},
    {'label': 'Q', 'nome': 'Quinta', 'valor': 4},
    {'label': 'S', 'nome': 'Sexta', 'valor': 5},
    {'label': 'S', 'nome': 'Sábado', 'valor': 6},
  ];

  @override
  void initState() {
    super.initState();
    if (widget.alarmeInicial != null) {
      _titulo = widget.alarmeInicial!.title;
      _horario = TimeOfDay(
        hour: widget.alarmeInicial!.hour,
        minute: widget.alarmeInicial!.minute,
      );
      _somSelecionado = widget.alarmeInicial!.audioPath;
      _diasSelecionados = List<int>.from(widget.alarmeInicial!.daysOfWeek);
    } else {
      _titulo = 'Alarme do Fefo';
      _horario = TimeOfDay.now();
      _somSelecionado = TelaEditarAlarme.opcoesPadrao.first.caminhoDoArquivo;
      _diasSelecionados = [1, 2, 3, 4, 5]; // Segunda a Sexta padrão
    }
  }

  void _alternarDia(int dia) {
    setState(() {
      if (_diasSelecionados.contains(dia)) {
        _diasSelecionados.remove(dia);
      } else {
        _diasSelecionados.add(dia);
      }
    });
  }

  void _salvarAlarme() {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();

      final alarmeRetorno = AlarmModel(
        id: widget.alarmeInicial?.id,
        title: _titulo.trim().isEmpty ? 'Alarme FEFO' : _titulo.trim(),
        hour: _horario.hour,
        minute: _horario.minute,
        isActive: widget.alarmeInicial?.isActive ?? true,
        audioPath: _somSelecionado,
        daysOfWeek: _diasSelecionados,
      );

      Navigator.of(context).pop(alarmeRetorno);
    }
  }

  Future<void> _selecionarHorario() async {
    final novoHorario = await showTimePicker(
      context: context,
      initialTime: _horario,
      builder: (context, child) {
        return Theme(
          data: ThemeData.light().copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF318134),
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Colors.black87,
            ),
          ),
          child: child!,
        );
      },
    );
    if (novoHorario != null) setState(() => _horario = novoHorario);
  }

  List<OpcaoDeSom> _obterTodasOpcoesDeSom(BluetoothManager manager) {
    final lista = <OpcaoDeSom>[...TelaEditarAlarme.opcoesPadrao];

    for (final item in manager.audioItems) {
      if (!lista.any((op) =>
          op.caminhoDoArquivo == item.path ||
          op.caminhoDoArquivo == item.token)) {
        lista.add(
          OpcaoDeSom(
            nomeAmigavel: item.title,
            caminhoDoArquivo: item.path,
            grupo: item.group.isNotEmpty ? item.group : 'Áudios do FEFO',
          ),
        );
      }
    }
    return lista;
  }

  @override
  Widget build(BuildContext context) {
    const corVerde = Color(0xFF318134);
    const corLaranja = Color(0xFFDC4900);
    final manager = context.watch<BluetoothManager>();
    final todasOpcoesSom = _obterTodasOpcoesDeSom(manager);

    // Garante que o som selecionado exista na lista
    if (!todasOpcoesSom.any((op) => op.caminhoDoArquivo == _somSelecionado)) {
      if (todasOpcoesSom.isNotEmpty) {
        _somSelecionado = todasOpcoesSom.first.caminhoDoArquivo;
      }
    }

    const tagStyle = TextStyle(
      fontFamily: 'KGPen',
      fontSize: 20,
      color: corVerde,
      fontWeight: FontWeight.bold,
    );

    return PaginaBase(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 10),
              Center(
                child: Text(
                  widget.alarmeInicial == null
                      ? 'Novo Alarme'
                      : 'Editar Alarme',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontFamily: 'Billotilde',
                    fontSize: 52,
                    color: corVerde,
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // CARD DE HORÁRIO INTERATIVO
              InkWell(
                onTap: _selecionarHorario,
                borderRadius: BorderRadius.circular(22),
                child: Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: corVerde, width: 2),
                    boxShadow: const [
                      BoxShadow(
                        color: Colors.black12,
                        blurRadius: 8,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Horário do Alarme',
                            style: TextStyle(
                              fontFamily: 'KGPen',
                              fontSize: 14,
                              color: Colors.black54,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _horario.format(context),
                            style: const TextStyle(
                              fontFamily: 'KGPen',
                              fontSize: 48,
                              fontWeight: FontWeight.bold,
                              color: corVerde,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: const BoxDecoration(
                          color: corVerde,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.access_time_filled_rounded,
                          color: Colors.white,
                          size: 36,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 25),

              // TÍTULO DO ALARME
              const Text('Nome / Título da Rotina', style: tagStyle),
              const SizedBox(height: 8),
              TextFormField(
                initialValue: _titulo,
                style: const TextStyle(
                  fontFamily: 'KGPen',
                  fontSize: 20,
                  color: Colors.black,
                ),
                decoration: InputDecoration(
                  hintText: 'Ex: Hora de Acordar, Escovar Dentes',
                  hintStyle: const TextStyle(
                      fontFamily: 'KGPen', color: Colors.black38),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: corVerde, width: 1.5),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: corVerde, width: 2),
                  ),
                  fillColor: Colors.white,
                  filled: true,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                ),
                onSaved: (value) => _titulo = value ?? '',
              ),
              const SizedBox(height: 25),

              // DIAS DA SEMANA
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Repetir nos Dias', style: tagStyle),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        if (_diasSelecionados.length == 7) {
                          _diasSelecionados.clear();
                        } else {
                          _diasSelecionados = [1, 2, 3, 4, 5, 6, 7];
                        }
                      });
                    },
                    child: Text(
                      _diasSelecionados.length == 7
                          ? 'Desmarcar todos'
                          : 'Todos os dias',
                      style: const TextStyle(
                        fontFamily: 'KGPen',
                        fontSize: 14,
                        color: corLaranja,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: _diasInfo.map((info) {
                  final dia = info['valor'] as int;
                  final selecionado = _diasSelecionados.contains(dia);
                  return GestureDetector(
                    onTap: () => _alternarDia(dia),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: selecionado ? corVerde : Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: selecionado ? corVerde : Colors.grey.shade400,
                          width: selecionado ? 2 : 1.5,
                        ),
                        boxShadow: selecionado
                            ? [
                                const BoxShadow(
                                  color: Colors.black26,
                                  blurRadius: 4,
                                  offset: Offset(0, 2),
                                ),
                              ]
                            : [],
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        info['label'],
                        style: TextStyle(
                          fontFamily: 'KGPen',
                          color: selecionado ? Colors.white : Colors.black87,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 28),

              // SOM DO ALARME
              const Text('Som / Música do FEFO', style: tagStyle),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: corVerde, width: 1.5),
                ),
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _somSelecionado,
                    isExpanded: true,
                    icon: const Icon(Icons.arrow_drop_down_circle_rounded,
                        color: corVerde),
                    style: const TextStyle(
                      fontFamily: 'KGPen',
                      fontSize: 18,
                      color: Colors.black,
                    ),
                    items: todasOpcoesSom.map((opcao) {
                      return DropdownMenuItem<String>(
                        value: opcao.caminhoDoArquivo,
                        child: Row(
                          children: [
                            const Icon(Icons.music_note_rounded,
                                color: corLaranja, size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                opcao.nomeAmigavel,
                                style: const TextStyle(
                                    fontFamily: 'KGPen', fontSize: 17),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _somSelecionado = val);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // BOTÃO PARA TESTAR O SOM NO PET FEFO
              Center(
                child: OutlinedButton.icon(
                  onPressed: () {
                    if (manager.isConnected) {
                      manager.playAudio(_somSelecionado);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Testando som no FEFO...'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                              'Conecte ao PET FEFO via Bluetooth para testar o som.'),
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.volume_up_rounded, color: corLaranja),
                  label: const Text(
                    'Testar Som no FEFO Agora',
                    style: TextStyle(
                      fontFamily: 'KGPen',
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: corLaranja,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: corLaranja, width: 1.5),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20)),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 10),
                  ),
                ),
              ),
              const SizedBox(height: 35),

              // BOTÕES SALVAR / VOLTAR
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  BotaoPincelada(
                    texto: 'Voltar',
                    cor: corLaranja,
                    fontSize: 28,
                    aoPressionar: () => Navigator.pop(context),
                  ),
                  BotaoPincelada(
                    texto: 'Salvar',
                    cor: corVerde,
                    fontSize: 28,
                    aoPressionar: _salvarAlarme,
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
