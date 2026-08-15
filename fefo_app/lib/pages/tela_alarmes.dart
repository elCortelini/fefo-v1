import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/alarm_model.dart';
import '../services/database_service.dart';
import '../services/alarm_service.dart';
import '../widgets/botao_verde.dart';
import '../widgets/pagina_base.dart';
import 'tela_editar_alarme.dart';

class TelaAlarmes extends StatefulWidget {
  const TelaAlarmes({super.key});

  @override
  State<TelaAlarmes> createState() => _TelaAlarmesState();
}

class _TelaAlarmesState extends State<TelaAlarmes> {
  List<AlarmModel> _listaDeAlarmes = [];
  bool _estaCarregando = true;
  Timer? _timerDinamico;

  @override
  void initState() {
    super.initState();
    _recarregarAlarmes();
    // Inicia o timer para atualizar o tempo restante a cada minuto
    _timerDinamico = Timer.periodic(const Duration(minutes: 1), (timer) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timerDinamico?.cancel();
    super.dispose();
  }

  Future<void> _recarregarAlarmes() async {
    if (mounted && !_estaCarregando) {
      setState(() => _estaCarregando = true);
    }
    try {
      final alarmesDoDB = await DatabaseService.instance.readAll();
      if (mounted) {
        setState(() {
          _listaDeAlarmes = alarmesDoDB;
          _estaCarregando = false;
        });
      }
    } catch (e) {
      print("ERRO em _recarregarAlarmes: $e");
      if (mounted) {
        setState(() => _estaCarregando = false);
      }
    }
  }

  String _getTempoRestante(AlarmModel alarme) {
    if (!alarme.isActive) return "Alarme desativado";

    final agora = DateTime.now();
    DateTime proximo;

    if (alarme.daysOfWeek.isEmpty) {
      proximo = DateTime(
          agora.year, agora.month, agora.day, alarme.hour, alarme.minute);
      if (proximo.isBefore(agora)) {
        proximo = proximo.add(const Duration(days: 1));
      }
    } else {
      proximo = DateTime(
          agora.year, agora.month, agora.day, alarme.hour, alarme.minute);
      bool found = false;
      for (int i = 0; i <= 7; i++) {
        DateTime candidate = DateTime(
                agora.year, agora.month, agora.day, alarme.hour, alarme.minute)
            .add(Duration(days: i));
        if (alarme.daysOfWeek.contains(candidate.weekday)) {
          if (candidate.isAfter(agora)) {
            proximo = candidate;
            found = true;
            break;
          }
        }
      }
      if (!found) return "";
    }

    final diferenca = proximo.difference(agora);
    final horas = diferenca.inHours;
    final minutos =
        (diferenca.inMinutes % 60) + 1; // Ajuste para arredondar visualmente

    if (horas > 0) {
      return "em $horas ${horas == 1 ? 'hora' : 'horas'}, $minutos ${minutos == 1 ? 'minuto' : 'minutos'}";
    } else {
      return "em $minutos ${minutos == 1 ? 'minuto' : 'minutos'}";
    }
  }

  void _testeAlarmeDezSegundos() async {
    await AlarmService.instance.testeImediato();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
          content: Text('Teste de 10 segundos agendado!'),
          backgroundColor: Colors.blue),
    );
  }

  void _navegarParaEditar([AlarmModel? alarme]) async {
    final resultado = await Navigator.push<AlarmModel>(
      context,
      MaterialPageRoute(
          builder: (context) => TelaEditarAlarme(alarmeInicial: alarme)),
    );

    if (resultado != null) {
      AlarmModel alarmeFinal;
      if (alarme == null) {
        alarmeFinal = await DatabaseService.instance.create(resultado);
      } else {
        await DatabaseService.instance.update(resultado);
        alarmeFinal = resultado;
      }
      await AlarmService.instance.agendarAlarme(alarmeFinal);
      await _recarregarAlarmes();
    }
  }

  Future<void> _deletarAlarme(int id) async {
    final confirmado = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Excluir Alarme'),
        content: const Text('Deseja realmente apagar este alarme?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child:
                  const Text('Excluir', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirmado == true) {
      await DatabaseService.instance.delete(id);
      await AlarmService.instance.cancelarAlarme(id);
      await _recarregarAlarmes();
    }
  }

  Future<void> _alternarAtivo(AlarmModel alarme, bool novoValor) async {
    final alarmeAtualizado = alarme.copyWith(isActive: novoValor);
    await DatabaseService.instance.update(alarmeAtualizado);
    await AlarmService.instance.agendarAlarme(alarmeAtualizado);

    final index = _listaDeAlarmes.indexWhere((a) => a.id == alarme.id);
    if (index != -1 && mounted) {
      setState(() {
        _listaDeAlarmes[index] = alarmeAtualizado;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return PaginaBase(
      child: Column(
        children: [
          const SizedBox(height: 30),
          const Text('Alarmes da Rotina',
              style: TextStyle(
                  fontFamily: 'Billotilde',
                  fontSize: 60,
                  height: 1.1,
                  color: Color(0xFF318134)),
              textAlign: TextAlign.center),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              ElevatedButton(
                onPressed: () => _navegarParaEditar(),
                style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDC4900),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 10),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(50))),
                child: const Text('Adicionar',
                    style: TextStyle(
                        color: Colors.white,
                        fontFamily: 'Billotilde',
                        fontSize: 25)),
              ),
              ElevatedButton(
                onPressed: _testeAlarmeDezSegundos,
                style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blueGrey,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 10),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(50))),
                child: const Text('Teste 10s',
                    style: TextStyle(
                        color: Colors.white,
                        fontFamily: 'Billotilde',
                        fontSize: 25)),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Expanded(
            child: _estaCarregando
                ? const Center(child: CircularProgressIndicator())
                : _listaDeAlarmes.isEmpty
                    ? const Center(
                        child: Text('Nenhum alarme configurado.',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w600)))
                    : ListView.builder(
                        itemCount: _listaDeAlarmes.length,
                        itemBuilder: (context, index) {
                          final alarme = _listaDeAlarmes[index];
                          final horarioFormatado =
                              NumberFormat("00").format(alarme.hour) +
                                  ":" +
                                  NumberFormat("00").format(alarme.minute);

                          final List<Map<String, dynamic>> diasInfo = [
                            {'label': 'Dom', 'valor': 7},
                            {'label': 'Seg', 'valor': 1},
                            {'label': 'Ter', 'valor': 2},
                            {'label': 'Qua', 'valor': 3},
                            {'label': 'Qui', 'valor': 4},
                            {'label': 'Sex', 'valor': 5},
                            {'label': 'Sáb', 'valor': 6},
                          ];

                          return GestureDetector(
                            onTap: () => _navegarParaEditar(alarme),
                            child: Container(
                              margin: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 8),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: const Color(0xFF2E2E2E).withOpacity(0.9),
                                borderRadius: BorderRadius.circular(15),
                                boxShadow: [
                                  BoxShadow(
                                      color: Colors.black.withOpacity(0.3),
                                      blurRadius: 8,
                                      offset: const Offset(0, 4))
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(horarioFormatado,
                                          style: TextStyle(
                                              fontSize: 48,
                                              fontWeight: FontWeight.w300,
                                              color: alarme.isActive
                                                  ? Colors.white
                                                  : Colors.grey)),
                                      Row(
                                        children: [
                                          IconButton(
                                            icon: const Icon(
                                                Icons.delete_outline,
                                                color: Colors.redAccent,
                                                size: 28),
                                            onPressed: () =>
                                                _deletarAlarme(alarme.id!),
                                          ),
                                          Switch(
                                            value: alarme.isActive,
                                            onChanged: (novoValor) =>
                                                _alternarAtivo(
                                                    alarme, novoValor),
                                            activeColor:
                                                const Color(0xFF318134),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  Row(
                                    children: [
                                      Icon(Icons.notifications_none,
                                          size: 16,
                                          color: alarme.isActive
                                              ? Colors.grey
                                              : Colors.grey.shade700),
                                      const SizedBox(width: 4),
                                      Text(_getTempoRestante(alarme),
                                          style: TextStyle(
                                              color: alarme.isActive
                                                  ? Colors.grey
                                                  : Colors.grey.shade700,
                                              fontSize: 14)),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(alarme.title.toUpperCase(),
                                      style: TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                          color: alarme.isActive
                                              ? Colors.grey.shade400
                                              : Colors.grey.shade700)),
                                  const SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: diasInfo.map((dia) {
                                      final selecionado = alarme.daysOfWeek
                                          .contains(dia['valor']);
                                      return Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: selecionado
                                              ? (alarme.isActive
                                                  ? const Color(0xFF318134)
                                                  : Colors.grey.shade800)
                                              : Colors.transparent,
                                          borderRadius:
                                              BorderRadius.circular(12),
                                        ),
                                        child: Text(dia['label'],
                                            style: TextStyle(
                                                fontSize: 12,
                                                color: selecionado
                                                    ? Colors.white
                                                    : (alarme.isActive
                                                        ? Colors.grey
                                                        : Colors.grey.shade800),
                                                fontWeight: selecionado
                                                    ? FontWeight.bold
                                                    : FontWeight.normal)),
                                      );
                                    }).toList(),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
          Padding(
            padding: const EdgeInsets.only(bottom: 15.0, top: 15.0),
            child: BotaoVerde(
                texto: 'Voltar',
                larguraPercentual: 0.5,
                aoPressionar: () => Navigator.pop(context)),
          ),
        ],
      ),
    );
  }
}
