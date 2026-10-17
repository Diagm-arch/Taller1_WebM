export class BlasfepapaAudio {
  constructor(mainBgm = null) {
    this.mainBgm = mainBgm;
    this.wasMainBgmPlaying = false;
    this.currentZone = null;
    this.maxVolume = 0.4;


    this.tracks = {
      1: new Audio('./assets/audio_blasfepapa/zona1.mp3'),
      2: new Audio('./assets/audio_blasfepapa/zona2.mp3')
    };

    // Configurar ambas pistas en bucle continuo (loop)
    Object.values(this.tracks).forEach((track) => {
      track.loop = true;
      track.volume = 0;
    });
  }

  // Cancela la música de fondo de la página y arranca la del juego
  start(initialZone = 1) {
    if (this.mainBgm && this.mainBgm.isPlaying) {
      this.wasMainBgmPlaying = true;
      // Apaga la música principal usando su método togglePlay
      this.mainBgm.togglePlay();
      const btnBgmToggle = document.getElementById('btn-bgm-toggle');
      if (btnBgmToggle) {
        btnBgmToggle.textContent = '[ ▶ BGM: PAUSADO POR JUEGO ]';
      }
    }

    this.playZone(initialZone);
  }

  // Cambia automáticamente entre la canción de la Zona 1 y la Zona 2
  playZone(zoneNumber) {
    if (this.currentZone === zoneNumber) return;

    const prevZone = this.currentZone;
    this.currentZone = zoneNumber;

    // Si había una zona sonando antes, hacer Fade Out y pausar
    if (prevZone && this.tracks[prevZone]) {
      const oldTrack = this.tracks[prevZone];
      this.fadeVolume(oldTrack, oldTrack.volume, 0, 1000, () => {
        oldTrack.pause();
        oldTrack.currentTime = 0;
      });
    }

    // Iniciar la canción de la nueva zona con Fade In
    const newTrack = this.tracks[zoneNumber];
    if (newTrack) {
      newTrack.currentTime = 0;
      newTrack.volume = 0;
      newTrack.play().catch((err) => {
        console.warn(`No se pudo reproducir el audio de la Zona ${zoneNumber}:`, err);
      });
      this.fadeVolume(newTrack, 0, this.maxVolume, 1200);
    }
  }

  // Detiene la música de Blasfepapa al salir o ganar y restaura la radio principal si estaba encendida
  stopAndRestore() {
    Object.values(this.tracks).forEach((track) => {
      track.pause();
      track.currentTime = 0;
      track.volume = 0;
    });
    this.currentZone = null;

    // Si la radio DnB del menú estaba sonando antes de entrar al juego, la reanuda
    if (this.mainBgm && this.wasMainBgmPlaying && !this.mainBgm.isPlaying) {
      this.mainBgm.togglePlay();
      this.wasMainBgmPlaying = false;
    }
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
}