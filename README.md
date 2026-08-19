# Guía Técnica y Funcional Unificada
## Herramienta de captura y análisis de datos de tenis en tiempo real

**Versión:** 1.0 (consolidada) — unifica Project Vision v0.3.1, Modelo de datos JSON v0.3.1 y la especificación de Match Statistics.
**Propósito:** documento único y autocontenido para guiar el desarrollo de la aplicación (PWA, con empaquetado Android diferido).
**Regla de precedencia:** ante cualquier discrepancia entre los documentos de origen, prevalece el Project Vision v0.3.1 y el modelo de datos v0.3.1. Lo no definido explícitamente se marca como **pendiente**, no se inventa.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Alcance y usuarios](#2-alcance-y-usuarios)
3. [Principios de diseño](#3-principios-de-diseño)
4. [Categorías de recopilación de datos](#4-categorías-de-recopilación-de-datos)
5. [Flujo funcional de captura de un punto](#5-flujo-funcional-de-captura-de-un-punto)
6. [Módulo Court Detail](#6-módulo-court-detail)
7. [Modelo de datos](#7-modelo-de-datos)
8. [Stack tecnológico](#8-stack-tecnológico)
9. [Pantalla Match Statistics](#9-pantalla-match-statistics)
10. [Roadmap y pendientes](#10-roadmap-y-pendientes)

---

## 1. Resumen ejecutivo

Aplicación web (PWA) diseñada para que un entrenador o analista registre datos de un partido de tenis **mientras lo está viendo en vivo**, con el objetivo de habilitar un análisis estadístico posterior (efectividad de saque, distribución de golpes, errores por zona, evolución del partido, desplazamiento físico, etc.).

El diferencial frente a una planilla tradicional es la posibilidad de capturar, de forma **opcional y rápida**, el detalle espacial de cada punto (dónde se sacó, dónde se ejecutó un winner, dónde cayó una devolución, cuánto se desplazó un jugador antes de un error forzado) a través de un componente interactivo de pista ("Court Detail"), sin sacrificar la velocidad necesaria para no perderse jugadas. La herramienta busca un punto medio entre el charting manual tradicional (rápido pero pobre en detalle) y los sistemas de tracking automático tipo Hawk-Eye (ricos en detalle pero inviables para un entrenador individual en cancha), aplicando el principio de "automatización sobre input manual" en cada decisión de diseño.

---

## 2. Alcance y usuarios

| Aspecto | Definición |
|---|---|
| Usuario | Entrenador/analista, uso individual |
| Momento de captura | En vivo, durante el partido, courtside |
| Dispositivos | Fase inicial: un dispositivo móvil o portátil local (tablet/celular/notebook). Escalabilidad a multi-dispositivo se evalúa más adelante — ver sección 10 |
| Conectividad | Offline-first vía PWA (service workers + almacenamiento local). El empaquetado como instalable nativo (APK) queda **diferido**: se evaluará una vez validado el uso real — ver sección 8 |
| Nivel de detalle | Intermedio como base general, con excepciones definidas por categoría — ver sección 4 |
| **Alcance de partido** | **Únicamente singles (1 vs. 1)**. Dobles queda explícitamente fuera de alcance por ahora — ver sección 10 |

---

## 3. Principios de diseño

1. **Velocidad ante todo**: registrar un punto no debe tomar más de 2-3 segundos en el flujo básico. **Abrir** un Court Detail es siempre opcional — nunca es obligatorio para poder confirmar un punto, y si no se abre para un punto dado, ese punto se confirma sin coordenadas, sin problema. El modal se puede **cerrar y volver a abrir cuantas veces sea necesario, sin perder los datos ya ingresados** — no hay una versión "trabada" del modal. Lo que sí es obligatorio: si el usuario **interactuó** con un Court Detail para ese punto (llegó a ubicar al menos un marcador), sus campos aplicables deben quedar completos antes de poder tocar "Registrar punto" — el sistema indica visualmente qué falta.
2. **Automatización sobre input manual**: todo lo que el sistema pueda inferir (marcador, servidor/receptor, ganador del punto, zona de saque) se infiere; el usuario solo registra lo que no se puede deducir.
3. **Consistencia contextual**: cada pantalla o modal muestra únicamente los campos que aplican a la naturaleza del punto. No se le pide al usuario información irrelevante.
4. **Offline-first, local primero**: la herramienta debe funcionar sin conexión en un solo dispositivo local desde el día uno. La escalabilidad (multi-dispositivo, empaquetado nativo, backend) se evalúa después de validar el uso real.
5. **Progresivo**: se empieza con un modelo de datos simple y se migra a almacenamiento más robusto sin reescribir la app.

---

## 4. Categorías de recopilación de datos

Cada categoría de dato tiene su propio techo de profundidad posible (Básico / Intermedio / Avanzado). Esta matriz define el universo completo de exploración posible, y qué nivel se adopta para esta versión de la herramienta.

| Categoría | Alcance posible (Básico → Avanzado) | Nivel adoptado en esta versión |
|---|---|---|
| **1. Contexto del punto** (situación de partido) | Básico: set/game/marcador · Intermedio: + tipo de punto (break point, game point, deuce, tie-break) · Avanzado: + presión relativa del punto, racha de puntos consecutivos | **Intermedio, 100% automático** — el marcador completo (puntos 0-15-30-40-Ad, games, sets, gamepoint/breakpoint/set point/match point) se infiere por lógica del sistema; el usuario no lo registra manualmente |
| **2. Saque** | Básico: 1°/2°, resultado (ace/doble falta/en juego) · Intermedio: + zona de saque (Wide/Body/T) · Avanzado: + velocidad, efecto, profundidad del bote | **Intermedio, zona inferida** — el usuario registra 1°/2° y resultado; la zona (Wide/Body/T) ya no se selecciona a mano, se **calcula a partir de las coordenadas (x,y)** capturadas opcionalmente en Court Detail, con umbrales configurables que mapean coordenada → zona |
| **3. Rally / Secuencia de golpes** | Básico: cantidad de golpes del punto · Intermedio: tipo y zona del golpe final · Avanzado: secuencia completa golpe por golpe | **Básico** — solo se registra el largo del rally (cantidad de golpes, campo Timing). El tipo de golpe final se captura como parte de la categoría 4 |
| **4. Resultado del punto** | Básico: quién ganó · Intermedio: + naturaleza (winner/error forzado/no forzado/ace/doble falta) · Avanzado: + causa táctica atribuida al error | **Intermedio** — se registra la naturaleza del punto y, cuando aplica, el tipo de golpe final. El ganador del punto se **infiere automáticamente** en los casos determinísticos (ace, doble falta, devolución ganadora/error de devolución) o se **selecciona manualmente** en el resto. La causa táctica del error (nivel Avanzado) queda fuera |
| **5. Posición táctica en cancha** | Básico: no se captura · Intermedio: quién termina en la red vs. fondo · Avanzado: transiciones de posición durante el rally | **Categoría opcional** — no implementada en esta versión, queda documentada como posible extensión futura |
| **6. Ubicación espacial (Court Detail)** | Básico: no aplica · Intermedio: zona categórica · Avanzado: coordenadas normalizadas (x,y), mapas de calor | **Función indispensable pero opcional/desplegable** — coordenadas normalizadas, disponible para Saque, Doble falta, Devolución, Winner, Error no forzado y Error forzado. Nunca bloqueante para *abrir* el registro de un punto — ver sección 6 |
| **7. Timing / Ritmo (duración)** | Básico: no se captura · Intermedio: duración aproximada del punto · Avanzado: timestamp exacto, tiempo entre puntos, ritmo de saque | **Automático** — capturado por el sistema (reloj), sin interacción del usuario. No confundir con el campo "Timing" de bolas jugadas de la categoría 3, que es manual |
| **8. Comportamiento / factor mental** | Básico: no se captura · Intermedio: marca simple en puntos clave · Avanzado: nota cualitativa libre por punto | **Fuera de alcance** — no se captura en ninguna versión prevista |

**Resumen de la decisión:** Contexto del punto y duración automática no consumen taps del usuario. Saque y Resultado del punto son la base de interacción manual del flujo. Rally se reduce a un conteo simple (bolas jugadas). Court Detail es la única capa opcional visible al usuario. Posición táctica queda catalogada pero no activa. Comportamiento/factor mental queda fuera de forma definitiva.

---

## 5. Flujo funcional de captura de un punto

**Principio rector: todo el flujo arranca desde el saque.** La primera decisión (qué pasó con el servicio) determina qué pasos y menús se despliegan después.

El sistema ya sabe **quién saca y quién recibe** (alternancia estándar de saque, con la variante de tie-break — ver 5.1) y **cuál es el marcador actual** (inferido automáticamente).

### Paso 1 — Servicio

El box de Servicio tiene tres opciones:
- **1st Serve** / **2nd Serve** → el punto se disputó más allá del saque, o terminó en ace (ver interruptor abajo). Se habilitan, ambos opcionales: **"📍 Registrar saque"** y **"📍 Registrar devolución"**. El flujo continúa al Paso 2, salvo que se active el interruptor de ace.
- **Double Fault** → el punto se cierra con el saque. El ganador se **infiere automáticamente** (quien resta). Se ofrece, opcional, **"📍 Registrar doble falta"**. Los pasos 2 y 3 se omiten. Timing (bolas jugadas) se infiere en **1**.

**Interruptor "¿Fue ace?"** (liviano, en el box de Servicio, fuera de Court Detail): solo aparece después de elegir 1st o 2nd Serve, para que `serve_type` siempre quede correctamente registrado incluso en un ace. Se mantiene deliberadamente fuera de Court Detail para no perder el dato si el usuario no abre el detalle espacial. Al activarlo: ganador inferido (quien sacó), Timing inferido en **1**, Pasos 2 y 3 omitidos. "📍 Registrar saque" sigue disponible para quien quiera agregar el detalle espacial de ese ace.

**"📍 Registrar saque"** — dos marcadores: **Sacador** y **Bote de saque** (ver reglas de límite en sección 6.2). Usa **vista de cancha completa** (necesita ambas mitades).

**"📍 Registrar doble falta"** — dos marcadores: **Sacador** y **Bote de la falta** (no puede caer en el cuadro al que debía dirigirse, zona resaltada en rojo). Vista de cancha completa.

**"📍 Registrar devolución" — interruptores mutuamente excluyentes:** dos localizaciones (**jugador restador** + **bola de devolución**) y dos interruptores tipo selector único: **"Devolución ganadora"** / **"Error de devolución"**.

- Sin interruptor activo: solo posición informativa; el punto sigue por los Pasos 2 y 3.
- **Devolución ganadora** → ganador inferido (restador). Bola debe caer **dentro** de las líneas del rival.
- **Error de devolución** → ganador inferido (sacador) — caso inverso a la doble falta. Bola debe caer **fuera** de las líneas del rival.
- En ambos casos: sub-registro obligatorio de **tipo de golpe de devolución** (Derecha, Revés, Bloqueo/Slice), Timing inferido en **2** (saque + devolución), Pasos 2 y 3 omitidos.

### Paso 2 — Ganador del punto
*(solo si fue 1st/2nd Serve sin ace ni interruptor de devolución activo)*

Selección manual entre los dos jugadores — el único dato que el sistema no puede inferir sin más contexto en un punto disputado.

### Paso 3 — ¿Cómo terminó el punto?
*(mismas condiciones que el Paso 2)*

- **Winner** → tipo de golpe (Derecha, Revés, Volley, Dejada) → **"📍 Court Detail"** (2 marcadores: ejecutor + destino).
- **Error no forzado** → tipo de golpe (Derecha, Revés, Slice, Volley, Smash) → **"📍 Court Detail"** (2 marcadores: jugador + dónde salió/cayó la pelota).
- **Error forzado** → sin tipo de golpe, pero con **"📍 Court Detail"**: dos marcadores ordenados — "Posición inicial" (1) y "Posición final" (2) del jugador que sufrió el error, en su propia mitad. Único caso con **vista de media cancha**.

### Timing — bolas jugadas (regla de conteo)

Se cuenta desde el saque hasta la última bola jugada, inclusive. El saque siempre cuenta como la primera bola:

| Situación | Timing |
|---|---|
| Ace | 1 (inferido) |
| Doble falta | 1 (inferido) |
| Devolución ganadora / Error de devolución | 2 = saque + devolución (inferido) |
| Cualquier otro punto | Selector numérico opcional y manual |

### Confirmación — pop-up de revisión

Al tocar "Registrar punto" se abre un pop-up de confirmación (glassmorphism, sobre fondo navy, blur 20px) que resume lo que se va a guardar, con dos botones: **"Revisar"** (vuelve sin perder la selección) y **"Confirmar"** (guarda y avanza el marcador). Este paso reemplaza a un "deshacer" posterior. **Limitación conocida:** un punto ya confirmado no se puede editar retroactivamente en esta versión.

### 5.1 Lógica de marcador en tie-break

- **Puntaje:** números simples (0, 1, 2, 3...). Gana quien llegue primero a 7 con diferencia de al menos 2.
- **Servicio:** quien correspondía sacar según la alternancia normal inicia el tie-break sirviendo el primer punto (con 1er/2do servicio normal). A partir del segundo punto, el servicio rota **cada 2 puntos**.
- **Cambio de lado:** cada 6 puntos combinados, y al finalizar el tie-break.
- **Resultado:** el ganador se lleva el set 7-6; el set siguiente vuelve a la lógica estándar.

---

## 6. Módulo Court Detail

Componente interactivo (canvas/SVG) que permite marcar posiciones sobre un dibujo de la pista mediante arrastre (touch y mouse). **Abrirlo es opcional, y se puede cerrar/reabrir libremente sin perder lo ya ingresado.** Si el usuario llegó a ubicar al menos un marcador, sus campos requeridos deben quedar completos antes de habilitar "Registrar punto" (Principio de Diseño #1, sección 3).

| Tipo de punto | Marcadores mostrados | Notas |
|---|---|---|
| **Saque (1° y 2°, con o sin ace)** | 2: Sacador + Bote del saque | Vista de cancha completa. La zona (Wide/Body/T) se infiere del bote |
| **Doble falta** | 2: Sacador + Bote de la falta | Bote no puede caer en el cuadro al que debía dirigirse (zona prohibida en rojo). Cancha completa |
| **Devolución** | 2: jugador restador + bola de devolución | Interruptores mutuamente excluyentes "Devolución ganadora"/"Error de devolución". Orden de presentación propio: Título → Tipo de golpe (obligatorio) → Pista → Información de devolución (interruptores, al final). Cancha completa |
| **Winner** | 2: jugador ejecutor + destino en pista contraria | Los 4 golpes del set (Derecha, Revés, Volley, Dejada) tienen posicionamiento disponible. Cancha completa |
| **Error no forzado** | 2: jugador + dónde salió/cayó la pelota | Los 5 golpes del set (Derecha, Revés, Slice, Volley, Smash) tienen posicionamiento disponible. Cancha completa |
| **Error forzado** | 2 ordenados: Posición inicial (1) + Posición final (2) | Sin tipo de golpe asociado. Único caso con **vista de media cancha** |

### 6.1 Tipos de golpe y elegibilidad

El set de golpes disponibles depende de la naturaleza del punto — son taxonomías independientes, no una lista compartida con filtro:

| Naturaleza | Tipos de golpe disponibles | Court Detail |
|---|---|---|
| **Winner** | Derecha, Revés, Volley, Dejada | ✅ 2 marcadores (ejecutor + destino) |
| **Error no forzado** | Derecha, Revés, Slice, Volley, Smash | ✅ 2 marcadores (jugador + salida) |
| **Devolución ganadora / Error de devolución** | Derecha, Revés, Bloqueo/Slice | ✅ 2 marcadores, límite según interruptor |
| **Error forzado** | No se registra tipo de golpe | ✅ 2 marcadores ordenados (posición inicial/final) |
| **Saque (1°/2°), con o sin ace** | No aplica (ace se resuelve con interruptor fuera de Court Detail) | ✅ 2 marcadores (sacador + bote) |
| **Doble falta** | No aplica | ✅ 2 marcadores (sacador + bote, con zona prohibida) |

### 6.2 Especificación técnica

**Proporción y escalado:** SVG con `viewBox` en proporción de compromiso **1:2** (ancho:alto) — punto medio entre la proporción real con márgenes ITF completos (1:2.55, fiel pero angosta en celular) y una proporción estilizada (1:1.4, cómoda pero poco fiel). Se llega a 1:2 manteniendo el margen lateral fiel a la ITF (3.05 m a cada lado) y reduciendo el margen de fondo de 6.4 m a **2.5 m** por lado. Canvas total: **28.77 m × 14.33 m**, cancha de singles centrada dentro. Referencia de implementación: `viewBox` de 200×400, cancha interior ~115×330 (margen lateral ~42px, margen de fondo ~35px). El contenedor escala de forma fluida (`preserveAspectRatio`) para verse correcto en cualquier dispositivo.

**Mecanismo de arrastre:** los marcadores se crean por un primer toque y luego quedan **arrastrables** (Pointer Events, touch y mouse) para corregir la imprecisión del dedo. La validación de límites se aplica también durante el arrastre.

**Límites de arrastre por tipo de marcador:**

| Marcador | Restricción de movimiento |
|---|---|
| Destino de **Winner** | Solo dentro de las líneas de singles, mitad contraria al ejecutor |
| Ejecutor de **Winner** | Toda su propia mitad, dentro y fuera de pista |
| Jugador en **Error no forzado** | Su propia mitad, dentro y fuera de pista |
| Tiro errado en **Error no forzado** | Cualquier punto **excepto** dentro de las líneas de la mitad contraria |
| **Sacador** (Saque y Doble falta) | No sobrepasa la línea de fondo de su lado (margen fuera de pista). Límite lateral: la **línea central** — el sacador se para del lado **opuesto** al cuadro al que apunta (saque cruzado/diagonal): lado deuce → sacador a la derecha de su mitad; lado ad → sacador a la izquierda |
| Bote de **Saque** | Limitado al cuadro de saque correspondiente (según paridad del punto) |
| Bote de **Doble falta** | Cualquier parte **excepto** dentro del cuadro al que debía dirigirse (zona prohibida en rojo) |
| Posición inicial/final en **Error forzado** | Ambos en la propia mitad del jugador, dentro y fuera de pista |
| Jugador (restador) en **Devolución** | Toda su propia mitad, dentro y fuera de pista |
| Bola de devolución, sin interruptor o con **"Devolución ganadora"** | Solo dentro de las líneas de la mitad contraria |
| Bola de devolución con **"Error de devolución"** | Cualquier punto **excepto** dentro de las líneas de la mitad contraria |

**Vista de media cancha (excepción):** todos los modales usan cancha completa, **excepto Error forzado** (sus dos marcadores viven en la misma mitad). Saque y Doble falta no califican porque el Sacador vive en una mitad y el Bote en la otra.

**Restricción de zona del bote de saque:** el sistema ya sabe, por el marcador automático, si corresponde el lado par (deuce) o impar (ad). El bote de saque queda limitado al cuadro correspondiente.

**Umbrales de zona de saque (Wide / Body / T):** las coordenadas se normalizan **dentro del cuadro de saque específico** (0–1 en ese rectángulo). El ancho se divide en tercios iguales: tercio más cercano a la línea lateral → **Wide**; tercio central → **Body**; tercio más cercano a la línea central → **T**. El mapeo es relativo al lado del cuadro, así que funciona igual espejado para ambos cuadros.

**Persistencia:** `court_detail` es un campo opcional del objeto "punto", y almacena coordenadas normalizadas **0–1 sobre el canvas completo** (no sobre el rectángulo interior de la cancha — cualquier marcador en el margen fuera de pista debe seguir cayendo dentro de 0–1, tal como exige el esquema). Nunca píxeles crudos, para que el análisis agregado sea independiente de la resolución del dispositivo.

---

## 7. Modelo de datos

Jerarquía: **Partido → Set → Game → Punto**, documento único anidado (facilita serialización en localStorage/IndexedDB; migrable a registros separados si se pasa a base de datos). IDs enteros autoincrementales por entidad. Coordenadas normalizadas 0–1 sobre el canvas completo de Court Detail (x=0 borde izquierdo, y=0 borde superior). Nombres de campo en **inglés, snake_case**.

> **Nota de versión (v0.3.1):** incorpora los ajustes de Court Detail posteriores al cierre inicial de v0.3 — marcador de "Sacador" en Saque y Doble falta, Court Detail para Doble falta y Error forzado, y la regla de "una vez tocado, se completa".

### 7.1 Qué valida el esquema vs. qué valida la app

El JSON Schema solo define forma, tipos y rangos — no reglas de negocio cruzadas, que se validan en la capa de aplicación:

- Si `point_result` es `"return_winner"` o `"return_error"` → `court_detail.devolucion` (con `restador` y `bote`) y `return_type` son **obligatorios**.
- `return_type` es obligatorio siempre que se haya usado el modal "Registrar devolución".
- `final_type` debe pertenecer al subconjunto correcto según `point_result`: `winner` → {forehand, backhand, volley, drop_shot}; `unforced_error` → {forehand, backhand, slice, volley, smash}; en cualquier otro caso, `null`.
- En `golpe_final`, `destino` obligatorio si `winner`; `tiro_errado` obligatorio si `unforced_error`.
- `point_context` se infiere automáticamente — nunca lo ingresa el usuario.
- **Regla general de Court Detail:** cualquier sub-objeto de `court_detail` que exista debe tener todos sus campos requeridos — nunca a medias.
- `saque` y `doble_falta` requieren `sacador` **y** `bote` siempre juntos.
- Si `point_result` es `"forced_error"` y se abrió Court Detail, `error_forzado` requiere `posicion_inicial` **y** `posicion_final`.
- `serve_result: "ace"` puede existir con `court_detail.saque` en `null` (el interruptor de ace es independiente de Court Detail).
- **Conversión de distancia a metros (Error forzado):** el canvas **no es cuadrado** (14.33 m × 28.77 m) — la distancia euclidiana debe convertirse eje por eje antes de combinarse: `dx_m = Δx_normalizado × 14.33`, `dy_m = Δy_normalizado × 28.77`, `distancia_m = √(dx_m² + dy_m²)`. Un factor de escala único produce un resultado incorrecto.

### 7.2 Esquema JSON (draft-07)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$comment": "Match document model v0.3.1 - singles only, local-first",
  "type": "object",
  "required": ["match_id", "players", "match_format", "surface", "date", "sets"],
  "properties": {
    "match_id": { "type": "integer" },
    "players": {
      "type": "object",
      "required": ["player_a", "player_b"],
      "properties": {
        "player_a": { "$ref": "#/definitions/player" },
        "player_b": { "$ref": "#/definitions/player" }
      }
    },
    "match_format": { "type": "string", "enum": ["best_of_3", "best_of_5"] },
    "surface": { "type": "string" },
    "date": { "type": "string", "format": "date" },
    "notes": { "type": "string" },
    "sets": { "type": "array", "items": { "$ref": "#/definitions/set" } }
  },
  "definitions": {
    "player": {
      "type": "object",
      "required": ["name"],
      "properties": { "name": { "type": "string" } }
    },
    "set": {
      "type": "object",
      "required": ["set_number", "games"],
      "properties": {
        "set_number": { "type": "integer" },
        "games": { "type": "array", "items": { "$ref": "#/definitions/game" } }
      }
    },
    "game": {
      "type": "object",
      "required": ["game_number", "is_tiebreak", "points"],
      "properties": {
        "game_number": { "type": ["integer", "null"], "$comment": "null when game is a tie-break" },
        "is_tiebreak": { "type": "boolean" },
        "points": { "type": "array", "items": { "$ref": "#/definitions/point" } }
      }
    },
    "point": {
      "type": "object",
      "required": [
        "point_id", "server", "returner", "serve_side", "serve_type",
        "serve_result", "point_result", "winner", "score_before",
        "point_context", "ball_count", "start_time", "end_time"
      ],
      "properties": {
        "point_id": { "type": "integer" },
        "server": { "type": "string", "enum": ["A", "B"] },
        "returner": { "type": "string", "enum": ["A", "B"] },
        "serve_side": { "type": "string", "enum": ["deuce", "ad"] },
        "serve_type": { "type": "integer", "enum": [1, 2] },
        "serve_result": { "type": "string", "enum": ["in_play", "ace", "double_fault"] },
        "point_result": {
          "type": "string",
          "enum": ["ace", "double_fault", "return_winner", "return_error", "winner", "forced_error", "unforced_error"]
        },
        "winner": { "type": "string", "enum": ["A", "B"] },
        "score_before": { "type": "string", "$comment": "Examples: '40-30' regular game, '5-6' tie-break" },
        "point_context": {
          "type": "string",
          "enum": ["break_point", "game_point", "set_point", "match_point", "deuce", "regular"],
          "$comment": "Always inferred automatically from score_before, never user-entered"
        },
        "return_type": { "type": ["string", "null"], "enum": ["forehand", "backhand", "block_slice", null] },
        "final_type": {
          "type": ["string", "null"],
          "enum": ["forehand", "backhand", "volley", "drop_shot", "slice", "smash", null]
        },
        "ball_count": { "type": ["integer", "null"], "$comment": "Balls played including serve. null if not recorded" },
        "start_time": { "type": "string", "format": "date-time" },
        "end_time": { "type": "string", "format": "date-time" },
        "duration_ms": { "type": "integer", "$comment": "Derived from start_time/end_time" },
        "derived_serve_zone": { "type": ["string", "null"], "enum": ["wide", "body", "t", null] },
        "court_detail": { "$ref": "#/definitions/court_detail" }
      }
    },
    "coordinate": {
      "type": "object",
      "required": ["x", "y"],
      "properties": {
        "x": { "type": "number", "minimum": 0, "maximum": 1 },
        "y": { "type": "number", "minimum": 0, "maximum": 1 }
      }
    },
    "court_detail": {
      "type": ["object", "null"],
      "properties": {
        "saque": {
          "type": ["object", "null"],
          "properties": {
            "sacador": { "$ref": "#/definitions/coordinate" },
            "bote": { "$ref": "#/definitions/coordinate" }
          },
          "required": ["sacador", "bote"], "additionalProperties": false
        },
        "doble_falta": {
          "type": ["object", "null"],
          "properties": {
            "sacador": { "$ref": "#/definitions/coordinate" },
            "bote": { "$ref": "#/definitions/coordinate", "$comment": "Must fall outside the target service box (app-layer validated)" }
          },
          "required": ["sacador", "bote"], "additionalProperties": false
        },
        "devolucion": {
          "type": ["object", "null"],
          "properties": {
            "restador": { "$ref": "#/definitions/coordinate" },
            "bote": { "$ref": "#/definitions/coordinate" }
          },
          "required": ["restador", "bote"], "additionalProperties": false
        },
        "golpe_final": {
          "type": ["object", "null"],
          "properties": {
            "ejecutor": { "$ref": "#/definitions/coordinate" },
            "destino": { "$ref": "#/definitions/coordinate", "$comment": "Required (app-layer) when point_result = winner" },
            "tiro_errado": { "$ref": "#/definitions/coordinate", "$comment": "Required (app-layer) when point_result = unforced_error" }
          },
          "required": ["ejecutor"], "additionalProperties": false
        },
        "error_forzado": {
          "type": ["object", "null"],
          "properties": {
            "posicion_inicial": { "$ref": "#/definitions/coordinate" },
            "posicion_final": { "$ref": "#/definitions/coordinate" }
          },
          "required": ["posicion_inicial", "posicion_final"], "additionalProperties": false
        }
      },
      "additionalProperties": false
    }
  }
}
```

### 7.3 Ejemplos reales

**Ejemplo 1 — 1er servicio, winner de derecha, `court_detail` completo:**

```json
{
  "point_id": 1042, "server": "A", "returner": "B", "serve_side": "deuce",
  "serve_type": 1, "serve_result": "in_play", "point_result": "winner", "winner": "A",
  "score_before": "15-30", "point_context": "regular",
  "return_type": "forehand", "final_type": "forehand", "ball_count": 7,
  "start_time": "2026-08-14T15:23:45.120Z", "end_time": "2026-08-14T15:23:48.210Z", "duration_ms": 3090,
  "derived_serve_zone": "t",
  "court_detail": {
    "saque": { "sacador": { "x": 0.48, "y": 0.92 }, "bote": { "x": 0.42, "y": 0.36 } },
    "devolucion": { "restador": { "x": 0.15, "y": 0.75 }, "bote": { "x": 0.55, "y": 0.10 } },
    "golpe_final": { "ejecutor": { "x": 0.78, "y": 0.82 }, "destino": { "x": 0.18, "y": 0.12 } }
  }
}
```

**Ejemplo 2 — Doble falta, sin `court_detail`, ganador inferido, break point:**

```json
{
  "point_id": 1043, "server": "B", "returner": "A", "serve_side": "ad",
  "serve_type": 2, "serve_result": "double_fault", "point_result": "double_fault", "winner": "A",
  "score_before": "30-40", "point_context": "break_point",
  "return_type": null, "final_type": null, "ball_count": 1,
  "start_time": "2026-08-14T15:24:02.000Z", "end_time": "2026-08-14T15:24:03.800Z", "duration_ms": 1800,
  "derived_serve_zone": null, "court_detail": null
}
```

**Ejemplo 3 — Devolución ganadora, `court_detail.devolucion` obligatorio, timing inferido en 2:**

```json
{
  "point_id": 1044, "server": "A", "returner": "B", "serve_side": "deuce",
  "serve_type": 1, "serve_result": "in_play", "point_result": "return_winner", "winner": "B",
  "score_before": "0-15", "point_context": "regular",
  "return_type": "backhand", "final_type": null, "ball_count": 2,
  "start_time": "2026-08-14T15:25:10.300Z", "end_time": "2026-08-14T15:25:12.100Z", "duration_ms": 1800,
  "derived_serve_zone": null,
  "court_detail": {
    "devolucion": { "restador": { "x": 0.22, "y": 0.80 }, "bote": { "x": 0.65, "y": 0.14 } }
  }
}
```

**Ejemplo 4 — Error no forzado con `court_detail` solo de golpe final, deuce:**

```json
{
  "point_id": 1045, "server": "B", "returner": "A", "serve_side": "ad",
  "serve_type": 2, "serve_result": "in_play", "point_result": "unforced_error", "winner": "B",
  "score_before": "40-40", "point_context": "deuce",
  "return_type": null, "final_type": "backhand", "ball_count": 12,
  "start_time": "2026-08-14T15:26:45.000Z", "end_time": "2026-08-14T15:26:52.500Z", "duration_ms": 7500,
  "derived_serve_zone": null,
  "court_detail": {
    "golpe_final": { "ejecutor": { "x": 0.65, "y": 0.75 }, "tiro_errado": { "x": 0.12, "y": 0.16 } }
  }
}
```

**Ejemplo 5 — Error forzado con `court_detail.error_forzado`:**

```json
{
  "point_id": 1046, "server": "A", "returner": "B", "serve_side": "deuce",
  "serve_type": 1, "serve_result": "in_play", "point_result": "forced_error", "winner": "A",
  "score_before": "30-15", "point_context": "regular",
  "return_type": "forehand", "final_type": null, "ball_count": 5,
  "start_time": "2026-08-14T15:28:00.000Z", "end_time": "2026-08-14T15:28:04.200Z", "duration_ms": 4200,
  "derived_serve_zone": null,
  "court_detail": {
    "error_forzado": { "posicion_inicial": { "x": 0.30, "y": 0.85 }, "posicion_final": { "x": 0.62, "y": 0.98 } }
  }
}
```

**Estrategia de almacenamiento:** local-first en un solo dispositivo para esta primera versión, con posibilidad de migración futura a base de datos relacional/NoSQL en backend si se decide escalar a multi-dispositivo — ver sección 8.

---

## 8. Stack tecnológico

- **Frontend**: React + TypeScript + Vite. TypeScript refleja en tipos el contrato exacto del modelo de datos v0.3.1 (sección 7).
- **Enrutamiento**: React Router — necesario para rutas como `/stats/:matchId` (sección 9).
- **Visualización de datos**: Recharts para gráficos (barras, líneas, dispersión), SVG nativo para heatmaps y línea de tiempo — reutiliza el mismo enfoque de Court Detail.
- **Estilos**: Tailwind CSS, con el tema extendido a partir de los tokens de `DESIGN.md` (colores, tipografía, spacing, radios).
- **Estado global**: Zustand — liviano, evita boilerplate para el tamaño de esta app.
- **Almacenamiento local**: IndexedDB vía **Dexie**, documento `Match` completo anidado como fuente única de verdad para el MVP.
  - **Decisión explícita:** no se agrega tabla separada de puntos indexados en esta etapa — filtrar/calcular en memoria es suficiente a esta escala (confirmado por la sección 6 de Match Statistics: cálculos O(n) fluidos con ~300 puntos en tablet de gama media). Se pospone hasta tener evidencia real de necesidad; Dexie soporta migraciones aditivas sin rediseñar la app.
- **PWA**: `vite-plugin-pwa`, manifest con colores de marca (`#0A192F`). No condiciona el empaquetado nativo diferido — Vite se integra bien con Capacitor/TWA si se decide envolver la PWA.
- **Testing**: Vitest para lógica pura (motor de marcador, geometría de Court Detail).
- **Exportación**: CSV directo desde tabla filtrada; PDF vía impresión del navegador (`@media print`) en una primera iteración, `jsPDF` + `html2canvas` como mejora posterior.

**Estructura de carpetas** (resumen): `components/ui` (presentacionales, siguiendo `DESIGN.md`), `components/match` (pantallas y paneles del flujo de captura), `components/courtDetail` (componente aislado, reutilizable en sus variantes y en los heatmaps de Match Statistics), `hooks`, `lib/db.ts` + `lib/repositories` (capa Dexie), `stores` (Zustand), `types` (interfaces que reflejan el modelo v0.3.1 exactamente, incluyendo `point_context`, sin `duration_iso8601`).

### 8.1 Sistema de diseño visual (oficial — `DESIGN.md`)

| Aspecto | Definición |
|---|---|
| Estética | "Modern Corporate" + Glassmorphism — HUD de alto contraste para uso en cancha con distintas condiciones de luz |
| Fondo base | Navy profundo `#0A192F` ("Deep Night") |
| Acento primario / acciones | Verde neón "Tennis Ball" `#CCFF00` — botones primarios, estados activos, indicador de "sacando" |
| Winner | Cyan `#00F0FF` — glow en heatmap y métricas positivas |
| Error | Rojo-naranja `#FF4D4D` — glow en heatmap y errores no forzados |
| Tipografía | Inter (UI general) + JetBrains Mono (marcador, coordenadas, timestamps) |
| Táctil | Mínimo 44px de área de toque en todo elemento interactivo |
| Formas | Radio 4px (inputs/celdas), 8px (cards), 12px (botones de acción primaria) |
| Elevación | Glassmorphism (10% blanco + 20px blur) en modales, en vez de sombras duras |
| Court/Heatmap | Líneas de cancha en blanco 30% de opacidad sobre navy; puntos Winner en cyan, puntos Error en rojo-naranja |

> Especificación completa en `DESIGN.md`.

---

## 9. Pantalla Match Statistics

### 9.1 Alcance y arquitectura

- **Ruta**: `/stats/:matchId`, disponible durante el partido (desde la captura) y al finalizar.
- **Fuente de datos**: si el partido está en curso y su `match_id` coincide con la URL → estado de Zustand; si no → IndexedDB vía repositorio.
- **Cálculo**: 100% en el cliente con `reduce`/`filter`, sin librería de agregación (ver justificación de la decisión de almacenamiento en sección 8).
- **Responsive**: prioriza tablet/notebook para análisis, sin romper en móvil.
- **Offline**: funciona sin conexión, igual que la captura.

### 9.2 Filtros globales

Barra superior fija, visible en todas las pestañas y aplicada a todas ellas (cada pestaña puede sumar filtros locales):

| Filtro | Opciones |
|---|---|
| Set | `All`, `Set 1`, `Set 2`, `Set 3` (tie-breaks incluidos en su set) |
| Jugador | `Both`, `A`, `B` |
| Servidor | `All`, `A`, `B` |
| Lado de saque | `All`, `Deuce`, `Ad` |
| Tipo de punto | `All`, `Ace`, `Double fault`, `Winner`, `Forced error`, `Unforced error`, `Return winner`, `Return error` |
| Zona de saque | `All`, `Wide`, `Body`, `T` (solo si existe `derived_serve_zone`) |
| Situación de presión | `All`, `Break point`, `Game point`, `Set point`, `Match point`, `Deuce`, `Regular` (campo `point_context`) |
| Rango de bolas jugadas | `All`, `1-4`, `5-8`, `9+` (`ball_count`) |

### 9.3 Pestañas

**Overview** — Marcador final/en vivo, ganador, duración total. KPIs A vs. B: puntos totales, break points ganados/salvados, aces, dobles faltas, winners, errores forzados/no forzados, devoluciones ganadoras/errores de devolución. Gráfico de barras apiladas por resultado de punto.
- `break_points_won` = break points donde `winner == returner`; `break_points_saved` = donde `winner == server`.
- `puntos_ganados_en_red/fondo` (usa `court_detail.golpe_final.ejecutor.y`) — se muestra solo si hay datos; **umbral y exacto de red/fondo pendiente de definir** (no bloquea el MVP).

**Service** — % 1er/2do servicio, % 2do servicio en juego, aces por tipo de servicio, dobles faltas, puntos ganados por tipo de servicio, distribución y efectividad por zona (`derived_serve_zone`). Heatmap de botes de saque (`court_detail.saque.bote` / `court_detail.doble_falta.bote`), diferenciando el cuadro prohibido en doble falta.
- Fórmulas: `% 1º servicio` = puntos con `serve_type=1` / total con `serve_type` 1 o 2. `% 2º en juego` = puntos `serve_type=2` con `serve_result != double_fault` / total `serve_type=2`. `% ganados con 1º/2º` análogos, filtrando por `winner = server`.

**Return** — Total de devoluciones ganadoras/errores de devolución, % de puntos ganados restando, distribución de `return_type`, posición promedio del restador ante 1er/2do saque, heatmap de restador + bote de devolución.
- **Nota de representatividad**: el % de "devoluciones que entran" solo puede calcularse sobre los puntos donde el usuario abrió Court Detail de devolución (es opcional) — es una muestra parcial, no el total de puntos. Debe indicarse en la propia pantalla.
- Las devoluciones ganadoras/errores de devolución también se incluyen en los totales de winners/errores del Overview.

**Rally / Point Ending** — Distribución de `point_result` por jugador, tipos de golpe final para winners/errores no forzados, largo del rally (`ball_count`: promedio, mediana, distribución 1-4/5-8/9+, relación con tipo de conclusión).
- **Error forzado con desplazamiento**: si existen `posicion_inicial`/`posicion_final`, se calcula la distancia (ver fórmula de conversión a metros en sección 7.1 — **no usar un factor de escala único**, el canvas no es cuadrado). Métricas: distancia promedio por error forzado, comparativa A vs. B, vectores en el heatmap.

**Court Heatmaps** — Representación estática (no interactiva punto a punto) de coordenadas, según los sub-objetos de `court_detail` presentes: Saque (separable por zona), Doble falta (con cuadro prohibido), Devolución, Golpe final (ejecutores/destinos/tiros errados), Error forzado (posiciones + vectores opcionales). Filtros locales: jugador, tipo de punto, set. Colores: cyan `#00F0FF` winners, rojo-naranja `#FF4D4D` errores. Reutiliza el componente `CourtCanvas` de Court Detail (sección 6), adaptado para mostrar múltiples puntos estáticos.
- *Sugerencia no confirmada*: sumar un heatmap de posición del **Sacador**, ahora que ese marcador existe — queda pendiente de decisión.

**Timeline** — Evolución del marcador (diferencia de games por set), rachas de puntos consecutivos (opcional). Navegación interactiva: clic en un punto abre detalle emergente y resalta la fila en Points Table. Se ordena por `point_id` o `start_time`. Recharts con `ScatterPlot` para los eventos.

**Points Table** — Tabla completa, filtrable y ordenable. Columnas: `point_id`, Set/Game, `score_before`, Servidor/Restador, `serve_side`, `serve_type`, `serve_result`, `point_result`, `winner`, `return_type`, `final_type`, `ball_count`, `derived_serve_zone`, `point_context`, indicador de `court_detail` (ícono). Exporta a CSV con los datos filtrados actuales.

### 9.4 Flujo de datos

1. La ruta obtiene `matchId` de la URL.
2. `useMatchStatistics(matchId)`: Zustand si está en curso y coincide; si no, IndexedDB.
3. Se aplican los filtros globales a la lista completa de puntos.
4. Métricas recalculadas con `useMemo` según filtros.
5. Cada pestaña recibe datos ya filtrados y formateados.
6. Heatmaps extraen coordenadas de los puntos filtrados que tengan el sub-objeto `court_detail` correspondiente.

### 9.5 Fase de implementación sugerida

MVP: Overview, Service, Return, Points Table. Segunda iteración: Timeline y Court Heatmaps (consistente con el enfoque progresivo de la sección 3).

---

## 10. Roadmap y pendientes

### 10.1 Roadmap de desarrollo

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Modelo de datos (Partido → Set → Game → Punto) | **Cerrado** — v0.3.1 (sección 7) |
| 2 | Flujo de captura en vivo (UX tipo wizard) | **Cerrado** (sección 5) |
| 3 | Stack técnico y arquitectura | **Cerrado** (sección 8) |
| 4 | MVP de captura (una sola pantalla funcional, un dispositivo local) | Pendiente de implementación — diseño y wireframe funcional ya entregados |
| 5 | Panel de análisis y visualización | **Cerrado** a nivel de especificación (sección 9) — pendiente de implementación |
| 6 | Evaluación de escalabilidad (multi-dispositivo, empaquetado nativo/APK, backend) | Diferido intencionalmente, posterior al MVP |
| 7 | Exportación, comparación e historial | Parcialmente cubierto (CSV/PDF en sección 9.1); comparación entre partidos aún no especificada |

### 10.2 Entregables de diseño ya completados

Diagrama de flujo de pantallas, wireframes de captura y Court Detail (interactivo, con arrastre de corrección), modelo de datos v0.3.1 en JSON, stack tecnológico definitivo, sistema de diseño oficial, especificación de Match Statistics.

### 10.3 Pendientes reales (no bloquean el MVP)

- Umbral exacto de red/fondo para la métrica "puntos ganados en red/fondo" (Overview de Match Statistics).
- Heatmap de posición del Sacador en Court Heatmaps (sugerido, no confirmado).
- Especificación de "comparación entre partidos e historial" (Fase 7 del roadmap).

### 10.4 Consideraciones futuras (mencionadas, NO decididas — no forman parte del alcance actual)

Estos puntos aparecieron en una propuesta de estructura externa y **no fueron evaluados ni acordados** en el proceso de diseño de este documento. Se listan para que no se pierdan, pero requieren su propia ronda de definición antes de considerarse parte del proyecto:

- Sincronización multi-dispositivo (requiere backend — contradiría, si se hace mal, la decisión "local-first" de la sección 3).
- Empaquetado nativo / distribución en tienda de aplicaciones — ya contemplado como diferido en la sección 2, pero sin fecha ni criterio de activación definido más allá de "evaluar tras validar uso real".
- Soporte para dobles — **explícitamente fuera de alcance** por decisión ya cerrada (sección 2); si se reconsidera en el futuro, cambia la estructura de jugadores/equipos del modelo de datos (sección 7) y no es una extensión trivial.
- Sincronización con video (vincular puntos capturados a timestamps de una grabación del partido) — idea nueva, sin ningún análisis de factibilidad o diseño.

---

*Fin de la guía unificada. Fuentes: Project Vision v0.3.1, Modelo de datos JSON v0.3.1, Especificación de Match Statistics, y una propuesta de PRD externa (usada solo como referencia de redacción para el resumen ejecutivo; sus discrepancias con el Project Vision se resolvieron a favor de este último, según lo solicitado).*
