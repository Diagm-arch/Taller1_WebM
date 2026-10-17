import { ThreeHub } from './three-hub.js?v=11';
import { AudioManager } from './audio-manager.js?v=11';
import { FF7Minigame } from './minigames/ff7/game-ff7.js?v=11';
import { BlasphemousPotatoGame } from './minigames/BLASFEPAPA/game-blasfepapa.js?v=11';
import { RhythmPotatoGame } from './minijuegos/PAPAHERO/game-rhythm.js?v=11';
import { startPapaGame, stopPapaGame } from './minigames/tbop/tbop.js?v=11';
import { RECIPES } from './recipes.js?v=11';

// 1. MIX DE FONDO (guarda el .mp3 en ./assets/audio/)
const dnbPlaylist = [
  { title: 'DnB Mix', src: './assets/audio/dnb-track-1.mp3' } // un solo mix largo: ajusta el nombre del archivo si es otro
];

const bgm = new AudioManager(dnbPlaylist, 3000); // 3 seg de Fade In / Fade Out

// Referencias UI del Hub
const titleEl = document.getElementById('selected-title');
const descEl = document.getElementById('selected-desc');
const btnAction = document.getElementById('btn-action');
const btnRecipe = document.getElementById('btn-recipe');
const btnBgmToggle = document.getElementById('btn-bgm-toggle');

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
    btnRecipe.classList.add('hidden');
    return;
  }

  authorEl.textContent = recipe.author;
  badgeEl.textContent = `NODO #0${index + 1}`;

  if (recipe.unlocked) {
    titleEl.textContent = `★ ${recipe.unlockedName}`;
    titleEl.className = 'text-sm sm:text-lg md:text-2xl text-green-400 leading-tight truncate';
    descEl.textContent = recipe.unlockedDesc;
    btnAction.textContent = '✔ JUGAR DE NUEVO';
    btnAction.className = 'flex-1 sm:flex-none bg-blue-700 hover:bg-blue-600 border border-white py-1 sm:py-2 px-3 sm:px-5 text-xs sm:text-sm md:text-lg text-white active:scale-95 transition';
    btnAction.classList.remove('hidden');
    btnRecipe.classList.remove('hidden'); // la receta solo se ve tras vencer el juego
  } else {
    titleEl.textContent = recipe.lockedName;
    titleEl.className = 'text-sm sm:text-lg md:text-2xl text-red-400 leading-tight truncate';
    descEl.textContent = recipe.lockedDesc;
    btnRecipe.classList.add('hidden');
    btnAction.textContent = `▶ DESBLOQUEAR JUEGO`;
    btnAction.className = 'ps1-blink flex-1 sm:flex-none bg-red-700 hover:bg-red-600 border border-white py-1 sm:py-2 px-3 sm:px-5 text-xs sm:text-sm md:text-lg text-white active:scale-95 transition';
    btnAction.classList.remove('hidden');
  }
}

// Actualiza el contador de archivos desbloqueados (0 / 4 -> 4 / 4)
function updateUnlockCounterUI() {
  const unlockedTotal = hub.recipesData.filter(r => r.unlocked).length;
  unlockCounter.textContent = `${unlockedTotal} / ${hub.recipesData.length}`;
}

// =========================================================================
// RECETARIO (solo accesible con la receta desbloqueada)
// =========================================================================
const recipeModal = document.getElementById('recipe-modal');
const btnRecipeClose = document.getElementById('btn-recipe-close');
const isRecipeOpen = () => !!recipeModal && !recipeModal.classList.contains('hidden');

function openRecipe() {
  if (!activeRecipe || !activeRecipe.unlocked) return;
  if (!modal.classList.contains('hidden') || isTransitioning) return;
  const data = RECIPES[activeRecipe.id];
  if (!data) return;

  document.getElementById('recipe-badge').textContent = `RECETA #0${activeNodeIndex + 1} — ${activeRecipe.author.toUpperCase()}`;
  document.getElementById('recipe-title').textContent = data.title;
  document.getElementById('recipe-meta').textContent = data.meta;
  document.getElementById('recipe-tip').textContent = `★ TIP: ${data.tip}`;

  const ingredientsEl = document.getElementById('recipe-ingredients');
  ingredientsEl.replaceChildren(...data.ingredients.map((text) => {
    const li = document.createElement('li');
    li.textContent = `▸ ${text}`;
    return li;
  }));

  const stepsEl = document.getElementById('recipe-steps');
  stepsEl.replaceChildren(...data.steps.map((text, i) => {
    const li = document.createElement('li');
    li.className = 'flex gap-2';
    const num = document.createElement('span');
    num.className = 'text-yellow-300 shrink-0';
    num.textContent = String(i + 1).padStart(2, '0');
    const body = document.createElement('span');
    body.textContent = text;
    li.append(num, body);
    return li;
  }));

  document.getElementById('recipe-scroll').scrollTop = 0;
  recipeModal.classList.remove('hidden');
  btnRecipeClose.focus();
}

function closeRecipe() {
  recipeModal.classList.add('hidden');
}

btnRecipe.addEventListener('click', () => {
  btnRecipe.blur();
  openRecipe();
});
btnRecipeClose.addEventListener('click', closeRecipe);
recipeModal.addEventListener('click', (e) => {
  if (e.target === recipeModal) closeRecipe(); // clic en el fondo oscuro
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isRecipeOpen()) closeRecipe();
});

// El hub escucha pointer/wheel/touch en window: mientras el recetario está abierto no debe girar ni seleccionar nada detrás
['pointerdown', 'pointerup', 'wheel', 'touchstart', 'touchend'].forEach((evt) => {
  recipeModal.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
});

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

  } else if (recipe.id === 'rhythm') {
    // NODO #02 - Integrante 2
    currentGameInstance = new RhythmPotatoGame(minigameStage, onWinMinigame, bgm);

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
  if (!activeRecipe || isTransitioning || !modal.classList.contains('hidden') || isRecipeOpen()) return;

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

// =========================================================================
// EVENTOS DE SCROLL (PC) Y SWIPE (MÓVIL)
// =========================================================================
let lastScrollTime = 0;
window.addEventListener('wheel', (e) => {
  if (!hasEntered || isRecipeOpen() || !modal.classList.contains('hidden') || isTransitioning) return;
  const now = Date.now();
  if (now - lastScrollTime < 350) return;
  lastScrollTime = now;
  hub.rotateRing(e.deltaY);
});

let touchStartX = 0;
window.addEventListener('touchstart', (e) => {
  if (!hasEntered || isRecipeOpen() || !modal.classList.contains('hidden') || isTransitioning) return;
  touchStartX = e.touches[0].clientX;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (!hasEntered || isRecipeOpen() || !modal.classList.contains('hidden') || isTransitioning) return;
  const deltaX = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(deltaX) > 45) {
    hub.rotateRing(deltaX);
  }
}, { passive: true });