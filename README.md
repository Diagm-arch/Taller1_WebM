# TALLER 1 WEB MOVIL
## Integrantes:
- Rodrigo Cortés
- Enzo Díaz
- Dan Gomez
- Ulices Ramírez
---

## POTATO DEX — PS1 Demo Disc & Recetario Interactivo

**POTATO DEX** es una aplicación web interactiva inspirada en los discos de demostración (Demo Discs) de la era clásica de **PlayStation 1 (PS1)**. La plataforma combina estética retro, modelado 3D en tiempo real con Three.js, sintetizadores de audio y minijuegos arcade con un propósito gastronómico: **un recetario culinario dedicado exclusivamente a la papa**.

En el Hub Central 3D, cada receta se encuentra inicialmente encriptada bajo un nodo orbital con un misterioso signo **"???"**. Para desbloquear y consultar cada receta completa (con ingredientes, gramajes y paso a paso profesional), el usuario debe superar un minijuego temático basado en un clásico de los videojuegos.

---

### Herramientas de Testeo y Modo Desarrollador

Para facilitar la evaluación, corrección y demostración rápida del proyecto sin necesidad de completar todos los desafíos manualmente:

* **Desbloqueo Instantáneo de Recetas (`[ 🔓 DESBLOQUEAR RECETAS ]`)**:
  * **¿Cómo acceder?**: En la barra superior derecha del Hub, haz clic o toca el icono de volumen/ajustes (**`🔊`**).
  * Dentro del menú desplegable retro, en la sección **`MODO PRUEBA [TEST]`**, encontrarás el botón verde **`[ 🔓 DESBLOQUEAR RECETAS ]`**.
  * Al pulsarlo, se desbloquean inmediatamente los 4 nodos: los modelos 3D cambian a sus respectivas comidas low-poly, el contador pasa a `4 / 4` y todos los botones **`[ 📖 VER RECETA ]`** quedan listos para su lectura.
* **Control de Volumen Global**: En este mismo panel popover puedes regular el volumen maestro de la música y efectos de toda la aplicación mediante un slider con respuesta perceptual.
* **Ganar Test en Minijuegos**: Minijuegos como el de FF7 cuentan con un botón superior `[ ★ GANAR TEST ]` para saltar directamente a la pantalla de victoria y probar la recompensa.
* **Forzado Horizontal en Móviles**: En smartphones y tablets, la web detecta la orientación e incluye un bloqueo visual que solicita girar el dispositivo a formato horizontal (landscape), junto con el botón `[ ⛶ FORZAR HORIZONTAL ]` para fijar pantalla completa.

---

## Desglose de Minijuegos

---

### 1. Final Fantasy VII: Batalla RPG por Turnos (`ff7`)
* **Inspiración**: Representación fiel del sistema de combate clásico de *Final Fantasy VII* (Squaresoft, 1997) adaptado a un universo de tubérculos.
* **Receta asociada**: *Papas Fritas Crujientes* (Doble cocción).
* **Características y Funcionalidades**:
  * **Renderizado 3D con Three.js**: Escenario de batalla con cámara dinámica, modelos low-poly y animaciones recreadas por código (Cloud, Barret y Tifa versión papa enfrentando a una freidora industrial enemiga).
  * **Sistema ATB (Active Time Battle)**: Barras de tiempo individuales que dictan los turnos de acción.
  * **Magia y Habilidades**: Menú desplegable con hechizos elementales como *Fire*, *Bolt*, *Ice* y *Cure*, con consumo de MP y cálculo de debilidades.
  * **Sistema de Limit Break y Tragamonedas de Tifa**: Acumulación de daño para desatar límites especiales, incluyendo la mecánica de rodillo / slots de Tifa.
  * **Efectos Visuales**: Partículas, flashes de daño, sacudidas de cámara (*screen shake*), flotación de números de daño y la clásica transición en espiral vórtice de entrada a combate.
  * **Pantalla de Resultados Adaptativa**: Fanfarria de victoria y pantalla clásica de ganancia de EXP y AP adaptada fluidamente para móviles y monitores de escritorio.

---

### 2. PAPAHERO: Juego de Ritmo (`rhythm`)
* **Inspiración**: El legendario *Guitar Hero* / arcade de ritmo clásico.
* **Receta asociada**: *Hashbrowns Dorados*.
* **Características y Funcionalidades**:
  * **Pista de Notas en Perspectiva**: Riel 2.5D con carriles de colores donde las notas descienden sincronizadas al tempo.
  * **Motor de Precisión y Hit Windows**: Detección de aciertos en timing perfecto, acumulación de rachas de combo, multiplicadores y barra de rendimiento.
  * **Controles Versátiles**: Soporte para teclado en PC (teclas asignadas por carril) y botones táctiles optimizados para pulgares en móviles.
  * **Síntesis y Audio**: Generación de efectos de sonido sintetizados y pistas de audio rítmicas sincronizadas.

---

### 3. The Binding of Papa (`masher`)
* **Inspiración**: *The Binding of Isaac*, pionero de los roguelikes *top-down* y *twin-stick shooters*.
* **Receta asociada**: *Puré Cremoso Supremo*.
* **Características y Funcionalidades**:
  * **Mazmorra y Salas Procedurales**: Exploración habitación por habitación con puertas que se sellan al detectar enemigos y minimapa de cuadrícula.
  * **Físicas y Disparo Direccional**: Control de movimiento en 4 u 8 direcciones y lágrimas/proyectiles de almidón disparados con inercia y colisiones precisas.
  * **Enemigos y Jefe Final**: Oleadas de enemigos menores con patrones de persecución y un combate contra un jefe con barra de salud segmentada.
  * **Power-Ups y Objetos**: Recolección de mejoras que aumentan daño, cadencia de tiro, velocidad y vida máxima.

---

### 4. BLASFEPAPA: Metroidvania Gótico (`jacket`)
* **Inspiración**: Los metroidvanias oscuros y desafiantes como *Blasphemous* y *Hollow Knight*.
* **Receta asociada**: *Jacket Potato / Papa Mayo*.
* **Características y Funcionalidades**:
  * **Plataformas y Acción 2D**: Motor de scroll lateral con físicas de salto, gravedad, plataformas sólidas y plataformas atravesables.
  * **Sistema de Combate Cuerpo a Cuerpo**: Golpes de espada espinosa, sistema de bloqueo/parry con ventana de reacción y *dash* de esquiva con frames de invulnerabilidad.
  * **Ambientación y Arte Gótico**: Paleta de colores lúgubre, diseño sonoro envolvente de dos zonas, templos subterráneos y enemigos penitentes.
  * **Combate de Jefes con Fases**: Patrones de ataque telegrafiados, invocaciones y ejecuciones finales para redimir el tubérculo.

---

## Tecnologías Utilizadas

* **HTML5 & CSS3 Avanzado**: Tailwind CSS + hojas de estilo personalizadas con scanlines CRT, fuentes retro pixeladas y diálogos tipo RPG de PS1.
* **JavaScript ES6+ Modular**: Arquitectura limpia dividida en módulos de gestión (`GameManager`, `AudioManager`, `ThreeHub`, etc.).
* **Three.js**: Renderizado 3D por software con filtro de pixelado por resolución nativa emulando la GPU de la PlayStation original.
* **Web Audio API**: Control de ganancia maestro, crossfade continuo entre pistas, y compatibilidad táctil para navegadores móviles e iOS.
* **Web App Manifest**: Compatibilidad PWA configurada para ejecución a pantalla completa en modo apaisado.
