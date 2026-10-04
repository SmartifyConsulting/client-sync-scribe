const KEY = "holarc:chime-muted";

export const isChimeMuted = () => {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};
export const setChimeMuted = (m: boolean) => {
  try { localStorage.setItem(KEY, m ? "1" : "0"); } catch { /* ignore */ }
};

let ctx: AudioContext | null = null;

/** Short, soft two-note chime played when the live step moves on. */
export function playChime() {
  if (isChimeMuted()) return;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    ctx = ctx ?? new AC();
    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch { /* audio unavailable */ }
}
