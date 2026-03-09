// Web Audio API sound generator — no audio files needed
// AudioContext is created lazily on first use (browser autoplay policy)

let ctx: AudioContext | null = null;
let muted = false;

if (typeof window !== 'undefined') {
  muted = localStorage.getItem('sound_muted') === 'true';
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
  startDelay = 0,
): void {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, c.currentTime + startDelay);
  gain.gain.setValueAtTime(0, c.currentTime + startDelay);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + startDelay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + duration);
  osc.start(c.currentTime + startDelay);
  osc.stop(c.currentTime + startDelay + duration + 0.05);
}

export function toggleMute(): boolean {
  muted = !muted;
  if (typeof window !== 'undefined') {
    localStorage.setItem('sound_muted', String(muted));
  }
  return muted;
}

export function isMuted(): boolean {
  return muted;
}

export function playSound(
  name:
    | 'correctGuess'
    | 'allGuessed'
    | 'drawingStart'
    | 'tick'
    | 'tickCritical'
    | 'timeout'
    | 'gameEnd'
    | 'chatPing',
): void {
  if (muted) return;

  switch (name) {
    case 'correctGuess':
      // Ascending happy ding: C5 → E5 → G5
      playTone(523, 0.12, 'sine', 0.25, 0);
      playTone(659, 0.12, 'sine', 0.25, 0.1);
      playTone(784, 0.2, 'sine', 0.3, 0.2);
      break;

    case 'allGuessed':
      // Short fanfare: C5 → E5 → G5 → C6
      playTone(523, 0.1, 'sine', 0.25, 0);
      playTone(659, 0.1, 'sine', 0.25, 0.1);
      playTone(784, 0.1, 'sine', 0.25, 0.2);
      playTone(1047, 0.3, 'sine', 0.35, 0.3);
      break;

    case 'drawingStart':
      // Soft ready beep: two quick ascending tones
      playTone(440, 0.1, 'sine', 0.2, 0);
      playTone(880, 0.15, 'sine', 0.25, 0.12);
      break;

    case 'tick':
      // Soft metronome tick
      playTone(800, 0.06, 'square', 0.1, 0);
      break;

    case 'tickCritical':
      // Sharper urgent tick
      playTone(1000, 0.08, 'square', 0.18, 0);
      break;

    case 'timeout':
      // Descending buzzer: G4 → D4 → G3
      playTone(392, 0.15, 'sawtooth', 0.2, 0);
      playTone(294, 0.15, 'sawtooth', 0.2, 0.15);
      playTone(196, 0.3, 'sawtooth', 0.2, 0.3);
      break;

    case 'gameEnd':
      // Victory: C5 E5 G5 C6 (arpeggiated)
      playTone(523, 0.15, 'sine', 0.25, 0);
      playTone(659, 0.15, 'sine', 0.25, 0.15);
      playTone(784, 0.15, 'sine', 0.25, 0.3);
      playTone(1047, 0.4, 'sine', 0.35, 0.45);
      break;

    case 'chatPing':
      // Subtle soft ping
      playTone(880, 0.08, 'sine', 0.1, 0);
      break;
  }
}
