// js/minigames/tbop/tbop-audio.js

export class TbopAudio {
  constructor(mainBgm = null) {
    this.mainBgm = mainBgm;
    this.wasMainBgmPlaying = false;
    this.maxVolume = 0.35;

    this.bgMusic = new Audio('./assets/audio/tbop/musica_tbop.mp3');
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0;

    this.enabled = true;
    this.ctx = null;
    this.synthTimer = null;
    this.synthStep = 0;
    this.usingSynth = false;
  }

  initSynthCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  start(isGameRunningCheck = () => true) {
    if (this.mainBgm && this.mainBgm.isPlaying) {
      this.wasMainBgmPlaying = true;
      this.mainBgm.togglePlay();
      const btnBgmToggle = document.getElementById('btn-bgm-toggle');
      if (btnBgmToggle) {
        btnBgmToggle.textContent = '[ ▶ BGM: PAUSADO POR JUEGO ]';
      }
    }

    this.bgMusic.currentTime = 0;
    this.bgMusic.play().then(() => {
      this.usingSynth = false;
      this.fadeVolume(this.bgMusic, 0, this.maxVolume, 1200);
    }).catch(() => {
      this.startSynth(isGameRunningCheck);
    });
  }

  startSynth(isGameRunningCheck = () => true) {
    this.initSynthCtx();
    if (this.synthTimer) clearInterval(this.synthTimer);
    this.usingSynth = true;
    const notes = [220, 0, 261.63, 293.66, 329.63, 0, 293.66, 261.63, 246.94, 0, 196.00, 246.94, 220, 0, 164.81, 196.00];
    this.synthTimer = setInterval(() => {
      if (!this.enabled || !isGameRunningCheck() || !this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const f = notes[this.synthStep % notes.length];
      this.synthStep++;
      if (f > 0) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    }, 210);
  }

  stopAndRestore() {
    this.fadeVolume(this.bgMusic, this.bgMusic.volume, 0, 800, () => {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
    });

    if (this.synthTimer) {
      clearInterval(this.synthTimer);
      this.synthTimer = null;
    }

    if (this.mainBgm && this.wasMainBgmPlaying && !this.mainBgm.isPlaying) {
      this.mainBgm.togglePlay();
      this.wasMainBgmPlaying = false;
    }
  }

  toggleMute() {
    this.enabled = !this.enabled;
    this.bgMusic.muted = !this.enabled;
    return this.enabled;
  }

  fadeVolume(audioEl, startVol, endVol, duration, onComplete) {
    const steps = 20;
    const stepTime = duration / steps;
    const volStep = (endVol - startVol) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const newVol = startVol + volStep * currentStep;
      audioEl.volume = Math.max(0, Math.min(1, newVol));

      if (currentStep >= steps) {
        clearInterval(interval);
        audioEl.volume = Math.max(0, Math.min(1, endVol));
        if (onComplete) onComplete();
      }
    }, stepTime);
  }

  play(type) {
    if (!this.enabled) return;
    try {
      this.initSynthCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.07);
        gain.gain.setValueAtTime(0.09, now);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'splat') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.09);
        gain.gain.setValueAtTime(0.14, now);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'hurt') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(65, now + 0.22);
        gain.gain.setValueAtTime(0.2, now);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'door') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(450, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'powerup') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(587, now + 0.08);
        osc.frequency.setValueAtTime(880, now + 0.16);
        gain.gain.setValueAtTime(0.18, now);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'slap') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.28);
        gain.gain.setValueAtTime(0.28, now);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'dash') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (e) {}
  }
}
