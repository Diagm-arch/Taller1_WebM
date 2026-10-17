import * as THREE from 'three';

export class FF7Models {
  constructor() {
    this.texLoader = new THREE.TextureLoader();
  }

  // Carga una textura real o usa un fallback pixelado de PS1 si el archivo aún no existe
  loadPS1Texture(path, fallbackType) {
    const fallbackTex = this.createProceduralTexture(fallbackType);
    if (!path) return fallbackTex;

    const tex = this.texLoader.load(
      path,
      (loaded) => {
        loaded.magFilter = THREE.NearestFilter;
        loaded.minFilter = THREE.NearestFilter;
        loaded.wrapS = THREE.RepeatWrapping;
        loaded.wrapT = THREE.RepeatWrapping;
      },
      undefined,
      () => {
        // Si no encuentra la imagen en ./assets/textures/, mantiene la textura procedural
      }
    );
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return fallbackTex; // Cambia a `return tex;` cuando coloques tus .jpg en assets/textures/
  }

  // Textura procedural pixelada (Tierra del centro y Pasto/Bosque de los bordes como en la foto)
  createProceduralTexture(type) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');

    if (type === 'arena_floor') {
      // Fondo verde oscuro de borde y círculo de tierra café en el centro (como en FF7)
      ctx.fillStyle = '#2d4c1e';
      ctx.fillRect(0, 0, 64, 64);

      ctx.fillStyle = '#8b6b4a';
      ctx.beginPath();
      ctx.arc(32, 32, 24, 0, Math.PI * 2);
      ctx.fill();

      // Ruido pixelado retro
      for (let i = 0; i < 180; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#73573b' : '#9c7a56';
        ctx.fillRect(10 + Math.random() * 44, 10 + Math.random() * 44, 2, 2);
      }
    } else if (type === 'bark') {
      ctx.fillStyle = '#4a3b2c';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#33281e';
      for (let i = 0; i < 16; i++) {
        ctx.fillRect(i * 4, 0, 2, 64);
      }
    }

    const texture = new THREE.CanvasTexture(c);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  // Crea el Suelo de Batalla, Arbustos y Troncos de Árboles del fondo (como la captura de FF7)
  createBattleEnvironment() {
    const envGroup = new THREE.Group();

    // 1. Suelo con textura
    const floorTex = this.loadPS1Texture('./assets/textures/dirt.jpg', 'arena_floor');
    const floorGeo = new THREE.PlaneGeometry(22, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.9,
      flatShading: true
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    envGroup.add(floor);

    // 2. Línea de Troncos y Arbustos en el borde trasero (Estilo Bosque FF7)
    const barkTex = this.loadPS1Texture('./assets/textures/bark.jpg', 'bark');
    const trunkMat = new THREE.MeshStandardMaterial({ map: barkTex, flatShading: true });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x2e5a1c, roughness: 0.8, flatShading: true });

    for (let x = -10; x <= 10; x += 2.2) {
      // Troncos altos detrás
      const trunkGeo = new THREE.CylinderGeometry(0.45, 0.55, 6, 6);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x + (Math.random() - 0.5) * 0.5, 3, -5.2 - Math.random() * 1.5);
      envGroup.add(trunk);

      // Arbustos verdes delante de los troncos
      const bushGeo = new THREE.DodecahedronGeometry(1.1, 1);
      bushGeo.scale(1.2, 0.85, 0.9);
      const bush = new THREE.Mesh(bushGeo, bushMat);
      bush.position.set(x, 0.7, -4.0 + (Math.random() - 0.5) * 0.4);
      envGroup.add(bush);
    }

    return envGroup;
  }

  // Sombra circular oscura debajo de cada personaje (Clásico de PS1)
  createShadow() {
    const geo = new THREE.CircleGeometry(0.48, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
    const shadow = new THREE.Mesh(geo, mat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    return shadow;
  }

  // Crea una Papa Héroe con ojos simples para que se note hacia dónde mira
 createHeroPotato(tintHex = 0xb48343, role = 'cloud') {
    const wrapper = new THREE.Group(); // Posición en el suelo (contiene la sombra)
    const bodyGroup = new THREE.Group(); // Este subgrupo salta y rota

    // Cuerpo base de la papa
    const geo = new THREE.DodecahedronGeometry(0.42, 1);
    geo.scale(0.9, 1.25, 0.85);
    const mat = new THREE.MeshStandardMaterial({ color: tintHex, roughness: 0.8, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.52;
    bodyGroup.add(mesh);

    // Ojos pixelados mirando hacia la izquierda (-X, donde están los enemigos)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), eyeMat);
    const eye2 = eye1.clone();
    eye1.position.set(-0.34, 0.62, 0.14);
    eye2.position.set(-0.34, 0.62, -0.14);
    bodyGroup.add(eye1, eye2);

    // =====================================================================
    // ACCESORIOS LOW-POLY SEGÚN EL PERSONAJE DE FINAL FANTASY VII
    // =====================================================================
    if (role === 'cloud') {
      // 1. PELO RUBIO PUNTIAGUDO DE CLOUD (Conos poligonales estilo PS1)
      const hairMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5, flatShading: true });
      const spikes = [
        // [radio, largo, x, y, z, rotX, rotY, rotZ]
        [0.20, 0.55, -0.12, 1.12,  0.00,  0.0, 0.0,  0.55], // Mechón frontal clásico hacia adelante
        [0.22, 0.60,  0.10, 1.15,  0.00,  0.0, 0.0, -0.45], // Mechón central alto hacia atrás
        [0.16, 0.45,  0.00, 1.05,  0.22,  0.5, 0.0,  0.10], // Mechón lateral izquierdo
        [0.16, 0.45,  0.00, 1.05, -0.22, -0.5, 0.0,  0.10], // Mechón lateral derecho
        [0.15, 0.42,  0.24, 0.96,  0.00,  0.0, 0.0, -1.00]  // Mechón nuca
      ];
      spikes.forEach(([r, h, x, y, z, rx, ry, rz]) => {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4), hairMat);
        spike.position.set(x, y, z);
        spike.rotation.set(rx, ry, rz);
        bodyGroup.add(spike);
      });

      // 2. BUSTER SWORD (Espada gigante con las 2 ranuras de Materia)
      const swordGroup = new THREE.Group();
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3, flatShading: true });
      const guardMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6, flatShading: true });
      const gripMat  = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, flatShading: true });
      const materiaMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 }); // Brillo verde de Materia

      // Hoja ancha + Punta en diagonal
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.05, 0.05), bladeMat);
      blade.position.y = 0.52;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.35, 4), bladeMat);
      tip.scale.set(1, 1, 0.3);
      tip.rotation.y = Math.PI / 4;
      tip.position.y = 1.22;

      // Los 2 agujeros de Materia clásicos de la Buster Sword
      const matSlot1 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), materiaMat);
      matSlot1.position.set(0, 0.22, 0);
      const matSlot2 = matSlot1.clone();
      matSlot2.position.set(0, 0.36, 0);

      // Guardamano dorado y empuñadura roja
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.1), guardMat);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.32, 6), gripMat);
      grip.position.y = -0.18;

      swordGroup.add(blade, tip, matSlot1, matSlot2, guard, grip);
      // Posicionada al costado lista para el combate
      swordGroup.position.set(-0.15, 0.55, 0.42);
      swordGroup.rotation.set(0.25, 0.1, 0.75);
      bodyGroup.add(swordGroup);
      bodyGroup.userData.weapon = swordGroup;
      bodyGroup.userData.weaponRestPos = swordGroup.position.clone();
      bodyGroup.userData.weaponRestRot = swordGroup.rotation.clone();

    } else if (role === 'barret') {
      // 1. CORTE DE PELO PLANO (FLAT-TOP) Y BARBA DE BARRET
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, flatShading: true });
      const flatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.22, 8), hairMat);
      flatTop.position.set(0, 0.96, 0);
      bodyGroup.add(flatTop);

      // Barba / Candado oscuro alrededor de la mandíbula
      const beard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.28), hairMat);
      beard.position.set(-0.32, 0.38, 0);
      bodyGroup.add(beard);

      // 2. BRAZO AMETRALLADORA (GATTLING GUN) EN EL LADO DERECHO
      const gunGroup = new THREE.Group();
      const metalDark = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.7, roughness: 0.3, flatShading: true });
      const metalLight = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, metalness: 0.8, roughness: 0.2, flatShading: true });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6, flatShading: true });

      // Base metálica del brazo mecánico (cubre el hombro/brazo)
      const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.35, 6), brassMat);
      mount.rotation.z = Math.PI / 2;
      gunGroup.add(mount);

      // Tambor giratorio de la minigun
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.25, 6), metalDark);
      drum.rotation.z = Math.PI / 2;
      drum.position.x = -0.25;
      gunGroup.add(drum);

      // Los 4 cañones de la ametralladora apuntando hacia la izquierda (-X)
      const barrelOffsets = [[0.07, 0.07], [0.07, -0.07], [-0.07, 0.07], [-0.07, -0.07]];
      barrelOffsets.forEach(([yOff, zOff]) => {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 5), metalLight);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(-0.55, yOff, zOff);
        gunGroup.add(barrel);
      });

      // Anillo sujetador en la punta de los cañones
      const muzzleRing = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 6), metalDark);
      muzzleRing.rotation.z = Math.PI / 2;
      muzzleRing.position.x = -0.72;
      gunGroup.add(muzzleRing);

      // Posicionado en su brazo derecho apuntando al enemigo
      gunGroup.position.set(-0.1, 0.52, 0.42);
      bodyGroup.add(gunGroup);
    
      const flashGeo = new THREE.OctahedronGeometry(0.24, 0);
      const flashMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
      muzzleFlash.position.set(-0.92, 0, 0);
      muzzleFlash.visible = false;
      gunGroup.add(muzzleFlash);

      bodyGroup.userData.weapon = gunGroup;
      bodyGroup.userData.muzzleFlash = muzzleFlash;
      bodyGroup.userData.weaponRestPos = gunGroup.position.clone();
      bodyGroup.userData.weaponRestRot = gunGroup.rotation.clone();

    } else if (role === 'tifa') {
      // 1. GUANTES DE BOXEO / ARTES MARCIALES ROJOS CON PLACA METÁLICA (En guardia hacia el enemigo)
      const gloveMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, flatShading: true });
      const cuffMat  = new THREE.MeshStandardMaterial({ color: 0x451a03, flatShading: true });
      const plateMat = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, metalness: 0.8, flatShading: true });

      const createGlove = (zOffset, yOffset, xOffset) => {
        const g = new THREE.Group();
        const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), gloveMat);
        const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.15, 0.15), cuffMat);
        cuff.position.x = 0.14;
        const knucklePlate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.16), plateMat);
        knucklePlate.position.x = -0.15;
        g.add(fist, cuff, knucklePlate);
        g.position.set(xOffset, yOffset, zOffset);
        return g;
      };

      const leftGlove = createGlove(0.36, 0.56, -0.32);
      const rightGlove = createGlove(-0.36, 0.48, -0.20);
      bodyGroup.add(leftGlove, rightGlove);
      bodyGroup.userData.gloves = [leftGlove, rightGlove];
      bodyGroup.userData.glovesRestPos = [leftGlove.position.clone(), rightGlove.position.clone()];

      // 2. CABELLO LARGO OSCURO DE TIFA (Con su clásico mechón en punta de delfín al final)
      const darkHairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, flatShading: true });
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.37, 6, 5), darkHairMat);
      hairCap.position.set(0.06, 0.75, 0);
      const ponytail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 5), darkHairMat);
      ponytail.position.set(0.32, 0.45, 0);
      ponytail.rotation.z = 2.6; // Apuntando hacia abajo con ligera curva
      bodyGroup.add(hairCap, ponytail);
    }

    wrapper.add(this.createShadow());
    wrapper.add(bodyGroup);
    return { wrapper, body: bodyGroup };
  }

  // Crea los 4 Enemigos Low-Poly: Cuchillo, Tenedor, Botella de Aceite y Salero
  createEnemyModel(type) {
    const wrapper = new THREE.Group();
    const bodyGroup = new THREE.Group();

    const metalMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.8, roughness: 0.2, flatShading: true });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, flatShading: true });

    if (type === 'knife') {
      // 1. CUCHILLO DE CHEF
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.12), handleMat);
      handle.position.y = 0.35;
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.1, 4), metalMat);
      blade.scale.set(0.3, 1, 1.2);
      blade.position.y = 1.1;
      bodyGroup.add(handle, blade);

    } else if (type === 'fork') {
      // 2. TENEDOR TRIDENTE
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), metalMat);
      handle.position.y = 0.5;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.42), metalMat);
      base.position.y = 0.9;
      bodyGroup.add(handle, base);

      [-0.16, 0, 0.16].forEach(z => {
        const prong = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), metalMat);
        prong.position.set(0, 1.15, z);
        bodyGroup.add(prong);
      });

    } else if (type === 'oil') {
      // 3. BOTELLA DE ACEITE HIRVIENDO
      const oilMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.2, flatShading: true });
      const capMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, flatShading: true });
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.9, 7), oilMat);
      bottle.position.y = 0.55;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.3, 6), oilMat);
      neck.position.y = 1.1;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 6), capMat);
      cap.position.y = 1.3;
      bodyGroup.add(bottle, neck, cap);

    } else if (type === 'salt') {
      // 4. SALERO CLÁSICO
      const glassMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true });
      const shaker = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.75, 6), glassMat);
      shaker.position.y = 0.45;
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), metalMat);
      top.position.y = 0.82;
      bodyGroup.add(shaker, top);
    }

    wrapper.add(this.createShadow());
    wrapper.add(bodyGroup);
    return { wrapper, body: bodyGroup };
  }
}