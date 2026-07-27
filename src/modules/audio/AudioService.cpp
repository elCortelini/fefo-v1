#include "modules/audio/AudioService.h"

#include <Arduino.h>
#include <cmath>
#include <driver/i2s.h>

#include "board/Fefo35Board.h"

namespace fefo {
namespace {

constexpr i2s_port_t kI2sPort = I2S_NUM_0;
constexpr size_t kBufferSamples = 128;
constexpr size_t kSineTableSize = 256;
constexpr uint16_t kEnvelopeMaximum = 32767;
constexpr uint64_t kFullPhase = uint64_t{1} << 32;
constexpr uint8_t kAudioTaskPriority = 2;
constexpr uint32_t kAudioTaskStackBytes = 4096;
constexpr BaseType_t kAudioTaskCore = 0;
constexpr TickType_t kDmaWriteTimeout = pdMS_TO_TICKS(50);

// Converte um tempo de rampa em um incremento Q15 por amostra. O arredondamento
// para cima garante que a rampa sempre termine dentro do prazo configurado.
uint16_t envelopeStepFor(uint16_t durationMs) {
  const uint32_t samples =
      max<uint32_t>(1, board::kAudioSampleRateHz * durationMs / 1000UL);
  return static_cast<uint16_t>((kEnvelopeMaximum + samples - 1) / samples);
}

}  // namespace

bool AudioService::begin() {
  // O nível zero já foi validado como repouso silencioso no NS8002D da placa.
  // A tarefa também usa zero quando o alerta está inativo.
  dacWrite(board::kAudioOutput, 0);

  if (!beginDma()) {
    Serial.println("[AUDIO] ERRO: nao foi possivel iniciar I2S0/DMA.");
    dacWrite(board::kAudioOutput, 0);
    return false;
  }

  // Marca o serviço pronto antes de liberar a tarefa. Se ela detectar uma
  // falha de escrita, voltará a limpar esta flag e colocará o DAC em repouso.
  ready_.store(true, std::memory_order_relaxed);
  const BaseType_t created = xTaskCreatePinnedToCore(
      audioTaskEntry, "fefo_audio", kAudioTaskStackBytes, this,
      kAudioTaskPriority, &taskHandle_, kAudioTaskCore);
  if (created != pdPASS) {
    ready_.store(false, std::memory_order_relaxed);
    endDma();
    dacWrite(board::kAudioOutput, 0);
    Serial.println("[AUDIO] ERRO: tarefa da sirene nao foi criada.");
    return false;
  }

  Serial.printf(
      "[AUDIO] I2S0/DMA pronto no GPIO %d; sirene %u-%u Hz, volume %u%%.\n",
      board::kAudioOutput, board::kSirenMinFrequencyHz,
      board::kSirenMaxFrequencyHz, board::kSirenVolumePercent);
  return true;
}

void AudioService::selfTest() {
  if (!ready()) {
    Serial.println("[AUDIO] Autoteste ignorado: servico indisponivel.");
    return;
  }

  // Este delay pertence somente ao autoteste manual. A sirene usada pela
  // aplicação é produzida na tarefa de áudio e nunca bloqueia o loop principal.
  Serial.println("[AUDIO] Autoteste da sirene por 4 segundos.");
  setSirenActive(true);
  delay(4000);
  setSirenActive(false);
  delay(board::kSirenReleaseMs + 20);
  Serial.println("[AUDIO] Autoteste concluido.");
}

void AudioService::setSirenActive(bool active) {
  if (!ready()) {
    // Uma falha de áudio nunca pode impedir o motor de respeitar seus limites.
    // O aviso aparece uma única vez por solicitação para não inundar o Serial.
    if (active && !unavailableWarningShown_) {
      unavailableWarningShown_ = true;
      Serial.println("[AUDIO] Sirene indisponivel; motor segue protegido.");
    } else if (!active) {
      unavailableWarningShown_ = false;
    }
    return;
  }

  const bool previous =
      sirenRequested_.exchange(active, std::memory_order_relaxed);
  if (previous == active) return;

  if (active) {
    Serial.println("[AUDIO] Sirene ligada junto com o motor.");
  } else {
    Serial.println("[AUDIO] Sirene desligando junto com o motor.");
  }
}

void AudioService::stop() {
  // A tarefa reduz o envelope até zero em 60 ms. Isso evita o degrau elétrico
  // que produzia os estalos observados nos testes anteriores.
  setSirenActive(false);
  if (!ready()) dacWrite(board::kAudioOutput, 0);
}

bool AudioService::beginDma() {
  i2s_config_t config{};
  config.mode = static_cast<i2s_mode_t>(I2S_MODE_MASTER | I2S_MODE_TX |
                                        I2S_MODE_DAC_BUILT_IN);
  config.sample_rate = board::kAudioSampleRateHz;
  config.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
  config.channel_format = I2S_CHANNEL_FMT_ONLY_LEFT;
  config.communication_format = I2S_COMM_FORMAT_STAND_MSB;
  config.intr_alloc_flags = ESP_INTR_FLAG_LEVEL1;
  config.dma_buf_count = 4;
  config.dma_buf_len = kBufferSamples;
  config.use_apll = true;
  config.tx_desc_auto_clear = true;
  config.fixed_mclk = 0;
  config.mclk_multiple = I2S_MCLK_MULTIPLE_DEFAULT;
  config.bits_per_chan = I2S_BITS_PER_CHAN_DEFAULT;

  if (i2s_driver_install(kI2sPort, &config, 0, nullptr) != ESP_OK) return false;

  // No ESP32 clássico, o canal esquerdo do DAC interno é o DAC2/GPIO 26.
  if (i2s_set_dac_mode(I2S_DAC_CHANNEL_LEFT_EN) != ESP_OK ||
      i2s_set_clk(kI2sPort, board::kAudioSampleRateHz,
                  I2S_BITS_PER_SAMPLE_16BIT, I2S_CHANNEL_MONO) != ESP_OK ||
      i2s_zero_dma_buffer(kI2sPort) != ESP_OK) {
    i2s_driver_uninstall(kI2sPort);
    return false;
  }
  return true;
}

void AudioService::endDma() {
  i2s_zero_dma_buffer(kI2sPort);
  i2s_stop(kI2sPort);
  i2s_driver_uninstall(kI2sPort);
}

void AudioService::audioTaskEntry(void* context) {
  static_cast<AudioService*>(context)->audioTask();
}

void AudioService::audioTask() {
  uint16_t buffer[kBufferSamples]{};
  int8_t sineTable[kSineTableSize]{};

  // A tabela elimina milhares de chamadas a sinf por segundo. A frequência
  // continua variável porque o acumulador de fase avança em passos diferentes.
  for (size_t index = 0; index < kSineTableSize; ++index) {
    const float phase = 2.0F * PI * index / kSineTableSize;
    sineTable[index] = static_cast<int8_t>(lroundf(sinf(phase) * 127.0F));
  }

  const uint16_t attackStep = envelopeStepFor(board::kSirenAttackMs);
  const uint16_t releaseStep = envelopeStepFor(board::kSirenReleaseMs);
  const uint32_t halfSweepSamples = max<uint32_t>(
      1, board::kAudioSampleRateHz * board::kSirenSweepHalfPeriodMs / 1000UL);
  const uint32_t fullSweepSamples = halfSweepSamples * 2;
  const int32_t toneAmplitude =
      (127 * board::kSirenVolumePercent + 50) / 100;

  uint16_t envelope = 0;
  uint32_t phaseAccumulator = 0;
  uint32_t sweepSample = 0;

  while (true) {
    for (size_t index = 0; index < kBufferSamples; ++index) {
      const bool requested =
          sirenRequested_.load(std::memory_order_relaxed);

      if (requested) {
        envelope = min<uint32_t>(kEnvelopeMaximum, envelope + attackStep);
      } else {
        envelope = envelope > releaseStep ? envelope - releaseStep : 0;
      }

      int dacValue = 0;
      if (envelope > 0) {
        const uint32_t sweepPosition = sweepSample % fullSweepSamples;
        const uint32_t triangle =
            sweepPosition < halfSweepSamples
                ? sweepPosition
                : fullSweepSamples - sweepPosition;
        const uint32_t frequency =
            board::kSirenMinFrequencyHz +
            (static_cast<uint32_t>(board::kSirenMaxFrequencyHz -
                                   board::kSirenMinFrequencyHz) *
             triangle) /
                halfSweepSamples;
        const uint32_t phaseIncrement = static_cast<uint32_t>(
            (static_cast<uint64_t>(frequency) * kFullPhase) /
            board::kAudioSampleRateHz);

        phaseAccumulator += phaseIncrement;
        ++sweepSample;
        const int32_t wave = sineTable[phaseAccumulator >> 24];
        const int32_t centeredSignal = 128 + wave * toneAmplitude / 127;

        // O envelope multiplica também o centro DC: em repouso o DMA envia
        // zero, e durante a sirene chega suavemente à onda centrada em 128.
        dacValue = centeredSignal * envelope / kEnvelopeMaximum;
      } else {
        // Cada novo acionamento começa no mesmo ponto da varredura e sem
        // descontinuidade de fase herdada do alerta anterior.
        phaseAccumulator = 0;
        sweepSample = 0;
      }

      buffer[index] =
          static_cast<uint16_t>(constrain(dacValue, 0, 255)) << 8;
    }

    sirenAudible_.store(envelope > 0, std::memory_order_relaxed);
    size_t bytesWritten = 0;
    const esp_err_t result =
        i2s_write(kI2sPort, buffer, sizeof(buffer), &bytesWritten,
                  kDmaWriteTimeout);
    if (result == ESP_OK && bytesWritten == sizeof(buffer)) continue;

    // Em erro de DMA, silencia fisicamente e encerra apenas esta tarefa. Os
    // demais módulos continuam rodando e o limite do motor permanece válido.
    sirenRequested_.store(false, std::memory_order_relaxed);
    sirenAudible_.store(false, std::memory_order_relaxed);
    ready_.store(false, std::memory_order_relaxed);
    Serial.printf("[AUDIO] ERRO de escrita I2S/DMA: codigo=%d, bytes=%u.\n",
                  static_cast<int>(result),
                  static_cast<unsigned>(bytesWritten));
    endDma();
    dacWrite(board::kAudioOutput, 0);
    taskHandle_ = nullptr;
    vTaskDelete(nullptr);
  }
}

}  // namespace fefo
