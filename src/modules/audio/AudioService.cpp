#include "modules/audio/AudioService.h"

#include <Arduino.h>
#include <cmath>
#include <driver/i2s.h>

#include "board/Fefo35Board.h"

namespace fefo {
namespace {

constexpr i2s_port_t kI2sPort = I2S_NUM_0;
constexpr uint32_t kSampleRate = 16000;
constexpr size_t kBufferSamples = 256;

}  // namespace

bool AudioService::begin() {
  // O repouso em zero foi validado como silencioso no NS8002D desta placa.
  dacWrite(board::kAudioOutput, 0);
  Serial.println("[AUDIO] DAC GPIO 26 fixado em zero (silencio).");
  return true;
}

void AudioService::selfTest() {
  Serial.println("[AUDIO] Autoteste I2S/DMA: 12 segundos, final em 100%.");
  if (!beginDma()) {
    Serial.println("[AUDIO] ERRO: nao foi possivel iniciar I2S/DMA.");
    stop();
    return;
  }

  // Evita um degrau DC ao levar o DAC do repouso zero ao centro da onda.
  writeDmaRamp(0, 128, 800);

  Serial.println("[AUDIO] Nivel 50%: La 440 Hz por 2 segundos.");
  writeDmaTone(440.00F, 2000, 64);
  Serial.println("[AUDIO] Nivel 75%: Do 523 Hz por 2 segundos.");
  writeDmaTone(523.25F, 2000, 96);
  Serial.println("[AUDIO] Nivel 100%: sequencia de 8 segundos.");
  writeDmaTone(523.25F, 2000, 127);
  writeDmaTone(659.25F, 2000, 127);
  writeDmaTone(783.99F, 2000, 127);
  writeDmaTone(1046.50F, 2000, 127);

  // Desce ao repouso de forma suave. O bloco final mantém zero na fila DMA
  // antes de o periférico ser liberado, reduzindo estalos de encerramento.
  writeDmaRamp(128, 0, 1000);
  uint16_t zeroBuffer[kBufferSamples]{};
  size_t bytesWritten = 0;
  i2s_write(kI2sPort, zeroBuffer, sizeof(zeroBuffer), &bytesWritten,
            portMAX_DELAY);
  delay(250);
  endDma();
  stop();

  Serial.println("[AUDIO] Autoteste DMA concluido; DAC em zero.");
}

void AudioService::stop() {
  dacWrite(board::kAudioOutput, 0);
}

bool AudioService::beginDma() {
  i2s_config_t config{};
  config.mode = static_cast<i2s_mode_t>(I2S_MODE_MASTER | I2S_MODE_TX |
                                        I2S_MODE_DAC_BUILT_IN);
  config.sample_rate = kSampleRate;
  config.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
  config.channel_format = I2S_CHANNEL_FMT_ONLY_LEFT;
  config.communication_format = I2S_COMM_FORMAT_STAND_MSB;
  config.intr_alloc_flags = ESP_INTR_FLAG_LEVEL1;
  config.dma_buf_count = 8;
  config.dma_buf_len = kBufferSamples;
  config.use_apll = true;
  config.tx_desc_auto_clear = true;
  config.fixed_mclk = 0;
  config.mclk_multiple = I2S_MCLK_MULTIPLE_DEFAULT;
  config.bits_per_chan = I2S_BITS_PER_CHAN_DEFAULT;

  if (i2s_driver_install(kI2sPort, &config, 0, nullptr) != ESP_OK) {
    return false;
  }
  // Canal esquerdo do DAC interno corresponde ao DAC2 no GPIO 26.
  if (i2s_set_dac_mode(I2S_DAC_CHANNEL_LEFT_EN) != ESP_OK ||
      i2s_set_clk(kI2sPort, kSampleRate, I2S_BITS_PER_SAMPLE_16BIT,
                  I2S_CHANNEL_MONO) != ESP_OK) {
    i2s_driver_uninstall(kI2sPort);
    return false;
  }
  return true;
}

void AudioService::endDma() {
  i2s_stop(kI2sPort);
  i2s_driver_uninstall(kI2sPort);
}

bool AudioService::writeDmaTone(float frequencyHz, uint32_t durationMs,
                                uint8_t amplitude) {
  uint16_t buffer[kBufferSamples];
  const uint32_t sampleCount = durationMs * kSampleRate / 1000UL;
  const uint32_t envelopeSamples = kSampleRate / 10;  // 100 ms.
  uint32_t generated = 0;

  while (generated < sampleCount) {
    const size_t count = min(static_cast<uint32_t>(kBufferSamples),
                             sampleCount - generated);
    for (size_t index = 0; index < count; ++index) {
      const uint32_t sample = generated + index;
      float envelope = 1.0F;
      if (sample < envelopeSamples) {
        envelope = static_cast<float>(sample) / envelopeSamples;
      } else if (sampleCount - sample < envelopeSamples) {
        envelope = static_cast<float>(sampleCount - sample) / envelopeSamples;
      }

      const float phase = 2.0F * PI * frequencyHz * sample / kSampleRate;
      const int dacValue =
          128 + static_cast<int>(sinf(phase) * amplitude * envelope);
      // O DAC usa os oito bits superiores de cada amostra I2S de 16 bits.
      buffer[index] = static_cast<uint16_t>(constrain(dacValue, 0, 255)) << 8;
    }

    size_t bytesWritten = 0;
    const size_t requestedBytes = count * sizeof(uint16_t);
    if (i2s_write(kI2sPort, buffer, requestedBytes, &bytesWritten,
                  portMAX_DELAY) != ESP_OK ||
        bytesWritten != requestedBytes) {
      return false;
    }
    generated += count;
  }
  return true;
}

bool AudioService::writeDmaRamp(uint8_t from, uint8_t to,
                                uint32_t durationMs) {
  uint16_t buffer[kBufferSamples];
  const uint32_t sampleCount = durationMs * kSampleRate / 1000UL;
  uint32_t generated = 0;

  while (generated < sampleCount) {
    const size_t count = min(static_cast<uint32_t>(kBufferSamples),
                             sampleCount - generated);
    for (size_t index = 0; index < count; ++index) {
      const uint32_t sample = generated + index;
      const int dacValue = from +
                           (static_cast<int>(to) - from) * sample / sampleCount;
      buffer[index] = static_cast<uint16_t>(dacValue) << 8;
    }

    size_t bytesWritten = 0;
    const size_t requestedBytes = count * sizeof(uint16_t);
    if (i2s_write(kI2sPort, buffer, requestedBytes, &bytesWritten,
                  portMAX_DELAY) != ESP_OK ||
        bytesWritten != requestedBytes) {
      return false;
    }
    generated += count;
  }
  return true;
}

}  // namespace fefo
