#include "modules/audio/AudioService.h"

#include <Arduino.h>
#include <cmath>
#include <cstring>
#include <driver/i2s.h>
#include <SD.h>

#include "board/Fefo35Board.h"

namespace fefo {
namespace {

constexpr i2s_port_t kI2sPort = I2S_NUM_0;
constexpr size_t kBufferSamples = 1024;
constexpr int kMaxI2sRecoverAttempts = 3;
constexpr size_t kSineTableSize = 256;
constexpr uint16_t kEnvelopeMaximum = 32767;
constexpr uint64_t kFullPhase = uint64_t{1} << 32;
constexpr uint8_t kAudioTaskPriority = 4;
constexpr uint32_t kAudioTaskStackBytes = 8192;
constexpr BaseType_t kAudioTaskCore = 0;
constexpr TickType_t kDmaWriteTimeout = pdMS_TO_TICKS(200);
// O DAC interno do ESP32 recebe amostras de 8 bits no byte mais significativo.
// O valor 128 e o ponto de repouso; enviar zero durante o silencio cria um
// degrau de tensao que pode ser ouvido como estalo no amplificador.
constexpr uint16_t kDacSilenceSample = uint16_t{128} << 8;

struct WavInfo {
  uint32_t sampleRate{0};
  uint32_t dataOffset{0};
  uint32_t dataSize{0};
};

bool readExact(File& file, uint8_t* output, size_t size) {
  return file.read(output, size) == size;
}

uint16_t readLe16(const uint8_t* bytes) {
  return static_cast<uint16_t>(bytes[0]) |
         (static_cast<uint16_t>(bytes[1]) << 8);
}

uint32_t readLe32(const uint8_t* bytes) {
  return static_cast<uint32_t>(bytes[0]) |
         (static_cast<uint32_t>(bytes[1]) << 8) |
         (static_cast<uint32_t>(bytes[2]) << 16) |
         (static_cast<uint32_t>(bytes[3]) << 24);
}

bool supportedSampleRate(uint32_t sampleRate) {
  return sampleRate == 16000 || sampleRate == 22050 || sampleRate == 32000;
}

bool parseWavHeader(File& file, WavInfo& info) {
  if (!file.seek(0)) return false;
  uint8_t riff[12]{};
  if (!readExact(file, riff, sizeof(riff)) ||
      memcmp(riff, "RIFF", 4) != 0 || memcmp(riff + 8, "WAVE", 4) != 0) {
    return false;
  }

  bool formatFound = false;
  bool dataFound = false;
  uint16_t audioFormat = 0;
  uint16_t channels = 0;
  uint16_t bitsPerSample = 0;
  uint16_t blockAlign = 0;

  while (file.position() + 8 <= file.size()) {
    uint8_t chunkHeader[8]{};
    if (!readExact(file, chunkHeader, sizeof(chunkHeader))) return false;
    const uint32_t chunkSize = readLe32(chunkHeader + 4);
    const uint32_t chunkDataOffset = file.position();
    if (chunkSize > file.size() - chunkDataOffset) return false;

    if (memcmp(chunkHeader, "fmt ", 4) == 0) {
      if (chunkSize < 16) return false;
      uint8_t format[16]{};
      if (!readExact(file, format, sizeof(format))) return false;
      audioFormat = readLe16(format);
      channels = readLe16(format + 2);
      info.sampleRate = readLe32(format + 4);
      blockAlign = readLe16(format + 12);
      bitsPerSample = readLe16(format + 14);
      formatFound = true;
    } else if (memcmp(chunkHeader, "data", 4) == 0) {
      info.dataOffset = chunkDataOffset;
      info.dataSize = chunkSize & ~uint32_t{1};
      dataFound = true;
    }

    const uint32_t nextChunk = chunkDataOffset + chunkSize + (chunkSize & 1U);
    if (nextChunk > file.size() || !file.seek(nextChunk)) return false;
    if (formatFound && dataFound) break;
  }

  if (!formatFound || !dataFound || info.dataSize == 0) return false;
  if (audioFormat != 1 || channels != 1 || bitsPerSample != 16 ||
      blockAlign != 2 || !supportedSampleRate(info.sampleRate)) {
    Serial.printf(
        "[AUDIO] WAV incompativel: formato=%u canais=%u bits=%u taxa=%lu.\n",
        audioFormat, channels, bitsPerSample,
        static_cast<unsigned long>(info.sampleRate));
    return false;
  }
  return info.dataOffset + info.dataSize <= file.size();
}

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

  if (sirenLocked_.load(std::memory_order_relaxed)) {
    Serial.println("[AUDIO] Autoteste ignorado: sirene travada.");
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
    if (sirenLocked_.load(std::memory_order_relaxed)) {
      Serial.println("[AUDIO] Solicitação de sirene ignorada (travada).");
      // Do not change requested state when locked; restore previous
      sirenRequested_.store(previous, std::memory_order_relaxed);
      return;
    }
    Serial.println("[AUDIO] Sirene ligada junto com o motor.");
  } else {
    Serial.println("[AUDIO] Sirene desligando junto com o motor.");
  }
}

void AudioService::stop() {
  // A tarefa reduz o envelope até zero em 60 ms. Isso evita o degrau elétrico
  // que produzia os estalos observados nos testes anteriores.
  setSirenActive(false);
  stopPlayback();
  if (!ready()) dacWrite(board::kAudioOutput, 0);
}

bool AudioService::playWavFile(const char* path) {
  return playWavFileFrom(path, 0);
}

bool AudioService::playWavFileFrom(const char* path, uint32_t offsetBytes) {
  if (!ready() || path == nullptr || path[0] == '\0') return false;

  snprintf(playbackPath_, sizeof(playbackPath_), "%s", path);
  const char* baseName = strrchr(path, '/');
  if (baseName == nullptr) baseName = path;
  else
    baseName += 1;
  snprintf(playbackFileName_, sizeof(playbackFileName_), "%s", baseName);
  offsetBytes &= ~uint32_t{1};
  requestedPlaybackOffset_.store(offsetBytes, std::memory_order_relaxed);
  playbackPosition_.store(offsetBytes, std::memory_order_relaxed);
  playbackSize_.store(0, std::memory_order_relaxed);
  playbackLevelPercent_.store(0, std::memory_order_relaxed);
  stopPlaybackRequested_.store(true, std::memory_order_relaxed);
  playbackRequested_.store(true, std::memory_order_relaxed);
  Serial.printf("[AUDIO] solicitada reproducao de %s em offset %lu\n", path,
                static_cast<unsigned long>(offsetBytes));
  return true;
}

void AudioService::stopPlayback() {
  if (!ready()) return;
  stopPlaybackRequested_.store(true, std::memory_order_relaxed);
}

void AudioService::setVolumePercent(uint8_t percent) {
  if (percent > board::kDefaultMaxVolumePercent) {
    percent = board::kDefaultMaxVolumePercent;
  }
  volumePercent_.store(percent, std::memory_order_relaxed);
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
  config.dma_buf_count = 8;
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

  uint16_t envelope = 0;
  uint32_t phaseAccumulator = 0;
  uint32_t sweepSample = 0;
  uint32_t playbackDataOffset = 0;
  uint32_t playbackSampleRate = board::kAudioSampleRateHz;

  File playbackFile;
  playbackActive_.store(false, std::memory_order_relaxed);
  playbackPosition_.store(0, std::memory_order_relaxed);
  playbackSize_.store(0, std::memory_order_relaxed);

  int i2sFailureCount = 0;
  while (true) {
    if (stopPlaybackRequested_.load(std::memory_order_relaxed)) {
      if (playbackFile) playbackFile.close();
      i2s_zero_dma_buffer(kI2sPort);
      playbackActive_.store(false, std::memory_order_relaxed);
      stopPlaybackRequested_.store(false, std::memory_order_relaxed);
      playbackPosition_.store(0, std::memory_order_relaxed);
      playbackSize_.store(0, std::memory_order_relaxed);
      playbackLevelPercent_.store(0, std::memory_order_relaxed);
      i2s_set_clk(kI2sPort, board::kAudioSampleRateHz,
                  I2S_BITS_PER_SAMPLE_16BIT, I2S_CHANNEL_MONO);
    }

    if (!playbackActive_.load(std::memory_order_relaxed) &&
        playbackRequested_.load(std::memory_order_relaxed)) {
      playbackRequested_.store(false, std::memory_order_relaxed);
      if (playbackFile) playbackFile.close();
      i2s_zero_dma_buffer(kI2sPort);
      playbackFile = SD.open(playbackPath_, FILE_READ);
      if (!playbackFile) {
        Serial.printf("[AUDIO] ERRO: arquivo de audio nao encontrado: %s\n",
                      playbackPath_);
      } else {
        WavInfo wav{};
        if (!parseWavHeader(playbackFile, wav)) {
          Serial.printf("[AUDIO] ERRO: WAV invalido ou nao suportado: %s\n",
                        playbackPath_);
          playbackFile.close();
        } else if (i2s_set_clk(kI2sPort, wav.sampleRate,
                               I2S_BITS_PER_SAMPLE_16BIT,
                               I2S_CHANNEL_MONO) != ESP_OK) {
          Serial.printf("[AUDIO] ERRO: falha ao configurar taxa %lu Hz.\n",
                        static_cast<unsigned long>(wav.sampleRate));
          playbackFile.close();
        } else {
          uint32_t offset =
              requestedPlaybackOffset_.load(std::memory_order_relaxed);
          if (offset >= wav.dataSize) offset = 0;
          offset &= ~uint32_t{1};
          playbackDataOffset = wav.dataOffset;
          playbackSampleRate = wav.sampleRate;
          playbackFile.seek(playbackDataOffset + offset);
          playbackSize_.store(wav.dataSize, std::memory_order_relaxed);
          playbackPosition_.store(offset, std::memory_order_relaxed);
          playbackActive_.store(true, std::memory_order_relaxed);
          Serial.printf("[AUDIO] WAV pronto: %lu Hz, mono, 16-bit, %lu bytes.\n",
                        static_cast<unsigned long>(playbackSampleRate),
                        static_cast<unsigned long>(wav.dataSize));
        }
      }
    }

    if (playbackActive_.load(std::memory_order_relaxed)) {
      const uint8_t volume = volumePercent_.load(std::memory_order_relaxed);
      const uint32_t position =
          playbackPosition_.load(std::memory_order_relaxed);
      const uint32_t total = playbackSize_.load(std::memory_order_relaxed);
      const size_t requestedBytes = static_cast<size_t>(
          min<uint32_t>(sizeof(buffer), total > position ? total - position : 0));
      const size_t bytesRead = requestedBytes == 0
                                   ? 0
                                   : playbackFile.read(
                                         reinterpret_cast<uint8_t*>(buffer),
                                         requestedBytes);
      const size_t sampleCount = bytesRead / sizeof(uint16_t);

      if (bytesRead == 0 || stopPlaybackRequested_.load(std::memory_order_relaxed)) {
        if (playbackFile) playbackFile.close();
        i2s_zero_dma_buffer(kI2sPort);
        playbackActive_.store(false, std::memory_order_relaxed);
        stopPlaybackRequested_.store(false, std::memory_order_relaxed);
        playbackPosition_.store(0, std::memory_order_relaxed);
        playbackSize_.store(0, std::memory_order_relaxed);
        playbackLevelPercent_.store(0, std::memory_order_relaxed);
        i2s_set_clk(kI2sPort, board::kAudioSampleRateHz,
                    I2S_BITS_PER_SAMPLE_16BIT, I2S_CHANNEL_MONO);
        for (size_t index = 0; index < kBufferSamples; ++index) {
          buffer[index] = kDacSilenceSample;
        }
      } else {
        int16_t* samples = reinterpret_cast<int16_t*>(buffer);
        uint32_t peak = 0;
        for (size_t index = 0; index < sampleCount; ++index) {
          int32_t sample = samples[index];
          peak = max<uint32_t>(peak, abs(sample));
          sample = (sample * static_cast<int32_t>(volume)) / 100;
          const uint8_t dacValue = static_cast<uint8_t>((sample + 32768) >> 8);
          buffer[index] = static_cast<uint16_t>(dacValue) << 8;
        }
        playbackLevelPercent_.store(
            static_cast<uint8_t>(constrain((peak * 100UL) / 32768UL, 0UL, 100UL)),
            std::memory_order_relaxed);
        for (size_t index = sampleCount; index < kBufferSamples; ++index) {
          buffer[index] = kDacSilenceSample;
        }
        playbackPosition_.store(
            playbackPosition_.load(std::memory_order_relaxed) +
                static_cast<uint32_t>(bytesRead),
            std::memory_order_relaxed);
      }

      size_t bytesWritten = 0;
      const esp_err_t result = i2s_write(kI2sPort, buffer, sizeof(buffer),
                                        &bytesWritten, kDmaWriteTimeout);
      if (result == ESP_OK && bytesWritten == sizeof(buffer)) {
        i2sFailureCount = 0;
        continue;
      }

      Serial.printf("[AUDIO] ERRO de escrita I2S/DMA: codigo=%d, bytes=%u.\n",
                    static_cast<int>(result),
                    static_cast<unsigned>(bytesWritten));

      // Tentativa de recuperação: reinicia o driver DMA até kMaxI2sRecoverAttempts
      i2sFailureCount++;
      if (i2sFailureCount <= kMaxI2sRecoverAttempts) {
        Serial.printf("[AUDIO] Tentando recuperar I2S/DMA (%d/%d)\n",
                      i2sFailureCount, kMaxI2sRecoverAttempts);
        endDma();
        delay(50);
        if (beginDma()) {
          i2s_set_clk(kI2sPort, playbackSampleRate,
                      I2S_BITS_PER_SAMPLE_16BIT, I2S_CHANNEL_MONO);
          Serial.println("[AUDIO] Recuperacao I2S/DMA bem sucedida.");
          continue;
        } else {
          Serial.println("[AUDIO] Falha ao reiniciar DMA.");
        }
      }

      // Se falha persistente, encerra a reprodução atual, mas mantém a tarefa ativa
      Serial.println("[AUDIO] Falha persistente I2S/DMA; parando a reproducao atual.");
      if (playbackFile) playbackFile.close();
      playbackActive_.store(false, std::memory_order_relaxed);
      stopPlaybackRequested_.store(false, std::memory_order_relaxed);
      playbackRequested_.store(false, std::memory_order_relaxed);
      playbackPosition_.store(0, std::memory_order_relaxed);
      playbackSize_.store(0, std::memory_order_relaxed);
      playbackLevelPercent_.store(0, std::memory_order_relaxed);
      i2sFailureCount = 0;
      endDma();
      dacWrite(board::kAudioOutput, 0);
      continue;
    }

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
        const int32_t toneAmplitude =
            (127 * volumePercent_.load(std::memory_order_relaxed) + 50) / 100;
        const int32_t centeredSignal = 128 + wave * toneAmplitude / 127;

        // O envelope multiplica também o centro DC: em repouso o DMA envia
        // zero, e durante a sirene chega suavemente à onda centrada em 128.
        dacValue = centeredSignal * envelope / kEnvelopeMaximum;
      } else {
        phaseAccumulator = 0;
        sweepSample = 0;
        dacValue = 128;
      }

      buffer[index] =
          static_cast<uint16_t>(constrain(dacValue, 0, 255)) << 8;
    }

    sirenAudible_.store(envelope > 0, std::memory_order_relaxed);
    size_t bytesWritten = 0;
    const esp_err_t result = i2s_write(kI2sPort, buffer, sizeof(buffer),
                                      &bytesWritten, kDmaWriteTimeout);
    if (result == ESP_OK && bytesWritten == sizeof(buffer)) continue;

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
