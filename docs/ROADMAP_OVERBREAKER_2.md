# Hoja de ruta — OVERBREAKER 2.0

> Documento vivo de planificación, seguimiento y traspaso para el propietario del proyecto y agentes de programación.
> Última actualización: 2026-11-17.
> Estado global: **PLANIFICACIÓN INICIADA**. No considerar ninguna funcionalidad como implementada hasta que tenga código, pruebas y validación documentados.

## Cómo usar este documento

- Marcar una tarea como `[x]` solo cuando se cumplan sus criterios de aceptación.
- Usar `[~]` para trabajo en curso y `[ ]` para pendiente.
- No marcar como validada una función solo porque compile o pasen pruebas simuladas.
- Registrar en el historial los cambios de alcance, decisiones técnicas, migraciones y resultados de pruebas.
- Antes de modificar código, leer `AGENTS.md`, `README.md` y los módulos afectados.
- Trabajar en ramas de tarea y PR; no fusionar ni desplegar sin autorización explícita.
- Mantener este documento y `AGENTS.md` sincronizados cuando cambien la arquitectura, los comandos o las reglas de trabajo.

## Objetivo del proyecto

Evolucionar OVERBREAKER desde un juego rítmico de navegador para un jugador hacia una experiencia con perfiles persistentes, estadísticas, historial de combates, ranking PvE global, modo fantasma, PvP online, luchadores con estilos diferenciados y escenarios ampliados.

La evolución debe ser incremental. Preservar las mecánicas existentes salvo que una tarea solicite cambiarlas.

## Reglas de producto acordadas

1. El modo por puntos es una modalidad central y debe tener puntuación visible y persistente.
2. El ranking global de puntos muestra como máximo los 10 mejores jugadores.
3. El ranking conserva **una sola entrada por jugador y modalidad de puntuación**: una nueva partida solo reemplaza su récord si lo supera.
4. Una partida con menos puntos nunca debe borrar un récord superior.
5. Registrar victorias y derrotas totales, separadas por PvE y PvP.
6. Guardar un historial de partidas/combates con fecha, modalidad, rival, resultado y estadísticas relevantes.
7. Las partidas por puntos no se cuentan como victorias ni derrotas; se registran como intentos de puntuación.
8. Un jugador debe conservar su identidad entre sesiones y dispositivos. No usar un nombre visible como identificador único.
9. Los datos globales deben ser compartidos por todos los jugadores y persistir fuera del almacenamiento local del navegador.
10. Nunca confiar ciegamente en una puntuación enviada por el cliente. Diseñar validación y controles anti-trampas proporcionales al modo.

## Decisiones técnicas iniciales

### Persistencia local frente a base de datos

- IndexedDB/localStorage siguen siendo adecuados para ajustes, preferencias y datos locales temporales.
- No sirven como fuente de verdad para un ranking mundial compartido.
- Se necesita un backend o servicio de datos remoto para perfiles, resultados e historial.

### Servicio candidato

**Supabase es el candidato inicial** por ofrecer PostgreSQL administrado, autenticación, API y políticas de acceso (RLS), evitando mantener un servidor propio para la primera versión.

Esta es una decisión de evaluación, no una integración ya aprobada o configurada. Antes de implementar:
- confirmar el plan y límites vigentes;
- elegir el método de autenticación más sencillo para jugadores;
- diseñar RLS para que cada usuario solo pueda modificar sus datos privados;
- evitar exponer claves de servicio en el navegador;
- definir cómo se validan resultados y se protege el ranking;
- probar el flujo completo en un proyecto de desarrollo separado.

No añadir dependencias ni servicios externos hasta aprobar el diseño y explicar sus costos y mantenimiento.

### Modelo de datos conceptual

El diseño físico se definirá en la etapa de arquitectura. Como mínimo, evaluar estas entidades:

- `players`: identidad interna, nombre público único y fechas de creación/actualización.
- `player_stats`: contadores agregados por jugador y modalidad: partidas, victorias, derrotas y empates si se implementan.
- `matches`: historial de partidas: jugador, modalidad, rival, resultado, puntuación, duración, dificultad, fecha y versión de reglas.
- `score_records`: mejor puntuación por jugador y modo de puntuación, con restricción única sobre jugador + modalidad.
- `ghost_runs` (etapa futura): secuencias de entradas/eventos y tiempos necesarios para reproducir una partida, con límites de tamaño y duración.

Los totales de victorias/derrotas deben poder contrastarse con el historial de partidas. Definir transacciones o funciones del lado servidor para evitar dobles conteos cuando una partida se reintente o se envíe dos veces.

## Hoja de objetivos y criterios de aceptación

### Fase 0 — Auditoría y preparación

- [ ] **OB-0001 — Confirmar la línea base modular.**
  - Verificar rama principal, PR de modularización, estructura real, README, AGENTS y scripts.
  - Registrar commit base y cualquier deuda técnica relevante.
  - Aceptación: informe breve con módulos, puntos de entrada, persistencia actual y riesgos.
- [ ] **OB-0002 — Ejecutar validación automatizada.**
  - Ejecutar `npm test` y `git diff --check` en el clon local.
  - Aceptación: resultado real registrado; no sustituir pruebas de navegador por pruebas simuladas.
- [ ] **OB-0003 — Validar juego en navegador.**
  - Probar escritorio y móvil: menú, combate, supervivencia, modo puntos, audio, pausa/reanudación, revancha, controles e importación de audio.
  - Aceptación: checklist con pruebas aprobadas, fallidas y pendientes.
- [ ] **OB-0004 — Completar mapa técnico.**
  - Documentar qué hace cada módulo, sus dependencias y los puntos de extensión.
  - Aceptación: manual técnico vinculado desde README.

### Fase 1 — Diseño de identidad, base de datos y estadísticas (OVERBREAKER 2.0)

- [ ] **OB-0101 — Elegir y configurar el servicio de datos.**
  - Evaluar Supabase como primera opción.
  - Crear proyecto de desarrollo; separar credenciales públicas y secretas.
  - Aceptación: conexión de prueba desde local y documentación de configuración sin secretos en Git.
- [ ] **OB-0102 — Diseñar autenticación e identidad persistente.**
  - Elegir acceso sencillo (por ejemplo, enlace/código por correo o proveedor OAuth).
  - Definir nombre público único, recuperación de acceso y vínculo de identidad.
  - Aceptación: un jugador mantiene el mismo perfil al cerrar sesión y volver a entrar, y no puede suplantar otro perfil.
- [ ] **OB-0103 — Crear esquema y políticas de seguridad.**
  - Crear perfiles, estadísticas, historial y récords.
  - Definir claves foráneas, restricciones únicas, índices y políticas RLS.
  - Aceptación: pruebas de acceso autorizado y rechazo de lectura/escritura indebida.
- [ ] **OB-0104 — Registrar resultados PvE.**
  - Registrar victoria/derrota al finalizar un combate PvE, una sola vez por partida.
  - Guardar rival/dificultad, resultado, fecha, duración y métricas disponibles.
  - Aceptación: reiniciar, volver atrás o reenviar el cierre no duplica resultados.
- [ ] **OB-0105 — Registrar modo por puntos.**
  - Guardar cada intento y actualizar el mejor récord del jugador solo cuando la nueva puntuación sea superior.
  - Mantener la modalidad de puntos separada de victorias/derrotas.
  - Aceptación: un intento inferior no reemplaza el récord y no incrementa victorias ni derrotas.
- [ ] **OB-0106 — Implementar perfil y estadísticas.**
  - Mostrar victorias PvE, derrotas PvE, victorias PvP, derrotas PvP, partidas jugadas y récords.
  - Calcular porcentajes con denominadores correctos; no dividir por cero.
  - Aceptación: totales coinciden con los resultados guardados.
- [ ] **OB-0107 — Implementar historial de combates.**
  - Mostrar partidas recientes con fecha, modo, rival, resultado y puntuación.
  - Incluir paginación o carga progresiva; no descargar todo el historial de una vez.
  - Aceptación: el jugador solo ve su historial privado y puede consultar páginas anteriores.
- [ ] **OB-0108 — Implementar ranking PvE global Top 10.**
  - Mostrar puesto, nombre público y puntuación.
  - Una entrada por jugador y modalidad de puntuación.
  - Desempates con regla explícita y estable.
  - Aceptación: todos los jugadores consultan los mismos 10 primeros; un jugador no ocupa varias posiciones en la misma modalidad.
- [ ] **OB-0109 — Proteger y validar puntuaciones.**
  - Evaluar límites, frecuencia de envíos, duplicados, versión del juego y anomalías.
  - No incluir claves privilegiadas en JavaScript del navegador.
  - Aceptación: el cliente no puede modificar directamente el récord de otro jugador ni enviar una puntuación sin controles.
- [ ] **OB-0110 — Documentar configuración y recuperación.**
  - Explicar variables locales, despliegue, migraciones, copias/exportación y qué hacer si el servicio no está disponible.
  - Aceptación: una persona puede configurar el entorno siguiendo el manual sin compartir secretos.

### Fase 2 — Controles y experiencia de juego

- [ ] **OB-0201 — Revisar personalización actual de teclado.**
  - Confirmar reasignación, persistencia, teclas duplicadas y restablecimiento.
  - Aceptación: no se pierden controles existentes.
- [ ] **OB-0202 — Diseñar controles táctiles configurables.**
  - Evaluar disposición 3×2, tamaño, separación, posición y modo zurdo.
  - Aceptación: los botones no tapan notas ni HUD y se prueban en pantallas pequeñas.
- [ ] **OB-0203 — Definir interfaz común de entrada.**
  - Unificar teclado, tacto y futuro mando sin duplicar reglas de combate.
  - Aceptación: cada dispositivo produce las mismas acciones lógicas.

### Fase 3 — Animación y estilos de luchador

- [ ] **OB-0301 — Diseñar sistema de acciones y estados de animación.**
  - Separar actualización de animación y dibujo.
  - Definir preparación, ataque, impacto, recuperación, defensa y reacción.
  - Aceptación: el dibujo no modifica estado de combate ni poses.
- [ ] **OB-0302 — Crear repertorio base de movimientos.**
  - Asociar movimientos y reacciones a las acciones actuales de los carriles.
  - Aceptación: cada acción tiene feedback visual legible y no tapa notas/HUD.
- [ ] **OB-0303 — Crear arquitectura de estilos de combate.**
  - Diseñar perfiles de movimientos, parámetros y reglas compartidas.
  - Estilos previstos: boxeo, karate, taekwondo, judo y capoeira.
  - Aceptación: agregar un estilo no exige duplicar el motor de combate.
- [ ] **OB-0304 — Implementar selección de luchador/estilo.**
  - Mantener equilibrio y legibilidad competitiva.
  - Aceptación: selección persistente y reglas de estilo documentadas.

### Fase 4 — Modo Fantasma

- [ ] **OB-0401 — Definir formato de grabación.**
  - Registrar entradas, tiempos de simulación, versión de reglas y resultado.
  - Establecer límites de tamaño y duración.
  - Aceptación: una partida se puede serializar y validar sin grabar vídeo.
- [ ] **OB-0402 — Reproducir fantasma determinista.**
  - Reproducir las acciones en una nueva partida y representar al rival fantasma.
  - Aceptación: secuencia y tiempos reproducibles dentro de tolerancias definidas.
- [ ] **OB-0403 — Añadir desafío contra récord personal.**
  - Permitir enfrentarse a una ejecución anterior y conservar la mejor.
  - Aceptación: el fantasma se identifica con fecha y puntuación de origen.

### Fase 5 — PvP online

- [ ] **OB-0501 — Diseñar arquitectura de salas y sincronización.**
  - Elegir transporte, autoridad de partida, latencia, reconexión y abandono.
  - Aceptación: documento de protocolo y amenazas antes de implementar.
- [ ] **OB-0502 — Crear salas privadas e invitaciones.**
  - Crear código de sala, unirse, salir y cancelar.
  - Aceptación: dos jugadores pueden entrar a la misma sala de prueba.
- [ ] **OB-0503 — Implementar combate PvP sincronizado.**
  - Sincronizar inicio, estado, entradas y final.
  - Aceptación: pruebas con latencia simulada, desconexión y reconexión.
- [ ] **OB-0504 — Guardar resultados PvP.**
  - Actualizar historial y contadores de ambos participantes en una operación segura.
  - Aceptación: una partida finalizada no duplica victorias/derrotas.
- [ ] **OB-0505 — Añadir emparejamiento público (futuro).**
  - Solo después de validar salas privadas y estabilidad.

### Fase 6 — Escenarios y ambientes

- [ ] **OB-0601 — Definir sistema de escenarios.**
  - Separar escenario, clima, partículas, iluminación y efectos de combate.
  - Aceptación: los escenarios no alteran reglas ni tapan elementos críticos.
- [ ] **OB-0602 — Crear escenarios seleccionables.**
  - Reutilizar renderizado y permitir incorporar escenarios sin tocar el combate.
  - Aceptación: selección persistente y rendimiento comprobado en móvil.

### Fase transversal — Calidad, documentación y entregas

- [ ] **OB-0901 — Pruebas automáticas por cambio.**
  - Ejecutar `npm test`, `git diff --check` y pruebas nuevas de reglas/persistencia/ciclo de vida.
- [ ] **OB-0902 — Pruebas manuales de navegador.**
  - Registrar dispositivo, navegador, flujo, resultado y defectos.
- [ ] **OB-0903 — Actualizar documentación de agentes.**
  - Mantener `AGENTS.md`, README, mapa de módulos y este roadmap sincronizados.
- [ ] **OB-0904 — Registrar cada entrega.**
  - Documentar commit/PR, cambios, pruebas realizadas, pendientes, migraciones y riesgos.

## Definición de terminado

Una tarea solo se completa cuando:
1. El comportamiento acordado está implementado.
2. Las pruebas automáticas relevantes pasan.
3. `git diff --check` no informa errores.
4. Se realizaron las pruebas manuales necesarias o se anotaron explícitamente como pendientes.
5. La documentación afectada está actualizada.
6. No se publicaron secretos ni se alteró producción sin autorización.
7. Se registra el commit o PR asociado.

## Historial de decisiones y avances

| Fecha | ID | Registro |
| --- | --- | --- |
| 2026-11-17 | DEC-001 | Se acuerda evolucionar OVERBREAKER por fases, sin reescritura general. |
| 2026-11-17 | DEC-002 | Se requiere ranking PvE global Top 10 con un único récord por jugador y modalidad. |
| 2026-11-17 | DEC-003 | Se requieren victorias y derrotas totales separadas por PvE/PvP. |
| 2026-11-17 | DEC-004 | Se requiere historial individual de partidas con resultado, fecha, rival y estadísticas relevantes. |
| 2026-11-17 | DEC-005 | El modo por puntos registra intentos y récords, no victorias/derrotas. |
| 2026-11-17 | DEC-006 | Supabase queda como candidato inicial a evaluar; no está contratado ni configurado. |
| 2026-11-17 | BASE-001 | La modularización existente está integrada en `main`; PR #1 figura como fusionado. La validación manual de navegador sigue siendo necesaria. |

### Registro de pruebas

| Fecha | Alcance | Resultado | Evidencia / observaciones |
| --- | --- | --- | --- |
| Pendiente | `npm test` en clon local | Pendiente | Ejecutar y registrar salida real. |
| Pendiente | Escritorio y móvil | Pendiente | No afirmar validación visual, táctil o de audio sin probarla. |

## Notas para agentes futuros

- No implementar PvP antes de resolver identidad, persistencia y registro seguro de resultados.
- No implementar ranking mundial con localStorage/IndexedDB como fuente de verdad.
- No permitir que el navegador escriba directamente contadores globales o récords ajenos.
- Diseñar las escrituras de cierre de partida como operaciones idempotentes para evitar dobles registros.
- Mantener los datos personales al mínimo: nombre público y método de autenticación; no recopilar datos innecesarios.
- Para Supabase, usar la clave pública/anónima solo con RLS correctamente configurado. Nunca incluir la clave `service_role` en el cliente.
- No afirmar que el ranking es anti-trampas solo por tener autenticación. La validación de puntuaciones es una tarea explícita.
- Las partidas por puntos, los combates PvE y los combates PvP tienen reglas de registro diferentes; no mezclar sus estadísticas.
- Antes de cualquier migración, documentar compatibilidad y estrategia de recuperación.
