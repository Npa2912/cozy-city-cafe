let audio;
export function sound(kind) {
  try {
    audio ??= new AudioContext();
    audio.resume();
    const o = audio.createOscillator(),
      gain = audio.createGain();
    o.connect(gain);
    gain.connect(audio.destination);
    o.type = kind === "machine" ? "triangle" : "sine";
    o.frequency.value = kind === "machine" ? 85 : kind === "pay" ? 880 : 520;
    const duration = kind === "machine" ? 3 : 0.18,
      t = audio.currentTime;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.025, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.onended = () => {
      o.disconnect();
      gain.disconnect();
    };
    o.start(t);
    o.stop(t + duration + 0.03);
  } catch {}
}
