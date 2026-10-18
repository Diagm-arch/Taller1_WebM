// js/game-manager.js

import { FF7Minigame } from './minigames/ff7/game-ff7.js?v=11';
import { BlasphemousPotatoGame } from './minigames/BLASFEPAPA/game-blasfepapa.js?v=11';
import { RhythmPotatoGame } from './minigames/papahero/game-rhythm.js?v=11';
import { startPapaGame, stopPapaGame } from './minigames/tbop/tbop.js?v=11';
import { RECIPES } from './recipes.js?v=11';

export class GameManager {
  constructor({ bgm, onUnlockNode }) {
    this.bgm = bgm;
    this.onUnlockNode = onUnlockNode;

    this.currentGameInstance = null;
    this.transitioning = false;

    // Referencias DOM - Modal de Minijuegos
    this.modal = document.getElementById('minigame-modal');
    this.minigameTitle = document.getElementById('minigame-title');
    this.minigameStage = document.getElementById('minigame-stage');
    this.btnExitGame = document.getElementById('btn-exit-game');
    this.transitionOverlay = document.getElementById('transition-overlay');
    this.webglCanvas = document.getElementById('webgl-canvas');
    this.uiLayer = document.getElementById('ui-layer');

    // Referencias DOM - Modal de Recetas
    this.recipeModal = document.getElementById('recipe-modal');
    this.btnRecipe = document.getElementById('btn-recipe');
    this.btnRecipeClose = document.getElementById('btn-recipe-close');

    this.bindModalEvents();
  }

  get isTransitioning() {
    return this.transitioning;
  }

  isRecipeOpen() {
    return !!this.recipeModal && !this.recipeModal.classList.contains('hidden');
  }

  isMinigameOpen() {
    return !!this.modal && !this.modal.classList.contains('hidden');
  }

  bindModalEvents() {
    if (this.btnExitGame) {
      this.btnExitGame.addEventListener('click', () => this.closeMinigameModal());
    }

    if (this.btnRecipeClose) {
      this.btnRecipeClose.addEventListener('click', () => this.closeRecipe());
    }

    if (this.recipeModal) {
      this.recipeModal.addEventListener('click', (e) => {
        if (e.target === this.recipeModal) this.closeRecipe();
      });

      // Evitar que rotaciones o toques traspasen hacia el Hub 3D
      ['pointerdown', 'pointerup', 'wheel', 'touchstart', 'touchend'].forEach((evt) => {
        this.recipeModal.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isRecipeOpen()) this.closeRecipe();
    });
  }

  openRecipe(recipe, nodeIndex) {
    if (!recipe || !recipe.unlocked) return;
    if (this.isMinigameOpen() || this.transitioning) return;
    const data = RECIPES[recipe.id];
    if (!data) {
      console.warn(`[GameManager] Receta no encontrada para id: ${recipe.id}`);
      return;
    }

    const authorText = recipe.author ? ` — ${recipe.author.toUpperCase()}` : '';
    document.getElementById('recipe-badge').textContent = `RECETA #0${nodeIndex + 1}${authorText}`;
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

    const scrollEl = document.getElementById('recipe-scroll');
    if (scrollEl) scrollEl.scrollTop = 0;
    this.recipeModal.classList.remove('hidden');
    if (this.btnRecipeClose) this.btnRecipeClose.focus();
  }

  closeRecipe() {
    if (this.recipeModal) {
      this.recipeModal.classList.add('hidden');
    }
  }

  destroyCurrentGame() {
    if (this.currentGameInstance && typeof this.currentGameInstance.destroy === 'function') {
      this.currentGameInstance.destroy();
    }
    this.currentGameInstance = null;
    if (this.minigameStage) {
      this.minigameStage.innerHTML = '';
    }
  }

  closeMinigameModal() {
    this.destroyCurrentGame();
    if (this.modal) {
      this.modal.classList.add('hidden');
    }

    if (this.bgm && typeof this.bgm.resume === 'function') {
      this.bgm.resume();
    }
  }

  playFF7BattleTransition(onComplete) {
    if (this.transitioning) return;
    this.transitioning = true;

    const enterSfx = new Audio('./assets/audio/ff7/sfx/batttle-enter.mp3');
    enterSfx.volume = 0.75;
    enterSfx.play().catch(() => {});

    if (this.webglCanvas) this.webglCanvas.classList.add('ff7-warp-active');
    if (this.uiLayer) this.uiLayer.classList.add('ff7-warp-active');
    if (this.transitionOverlay) this.transitionOverlay.classList.add('ff7-overlay-active');

    setTimeout(() => {
      onComplete();

      if (this.webglCanvas) this.webglCanvas.classList.remove('ff7-warp-active');
      if (this.uiLayer) this.uiLayer.classList.remove('ff7-warp-active');

      if (this.transitionOverlay) {
        this.transitionOverlay.style.transition = 'opacity 0.35s ease';
        this.transitionOverlay.style.opacity = '0';

        setTimeout(() => {
          this.transitionOverlay.classList.remove('ff7-overlay-active');
          this.transitionOverlay.style.transition = '';
          this.transitionOverlay.style.opacity = '';
          this.transitioning = false;
        }, 350);
      } else {
        this.transitioning = false;
      }
    }, 1350);
  }

  playPS1EncounterFlash(onComplete) {
    if (this.transitioning) return;
    this.transitioning = true;

    if (this.transitionOverlay) {
      this.transitionOverlay.classList.remove('trigger-encounter');
      void this.transitionOverlay.offsetWidth;
      this.transitionOverlay.classList.add('trigger-encounter');
    }

    setTimeout(() => {
      onComplete();
      this.transitioning = false;
    }, 550);
  }

  startChallenge(recipe, nodeIndex) {
    if (!recipe || this.transitioning || this.isMinigameOpen() || this.isRecipeOpen()) return;

    if (recipe.id !== 'masher' && recipe.id !== 'jacket') {
      if (this.bgm && typeof this.bgm.suspend === 'function') {
        this.bgm.suspend();
      }
    }

    const launch = () => this.launchMinigame(recipe, nodeIndex);

    if (recipe.id === 'ff7') {
      this.playFF7BattleTransition(launch);
    } else {
      this.playPS1EncounterFlash(launch);
    }
  }

  launchMinigame(recipe, nodeIndex) {
    if (!recipe) return;

    this.destroyCurrentGame();

    if (this.minigameTitle) {
      this.minigameTitle.textContent = `DESAFÍO #0${nodeIndex + 1} — ${recipe.author.toUpperCase()}`;
    }
    if (this.modal) {
      this.modal.classList.remove('hidden');
    }

    const onWinMinigame = () => {
      if (typeof this.onUnlockNode === 'function') {
        this.onUnlockNode(nodeIndex);
      }
      this.closeMinigameModal();
    };

    if (recipe.id === 'ff7') {
      this.currentGameInstance = new FF7Minigame(
        this.minigameStage,
        () => {
          this.currentGameInstance = null;
          onWinMinigame();
        },
        () => {
          this.currentGameInstance = null;
          this.closeMinigameModal();
        }
      );
    } else if (recipe.id === 'survivor') {
      this.minigameStage.innerHTML = '<p class="text-yellow-300 text-xl text-center px-4">Minijuego #02 (Survivor) pendiente de integración...</p>';
    } else if (recipe.id === 'rhythm') {
      this.currentGameInstance = new RhythmPotatoGame(this.minigameStage, onWinMinigame, this.bgm);
    } else if (recipe.id === 'masher') {
      if (this.minigameTitle) this.minigameTitle.textContent = 'DESAFÍO #03 — The Binding Of Papa';
      startPapaGame(this.minigameStage, onWinMinigame, this.bgm);
      this.currentGameInstance = {
        destroy: () => stopPapaGame()
      };
    } else if (recipe.id === 'jacket') {
      if (this.minigameTitle) this.minigameTitle.textContent = 'DESAFÍO #04 — PENITENCIA DEL TUBÉRCULO';
      this.currentGameInstance = new BlasphemousPotatoGame(this.minigameStage, onWinMinigame, this.bgm);
    }
  }
}
