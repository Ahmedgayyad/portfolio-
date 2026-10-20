// UI sound: a crisp click when something clickable is pressed. It is synthesized on the spot
// (a few ms of filtered noise over a very short sine), so nothing is downloaded and the sound
// starts on the same frame as the press.
(() => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const TARGETS = 'a[href], button:not([disabled]), .craft-card';

  const PRESS = { level: 0.42, noiseMs: 22, decayMs: 2.2, band: 4800, q: 1.4, noiseGain: 0.18, noiseEnd: 0.028, tone: 1900, toneGain: 0.045, toneEnd: 0.025 };

  let ctx = null;
  let primed = false;

  const audio = () => {
    if (!ctx) {
      try { ctx = new AudioCtx({ latencyHint: 'interactive' }); } catch (_) { ctx = null; }
    }
    return ctx;
  };

  // Browsers keep audio off until the first press or key: wake it then with a silent sample
  function unlock() {
    const c = audio();
    if (!c) return;
    if (!primed) {
      primed = true;
      const blank = c.createBufferSource();
      blank.buffer = c.createBuffer(1, 1, 22050);
      blank.connect(c.destination);
      blank.start(0);
    }
    if (c.state === 'suspended') c.resume().catch(() => {});
  }

  function tick(c, s) {
    const t = c.currentTime;
    const out = c.createGain();
    out.gain.value = s.level;
    out.connect(c.destination);

    // the "click": white noise that dies away within a couple of milliseconds
    const frames = Math.floor(c.sampleRate * s.noiseMs / 1000);
    const buffer = c.createBuffer(1, frames, c.sampleRate);
    const data = buffer.getChannelData(0);
    const tau = c.sampleRate * s.decayMs / 1000;
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / tau);
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = s.band;
    band.Q.value = s.q;
    const noiseLevel = c.createGain();
    noiseLevel.gain.setValueAtTime(s.noiseGain, t);
    noiseLevel.gain.exponentialRampToValueAtTime(0.0001, t + s.noiseEnd);
    noise.connect(band).connect(noiseLevel).connect(out);
    noise.start(t);
    noise.stop(t + s.noiseEnd + 0.002);

    // the "tone": a sine ping just long enough to give the click a pitch
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = s.tone;
    const toneLevel = c.createGain();
    toneLevel.gain.setValueAtTime(0.0001, t);
    toneLevel.gain.exponentialRampToValueAtTime(s.toneGain, t + 0.001);
    toneLevel.gain.exponentialRampToValueAtTime(0.0001, t + s.toneEnd);
    osc.connect(toneLevel).connect(out);
    osc.start(t);
    osc.stop(t + s.toneEnd + 0.004);
    osc.addEventListener('ended', () => out.disconnect(), { once: true });
  }

  function playPress() {
    const c = audio();
    if (!c) return;
    if (c.state === 'running') tick(c, PRESS);
    else c.resume().then(() => { if (c.state === 'running') tick(c, PRESS); }).catch(() => {});
  }

  const clickable = (el) => (el instanceof Element ? el.closest(TARGETS) : null);

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !clickable(e.target)) return;
    playPress();
    // a tap you can feel; phones refuse vibration until the page has had a full tap, so wait for one
    if (e.pointerType === 'touch' && navigator.vibrate && navigator.userActivation?.hasBeenActive) navigator.vibrate(8);
  });

  // Keyboard (Enter / Space) fires a click with detail 0
  document.addEventListener('click', (e) => {
    if (e.detail === 0 && clickable(e.target)) playPress();
  });

  // Wake the audio on the first interaction of any kind (touch needs the release to count)
  ['pointerdown', 'pointerup', 'keydown', 'touchend'].forEach(type =>
    window.addEventListener(type, unlock, { capture: true, passive: true }));
})();
