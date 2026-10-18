// js/main.js

import { ThreeHub } from './three-hub.js?v=12';
import { AudioManager } from './audio-manager.js?v=12';
import { GameManager } from './game-manager.js?v=12';
import { getVolume, setVolume, onVolumeChange, unlockAudio } from './volume-control.js?v=12';

// 1. MIX DE FONDO (guarda el .mp3 en ./assets/audio/)
const dnbPlaylist = [
  { title: 'DnB Mix', src: './assets/audio/dnb-track-1.mp3' }
];

const bgm = new AudioManager(dnbPlaylist, 3000); // 3 seg de Fade In / Fade Out

// Referencias UI del Hub
const titleEl = document.getElementById('selected-title');
const descEl = document.getElementById('selected-desc');
const btnAction = document.getElementById('btn-action');
const btnRecipe = document.getElementById('btn-recipe');
const btnBgmToggle = document.getElementById('btn-bgm-toggle');
const unlockCounter = document.getElementById('unlock-counter');

let activeNodeIndex = -1;
let activeRecipe = null;

// Inicializar Gestor de Minijuegos y Recetario
const gameManager = new GameManager({
  bgm,
  onUnlockNode: (nodeIndex) => {
    hub.unlockNode(nodeIndex);
    updateUnlockCounterUI();
  }
});

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
    btnRecipe.classList.remove('hidden');
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

// Actualiza el contador de archivos desbloqueados (0 / 4 -> 4 / 4) y estado del botón de prueba
function updateUnlockCounterUI() {
  const unlockedTotal = hub.recipesData.filter(r => r.unlocked).length;
  unlockCounter.textContent = `${unlockedTotal} / ${hub.recipesData.length}`;
  refreshUnlockAllButton();
}

const btnUnlockAll = document.getElementById('btn-unlock-all');
function refreshUnlockAllButton() {
  if (!btnUnlockAll) return;
  const allUnlocked = hub.recipesData.every(r => r.unlocked);
  if (allUnlocked) {
    btnUnlockAll.disabled = true;
    btnUnlockAll.classList.remove('bg-green-800', 'hover:bg-green-700', 'active:bg-green-900');
    btnUnlockAll.classList.add('bg-zinc-800', 'opacity-60', 'cursor-default');
    btnUnlockAll.innerHTML = '<span>✔</span><span>TODO DESBLOQUEADO</span>';
  } else {
    btnUnlockAll.disabled = false;
    btnUnlockAll.classList.add('bg-green-800', 'hover:bg-green-700', 'active:bg-green-900');
    btnUnlockAll.classList.remove('bg-zinc-800', 'opacity-60', 'cursor-default');
    btnUnlockAll.innerHTML = '<span>🔓</span><span>DESBLOQUEAR RECETAS</span>';
  }
}

if (btnUnlockAll) {
  btnUnlockAll.addEventListener('click', (e) => {
    e.stopPropagation();
    hub.unlockAll();
    updateUnlockCounterUI();
  });
}

// Conectar botones de acción y recetario con GameManager
btnAction.addEventListener('click', () => {
  btnAction.blur();
  gameManager.startChallenge(activeRecipe, activeNodeIndex);
});

btnRecipe.addEventListener('click', () => {
  btnRecipe.blur();
  gameManager.openRecipe(activeRecipe, activeNodeIndex);
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
let hasEntered = !bootScreen;
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
    if (bootBar) bootBar.style.width = '100%';
    if (bootStatus) bootStatus.textContent = 'MÚSICA LISTA';
    btnEnter.disabled = false;
    btnEnter.textContent = '▶ TOCA PARA ENTRAR';
  }

  btnEnter.addEventListener('click', () => {
    if (hasEntered) return;
    hasEntered = true;

    unlockAudio();
    tryLockLandscape(true);

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
// CONTROL DE VOLUMEN GLOBAL
// =========================================================================
const btnVolumeToggle = document.getElementById('btn-volume-toggle');
const volumePanel = document.getElementById('volume-panel');
const volumeSlider = document.getElementById('volume-slider');
const volumeValueText = document.getElementById('volume-value-text');
const btnVolumeMute = document.getElementById('btn-volume-mute');

let lastNonZeroVolume = 0.8;

function updateVolumeUI(val) {
  const pct = Math.round(val * 100);
  if (volumeSlider) volumeSlider.value = pct;
  if (volumeValueText) volumeValueText.textContent = `${pct}%`;

  let icon = '🔊';
  if (pct === 0) icon = '🔇';
  else if (pct < 40) icon = '🔈';
  else if (pct < 75) icon = '🔉';

  if (btnVolumeToggle) btnVolumeToggle.textContent = icon;
  if (btnVolumeMute) btnVolumeMute.textContent = icon;
}

// Inicializar con el valor persistido
const initVol = getVolume();
updateVolumeUI(initVol);
if (initVol > 0) lastNonZeroVolume = initVol;

onVolumeChange((vol) => {
  updateVolumeUI(vol);
  if (vol > 0) lastNonZeroVolume = vol;
});

if (volumeSlider) {
  volumeSlider.addEventListener('input', (e) => {
    const val = Number(e.target.value) / 100;
    setVolume(val);
  });
}

if (btnVolumeMute) {
  btnVolumeMute.addEventListener('click', (e) => {
    e.stopPropagation();
    const cur = getVolume();
    if (cur > 0) {
      lastNonZeroVolume = cur;
      setVolume(0);
    } else {
      setVolume(lastNonZeroVolume || 0.8);
    }
  });
}

function toggleVolumePanel(e) {
  if (e) e.stopPropagation();
  if (!volumePanel) return;
  const isClosed = volumePanel.classList.contains('hidden');
  if (isClosed) {
    volumePanel.classList.remove('hidden');
  } else {
    volumePanel.classList.add('hidden');
  }
}

if (btnVolumeToggle) {
  btnVolumeToggle.addEventListener('click', toggleVolumePanel);
}

if (volumePanel) {
  // Evitar que arrastrar el slider en móvil o rotar active el giro 3D del hub
  ['touchstart', 'touchmove', 'touchend', 'wheel', 'pointerdown', 'pointerup', 'click'].forEach((evt) => {
    volumePanel.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
  });

  // Cerrar al hacer clic fuera del panel
  window.addEventListener('click', (e) => {
    if (!volumePanel.classList.contains('hidden')) {
      if (!volumePanel.contains(e.target) && e.target !== btnVolumeToggle) {
        volumePanel.classList.add('hidden');
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !volumePanel.classList.contains('hidden')) {
      volumePanel.classList.add('hidden');
    }
  });
}

function isVolumePanelOpen() {
  return volumePanel && !volumePanel.classList.contains('hidden');
}

// =========================================================================
// GESTIÓN DE ORIENTACIÓN HORIZONTAL (MÓVIL / TABLET)
// =========================================================================
const orientationOverlay = document.getElementById('orientation-overlay');
const btnForceLandscape = document.getElementById('btn-force-landscape');

export function tryLockLandscape(requestFullscreen = false) {
  const isMobile = window.innerWidth <= 920 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isMobile) return;

  const doLock = () => {
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      screen.orientation.lock('landscape').catch(() => {
        // En navegadores que no permitan lock silencioso (ej. Safari), no interrumpe el flujo
      });
    }
  };

  if (requestFullscreen && document.documentElement.requestFullscreen && !document.fullscreenElement) {
    document.documentElement.requestFullscreen()
      .then(doLock)
      .catch(() => doLock());
  } else {
    doLock();
  }
}

if (btnForceLandscape) {
  btnForceLandscape.addEventListener('click', (e) => {
    e.stopPropagation();
    tryLockLandscape(true);
  });
}

if (orientationOverlay) {
  ['touchstart', 'touchmove', 'touchend', 'wheel', 'pointerdown', 'pointerup', 'click'].forEach((evt) => {
    orientationOverlay.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
  });
}

function isPortraitBlocked() {
  // Activo cuando el overlay esté visible según CSS o si el viewport móvil es vertical
  const isNarrowMobile = (window.innerWidth <= 920 || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
  const isPortrait = window.innerHeight > window.innerWidth;
  return isNarrowMobile && isPortrait;
}

// Re-calcular tamaño del canvas 3D y vista cuando se rote la pantalla
window.addEventListener('resize', () => {
  if (!isPortraitBlocked() && hub && typeof hub.setPS1Resolution === 'function') {
    hub.setPS1Resolution();
  }
});
if (screen.orientation) {
  screen.orientation.addEventListener('change', () => {
    if (!isPortraitBlocked() && hub && typeof hub.setPS1Resolution === 'function') {
      hub.setPS1Resolution();
    }
  });
}

// =========================================================================
// EVENTOS DE SCROLL (PC) Y SWIPE (MÓVIL)
// =========================================================================
let lastScrollTime = 0;
window.addEventListener('wheel', (e) => {
  if (!hasEntered || isPortraitBlocked() || isVolumePanelOpen() || gameManager.isRecipeOpen() || gameManager.isMinigameOpen() || gameManager.isTransitioning) return;
  const now = Date.now();
  if (now - lastScrollTime < 350) return;
  lastScrollTime = now;
  hub.rotateRing(e.deltaY);
});

let touchStartX = 0;
window.addEventListener('touchstart', (e) => {
  if (!hasEntered || isPortraitBlocked() || isVolumePanelOpen() || gameManager.isRecipeOpen() || gameManager.isMinigameOpen() || gameManager.isTransitioning) return;
  touchStartX = e.touches[0].clientX;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (!hasEntered || isPortraitBlocked() || isVolumePanelOpen() || gameManager.isRecipeOpen() || gameManager.isMinigameOpen() || gameManager.isTransitioning) return;
  const deltaX = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(deltaX) > 45) {
    hub.rotateRing(deltaX);
  }
});