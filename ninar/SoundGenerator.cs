using System;
using System.IO;

public class SoundGenerator {
    const int SAMPLE_RATE = 44100;
    const int CHANNELS = 2;
    const int DURATION_SEC = 300; // 5 minutes exactly

    static Random rand = new Random(42);
    static float[] leftBuffer;
    static float[] rightBuffer;
    static int totalSamples;

    public static void Main(string[] args) {
        string outputPath = args.Length > 0 ? args[0] : "FEFO_Chuva_Relaxante_5min.wav";
        Console.WriteLine("Iniciando sintese de audio: " + outputPath);
        Console.WriteLine("Duracao: " + DURATION_SEC + " segundos (5 minutos) a " + SAMPLE_RATE + "Hz Stereo 16-bit");

        totalSamples = SAMPLE_RATE * DURATION_SEC;
        leftBuffer = new float[totalSamples];
        rightBuffer = new float[totalSamples];

        // 1. GERADOR DE CHUVA (Ruído Rosa + Filtro Passa-Baixa + Modulação LFO + Gotas Suaves)
        Console.WriteLine("1/5 Gerando som de chuva suave e aconchegante...");
        float b0_L = 0, b1_L = 0, b2_L = 0, b3_L = 0, b4_L = 0, b5_L = 0, b6_L = 0;
        float b0_R = 0, b1_R = 0, b2_R = 0, b3_R = 0, b4_R = 0, b5_R = 0, b6_R = 0;
        float lpRainL = 0, lpRainR = 0;
        float lpCutoff = 0.075f; // ~1500 Hz cutoff para evitar agudos ríspidos

        for (int i = 0; i < totalSamples; i++) {
            double time = (double)i / SAMPLE_RATE;
            
            // Envelope geral de Fade-In (12s) e Fade-Out (20s)
            float masterEnvelope = 1.0f;
            if (time < 12.0) masterEnvelope = (float)(time / 12.0);
            else if (time > DURATION_SEC - 20.0) masterEnvelope = (float)((DURATION_SEC - time) / 20.0);
            if (masterEnvelope < 0) masterEnvelope = 0;

            // LFO lento para simular brisa suave na chuva (período ~18s)
            float rainLfo = 0.85f + 0.15f * (float)Math.Sin(2.0 * Math.PI * 0.055 * time);

            // Pink noise Left
            float whiteL = (float)(rand.NextDouble() * 2.0 - 1.0);
            b0_L = 0.99886f * b0_L + whiteL * 0.0555179f;
            b1_L = 0.99332f * b1_L + whiteL * 0.0750759f;
            b2_L = 0.96900f * b2_L + whiteL * 0.1538520f;
            b3_L = 0.86650f * b3_L + whiteL * 0.3104856f;
            b4_L = 0.55000f * b4_L + whiteL * 0.5329522f;
            b5_L = -0.7616f * b5_L - whiteL * 0.0168980f;
            float pinkL = (b0_L + b1_L + b2_L + b3_L + b4_L + b5_L + b6_L + whiteL * 0.5362f) * 0.045f;
            b6_L = whiteL * 0.115926f;

            // Pink noise Right
            float whiteR = (float)(rand.NextDouble() * 2.0 - 1.0);
            b0_R = 0.99886f * b0_R + whiteR * 0.0555179f;
            b1_R = 0.99332f * b1_R + whiteR * 0.0750759f;
            b2_R = 0.96900f * b2_R + whiteR * 0.1538520f;
            b3_R = 0.86650f * b3_R + whiteR * 0.3104856f;
            b4_R = 0.55000f * b4_R + whiteR * 0.5329522f;
            b5_R = -0.7616f * b5_R - whiteR * 0.0168980f;
            float pinkR = (b0_R + b1_R + b2_R + b3_R + b4_R + b5_R + b6_R + whiteR * 0.5362f) * 0.045f;
            b6_R = whiteR * 0.115926f;

            // Lowpass filtering
            lpRainL += lpCutoff * (pinkL - lpRainL);
            lpRainR += lpCutoff * (pinkR - lpRainR);

            float rainVolume = 0.16f * rainLfo * masterEnvelope;
            leftBuffer[i] += lpRainL * rainVolume;
            rightBuffer[i] += lpRainR * rainVolume;
        }

        // 2. GOTAS DE CHUVA INDIVIDUAIS
        Console.WriteLine("2/5 Sintetizando gotas delicadas de agua...");
        int numDrops = (int)(DURATION_SEC * 3.5);
        double[] pentatonicDropFreqs = new double[] { 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66 };
        for (int d = 0; d < numDrops; d++) {
            double dropTime = 2.0 + rand.NextDouble() * (DURATION_SEC - 8.0);
            int startSample = (int)(dropTime * SAMPLE_RATE);
            double dropFreq = pentatonicDropFreqs[rand.Next(pentatonicDropFreqs.Length)] * (0.98 + 0.04 * rand.NextDouble());
            float pan = (float)rand.NextDouble();
            float dropAmp = (float)(0.007 + 0.010 * rand.NextDouble());
            int dropLength = (int)(SAMPLE_RATE * (0.12 + 0.15 * rand.NextDouble()));

            for (int s = 0; s < dropLength && (startSample + s) < totalSamples; s++) {
                double t = (double)s / SAMPLE_RATE;
                float env = (float)(Math.Exp(-t * 28.0) * Math.Sin(Math.PI * (t / (dropLength / (double)SAMPLE_RATE))));
                if (env < 0) env = 0;

                double instFreq = dropFreq * (1.0 + 0.5 * Math.Exp(-t * 60.0));
                float sampleVal = (float)(Math.Sin(2.0 * Math.PI * instFreq * t) * env * dropAmp);

                float masterEnv = 1.0f;
                double curTime = dropTime + t;
                if (curTime < 10.0) masterEnv = (float)(curTime / 10.0);
                else if (curTime > DURATION_SEC - 15.0) masterEnv = (float)((DURATION_SEC - curTime) / 15.0);

                leftBuffer[startSample + s] += sampleVal * (1.0f - pan) * masterEnv;
                rightBuffer[startSample + s] += sampleVal * pan * masterEnv;
            }
        }

        // 3. ESTRUTURA HARMÔNICA E MUSICAL
        Console.WriteLine("3/5 Sintetizando arranjo musical: Pad aveludado, Piano Rhodes e Caixinha de Musica...");
        double bpm = 54.0;
        double beatDuration = 60.0 / bpm;
        double measureDuration = beatDuration * 4.0;

        int totalMeasures = (int)(DURATION_SEC / measureDuration) + 1;

        string[][] chordProgression = new string[][] {
            new string[] { "F2", "C3", "F3", "A3", "C4", "G4" },     // Fadd9 (M1)
            new string[] { "F2", "A3", "C4", "E4", "G4" },           // Fmaj9 (M2)
            new string[] { "Bb2", "F3", "Bb3", "D4", "F4", "A4" },   // Bbmaj7 (M3)
            new string[] { "Bb2", "D3", "F3", "A3", "C4" },          // Bbadd9 (M4)
            new string[] { "D3", "A3", "D4", "F4", "A4", "C5" },     // Dm7 (M5)
            new string[] { "D3", "F3", "A3", "D4", "F4" },           // Dm (M6)
            new string[] { "C3", "G3", "C4", "E4", "G4", "D5" },     // Cadd9 (M7)
            new string[] { "C3", "F3", "G3", "C4", "D4", "E4" }      // Csus4/C (M8)
        };

        for (int m = 0; m < totalMeasures; m++) {
            double mTime = m * measureDuration;
            if (mTime > DURATION_SEC - 10.0) break;

            int chordIdx = m % chordProgression.Length;
            string[] curChord = chordProgression[chordIdx];

            // Renderiza Pad Harmônico
            RenderPadChord(mTime, measureDuration * 1.15, curChord, 0.85f);

            // Arpejo de Piano Suave no fundo
            if (mTime >= 8.0 && mTime < DURATION_SEC - 20.0) {
                RenderPianoNote(mTime + beatDuration * 0, 4.0, curChord[0], 0.75f, 0.4f);
                RenderPianoNote(mTime + beatDuration * 1, 3.0, curChord[1], 0.55f, 0.45f);
                RenderPianoNote(mTime + beatDuration * 2, 3.0, curChord[2], 0.60f, 0.55f);
                RenderPianoNote(mTime + beatDuration * 3, 3.0, curChord[3 % curChord.Length], 0.50f, 0.6f);
                if (curChord.Length > 4) {
                    RenderPianoNote(mTime + beatDuration * 3.5, 2.5, curChord[4], 0.45f, 0.65f);
                }
            }

            // Melodia da Caixinha de Música / Celesta
            if (mTime >= 12.0 && mTime < DURATION_SEC - 25.0) {
                int section = (m / 8) % 4;
                switch (section) {
                    case 0:
                        if (chordIdx == 0) {
                            RenderLullabyBell(mTime + beatDuration * 0, "A4", 0.75f, 0.35f);
                            RenderLullabyBell(mTime + beatDuration * 1, "C5", 0.80f, 0.45f);
                            RenderLullabyBell(mTime + beatDuration * 2, "G4", 0.70f, 0.60f);
                        } else if (chordIdx == 1) {
                            RenderLullabyBell(mTime + beatDuration * 0, "F4", 0.75f, 0.40f);
                            RenderLullabyBell(mTime + beatDuration * 2, "A4", 0.70f, 0.55f);
                        } else if (chordIdx == 2) {
                            RenderLullabyBell(mTime + beatDuration * 0, "D5", 0.85f, 0.65f);
                            RenderLullabyBell(mTime + beatDuration * 1.5, "C5", 0.75f, 0.50f);
                            RenderLullabyBell(mTime + beatDuration * 3, "A4", 0.70f, 0.40f);
                        } else if (chordIdx == 3) {
                            RenderLullabyBell(mTime + beatDuration * 0, "F4", 0.80f, 0.50f);
                            RenderLullabyBell(mTime + beatDuration * 2, "G4", 0.75f, 0.55f);
                        } else if (chordIdx == 4) {
                            RenderLullabyBell(mTime + beatDuration * 0, "F5", 0.85f, 0.60f);
                            RenderLullabyBell(mTime + beatDuration * 1, "E5", 0.70f, 0.55f);
                            RenderLullabyBell(mTime + beatDuration * 2, "D5", 0.80f, 0.45f);
                        } else if (chordIdx == 5) {
                            RenderLullabyBell(mTime + beatDuration * 0, "A4", 0.75f, 0.40f);
                            RenderLullabyBell(mTime + beatDuration * 2, "F4", 0.70f, 0.50f);
                        } else if (chordIdx == 6) {
                            RenderLullabyBell(mTime + beatDuration * 0, "G4", 0.80f, 0.55f);
                            RenderLullabyBell(mTime + beatDuration * 1.5, "A4", 0.70f, 0.50f);
                            RenderLullabyBell(mTime + beatDuration * 3, "G4", 0.65f, 0.45f);
                        } else if (chordIdx == 7) {
                            RenderLullabyBell(mTime + beatDuration * 0, "F4", 0.75f, 0.50f);
                        }
                        break;

                    case 1:
                        if (chordIdx == 0) {
                            RenderLullabyBell(mTime + beatDuration * 0, "C5", 0.80f, 0.60f);
                            RenderLullabyBell(mTime + beatDuration * 1, "D5", 0.75f, 0.50f);
                            RenderLullabyBell(mTime + beatDuration * 2, "C5", 0.70f, 0.40f);
                            RenderLullabyBell(mTime + beatDuration * 3, "A4", 0.65f, 0.45f);
                        } else if (chordIdx == 2) {
                            RenderLullabyBell(mTime + beatDuration * 0, "F5", 0.85f, 0.65f);
                            RenderLullabyBell(mTime + beatDuration * 2, "D5", 0.75f, 0.45f);
                        } else if (chordIdx == 4) {
                            RenderLullabyBell(mTime + beatDuration * 0, "A5", 0.75f, 0.70f);
                            RenderLullabyBell(mTime + beatDuration * 1, "G5", 0.70f, 0.60f);
                            RenderLullabyBell(mTime + beatDuration * 2, "F5", 0.75f, 0.50f);
                        } else if (chordIdx == 6) {
                            RenderLullabyBell(mTime + beatDuration * 0, "E5", 0.75f, 0.45f);
                            RenderLullabyBell(mTime + beatDuration * 2, "C5", 0.70f, 0.50f);
                            RenderLullabyBell(mTime + beatDuration * 3, "D5", 0.65f, 0.55f);
                        }
                        break;

                    case 2:
                        if (chordIdx == 0) {
                            RenderLullabyBell(mTime + beatDuration * 0, "F4", 0.65f, 0.45f);
                            RenderLullabyBell(mTime + beatDuration * 2, "A4", 0.65f, 0.55f);
                        } else if (chordIdx == 2) {
                            RenderLullabyBell(mTime + beatDuration * 0, "Bb4", 0.70f, 0.60f);
                            RenderLullabyBell(mTime + beatDuration * 2, "D5", 0.65f, 0.40f);
                        } else if (chordIdx == 4) {
                            RenderLullabyBell(mTime + beatDuration * 0, "F4", 0.65f, 0.50f);
                            RenderLullabyBell(mTime + beatDuration * 2, "A4", 0.60f, 0.55f);
                        } else if (chordIdx == 6) {
                            RenderLullabyBell(mTime + beatDuration * 0, "G4", 0.65f, 0.45f);
                            RenderLullabyBell(mTime + beatDuration * 2, "F4", 0.60f, 0.50f);
                        }
                        break;

                    case 3:
                        if (chordIdx == 0) {
                            RenderLullabyBell(mTime + beatDuration * 0, "A4", 0.65f, 0.40f);
                            RenderLullabyBell(mTime + beatDuration * 2, "C5", 0.60f, 0.50f);
                        } else if (chordIdx == 2) {
                            RenderLullabyBell(mTime + beatDuration * 0, "D5", 0.65f, 0.55f);
                        } else if (chordIdx == 4) {
                            RenderLullabyBell(mTime + beatDuration * 0, "F4", 0.60f, 0.45f);
                            RenderLullabyBell(mTime + beatDuration * 2, "D4", 0.55f, 0.50f);
                        } else if (chordIdx == 6) {
                            RenderLullabyBell(mTime + beatDuration * 0, "C4", 0.60f, 0.50f);
                        }
                        break;
                }
            }

            if (m % 9 == 4 && mTime >= 20.0 && mTime < DURATION_SEC - 40.0) {
                RenderWindChime(mTime + beatDuration * 1.5, new string[] { "C6", "A5", "F5", "D5", "C5" });
            }
        }

        // 4. ESPACIALIZAÇÃO E REVERB SUAVE
        Console.WriteLine("4/5 Aplicando Reverb estereo e masterizacao aveludada...");
        int delaySamples1 = (int)(SAMPLE_RATE * 0.085);
        int delaySamples2 = (int)(SAMPLE_RATE * 0.145);
        int delaySamples3 = (int)(SAMPLE_RATE * 0.220);
        float[] revBufferL = new float[totalSamples];
        float[] revBufferR = new float[totalSamples];

        for (int i = 0; i < totalSamples; i++) {
            if (i >= delaySamples1) {
                revBufferL[i] += leftBuffer[i - delaySamples1] * 0.25f;
                revBufferR[i] += rightBuffer[i - delaySamples1] * 0.25f;
            }
            if (i >= delaySamples2) {
                revBufferL[i] += rightBuffer[i - delaySamples2] * 0.18f;
                revBufferR[i] += leftBuffer[i - delaySamples2] * 0.18f;
            }
            if (i >= delaySamples3) {
                revBufferL[i] += leftBuffer[i - delaySamples3] * 0.12f;
                revBufferR[i] += rightBuffer[i - delaySamples3] * 0.12f;
            }
        }

        for (int i = 0; i < totalSamples; i++) {
            leftBuffer[i] = leftBuffer[i] + revBufferL[i];
            rightBuffer[i] = rightBuffer[i] + revBufferR[i];
        }

        // 5. GRAVAÇÃO DO ARQUIVO WAV 16-BIT STEREO
        Console.WriteLine("5/5 Gravando arquivo WAV...");
        float maxPeak = 0;
        for (int i = 0; i < totalSamples; i++) {
            if (Math.Abs(leftBuffer[i]) > maxPeak) maxPeak = Math.Abs(leftBuffer[i]);
            if (Math.Abs(rightBuffer[i]) > maxPeak) maxPeak = Math.Abs(rightBuffer[i]);
        }

        float targetPeak = 0.68f;
        float normFactor = maxPeak > 0.001f ? (targetPeak / maxPeak) : 1.0f;
        Console.WriteLine(string.Format("Pico original: {0:F3} | Normalizacao: {1:F3}", maxPeak, normFactor));

        using (FileStream fs = new FileStream(outputPath, FileMode.Create))
        using (BinaryWriter bw = new BinaryWriter(fs)) {
            int byteRate = SAMPLE_RATE * CHANNELS * 2;
            int blockAlign = CHANNELS * 2;
            int dataChunkSize = totalSamples * CHANNELS * 2;

            bw.Write(new char[] { 'R', 'I', 'F', 'F' });
            bw.Write(36 + dataChunkSize);
            bw.Write(new char[] { 'W', 'A', 'V', 'E' });

            bw.Write(new char[] { 'f', 'm', 't', ' ' });
            bw.Write(16);
            bw.Write((short)1);
            bw.Write((short)CHANNELS);
            bw.Write(SAMPLE_RATE);
            bw.Write(byteRate);
            bw.Write((short)blockAlign);
            bw.Write((short)16);

            bw.Write(new char[] { 'd', 'a', 't', 'a' });
            bw.Write(dataChunkSize);

            for (int i = 0; i < totalSamples; i++) {
                float sampleL = leftBuffer[i] * normFactor;
                float sampleR = rightBuffer[i] * normFactor;

                sampleL = (float)Math.Tanh(sampleL);
                sampleR = (float)Math.Tanh(sampleR);

                short pcmL = (short)Math.Max(-32767, Math.Min(32767, (int)(sampleL * 32767f)));
                short pcmR = (short)Math.Max(-32767, Math.Min(32767, (int)(sampleR * 32767f)));

                bw.Write(pcmL);
                bw.Write(pcmR);
            }
        }

        FileInfo fi = new FileInfo(outputPath);
        Console.WriteLine("Sucesso! Arquivo gerado: " + outputPath + " (" + (fi.Length / (1024 * 1024.0)).ToString("F2") + " MB)");
    }

    static double NoteToFreq(string note) {
        switch(note) {
            case "F2": return 87.31;
            case "G2": return 98.00;
            case "A2": return 110.00;
            case "Bb2": return 116.54;
            case "C3": return 130.81;
            case "D3": return 146.83;
            case "E3": return 164.81;
            case "F3": return 174.61;
            case "G3": return 196.00;
            case "A3": return 220.00;
            case "Bb3": return 233.08;
            case "C4": return 261.63;
            case "D4": return 293.66;
            case "E4": return 329.63;
            case "F4": return 349.23;
            case "G4": return 392.00;
            case "A4": return 440.00;
            case "Bb4": return 466.16;
            case "C5": return 523.25;
            case "D5": return 587.33;
            case "E5": return 659.25;
            case "F5": return 698.46;
            case "G5": return 783.99;
            case "A5": return 880.00;
            case "Bb5": return 932.33;
            case "C6": return 1046.50;
            case "D6": return 1174.66;
            default: return 440.0;
        }
    }

    static void RenderPadChord(double startTime, double duration, string[] chordNotes, float chordGain) {
        int startSample = (int)(startTime * SAMPLE_RATE);
        int lenSamples = (int)(duration * SAMPLE_RATE);
        for (int s = 0; s < lenSamples && (startSample + s) < totalSamples; s++) {
            double t = (double)s / SAMPLE_RATE;
            double absTime = startTime + t;
            
            float env = 1.0f;
            float attack = 1.8f;
            float release = 2.2f;
            if (t < attack) env = (float)(t / attack);
            else if (t > duration - release) env = (float)((duration - t) / release);
            if (env < 0) env = 0;
            env = (float)(0.5 * (1.0 - Math.Cos(Math.PI * env)));

            float masterEnv = 1.0f;
            if (absTime < 10.0) masterEnv = (float)(absTime / 10.0);
            else if (absTime > DURATION_SEC - 18.0) masterEnv = (float)((DURATION_SEC - absTime) / 18.0);
            if (masterEnv < 0) masterEnv = 0;

            float sampleSumL = 0;
            float sampleSumR = 0;

            for (int n = 0; n < chordNotes.Length; n++) {
                double freq = NoteToFreq(chordNotes[n]);
                double osc1 = Math.Sin(2.0 * Math.PI * freq * t + n * 0.3);
                double osc2 = Math.Sin(2.0 * Math.PI * (freq * 1.0015) * t + 0.5);
                double oscWarmOctave = 0.35 * Math.Sin(2.0 * Math.PI * (freq * 0.5) * t);
                double oscSubtleOvertone = 0.15 * Math.Sin(2.0 * Math.PI * (freq * 2.0) * t);

                float voice = (float)(osc1 * 0.5 + osc2 * 0.3 + oscWarmOctave + oscSubtleOvertone);
                
                float p = 0.35f + 0.3f * ((float)n / Math.Max(1, chordNotes.Length - 1));
                sampleSumL += voice * (1.0f - p);
                sampleSumR += voice * p;
            }

            leftBuffer[startSample + s] += sampleSumL * chordGain * env * masterEnv * 0.12f;
            rightBuffer[startSample + s] += sampleSumR * chordGain * env * masterEnv * 0.12f;
        }
    }

    static void RenderPianoNote(double startTime, double duration, string note, float velocity, float pan) {
        int startSample = (int)(startTime * SAMPLE_RATE);
        int lenSamples = (int)(duration * SAMPLE_RATE);
        double freq = NoteToFreq(note);

        for (int s = 0; s < lenSamples && (startSample + s) < totalSamples; s++) {
            double t = (double)s / SAMPLE_RATE;
            double absTime = startTime + t;

            float attack = 0.025f;
            float env = 0;
            if (t < attack) env = (float)(t / attack);
            else env = (float)Math.Exp(-(t - attack) * 1.35);

            float masterEnv = 1.0f;
            if (absTime < 8.0) masterEnv = (float)(absTime / 8.0);
            else if (absTime > DURATION_SEC - 15.0) masterEnv = (float)((DURATION_SEC - absTime) / 15.0);
            if (masterEnv < 0) masterEnv = 0;

            double fundamental = Math.Sin(2.0 * Math.PI * freq * t);
            double harm2 = 0.28 * Math.Sin(2.0 * Math.PI * freq * 2.0 * t) * Math.Exp(-t * 2.5);
            double harm3 = 0.08 * Math.Sin(2.0 * Math.PI * freq * 3.0 * t) * Math.Exp(-t * 4.0);
            double body = 0.18 * Math.Sin(2.0 * Math.PI * (freq * 0.5) * t) * Math.Exp(-t * 1.8);

            float val = (float)((fundamental + harm2 + harm3 + body) * env * velocity * masterEnv * 0.15f);

            leftBuffer[startSample + s] += val * (1.0f - pan);
            rightBuffer[startSample + s] += val * pan;
        }
    }

    static void RenderLullabyBell(double startTime, string note, float velocity, float pan) {
        double duration = 3.2;
        int startSample = (int)(startTime * SAMPLE_RATE);
        int lenSamples = (int)(duration * SAMPLE_RATE);
        double freq = NoteToFreq(note);

        for (int s = 0; s < lenSamples && (startSample + s) < totalSamples; s++) {
            double t = (double)s / SAMPLE_RATE;
            double absTime = startTime + t;

            float attack = 0.008f;
            float env = 0;
            if (t < attack) env = (float)(t / attack);
            else env = (float)Math.Exp(-(t - attack) * 1.8);

            float masterEnv = 1.0f;
            if (absTime < 8.0) masterEnv = (float)(absTime / 8.0);
            else if (absTime > DURATION_SEC - 15.0) masterEnv = (float)((DURATION_SEC - absTime) / 15.0);
            if (masterEnv < 0) masterEnv = 0;

            double bell1 = Math.Sin(2.0 * Math.PI * freq * t);
            double bell2 = 0.35 * Math.Sin(2.0 * Math.PI * freq * 2.76 * t) * Math.Exp(-t * 3.5);
            double bell3 = 0.12 * Math.Sin(2.0 * Math.PI * freq * 5.4 * t) * Math.Exp(-t * 6.0);

            float val = (float)((bell1 + bell2 + bell3) * env * velocity * masterEnv * 0.13f);

            leftBuffer[startSample + s] += val * (1.0f - pan);
            rightBuffer[startSample + s] += val * pan;
        }
    }

    static void RenderWindChime(double startTime, string[] notes) {
        for (int k = 0; k < notes.Length; k++) {
            double chimeTime = startTime + k * (0.18 + 0.08 * rand.NextDouble());
            float p = (float)(0.2 + 0.6 * rand.NextDouble());
            float vel = (float)(0.5 + 0.3 * rand.NextDouble());
            RenderLullabyBell(chimeTime, notes[k], vel * 0.7f, p);
        }
    }
}
