// "The Bloody Raven Rag" — an original honky-tonk piece composed for Solslinger and synthesised
// live with the Web Audio API. No samples or third-party recordings are used, so it carries no
// copyright encumbrance. Set NEXT_PUBLIC_LOBBY_MUSIC_URL to play a licensed audio file instead.

export interface MusicEngine {
  /** Fades the music in (or out) without stopping playback position. */
  setAudible: (audible: boolean) => void;
  destroy: () => void;
}

const BPM = 92;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const SWING = 0.62; // the off-beat eighth lands 62% through the beat
const MASTER_LEVEL = 0.32;
const FADE_SECONDS = 0.6;

type Chord = { bass: [number, number]; voicing: number[] };

const CHORDS: Record<string, Chord> = {
  Am: { bass: [45, 40], voicing: [60, 64, 69] },
  Dm: { bass: [50, 45], voicing: [62, 65, 69] },
  F: { bass: [41, 48], voicing: [60, 65, 69] },
  E7: { bass: [40, 47], voicing: [62, 64, 68] },
  C: { bass: [48, 43], voicing: [60, 64, 67] },
};

const PROGRESSION = ['Am', 'Am', 'Dm', 'Am', 'F', 'E7', 'Am', 'E7', 'Am', 'C', 'Dm', 'Dm', 'Am', 'E7', 'Am', 'Am'];

// Melody per bar: [eighth position 0–7, MIDI note, length in beats].
const MELODY: [number, number, number][][] = [
  [[0, 76, 1], [2, 72, 0.5], [3, 74, 0.5], [4, 76, 1.5], [7, 72, 0.5]],
  [[0, 69, 1], [2, 72, 0.5], [3, 71, 0.5], [4, 69, 2]],
  [[0, 74, 1], [2, 77, 0.5], [3, 76, 0.5], [4, 74, 1], [6, 72, 0.5], [7, 74, 0.5]],
  [[0, 76, 2], [4, 72, 1], [6, 69, 1]],
  [[0, 72, 1], [2, 77, 1], [4, 76, 0.5], [5, 77, 0.5], [6, 81, 1]],
  [[0, 80, 1.5], [3, 76, 0.5], [4, 74, 1], [6, 71, 1]],
  [[0, 72, 0.5], [1, 71, 0.5], [2, 69, 1], [4, 76, 1], [6, 72, 1]],
  [[0, 71, 1], [2, 74, 1], [4, 80, 2]],
  [[0, 81, 1], [2, 79, 0.5], [3, 76, 0.5], [4, 81, 1], [6, 84, 1]],
  [[0, 79, 1.5], [3, 76, 0.5], [4, 79, 1], [6, 76, 0.5], [7, 72, 0.5]],
  [[0, 74, 1], [2, 77, 1], [4, 81, 1], [6, 77, 1]],
  [[0, 76, 0.5], [1, 77, 0.5], [2, 74, 2], [6, 69, 1]],
  [[0, 72, 1], [2, 76, 1], [4, 81, 1.5], [7, 79, 0.5]],
  [[0, 80, 1], [2, 76, 1], [4, 74, 0.5], [5, 71, 0.5], [6, 68, 1]],
  [[0, 69, 1], [2, 72, 0.5], [3, 76, 0.5], [4, 81, 2]],
  [[0, 76, 1], [2, 72, 1], [4, 69, 2]],
];

const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const eighthOffset = (eighth: number) => Math.floor(eighth / 2) * BEAT + (eighth % 2 ? SWING * BEAT : 0);

function noiseBuffer(ctx: BaseAudioContext, seconds: number, brown = false) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

/** Small-room reverb: exponentially decaying stereo noise. */
function roomImpulse(ctx: BaseAudioContext, seconds = 2.2) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3.2;
  }
  return impulse;
}

function createMixer(ctx: AudioContext) {
  const master = ctx.createGain();
  master.gain.value = 0;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 3;
  master.connect(compressor).connect(ctx.destination);

  const bus = ctx.createGain();
  const warmth = ctx.createBiquadFilter();
  warmth.type = 'lowpass';
  warmth.frequency.value = 5200;
  warmth.Q.value = 0.4;
  const reverb = ctx.createConvolver();
  reverb.buffer = roomImpulse(ctx);
  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  const wet = ctx.createGain();
  wet.gain.value = 0.3;
  bus.connect(warmth);
  warmth.connect(dry).connect(master);
  warmth.connect(reverb).connect(wet).connect(master);

  const setAudible = (audible: boolean) => {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(audible ? MASTER_LEVEL : 0, now + FADE_SECONDS);
  };

  return { master, bus, setAudible };
}

/** Plays a licensed audio file through the same fade/mix chain. */
export function createFileMusic(ctx: AudioContext, src: string): MusicEngine {
  const audio = new Audio(src);
  audio.loop = true;
  audio.crossOrigin = 'anonymous';
  const { master, setAudible } = createMixer(ctx);
  ctx.createMediaElementSource(audio).connect(master);
  void audio.play().catch(() => undefined);
  setAudible(true);
  return {
    setAudible,
    destroy() {
      audio.pause();
      audio.src = '';
    },
  };
}

export function createSaloonMusic(ctx: AudioContext): MusicEngine {
  const { bus, master, setAudible } = createMixer(ctx);
  const hiss = noiseBuffer(ctx, 1);

  /** Honky-tonk piano: two slightly detuned voices, bright attack that darkens as it rings. */
  const piano = (time: number, midi: number, velocity: number, length: number) => {
    const freq = midiToHz(midi);
    const decay = Math.min(2.4, 0.5 + length * BEAT * 1.4) * (midi < 52 ? 1.3 : 1);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(velocity, time + 0.006);
    amp.gain.exponentialRampToValueAtTime(velocity * 0.35, time + 0.18);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(Math.min(9000, freq * 9), time);
    tone.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 2.2), time + decay);
    tone.connect(amp).connect(bus);
    for (const cents of [-9, 8]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(tone);
      osc.start(time);
      osc.stop(time + decay + 0.05);
    }
    // A touch of hammer noise on the attack.
    const hammer = ctx.createBufferSource();
    hammer.buffer = hiss;
    const hammerFilter = ctx.createBiquadFilter();
    hammerFilter.type = 'bandpass';
    hammerFilter.frequency.value = Math.min(6000, freq * 4);
    const hammerGain = ctx.createGain();
    hammerGain.gain.setValueAtTime(velocity * 0.12, time);
    hammerGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
    hammer.connect(hammerFilter).connect(hammerGain).connect(bus);
    hammer.start(time, Math.random() * 0.5, 0.04);
  };

  /** Brushed snare or shaker: filtered noise burst. */
  const brush = (time: number, level: number, frequency: number, length: number) => {
    const src = ctx.createBufferSource();
    src.buffer = hiss;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    src.connect(filter).connect(gain).connect(bus);
    src.start(time, Math.random() * 0.5, length + 0.02);
  };

  const scheduleBar = (bar: number, start: number) => {
    const index = bar % PROGRESSION.length;
    const loop = Math.floor(bar / PROGRESSION.length);
    // Final bar turns around to E7 so the loop resolves back to the top.
    const chord = CHORDS[index === PROGRESSION.length - 1 ? 'Am' : PROGRESSION[index]];
    const turnaround = index === PROGRESSION.length - 1 ? CHORDS.E7 : chord;

    // Stride left hand: bass on 1 and 3, chord stabs on 2 and 4.
    piano(start, chord.bass[0], 0.32, 1);
    piano(start + BEAT * 2, turnaround.bass[1], 0.26, 1);
    for (const [beat, voicing] of [
      [1, chord.voicing],
      [3, turnaround.voicing],
    ] as const) {
      voicing.forEach((note, i) => piano(start + BEAT * beat + i * 0.006, note, 0.11, 0.5));
    }

    // Melody: second pass drops an octave and plays softer for contrast.
    const shift = loop % 2 ? -12 : 0;
    for (const [eighth, note, length] of MELODY[index]) {
      const accent = eighth % 2 === 0 ? 1 : 0.8;
      piano(start + eighthOffset(eighth), note + shift, (shift ? 0.13 : 0.17) * accent, length);
    }

    // Brushes on 2 and 4, a soft shaker on the swung eighths.
    brush(start + BEAT, 0.05, 2400, 0.14);
    brush(start + BEAT * 3, 0.05, 2400, 0.14);
    for (let eighth = 0; eighth < 8; eighth++) brush(start + eighthOffset(eighth), eighth % 2 ? 0.012 : 0.02, 7000, 0.05);
  };

  // Saloon room tone: low crowd murmur and the odd glass clink.
  const murmur = ctx.createBufferSource();
  murmur.buffer = noiseBuffer(ctx, 4, true);
  murmur.loop = true;
  const murmurFilter = ctx.createBiquadFilter();
  murmurFilter.type = 'lowpass';
  murmurFilter.frequency.value = 420;
  const murmurGain = ctx.createGain();
  murmurGain.gain.value = 0.05;
  murmur.connect(murmurFilter).connect(murmurGain).connect(master);
  murmur.start();

  const clink = (time: number) => {
    const base = 2600 + Math.random() * 900;
    for (const [ratio, level] of [
      [1, 0.035],
      [2.7, 0.015],
    ]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = base * ratio;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(level, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.6);
      osc.connect(gain).connect(bus);
      osc.start(time);
      osc.stop(time + 0.65);
    }
  };

  // Look-ahead scheduler: queue each bar slightly before it is due.
  let bar = 0;
  let nextBarTime = ctx.currentTime + 0.15;
  let nextClink = ctx.currentTime + 5 + Math.random() * 6;
  const timer = window.setInterval(() => {
    while (nextBarTime < ctx.currentTime + 0.6) {
      scheduleBar(bar, nextBarTime);
      nextBarTime += BAR;
      bar += 1;
    }
    if (nextClink < ctx.currentTime + 0.6) {
      clink(nextClink);
      nextClink += 6 + Math.random() * 9;
    }
  }, 100);

  setAudible(true);

  return {
    setAudible,
    destroy() {
      window.clearInterval(timer);
      murmur.stop();
    },
  };
}
