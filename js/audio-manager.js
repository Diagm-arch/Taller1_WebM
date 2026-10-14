export class AudioManager {
  constructor(playlist = [], fadeDuration = 3000) {
    this.playlist = playlist;
    this.fadeDuration = fadeDuration; // Duración del fade in/out en milisegundos (3 seg)
    this.maxVolume = 0.5;
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isFading = false;

    // Dos reproductores para poder mezclar el final de una canción con el inicio de la otra
    this.deckA = new Audio();
    this.deckB = new Audio();
    this.activeDeck = this.deckA;
    this.nextDeck = this.deckB;

    this.setupDeckEvents(this.deckA);
    this.setupDeckEvents(this.deckB);
  }

  setupDeckEvents(deck) {
    deck.addEventListener('timeupdate', () => {
      if (deck !== this.activeDeck || !this.isPlaying || this.isFading || !deck.duration) return;

      // Si quedan menos de (fadeDuration) segundos para que acabe la pista, inicia el crossfade
      const timeLeft = (deck.duration - deck.currentTime) * 1000;
      if (timeLeft <= this.fadeDuration && timeLeft > 0) {
        this.nextTrack();
      }
    });

    // Respaldo por si el navegador no detecta la duración a tiempo
    deck.addEventListener('ended', () => {
      if (deck === this.activeDeck && !this.isFading) {
        this.nextTrack();
      }
    });
  }

  togglePlay(onTrackChange) {
    if (this.playlist.length === 0) return false;
    if (onTrackChange) this.onTrackChange = onTrackChange;

    if (!this.isPlaying) {
      if (!this.activeDeck.src) {
        this.activeDeck.src = this.playlist[this.currentIndex].src;
        this.activeDeck.volume = 0;
      }
      this.activeDeck.play().then(() => {
        // Solo marcamos isPlaying = true cuando el navegador realmente permitió sonar el audio
        this.isPlaying = true;
        this.fadeVolume(this.activeDeck, this.activeDeck.volume, this.maxVolume, 1500);
        this.notifyUI();
      }).catch(() => {
        // Si el navegador bloquea el autoplay al cargar, queda en false esperando el primer clic/scroll
        this.isPlaying = false;
      });
    } else {
      this.isPlaying = false;
      this.fadeVolume(this.activeDeck, this.activeDeck.volume, 0, 800, () => {
        this.activeDeck.pause();
      });
    }
    return this.isPlaying;
  }

  nextTrack() {
    if (this.playlist.length === 0 || this.isFading) return;
    this.isFading = true;

    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    const nextSong = this.playlist[this.currentIndex];

    this.nextDeck.src = nextSong.src;
    this.nextDeck.currentTime = 0;
    this.nextDeck.volume = 0;

    if (this.isPlaying) {
      this.nextDeck.play().catch(err => console.warn('Audio no encontrado:', err));
      // Fade Out de la canción saliente
      this.fadeVolume(this.activeDeck, this.activeDeck.volume, 0, this.fadeDuration, () => {
        this.activeDeck.pause();
      });
      // Fade In de la canción entrante
      this.fadeVolume(this.nextDeck, 0, this.maxVolume, this.fadeDuration, () => {
        this.isFading = false;
      });
    } else {
      this.isFading = false;
    }

    // Intercambiamos los reproductores activos
    const temp = this.activeDeck;
    this.activeDeck = this.nextDeck;
    this.nextDeck = temp;
    this.notifyUI();
  }

  fadeVolume(audioEl, startVol, endVol, duration, onComplete) {
    const steps = 25;
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

  notifyUI() {
    if (this.onTrackChange) {
      this.onTrackChange(this.playlist[this.currentIndex], this.isPlaying);
    }
  }
}