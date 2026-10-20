import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchDetector } from 'pitchy';
import { freqToMidi } from './music';

export type DetectedNote = {
  midi: number;
  cents: number;
  frequency: number;
};

export type DetectorStatus = 'idle' | 'starting' | 'listening' | 'error';

export type DetectorDebug = {
  contextState: string;
  sampleRate: number;
  inputLabel: string;
  rms: number;
  rawFrequency: number;
  clarity: number;
};

// 4096 samples (~93ms at 44.1kHz) is enough to read low E (82Hz) reliably.
const BUFFER_SIZE = 4096;
const MIN_CLARITY = 0.85;
const MIN_FREQ = 70;
const MAX_FREQ = 1400;
// With auto gain off, a laptop mic picking up a guitar can sit well under 0.01.
const MIN_RMS = 0.002;
// A new note has to hold for this many frames before it replaces the current one.
const STABLE_FRAMES = 3;
// Median over recent readings smooths out one-off octave errors.
const HISTORY_SIZE = 5;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function useNoteDetector() {
  const [status, setStatus] = useState<DetectorStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<DetectedNote | null>(null);
  const [debug, setDebug] = useState<DetectorDebug | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');

  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    contextRef.current?.close();
    streamRef.current = null;
    contextRef.current = null;
    setDebug(null);
    setStatus('idle');
  }, []);

  const start = useCallback(
    async (inputId: string = deviceId) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser can’t access the microphone. Use a recent browser over https or localhost.');
        setStatus('error');
        return;
      }

      stop();
      setStatus('starting');
      setError(null);

      // Create the context inside the click, before any await, or Chrome/Safari may leave it suspended.
      const context = new AudioContext();
      contextRef.current = context;

      try {
        // Browser voice processing mangles instrument audio, so turn it all off.
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: inputId ? { exact: inputId } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        streamRef.current = stream;
        await context.resume();

        // Device labels are only filled in once permission is granted.
        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices(all.filter((d) => d.kind === 'audioinput'));
        const track = stream.getAudioTracks()[0];
        const activeId = track.getSettings().deviceId ?? '';
        setDeviceId(activeId);

        const analyser = context.createAnalyser();
        analyser.fftSize = BUFFER_SIZE;
        context.createMediaStreamSource(stream).connect(analyser);

        const detector = PitchDetector.forFloat32Array(analyser.fftSize);
        const buffer = new Float32Array(analyser.fftSize);
        const history: number[] = [];
        let candidate = -1;
        let candidateFrames = 0;

        const tick = () => {
          analyser.getFloatTimeDomainData(buffer);

          let sum = 0;
          for (const sample of buffer) sum += sample * sample;
          const rms = Math.sqrt(sum / buffer.length);
          const [frequency, clarity] = detector.findPitch(buffer, context.sampleRate);

          setDebug({
            contextState: context.state,
            sampleRate: context.sampleRate,
            inputLabel: track.label,
            rms,
            rawFrequency: frequency,
            clarity,
          });

          if (rms < MIN_RMS) {
            history.length = 0;
            candidate = -1;
            candidateFrames = 0;
          } else if (clarity >= MIN_CLARITY && frequency >= MIN_FREQ && frequency <= MAX_FREQ) {
            const exact = freqToMidi(frequency);
            history.push(Math.round(exact));
            if (history.length > HISTORY_SIZE) history.shift();

            const midi = median(history);
            candidateFrames = midi === candidate ? candidateFrames + 1 : 1;
            candidate = midi;

            // Only publish frames that agree with the smoothed note, so cents stay meaningful.
            if (candidateFrames >= STABLE_FRAMES && Math.round(exact) === midi) {
              setNote({ midi, cents: Math.round((exact - midi) * 100), frequency });
            }
          }

          frameRef.current = requestAnimationFrame(tick);
        };

        setStatus('listening');
        tick();
      } catch (err) {
        context.close();
        contextRef.current = null;
        const denied = err instanceof DOMException && err.name === 'NotAllowedError';
        setError(denied ? 'Microphone access was blocked. Allow it in your browser settings and try again.' : String(err));
        setStatus('error');
      }
    },
    [deviceId, stop],
  );

  useEffect(() => stop, [stop]);

  return { status, error, note, debug, devices, deviceId, start, stop };
}
