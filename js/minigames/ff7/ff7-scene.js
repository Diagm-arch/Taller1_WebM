import * as THREE from 'three';
import { FF7Models } from './ff7-models.js';

export class FF7BattleScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.isRunning = true;
    this.lastFrameTime = 0;
    this.modelsBuilder = new FF7Models();

    this.heroes = [];
    this.enemies = [];
    this.dustParticles = [];
    this.castWaves = [];
    this.vfxList = [];
    this.activeChoreography = null;

    this.initScene();
    this.populateBattlefield();
    this.bindResize();

    requestAnimationFrame(() => {
      this.updateResolution();
      this.animate();
    });
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f1f14);
    this.scene.fog = new THREE.FogExp2(0x0f1f14, 0.045);

    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.camera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 100);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false });
    this.updateResolution();

    const ambient = new THREE.AmbientLight(0xffffff, 1.3);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfffbeb, 2.2);
    sun.position.set(4, 10, 6);
    this.scene.add(sun);

    // Agregar el suelo de tierra y el bosque del fondo
    this.scene.add(this.modelsBuilder.createBattleEnvironment());
  }

  updateResolution() {
    if (!this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const aspect = rect.width / rect.height;

    // En PS1 la pantalla completa es 240p. Como el viewport 3D ocupa el 68% superior,
    // 164px de alto interno dan exactamente la densidad de píxeles nativa de 240p en cualquier dispositivo.
    const ps1ViewportHeight = 164;
    const ps1ViewportWidth = Math.round(ps1ViewportHeight * aspect);

    this.renderer.setPixelRatio(1); // Crítico: ignora pantallas Retina/4K para mantener el pixelado crudo
    this.renderer.setSize(ps1ViewportWidth, ps1ViewportHeight, false);

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  populateBattlefield() {
    const heroConfigs = [
      { name: 'PAPA CLOUD',  role: 'cloud',  idleType: 'bored', pos: new THREE.Vector3(2.5, 0, -1.3), color: 0xc28e4c },
      { name: 'PAPA BARRET', role: 'barret', idleType: 'look',  pos: new THREE.Vector3(2.5, 0,  0.0), color: 0x5c3a21 },
      { name: 'PAPA TIFA',   role: 'tifa',   idleType: 'hops',  pos: new THREE.Vector3(2.5, 0,  1.3), color: 0xd4a359 }
    ];

    heroConfigs.forEach((cfg) => {
      const { wrapper, body } = this.modelsBuilder.createHeroPotato(cfg.color, cfg.role);
      wrapper.position.copy(cfg.pos);
      this.scene.add(wrapper);
      this.heroes.push({ ...cfg, wrapper, body, homePos: cfg.pos.clone() });
    });

    // 2. LOS 4 UTENSILIOS ENEMIGOS (Formación a la izquierda)
    const enemyConfigs = [
      { name: 'CUCHILLO CHEF',  type: 'knife', pos: new THREE.Vector3(-3.2, 0, -1.2) },
      { name: 'BOTELLA ACEITE', type: 'oil',   pos: new THREE.Vector3(-4.2, 0, -0.1) },
      { name: 'TENEDOR REAL',   type: 'fork',  pos: new THREE.Vector3(-2.6, 0,  0.7) },
      { name: 'SALERO MORTAL',  type: 'salt',  pos: new THREE.Vector3(-3.7, 0,  1.6) }
    ];

    enemyConfigs.forEach((cfg, idx) => {
      const { wrapper, body } = this.modelsBuilder.createEnemyModel(cfg.type);
      wrapper.position.copy(cfg.pos);
      this.scene.add(wrapper);
      this.enemies.push({ ...cfg, wrapper, body, phase: idx * 1.3 });
    });
  }

  // ANIMACIONES IDLE DE LAS PAPAS Y CÁMARA ESTILO FINAL FANTASY 7
  updateIdleAndCamera(time) {
    
    // Cuantizado ligero a 20 FPS para dar sabor a animación de PS1
    const t = Math.floor(time * 20) / 20;

    // 1. Personalidades de las 3 Papas mientras esperan su turno
    this.heroes.forEach((hero) => {
      if (this.isVictory) {
        const vt = (performance.now() - this.victoryStartTime) / 1000;

        if (hero.role === 'cloud') {
          // CLOUD: Gira su Buster Sword en la mano (0 a 1.6s) y luego la guarda cruzada en su espalda
          const sword = hero.body.userData.weapon;
          if (sword) {
            if (vt < 1.6) {
              // Molinete rápido sobre su cabeza/mano
              sword.position.set(-0.18, 0.95, 0.38);
              sword.rotation.set(vt * 14, 0.2, 0.3);
              hero.body.rotation.y = Math.sin(vt * 4) * 0.12;
            } else {
              // La clava/envaina en su espalda (+X es la espalda porque mira hacia -X)
              const p = Math.min(1, (vt - 1.6) / 0.35);
              sword.position.set(0.26 * p, 0.72, 0.05);
              sword.rotation.set(0.15, Math.PI * 0.5 * p, -2.35); // Inclinada en la espalda con la hoja hacia abajo
              hero.body.rotation.y = -0.2; // Pose orgullosa de perfil
            }
          }

        } else if (hero.role === 'barret') {
          // BARRET: Da saltitos de celebración con su metralleta apuntando al cielo
          const gun = hero.body.userData.weapon;
          hero.body.position.y = Math.abs(Math.sin(vt * 6.5)) * 0.34;
          hero.body.rotation.z = Math.sin(vt * 6.5) * 0.06;
          if (gun) {
            gun.position.set(-0.05, 0.78, 0.42);
            gun.rotation.set(0, 0, -Math.PI / 2.1); // Apuntando los cañones hacia el cielo
          }

        } else if (hero.role === 'tifa') {
          // TIFA: Se estira (levanta los guantes, arquea y alarga el torso hacia atrás respirando hondo)
          const gloves = hero.body.userData.gloves;
          const stretchWave = Math.sin(vt * 2.4); // Ciclo suave de estiramiento
          const stretchUp = Math.max(0, stretchWave);

          // Estira el cuerpo verticalmente y se inclina suavemente hacia atrás
          hero.body.scale.set(1 - stretchUp * 0.06, 1 + stretchUp * 0.14, 1);
          hero.body.rotation.z = -stretchUp * 0.18;
          hero.body.rotation.x = Math.cos(vt * 1.8) * 0.12;

          if (gloves && gloves.length === 2) {
            gloves[0].position.set(-0.15, 0.58 + stretchUp * 0.42,  0.38);
            gloves[1].position.set(-0.15, 0.58 + stretchUp * 0.42, -0.38);
          }
        }
        return;
      }
      if (hero.isAttacking) return;

      // POSTURA DE DEFENSA: Arma o guantes frente al cuerpo protegiéndose
      if (hero.isDefending) {
        hero.body.position.set(0, 0, 0);
        hero.body.rotation.set(0, 0, -0.08);
        hero.body.scale.set(1, 1, 1);

        if (hero.role === 'cloud' && hero.body.userData.weapon) {
          hero.body.userData.weapon.position.set(-0.42, 0.55, 0.0);
          hero.body.userData.weapon.rotation.set(0.15, 0, 0.25); // Espada cruzada al frente
        } else if (hero.role === 'barret' && hero.body.userData.weapon) {
          hero.body.userData.weapon.position.set(-0.38, 0.58, 0.05);
          hero.body.userData.weapon.rotation.set(0, 0.45, 0.35); // Arma atravesada cubriendo el pecho
        } else if (hero.role === 'tifa' && hero.body.userData.gloves) {
          hero.body.userData.gloves[0].position.set(-0.38, 0.68,  0.14); // Guardia alta de boxeo cerrada
          hero.body.userData.gloves[1].position.set(-0.38, 0.68, -0.14);
        }
        return;
      }

      // Restaurar posición original de armas si dejó de defenderse
      if (hero.role === 'cloud' && hero.body.userData.weaponRestPos) {
        hero.body.userData.weapon.position.copy(hero.body.userData.weaponRestPos);
        hero.body.userData.weapon.rotation.copy(hero.body.userData.weaponRestRot);
      } else if (hero.role === 'barret' && hero.body.userData.weaponRestPos) {
        hero.body.userData.weapon.position.copy(hero.body.userData.weaponRestPos);
        hero.body.userData.weapon.rotation.copy(hero.body.userData.weaponRestRot);
      } else if (hero.role === 'tifa' && hero.body.userData.glovesRestPos) {
        hero.body.userData.gloves[0].position.copy(hero.body.userData.glovesRestPos[0]);
        hero.body.userData.gloves[1].position.copy(hero.body.userData.glovesRestPos[1]);
      }

      // ANIMACIONES IDLE NORMALES
      if (hero.idleType === 'hops') {
        hero.body.position.y = Math.abs(Math.sin(t * 5.5)) * 0.28;
        hero.body.rotation.z = Math.sin(t * 5.5) * 0.08;
      } else if (hero.idleType === 'look') {
        hero.body.rotation.y = Math.sin(t * 2.2) * 0.65;
        hero.body.position.y = Math.abs(Math.sin(t * 2.2)) * 0.05;
      } else if (hero.idleType === 'bored') {
        hero.body.rotation.z = Math.sin(t * 1.2) * 0.25 + 0.15;
        const breathe = 1 + Math.sin(t * 1.8) * 0.07;
        hero.body.scale.set(1 / breathe, breathe, 1 / breathe);
      }
    });

    // 2. Movimiento amenazante de los 4 Enemigos (Cuchillo, Tenedor, Aceite, Sal)
    this.enemies.forEach((en) => {
      if (en.isDying) {
        if (en.wrapper.visible) {
          en.deathOpacity -= 0.085; // Se hace transparente rápidamente (a 15 FPS tarda ~0.75s)
          en.body.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material.opacity = Math.max(0, en.deathOpacity);
            }
          });
          // Reducir también la sombra del suelo mientras desaparece
          if (en.wrapper.children[0] && en.wrapper.children[0].material) {
            en.wrapper.children[0].material.opacity = Math.max(0, en.deathOpacity * 0.45);
          }
          if (en.deathOpacity <= 0) {
            en.wrapper.visible = false;
          }
        }
        return;
      }

      en.body.position.y = Math.sin(t * 3 + en.phase) * 0.15 + 0.15;
      en.body.rotation.z = Math.cos(t * 2.5 + en.phase) * 0.12;
    });

    this.updateBattleCamera(time);
  }

  updateBattleCamera(time) {

    if (this.isVictory) {
      const vElapsed = (performance.now() - this.victoryStartTime) / 1000;
      const zoomProgress = Math.min(1, vElapsed / 5.0);

      // Más alejada en -X para abarcar cómodamente a los 3 personajes en línea recta
      const startCamPos = new THREE.Vector3(-2.6, 1.55, 0.0);
      const endCamPos   = new THREE.Vector3(-1.15, 1.25, 0.0);

      this.camera.position.lerpVectors(startCamPos, endCamPos, zoomProgress);
      this.camera.lookAt(2.5, 0.72, 0.0); // Mira perpendicular al centro de la fila (X = 2.5, Z = 0)
      return;
    }
    const setDefaultCamera = () => {
      this.camera.position.set(
        Math.sin(time * 0.35) * 1.2 + 0.4,
        2.6 + Math.cos(time * 0.25) * 0.3,
        6.2 + Math.sin(time * 0.2) * 0.5
      );
      this.camera.lookAt(-0.3, 0.6, 0);
    };

    if (!this.activeChoreography) {
      setDefaultCamera();
      return;
    }

    const c = this.activeChoreography;
    const elapsed = (performance.now() - c.startTime) / 1000;

    // Función auxiliar: Giro suave (~48 grados = 0.84 rad) alrededor del que castea Magia o Limit
    const applyCasterOrbitCamera = (casterPos, progress) => {
      const startAngle = -0.35;
      const sweepAngle = 0.84; // ~48 grados de rotación frontal
      const angle = startAngle + progress * sweepAngle;
      const radius = 2.45;

      this.camera.position.set(
        casterPos.x - Math.cos(angle) * radius, // -cos la sitúa frente a la cara del héroe (que mira hacia -X)
        casterPos.y + 1.35,
        casterPos.z + Math.sin(angle) * radius
      );
      this.camera.lookAt(casterPos.x, casterPos.y + 0.65, casterPos.z);
    };

    // -----------------------------------------------------------------------
    // CASO A: ATAQUE NORMAL DE BARRET -> Sin cambio de cámara (se queda en vista general)
    // -----------------------------------------------------------------------
    if (c.role === 'barret') {
      setDefaultCamera();
      return;
    }

    // -----------------------------------------------------------------------
    // CASO B: CASTEO DE HECHIZOS (Giro de 48° en el caster -> Enfoque al impacto del hechizo)
    // -----------------------------------------------------------------------
    if (c.role === 'cast_sequence') {
      const stepInEnd = 0.20;
      const castEnd = stepInEnd + c.castDuration;

      if (elapsed < castEnd) {
        const p = Math.max(0, (elapsed - stepInEnd) / c.castDuration);
        applyCasterOrbitCamera(c.hero.wrapper.position, p);
      } else {
        // Al terminar el casteo, enfoca de cerca el efecto del hechizo sobre el objetivo
        const tPos = (c.targetUnit || c.hero).wrapper.position;
        this.camera.position.set(tPos.x + 1.8, 1.6, tPos.z + 2.4);
        this.camera.lookAt(tPos.x, 0.75, tPos.z);
      }
      return;
    }

    // -----------------------------------------------------------------------
    // CASO C: ATAQUES FÍSICOS (Cloud, Tifa) Y LIMIT DE TIFA -> Enfoque cercano al impacto
    // -----------------------------------------------------------------------
    if (c.role === 'cloud' || c.role === 'tifa' || c.role === 'limit_tifa') {
      // Si es el Limit de Tifa, durante el casteo inicial (0 a 1.35s) gira alrededor de ella
      if (c.role === 'limit_tifa' && elapsed < 1.35) {
        const p = Math.max(0, (elapsed - 0.20) / 1.15);
        applyCasterOrbitCamera(c.hero.wrapper.position, p);
        return;
      }

      const backstepStart = c.role === 'cloud' ? 0.62 : (c.role === 'tifa' ? 0.92 : 2.65);
      if (elapsed < backstepStart) {
        // Ángulo cercano lateral-frontal centrado en la animación de daño sobre el enemigo
        const ePos = c.enemy.wrapper.position;
        this.camera.position.set(ePos.x + 1.85, 1.35, ePos.z + 2.15);
        this.camera.lookAt(ePos.x + 0.35, 0.68, ePos.z);
      } else {
        setDefaultCamera();
      }
      return;
    }

    // -----------------------------------------------------------------------
    // CASO D: LIMIT BREAK DE BARRET (BIG SHOT) -> Giro en casteo/carga -> Enfoque a explosión
    // -----------------------------------------------------------------------
    if (c.role === 'limit_barret') {
      if (elapsed < 2.25) {
        const p = Math.max(0, (elapsed - 0.20) / 2.05);
        applyCasterOrbitCamera(c.hero.wrapper.position, p);
      } else {
        const ePos = c.enemy.wrapper.position;
        this.camera.position.set(ePos.x + 2.1, 1.5, ePos.z + 2.5);
        this.camera.lookAt(ePos.x, 0.7, ePos.z);
      }
      return;
    }

    // -----------------------------------------------------------------------
    // CASO E: LIMIT BREAK DE CLOUD (CROSS-SLASH) -> 1 Corte de cámara por cada tajo + Explosión
    // -----------------------------------------------------------------------
    if (c.role === 'limit_cloud') {
      const ePos = c.enemy.wrapper.position;

      if (elapsed < 1.35) {
        // 1. Casteo inicial: Órbita de 48° alrededor de Cloud[cite: 5]
        const p = Math.max(0, (elapsed - 0.20) / 1.15);
        applyCasterOrbitCamera(c.hero.wrapper.position, p);

      } else if (elapsed < 1.65) {
        // Salto hacia el enemigo: Toma baja dramática
        this.camera.position.set(ePos.x + 2.4, 0.9, ePos.z + 2.2);
        this.camera.lookAt(ePos.x + 0.5, 0.8, ePos.z);

      } else if (elapsed < 1.95) {
        // CORTE 1 (Palo izquierdo): Cámara desde la IZQUIERDA moviéndose rápido
        const p = (elapsed - 1.65) / 0.30;
        this.camera.position.set(ePos.x + 1.4, 1.1, ePos.z + 1.9 - p * 0.45);
        this.camera.lookAt(ePos.x + 0.25, 0.85, ePos.z);

      } else if (elapsed < 2.25) {
        // CORTE 2 (Caja inferior/derecha): Corte brusco al lado DERECHO
        const p = (elapsed - 1.95) / 0.30;
        this.camera.position.set(ePos.x + 1.4, 1.25, ePos.z - 1.9 + p * 0.45);
        this.camera.lookAt(ePos.x + 0.25, 0.85, ePos.z);

      } else if (elapsed < 2.55) {
        // CORTE 3 (La "X" del kanji): Corte brusco DESDE ARRIBA (Cenital inclinada)
        const p = (elapsed - 2.25) / 0.30;
        this.camera.position.set(ePos.x + 1.5, 3.3 - p * 0.35, ePos.z + 0.3);
        this.camera.lookAt(ePos.x + 0.25, 0.75, ePos.z);

      } else if (elapsed < 3.30) {
        // CORTE 4 Y EXPLOSIÓN: Ángulo diagonal heroico que se queda fijo encima del enemigo
        // para mostrar cómo crece y explota el kanji "凶" junto con el número de daño
        this.camera.position.set(ePos.x + 2.0, 1.45, ePos.z + 1.95);
        this.camera.lookAt(ePos.x + 0.15, 0.85, ePos.z);

      } else {
        setDefaultCamera();
      }
      return;
    }

    // -----------------------------------------------------------------------
    // CASO F: ATAQUE ENEMIGO -> Sigue al enemigo y se bloquea de cerca en el golpe al héroe
    // -----------------------------------------------------------------------
    if (c.role === 'enemy_lunge') {
      const hPos = c.hero.wrapper.position;
      const ePos = c.enemy.wrapper.position;

      if (elapsed < 0.22) {
        // Sigue el arranque del enemigo hacia adelante
        this.camera.position.set(ePos.x + 1.8, 1.5, ePos.z + 2.3);
        this.camera.lookAt(ePos.x, 0.65, ePos.z);
      } else {
        // Se bloquea en un ángulo cercano sobre la papa aliada para mostrar el impacto recibido
        this.camera.position.set(hPos.x - 1.75, 1.35, hPos.z + 1.95);
        this.camera.lookAt(hPos.x, 0.65, hPos.z);
      }
    }
  }

  bindResize() {
    this.resizeHandler = () => this.updateResolution();
    window.addEventListener('resize', this.resizeHandler);
  }

  animate(now = performance.now()) {
    if (!this.isRunning) return;
    requestAnimationFrame((t) => this.animate(t));

    // Bloqueo estricto a 30 FPS (1000ms / 30 = 33.33ms por frame)
    const frameInterval = 1000 / 15;
    const delta = now - this.lastFrameTime;
    if (delta < frameInterval) return;

    // Ajustar el reloj conservando el residuo para que los 30 FPS sean estables
    this.lastFrameTime = now - (delta % frameInterval);

    const time = now * 0.001;
    this.updateIdleAndCamera(time);
    this.updateChoreographyAndDust();
    this.renderer.render(this.scene, this.camera);
  }
  
  getUnitScreenPosition(isEnemy, index) {
    const list = isEnemy ? this.enemies : this.heroes;
    const unit = list[index];
    if (!unit) return { x: 50, y: 50 };

    const pos = new THREE.Vector3();
    unit.wrapper.getWorldPosition(pos);
    pos.y += 1.35; // Apuntar justo arriba de la cabeza del modelo 3D

    pos.project(this.camera);

    return {
      x: (pos.x * 0.5 + 0.5) * 100,
      y: (-(pos.y * 0.5) + 0.5) * 100
    };
  }
  // Genera nubes de polvo Low-Poly en el suelo que se expanden y desaparecen rápido
  spawnDustPuff(position, scaleMultiplier = 1) {
    const geo = new THREE.DodecahedronGeometry(0.18 * scaleMultiplier, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xd6c7b2,
      transparent: true,
      opacity: 0.85
    });
    const puff = new THREE.Mesh(geo, mat);
    puff.position.set(
      position.x + (Math.random() - 0.5) * 0.25,
      0.12,
      position.z + (Math.random() - 0.5) * 0.25
    );
    this.scene.add(puff);
    this.dustParticles.push({
      mesh: puff,
      velY: 0.015 + Math.random() * 0.02,
      grow: 0.06,
      alphaDecay: 0.045
    });
  }

  // Sacude y hace parpadear en blanco/rojo al objetivo cuando recibe el impacto
  triggerTargetHitReaction(unitObj) {
    if (!unitObj || !unitObj.body) return;
    // Mini explosión de contacto reutilizando el sistema de partículas
    this.spawnBurstParticles(unitObj.wrapper.position, [0xffdd55, 0xff7700, 0xffffff], 10, 0.065, 0.11, 0.004);

    const origX = unitObj.body.position.x;
    unitObj.body.position.x = origX + (unitObj.pos.x < 0 ? -0.28 : 0.28);
    setTimeout(() => {
      if (unitObj.body) unitObj.body.position.x = 0;
    }, 140);
  }
  // Inicia la coreografía de ataque físico según quién sea el personaje
  playPhysicalAttack(heroIndex, enemyIndex, callbacks = {}) {
    const hero = this.heroes[heroIndex];
    const enemy = this.enemies[enemyIndex];
    if (!hero || !enemy) {
      if (callbacks.onComplete) callbacks.onComplete();
      return;
    }

    hero.isAttacking = true;
    // Resetear rotaciones y postura del Idle antes de saltar/correr
    hero.body.position.set(0, 0, 0);
    hero.body.rotation.set(0, 0, 0);
    hero.body.scale.set(1, 1, 1);

    // Punto justo frente al enemigo (a la derecha del enemigo mirándolo de frente)
    const strikePos = enemy.wrapper.position.clone().add(new THREE.Vector3(1.15, 0, 0));

    this.activeChoreography = {
      role: hero.role,
      hero,
      enemy,
      startPos: hero.homePos.clone(),
      strikePos,
      startTime: performance.now(),
      lastDustTime: 0,
      gunSoundPlayed: false,
      hitsTriggered: [false, false, false],
      onGunStart: callbacks.onGunStart,
      onImpact: callbacks.onImpact,
      onComplete: callbacks.onComplete
    };
  }

  // Inicia un pequeño embiste cuando un enemigo ataca a una papa
  playEnemyAttack(enemyIndex, heroIndex, callbacks = {}) {
    const enemy = this.enemies[enemyIndex];
    const hero = this.heroes[heroIndex];
    if (!enemy || !hero) {
      if (callbacks.onComplete) callbacks.onComplete();
      return;
    }

    this.activeChoreography = {
      role: 'enemy_lunge',
      enemy,
      hero,
      startPos: enemy.pos.clone(),
      strikePos: enemy.pos.clone().add(new THREE.Vector3(1.1, 0, 0)),
      startTime: performance.now(),
      hitDone: false,
      onImpact: callbacks.onImpact,
      onComplete: callbacks.onComplete
    };
  }
  startVictorySequence() {
    this.isVictory = true;
    this.victoryStartTime = performance.now();
    this.activeChoreography = null;

    this.heroes.forEach((h) => {
      h.isAttacking = false;
      h.isDefending = false;
      h.wrapper.position.copy(h.homePos);
      h.body.position.set(0, 0, 0);
      h.body.rotation.set(0, 0, 0);
      h.body.scale.set(1, 1, 1);
    });
  }

  playEnemyDeath(enemyIndex) {
    const enemy = this.enemies[enemyIndex];
    if (!enemy || enemy.isDying) return;

    enemy.isDying = true;
    enemy.deathOpacity = 1.0;

    // Recorrer las mallas del enemigo (ignorando la sombra del suelo) y teñirlas de rojo brillante
    enemy.body.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.color.setHex(0xff0000);
        if (child.material.emissive) {
          child.material.emissive.setHex(0xcc0000);
        }
        child.material.transparent = true;
        child.material.opacity = 1.0;
      }
    });
  }
  // Activa o desactiva visualmente la guardia de un personaje
  setHeroDefending(heroIndex, isDefending) {
    if (this.heroes[heroIndex]) {
      this.heroes[heroIndex].isDefending = isDefending;
    }
  }

  // Genera un anillo verde controlado (Magia) o un cono de fuego agresivo (Limit Break)
  spawnCastWave(position, castType = 'magic') {
    const isLimit = castType === 'limit';

    // Nacen estrechas en el centro del personaje; en Limit es un cono alto ígneo, en Magia un anillo verde
    const radiusTop = isLimit ? 0.45 : 0.25;
    const radiusBottom = isLimit ? 0.18 : 0.25;
    const height = isLimit ? 1.55 : 0.65;

    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 14, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: isLimit ? 0xffaa00 : 0x66ff44,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const waveMesh = new THREE.Mesh(geo, mat);
    waveMesh.position.set(position.x, isLimit ? 0.75 : 0.45, position.z);
    this.scene.add(waveMesh);

    this.castWaves.push({
      mesh: waveMesh,
      isLimit,
      velY: isLimit ? 0.025 : 0.012,
      expandRate: isLimit ? 1.11 : 1.085, // > 1: Se expande con fuerza hacia afuera del personaje
      fadeRate: isLimit ? 0.048 : 0.036
    });
  }
  spawnBurstParticles(pos, colors, count = 14, speed = 0.09, size = 0.16, gravity = 0.003) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.DodecahedronGeometry(size * (0.7 + Math.random() * 0.5), 0);
      const colorHex = colors[Math.floor(Math.random() * colors.length)];
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.set(pos.x, pos.y + 0.6, pos.z);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const spd = speed * (0.5 + Math.random() * 0.8);

      this.scene.add(p);
      this.vfxList.push({
        type: 'particle',
        mesh: p,
        vx: Math.sin(phi) * Math.cos(theta) * spd,
        vy: Math.cos(phi) * spd + 0.04,
        vz: Math.sin(phi) * Math.sin(theta) * spd,
        gravity,
        fade: 0.032 + Math.random() * 0.015
      });
    }
  }

  playSpellVFX(effectType, isEnemyTarget, unitIndex, onScreenFlash) {
    const list = isEnemyTarget ? this.enemies : this.heroes;
    const unit = list[unitIndex];
    if (!unit) return;
    const pos = unit.wrapper.position;

    if (effectType === 'hit') {
      // Daño físico general: Mini explosión de contacto (reúsa fuego pero más pequeña y breve)
      this.spawnBurstParticles(pos, [0xffdd55, 0xff7700, 0xffffff], 10, 0.065, 0.11, 0.004);

    } else if (effectType === 'fire') {
      // Magia Fuego: Gran explosión ígnea (naranja, amarillo y rojo intenso que envuelve y quema)
      this.spawnBurstParticles(pos, [0xff2200, 0xff7700, 0xffdd00], 34, 0.12, 0.22, -0.001);

    } else if (effectType === 'ice') {
      // Magia Hielo: Aparece un Iceberg low-poly encima del enemigo y a los 0.45s explota en esquirlas
      const iceGeo = new THREE.ConeGeometry(0.65, 1.7, 5);
      const iceMat = new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x0284c7,
        transparent: true,
        opacity: 0.9,
        flatShading: true
      });
      const iceberg = new THREE.Mesh(iceGeo, iceMat);
      iceberg.position.set(pos.x, 0.85, pos.z);
      this.scene.add(iceberg);

      this.vfxList.push({
        type: 'iceberg',
        mesh: iceberg,
        pos: pos.clone(),
        age: 0,
        shatterAt: 16 // Frames antes de estallar
      });

    } else if (effectType === 'bolt') {
      // Magia Bolt: Rayo quebrado que cae del cielo + Flash en pantalla
      if (onScreenFlash) onScreenFlash();

      const boltMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
      });
      const boltGroup = new THREE.Group();
      // 4 segmentos en zigzag desde el cielo (y = 6) hasta el enemigo (y = 0.5)
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.6, 5), boltMat);
        seg.position.set((i % 2 === 0 ? 0.15 : -0.15), 1.0 + i * 1.35, 0);
        seg.rotation.z = (i % 2 === 0 ? 0.22 : -0.22);
        boltGroup.add(seg);
      }
      boltGroup.position.set(pos.x, 0, pos.z);
      this.scene.add(boltGroup);

      // Chispas eléctricas al tocar al enemigo
      this.spawnBurstParticles(pos, [0xfef08a, 0x38bdf8, 0xffffff], 16, 0.11, 0.13, 0.002);

      this.vfxList.push({
        type: 'bolt',
        mesh: boltGroup,
        mat: boltMat,
        fade: 0.06
      });

    } else if (effectType === 'cure') {
      // Magia Cura: Partículas verdes brillantes que suben suavemente sobre el aliado
      this.spawnBurstParticles(pos, [0x4ade80, 0x86efac, 0xd9f99d], 24, 0.05, 0.14, -0.0025);

    } else if (effectType === 'barrier' || effectType === 'mbarrier') {
      // Barrera (Amarilla) / Barrera Mágica (Azul): Pirámide semitransparente girando encima
      const pyrGeo = new THREE.ConeGeometry(0.85, 1.5, 4); // 4 lados = Pirámide exacta
      const pyrColor = effectType === 'barrier' ? 0xfacc15 : 0x38bdf8;
      const pyrMat = new THREE.MeshBasicMaterial({
        color: pyrColor,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const pyramid = new THREE.Mesh(pyrGeo, pyrMat);
      pyramid.position.set(pos.x, 1.35, pos.z);
      this.scene.add(pyramid);

      this.vfxList.push({
        type: 'pyramid',
        mesh: pyramid,
        age: 0,
        maxAge: 28
      });
    }
  }

  // Inicia la animación compartida de Casteo (Paso al frente -> Anillos de luz -> Regreso)
  playCastAnimation(heroIndex, castType = 'magic', callbacks = {}, targetUnit = null) {
    const hero = this.heroes[heroIndex];
    if (!hero) {
      if (callbacks.onComplete) callbacks.onComplete();
      return;
    }

    hero.isAttacking = true;
    hero.body.position.set(0, 0, 0);
    hero.body.rotation.set(0, 0, 0);
    hero.body.scale.set(1, 1, 1);

    const castDuration = castType === 'limit' ? 1.15 : 2.0;

    this.activeChoreography = {
      role: 'cast_sequence',
      castType,
      hero,
      targetUnit: targetUnit || hero, // <-- NUEVO: Objetivo al que enfocará al lanzar el hechizo
      startPos: hero.homePos.clone(),
      role: 'cast_sequence',
      castType,
      hero,
      startPos: hero.homePos.clone(),
      stepPos: hero.homePos.clone().add(new THREE.Vector3(-0.75, 0, 0)),
      startTime: performance.now(),
      castDuration,
      lastWaveTime: 0,
      castSoundPlayed: false,
      effectTriggered: false,
      onCastStart: callbacks.onCastStart,
      onSpellEffect: callbacks.onSpellEffect,
      onComplete: callbacks.onComplete
    };
  }
  playItemAnimation(heroIndex, targetUnit = null, callbacks = {}) {
    const hero = this.heroes[heroIndex];
    if (!hero) {
      if (callbacks.onComplete) callbacks.onComplete();
      return;
    }

    hero.isAttacking = true;
    hero.body.position.set(0, 0, 0);
    hero.body.rotation.set(0, 0, 0);
    hero.body.scale.set(1, 1, 1);

    this.activeChoreography = {
      role: 'cast_sequence',
      castType: 'item',
      hero,
      targetUnit: targetUnit || hero,
      startPos: hero.homePos.clone(),
      stepPos: hero.homePos.clone().add(new THREE.Vector3(-0.75, 0, 0)),
      startTime: performance.now(),
      castDuration: 0.45, // Más corto que un hechizo porque no requiere conjuro
      lastWaveTime: Infinity, // Infinity evita que salgan anillos del suelo al usar ítems
      castSoundPlayed: true,
      effectTriggered: false,
      onSpellEffect: callbacks.onItemEffect,
      onComplete: callbacks.onComplete
    };
  }

  // Crea el Kanji "凶" (kyō) dividido en las 3 partes de los cortes de Cloud
  createKyoKanjiGroup(position) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, // Azul/cian brillante que pasa a blanco/rojo al explotar
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // Corte 1: Palito vertical izquierdo de la caja ( | )
    const stroke1 = new THREE.Group();
    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.12), mat);
    leftBar.position.set(-0.52, 0, 0);
    stroke1.add(leftBar);
    stroke1.visible = false;

    // Corte 2: Palo de abajo y palo de la derecha formando la caja "凵" ( _ | )
    const stroke2 = new THREE.Group();
    const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.12, 0.12), mat);
    bottomBar.position.set(0, -0.52, 0);
    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.12), mat);
    rightBar.position.set(0.52, 0, 0);
    stroke2.add(bottomBar, rightBar);
    stroke2.visible = false;

    // Corte 3: La "X" interior del kanji ( メ )
    const stroke3 = new THREE.Group();
    const diag1 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.95, 0.11), mat);
    diag1.rotation.z = Math.PI / 4;
    const diag2 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.95, 0.11), mat);
    diag2.rotation.z = -Math.PI / 4;
    stroke3.add(diag1, diag2);
    stroke3.visible = false;

    group.add(stroke1, stroke2, stroke3);
    // Lo ubicamos frente al enemigo mirándolo de frente
    group.position.set(position.x + 0.55, 0.85, position.z);
    group.rotation.y = Math.PI / 2;
    this.scene.add(group);

    return { group, stroke1, stroke2, stroke3, mat };
  }

  // Inicia el Limit Break (Primero hace el casteo de fuego de 1.15s y luego el ataque especial)
  playLimitBreak(heroIndex, enemyIndex, options = {}, callbacks = {}) {
    const hero = this.heroes[heroIndex];
    const enemy = this.enemies[enemyIndex];
    if (!hero || !enemy) {
      if (callbacks.onComplete) callbacks.onComplete();
      return;
    }

    hero.isAttacking = true;
    hero.body.position.set(0, 0, 0);
    hero.body.rotation.set(0, 0, 0);
    hero.body.scale.set(1, 1, 1);

    this.activeChoreography = {
      role: `limit_${hero.role}`, // 'limit_cloud', 'limit_barret' o 'limit_tifa'
      hero,
      enemy,
      startPos: hero.homePos.clone(),
      stepPos: hero.homePos.clone().add(new THREE.Vector3(-0.75, 0, 0)),
      strikePos: enemy.wrapper.position.clone().add(new THREE.Vector3(1.15, 0, 0)),
      startTime: performance.now(),
      lastWaveTime: 0,
      lastDustTime: 0,
      castSoundPlayed: false,
      kanjiObj: null,
      energyBall: null,
      hitsTriggered: [false, false, false, false, false],
      tifaMode: options.tifaMode || 'hit', // 'miss' | 'hit' | 'yeah'
      onCastStart: callbacks.onCastStart,
      onSlashSFX: callbacks.onSlashSFX,
      onImpact: callbacks.onImpact,
      onComplete: callbacks.onComplete
    };
  }

  updateChoreographyAndDust() {
    // 1. Actualizar y limpiar partículas de polvo del suelo
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i];
      p.mesh.position.y += p.velY;
      p.mesh.scale.addScalar(p.grow);
      p.mesh.material.opacity -= p.alphaDecay;
      if (p.mesh.material.opacity <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.dustParticles.splice(i, 1);
      }
    }
    for (let i = this.castWaves.length - 1; i >= 0; i--) {
      const w = this.castWaves[i];
      w.mesh.position.y += w.velY;

      w.mesh.scale.x *= w.expandRate;
      w.mesh.scale.z *= w.expandRate;
      w.mesh.rotation.y += 0.12;
      w.mesh.material.opacity -= w.fadeRate;

      if (w.isLimit && w.mesh.material.opacity < 0.55) {
        w.mesh.material.color.setHex(0xff3300);
      }

      if (w.mesh.material.opacity <= 0) {
        this.scene.remove(w.mesh);
        w.mesh.geometry.dispose();
        w.mesh.material.dispose();
        this.castWaves.splice(i, 1);
      }
    }
    for (let i = this.castWaves.length - 1; i >= 0; i--) {
      const w = this.castWaves[i];
      w.mesh.position.y += w.velY;
      w.mesh.scale.x *= w.expandRate;
      w.mesh.scale.z *= w.expandRate;
      w.mesh.rotation.y += 0.14;
      w.mesh.material.opacity -= w.fadeRate;

      if (w.isLimit && w.mesh.material.opacity < 0.55) {
        w.mesh.material.color.setHex(0xff3300);
      }

      if (w.mesh.material.opacity <= 0) {
        this.scene.remove(w.mesh);
        w.mesh.geometry.dispose();
        w.mesh.material.dispose();
        this.castWaves.splice(i, 1);
      }
    }

    // 2. Actualizar efectos de hechizos (Fuego, Iceberg, Rayo, Cura, Pirámide y Daño)
    for (let i = this.vfxList.length - 1; i >= 0; i--) {
      const v = this.vfxList[i];

      if (v.type === 'particle') {
        v.mesh.position.x += v.vx;
        v.mesh.position.y += v.vy;
        v.mesh.position.z += v.vz;
        v.vy -= v.gravity;
        v.mesh.rotation.x += 0.15;
        v.mesh.rotation.y += 0.15;
        v.mesh.material.opacity -= v.fade;
        if (v.mesh.material.opacity <= 0) {
          this.scene.remove(v.mesh);
          v.mesh.geometry.dispose();
          v.mesh.material.dispose();
          this.vfxList.splice(i, 1);
        }

      } else if (v.type === 'iceberg') {
        v.age++;
        v.mesh.rotation.y += 0.08;
        if (v.age >= v.shatterAt) {
          // Explota el iceberg en partículas celestes y azules
          this.spawnBurstParticles(v.pos, [0x7dd3fc, 0x38bdf8, 0x1d4ed8, 0xffffff], 26, 0.11, 0.18, 0.003);
          this.scene.remove(v.mesh);
          v.mesh.geometry.dispose();
          v.mesh.material.dispose();
          this.vfxList.splice(i, 1);
        }

      } else if (v.type === 'bolt') {
        v.mat.opacity -= v.fade;
        if (v.mat.opacity <= 0) {
          this.scene.remove(v.mesh);
          this.vfxList.splice(i, 1);
        }

      } else if (v.type === 'pyramid') {
        v.age++;
        v.mesh.rotation.y += 0.12; // Gira sobre el personaje
        if (v.age > v.maxAge * 0.6) {
          v.mesh.material.opacity -= 0.03; // Se desvanece luego de ser casteada
        }
        if (v.age >= v.maxAge || v.mesh.material.opacity <= 0) {
          this.scene.remove(v.mesh);
          v.mesh.geometry.dispose();
          v.mesh.material.dispose();
          this.vfxList.splice(i, 1);
        }
      }
    }

    if (!this.activeChoreography) return;
    const c = this.activeChoreography;
    const now = performance.now();
    const elapsed = (now - c.startTime) / 1000; // Segundos transcurridos

    // =======================================================================
    // COREOGRAFÍA 1: CLOUD (Dash rasante con polvo + Espada arriba -> Corte -> Backstep limpio)
    // =======================================================================
    if (c.role === 'cloud') {
      const sword = c.hero.body.userData.weapon;
      const dashEnd = 0.38;
      const slashEnd = 0.62;
      const backstepEnd = 0.95;

      if (elapsed < dashEnd) {
        // Fase 1: Pose de salto al frente deslizándose a ras de piso dejando trazo continuo de polvo
        const p = elapsed / dashEnd;
        c.hero.wrapper.position.lerpVectors(c.startPos, c.strikePos, p);
        c.hero.body.position.y = Math.sin(p * Math.PI) * 0.22; // Pequeño brinco rasante
        c.hero.body.rotation.z = 0.18; // Inclinado hacia el enemigo

        // Espada levantada por encima de su cabeza lista para descargar el tajo
        if (sword) {
          sword.position.set(-0.05, 1.15, 0.15);
          sword.rotation.set(0, 0, -0.65);
        }

        // Trazo continuo de polvo en el piso mientras se desplaza
        if (now - c.lastDustTime > 35) {
          this.spawnDustPuff(c.hero.wrapper.position, 0.95);
          c.lastDustTime = now;
        }

      } else if (elapsed < slashEnd) {
        // Fase 2: Llega frente al enemigo y descarga el espadazo vertical
        const p = (elapsed - dashEnd) / (slashEnd - dashEnd);
        c.hero.wrapper.position.copy(c.strikePos);
        c.hero.body.position.y = 0;

        if (sword) {
          sword.position.set(-0.42, 0.55, 0.2);
          sword.rotation.set(0, 0, -0.65 + p * 2.5); // Tajo rápido de arriba hacia abajo
        }

        if (!c.hitsTriggered[0] && p > 0.35) {
          c.hitsTriggered[0] = true;
          this.triggerTargetHitReaction(c.enemy);
          if (c.onImpact) c.onImpact(true);
        }

      } else if (elapsed < backstepEnd) {
        // Fase 3: Backstep rápido (Salto parabólico literal de regreso SIN trazo de polvo)
        const p = (elapsed - slashEnd) / (backstepEnd - slashEnd);
        c.hero.wrapper.position.lerpVectors(c.strikePos, c.startPos, p);
        c.hero.body.position.y = Math.sin(p * Math.PI) * 1.15; // Arco alto de backstep
        c.hero.body.rotation.z = -0.15;

        if (sword) {
          sword.position.copy(c.hero.body.userData.weaponRestPos);
          sword.rotation.copy(c.hero.body.userData.weaponRestRot);
        }

      } else {
        this.finishHeroChoreography(c);
      }

    // =======================================================================
    // COREOGRAFÍA 2: TIFA (Carrera con nubecitas de polvo -> 3 Golpes -> Backstep)
    // =======================================================================
    } else if (c.role === 'tifa') {
      const gloves = c.hero.body.userData.gloves;
      const runEnd = 0.42;
      const comboEnd = 0.92;
      const backstepEnd = 1.22;

      if (elapsed < runEnd) {
        // Fase 1: Corre hacia el enemigo dejando pequeñas nubes de polvo en cada pisada
        const p = elapsed / runEnd;
        c.hero.wrapper.position.lerpVectors(c.startPos, c.strikePos, p);
        c.hero.body.position.y = Math.abs(Math.sin(p * Math.PI * 5)) * 0.18;
        c.hero.body.rotation.z = 0.22;

        if (now - c.lastDustTime > 70) {
          this.spawnDustPuff(c.hero.wrapper.position, 0.7);
          c.lastDustTime = now;
        }

      } else if (elapsed < comboEnd) {
        // Fase 2: Ráfaga de 3 puñetazos/golpes físicos rápidos
        const p = (elapsed - runEnd) / (comboEnd - runEnd);
        c.hero.wrapper.position.copy(c.strikePos);
        c.hero.body.position.y = 0;

        // Alternar los dos guantes golpeando hacia adelante (-X)
        if (gloves && gloves.length === 2) {
          gloves[0].position.x = -0.32 - Math.max(0, Math.sin(p * Math.PI * 6)) * 0.48;
          gloves[1].position.x = -0.20 - Math.max(0, -Math.sin(p * Math.PI * 6)) * 0.48;
        }

        // Disparar el SFX de golpe en cada impacto del combo (el 3er golpe muestra el número de daño final)
        if (!c.hitsTriggered[0] && p >= 0.15) {
          c.hitsTriggered[0] = true;
          this.triggerTargetHitReaction(c.enemy);
          if (c.onImpact) c.onImpact(false);
        }
        if (!c.hitsTriggered[1] && p >= 0.50) {
          c.hitsTriggered[1] = true;
          this.triggerTargetHitReaction(c.enemy);
          if (c.onImpact) c.onImpact(false);
        }
        if (!c.hitsTriggered[2] && p >= 0.82) {
          c.hitsTriggered[2] = true;
          this.triggerTargetHitReaction(c.enemy);
          if (c.onImpact) c.onImpact(true);
        }

      } else if (elapsed < backstepEnd) {
        // Fase 3: Backstep rápido hacia su posición original sin polvo
        const p = (elapsed - comboEnd) / (backstepEnd - comboEnd);
        c.hero.wrapper.position.lerpVectors(c.strikePos, c.startPos, p);
        c.hero.body.position.y = Math.sin(p * Math.PI) * 1.1;

        if (gloves && gloves.length === 2) {
          gloves[0].position.x = -0.32;
          gloves[1].position.x = -0.20;
        }

      } else {
        this.finishHeroChoreography(c);
      }

    // =======================================================================
    // COREOGRAFÍA 3: BARRET (Paso corto al frente -> Disparo Metralleta -> Paso atrás)
    // =======================================================================
    } else if (c.role === 'barret') {
      const gun = c.hero.body.userData.weapon;
      const flash = c.hero.body.userData.muzzleFlash;
      const stepForwardPos = c.startPos.clone().add(new THREE.Vector3(-0.75, 0, 0));

      const stepInEnd = 0.20;
      const fireEnd = 0.78;
      const stepBackEnd = 1.02;

      if (elapsed < stepInEnd) {
        // Fase 1: Da un paso pequeño al frente para plantarse a disparar
        const p = elapsed / stepInEnd;
        c.hero.wrapper.position.lerpVectors(c.startPos, stepForwardPos, p);
        c.hero.body.position.y = Math.sin(p * Math.PI) * 0.14;

      } else if (elapsed < fireEnd) {
        // Fase 2: Dispara su metralleta (SFX de metralleta primero, luego SFX de daño e impacto)
        const p = (elapsed - stepInEnd) / (fireEnd - stepInEnd);

        if (!c.gunSoundPlayed) {
          c.gunSoundPlayed = true;
          if (c.onGunStart) c.onGunStart(); // <-- Llama al SFX exclusivo de metralleta de Barret
        }

        // Retroceso (recoil) rápido del cuerpo y giro del cañón con destello intermitente
        c.hero.wrapper.position.x = stepForwardPos.x + Math.sin(elapsed * 55) * 0.06;
        if (gun) gun.rotation.x += 0.45;
        if (flash) {
          flash.visible = Math.floor(elapsed * 30) % 2 === 0;
          flash.rotation.x += 0.8;
        }

        // A mitad de la ráfaga, las balas impactan al enemigo y suena el SFX de daño normal
        if (!c.hitsTriggered[0] && p >= 0.55) {
          c.hitsTriggered[0] = true;
          this.triggerTargetHitReaction(c.enemy);
          if (c.onImpact) c.onImpact(true);
        }

      } else if (elapsed < stepBackEnd) {
        // Fase 3: Se devuelve dando un paso a su posición original
        if (flash) flash.visible = false;
        const p = (elapsed - fireEnd) / (stepBackEnd - fireEnd);
        c.hero.wrapper.position.lerpVectors(stepForwardPos, c.startPos, p);
        c.hero.body.position.y = Math.sin(p * Math.PI) * 0.12;

      } else {
        if (flash) flash.visible = false;
        this.finishHeroChoreography(c);
      }


    // =======================================================================
    // ATAQUE ENEMIGO (Breve embiste para que el golpe enemigo también tenga feedback)
    // =======================================================================
    } else if (c.role === 'enemy_lunge') {
      const totalDur = 0.55;
      if (elapsed < totalDur) {
        const p = elapsed / totalDur;
        const wave = Math.sin(p * Math.PI);
        c.enemy.wrapper.position.lerpVectors(c.startPos, c.strikePos, wave);
        if (!c.hitDone && p >= 0.5) {
          c.hitDone = true;
          this.triggerTargetHitReaction(c.hero);
          if (c.onImpact) c.onImpact();
        }
      } else {
        c.enemy.wrapper.position.copy(c.startPos);
        this.activeChoreography = null;
        if (c.onComplete) c.onComplete();
      }
    }
    // =======================================================================
    // COREOGRAFÍA COMPARTIDA: MAGIA (2.0s verde) Y LIMIT BREAK (1.15s fuego)
    // =======================================================================
    else if (c.role === 'cast_sequence') {
      const stepInEnd = 0.20;
      const castEnd = stepInEnd + c.castDuration;
      const stepBackEnd = castEnd + 0.25;

      if (elapsed < stepInEnd) {
        // Fase 1: Da un paso al frente (igual que Barret)
        const p = elapsed / stepInEnd;
        c.hero.wrapper.position.lerpVectors(c.startPos, c.stepPos, p);
        c.hero.body.position.y = Math.sin(p * Math.PI) * 0.14;

      } else if (elapsed < castEnd) {
        // Fase 2: Genera anillos de luz sucesivos (y levanta el arma como en la captura de Cloud)
        c.hero.wrapper.position.copy(c.stepPos);
        c.hero.body.position.y = 0;

        if (c.hero.role === 'cloud' && c.hero.body.userData.weapon) {
          c.hero.body.userData.weapon.position.set(-0.05, 1.15, 0.15);
          c.hero.body.userData.weapon.rotation.set(0, 0, -0.55);
        }

        if (!c.castSoundPlayed) {
          c.castSoundPlayed = true;
          if (c.onCastStart) c.onCastStart(); // Dispara "use-magic.mp3" o "limit-cast.mp3"
        }

        // Genera un nuevo anillo grande cerca del personaje mientras el anterior se aleja y achica
        const waveInterval = c.castType === 'limit' ? 160 : 240;
        if (now - c.lastWaveTime > waveInterval) {
          this.spawnCastWave(c.hero.wrapper.position, c.castType);
          c.lastWaveTime = now;
        }

      } else if (elapsed < stepBackEnd) {
        // Fase 3: Termina el casteo -> aplica el efecto/sonido del hechizo y vuelve a su fila
        if (!c.effectTriggered) {
          c.effectTriggered = true;
          if (c.hero.role === 'cloud' && c.hero.body.userData.weaponRestPos) {
            c.hero.body.userData.weapon.position.copy(c.hero.body.userData.weaponRestPos);
            c.hero.body.userData.weapon.rotation.copy(c.hero.body.userData.weaponRestRot);
          }
          if (c.onSpellEffect) c.onSpellEffect();
        }

        const p = (elapsed - castEnd) / (stepBackEnd - castEnd);
        c.hero.wrapper.position.lerpVectors(c.stepPos, c.startPos, p);
        c.hero.body.position.y = Math.sin(p * Math.PI) * 0.12;

      } else {
        this.finishHeroChoreography(c);
      }
    }else if (c.role === 'limit_cloud') {
      const sword = c.hero.body.userData.weapon;
      const castEnd = 1.35;  // Paso al frente + 1.15s de cono de fuego
      const jumpEnd = 1.65;  // Salto hacia el enemigo
      const s1End   = 1.95;  // Corte 1: Palo izquierdo
      const s2End   = 2.25;  // Corte 2: Palo inferior y derecho (caja)
      const s3End   = 2.55;  // Corte 3: La "X" central
      const s4End   = 3.05;  // Corte 4: Kanji crece y explota aplicando el daño 3x
      const backEnd = 3.40;  // Backstep a su posición

      if (elapsed < 0.20) {
        const p = elapsed / 0.20;
        c.hero.wrapper.position.lerpVectors(c.startPos, c.stepPos, p);
      } else if (elapsed < castEnd) {
        c.hero.wrapper.position.copy(c.stepPos);
        if (!c.castSoundPlayed) {
          c.castSoundPlayed = true;
          if (c.onCastStart) c.onCastStart();
        }
        if (now - c.lastWaveTime > 160) {
          this.spawnCastWave(c.hero.wrapper.position, 'limit');
          c.lastWaveTime = now;
        }
      } else if (elapsed < jumpEnd) {
        // Salta frente al enemigo con la espada en alto
        const p = (elapsed - castEnd) / (jumpEnd - castEnd);
        c.hero.wrapper.position.lerpVectors(c.stepPos, c.strikePos, p);
        c.hero.body.position.y = Math.sin(p * Math.PI) * 0.9;
        if (sword) {
          sword.position.set(-0.05, 1.15, 0.15);
          sword.rotation.set(0, 0, -0.65);
        }
        if (!c.kanjiObj) {
          c.kanjiObj = this.createKyoKanjiGroup(c.enemy.wrapper.position);
        }
      } else if (elapsed < s1End) {
        // CORTE 1: Dibuja el palito izquierdo
        const p = (elapsed - jumpEnd) / (s1End - jumpEnd);
        c.hero.body.position.y = 0;
        if (sword) sword.rotation.set(0, 0, -0.65 + p * 2.4);
        if (!c.hitsTriggered[0]) {
          c.hitsTriggered[0] = true;
          c.kanjiObj.stroke1.visible = true;
          if (c.onSlashSFX) c.onSlashSFX();
        }
      } else if (elapsed < s2End) {
        // CORTE 2: Dibuja el palo de abajo y el de la derecha (caja 凵)
        const p = (elapsed - s1End) / (s2End - s1End);
        if (sword) sword.rotation.set(0.6, 0, 1.5 - p * 2.2);
        if (!c.hitsTriggered[1]) {
          c.hitsTriggered[1] = true;
          c.kanjiObj.stroke2.visible = true;
          if (c.onSlashSFX) c.onSlashSFX();
        }
      } else if (elapsed < s3End) {
        // CORTE 3: Dibuja la "X" dentro de la caja (凶 completo)
        const p = (elapsed - s2End) / (s3End - s2End);
        if (sword) sword.rotation.set(-0.6, 0, -0.7 + p * 2.4);
        if (!c.hitsTriggered[2]) {
          c.hitsTriggered[2] = true;
          c.kanjiObj.stroke3.visible = true;
          if (c.onSlashSFX) c.onSlashSFX();
        }
      } else if (elapsed < s4End) {
        // CORTE 4: Último tajo -> el Kanji crece, cambia a rojo/amarillo y EXPLOTA haciendo daño
        const p = (elapsed - s3End) / (s4End - s3End);
        if (sword) sword.rotation.set(0, 0, -0.8 + Math.min(1, p * 2) * 2.5);

        if (c.kanjiObj) {
          const scale = 1 + p * 1.4;
          c.kanjiObj.group.scale.set(scale, scale, scale);
          c.kanjiObj.mat.color.setHex(p > 0.4 ? 0xff4400 : 0xffffff);
        }

        if (!c.hitsTriggered[3] && p >= 0.45) {
          c.hitsTriggered[3] = true;
          if (c.kanjiObj) {
            this.scene.remove(c.kanjiObj.group);
            c.kanjiObj = null;
          }
          // Gran explosión del Kanji + Daño único 3x
          this.spawnBurstParticles(c.enemy.wrapper.position, [0xff2200, 0x38bdf8, 0xfef08a, 0xffffff], 36, 0.14, 0.22, 0.001);
          this.triggerTargetHitReaction(c.enemy);
          if (c.onImpact) c.onImpact(true);
        }
      } else if (elapsed < backEnd) {
        const p = (elapsed - s4End) / (backEnd - s4End);
        c.hero.wrapper.position.lerpVectors(c.strikePos, c.startPos, p);
        c.hero.body.position.y = Math.sin(p * Math.PI) * 1.1;
        if (sword) {
          sword.position.copy(c.hero.body.userData.weaponRestPos);
          sword.rotation.copy(c.hero.body.userData.weaponRestRot);
        }
      } else {
        this.finishHeroChoreography(c);
      }

    // =======================================================================
    // LIMIT BREAK 2: BARRET - BIG SHOT (Casteo -> Carga bola temblando -> Disparo y Explosión)
    // =======================================================================
    } else if (c.role === 'limit_barret') {
      const gun = c.hero.body.userData.weapon;
      const castEnd   = 1.35;
      const chargeEnd = 2.25; // Carga la esfera de energía mientras su brazo tiembla
      const shootEnd  = 2.60; // La esfera viaja a toda velocidad hacia el enemigo
      const backEnd   = 2.95;

      if (elapsed < 0.20) {
        const p = elapsed / 0.20;
        c.hero.wrapper.position.lerpVectors(c.startPos, c.stepPos, p);
      } else if (elapsed < castEnd) {
        c.hero.wrapper.position.copy(c.stepPos);
        if (!c.castSoundPlayed) {
          c.castSoundPlayed = true;
          if (c.onCastStart) c.onCastStart();
        }
        if (now - c.lastWaveTime > 160) {
          this.spawnCastWave(c.hero.wrapper.position, 'limit');
          c.lastWaveTime = now;
        }
      } else if (elapsed < chargeEnd) {
        // Crea y hace crecer la bola de energía en la punta de la Gatling mientras el brazo tiembla
        const p = (elapsed - castEnd) / (chargeEnd - castEnd);
        if (!c.energyBall) {
          const ballGeo = new THREE.DodecahedronGeometry(0.22, 1);
          const ballMat = new THREE.MeshBasicMaterial({ color: 0xff5500, blending: THREE.AdditiveBlending });
          c.energyBall = new THREE.Mesh(ballGeo, ballMat);
          this.scene.add(c.energyBall);
          if (c.onSlashSFX) c.onSlashSFX(); // Sonido de carga/metralleta
        }

        const worldGunTip = c.hero.wrapper.position.clone().add(new THREE.Vector3(-0.95, 0.55, 0.42));
        c.energyBall.position.copy(worldGunTip);
        const s = 0.4 + p * 1.85;
        c.energyBall.scale.set(s, s, s);
        c.energyBall.rotation.y += 0.35;

        // El brazo de Barret y su cuerpo tiemblan por la potencia acumulada
        if (gun) {
          gun.position.y = c.hero.body.userData.weaponRestPos.y + Math.sin(elapsed * 80) * 0.06;
          gun.position.z = c.hero.body.userData.weaponRestPos.z + Math.cos(elapsed * 80) * 0.06;
        }
        c.hero.body.position.x = Math.sin(elapsed * 65) * 0.05;

      } else if (elapsed < shootEnd) {
        // Dispara la esfera gigante hacia el enemigo y explota al impactar
        const p = (elapsed - chargeEnd) / (shootEnd - chargeEnd);
        if (gun) gun.position.copy(c.hero.body.userData.weaponRestPos);

        if (c.energyBall) {
          const startShot = c.stepPos.clone().add(new THREE.Vector3(-0.95, 0.55, 0.42));
          const endShot = c.enemy.wrapper.position.clone().add(new THREE.Vector3(0, 0.6, 0));
          c.energyBall.position.lerpVectors(startShot, endShot, p);
        }

        if (!c.hitsTriggered[0] && p >= 0.85) {
          c.hitsTriggered[0] = true;
          if (c.energyBall) {
            this.scene.remove(c.energyBall);
            c.energyBall.geometry.dispose();
            c.energyBall.material.dispose();
            c.energyBall = null;
          }
          // Gran explosión ígnea del Big Shot + Daño 3.25x
          this.spawnBurstParticles(c.enemy.wrapper.position, [0xff2200, 0xffaa00, 0xfef08a], 38, 0.15, 0.24, 0.001);
          this.triggerTargetHitReaction(c.enemy);
          if (c.onImpact) c.onImpact(true);
        }
      } else if (elapsed < backEnd) {
        const p = (elapsed - shootEnd) / (backEnd - shootEnd);
        c.hero.wrapper.position.lerpVectors(c.stepPos, c.startPos, p);
      } else {
        this.finishHeroChoreography(c);
      }

    // =======================================================================
    // LIMIT BREAK 3: TIFA - SLOTS COMBO (Casteo -> Carrera -> Miss / 3 Hits / 4 Yeahs)
    // =======================================================================
    } else if (c.role === 'limit_tifa') {
      const gloves = c.hero.body.userData.gloves;
      const totalHits = c.tifaMode === 'yeah' ? 4 : (c.tifaMode === 'hit' ? 3 : 0);
      const castEnd  = 1.35;
      const runEnd   = 1.75;
      const comboEnd = c.tifaMode === 'miss' ? 2.15 : (1.75 + totalHits * 0.28);
      const backEnd  = comboEnd + 0.35;

      if (elapsed < 0.20) {
        const p = elapsed / 0.20;
        c.hero.wrapper.position.lerpVectors(c.startPos, c.stepPos, p);
      } else if (elapsed < castEnd) {
        c.hero.wrapper.position.copy(c.stepPos);
        if (!c.castSoundPlayed) {
          c.castSoundPlayed = true;
          if (c.onCastStart) c.onCastStart();
        }
        if (now - c.lastWaveTime > 160) {
          this.spawnCastWave(c.hero.wrapper.position, 'limit');
          c.lastWaveTime = now;
        }
      } else if (elapsed < runEnd) {
        const p = (elapsed - castEnd) / (runEnd - castEnd);
        c.hero.wrapper.position.lerpVectors(c.stepPos, c.strikePos, p);
        c.hero.body.position.y = Math.abs(Math.sin(p * Math.PI * 4)) * 0.2;
        if (now - c.lastDustTime > 70) {
          this.spawnDustPuff(c.hero.wrapper.position, 0.8);
          c.lastDustTime = now;
        }
      } else if (elapsed < comboEnd) {
        const p = (elapsed - runEnd) / (comboEnd - runEnd);
        c.hero.wrapper.position.copy(c.strikePos);

        if (c.tifaMode === 'miss') {
          // Si sacó MISS en la tragamonedas, lanza un golpe en falso y tropieza
          c.hero.body.rotation.z = 0.45;
          if (!c.hitsTriggered[0] && p > 0.3) {
            c.hitsTriggered[0] = true;
            if (c.onImpact) c.onImpact(0, true); // Miss
          }
        } else {
          // Si sacó 2 HIT (3 golpes de 1.25x) o 2 YEAH (4 golpes explosivos de 1.75x)
          if (gloves && gloves.length === 2) {
            gloves[0].position.x = -0.32 - Math.max(0, Math.sin(p * Math.PI * totalHits * 2)) * 0.55;
            gloves[1].position.x = -0.20 - Math.max(0, -Math.sin(p * Math.PI * totalHits * 2)) * 0.55;
          }

          for (let hIdx = 0; hIdx < totalHits; hIdx++) {
            const triggerPoint = (hIdx + 0.5) / totalHits;
            if (!c.hitsTriggered[hIdx] && p >= triggerPoint) {
              c.hitsTriggered[hIdx] = true;
              if (c.tifaMode === 'yeah') {
                this.spawnBurstParticles(c.enemy.wrapper.position, [0xff2200, 0xfacc15, 0xffffff], 18, 0.12, 0.18, 0.002);
              }
              this.triggerTargetHitReaction(c.enemy);
              if (c.onImpact) c.onImpact(hIdx + 1, false);
            }
          }
        }
      } else if (elapsed < backEnd) {
        const p = (elapsed - comboEnd) / (backEnd - comboEnd);
        c.hero.wrapper.position.lerpVectors(c.strikePos, c.startPos, p);
        c.hero.body.position.y = Math.sin(p * Math.PI) * 1.1;
        c.hero.body.rotation.z = 0;
        if (gloves && gloves.length === 2) {
          gloves[0].position.x = -0.32;
          gloves[1].position.x = -0.20;
        }
      } else {
        this.finishHeroChoreography(c);
      }
    }
    
  }
  

  finishHeroChoreography(c) {
    c.hero.wrapper.position.copy(c.startPos);
    c.hero.body.position.set(0, 0, 0);
    c.hero.body.rotation.set(0, 0, 0);
    c.hero.isAttacking = false;
    this.activeChoreography = null;
    if (c.onComplete) c.onComplete();
  }

  destroy() {
    this.isRunning = false;
    window.removeEventListener('resize', this.resizeHandler);
    this.renderer.dispose();
  }
}