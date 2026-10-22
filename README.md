# Habit & Gamified Daily Tracker

App web responsiva de seguimiento de hábitos diarios con gamificación por puntos y analítica de mejora.

**Spec funcional viva:** [`docs/FUNCTIONAL_SPEC.md`](docs/FUNCTIONAL_SPEC.md) — reglas de negocio, modelo de datos y changelog. Cualquier cambio de reglas debe reflejarse ahí en la misma tarea.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui + lucide-react
- Zustand (estado) + IndexedDB (`idb-keyval`) tras `DataRepository` (listo para Supabase)
- Recharts · date-fns · Vitest

## Scripts

```bash
npm run dev       # servidor de desarrollo
npm run build     # build de producción (tsc + vite)
npm run preview   # sirve el build
npx vitest run    # tests del motor de puntuación y estadísticas
```

## Estructura

```
src/
├── features/
│   ├── calendar/   # vista semanal/mensual estilo Google Calendar
│   ├── stats/      # métricas, heatmap, donut/radar, deltas
│   ├── habits/     # CRUD + control de progreso reutilizable
│   └── dashboard/  # resumen diario, anillo de score, rachas
├── lib/
│   ├── scoring.ts  # PURO: estados, puntos (+10/+20), meta base
│   ├── stats.ts    # PURO: rachas, tasas, heatmap, deltas
│   └── demo.ts     # seed de datos demo
├── stores/         # zustand: habits/logs/ui
├── services/       # DataRepository → IndexedDB local
└── types/          # contratos de dominio
```

La primera carga siembra datos demo automáticamente (marcados con flag en IndexedDB). Puedes archivar o eliminar los hábitos demo desde la vista **Hábitos**.
