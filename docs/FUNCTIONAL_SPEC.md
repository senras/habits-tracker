# Especificación Funcional — Habit & Gamified Daily Tracker

> **Documento vivo (Living Spec).** Regla de sincronización: cualquier cambio en reglas de negocio, campos de datos o flujos de usuario debe reflejarse aquí **en la misma tarea** que lo implementa. Cada cambio se registra en el [Changelog](#7-changelog).

- **Versión:** 1.0.1
- **Fecha:** 2026-08-22
- **Estado:** Implementación Fases 1–7

---

## 1. Visión general del producto

Aplicación web responsiva para el seguimiento de hábitos diarios con un sistema de gamificación por puntos. El usuario define hábitos **fijos** (obligatorios) y **extras** (opcionales), registra su progreso diario desde una vista de calendario estilo Google Calendar, y obtiene analítica de mejora continua: tasas de cumplimiento, rachas, balance por categorías, heatmap de intensidad y comparativas contra períodos anteriores.

### Metas del producto

1. Registro diario de progreso en ≤ 2 interacciones por hábito.
2. Puntuación diaria transparente: siempre visible el par `puntos obtenidos / meta base`.
3. Analítica accionable que motive la mejora (% rendimiento, rachas, deltas).
4. Local-first: todos los datos viven en el dispositivo (IndexedDB), con arquitectura preparada para sincronización futura (Supabase).
5. Accesibilidad AA y diseño responsive móvil → desktop.

---

## 2. Glosario

| Término | Definición |
| --- | --- |
| **Hábito fijo** (`fixed`) | Hábito obligatorio. Cuenta hacia la Meta Base diaria si está programado para ese día. |
| **Hábito extra** (`extra`) | Hábito opcional. No cuenta hacia la Meta Base; sus puntos suman al numerador (permite superar el 100%). |
| **Meta Base** | Suma de puntos posibles de los hábitos fijos programados para un día (10 pts × N fijos). |
| **Día perfecto** | Día cuyo puntaje obtenido ≥ Meta Base (rendimiento ≥ 100% sobre fijos). |
| **Racha** | Número de días perfectos consecutivos. |
| **Log** | Registro diario del estado/valor de un hábito. |

---

## 3. Modelo de datos y contratos TypeScript

Fuente de verdad: `src/types/domain.ts`.

```ts
export type HabitType = 'fixed' | 'extra'
export type MeasurementType = 'boolean' | 'percentage' | 'time' | 'counter'
export type LogStatus = 'incomplete' | 'completed' | 'overcompleted'

export interface Habit {
  id: string                  // UUID v4
  name: string
  type: HabitType
  category: string            // texto libre, autocompletable con categorías existentes
  measurementType: MeasurementType
  targetValue: number         // ver tabla abajo
  scheduleDays?: number[]     // días de semana 0–6 (0=domingo). undefined = todos los días
  startDate: string           // YYYY-MM-DD local
  endDate: string | null      // null = indefinido
  archived: boolean
  archivedAt: string | null   // fecha de archivo (YYYY-MM-DD); null si activo
}

export interface HabitLog {
  id: string                  // UUID v4
  habitId: string
  date: string                // YYYY-MM-DD local
  status: LogStatus
  value: number               // valor registrado según measurementType
  pointsEarned: number        // denormalizado en escritura: 0 | 10 | 20
  updatedAt: string           // ISO datetime
}
```

### Semántica de `targetValue` según `measurementType`

| `measurementType` | `targetValue` | Rango de `value` |
| --- | --- | --- |
| `boolean` | `1` (implícito) | `0` = sin marcar, `1` = marcado |
| `percentage` | `100` (implícito) | `0…100` |
| `time` | minutos objetivo (ej. `30`) | `0…∞` (minutos) |
| `counter` | repeticiones objetivo (ej. `8`) | `0…∞` |

> **Nota histórica:** `targetValue` y `scheduleDays` no existían en el modelo original del prompt; se añadieron en v1.0.0 porque son imprescindibles para resolver `completed` vs `overcompleted` (tipos `time`/`counter`) y para calcular la Meta Base de días concretos (ver Changelog).

### Reglas invariantes

- Un `(habitId, date)` tiene **a lo sumo un** log.
- No existen logs de días anteriores a `startDate` ni posteriores a `endDate`.
- No existen logs de días futuros a hoy (registro futuro deshabilitado).
- Hábitos archivados no aparecen para registro nuevo, pero sus logs históricos cuentan en estadísticas.
- Fechas siempre en formato local `YYYY-MM-DD` (sin zona horaria UTC implícita).

---

## 4. Reglas de negocio

### 4.1 Programación de hábitos

Un hábito está **programado** para la fecha `d` si:

```text
startDate ≤ d ∧ (endDate = null ∨ d ≤ endDate) ∧ ¬archived*
              ∧ (scheduleDays = undefined ∨ weekday(d) ∈ scheduleDays)
```

\* Los archivados no se programan a futuro, pero se consideran programados retroactivamente entre `startDate` y `archivedAt` para no distorsionar métricas históricas.

### 4.2 Matriz de estados por tipo de medición

Dado un log con `value` y el `Habit` asociado:

| Tipo | `incomplete` | `completed` | `overcompleted` |
| --- | --- | --- | --- |
| `boolean` | `value = 0` | `value ≥ 1` | Solo por acción manual explícita del usuario ("marcar sobre-cumplido") |
| `percentage` | `0 < value < 100` | `value ≥ 100` | No aplicable (tope natural en 100%) |
| `time` | `value < targetValue` | `targetValue ≤ value` | `value > targetValue` (automático) |
| `counter` | `value < targetValue` | `targetValue ≤ value` | `value > targetValue` (automático) |

Regla adicional: si `value = 0` y no existe intención de registro, el log puede eliminarse (equivale a "sin registrar"). Un log con `status='incomplete'` solo persiste si aporta información (ej. progreso parcial > 0, o marcado manual).

### 4.3 Sistema de puntuación

| Evento | Puntos |
| --- | --- |
| Log `incomplete` | **0 pts** |
| Log `completed` | **+10 pts** |
| Log `overcompleted` | **+20 pts** (10 base + 10 bonus) |

Constantes: `POINTS_COMPLETE = 10`, `POINTS_OVERCOMPLETE_BONUS = 10`.

### 4.4 Cálculo del día

```text
metaBase(d)   = Σ 10  para cada hábito fixed programado en d
puntos(d)     = Σ pointsEarned de todos los logs con date = d
rendimiento(d) = puntos(d) / metaBase(d)        // ej. 70/50 = 140%
```

Visualización del día: **`{puntos} / {metaBase} pts`**. Ejemplo del requisito: 5 fijos completados (+50) + 2 extras completados (+20) ⇒ `70 / 50 pts`.

Casos borde:

- Si `metaBase(d) = 0` (no hay fijos programados), el rendimiento se muestra como *n/a* y los puntos obtenidos son puros extra.
- Los días futuros muestran la meta base pero no admiten registro.

### 4.5 Rachas

- **Racha actual**: número de días consecutivos terminados (hoy inclusive si ya es día perfecto; si no, se cuenta hasta ayer) con `puntos(d) ≥ metaBase(d)` y `metaBase(d) > 0`. Un día sin fijos programados **rompe** la racha salvo que tenga al menos un log de hábito extra ese día... *(decisión v1.0: los días sin fijos programados no rompen la racha — se omiten de la secuencia)*.
- **Racha más larga**: máximo histórico de la definición anterior sobre todo el rango disponible.

### 4.6 Edición temporal

- **Hoy y pasado:** registro y edición libres.
- **Futuro:** cards visibles pero deshabilitadas (sin edición).
- Eliminar un log restaura el hábito a "sin registrar" para ese día.

---

## 5. Vistas funcionales

### 5.1 Dashboard (inicio)

- Resumen del día: score circular `{puntos}/{meta} pts`, % rendimiento, lista de hábitos de hoy con acceso rápido a registro.
- Tarjetas compactas: racha actual, racha más larga, delta semanal.

### 5.2 Calendario

- **Vista semanal (default):** ventana de 7 días (semana de lunes a domingo que contiene hoy); navegación semana anterior/siguiente; botón "Hoy".
- **Vista mensual:** grilla mes completo, misma semántica de interacción.
- Estilo Google Calendar:
  - Días pasados: fondo atenuado (`bg-muted/40`).
  - Hoy: highlight claro (borde/anillo primary).
  - Días futuros: deshabilitados para registro.
- Cada card de día muestra: fecha, lista de hábitos programados con control inline según tipo de medición (check, slider %, stepper tiempo/contador), y pie con score `X / Y pts`.

### 5.3 Gestión de hábitos

- Crear/editar/archivar hábitos. Campos: nombre, tipo (fijo/extra), categoría (texto libre + sugerencias), tipo de medición, meta (`targetValue`), días programados (chips L-D), fechas inicio/fin.
- Archivar ≠ eliminar: conserva histórico.

### 5.4 Estadísticas

Filtros de rango: **Semanal / Mensual / Anual / Histórico** (todo hasta hoy).

| Métrica | Definición exacta |
| --- | --- |
| Completion Rate | `% logs completed / (logs completed + overcompleted + incomplete)` sobre hábitos programados del rango |
| Overcompletion Rate | `% logs overcompleted / mismo denominador` |
| Consistencia (rachas) | Según §4.5 |
| Distribución por categorías | Puntos obtenidos agrupados por `category`; visual donut + radar |
| Heatmap | Grilla calendario (estilo GitHub); intensidad 0–4 según `rendimiento(d)`: 0 = sin datos/0%, 1 = <25%, 2 = 25–74%, 3 = 75–99%, 4 = ≥100%. Ventana mostrada: rango seleccionado; en *Anual* últimas ~26 semanas; en *Histórico* últimos 365 días |
| Delta de mejora | `Δ = (rendimientoProm(período actual) − rendimientoProm(período anterior)) / rendimientoProm(período anterior) × 100%`. Período anterior = misma duración inmediatamente previa. Se muestra WoW, MoM y YoY según filtro activo |

---

## 6. Arquitectura técnica

- **Stack:** Vite + React 19 + TypeScript · Tailwind CSS v4 + shadcn/ui + lucide-react · Zustand · Recharts · date-fns.
- **Persistencia:** IndexedDB vía `idb-keyval`, encapsulada tras la interfaz `DataRepository` (implementación actual: `LocalRepository`; futura: `SupabaseRepository`). Zustand usa middleware `persist` con storage custom sobre IndexedDB.
- **Lógica pura testeable:** `src/lib/scoring.ts` (estados/puntos/meta base/score diario) y `src/lib/stats.ts` (rachas/tasas/heatmap/deltas) son funciones puras sin dependencia de UI, cubiertas por Vitest.
- **Idioma UI:** Español.

---

## 7. Changelog

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 1.0.0 | 2026-08-22 | Spec inicial. Decisiones: Vite SPA (no Next.js), persistencia IndexedDB con repositorio abstracto, agenda de fijos configurable por día de semana (`scheduleDays`), registro futuro deshabilitado, UI en español. Adiciones al modelo original: campo `targetValue` en `Habit` (necesario para resolver overcompletion en time/counter) y `scheduleDays` (necesario para Meta Base por día). Días sin fijos programados no rompen rachas (se omiten de la secuencia). |
| 1.0.1 | 2026-08-22 | Ajustes de implementación: la semana calendario inicia **lunes** (`weekStartsOn: 1`). Ventanas del heatmap definidas (Anual ≈ 26 semanas; Histórico = 365 días). Delta del dashboard compara últimos 7 días vs. 7 anteriores. Seed demo se marca con flag en IndexedDB para no re-sembrar tras borrado manual. Añadido `archivedAt` a `Habit` para programación retroactiva de archivados. |
