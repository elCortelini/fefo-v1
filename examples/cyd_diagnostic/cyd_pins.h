#pragma once

#include <Arduino.h>

namespace cyd {

// LCD ILI9341 (barramento HSPI)
constexpr int kTftMiso = 12;
constexpr int kTftMosi = 13;
constexpr int kTftClock = 14;
constexpr int kTftCs = 15;
constexpr int kTftDc = 2;
constexpr int kTftReset = -1;
constexpr int kBacklight = 21;

// Touch XPT2046 (barramento VSPI dedicado por GPIO matrix)
constexpr int kTouchMosi = 32;
constexpr int kTouchMiso = 39;
constexpr int kTouchClock = 25;
constexpr int kTouchCs = 33;
constexpr int kTouchIrq = 36;

// Leitor microSD
constexpr int kSdMiso = 19;
constexpr int kSdMosi = 23;
constexpr int kSdClock = 18;
constexpr int kSdCs = 5;

constexpr int kLightSensor = 34;
constexpr int kSpeaker = 26;
constexpr int kLedRed = 4;
constexpr int kLedGreen = 16;
constexpr int kLedBlue = 17;

}  // namespace cyd
