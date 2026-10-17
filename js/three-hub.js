import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ThreeHub {
  constructor(canvasId, onSelectNode, onClickLockedNode) {
    this.canvas = document.getElementById(canvasId);
    this.onSelectNode = onSelectNode;
    this.onClickLockedNode = onClickLockedNode;
    this.gltfLoader = new GLTFLoader(); // Listo por si quieren cargar archivos .glb de Blender

    this.recipesData = [
      {
        id: 'ff7',
        author: 'Integrante 1 (Tú)',
        lockedName: '??? [ARCHIVO ENCRIPTADO #01]',
        unlockedName: 'PAPAS FRITAS CRUJIENTES',
        lockedDesc: 'Se detecta calor extremo. Haz CLIC en el signo "???" 3D o en el botón para iniciar la batalla RPG.',
        unlockedDesc: 'Bastones de papa cortados con precisión y fritos a 180°C. +99 Ataque Crujiente.',
        unlocked: false,
        modelPath: null // Ej: './assets/models/papas-fritas.glb' si usan Blender después
      },
      {
        id: 'rhythm',
        author: 'Integrante 2',
        lockedName: '??? [ARCHIVO ENCRIPTADO #02]',
        unlockedName: 'HASHBROWNS DORADOS',
        lockedDesc: 'Manten el ritmo para conseguir la receta. ¡Haz clic para entrar al desafío!',
        unlockedDesc: 'Papa rallada compactada en una coraza dorada. +85 Defensa Desayuno.',
        unlocked: false,
        modelPath: null
      },
      {
        id: 'masher',
        author: 'Integrante 3',
        lockedName: '??? [ARCHIVO ENCRIPTADO #03]',
        unlockedName: 'PURÉ CREMOSO SUPREMO',
        lockedDesc: 'Requiere fuerza bruta para romper su estructura molecular. ¡Haz clic para entrar al desafío!',
        unlockedDesc: 'Emulsión suave de papa con mantequilla derretida. +100 Curación de Alma.',
        unlocked: false,
        modelPath: null
      },
      {
        id: 'jacket',
        author: 'Integrante 4',
        lockedName: '??? [ARCHIVO ENCRIPTADO #04]',
        unlockedName: 'JACKET POTATO / PAPA MAYO',
        lockedDesc: 'Señal bloqueada tras una armadura térmica de aluminio. Supera el desafío del Integrante 4.',
        unlockedDesc: 'Papa asada abierta bañada en mayonesa y cebollín. El tanque definitivo.',
        unlocked: false,
        modelPath: null
      }
    ];

    this.nodes = [];
    this.targetRingRotation = 0;
    this.currentRingRotation = 0;
    this.selectedIndex = -1;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.initScene();
    this.createBackgroundEnvironment();
    this.createCentralPotato();
    this.createMysteryNodes();
    this.bindEvents();
    this.animate();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050510, 0.055);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false });
    this.setPS1Resolution();

    const ambientLight = new THREE.AmbientLight(0x505070, 1.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.8);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);
  }

  setPS1Resolution() {
    const pixelFactor = 0.45;
    this.renderer.setSize(window.innerWidth * pixelFactor, window.innerHeight * pixelFactor, false);
  }

  updateCameraPosition() {
    const isMobile = window.innerWidth < 768;
    // En PC desplazamos la cámara un poco a la derecha (x: 1.1) para que la papa quede a la izquierda y no la tape el panel derecho
    this.camera.position.set(isMobile ? 0 : 1.1, isMobile ? 2.6 : 2.2, isMobile ? 8.8 : 6.8);
    this.camera.lookAt(isMobile ? 0 : 0.9, -0.2, 0);
  }

  createBackgroundEnvironment() {
    // 1. Grilla inferior (Suelo cibernético)
    this.gridHelper = new THREE.GridHelper(50, 25, 0x00ffff, 0x1e1b4b);
    this.gridHelper.position.y = -2.4;
    this.scene.add(this.gridHelper);

    // 2. Grilla superior (Techo para dar sensación de túnel de alta velocidad)
    this.topGridHelper = new THREE.GridHelper(50, 25, 0xa855f7, 0x1e1b4b);
    this.topGridHelper.position.y = 4.2;
    this.scene.add(this.topGridHelper);

    // 3. Partículas de velocidad (Viajando en el eje Z hacia la cámara)
    this.particleCount = 300;
    const partGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      // Dejamos un pequeño hueco en el centro para no chocar con la papa
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 14;
      positions[i3] = Math.cos(angle) * radius;     // X
      positions[i3 + 1] = Math.sin(angle) * radius; // Y
      positions[i3 + 2] = -Math.random() * 40 + 5;  // Z (Profundidad del túnel)
    }

    partGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 0.24,
      transparent: true,
      opacity: 0.85
    });

    this.bgParticles = new THREE.Points(partGeo, partMat);
    this.scene.add(this.bgParticles);
  }

  createCentralPotato() {
    const geo = new THREE.DodecahedronGeometry(1.15, 1);
    geo.scale(1, 1.35, 0.9);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
      const noise = 1 + (Math.sin(vx * 3) * Math.cos(vy * 3) * 0.12);
      pos.setXYZ(i, vx * noise, vy * noise, vz * noise);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xb48343,
      roughness: 0.85,
      flatShading: true
    });

    this.centralPotato = new THREE.Mesh(geo, mat);
    this.scene.add(this.centralPotato);
  }

  // =========================================================================
  // GENERADORES DE MODELOS 3D LOW-POLY (Signo "???" y Comidas Desbloqueadas)
  // =========================================================================

  // Crea un signo de interrogación "?" 3D individual en Low-Poly
createSingleQuestionMarkMesh(material) {
    const qGroup = new THREE.Group();
    const depth = 0.24; // Grosor 3D del signo

    // Piezas que arman la silueta clásica de un "?" pixelado/low-poly en 3D: [ancho, alto, x, y]
    const blocks = [
      [0.44, 0.16,  0.00,  0.54], // Tope superior horizontal
      [0.16, 0.22, -0.18,  0.38], // Borde izquierdo superior
      [0.16, 0.28,  0.18,  0.35], // Borde derecho superior
      [0.28, 0.16,  0.08,  0.16], // Diagonal hacia el centro
      [0.18, 0.24,  0.00, -0.02], // Palito vertical central
      [0.20, 0.20,  0.00, -0.38]  // Punto inferior del signo "?"
    ];

    blocks.forEach(([w, h, x, y]) => {
      const geo = new THREE.BoxGeometry(w, h, depth);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(x, y, 0);
      qGroup.add(mesh);
    });

    return qGroup;
  }

  // Crea el trío "???" oscurecido con borde rojizo misterioso
  create3DQuestionMarksGroup() {
    const container = new THREE.Group();

    // Material oscuro metálico con sutil brillo carmesí para que destaque contra el fondo negro
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      emissive: 0x7f1d1d,
      roughness: 0.35,
      metalness: 0.6,
      flatShading: true
    });

    const singleQ = this.createSingleQuestionMarkMesh(darkMat);
    singleQ.scale.setScalar(1.35); // Tamaño protagonista
    container.add(singleQ);

    return container;
  }

  // Crea los modelos 3D Low-Poly de cada plato cuando se desbloquean
  createFoodModel3D(recipeId) {
    const foodGroup = new THREE.Group();

    if (recipeId === 'ff7') {
      // 1. PAPAS FRITAS: Cajita roja clásica + bastones amarillos saliendo
      const boxGeo = new THREE.CylinderGeometry(0.45, 0.32, 0.7, 6);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, flatShading: true });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.y = -0.2;
      foodGroup.add(box);

      const fryMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, flatShading: true });
      for (let i = 0; i < 9; i++) {
        const fryGeo = new THREE.BoxGeometry(0.12, 0.75, 0.12);
        const fry = new THREE.Mesh(fryGeo, fryMat);
        const angle = (i / 9) * Math.PI * 2;
        const r = (i % 2 === 0) ? 0.18 : 0.08;
        fry.position.set(Math.cos(angle) * r, 0.25 + (i % 3) * 0.08, Math.sin(angle) * r);
        fry.rotation.z = (Math.random() - 0.5) * 0.3;
        fry.rotation.x = (Math.random() - 0.5) * 0.3;
        foodGroup.add(fry);
      }

    } else if (recipeId === 'rhythm') {
      // 2. HASHBROWNS: Dos tortitas ovaladas doradas y crujientes apiladas
      const hbMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.9, flatShading: true });
      for (let i = 0; i < 2; i++) {
        const hbGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.22, 8);
        hbGeo.scale(1.2, 1, 0.85);
        const hb = new THREE.Mesh(hbGeo, hbMat);
        hb.position.set(i * 0.15 - 0.08, i * 0.26 - 0.1, 0);
        hb.rotation.y = i * 0.6;
        hb.rotation.z = i * 0.15;
        foodGroup.add(hb);
      }

    } else if (recipeId === 'masher') {
      // 3. PURÉ DE PAPAS: Bowl + montaña cremosa + cubito de mantequilla derretida
      const bowlGeo = new THREE.CylinderGeometry(0.68, 0.4, 0.35, 8);
      const bowlMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, flatShading: true });
      const bowl = new THREE.Mesh(bowlGeo, bowlMat);
      bowl.position.y = -0.2;
      foodGroup.add(bowl);

      const mashGeo = new THREE.DodecahedronGeometry(0.55, 1);
      mashGeo.scale(1, 0.7, 1);
      const mashMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, flatShading: true });
      const mash = new THREE.Mesh(mashGeo, mashMat);
      mash.position.y = 0.05;
      foodGroup.add(mash);

      const butterGeo = new THREE.BoxGeometry(0.22, 0.12, 0.22);
      const butterMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, flatShading: true });
      const butter = new THREE.Mesh(butterGeo, butterMat);
      butter.position.set(0, 0.42, 0);
      butter.rotation.set(0.2, 0.4, 0.1);
      foodGroup.add(butter);

    } else {
      // 4. JACKET POTATO / PAPA MAYO: Papa horneada envuelta en aluminio con copo de mayo y cebollín
      const foilGeo = new THREE.DodecahedronGeometry(0.58, 1);
      foilGeo.scale(1.25, 0.85, 0.95);
      const foilMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.7, roughness: 0.3, flatShading: true });
      const foilPotato = new THREE.Mesh(foilGeo, foilMat);
      foodGroup.add(foilPotato);

      const mayoGeo = new THREE.DodecahedronGeometry(0.38, 0);
      const mayoMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
      const mayo = new THREE.Mesh(mayoGeo, mayoMat);
      mayo.position.y = 0.35;
      foodGroup.add(mayo);

      // Trocitos verdes de cebollín/ciboulette encima
      const greenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      for (let i = 0; i < 4; i++) {
        const bit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), greenMat);
        bit.position.set((Math.random() - 0.5) * 0.3, 0.62, (Math.random() - 0.5) * 0.3);
        foodGroup.add(bit);
      }
    }

    return foodGroup;
  }

  // Crear los 4 Nodos Orbitales Iniciales
  createMysteryNodes() {
    this.orbitRing = new THREE.Group();
    this.scene.add(this.orbitRing);

    const radius = 3.6;
    const total = this.recipesData.length;

    this.recipesData.forEach((recipe, index) => {
      const angle = (index / total) * Math.PI * 2;

      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);

      // Hitbox invisible para que sea muy cómodo hacer clic en el signo "???" en celular y PC
      const hitGeo = new THREE.SphereGeometry(0.95, 8, 8);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitbox = new THREE.Mesh(hitGeo, hitMat);
      hitbox.userData = { index, recipeId: recipe.id };

      // Modelo 3D del signo de interrogación triple "???"
      const visualHolder = new THREE.Group();
      const questionMarks3D = this.create3DQuestionMarksGroup();
      visualHolder.add(questionMarks3D);

      nodeGroup.add(hitbox);
      nodeGroup.add(visualHolder);
      this.orbitRing.add(nodeGroup);

      this.nodes.push({ group: nodeGroup, hitbox, visualHolder, angle });
    });
  }

  rotateRing(deltaY) {
    const total = this.recipesData.length;
    const step = (Math.PI * 2) / total;

    if (this.selectedIndex === -1) {
      this.selectedIndex = 0;
      this.targetRingRotation = 0;
    } else if (deltaY > 0) {
      this.selectedIndex = (this.selectedIndex + 1) % total;
      this.targetRingRotation -= step; // Avanza siempre en el mismo sentido
    } else {
      this.selectedIndex = (this.selectedIndex - 1 + total) % total;
      this.targetRingRotation += step; // Retrocede un paso limpio
    }

    this.notifySelection();
  }

  notifySelection() {
    if (this.selectedIndex === -1) return;
    const currentRecipe = this.recipesData[this.selectedIndex];
    this.onSelectNode(currentRecipe, this.selectedIndex);
  }

  // Reemplaza el "???" 3D por el modelo 3D Low-Poly de la comida al ganar el minijuego
  unlockNode(index) {
    const recipe = this.recipesData[index];
    if (!recipe || recipe.unlocked) return;
    recipe.unlocked = true;

    const nodeObj = this.nodes[index];

    // Limpiar el modelo "???" anterior
    nodeObj.visualHolder.clear();

    // Si algún integrante creó un archivo .glb en Blender y lo puso en recipe.modelPath, lo carga:
    if (recipe.modelPath) {
      this.gltfLoader.load(recipe.modelPath, (gltf) => {
        nodeObj.visualHolder.add(gltf.scene);
      });
    } else {
      // De lo contrario, usa nuestro modelo 3D Low-Poly generado por código
      const food3D = this.createFoodModel3D(recipe.id);
      nodeObj.visualHolder.add(food3D);
    }

    this.notifySelection();
  }

  // REQUERIMIENTO 6: Animación desarrollada por el equipo (15% de la nota)
  updateCustomTeamAnimation(time) {
    const retroTime = Math.floor(time * 15) / 15; // Efecto 15 FPS estilo PS1

    this.nodes.forEach((node, idx) => {
      const floatY = Math.sin(retroTime * 2.5 + idx * 1.5) * 0.25;
      node.group.position.y = floatY;

      // Rotación estilo ítem de videojuego noventero
      node.visualHolder.rotation.y = retroTime * 1.4 + idx;
      node.visualHolder.rotation.z = Math.sin(retroTime * 2 + idx) * 0.12;

      const isSelected = idx === this.selectedIndex;
      const pulse = isSelected ? 1.3 + Math.sin(time * 6) * 0.08 : 0.95;
      node.group.scale.setScalar(pulse);
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.updateCameraPosition();
      this.setPS1Resolution();
    });

    let downX = 0;
    let downY = 0;

    window.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
    });

    window.addEventListener('pointerup', (e) => {
      // 1. Si el usuario hizo clic dentro de una caja de la UI o en el modal, ignorar clic 3D
      if (e.target.closest('.ps1-box') || !document.getElementById('minigame-modal').classList.contains('hidden')) {
        return;
      }

      // 2. Si movió el dedo más de 12px, fue un swipe para girar, NO un clic
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 12) return;

      // 3. Coordenadas exactas relativas al canvas
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);

      // ¿Hizo clic en alguno de los 4 nodos?
      const hitboxes = this.nodes.map(n => n.hitbox);
      const intersectsNodes = this.raycaster.intersectObjects(hitboxes, false);

      if (intersectsNodes.length > 0) {
        const clickedIndex = intersectsNodes[0].object.userData.index;
        const step = (Math.PI * 2) / this.recipesData.length;

        const desiredAngle = -clickedIndex * step;
        let diff = (desiredAngle - this.targetRingRotation) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;

        this.selectedIndex = clickedIndex;
        this.targetRingRotation += diff;
        this.notifySelection();
        return;
      }

      // ¿Hizo clic en la Papa Central?
      const intersectPotato = this.raycaster.intersectObject(this.centralPotato, false);
      if (intersectPotato.length > 0) {
        this.centralPotato.scale.set(1.25, 0.8, 1.25);
        this.selectedIndex = -1;
        this.onSelectNode(null, -1);
      }
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const time = performance.now() * 0.001;

    // 1. Rotación constante de la Papa Central
    this.centralPotato.rotation.y += 0.012;
    this.centralPotato.rotation.x = Math.sin(time * 1.2) * 0.12;
    this.centralPotato.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);

    // 2. Interpolación del carrusel orbital (Scroll)
    this.currentRingRotation += (this.targetRingRotation - this.currentRingRotation) * 0.08;
    this.orbitRing.rotation.y = this.currentRingRotation;

    // 3. Animación de fondo de ALTA VELOCIDAD (Estilo DnB 170 BPM)
    const gridSpeed = (time * 12) % 2; // 2 es el tamaño de cada celda (50 / 25)
    this.gridHelper.position.z = gridSpeed;
    this.topGridHelper.position.z = gridSpeed;

    // Mover cada partícula rápidamente hacia la cámara en el eje Z
    const positions = this.bgParticles.geometry.attributes.position.array;
    for (let i = 0; i < this.particleCount; i++) {
      const zIndex = i * 3 + 2;
      positions[zIndex] += 0.45; // Velocidad de viaje hacia adelante

      // Si la partícula pasa detrás de la cámara, la reciclamos al fondo del túnel
      if (positions[zIndex] > 10) {
        positions[zIndex] = -35;
      }
    }
    this.bgParticles.geometry.attributes.position.needsUpdate = true;
    // Giro sutil en espiral del túnel de partículas
    this.bgParticles.rotation.z = time * 0.15;

    // 4. Animación propia del equipo para los nodos
    this.updateCustomTeamAnimation(time);
    this.renderer.render(this.scene, this.camera);
  }
}