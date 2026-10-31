# Especificación Funcional — Quiet Progress: Task & Habits Tracker

> **Documento vivo (Living Spec).** Regla de sincronización: cualquier cambio en reglas de negocio, campos de datos o flujos de usuario debe reflejarse aquí **en la misma tarea** que lo implementa. Cada cambio se registra en el [Changelog](#15-changelog).

- **Versión:** 2.0.0
- **Fecha:** 2026-10-22
- **Estado:** Especificación de referencia (arquitectura objetivo). Implementación actual: Fase 0. Fases 1–5 planificadas (ver [§13](#13-roadmap-por-fases)).
- **Inspiración:** [`QP_TASK_AND_HABITS_TRACKER.MD`](./QP_TASK_AND_HABITS_TRACKER.MD) — SRS de *Quiet Progress* generado con Gemini. La trazabilidad requisito-a-requisito está en [§14](#14-trazabilidad-del-srs-qp-a-esta-spec).

---

## 1. Visión general del producto

Aplicación móvil multiplataforma (iOS/Android) de **productividad consciente** que combina dos módulos:

1. **Gestor de tareas** (*Task Tracker*): ciclo de vida de tareas, etiquetas, fechas flexibles, *rollover* automático y subtareas.
2. **Seguimiento de hábitos** (*Habit Tracker*): hábitos booleanos y medibles, programación flexible, pausas permitidas, rachas y calendario de calor.

La filosofía central (**Quiet Progress**) prioriza la consistencia sobre la perfección:

- Interfaces minimalistas.
- Métricas sin presión.
- Gamificación suave: se premia la perseverancia **sin castigar los días de descanso**.
- Cero alertas de retraso: el sistema nunca señala "vas atrasado".

### Metas del producto

1. Registro diario de progreso en ≤ 2 interacciones por hábito.
2. Puntuación diaria transparente: siempre visible el par `puntos obtenidos / meta base`.
3. Analítica accionable basada en **días programados**, no en días calendario.
4. Cero penalización: descansos, omisiones y tareas movidas no rompen rachas ni restan rendimiento.
5. Offline-first: el usuario puede operar sin red; la sincronización con el servidor es transparente.
6. Accesibilidad AA, modo oscuro de bajo contraste y diseño responsive (móvil → tablet → web).

---

## 2. Glosario

| Término | Definición |
| --- | --- |
| **Hábito fijo** (`fixed`) | Hábito obligatorio con programación diaria/semanal. Cuenta hacia la Meta Base del día si está programado para ese día. |
| **Hábito extra** (`extra`) | Hábito opcional. No cuenta hacia la Meta Base; sus puntos suman al numerador (permite superar el 100%). |
| **Meta Base** | Suma de puntos posibles (10 pts por hábito) de los hábitos fijos programados para un día, **excluyendo** los marcados como descanso u omitidos ese día. |
| **Día perfecto** | Día con `metaBase > 0` y puntaje obtenido ≥ Meta Base. |
| **Día neutral** | Día sin Meta Base efectiva (ningún fijo programado, o todos en descanso/omitido). No extiende ni rompe rachas. |
| **Racha** | Días perfectos consecutivos. Los días neutrales se omiten de la secuencia. |
| **Racha de cuota** | Períodos (semana/mes) consecutivos en que se cumple la cuota de un hábito de frecuencia. |
| **Log** | Registro diario del estado/valor de un hábito. |
| **Nota de log** (*Log Note*) | Texto opcional de reflexión asociado a un log («Estaba muy cansado hoy»). |
| **Descanso** (`rest`) | Día en que el usuario declara descanso. No cuenta como fallo ni rompe la racha. |
| **Omisión** (`skipped`) | El usuario decide no realizar esa ocurrencia concreta. No cuenta como fallo ni rompe la racha. |
| **Día de descanso programado** (`restDays`) | weekday del hábito en el que la ocurrencia no aplica por diseño (p. ej. domingo libre). |
| **Cuota** (*quota*) | Cantidad de veces por semana o por mes que debe cumplirse un hábito de frecuencia. |
| **Tarea** | Unidad de trabajo con estado, etiquetas, fechas y subtareas. |
| **Subtarea** | Paso dentro de una tarea, con estado `done/pending` y barra de progreso propia. |
| **Etiqueta** (*tag*) | Clasificación libre y reutilizable de tareas (Trabajo, Personal, Estudio). |
| **Tarea flotante** | Tarea sin fecha límite estricta, ligado a una ventana (p. ej. «para esta semana») o sin ventana (backlog). |
| **Rollover** | Transferencia de una tarea no completada al día siguiente. |
| **Deadline** | Fecha límite estricta de una tarea (`dueDate`). |
| **Ventana** | Intervalo `start/end` de una tarea flotante. |

---

## 3. Principios Quiet Progress (normativos)

| # | Principio | Regla verificable | Aplicado en |
| --- | --- | --- | --- |
| P1 | **El descanso no es un fallo** | `rest` y `skipped` no cuentan como incumplimiento, no restan Meta Base y no rompen rachas | [§6.4](#64-descansos-omisiones-y-días-de-descanso-programado), [§6.7](#67-rachas) |
| P2 | **Sin alertas de retraso** | Ninguna vista muestra etiquetas tipo "retrasado"/"vencido" en rojo. Las tareas movidas se muestran con un contador neutro («movida 2 veces») | [§7.5](#75-rollover-sin-alertas-de-retraso) |
| P3 | **El cumplimiento se mide sobre lo programado** | El denominador de las tasas son las ocurrencias *programadas*, nunca los días calendario | [§9](#9-analítica-quiet-analytics) |
| P4 | **Métricas accionables, no culpabilizadoras** | Toda métrica se acompaña de tendencia comparativa (WoW/MoM/YoY) y ninguna penaliza explícitamente al usuario | [§9](#9-analítica-quiet-analytics) |
| P5 | **Gamificación suave** | Puntos por constancia (10/20) sin penalizaciones; los hitos celebran rachas, no los castigan | [§6.5](#65-sistema-de-puntuación) |
| P6 | **Minimalismo** | Máximo 2 interacciones para registrar; acciones secundarias (notas, etiquetas) siempre colapsadas | [§8](#8-vistas-funcionales) |
| P7 | **Baja presión visual** | Modo oscuro con paleta de bajo contraste; el rojo se reserva para errores reales, no para "incumplimientos" | [§10](#10-diseño-accesibilidad-y-modo-oscuro) |

---

## 4. Arquitectura

### 4.1 Arquitectura objetivo

| Componente | Tecnología |
| --- | --- |
| Frontend móvil | **React Native + Expo** (Expo Router, React Navigation con pestañas) |
| Backend / API | **Node.js + Express** + TypeScript, validación con Zod, REST `/api/v1` |
| Base de datos | **PostgreSQL** (Docker en desarrollo), ORM Prisma |
| Autenticación | **JWT**: access token (15 min) + refresh token (30 días, cookie httpOnly) |
| Notificaciones | **Expo Notifications** (push local) + planificador servidor (`node-cron`) para recordatorios |
| Estado cliente | Zustand + TanStack Query; caché local en `expo-sqlite` |
| Gráficos | `react-native-svg` + `victory-native` (sustituye a Recharts en el cliente nativo) |
| Fechas | `date-fns` (mismas funciones y formato local `YYYY-MM-DD` que la implementación actual) |
| Tests | Vitest (dominio puro) + Maestro (E2E) |

### 4.2 Implementación actual (Fase 0 — SPA local-first)

El repositorio contiene hoy una **SPA de escritorio/móvil** que funciona como prototipo funcional y referencia de las reglas de negocio:

- **Stack:** Vite + React 19 + TypeScript · Tailwind CSS v4 + shadcn/ui + lucide-react · Zustand · Recharts · date-fns.
- **Persistencia:** IndexedDB vía `idb-keyval`, encapsulada tras la interfaz `DataRepository` (`LocalRepository`; futura: `SupabaseRepository`).
- **Lógica pura testeable:** `src/lib/scoring.ts` (estados/puntos/meta base/score diario) y `src/lib/stats.ts` (rachas/tasas/heatmap/deltas), cubiertas por Vitest.
- **Vistas:** Dashboard, Calendario (semanal/mensual), Estadísticas, Hábitos.
- **Idioma UI:** Español.

Esta Fase 0 **no se descarta**: su motor de reglas se migra tal cual al dominio compartido (§4.3).

### 4.3 Estrategia de migración

1. Extraer el dominio a un paquete compartido `packages/domain` (TypeScript puro, sin dependencias de UI) usado por la SPA, la app móvil y el backend Express → **una sola definición de reglas de negocio**.
2. Portar `scoring.ts` y `stats.ts` al paquete compartido, extendidos con las reglas v2 (§6, §7) y cubiertos por los mismos tests Vitest.
3. Implementar la API REST (§11) y el esquema PostgreSQL (§5.2) alineados 1:1 con los contratos de `packages/domain`.
4. La SPA queda como cliente de la misma API durante la transición; la app móvil RN/Expo asume el rol de cliente principal.
5. Mantener la interfaz `DataRepository` como capa de acceso a datos: `LocalRepository` (IndexedDB/SQLite, offline) → `RemoteRepository` (API + sync). La UI no cambia de contrato.

---

## 5. Modelo de datos

Fuente de verdad de los contratos: `packages/domain/src/types.ts` (extraído de `src/types/domain.ts`).

### 5.1 Contratos TypeScript

```ts
export type HabitType = 'fixed' | 'extra'
export type MeasurementType = 'boolean' | 'percentage' | 'time' | 'counter'
export type LogStatus = 'incomplete' | 'completed' | 'overcompleted' | 'skipped' | 'rest'
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6   // 0 = domingo

export type HabitSchedule =
  | { mode: 'daily' }
  | { mode: 'weekdays'; days: Weekday[] }
  | { mode: 'timesPerWeek'; times: number }
  | { mode: 'timesPerMonth'; times: number }

export interface Habit {
  id: string                  // UUID v4
  name: string
  type: HabitType
  category: string            // texto libre, autocompletable con categorías existentes
  measurementType: MeasurementType
  targetValue: number         // ver tabla abajo
  schedule: HabitSchedule     // programación flexible (v2: reemplaza a scheduleDays)
  restDays?: Weekday[]        // días de descanso programado (no generan log)
  startDate: string           // YYYY-MM-DD local
  endDate: string | null      // null = indefinido
  archived: boolean
  archivedAt: string | null   // fecha de archivo (YYYY-MM-DD); null si activo
  createdAt: string
}

export interface HabitLog {
  id: string                  // UUID v4
  habitId: string
  date: string                // YYYY-MM-DD local
  status: LogStatus
  value: number               // valor registrado según measurementType
  pointsEarned: number        // denormalizado en escritura: 0 | 10 | 20
  note?: string | null        // Log Note (≤ 280 caracteres)
  updatedAt: string           // ISO datetime
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'postponed'

export type TaskDateMode = 'strict' | 'floating'

export type RolloverMode = 'auto' | 'manual' | 'off'

export interface Subtask {
  id: string
  title: string
  done: boolean
  completedAt: string | null
}

export interface Task {
  id: string                  // UUID v4
  title: string
  description?: string | null
  status: TaskStatus
  tags: string[]              // etiquetas normalizadas (lowercase, sin espacios duplicados)
  dateMode: TaskDateMode      // 'strict' = deadline; 'floating' = ventana
  dueDate?: string | null     // deadline (dateMode = 'strict')
  windowStart?: string | null // ventana (dateMode = 'floating')
  windowEnd?: string | null   // ventana (dateMode = 'floating')
  plannedDate?: string | null // día en que aparece en «Hoy»
  rollover: RolloverMode
  rolloverCount: number       // nº de veces que ha sido movida (chip neutro)
  postponedTo?: string | null // fecha objetivo tras posponer
  subtasks: Subtask[]
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}
```

#### Semántica de `targetValue` según `measurementType`

| `measurementType` | `targetValue` | Rango de `value` |
| --- | --- | --- |
| `boolean` | `1` (implícito) | `0` = sin marcar, `1` = marcado |
| `percentage` | `100` (implícito) | `0…100` |
| `time` | minutos objetivo (ej. `30`) | `0…∞` (minutos) |
| `counter` | repeticiones objetivo (ej. `8`) | `0…∞` |

#### Compatibilidad con v1.x

`Habit.scheduleDays?: number[]` se migra a `schedule: { mode: 'weekdays', days }`; `scheduleDays === undefined` → `{ mode: 'daily' }`. La migración se ejecuta una sola vez en el cliente y en el servidor (script `migrate_v1_to_v2`).

### 5.2 Esquema PostgreSQL

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE habits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('fixed','extra')),
  category        TEXT NOT NULL DEFAULT 'General',
  measurement_type TEXT NOT NULL CHECK (measurement_type IN ('boolean','percentage','time','counter')),
  target_value    NUMERIC NOT NULL DEFAULT 1,
  schedule        JSONB NOT NULL,
  rest_days       SMALLINT[],
  start_date      DATE NOT NULL,
  end_date        DATE,
  archived        BOOLEAN NOT NULL DEFAULT false,
  archived_at     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_habits_user ON habits(user_id);

CREATE TABLE habit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id     UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('incomplete','completed','overcompleted','skipped','rest')),
  value        NUMERIC NOT NULL DEFAULT 0,
  points_earned SMALLINT NOT NULL DEFAULT 0,
  note         TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, date)
);
CREATE INDEX idx_logs_habit_date ON habit_logs(habit_id, date);

CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL CHECK (status IN ('pending','in_progress','completed','postponed')),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  date_mode       TEXT NOT NULL CHECK (date_mode IN ('strict','floating')),
  due_date        DATE,
  window_start    DATE,
  window_end      DATE,
  planned_date    DATE,
  rollover        TEXT NOT NULL DEFAULT 'auto' CHECK (rollover IN ('auto','manual','off')),
  rollover_count  SMALLINT NOT NULL DEFAULT 0,
  postponed_to    DATE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);

CREATE TABLE subtasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  done         BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  position     SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_subtasks_task ON subtasks(task_id, position);

CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
```

---

## 6. Reglas de negocio — Hábitos

### 6.1 Programación flexible

Un hábito es **programado** para la fecha `d` si:

```text
startDate ≤ d ∧ (endDate = null ∨ d ≤ endDate) ∧ ¬archived*
              ∧ schedule.mode ∈ {daily, weekdays}
              ∧ (schedule.mode = 'daily' ∨ weekday(d) ∈ schedule.days)
              ∧ weekday(d) ∉ restDays
```

\* Los archivados no se programan a futuro, pero se consideran programados retroactivamente entre `startDate` y `archivedAt` para no distorsionar métricas históricas.

**Modos de programación:**

| Modo | Semántica | ¿Aporta a la Meta Base diaria? | Unidad de cumplimiento |
| --- | --- | --- | --- |
| `daily` | Todos los días | Sí | Día |
| `weekdays` | Días concretos de la semana | Sí | Día |
| `timesPerWeek` | Cuota semanal (p. ej. 3 veces/semana) | **No** | Semana ISO (lunes–domingo) |
| `timesPerMonth` | Cuota mensual (p. ej. 12 veces/mes) | **No** | Mes calendario |

**Hábitos de cuota (`timesPerWeek` / `timesPerMonth`):**

- Se muestran en «Hoy» como *pendientes de cuota* («te faltan 2 esta semana»), nunca como incumplimientos.
- Cada log `completed`/`overcompleted` cuenta **1** para la cuota (un `overcompleted` no cuenta 2, aunque sí aporta los 20 pts).
- La cuota se considera cumplida cuando `logs con status ∈ {completed, overcompleted} en el período ≥ cuota`.
- El período en curso solo cuenta para la racha de cuota una vez cumplida.
- Nunca rompen la racha diaria ni entran en la Meta Base; sus puntos suman al numerador del día (criterio `extra`).

### 6.2 Matriz de estados por tipo de medición

Dado un log con `value` y el `Habit` asociado:

| Tipo | `incomplete` | `completed` | `overcompleted` | `skipped` | `rest` |
| --- | --- | --- | --- | --- | --- |
| `boolean` | `value = 0` | `value ≥ 1` | Solo por acción manual explícita ("marcar sobre-cumplido") | Sin registrar | Sin registrar |
| `percentage` | `0 < value < 100` | `value ≥ 100` | No aplicable (tope natural en 100%) | Sin registrar | Sin registrar |
| `time` | `value < targetValue` | `targetValue ≤ value` | `value > targetValue` (automático) | Sin registrar | Sin registrar |
| `counter` | `value < targetValue` | `targetValue ≤ value` | `value > targetValue` (automático) | Sin registrar | Sin registrar |

Reglas adicionales:

- Si `value = 0` y no existe intención de registro, el log puede eliminarse (equivale a "sin registrar").
- Un log con `status='incomplete'` solo persiste si aporta información (progreso parcial > 0, o marcado manual).
- `skipped` y `rest` se registran con `value = 0` y `pointsEarned = 0`.
- Un log `skipped`/`rest` **excluye** el hábito de la Meta Base de ese día y **no** cuenta como fallo en ninguna tasa (§9).

### 6.3 Meta Base y cálculo del día

```text
metaBase(d)   = Σ 10  para cada hábito fixed programado en d
                 y SIN log de status 'skipped' | 'rest' en d
puntos(d)     = Σ pointsEarned de todos los logs con date = d
rendimiento(d) = puntos(d) / metaBase(d)        // ej. 70/50 = 140%
```

Visualización del día: **`{puntos} / {metaBase} pts`**. Ejemplo: 5 fijos completados (+50) + 2 extras completados (+20) ⇒ `70 / 50 pts`.

Clasificación del día:

| Tipo | Condición | Efecto en racha | Efecto en tasas |
| --- | --- | --- | --- |
| **Perfecto** | `metaBase(d) > 0 ∧ puntos(d) ≥ metaBase(d)` | Extiende | — |
| **Neutral** | `metaBase(d) = 0` | Se omite (no extiende ni rompe) | No cuenta como día programado |
| **Fallido** | `metaBase(d) > 0 ∧ puntos(d) < metaBase(d)` | Rompe | Cuenta como incumplido |

Casos borde:

- Si `metaBase(d) = 0`, el rendimiento se muestra como *n/a* y los puntos obtenidos son puros extra.
- Los días futuros muestran la meta base pero no admiten registro.
- Un día en el que todos los fijos programados están en descanso/omitido es **neutral**: no penaliza.

### 6.4 Descansos, omisiones y días de descanso programado

| Mecanismo | Quién lo dispara | Efecto | Visible como |
| --- | --- | --- | --- |
| **Día de descanso programado** (`restDays`) | Configuración del hábito | La ocurrencia de ese weekday no aplica por diseño; no genera log, no cuenta en el denominador | Chip «descanso» en la card del día |
| **Descanso** (`rest`) | Acción del usuario sobre una ocurrencia concreta | Excluye el hábito de la Meta Base de ese día; no cuenta como fallo; no rompe racha | Ícono de luna en el log |
| **Omisión** (`skipped`) | Acción del usuario sobre una ocurrencia concreta | Igual que `rest` en métricas; se distingue en el historial | Chip «omitido» en el log |

Reglas:

- `rest`/`skipped` son **mutuamente excluyentes** con `completed`/`overcompleted`: al aplicar uno, se elimina el log previo de esa fecha.
- Aplicar `rest`/`skipped` es reversible: se puede deshacer y volver a registrar.
- Un `rest` aplicado **hoy** no puede "arreglar" días pasados: solo aplica a su fecha.
- Los descansos nunca generan penalización visual (nada de rojo, contadores de "fallos" Derivantes).

### 6.5 Sistema de puntuación

| Evento | Puntos |
| --- | --- |
| Log `incomplete` | **0 pts** |
| Log `completed` | **+10 pts** |
| Log `overcompleted` | **+20 pts** (10 base + 10 bonus) |
| Log `skipped` / `rest` | **0 pts** |

Constantes: `POINTS_COMPLETE = 10`, `POINTS_OVERCOMPLETE_BONUS = 10`.

### 6.6 Notas de log (Log Notes)

- Campo opcional `note` (≤ 280 caracteres) en `HabitLog`.
- Disponible al **completar o fallar** un hábito (acción secundaria, colapsada por defecto → P6).
- Visible en: timeline del hábito, detalle del día y vista de notas en Estadísticas.
- No afecta al cálculo de puntos ni de tasas.
- Editable y borrable por el autor del log.

### 6.7 Rachas

**Racha diaria:**

- **Racha actual**: días perfectos consecutivos. Hoy cuenta si ya es perfecto; si no, se cuenta hasta ayer. Los días **neutrales** se omiten de la secuencia (no rompen). Un día **fallido** rompe la racha.
- **Racha más larga**: máximo histórico sobre todo el rango disponible.
- **Racha de cuota**: períodos consecutivos (semana/mes) en que la cuota del hábito se cumple. Se muestra junto al nombre del hábito ("3 semanas seguidas").
- Las rachas son **por hábito** y **global** (racha del día = días perfectos). Las tareas no participan de las rachas.

### 6.8 Edición temporal

- **Hoy y pasado:** registro y edición libres.
- **Futuro:** tarjetas visibles pero deshabilitadas (sin edición).
- Eliminar un log restaura el hábito a "sin registrar" para ese día.
- Aplicar `rest`/`skipped` sobre un día pasado está permitido (reparación del historial).

---

## 7. Reglas de negocio — Tareas

### 7.1 Ciclo de vida

| Estado | Descripción | Transiciones permitidas |
| --- | --- | --- |
| `pending` | Pendiente | → `in_progress`, `postponed`, `completed` |
| `in_progress` | En progreso | → `pending`, `postponed`, `completed` |
| `postponed` | Pospuesto (con `postponedTo`) | → `pending` (al llegar `postponedTo` o manualmente) |
| `completed` | Completado (`completedAt`) | → `pending` (reabrir) |

Reglas:

- Una tarea con subtareas empieza en `in_progress` al completar su primera subtarea.
- Si **todas** las subtareas están `done`, la tarea pasa automáticamente a `completed` (salvo que el usuario la haya reabierto manualmente antes).
- Marcar `completed` no exige completar subtareas (el usuario decide; el progreso queda visible).
- Al reabrir una tarea completada, se limpia `completedAt` y el progreso vuelve a 0 %.

### 7.2 Etiquetas y categorías

- Etiquetas de texto libre, normalizadas: minúsculas, sin espacios duplicados, recortadas.
- Reutilizables entre tareas; autocompletado con las etiquetas existentes del usuario.
- Máximo de 8 etiquetas por tarea.
- El módulo de tareas **no** interactúa con la `category` de los hábitos (conceptos separados, UI separada).

### 7.3 Fechas flexibles

| Modo | Campos | Uso |
| --- | --- | --- |
| `strict` | `dueDate` (obligatorio) | Fecha límite estricta. Tras pasar la fecha, la tarea **no** se marca como vencida: simplemente sigue pendiente (P2). |
| `floating` | `windowStart` + `windowEnd` (ambos opcionales) | Tarea sin deadline: «para esta semana». Sin ventana ⇒ backlog. |

Reglas:

- Una tarea aparece en «Hoy» si: `plannedDate = hoy` **o** (`dateMode='strict'` ∧ `dueDate = hoy`) **o** (`dateMode='floating'` ∧ hoy ∈ ventana).
- Solo una de estas configuraciones puede estar activa por tarea (`dateMode` decide la semántica).
- `plannedDate` es siempre editable ("Mover a mañana" / "Mover a hoy").

### 7.4 Subtareas y progreso

- Subtareas ordenadas (`position`), con `done` y `completedAt`.
- Barra de progreso de la tarea: `subtareas done / total` (0 subtareas ⇒ sin barra).
- La barra de progreso se muestra en la lista de «Hoy» y en el detalle de la tarea.

### 7.5 Rollover sin alertas de retraso

El **rollover** transfiere al día siguiente las tareas no completadas cuyo `plannedDate` ya pasó.

| Modo | Comportamiento |
| --- | --- |
| `auto` | Al iniciar el día (o al abrir la app con una fecha nueva), las tareas con `plannedDate < hoy` y estado ≠ `completed` se actualizan a `plannedDate = hoy` y `rolloverCount++`. |
| `manual` | La app **ofrece** la acción («Mover a hoy») en un tono neutro; la tarea permanece visible en «Hoy» con la acción sugerida. |
| `off` | La tarea no se mueve; permanece en su fecha original y no aparece en «Hoy» salvo por deadline/ventana. |

Reglas (P2):

- El rollover **nunca** muestra etiquetas punitivas ("retrasado", "vencido", contadores en rojo). La información se muestra como chip neutro: «movida 2 veces».
- El rollover incrementa `rolloverCount` y no genera penalización en métricas ni rachas.
- El `dueDate` de una tarea `strict` **nunca** se modifica por el rollover: solo se mueve `plannedDate`.
- Una tarea `postponed` no se arrastra por el rollover: su fecha es la elegida por el usuario.
- El rollover se ejecuta como tarea idempotente al inicio de sesión y en el cambio de día local.

### 7.6 Postposición

- Pospuesta = `status='postponed'` + `postponedTo` (fecha elegida por el usuario).
- Al llegar `postponedTo`, la tarea vuelve a `pending` con `plannedDate = postponedTo`.
- Pospuesta y rollover son mutuamente excluyentes en el mismo día: si el usuario pospone, el rollover no actúa sobre esa tarea.

---

## 8. Vistas funcionales

Navegación principal por pestañas: **Hoy · Hábitos · Tareas · Estadísticas · Ajustes**.

### 8.1 Hoy (inicio)

- **Anillo de score** del día: `{puntos}/{meta} pts` + % de rendimiento.
- **Hábitos de hoy**: lista de hábitos programados con control inline según tipo de medición (check, slider %, stepper tiempo/contador), chips «descanso» y «omitir», y acción secundaria colapsada para la **nota de log**.
- **Hábitos de cuota**: bloque «Pendientes de cuota» con el texto «te faltan N esta semana» (nunca «incumplido»).
- **Tareas de hoy**: tareas con `plannedDate = hoy`, deadlines de hoy y tareas flotantes dentro de su ventana, con barra de subtareas, etiquetas y acciones «posponer» / «completar».
- **Acciones rápidas**: añadir hábito, añadir tarea (≤ 2 interacciones; P6).

### 8.2 Calendario (hábitos)

- **Vista semanal (default):** ventana de 7 días (semana lunes–domingo que contiene hoy); navegación semanal; botón «Hoy». En pantallas grandes (≥xl) se distribuye en dos filas: lunes–jueves en primera fila y viernes–domingo en segunda fila, alineados a la izquierda.
- **Vista mensual:** grilla del mes completo, misma semántica.
- Estilo Google Calendar:
  - Días pasados: fondo atenuado (`bg-muted/40`).
  - Hoy: highlight claro (borde/anillo primary).
  - Días futuros: deshabilitados para registro.
- Cada card de día muestra: fecha, hábitos programados con control inline compacto (+/- o casilla), barra de progreso con `completado/objetivo`, pie con score `X / Y pts`. En vista semanal hay un botón «Añadir» para crear un hábito pre-rellenando la fecha del día.
- **Heatmap mensual por hábito**: en el detalle de cada hábito, calendario de calor de 1 mes con niveles 0–4 según cumplimiento de ese hábito.

### 8.3 Gestión de hábitos

- Crear/editar/archivar hábitos. Campos: nombre, tipo (fijo/extra), categoría (texto libre + sugerencias), medición, meta (`targetValue`), programación (diario / días de la semana / X por semana / X por mes), días de descanso, fechas inicio/fin.
- Detalle de hábito: racha actual y máxima, racha de cuota, cumplimiento 30 días, heatmap mensual, timeline de logs con notas, y acciones «Marcar descanso» / «Omitir».
- Archivar ≠ eliminar: conserva histórico.

### 8.4 Tareas

- **Lista principal:** filtro por estado (pendiente / en progreso / pospuesta / completadas), por etiqueta y por rango de fechas; orden por deadline y luego por creación.
- **Detalle de tarea:** descripción, etiquetas, fechas, checklist de subtareas con barra de progreso, historial de movimientos (movidas/pospuestas) y notas.
- **Creación rápida:** título + etiqueta opcional; el resto de campos se edita en detalle.

### 8.5 Estadísticas

Ver [§9](#9-analítica-quiet-analytics).

### 8.6 Ajustes

- Tema (auto/claro/oscuro), recordatorios por hábito, cuenta (registro/inicio de sesión/sesión), exportación e importación de datos (JSON), estado de sincronización, borrado local.

---

## 9. Analítica *Quiet Analytics*

Filtros de rango: **Semanal / Mensual / Anual / Histórico** (todo hasta hoy).

| Métrica | Definición exacta |
| --- | --- |
| **Completion Rate** | `Σ unidades cumplidas / Σ unidades programadas` del rango. Unidad = día programado (hábitos `daily`/`weekdays`) o período (hábitos de cuota). Los días de descanso programado y los logs `skipped`/`rest` **no** generan unidades programadas (P3). |
| **Overcompletion Rate** | `unidades overcompleted / unidades programadas`. |
| **Incomplete Rate** | `unidades no cumplidas / unidades programadas`. Solo incluye días en los que había obligación real. |
| **Consistencia (rachas)** | Según [§6.7](#67-rachas): racha diaria global, racha por hábito y racha de cuota. |
| **Distribución por categorías** | Puntos obtenidos agrupados por `category`; visual donut + radar. |
| **Heatmap global** | Grilla calendario (estilo GitHub); intensidad 0–4 según `rendimiento(d)`: 0 = sin datos/0 %, 1 = <25 %, 2 = 25–74 %, 3 = 75–99 %, 4 = ≥100 %. Ventana: rango seleccionado; en *Anual* últimas ~26 semanas; en *Histórico* últimos 365 días. |
| **Heatmap por hábito** | Mensual; nivel 0–4 según el estado del log de ese hábito en cada día (`skipped`/`rest` = celda neutra, no nivel 0). |
| **Delta de mejora** | `Δ = (rendimientoProm(período actual) − rendimientoProm(período anterior)) / rendimientoProm(período anterior) × 100 %`. Período anterior = misma duración inmediatamente previa. Se muestra WoW, MoM y YoY según filtro activo. |
| **Notas de reflexión** | Listado cronológico de `HabitLog.note` con hábito y fecha; permite releer el contexto de los días difíciles. |

Regla transversal: **ninguna métrica cuenta un descanso como fallo**, y toda métrica se acompaña de su tendencia comparativa (P4).

---

## 10. Diseño, accesibilidad y modo oscuro

- **Minimalismo:** sin elementos decorativos; densidad baja; una acción primaria por pantalla.
- **Modo oscuro nativo** con paleta de **bajo contraste** para reducir fatiga visual:

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `--background` | `#FAF9F7` | `#14161A` | Fondo |
| `--card` | `#FFFFFF` | `#1C1F24` | Superficies |
| `--foreground` | `#22262B` | `#E6E8EA` | Texto principal |
| `--muted-foreground` | `#6B7280` | `#9AA1A9` | Texto secundario |
| `--primary` | `#4F7C72` (salvia) | `#6FA398` | Acento principal |
| `--warning` | `#B5813B` (ámbar) | `#C79A57` | Omitido / pospuesto (nunca rojo) |
| `--destructive` | `#B4453C` | `#D07166` | **Solo** errores reales (fallo de guardado, credenciales) |

- El **rojo** no se usa para representar incumplimientos de hábitos ni tareas atrasadas (P1, P2).
- **Accesibilidad AA:** contraste ≥ 4.5:1 en texto, foco visible, navegación por teclado, etiquetas ARIA en controles de progreso, soporte de tipografía dinámica, objetivos táctiles ≥ 44 px.
- **Estados vacíos** siempre tranquilizadores: «Nada registrado hoy», «Sin tareas para hoy».

---

## 11. API REST (Express)

Prefijo `/api/v1`. Autenticación `Authorization: Bearer <accessToken>` en todas las rutas salvo `/auth/*`.

### 11.1 Autenticación

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/register` | Crea usuario y devuelve access + refresh. |
| POST | `/auth/login` | Email + contraseña → access (15 min) + refresh (30 días, cookie httpOnly). |
| POST | `/auth/refresh` | Renueva el access token. |
| POST | `/auth/logout` | Revoca el refresh token. |
| GET | `/auth/me` | Perfil del usuario autenticado. |

### 11.2 Hábitos y logs

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/habits` | Lista de hábitos del usuario (incluye archivados con `?archived=true`). |
| POST | `/habits` | Crea un hábito. |
| PATCH | `/habits/:id` | Actualiza un hábito. |
| DELETE | `/habits/:id` | Elimina (hard delete opcional: `?soft=true` archiva). |
| GET | `/habits/:id/heatmap?month=YYYY-MM` | Heatmap mensual del hábito. |
| GET | `/logs?from=&to=&habitId=` | Logs del rango (incluye `note`). |
| PUT | `/logs/:habitId/:date` | Upsert de log (`status`, `value`, `note`). |
| DELETE | `/logs/:habitId/:date` | Elimina el log (vuelve a "sin registrar"). |
| POST | `/logs/:habitId/:date/rest` | Marca descanso del día. |
| POST | `/logs/:habitId/:date/skip` | Marca omisión del día. |

### 11.3 Tareas

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/tasks?status=&tag=&from=&to=` | Lista filtrada. |
| POST | `/tasks` | Crea una tarea. |
| GET | `/tasks/:id` | Detalle con subtareas. |
| PATCH | `/tasks/:id` | Actualiza (estado, fechas, etiquetas, rollover). |
| DELETE | `/tasks/:id` | Elimina. |
| POST | `/tasks/:id/rollover` | Ejecuta el rollover (idempotente). |
| POST | `/tasks/:id/postpone` | Pospone a una fecha (`body: { date }`). |
| POST | `/tasks/:id/subtasks` | Añade subtarea. |
| PATCH | `/tasks/:id/subtasks/:subtaskId` | Marca/desmarca subtarea. |
| DELETE | `/tasks/:id/subtasks/:subtaskId` | Elimina subtarea. |

### 11.4 Estadísticas y sincronización

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/stats/summary?range=week\|month\|year\|all` | Tasas, rachas, distribución por categoría. |
| GET | `/stats/heatmap?range=` | Celdas del heatmap global. |
| GET | `/stats/habit/:id/heatmap?month=` | Heatmap por hábito. |
| GET | `/stats/delta?range=` | Deltas WoW/MoM/YoY. |
| GET | `/sync?since=<ISO>` | Cambios del servidor posteriores a `since` (delta sync). |
| POST | `/sync` | Envía mutaciones locales (last-write-wins por `updatedAt`). |

Reglas de API:

- Validación de entrada con Zod; errores `400` con detalle por campo.
- `409` en conflicto de versión cuando `updatedAt` del cliente es anterior al del servidor en una mutación explícita (en `POST /sync` se resuelve por last-write-wins y se devuelve el estado ganador).
- Soft delete de hábitos por defecto (archivado) para no perder historial.

---

## 12. Requisitos no funcionales

| Área | Requisito |
| --- | --- |
| **Offline-first** | Todas las lecturas/escrituras se resuelven localmente (`expo-sqlite`); la API es sincronización, no dependencia. Sin red, la app opera con normalidad. |
| **Sincronización** | Delta sync por `updatedAt`; resolución *last-write-wins* por entidad; conflictos de tareas resueltos a favor del `updatedAt` más reciente. |
| **Rendimiento** | Arranque en frío < 2 s; render de 365 días de heatmap < 100 ms; scroll de la lista de tareas a 60 fps. |
| **Seguridad** | Hash de contraseñas con bcrypt (coste ≥ 12); JWT firmado; refresh tokens hasheados en BD; TLS; rate limiting en `/auth`; no se registran datos personales en logs. |
| **Notificaciones** | Recordatorios locales por hábito (hora configurable), **respetando** días de descanso, omisiones y una franja de silencio configurable (por defecto 22:00–08:00). Nunca notificaciones de "retraso". |
| **Privacidad** | Los datos son del usuario; exportables e importables en JSON; borrado local y de cuenta. |
| **Accesibilidad** | AA, navegación por teclado, lector de pantalla, tipografía dinámica, objetivos ≥ 44 px. |
| **Internacionalización** | Español por defecto; cadenas extraídas para i18n futura. |
| **Testing** | Dominio puro cubierto por Vitest (≥ 90 % sobre `packages/domain`); API con tests de integración; E2E de los flujos críticos (registro de hábito, descanso, rollover, sync). |

---

## 13. Roadmap por fases

| Fase | Contenido | Entregables |
| --- | --- | --- |
| **Fase 0 — Prototipo local-first** *(hecha)* | SPA Vite: hábitos, calendario, stats, puntos, IndexedDB. | Motor de reglas (`scoring.ts`, `stats.ts`) con tests; base de la UX. |
| **Fase 1 — Dominio v2** | `packages/domain` compartido: `schedule` flexible, `rest`/`skipped`, notas, modelo de tareas y subtareas. | Contratos TS, motor de reglas v2 con tests, script de migración v1→v2. |
| **Fase 2 — Backend y datos** | Express + PostgreSQL + Prisma + JWT; esquema de §5.2; API de §11. | API funcional, migraciones, auth con refresh, tests de integración. |
| **Fase 3 — App móvil y UI/UX** | React Native + Expo; pestañas Hoy/Hábitos/Tareas/Estadísticas/Ajustes; modo oscuro de bajo contraste. | Cascarón navegable, offline-first con SQLite, state management y sync engine. |
| **Fase 4 — Módulo de tareas** | Ciclo de vida, etiquetas, fechas flexibles, rollover, subtareas y postposición. | Flujo completo de tareas con pruebas E2E. |
| **Fase 5 — Analítica Quiet y notificaciones** | Heatmap por hábito, notas de reflexión, deltas, recordatorios push sin alertas de retraso. | Pantalla de estadísticas completa, notificaciones config por hábito. |

---

## 14. Trazabilidad: del SRS QP a esta spec

| Requisito del SRS QP | Dónde vive en esta spec |
| --- | --- |
| Gestión del ciclo de vida de tareas (pendiente / en progreso / completado / pospuesto) | [§7.1](#71-ciclo-de-vida) |
| Categorización y etiquetas de tareas | [§7.2](#72-etiquetas-y-categorías) |
| Flexibilidad de fechas (deadline vs. flotante) | [§7.3](#73-fechas-flexibles) |
| Rollover automático sin alertas de retraso | [§7.5](#75-rollover-sin-alertas-de-retraso) |
| Subtareas con barras de progreso | [§7.4](#74-subtareas-y-progreso) |
| Hábitos check-off y medibles | [§6.2](#62-matriz-de-estados-por-tipo-de-medición) |
| Programación flexible (diario / días concretos / X por semana o mes) | [§6.1](#61-programación-flexible) |
| Pausas permitidas (descanso / omitido sin romper racha) | [§6.4](#64-descansos-omisiones-y-días-de-descanso-programado) |
| Rachas actual y máxima + heatmap mensual | [§6.7](#67-rachas), [§8.2](#82-calendario-hábitos) |
| Cumplimiento sobre días programados (no totales) | [§9](#9-analítica-quiet-analytics) |
| Log Notes (diario de reflexión) | [§6.6](#66-notas-de-log-log-notes) |
| Modo oscuro de bajo contraste | [§10](#10-diseño-accesibilidad-y-modo-oscuro) |
| Stack React Native + Express + PostgreSQL + JWT + push | [§4.1](#41-arquitectura-objetivo), [§11](#11-api-rest-express), [§12](#12-requisitos-no-funcionales) |
| Fases 1–5 de desarrollo | [§13](#13-roadmap-por-fases) |

**Elementos del SRS QP no adoptados:** el notion de "aplicación móvil con notificaciones push de recordatorio" se adopta completo; no se adopta el uso de una base relacional servidor como única fuente de verdad (el modelo sigue siendo offline-first, §12).

---

## 15. Changelog

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 1.0.0 | 2026-08-22 | Spec inicial. Decisiones: Vite SPA (no Next.js), persistencia IndexedDB con repositorio abstracto, agenda de fijos configurable por día de semana (`scheduleDays`), registro futuro deshabilitado, UI en español. Adiciones al modelo original: campo `targetValue` en `Habit` (necesario para resolver overcompletion en time/counter) y `scheduleDays` (necesario para Meta Base por día). Días sin fijos programados no rompen rachas (se omiten de la secuencia). |
| 1.0.1 | 2026-08-22 | Ajustes de implementación: la semana calendario inicia **lunes** (`weekStartsOn: 1`). Ventanas del heatmap definidas (Anual ≈ 26 semanas; Histórico = 365 días). Delta del dashboard compara últimos 7 días vs. 7 anteriores. Seed demo se marca con flag en IndexedDB para no re-sembrar tras borrado manual. Añadido `archivedAt` a `Habit` para programación retroactiva de archivados. |
| 2.0.0 | 2026-10-22 | **Reescritura mayor** inspirada en `QP_TASK_AND_HABITS_TRACKER.MD`. Novedades: (1) **Módulo de tareas** completo — lifecycle `pending/in_progress/postponed/completed`, etiquetas, fechas flexibles (deadline vs. ventana flotante), *rollover* `auto/manual/off` sin alertas de retraso, subtareas con barra de progreso y postposición; (2) **Quiet Progress** — nuevos `LogStatus` `skipped`/`rest` que no rompen rachas ni penalizan la Meta Base, `restDays` por hábito, programación por cuota (`timesPerWeek`/`timesPerMonth`) con su propia racha, días neutros; (3) **Log Notes** (≤ 280 chars) en cada log; (4) **Analítica** — Completion Rate sobre unidades programadas, heatmap por hábito mensual, vista de notas; (5) **Diseño** — paleta de bajo contraste con modo oscuro, ámbar (nunca rojo) para omisiones y posposiciones; (6) **Arquitectura objetivo** — React Native + Expo, Express + PostgreSQL + Prisma, JWT, notificaciones push y sync offline-first; la SPA actual queda como Fase 0 y su motor de reglas se extrae a `packages/domain`; (7) Nueva sección de API REST y esquema SQL. |
