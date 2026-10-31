# Tech Stack — Estado Actual (Fase 0)

> **Documento de estado.** Refleja la implementación actual en el repositorio. Para el stack objetivo de las fases futuras ver [FUNCTIONAL_SPEC.md §4.1](./FUNCTIONAL_SPEC.md#41-arquitectura-objetivo).

**Versión:** 1.0.0  
**Fecha:** 2026-10-22  
**Estado:** Implementación actual (Fase 0 — SPA local-first)  

---

## 1. Stack Tecnológico

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| [Vite](https://vitejs.dev/) | ^8.2.0 | Build tool y dev server |
| [React](https://react.dev/) | ^19.2.8 | Framework UI |
| [TypeScript](https://www.typescriptlang.org/) | ~6.0.2 | Tipado estático |
| [React DOM](https://react.dev/) | ^19.2.8 | Renderizado React |

### UI y Estilos
| Tecnología | Versión | Uso |
|---|---|---|
| [Tailwind CSS](https://tailwindcss.com/) | ^4.3.3 | Framework CSS utilitario |
| [@tailwindcss/vite](https://tailwindcss.com/docs/vite) | ^4.3.3 | Plugin Vite para Tailwind v4 |
| [shadcn/ui](https://ui.shadcn.com/) | N/A (basado en Radix) | Componentes UI reutilizables |
| [Radix UI](https://www.radix-ui.com/) | ^1.6.7 | Primitivas accesibles (headless) |
| [class-variance-authority](https://cva.style/) | ^0.7.1 | Variantes de componentes |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | ^3.6.0 | Merge de clases Tailwind |
| [clsx](https://github.com/lukeed/clsx) | ^2.1.1 | Clases condicionales |
| [tw-animate-css](https://github.com/Wombosvideo/tw-animate-css) | ^1.4.0 | Animaciones CSS |
| [lucide-react](https://lucide.dev/) | ^1.33.0 | Iconos |
| [next-themes](https://github.com/pacocoursey/next-themes) | ^0.4.6 | Soporte tema claro/oscuro |
| [sonner](https://sonner.emilkowal.ski/) | ^2.0.8 | Notificaciones toast |

### Estado y Datos
| Tecnología | Versión | Uso |
|---|---|---|
| [Zustand](https://zustand-demo.pmnd.rs/) | ^5.0.15 | Gestión de estado global |
| [idb-keyval](https://github.com/jakearchibald/idb-keyval) | ^6.3.0 | Persistencia en IndexedDB |
| [date-fns](https://date-fns.org/) | ^4.4.0 | Manipulación y formato de fechas |
| [uuid](https://github.com/uuidjs/uuid) | ^14.0.2 | Generación de UUIDs |

### Visualización
| Tecnología | Versión | Uso |
|---|---|---|
| [Recharts](https://recharts.org/) | ^3.10.1 | Gráficos (donut, radar, etc.) |

### Desarrollo y Testing
| Tecnología | Versión | Uso |
|---|---|---|
| [Vitest](https://vitest.dev/) | ^4.1.11 | Tests unitarios del dominio puro |
| [@testing-library/jest-dom](https://testing-library.com/docs/ecosystem-jest-dom/) | ^7.0.1 | Matchers para testing |
| [oxlint](https://oxc.rs/docs/guide/usage/linter.html) | ^1.75.0 | Linting |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | ^6.0.4 | Plugin React para Vite |

---

## 2. Arquitectura

### Patrón Arquitectónico
- **SPA local-first**: Aplicación monolítica del lado del cliente
- **Repository Pattern**: Abstracción de persistencia mediante `DataRepository` (`LocalRepository` implementado con IndexedDB)
- **Domain-Driven Design ligero**: Lógica de negocio pura en `src/lib/` (testeable sin UI)
- **Feature-based organization**: Código organizado por funcionalidades (`features/`)

### Flujo de Datos
```
UI Components → Zustand Stores → DataRepository → idb-keyval (IndexedDB)
                                  ↓
                            src/lib/scoring.ts
                            src/lib/stats.ts (lógica pura)
```

### Persistencia
- **Almacenamiento**: IndexedDB vía `idb-keyval`
- **Ubicación**: Encapsulado en `src/services/` bajo interfaz `DataRepository`
- **Preparado para migración**: Estructura lista para `SupabaseRepository` en el futuro
- **Seed demo**: Datos de demostración sembrados automáticamente en primera carga (marcados con flag)

---

## 3. Estructura del Proyecto

```
src/
├── components/     # Componentes UI reutilizables (shadcn/ui)
├── features/       # Módulos por funcionalidad
│   ├── calendar/   # Vista semanal/mensual estilo Google Calendar
│   ├── stats/      # Métricas, heatmap, gráficos donut/radar, deltas
│   ├── habits/     # CRUD de hábitos + control de progreso
│   └── dashboard/  # Resumen diario, anillo de score, rachas
├── lib/            # Lógica pura y utilidades
│   ├── scoring.ts  # Cálculo de puntos (+10/+20), meta base, estados
│   ├── stats.ts    # Rachas, tasas, heatmap, deltas
│   ├── demo.ts     # Seed de datos demo
│   ├── utils.ts    # Utilidades generales
│   └── ...         # Otras utilidades
├── services/       # Capa de acceso a datos
│   └── repository.ts # DataRepository interface + LocalRepository
├── stores/         # Zustand stores (habits, logs, ui)
├── types/          # Contratos TypeScript de dominio
│   └── domain.ts   # Tipos actuales (v1)
└── App.tsx         # Componente raíz
```

---

## 4. Requisitos del Entorno

- **Node.js**: >= 20.19.0 (especificado en `package.json`)
- **Navegador**: Navegador moderno con soporte para IndexedDB, ES2022+
- **Sistema**: Linux/macOS/Windows

---

## 5. Scripts Disponibles

```bash
npm run dev       # Servidor de desarrollo con HMR
npm run build     # Build de producción (tsc -b && vite build)
npm run lint      # Linting con oxlint
npm run preview   # Preview del build de producción
npx vitest run    # Tests del motor de puntuación y estadísticas
```

---

## 6. Características Actuales

### Implementado (Fase 0)
- ✅ Gestión de hábitos (fijos/extra, booleano/porcentaje/tiempo/contador)
- ✅ Programación por días de semana (`scheduleDays`)
- ✅ Registro diario con estados `incomplete`/`completed`/`overcompleted`
- ✅ Sistema de puntos (+10 completar, +20 sobre-completar)
- ✅ Meta base por día
- ✅ Dashboard con anillo de puntuación
- ✅ Calendario semanal/mensual
- ✅ Estadísticas con heatmap, gráficas, deltas
- ✅ Persistencia en IndexedDB
- ✅ Tema claro/oscuro
- ✅ UI en español
- ✅ Datos demo auto-seed

### Pendiente (según FUNCTIONAL_SPEC v2.0.0)
- ⏳ Soporte para `restDays`, `LogStatus` `skipped`/`rest`
- ⏳ Notas de log (`HabitLog.note`)
- ⏳ Módulo de tareas completo
- ⏳ Programación flexible (`schedule` object, `timesPerWeek`/`timesPerMonth`)
- ⏳ Rachas de cuota
- ⏳ Días neutrales
- ⏳ Migración a arquitectura objetivo (RN/Expo + Express + PostgreSQL)
