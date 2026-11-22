# Guía para agentes de OVERBREAKER

Estas instrucciones se aplican a todo el repositorio. Antes de modificar código, leer el README y los módulos afectados. Mantener esta guía y el README actualizados cuando cambien la estructura o los comandos.

## Objetivo y alcance

OVERBREAKER es un juego de combate rítmico para navegador, con JavaScript, Canvas y módulos ES nativos. Conservar el comportamiento existente salvo que la tarea solicite cambiarlo. Avanzar con cambios acotados y comprobables; evitar reescrituras generales para resolver problemas locales.

El juego no requiere framework, compilación ni dependencias de ejecución. El servidor de desarrollo y las pruebas usan Node.js 22 o posterior. Mantener esa sencillez: introducir dependencias o herramientas nuevas solo cuando resuelvan una necesidad concreta de la tarea y explicar su costo.

## Dónde colocar los cambios

| Ubicación | Responsabilidad |
| --- | --- |
| `src/main.js` | Entrada del navegador; crear la aplicación. Mantenerla mínima. |
| `src/app/application.js` | Componer sistemas, inyectar servicios y conectar eventos. Importarla no debe arrancar el juego. |
| `src/app/` | Estado de la aplicación, modos, bucle, eventos y ciclo de vida. |
| `src/game/` | Combate, notas, combos, decisiones del rival, reglas y balance. |
| `src/audio/` | Reproducción, mezcla, carga y validación de paquetes de audio. |
| `src/rendering/` | Escena, HUD, poses, animación y efectos visuales de Canvas. |
| `src/rendering/styles/` | Estilos de lucha como datos puros (poses, secuencias, alias y reacciones). Un estilo se registra en `fighters.js` y no toca las reglas del combate. |
| `src/ui/` | Teclado, punteros, paneles y configuración de la interfaz. |
| `src/storage/` | Lectura validada de ajustes y persistencia IndexedDB. |
| `styles/` | Estilos; `index.html` conserva la estructura de la página. |
| `scripts/` | Herramientas de desarrollo, incluido el servidor estático. |
| `tests/` | Pruebas automáticas de reglas, servicios y conexión entre sistemas. |

Colocar nuevos módulos junto a la funcionalidad que representan. No volver a acumular archivos sueltos en `src/`, ni introducir lógica del juego en HTML o CSS. Dividir módulos grandes por funcionalidad cuando la tarea lo justifique, sin crear capas vacías o archivos que solo reexportan otros archivos.

## Límites entre sistemas

- Usar importaciones ES explícitas con extensión `.js`; rutas locales dentro de cada carpeta y relativas entre carpetas.
- Mantener `game/rules.js` y `game/config.js` independientes del DOM, Canvas, audio y almacenamiento. Extraer ahí reglas deterministas y valores de balance que deban probarse sin navegador.
- Conservar el patrón de instalación de sistemas: `install(app)` registra funciones y devuelve la inicialización. La composición registra todos los sistemas antes de inicializarlos; respetar las dependencias de ese orden.
- Mantener el estado dentro de una aplicación. No exponer servicios o estado mutable en `window`, ni crear dependencias circulares entre módulos.
- `app` es un contexto heredado compartido, no una razón para añadir acoplamiento nuevo. Reutilizar sus servicios donde corresponda y pasar dependencias concretas al extraer funcionalidades nuevas.
- Emitir solicitudes de sonido y efectos desde combate mediante los eventos existentes; conectar sus suscriptores en la composición. Mantener la entrega síncrona mientras las reglas dependan de ese contrato.
- Los accesos heredados al DOM y a presentación dentro de combate son deuda técnica. Evitar ampliarlos; reducirlos de forma gradual cuando se trabaje en esas funciones. No describir el combate actual como un dominio completamente aislado.
- Pasar el contexto de Canvas a las funciones de dibujo reutilizables. Dibujar luchadores no debe modificar sus poses, estelas ni el contexto global; actualizar la animación fuera del dibujo.

## Invariantes que deben preservarse

- Usar segundos para el tiempo de simulación y las ventanas de acierto. Los temporizadores del navegador y `performance.now()` usan milisegundos; convertir explícitamente al cruzar esos límites.
- Centralizar ventanas de acierto en `game/rules.js` y balance del juego en `game/config.js`. Comprobar la ventana antes de consumir una nota. Cambiar el balance solo como parte de una tarea que lo requiera, con pruebas de sus límites.
- Mantener un tiempo coherente entre notas, controles y música. No descartar silenciosamente tiempo transcurrido ni aplicar cámara lenta solo al reloj de notas. Conservar la pausa ante interrupciones largas y la política de introducciones y derribos.
- Al perder foco o visibilidad, limpiar controles y pausar. Reanudar explícitamente; evitar teclas o punteros atascados.
- Asociar callbacks de partida a su ciclo de vida. Usar el gestor de temporizadores y cancelar tareas obsoletas al reiniciar o volver al menú.
- Liberar las URLs de objetos reemplazadas y detener recursos de audio que dejen de usarse. Reutilizar el servicio existente de sustitución de música.
- Validar tipos, rangos y valores permitidos al recuperar ajustes. Conservar claves y datos existentes; definir migraciones cuando cambie su esquema.
- Reutilizar la conexión IndexedDB y esperar la finalización de las transacciones. Comunicar fallos relevantes sin ocultarlos con `catch` vacíos nuevos.
- Preservar los límites de cantidad, tamaño, expansión y duración de las importaciones y la validación de contenido. El filtro `accept` no sustituye esas comprobaciones. Aplicar presupuestos también durante la descompresión.
- Mantener separados el paquete incluido y los sonidos personales. Los personalizados se aplican después; versionar la clave de caché cuando cambie el paquete. No reemplazar ni regenerar `sonidos.zip` sin que la tarea lo requiera.

## Estilo de código y trabajo

- JavaScript moderno, `const` por defecto y `let` cuando haya reasignación. Mantener el formato existente: dos espacios, punto y coma y comillas dobles en JavaScript.
- Usar nombres descriptivos en código nuevo. No extender abreviaturas heredadas a APIs nuevas; renombrar código existente solo con un alcance claro y actualizando todas sus referencias.
- Mantener la interfaz y la documentación del proyecto en español; seguir los identificadores en inglés del código. Comentar decisiones, unidades y contratos que no sean evidentes.
- Inspeccionar el estado de Git antes de editar. Conservar cambios del usuario ajenos a la tarea y evitar operaciones destructivas o reformateos masivos sin necesidad.
- Resolver decisiones rutinarias con el contexto disponible. Pedir aclaraciones solo cuando falte información que determine el comportamiento o exista una acción fuera del alcance autorizado.
- No añadir servicios externos, telemetría ni envíos de archivos del usuario como consecuencia incidental de un refactor.

## Verificación proporcional al cambio

```sh
npm test
npm run serve
# Abrir http://localhost:8000
```

- Para cambios de código, ejecutar `npm test` y `git diff --check`. Añadir pruebas cuando cambien reglas, límites de importación, persistencia o ciclo de vida; evitar pruebas que solo repitan la implementación.
- Al mover módulos, comprobar importaciones y sintaxis, y que `app/application.js` siga siendo importable sin iniciar la aplicación ni necesitar un DOM al importarla.
- Para cambios del servidor, comprobar HTTP para HTML, JavaScript con MIME de módulo, CSS y ZIP, así como métodos y rutas no permitidos. Mantenerlo local por defecto y sin acceso a archivos fuera de los recursos públicos.
- Para cambios de interfaz, renderizado, controles o reproducción, validar los flujos afectados en un navegador real cuando esté disponible. Usar escritorio y móvil cuando corresponda.
- Los adaptadores de DOM/Canvas de las pruebas comprueban conexión entre sistemas y reglas; no acreditan píxeles, sonido, controles táctiles, latencia ni rendimiento. Si no se dispone de navegador, informar qué validación manual queda pendiente.
- Para cambios solo de documentación, revisar exactitud, rutas, comandos y formato; no hace falta ejecutar pruebas de juego sin cambios de código.

## Entrega y PRs

Describir el problema y el comportamiento resultante, los módulos afectados, la validación realizada y las limitaciones relevantes. Informar fallos o comprobaciones pendientes sin afirmar resultados no medidos.

Mantener los commits centrados en la tarea. Al crear o actualizar un PR autorizado, usar una rama de trabajo y documentar cambios de compatibilidad, por ejemplo requisitos de HTTP o migraciones de almacenamiento. No fusionar ni desplegar como consecuencia implícita de preparar un PR.

La separación actual es una base incremental: aún hay contexto compartido y accesos heredados al DOM. Tampoco existe un mapa de beats, calibración de latencia o planificación anticipada de Web Audio. No dar esos problemas por resueltos solo porque las pruebas automáticas pasen.
