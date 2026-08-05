// lib/pages/tela_editar_alarme.dart

import 'package:flutter/material.dart';
import '../models/alarm_model.dart';
import '../widgets/pagina_base.dart';
import '../widgets/botao_verde.dart';

class OpcaoDeSom {
  final String nomeAmigavel;
  final String caminhoDoArquivo;

  const OpcaoDeSom(
      {required this.nomeAmigavel, required this.caminhoDoArquivo});
}

class TelaEditarAlarme extends StatefulWidget {
  final AlarmModel? alarmeInicial;

  const TelaEditarAlarme({super.key, this.alarmeInicial});

  static const List<OpcaoDeSom> opcoesDeSom = [
    OpcaoDeSom(nomeAmigavel: 'Respire Fundo', caminhoDoArquivo: 'respire'),
    OpcaoDeSom(nomeAmigavel: 'Feliz por Você', caminhoDoArquivo: 'feliz'),
    OpcaoDeSom(nomeAmigavel: 'Vamos Fazer Juntos', caminhoDoArquivo: 'juntos'),
    OpcaoDeSom(nomeAmigavel: 'Respeitar Colegas', caminhoDoArquivo: 'colegas'),
    OpcaoDeSom(
        nomeAmigavel: 'Mexendo os Braços', caminhoDoArquivo: 'mexer_bracos'),
    OpcaoDeSom(
        nomeAmigavel: 'Careta dos Animais', caminhoDoArquivo: 'careta_animais'),
  ];

  static String getNomeAmigavel(String caminhoDoArquivo) {
    return opcoesDeSom
        .firstWhere(
          (opcao) => opcao.caminhoDoArquivo == caminhoDoArquivo,
          orElse: () => const OpcaoDeSom(
              nomeAmigavel: 'Comando Inválido', caminhoDoArquivo: ''),
        )
        .nomeAmigavel;
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
    {'label': 'D', 'valor': 7},
    {'label': 'S', 'valor': 1},
    {'label': 'T', 'valor': 2},
    {'label': 'Q', 'valor': 3},
    {'label': 'Q', 'valor': 4},
    {'label': 'S', 'valor': 5},
    {'label': 'S', 'valor': 6},
  ];

  @override
  void initState() {
    super.initState();
    if (widget.alarmeInicial != null) {
      _titulo = widget.alarmeInicial!.title;
      _horario = TimeOfDay(
          hour: widget.alarmeInicial!.hour,
          minute: widget.alarmeInicial!.minute);
      _somSelecionado = widget.alarmeInicial!.audioPath;
      _diasSelecionados = List<int>.from(widget.alarmeInicial!.daysOfWeek);
    } else {
      _titulo = '';
      _horario = TimeOfDay.now();
      _somSelecionado = TelaEditarAlarme.opcoesDeSom.first.caminhoDoArquivo;
      _diasSelecionados = [];
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
        title: _titulo,
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
              colorScheme: const ColorScheme.light(primary: Color(0xFF318134)),
            ),
            child: child!,
          );
        });
    if (novoHorario != null) setState(() => _horario = novoHorario);
  }

  @override
  Widget build(BuildContext context) {
    const TextStyle tagStyle = TextStyle(
        fontFamily: 'KGPen',
        fontSize: 20,
        color: Color(0xFF318134),
        fontWeight: FontWeight.bold);

    return PaginaBase(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
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
                        fontSize: 65, // Título maior
                        color: Color(0xFF318134)),
                  ),
                ),
                const SizedBox(height: 30),

                // Título do Alarme (Label externa)
                const Text('Título do Alarme', style: tagStyle),
                const SizedBox(height: 8),
                TextFormField(
                  initialValue: _titulo,
                  style: const TextStyle(
                      fontFamily: 'KGPen', fontSize: 22, color: Colors.black),
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(15)),
                    fillColor: Colors.white.withOpacity(0.8),
                    filled: true,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 15),
                  ),
                  onSaved: (value) => _titulo = value!,
                ),
                const SizedBox(height: 25),

                // Horário
                const Text('Horário', style: tagStyle),
                const SizedBox(height: 5),
                InkWell(
                  onTap: _selecionarHorario,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _horario.format(context),
                        style: const TextStyle(
                            fontSize: 55,
                            fontWeight: FontWeight.w300,
                            color: Color(0xFF2E2E2E)),
                      ),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF318134),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                                color: Colors.black.withOpacity(0.3),
                                blurRadius: 6,
                                offset: const Offset(0, 3))
                          ],
                        ),
                        child: const Icon(Icons.watch_later,
                            color: Colors.white, size: 35),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 25),

                // Dias da Semana
                const Text('Dias da Semana', style: tagStyle),
                const SizedBox(height: 15),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: _diasInfo.map((info) {
                    final dia = info['valor'] as int;
                    final selecionado = _diasSelecionados.contains(dia);
                    return GestureDetector(
                      onTap: () => _alternarDia(dia),
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: selecionado
                              ? const Color(0xFF318134)
                              : Colors.white.withOpacity(0.9),
                          shape: BoxShape.circle,
                          border: Border.all(
                              color: selecionado
                                  ? Colors.white
                                  : Colors.grey.shade400,
                              width: 1.5),
                          boxShadow: selecionado
                              ? [
                                  BoxShadow(
                                      color: Colors.black.withOpacity(0.2),
                                      blurRadius: 4,
                                      offset: const Offset(0, 2))
                                ]
                              : [],
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          info['label'],
                          style: TextStyle(
                            color: selecionado ? Colors.white : Colors.black87,
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 35),

                // Tipo de Alarme (Dropdown com Label externa)
                const Text('Tipo de Alarme', style: tagStyle),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: _somSelecionado,
                  style: const TextStyle(
                      fontFamily: 'KGPen', fontSize: 20, color: Colors.black),
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(15)),
                    fillColor: Colors.white.withOpacity(0.8),
                    filled: true,
                  ),
                  items: TelaEditarAlarme.opcoesDeSom
                      .map((opcao) => DropdownMenuItem(
                          value: opcao.caminhoDoArquivo,
                          child: Text(opcao.nomeAmigavel,
                              style: const TextStyle(fontFamily: 'KGPen'))))
                      .toList(),
                  onChanged: (val) => setState(() => _somSelecionado = val!),
                ),
                const SizedBox(height: 50),

                // Botões
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    BotaoVerde(
                        texto: 'Voltar',
                        larguraPercentual: 0.4,
                        cor: const Color(0xFFDC4900),
                        aoPressionar: () => Navigator.pop(context)),
                    BotaoVerde(
                        texto: 'Salvar',
                        larguraPercentual: 0.4,
                        aoPressionar: _salvarAlarme),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
