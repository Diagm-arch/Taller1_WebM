import { ThreeHub } from './three-hub.js';
import { AudioManager } from './audio-manager.js';

// 1. LISTA DE CANCIONES (Guarda tus archivos .mp3 en ./assets/audio/)
const dnbPlaylist = [
  { title: 'DnB Track 01', src: './assets/audio/dnb-track-1.mp3' },
  { title: 'DnB Track 02', src: './assets/audio/dnb-track-2.mp3' },
  { title: 'DnB Track 03', src: './assets/audio/dnb-track-3.mp3' }
];

const bgm = new AudioManager(dnbPlaylist, 3000); // 3000ms (3 seg) de Fade In / Fade Out

// Referencias UI
const titleEl = document.getElementById('selected-title');
const descEl = document.getElementById('selected-desc');
const btnAction = document.getElementById('btn-action');
const btnBgmToggle = document.getElementById('btn-bgm-toggle');
const btnBgmNext = document.getElementById('btn-bgm-next');

let activeNodeIndex = -1;
let activeRecipe = null;

// Inicializar Hub 3D (Ya no abre ningún popup al hacer clic en los nodos)
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

// Punto de entrada limpio para cuando cada integrante agregue su efecto de transición y minijuego
btnAction.addEventListener('click', () => {
  if (!activeRecipe) return;
  console.log(`Listo para lanzar efecto y minijuego de: ${activeRecipe.id} (Índice: ${activeNodeIndex})`);
  // NOTA: Si quieres probar que el modelo 3D de la comida aparece al desbloquear,
  // puedes descomentar temporalmente la siguiente línea:
  // hub.unlockNode(activeNodeIndex);
});

// Controles de la Radio Atmospheric DnB
// Función para actualizar el texto del botón de música
const updateBgmUI = (track, isPlaying) => {
  btnBgmToggle.textContent = isPlaying ? `[ ♫ ${track.title} ]` : '[ ▶ BGM: OFF ]';
};

// 1. Intentar reproducir apenas carga la página
window.addEventListener('DOMContentLoaded', () => {
  bgm.togglePlay(updateBgmUI);
});

// 2. Desbloqueo automático al primer clic, toque o scroll (si el navegador bloqueó el autoplay inicial)
const unlockAudioOnFirstInteraction = () => {
  if (!bgm.isPlaying) {
    bgm.togglePlay(updateBgmUI);
  }
  // Una vez que ya está sonando, quitamos los detectores temporales
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

// Controles manuales del reproductor en el Header
btnBgmToggle.addEventListener('click', (e) => {
  e.stopPropagation(); // Evita chocar con el detector de primer clic
  const playing = bgm.togglePlay(updateBgmUI);
  if (!playing) btnBgmToggle.textContent = '[ ▶ BGM: OFF ]';
});

btnBgmNext.addEventListener('click', (e) => {
  e.stopPropagation();
  bgm.nextTrack();
});

// Eventos de Scroll (PC) y Swipe (Móvil)
let lastScrollTime = 0;
window.addEventListener('wheel', (e) => {
  const now = Date.now();
  if (now - lastScrollTime < 350) return;
  lastScrollTime = now;
  hub.rotateRing(e.deltaY);
});

let touchStartX = 0;
window.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  const deltaX = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(deltaX) > 45) {
    hub.rotateRing(deltaX);
  }
}, { passive: true });