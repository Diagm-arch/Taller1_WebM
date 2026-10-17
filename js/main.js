import { ThreeHub } from './three-hub.js?v=9';
import { AudioManager } from './audio-manager.js?v=9';
import { FF7Minigame } from './minigames/ff7/game-ff7.js?v=9';
import { BlasphemousPotatoGame } from './minigames/BLASFEPAPA/game-blasfepapa.js?v=9';
import { startPapaGame, stopPapaGame } from './minigames/tbop/tbop.js?v=9';

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

// Referencias del Modal de Minijuegos y Transiciones (Sin duplicados)
const modal = document.getElementById('minigame-modal');
const minigameModal = modal; // Alias por compatibilidad
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
    titleEl.className = 'text-sm sm:text-lg md:text-2xl text-green-400 leading-tight truncate';
    descEl.textContent = recipe.unlockedDesc;
    btnAction.textContent = '✔ JUGAR DE NUEVO';
    btnAction.className = 'shrink-0 w-full sm:w-auto bg-blue-700 hover:bg-blue-600 border border-white py-1 sm:py-2 px-3 sm:px-5 text-xs sm:text-sm md:text-lg text-white active:scale-95 transition';
    btnAction.classList.remove('hidden');
  } else {
    titleEl.textContent = recipe.lockedName;
    titleEl.className = 'text-sm sm:text-lg md:text-2xl text-red-400 leading-tight truncate';
    descEl.textContent = recipe.lockedDesc;
    btnAction.textContent = `▶ DESBLOQUEAR JUEGO`;
    btnAction.className = 'ps1-blink shrink-0 w-full sm:w-auto bg-red-700 hover:bg-red-600 border border-white py-1 sm:py-2 px-3 sm:px-5 text-xs sm:text-sm md:text-lg text-white active:scale-95 transition';
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
  modal.classList.add('hidden');

  // Si el AudioManager nuevo tiene resume(), lo usa (TBOP y Blasfepapa igual manejan su propio restore)
  if (typeof bgm.resume === 'function') {
    bgm.resume();
  }
}

// =========================================================================
// TRANSICIONES
// =========================================================================

// Encuentro aleatorio de FF7 (Vortex/Swirl + Blur + Flash) — solo nodo FF7
function playFF7BattleTransition(onComplete) {
  if (isTransitioning) return;
  isTransitioning = true;

  const enterSfx = new Audio('./assets/audio/ff7/sfx/batttle-enter.mp3');
  enterSfx.volume = 0.75;
  enterSfx.play().catch(() => {});

  if (webglCanvas) webglCanvas.classList.add('ff7-warp-active');
  if (uiLayer) uiLayer.classList.add('ff7-warp-active');
  transitionOverlay.classList.add('ff7-overlay-active');

  setTimeout(() => {
    onComplete();

    if (webglCanvas) webglCanvas.classList.remove('ff7-warp-active');
    if (uiLayer) uiLayer.classList.remove('ff7-warp-active');

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
    hub.unlockNode(nodeIndex);
    updateUnlockCounterUI();
    closeMinigameModal();
  };

  if (recipe.id === 'ff7') {
    // NODO #01 - FF7
    currentGameInstance = new FF7Minigame(
      minigameStage,
      () => {
        currentGameInstance = null;
        onWinMinigame();
      },
      () => {
        currentGameInstance = null;
        closeMinigameModal();
      }
    );

  } else if (recipe.id === 'survivor') {
    // NODO #02 - Survivor
    minigameStage.innerHTML = '<p class="text-yellow-300 text-xl text-center px-4">Minijuego #02 (Survivor) pendiente de integración...</p>';

  } else if (recipe.id === 'masher') {
    // NODO #03 - THE BINDING OF PAPA (TBOP)
    if (minigameTitle) minigameTitle.textContent = 'DESAFÍO #03 — The Binding Of Papa';
    startPapaGame(minigameStage, onWinMinigame, bgm);
    currentGameInstance = {
      destroy: () => stopPapaGame()
    };

  } else if (recipe.id === 'jacket') {
    // NODO #04 - BLASFEPAPA
    if (minigameTitle) minigameTitle.textContent = 'DESAFÍO #04 — PENITENCIA DEL TUBÉRCULO';
    currentGameInstance = new BlasphemousPotatoGame(minigameStage, onWinMinigame, bgm);
  }
}

// Botón "DESBLOQUEAR JUEGO" / "JUGAR DE NUEVO"
btnAction.addEventListener('click', () => {
  btnAction.blur(); // Quita el foco para que Enter no lo reactive durante la pelea
  if (!activeRecipe || isTransitioning || !modal.classList.contains('hidden')) return;

  // Si es FF7 o Survivor y existe bgm.suspend(), lo usamos.
  // Para 'masher' (TBOP) y 'jacket' (Blasfepapa), sus propias clases de audio pausan y restauran bgm.
  if (activeRecipe.id !== 'masher' && activeRecipe.id !== 'jacket') {
    if (typeof bgm.suspend === 'function') {
      bgm.suspend();
    }
  }

  if (activeRecipe.id === 'ff7') {
    playFF7BattleTransition(launchMinigame);
  } else {
    playPS1EncounterFlash(launchMinigame);
  }
});

// Botón [ HUIR ] para salir del modal del minijuego
btnExitGame.addEventListener('click', () => {
  closeMinigameModal();
});

// =========================================================================
// RADIO ATMOSPHERIC DNB + PANTALLA DE ENTRADA
// =========================================================================
const updateBgmUI = (track, isPlaying) => {
  if (!btnBgmToggle) return;
  btnBgmToggle.textContent = (isPlaying && track) ? `[ ♫ ${track.title} ]` : '[ ▶ BGM: OFF ]';
};
bgm.onTrackChange = updateBgmUI;

const bootScreen = document.getElementById('boot-screen');
const bootBar = document.getElementById('boot-bar');
const bootStatus = document.getElementById('boot-status');
const btnEnter = document.getElementById('btn-enter');
let hasEntered = !bootScreen; // Si no existe boot-screen en el HTML, permite usar el hub de inmediato
let bootAudioState = 'ready';

if (bootScreen && btnEnter) {
  btnEnter.disabled = true;

  if (typeof bgm.preload === 'function') {
    bgm.preload({
      timeout: 10000,
      onProgress: (pct) => { if (bootBar) bootBar.style.width = `${pct}%`; }
    }).then((state) => {
      bootAudioState = state;
      const messages = {
        ready: 'MÚSICA LISTA',
        slow: 'CONEXIÓN LENTA: LA MÚSICA CARGARÁ EN SEGUNDO PLANO',
        error: 'NO SE PUDO CARGAR LA MÚSICA'
      };
      if (bootStatus) bootStatus.textContent = messages[state] || 'LISTO';
      if (state === 'ready' && bootBar) bootBar.style.width = '100%';
      btnEnter.disabled = false;
      btnEnter.textContent = '▶ TOCA PARA ENTRAR';
      btnEnter.focus();
    });
  } else {
    // Respaldo si tienes el audio-manager.js anterior (sin método preload)
    if (bootBar) bootBar.style.width = '100%';
    if (bootStatus) bootStatus.textContent = 'MÚSICA LISTA';
    btnEnter.disabled = false;
    btnEnter.textContent = '▶ TOCA PARA ENTRAR';
  }

  btnEnter.addEventListener('click', () => {
    if (hasEntered) return;
    hasEntered = true;

    if (bootAudioState !== 'error') {
      if (typeof bgm.play === 'function') {
        bgm.play(updateBgmUI);
      } else {
        bgm.togglePlay(updateBgmUI);
      }
    }

    bootScreen.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => bootScreen.remove(), 600);
  });
} else {
  // Si tu index.html no tiene pantalla de carga (boot-screen), usa el arranque clásico
  window.addEventListener('DOMContentLoaded', () => {
    bgm.togglePlay(updateBgmUI);
  });
}

btnBgmToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const playing = bgm.togglePlay(updateBgmUI);
  if (!playing) btnBgmToggle.textContent = '[ ▶ BGM: OFF ]';
});

btnBgmNext.addEventListener('click', (e) => {
  e.stopPropagation();
  bgm.nextTrack();
});

// =========================================================================
// EVENTOS DE SCROLL (PC) Y SWIPE (MÓVIL)
// =========================================================================
let lastScrollTime = 0;
window.addEventListener('wheel', (e) => {
  if (!hasEntered || !modal.classList.contains('hidden') || isTransitioning) return;
  const now = Date.now();
  if (now - lastScrollTime < 350) return;
  lastScrollTime = now;
  hub.rotateRing(e.deltaY);
});

let touchStartX = 0;
window.addEventListener('touchstart', (e) => {
  if (!hasEntered || !modal.classList.contains('hidden') || isTransitioning) return;
  touchStartX = e.touches[0].clientX;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (!hasEntered || !modal.classList.contains('hidden') || isTransitioning) return;
  const deltaX = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(deltaX) > 45) {
    hub.rotateRing(deltaX);
  }
}, { passive: true });