import { ThreeHub } from './three-hub.js';
import { AudioManager } from './audio-manager.js';
import { BlasphemousPotatoGame } from './minijuegos/BLASFEPAPA/game-blasfepapa.js';
import { FF7Minigame } from './minigames/ff7/game-ff7.js';
import { BlasphemousPotatoGame } from './minijuegos/BLASFEPAPA/game-blasfepapa.js';

// 1. LISTA DE CANCIONES (Guarda tus archivos .mp3 en ./assets/audio/)
const dnbPlaylist = [
  { title: 'DnB Track 01', src: './assets/audio/dnb-track-1.mp3' },
  { title: 'DnB Track 02', src: './assets/audio/dnb-track-2.mp3' },
  { title: 'DnB Track 03', src: './assets/audio/dnb-track-3.mp3' }
];

const bgm = new AudioManager(dnbPlaylist, 3000); // 3 seg de Fade In / Fade Out

// Referencias UI del Hub
const titleEl = document.getElementById('selected-title');
const descEl = document.getElementById('selected-desc');
const btnAction = document.getElementById('btn-action');
const btnBgmToggle = document.getElementById('btn-bgm-toggle');
const btnBgmNext = document.getElementById('btn-bgm-next');

//Referencias del Modal de Minijuegos y Transiciones
const minigameModal = document.getElementById('minigame-modal');
const minigameTitle = document.getElementById('minigame-title');
const minigameStage = document.getElementById('minigame-stage');
const btnExitGame = document.getElementById('btn-exit-game');
const transitionOverlay = document.getElementById('transition-overlay');
const unlockCounter = document.getElementById('unlock-counter');

// Referencias del Modal de Minijuegos y Transiciones
const modal = document.getElementById('minigame-modal');
const minigameTitle = document.getElementById('minigame-title');
const minigameStage = document.getElementById('minigame-stage');
const btnExitGame = document.getElementById('btn-exit-game');
const unlockCounter = document.getElementById('unlock-counter');
const transitionOverlay = document.getElementById('transition-overlay');
const webglCanvas = document.getElementById('webgl-canvas');
const uiLayer = document.getElementById('ui-layer');

let activeNodeIndex = -1;
let activeRecipe = null;
let currentGameInstance = null;
let currentGameInstance = null;
let isTransitioning = false;

// Inicializar Hub 3D
const hub = new ThreeHub('webgl-canvas', handleNodeSelection);

function handleNodeSelection(recipe, index) {
  activeNodeIndex = index;
  activeRecipe = recipe;

  const authorEl = document.getElementById('selected-author');
  const badgeEl = document.getElementById('selected-index-badge');

  if (!recipe || index === -1) {
    authorEl.textContent = 'SISTEMA CENTRAL';
    badgeEl.textContent = 'ORIGEN';
    titleEl.textContent = '[ PAPA CRUDA ]';
    titleEl.className = 'text-lg md:text-2xl text-yellow-300 leading-none';
    descEl.textContent = 'El tubérculo base. Gira la rueda o haz clic en un signo "?" para ver sus evoluciones.';
    btnAction.classList.add('hidden');
    return;
  }

  authorEl.textContent = recipe.author;
  badgeEl.textContent = `NODO #0${index + 1}`;

  if (recipe.unlocked) {
    titleEl.textContent = `★ ${recipe.unlockedName}`;
    titleEl.className = 'text-lg md:text-2xl text-green-400 leading-none';
    descEl.textContent = recipe.unlockedDesc;
    btnAction.textContent = '✔ JUGAR DE NUEVO';
    btnAction.className = 'w-full bg-blue-700 hover:bg-blue-600 border border-white py-1.5 px-3 text-sm md:text-lg text-white active:scale-95 transition mt-1';
    btnAction.classList.remove('hidden');
  } else {
    titleEl.textContent = recipe.lockedName;
    titleEl.className = 'text-lg md:text-2xl text-red-400 leading-none';
    descEl.textContent = recipe.lockedDesc;
    btnAction.textContent = `▶ DESBLOQUEAR JUEGO`;
    btnAction.className = 'ps1-blink w-full bg-red-700 hover:bg-red-600 border border-white py-1.5 px-3 text-sm md:text-lg text-white active:scale-95 transition mt-1';
    btnAction.classList.remove('hidden');
  }
}
// Actualiza el contador de archivos desbloqueados (0 / 4 -> 4 / 4)
function updateUnlockCounterUI() {
  const unlockedTotal = hub.recipesData.filter(r => r.unlocked).length;
  unlockCounter.textContent = `${unlockedTotal} / ${hub.recipesData.length}`;
}

// Cierra el modal y limpia el minijuego en ejecución
function closeMinigameModal() {
  if (currentGameInstance && typeof currentGameInstance.destroy === 'function') {
    currentGameInstance.destroy();
  }
  currentGameInstance = null;
  minigameStage.innerHTML = '';
  minigameModal.classList.add('hidden');
}

// Punto de entrada para lanzar la transición y el minijuego de cada integrante

// Actualiza el contador de archivos desbloqueados (0 / 4 -> 4 / 4)
function updateUnlockCounterUI() {
  const unlockedTotal = hub.recipesData.filter(r => r.unlocked).length;
  unlockCounter.textContent = `${unlockedTotal} / ${hub.recipesData.length}`;
}

// Cierra el modal y limpia el minijuego en ejecución
function closeMinigameModal() {
  if (currentGameInstance && typeof currentGameInstance.destroy === 'function') {
    currentGameInstance.destroy();
  }
  currentGameInstance = null;
  minigameStage.innerHTML = '';
  modal.classList.add('hidden');
}

// =========================================================================
// TRANSICIONES
// =========================================================================

// Encuentro aleatorio de FF7 (Vortex/Swirl + Blur + Flash) — solo nodo FF7
function playFF7BattleTransition(onComplete) {
  if (isTransitioning) return;
  isTransitioning = true;

  // Pausar la música DnB del Hub si estaba sonando
  if (bgm.isPlaying) bgm.togglePlay(updateBgmUI);

  // SFX de encuentro aleatorio al iniciar el remolino
  const enterSfx = new Audio('./assets/audio/ff7/sfx/batttle-enter.mp3');
  enterSfx.volume = 0.75;
  enterSfx.play().catch(() => {});

  webglCanvas.classList.add('ff7-warp-active');
  uiLayer.classList.add('ff7-warp-active');
  transitionOverlay.classList.add('ff7-overlay-active');

  setTimeout(() => {
    onComplete();

    webglCanvas.classList.remove('ff7-warp-active');
    uiLayer.classList.remove('ff7-warp-active');

    transitionOverlay.style.transition = 'opacity 0.35s ease';
    transitionOverlay.style.opacity = '0';

    setTimeout(() => {
      transitionOverlay.classList.remove('ff7-overlay-active');
      transitionOverlay.style.transition = '';
      transitionOverlay.style.opacity = '';
      isTransitioning = false;
    }, 350);
  }, 1350);
}

// Flash PS1 blanco/negro — resto de nodos
function playPS1EncounterFlash(onComplete) {
  if (isTransitioning) return;
  isTransitioning = true;

  transitionOverlay.classList.remove('trigger-encounter');
  void transitionOverlay.offsetWidth; // Forzar reflow para reiniciar la animación
  transitionOverlay.classList.add('trigger-encounter');

  setTimeout(() => {
    onComplete();
    isTransitioning = false;
  }, 550);
}

// =========================================================================
// LANZAMIENTO DE MINIJUEGOS
// =========================================================================
function launchMinigame() {
  const nodeIndex = activeNodeIndex;
  const recipe = activeRecipe;
  if (!recipe) return;

  // Si por seguridad había una instancia previa, la destruimos
  if (currentGameInstance && typeof currentGameInstance.destroy === 'function') {
    currentGameInstance.destroy();
  }
  currentGameInstance = null;
  minigameStage.innerHTML = '';

  if (minigameTitle) {
    minigameTitle.textContent = `DESAFÍO #0${nodeIndex + 1} — ${recipe.author.toUpperCase()}`;
  }
  modal.classList.remove('hidden');

  // Callback cuando el jugador supera el minijuego
  const onWinMinigame = () => {
    currentGameInstance = null; // el juego ya se destruyó solo al ganar
    hub.unlockNode(nodeIndex);
    updateUnlockCounterUI();
    closeMinigameModal();
  };

  if (recipe.id === 'ff7') {
    // NODO #01
    currentGameInstance = new FF7Minigame(
      minigameStage,
      onWinMinigame,
      () => { // Huir
        currentGameInstance = null;
        closeMinigameModal();
      }
    );

  } else if (recipe.id === 'survivor') {
    // NODO #02
    minigameStage.innerHTML = '<p class="text-yellow-300 text-xl text-center px-4">Minijuego #02 (Survivor) pendiente de integración...</p>';

  } else if (recipe.id === 'masher') {
    // NODO #03
    minigameStage.innerHTML = '<p class="text-yellow-300 text-xl text-center px-4">Minijuego #03 (Masher) pendiente de integración...</p>';

  } else if (recipe.id === 'jacket') {
    // NODO #04 (Pasamos bgm para que BlasfepapaAudio cancele la música del menú)
    if (minigameTitle) minigameTitle.textContent = 'DESAFÍO #04 — PENITENCIA DEL TUBÉRCULO';
    currentGameInstance = new BlasphemousPotatoGame(minigameStage, onWinMinigame, bgm);
  }
}

// Botón "DESBLOQUEAR JUEGO" / "JUGAR DE NUEVO"
btnAction.addEventListener('click', () => {
  if (!activeRecipe) return;

  // 1. Disparar animación de encuentro PS1 (Flash blanco/negro)
  transitionOverlay.classList.remove('trigger-encounter');
  void transitionOverlay.offsetWidth; // Forzar reflow para reiniciar la animación
  transitionOverlay.classList.add('trigger-encounter');

  // 2. Abrir el modal y cargar el minijuego correspondiente al nodo seleccionado
  setTimeout(() => {
    minigameTitle.textContent = `DESAFÍO #0${activeNodeIndex + 1} — ${activeRecipe.author.toUpperCase()}`;
    minigameModal.classList.remove('hidden');

    if (currentGameInstance && typeof currentGameInstance.destroy === 'function') {
      currentGameInstance.destroy();
      currentGameInstance = null;
    }

    // Callback que se ejecuta cuando el jugador supera el minijuego
    const onWinMinigame = () => {
      hub.unlockNode(activeNodeIndex);
      updateUnlockCounterUI();
      closeMinigameModal();
    };

    if (activeRecipe.id === 'ff7') {
      // NODO #01 - Integrante 1
      minigameStage.innerHTML = '<p class="text-yellow-300 text-xl text-center px-4">Minijuego #01 (FF7) pendiente de integración...</p>';

    } else if (activeRecipe.id === 'survivor') {
      // NODO #02 - Integrante 2
      minigameStage.innerHTML = '<p class="text-yellow-300 text-xl text-center px-4">Minijuego #02 (Survivor) pendiente de integración...</p>';

    } else if (activeRecipe.id === 'masher') {
      // NODO #03 - Integrante 3
      minigameStage.innerHTML = '<p class="text-yellow-300 text-xl text-center px-4">Minijuego #03 (Masher) pendiente de integración...</p>';

    } else if (activeRecipe.id === 'jacket') {
      // NODO #04 - Integrante 4 (Pasamos bgm para que BlasfepapaAudio cancele la música del menú)
      minigameTitle.textContent = 'DESAFÍO #04 — PENITENCIA DEL TUBÉRCULO';
      currentGameInstance = new BlasphemousPotatoGame(minigameStage, onWinMinigame, bgm);
    }
  }, 550);
});

// Botón [ HUIR ] para salir del modal del minijuego
btnExitGame.addEventListener('click', () => {
  closeMinigameModal();
  btnAction.blur(); // Quita el foco para que Enter no lo reactive durante la pelea
  if (!activeRecipe || isTransitioning || !modal.classList.contains('hidden')) return;

  if (activeRecipe.id === 'ff7') {
    playFF7BattleTransition(launchMinigame);
  } else {
    playPS1EncounterFlash(launchMinigame);
  }
});

// Botón [ HUIR ]
btnExitGame.addEventListener('click', () => {
  closeMinigameModal();
});

// Controles de la Radio Atmospheric DnB
// =========================================================================
// CONTROLES DE LA RADIO ATMOSPHERIC DNB (Con Auto-Play al primer gesto)
// =========================================================================
const updateBgmUI = (track, isPlaying) => {
  btnBgmToggle.textContent = isPlaying ? `[ ♫ ${track.title} ]` : '[ ▶ BGM: OFF ]';
};

window.addEventListener('DOMContentLoaded', () => {
  bgm.togglePlay(updateBgmUI);
});

// 2. Desbloqueo automático al primer clic, toque o scroll
const unlockAudioOnFirstInteraction = () => {
  if (!bgm.isPlaying) {
    bgm.togglePlay(updateBgmUI);
  }
  if (bgm.isPlaying) {
    window.removeEventListener('pointerdown', unlockAudioOnFirstInteraction);
    window.removeEventListener('wheel', unlockAudioOnFirstInteraction);
    window.removeEventListener('touchstart', unlockAudioOnFirstInteraction);
    window.removeEventListener('keydown', unlockAudioOnFirstInteraction);
  }
};

window.addEventListener('pointerdown', unlockAudioOnFirstInteraction, { once: true });
window.addEventListener('wheel', unlockAudioOnFirstInteraction, { once: true });
window.addEventListener('touchstart', unlockAudioOnFirstInteraction, { once: true });
window.addEventListener('keydown', unlockAudioOnFirstInteraction, { once: true });

btnBgmToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  e.stopPropagation();
  const playing = bgm.togglePlay(updateBgmUI);
  if (!playing) btnBgmToggle.textContent = '[ ▶ BGM: OFF ]';
});

btnBgmNext.addEventListener('click', (e) => {
  e.stopPropagation();
  bgm.nextTrack();
});

// Eventos de Scroll (PC) y Swipe (Móvil) — Se ignoran mientras el modal de juego está abierto
// =========================================================================
// EVENTOS DE SCROLL (PC) Y SWIPE (MÓVIL)
// Se ignoran mientras el modal está abierto o hay una transición
// =========================================================================
let lastScrollTime = 0;
window.addEventListener('wheel', (e) => {
  if (!minigameModal.classList.contains('hidden')) return;
  if (!modal.classList.contains('hidden') || isTransitioning) return;
  const now = Date.now();
  if (now - lastScrollTime < 350) return;
  lastScrollTime = now;
  hub.rotateRing(e.deltaY);
});

let touchStartX = 0;
window.addEventListener('touchstart', (e) => {
  if (!minigameModal.classList.contains('hidden')) return;
  if (!modal.classList.contains('hidden')) return;
  touchStartX = e.touches[0].clientX;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (!modal.classList.contains('hidden') || isTransitioning) return;
  const deltaX = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(deltaX) > 45) {
    hub.rotateRing(deltaX);
  }
}, { passive: true });