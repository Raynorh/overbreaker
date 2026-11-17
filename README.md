# OVERBREAKER

Juego de combate rítmico para PC y móvil, en JavaScript y Canvas, sin dependencias de ejecución ni compilación.

## Ejecutar

Se requiere un servidor HTTP para cargar los módulos ES:

```sh
npm run serve
```

Abrir http://localhost:8000. También se puede usar cualquier servidor de archivos estáticos. Abrir `index.html` mediante `file://` ya no está soportado.

```sh
npm test
```

El servidor y las pruebas requieren Node.js 22 o posterior, sin instalar dependencias. El servidor escucha solo en la máquina local; puedes cambiar el puerto con `PORT=8080 npm run serve`.

## Organización

Los módulos se agrupan por responsabilidad. `src/main.js` es el punto de entrada del navegador; la composición vive en `app/application.js` y puede importarse sin arrancar el juego.

```text
src/
├── main.js
├── app/                # Composición, estado, bucle y servicios de ciclo de vida
│   ├── application.js
│   ├── runtime.js
│   ├── loop.js
│   ├── events.js
│   └── lifecycle.js
├── game/               # Mecánicas, decisiones del rival y balance
│   ├── combat.js
│   ├── ai.js
│   ├── rules.js
│   └── config.js
├── audio/              # Reproducción, carga y validación de archivos
│   ├── audio.js
│   ├── bootstrap.js
│   └── imports.js
├── rendering/          # Canvas, luchadores y efectos visuales
│   ├── renderer.js
│   ├── fighters.js
│   └── effects.js
├── ui/                 # Controles y paneles de configuración
│   ├── controls.js
│   └── interface.js
└── storage/            # Ajustes e IndexedDB
    └── browser-storage.js
```

`index.html` y `styles/game.css` contienen la estructura y los estilos. `scripts/serve.js` sirve los archivos de desarrollo y `tests/` contiene las pruebas.

Los sistemas registran sus funciones antes de inicializarse. `app/application.js` conecta los servicios, los sistemas y los suscriptores de presentación. `app` es el contexto explícito compartido de una aplicación; no se publica en `window`. Las solicitudes de sonido y efectos del combate pasan por `app/events.js`.

Para ampliar el juego:

- Añadir reglas comprobables sin navegador en `game/rules.js` y balance en `game/config.js`.
- Añadir decisiones del rival en `game/ai.js` y progresión de partida en `game/combat.js`.
- Representar los resultados en `rendering/` o `audio/`, y manejar entradas y paneles en `ui/`.
- Mantener la persistencia en `storage/` y conectar nuevos sistemas desde `app/application.js`.

Las dependencias entre carpetas usan importaciones explícitas; los módulos dentro de una carpeta usan rutas locales. Las reglas puras y la configuración no dependen del DOM. La interfaz y algunas mecánicas heredadas todavía comparten contexto y acceden al DOM: ordenar los módulos facilita continuar reduciendo ese acoplamiento por funcionalidad.

## Cambios basados en el análisis

- Anticipación limitada a 350 ms; PERFECT ±65 ms; aceptación tardía hasta 140 ms. Las notas lejanas no se consumen.
- El tiempo jugable consume todo el intervalo del fotograma en pasos de hasta 25 ms. La cámara lenta afecta a la animación; no reduce el reloj de notas ni acelera la música. Una interrupción superior a 250 ms pausa la partida. Introducción y derribos pausan la música mientras detienen las notas.
- Pérdida de foco o pestaña oculta: se limpian controles y se pausa. La reanudación es explícita.
- Los callbacks de final se cancelan al reiniciar o volver al menú.
- HUD y volúmenes restaurados con validación. Dificultad, récord y entorno toleran valores corruptos.
- Las estelas se actualizan con la animación; dibujar un luchador no modifica su estado ni cambia el contexto global.
- URLs de música anteriores revocadas al sustituirlas.
- ZIP limitado a 32 MiB, 128 entradas, 20 MiB por audio, 96 MiB descomprimidos y proporción máxima 150:1. La descompresión se interrumpe si excede el tamaño declarado. Se comprueban firmas de audio; las importaciones nuevas decodificadas se limitan a 10 minutos.
- La carga se inicia tras interacción. El ZIP incluido se almacena como `bundle:v1`, sin guardarlo como sonidos personales. Los sonidos guardados por el usuario se aplican después. Incrementar esta clave cuando cambie el paquete. Las entradas de versiones anteriores se conservan; su origen no puede distinguirse retrospectivamente.
- IndexedDB espera el resultado de cada transacción y reutiliza la conexión.

## Validación y límites

Las pruebas ejecutan reglas, persistencia de ajustes, temporizadores, URLs, el ZIP real y recorridos del juego con adaptadores simulados de DOM y Canvas. Estos adaptadores detectan fallos de conexión entre módulos; no verifican píxeles, sonido ni comportamiento táctil real.

Antes de publicar: comprobar en navegador escritorio y móvil el menú, las seis dificultades, combate y supervivencia, pausa/reanudación, revancha, HUD, reasignación de teclas e importación de audio. No se han medido FPS ni consumo de memoria.

El reloj evita las divergencias concretas por descarte de tiempo y cámara lenta del análisis. La música importada sigue siendo una pista libre: no existe un mapa de beats, calibración de latencia ni un planificador Web Audio con anticipación. Conseguir sincronización musical precisa requiere diseñar esos elementos. El escenario aún se dibuja cada fotograma y no se ha añadido selección de calidad gráfica.
