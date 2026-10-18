// js/minigames/papahero/papahero-audio.js

export class PapaheroAudio {
  constructor(mainBgm = null) {
    this.mainBgm = mainBgm;
    this.wasBgmPlaying = false;
    this.audioTracks = [];
    this.masterAudio = null;
    this.audioCtx = null;
    this.useFallbackClock = false;
    this.songDuration = 195;

    // Pausar la radio DnB del menú principal mientras se juega
    if (this.mainBgm && this.mainBgm.isPlaying) {
      this.wasBgmPlaying = true;
      if (typeof this.mainBgm.pause === 'function') {
        this.mainBgm.pause();
      } else if (this.mainBgm.audio) {
        this.mainBgm.audio.pause();
      }
    }
  }

  async setupMultiTrackAudio(sources, defaultDuration = 195) {
    this.audioTracks = [];
    this.masterAudio = null;

    const loadPromises = sources.map((url) => {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.preload = 'auto';

        const cleanup = () => {
          audio.removeEventListener('canplaythrough', onReady);
          audio.removeEventListener('loadedmetadata', onReady);
          audio.removeEventListener('error', onError);
        };

        const onReady = () => {
          cleanup();
          resolve(audio);
        };

        const onError = () => {
          cleanup();
          resolve(null);
        };

        audio.addEventListener('canplaythrough', onReady, { once: true });
        audio.addEventListener('loadedmetadata', onReady, { once: true });
        audio.addEventListener('error', onError, { once: true });

        audio.src = url;
        audio.load();
      });
    });

    const loaded = await Promise.all(loadPromises);
    this.audioTracks = loaded.filter(Boolean);

    if (this.audioTracks.length > 0) {
      this.masterAudio = this.audioTracks[0];
      if (this.masterAudio.duration && isFinite(this.masterAudio.duration)) {
        this.songDuration = this.masterAudio.duration;
      }
      this.masterAudio.addEventListener('loadedmetadata', () => {
        if (this.masterAudio && isFinite(this.masterAudio.duration)) {
          this.songDuration = this.masterAudio.duration;
        }
      });
      console.log(`[PAPAHERO] Pistas de audio listas: ${this.audioTracks.length} instrumentos sonando juntos.`);
      this.useFallbackClock = false;
    } else {
      this.useFallbackClock = true;
      this.songDuration = defaultDuration;
    }

    return this.songDuration;
  }

  startSong() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) this.audioCtx = new AudioContextClass();
    }

    if (this.audioTracks.length > 0) {
      for (const track of this.audioTracks) {
        track.currentTime = 0;
        track.play().catch(() => {
          this.useFallbackClock = true;
        });
      }
    } else {
      this.useFallbackClock = true;
    }
  }

  syncTracks(currentSongTime) {
    if (this.audioTracks.length <= 1) return;
    for (let i = 1; i < this.audioTracks.length; i++) {
      const track = this.audioTracks[i];
      if (Math.abs(track.currentTime - currentSongTime) > 0.08) {
        track.currentTime = currentSongTime;
      }
    }
  }

  stopAllAudioTracks() {
    if (!this.audioTracks) return;
    for (const track of this.audioTracks) {
      try {
        track.pause();
        track.currentTime = 0;
      } catch (e) {}
    }
  }

  playSfx(type, lane = 0) {
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'hit') {
        const freqs = [220.0, 261.6, 329.6, 392.0, 523.2];
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freqs[lane] || 330, now);
        gain.gain.setValueAtTime(this.useFallbackClock ? 0.12 : 0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'miss') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.linearRampToValueAtTime(55, now + 0.14);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'overdrive') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {}
  }

  destroy() {
    this.stopAllAudioTracks();
    if (this.audioTracks) {
      for (const t of this.audioTracks) {
        t.src = '';
      }
      this.audioTracks = [];
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }

    if (this.wasBgmPlaying && this.mainBgm) {
      if (typeof this.mainBgm.play === 'function') {
        this.mainBgm.play();
      } else if (this.mainBgm.audio) {
        this.mainBgm.audio.play().catch(() => {});
      }
    }
  }
}
