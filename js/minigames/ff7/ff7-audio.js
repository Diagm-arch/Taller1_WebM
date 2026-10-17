export class FF7Audio {
  constructor() {
    this.bgm = new Audio('./assets/audio/ff7/bgm/battle1.mp3');
    this.bgm.loop = true;
    this.bgm.volume = 0.45;
    this.victoryBgm = new Audio('./assets/audio/ff7/bgm/victory.mp3');
    this.victoryBgm.loop = false;
    this.victoryBgm.volume = 0.55;

    this.sfxPaths = {
      enter: './assets/audio/ff7/sfx/batttle-enter.mp3',
      back:  './assets/audio/ff7/sfx/curosr-back.mp3',
      error: './assets/audio/ff7/sfx/cursor-error.mp3',
      move:  './assets/audio/ff7/sfx/cursor-move.mp3',
      death: './assets/audio/ff7/sfx/enemy-death.mp3',
      magic: './assets/audio/ff7/sfx/use-magic.mp3',
      hit:     './assets/audio/ff7/sfx/attack-hit.mp3',
      gatling: './assets/audio/ff7/sfx/barret-gun.mp3',
      spell_fire:     './assets/audio/ff7/sfx/magic-fire.mp3',
      spell_ice:      './assets/audio/ff7/sfx/magic-ice.mp3',
      spell_bolt:     './assets/audio/ff7/sfx/magic-bolt.mp3',
      spell_cure:     './assets/audio/ff7/sfx/magic-cure.mp3',
      spell_barrier:  './assets/audio/ff7/sfx/magic-barrier.mp3',
      spell_mbarrier: './assets/audio/ff7/sfx/magic-barrier.mp3'
    };
  }

  playBGM() {
    this.bgm.currentTime = 0;
    this.bgm.play().catch(() => {});
  }
  
  playVictoryBGM() {
    this.bgm.pause();
    this.bgm.currentTime = 0;
    this.victoryBgm.currentTime = 0;
    this.victoryBgm.play().catch(() => {});
  }

  stopBGM() {
    this.bgm.pause();
    this.bgm.currentTime = 0;
    if (this.victoryBgm) {
      this.victoryBgm.pause();
      this.victoryBgm.currentTime = 0;
    }
  }

  playSFX(key) {
    const path = this.sfxPaths[key];
    if (!path) return;
    const sfx = new Audio(path);
    sfx.volume = 0.7;
    sfx.play().catch(() => {});
  }
}