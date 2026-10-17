export class AudioManager {
  constructor(playlist = [], fadeDuration = 3000) {
    this.playlist = playlist;
    this.fadeDuration = fadeDuration; // Duración del crossfade entre pistas (ms)
    this.maxVolume = 0.5;
    this.currentIndex = 0;
    this.isFading = false;
    this.onTrackChange = null;

    // INTENCIÓN en vez de "estado real del audio":
    //  - wantsPlay: el usuario quiere música (se activa en cuanto se pide play(), aunque aún esté cargando)
    //  - suspended: un minijuego la silenció temporalmente (se retoma con resume())
    // Así el hub puede "cancelar" la música aunque el archivo todavía no haya terminado de cargar.
    this.wantsPlay = false;
    this.suspended = false;

    // Dos reproductores para poder mezclar el final de una canción con el inicio de la otra
    this.deckA = new Audio();
    this.deckB = new Audio();
    this.deckA.preload = 'auto';
    this.deckB.preload = 'auto';
    this.activeDeck = this.deckA;
    this.nextDeck = this.deckB;

    // Con una sola pista no hay a qué cambiar: se repite en bucle
    this.deckA.loop = this.deckB.loop = this.playlist.length <= 1;

    this.setupDeckEvents(this.deckA);
    this.setupDeckEvents(this.deckB);
  }

  // Compatibilidad: otros módulos (p. ej. el minijuego BLASFEPAPA) leen bgm.isPlaying
  get isPlaying() {
    return this.wantsPlay && !this.suspended;
  }
  set isPlaying(value) {
    this.wantsPlay = !!value;
  }

  // ---------------------------------------------------------------------
  // CARGA INICIAL (para la pantalla de "toca para entrar")
  // Resuelve con: 'ready' (ya puede sonar), 'slow' (timeout, seguirá cargando) o 'error'
  // ---------------------------------------------------------------------
  preload({ timeout = 10000, onProgress } = {}) {
    if (this.playlist.length === 0) return Promise.resolve('error');

    const deck = this.activeDeck;
    if (!deck.src) {
      deck.src = this.playlist[this.currentIndex].src;
      deck.volume = 0;
    }
    deck.load();

    return new Promise((resolve) => {
      let finished = false;

      const bufferedSeconds = () => {
        try {
          return deck.buffered.length ? deck.buffered.end(deck.buffered.length - 1) : 0;
        } catch (_) {
          return 0;
        }
      };

      const finish = (result) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        ['canplay', 'canplaythrough', 'progress', 'error'].forEach((ev) => deck.removeEventListener(ev, onEvent));
        if (onProgress) onProgress(result === 'ready' ? 100 : Math.min(99, (bufferedSeconds() / 10) * 100));
        resolve(result);
      };

      const onEvent = (e) => {
        if (e.type === 'error') return finish('error');
        if (onProgress) onProgress(Math.min(99, (bufferedSeconds() / 10) * 100));
        if (e.type !== 'progress' && deck.readyState >= 3) finish('ready');
      };

      ['canplay', 'canplaythrough', 'progress', 'error'].forEach((ev) => deck.addEventListener(ev, onEvent));
      const timer = setTimeout(() => finish(deck.readyState >= 3 ? 'ready' : 'slow'), timeout);

      if (deck.readyState >= 3) finish('ready');
    });
  }

  setupDeckEvents(deck) {
    deck.addEventListener('timeupdate', () => {
      if (this.playlist.length <= 1) return;
      if (deck !== this.activeDeck || !this.isPlaying || this.isFading || !deck.duration) return;

      // Si quedan menos de (fadeDuration) ms para que acabe la pista, inicia el crossfade
      const timeLeft = (deck.duration - deck.currentTime) * 1000;
      if (timeLeft <= this.fadeDuration && timeLeft > 0) {
        this.nextTrack();
      }
    });

    // Respaldo por si el navegador no detecta la duración a tiempo
    deck.addEventListener('ended', () => {
      if (this.playlist.length > 1 && deck === this.activeDeck && !this.isFading && this.isPlaying) {
        this.nextTrack();
      }
    });
  }

  // ---------------------------------------------------------------------
  // CONTROL PÚBLICO
  // ---------------------------------------------------------------------
  play(onTrackChange) {
    if (onTrackChange) this.onTrackChange = onTrackChange;
    if (this.playlist.length === 0 || this.suspended) return false;
    this.wantsPlay = true;
    this.startActiveDeck();
    return true;
  }

  pause() {
    this.wantsPlay = false;
    this.isFading = false;
    this.hushDecks(800);
    this.notifyUI();
  }

  // Mantiene la firma antigua. Devuelve la INTENCIÓN (true = la música está activada/cargando)
  togglePlay(onTrackChange) {
    if (onTrackChange) this.onTrackChange = onTrackChange;
    if (this.playlist.length === 0) return false;
    // Mientras un minijuego la tiene suspendida, ningún toggle externo debe encenderla
    if (this.suspended) return false;

    if (this.wantsPlay) this.pause();
    else this.play();
    return this.wantsPlay;
  }

  // Silencia la música del hub al entrar a un minijuego (funciona aunque el audio aún esté cargando)
  suspend() {
    if (this.suspended) return;
    this.suspended = true;
    this.isFading = false;
    this.hushDecks(400);
    this.notifyUI();
  }

  // Al volver al hub: retoma solo si el usuario la tenía activada
  resume() {
    if (!this.suspended) return;
    this.suspended = false;
    if (this.wantsPlay) this.startActiveDeck();
    this.notifyUI();
  }

  nextTrack() {
    if (this.playlist.length <= 1 || this.isFading) return;

    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    const nextSong = this.playlist[this.currentIndex];

    // Sin música sonando: solo cambiamos la pista que sonará al darle play
    if (!this.isPlaying) {
      this.cancelFade(this.activeDeck);
      this.activeDeck.src = nextSong.src;
      this.activeDeck.volume = 0;
      this.notifyUI();
      return;
    }

    this.isFading = true;
    const outgoing = this.activeDeck;
    const incoming = this.nextDeck;

    incoming.src = nextSong.src;
    incoming.currentTime = 0;
    incoming.volume = 0;
    incoming.play().catch((err) => {
      if (err && err.name !== 'AbortError') console.warn('Audio no encontrado:', err);
    });

    // Fade Out de la canción saliente
    this.fadeVolume(outgoing, outgoing.volume, 0, this.fadeDuration, () => {
      outgoing.pause();
    });
    // Fade In de la canción entrante
    this.fadeVolume(incoming, 0, this.maxVolume, this.fadeDuration, () => {
      this.isFading = false;
    });

    // Intercambiamos los reproductores activos
    this.activeDeck = incoming;
    this.nextDeck = outgoing;
    this.notifyUI();
  }

  // ---------------------------------------------------------------------
  // INTERNOS
  // ---------------------------------------------------------------------
  startActiveDeck() {
    const deck = this.activeDeck;
    if (!deck.src) {
      deck.src = this.playlist[this.currentIndex].src;
      deck.volume = 0;
    }

    const attempt = deck.play();
    this.notifyUI(); // la UI refleja la intención de inmediato (aunque aún esté cargando)

    if (attempt && typeof attempt.then === 'function') {
      attempt.then(() => {
        // Si mientras cargaba el usuario entró a un juego o la pausó, no dejamos que suene
        if (!this.isPlaying) {
          deck.pause();
          return;
        }
        this.fadeVolume(deck, deck.volume, this.maxVolume, 1500);
      }).catch((err) => {
        // AbortError = alguien llamó pause() mientras cargaba: es esperado, no es un bloqueo
        if (err && err.name === 'AbortError') return;
        // El navegador bloqueó el audio (autoplay sin gesto)
        this.wantsPlay = false;
        this.notifyUI();
      });
    }
  }

  // Baja el volumen de ambos decks y los pausa (cancela también cualquier play() pendiente)
  hushDecks(duration) {
    [this.deckA, this.deckB].forEach((deck) => {
      this.cancelFade(deck);
      if (deck.volume <= 0.01) {
        deck.pause();
      } else {
        this.fadeVolume(deck, deck.volume, 0, duration, () => {
          if (!this.isPlaying) deck.pause();
        });
      }
    });
  }

  fadeVolume(audioEl, startVol, endVol, duration, onComplete) {
    this.cancelFade(audioEl); // evita dos fades peleando por el mismo reproductor

    const steps = 25;
    const stepTime = duration / steps;
    const volStep = (endVol - startVol) / steps;
    let currentStep = 0;
    const clamp = (v) => Math.max(0, Math.min(1, v));

    audioEl._fadeTimer = setInterval(() => {
      currentStep++;
      audioEl.volume = clamp(startVol + volStep * currentStep);

      if (currentStep >= steps) {
        this.cancelFade(audioEl);
        audioEl.volume = clamp(endVol);
        if (onComplete) onComplete();
      }
    }, stepTime);
  }

  cancelFade(audioEl) {
    if (audioEl._fadeTimer) {
      clearInterval(audioEl._fadeTimer);
      audioEl._fadeTimer = null;
    }
  }

  notifyUI() {
    if (this.onTrackChange) {
      this.onTrackChange(this.playlist[this.currentIndex], this.isPlaying);
    }
  }
}