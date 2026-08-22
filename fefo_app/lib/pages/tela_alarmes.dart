// lib/pages/tela_alarmes.dart

import 'dart:async';
import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/alarm_model.dart';
import '../services/database_service.dart';
import '../services/alarm_service.dart';
import '../managers/bluetooth_manager.dart';
import '../widgets/pagina_base.dart';
import '../widgets/botao_pincelada.dart';
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
    _timerDinamico = Timer.periodic(const Duration(minutes: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timerDinamico?.cancel();
    super.dispose();
  }

  Future<void> _recarregarAlarmes() async {
    try {
      final alarmesDoDB = await DatabaseService.instance.readAll();
      if (mounted) {
        setState(() {
          _listaDeAlarmes = alarmesDoDB;
          _estaCarregando = false;
        });
      }
    } catch (e) {
      log("FEFO: Erro ao recarregar alarmes: $e");
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
        agora.year,
        agora.month,
        agora.day,
        alarme.hour,
        alarme.minute,
      );
      if (proximo.isBefore(agora)) {
        proximo = proximo.add(const Duration(days: 1));
      }
    } else {
      proximo = DateTime(
        agora.year,
        agora.month,
        agora.day,
        alarme.hour,
        alarme.minute,
      );
      bool encontrou = false;
      for (int i = 0; i <= 7; i++) {
        DateTime candidato = DateTime(
          agora.year,
          agora.month,
          agora.day,
          alarme.hour,
          alarme.minute,
        ).add(Duration(days: i));
        if (alarme.daysOfWeek.contains(candidato.weekday)) {
          if (candidato.isAfter(agora)) {
            proximo = candidato;
            encontrou = true;
            break;
          }
        }
      }
      if (!encontrou) return "";
    }

    final diferenca = proximo.difference(agora);
    final horas = diferenca.inHours;
    final minutos = (diferenca.inMinutes % 60) + 1;

    if (horas > 0) {
      return "Toca em $horas ${horas == 1 ? 'hora' : 'horas'} e $minutos ${minutos == 1 ? 'minuto' : 'minutos'}";
    } else {
      return "Toca em $minutos ${minutos == 1 ? 'minuto' : 'minutos'}";
    }
  }

  Future<void> _alternarAtivo(AlarmModel alarme) async {
    final alarmeAtualizado = alarme.copyWith(isActive: !alarme.isActive);
    await DatabaseService.instance.update(alarmeAtualizado);
    if (alarmeAtualizado.isActive) {
      await AlarmService.instance.agendarAlarme(alarmeAtualizado);
    } else {
      if (alarmeAtualizado.id != null) {
        await AlarmService.instance.cancelarAlarme(alarmeAtualizado.id!);
      }
    }
    await _recarregarAlarmes();
  }

  Future<void> _deletarAlarme(AlarmModel alarme) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Excluir Alarme',
          style: TextStyle(
              fontFamily: 'KGPen',
              color: Color(0xFFDC4900),
              fontWeight: FontWeight.bold),
        ),
        content: Text(
          'Deseja remover o alarme "${alarme.title}"?',
          style: const TextStyle(fontFamily: 'KGPen', fontSize: 16),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar',
                style: TextStyle(fontFamily: 'KGPen', color: Colors.grey)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Excluir',
                style: TextStyle(
                    fontFamily: 'KGPen',
                    color: Color(0xFFDC4900),
                    fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmar == true) {
      final idOriginal = alarme.id;
      final tituloOriginal = alarme.title;
      final horaOriginal = alarme.hour;
      final minutoOriginal = alarme.minute;

      setState(() {
        _listaDeAlarmes.removeWhere((a) =>
            (idOriginal != null && a.id == idOriginal) ||
            (a.title == tituloOriginal &&
                a.hour == horaOriginal &&
                a.minute == minutoOriginal));
      });

      try {
        if (idOriginal != null) {
          await AlarmService.instance.cancelarAlarme(idOriginal);
          await DatabaseService.instance.delete(idOriginal);
        }
        await DatabaseService.instance
            .deleteByTitleAndTime(tituloOriginal, horaOriginal, minutoOriginal);
      } catch (e) {
        log("FEFO: Erro ao deletar alarme: $e");
      }

      await _recarregarAlarmes();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Alarme "$tituloOriginal" excluído com sucesso!'),
            backgroundColor: const Color(0xFFDC4900),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  Future<void> _abrirEditor([AlarmModel? alarme]) async {
    final resultado = await Navigator.push<AlarmModel>(
      context,
      MaterialPageRoute(
        builder: (context) => TelaEditarAlarme(alarmeInicial: alarme),
      ),
    );

    if (resultado != null) {
      if (resultado.id == null) {
        final criado = await DatabaseService.instance.create(resultado);
        await AlarmService.instance.agendarAlarme(criado);
      } else {
        await DatabaseService.instance.update(resultado);
        await AlarmService.instance.agendarAlarme(resultado);
      }
      await _recarregarAlarmes();
    }
  }

  @override
  Widget build(BuildContext context) {
    const corVerde = Color(0xFF318134);
    const corLaranja = Color(0xFFDC4900);
    final manager = context.watch<BluetoothManager>();

    return PaginaBase(
      mostrarBotaoVoltar: true,
      child: Stack(
        children: [
          Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 10),
                Text(
                  'Alarmes',
                  style: TextStyle(
                    fontFamily: 'Billotilde',
                    fontSize: 52,
                    color: Theme.of(context).colorScheme.secondary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                const Text(
                  'Agende rotinas e horários para o seu PET te chamar!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: 'KGPen',
                    fontSize: 15,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 18),
                Expanded(
                  child: _estaCarregando
                      ? const Center(
                          child: CircularProgressIndicator(color: corLaranja),
                        )
                      : _listaDeAlarmes.isEmpty
                          ? _buildEstadoVazio()
                          : ListView.builder(
                              itemCount: _listaDeAlarmes.length,
                              padding: const EdgeInsets.only(bottom: 90),
                              itemBuilder: (context, index) {
                                final alarme = _listaDeAlarmes[index];
                                return _buildCardAlarme(alarme, manager);
                              },
                            ),
                ),
              ],
            ),
          ),

          // Botão Flutuante Inferior para Criar Alarme
          Positioned(
            bottom: 20,
            left: 0,
            right: 0,
            child: Center(
              child: BotaoPincelada(
                texto: '+ Criar Alarme',
                cor: corVerde,
                fontSize: 30,
                aoPressionar: () => _abrirEditor(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEstadoVazio() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF318134).withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.alarm_add_rounded,
              size: 64,
              color: Color(0xFF318134),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Nenhum alarme agendado',
            style: TextStyle(
              fontFamily: 'KGPen',
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Toque no botão abaixo para criar o seu primeiro alarme.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: 'KGPen',
              fontSize: 15,
              color: Colors.black54,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardAlarme(AlarmModel alarme, BluetoothManager manager) {
    const corVerde = Color(0xFF318134);
    const corLaranja = Color(0xFFDC4900);

    final horaFormatada = alarme.hour.toString().padLeft(2, '0');
    final minutoFormatado = alarme.minute.toString().padLeft(2, '0');
    final horarioStr = '$horaFormatada:$minutoFormatado';
    final tempoRestante = _getTempoRestante(alarme);
    final nomeSom = TelaEditarAlarme.getNomeAmigavel(alarme.audioPath, context);

    final diasSiglas = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: alarme.isActive ? Colors.white : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: alarme.isActive ? corVerde : Colors.grey.shade400,
          width: alarme.isActive ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: alarme.isActive
                ? corVerde.withValues(alpha: 0.12)
                : Colors.black12,
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // TOPO DO CARD: HORÁRIO + TITULO + SWITCH
          Padding(
            padding:
                const EdgeInsets.only(left: 20, right: 12, top: 16, bottom: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            horarioStr,
                            style: TextStyle(
                              fontFamily: 'KGPen',
                              fontSize: 42,
                              fontWeight: FontWeight.bold,
                              color: alarme.isActive
                                  ? corVerde
                                  : Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        alarme.title,
                        style: TextStyle(
                          fontFamily: 'KGPen',
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: alarme.isActive
                              ? Colors.black87
                              : Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch.adaptive(
                  value: alarme.isActive,
                  activeColor: corVerde,
                  activeTrackColor: corVerde.withValues(alpha: 0.3),
                  onChanged: (_) => _alternarAtivo(alarme),
                ),
              ],
            ),
          ),

          // SOM DO FEFO ASSOCIADO
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            child: Row(
              children: [
                Icon(
                  Icons.music_note_rounded,
                  size: 18,
                  color: alarme.isActive ? corLaranja : Colors.grey,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    nomeSom,
                    style: TextStyle(
                      fontFamily: 'KGPen',
                      fontSize: 14,
                      color: alarme.isActive ? corLaranja : Colors.grey,
                      fontWeight: FontWeight.bold,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),

          // DIAS DA SEMANA CHIPS
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: List.generate(7, (i) {
                final diaValor = (i == 0) ? 7 : i;
                final selecionado = alarme.daysOfWeek.contains(diaValor);
                return Container(
                  margin: const EdgeInsets.only(right: 6),
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    color: selecionado
                        ? (alarme.isActive ? corVerde : Colors.grey.shade600)
                        : Colors.grey.shade200,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    diasSiglas[i],
                    style: TextStyle(
                      fontFamily: 'KGPen',
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: selecionado ? Colors.white : Colors.grey.shade500,
                    ),
                  ),
                );
              }),
            ),
          ),

          // TEMPO RESTANTE + AÇÕES INFERIORES
          Container(
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius:
                  const BorderRadius.vertical(bottom: Radius.circular(20)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Icon(
                  Icons.timer_outlined,
                  size: 16,
                  color: alarme.isActive ? corVerde : Colors.grey,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    tempoRestante,
                    style: TextStyle(
                      fontFamily: 'KGPen',
                      fontSize: 13,
                      color: alarme.isActive ? corVerde : Colors.grey,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
                // Botão Testar no FEFO
                IconButton(
                  tooltip: 'Testar no FEFO',
                  icon: const Icon(Icons.play_circle_fill_rounded,
                      color: corLaranja, size: 26),
                  onPressed: () {
                    if (manager.isConnected) {
                      manager.playAudio(alarme.audioPath);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Tocando "${alarme.title}" no FEFO...'),
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                              'Conecte ao PET FEFO via Bluetooth para testar o alarme.'),
                        ),
                      );
                    }
                  },
                ),
                // Editar
                IconButton(
                  tooltip: 'Editar',
                  icon: const Icon(Icons.edit_rounded,
                      color: Colors.black54, size: 22),
                  onPressed: () => _abrirEditor(alarme),
                ),
                // Excluir
                IconButton(
                  tooltip: 'Excluir',
                  icon: const Icon(Icons.delete_outline_rounded,
                      color: Colors.redAccent, size: 22),
                  onPressed: () => _deletarAlarme(alarme),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
