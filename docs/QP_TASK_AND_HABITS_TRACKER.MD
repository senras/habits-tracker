# Documento de Especificaciones: Quiet Progress & Habit Tracker App

Este documento de especificaciones de software (SRS) combina las características del ecosistema de Quiet Progress —minimalismo, baja presión y progreso constante— con las mejores prácticas de los *habit trackers* modernos.

Está diseñado específicamente para ser procesado por agentes de IA de consola como OpenCode.

## 1. Visión general del producto

Una aplicación móvil multiplataforma orientada a la productividad consciente. Combina la gestión de tareas diarias con el seguimiento de hábitos a largo plazo.

La filosofía central (**Quiet Progress**) prioriza la consistencia sobre la perfección mediante:

- Interfaces minimalistas.
- Métricas sin presión.
- Un sistema de gamificación suave que recompensa la perseverancia sin castigar los días de descanso.

## 2. Especificaciones funcionales

### 2.1. Módulo 1: Gestor de tareas (*Task Tracker*)

- **Gestión del ciclo de vida:** creación, edición, eliminación y marcado de estado:
  - Pendiente.
  - En progreso.
  - Completado.
  - Pospuesto.
- **Categorización y etiquetas:** sistema de carpetas o *tags* personalizables (por ejemplo: Trabajo, Personal y Estudio).
- **Flexibilidad de fechas:** tareas con fecha límite estricta o tareas flotantes («para hacer esta semana»).
- **Rollover automático:** las tareas no completadas al final del día se pueden configurar para transferirse automáticamente al día siguiente, sin alertas de «retraso» que generen ansiedad.
- **Subtareas:** desglose de tareas complejas en pasos más pequeños con barras de progreso individuales.

### 2.2. Módulo 2: Seguimiento de hábitos (*Habit Tracker*)

#### Tipos de hábitos

- **Check-off (booleano):** acción simple (por ejemplo: tomar vitaminas).
- **Medibles (cuantitativos):** basados en un objetivo numérico (por ejemplo: leer 15 páginas o beber 2 litros de agua).

#### Programación flexible (*Scheduling*)

Permite configurar una frecuencia específica:

- Diario.
- Días específicos de la semana.
- X veces por semana o por mes.

#### Pausas permitidas

Capacidad de marcar un día como **Día de descanso** u **Omitido** (*Skip*) para que no rompa la racha (*streak*), fomentando la consistencia sin culpa.

#### Rachas y visualización

- Calendario de calor (*heatmap*) mensual.
- Contador de rachas actuales y máximas.

### 2.3. Módulo 3: Métricas y análisis (*Quiet Analytics*)

- **Estadísticas de cumplimiento:** porcentaje de éxito semanal y mensual basado en días programados, no en días totales. De esta forma, no se penalizan los fines de semana si un hábito solo está programado de lunes a viernes.
- **Diario de reflexión (*Log Notes*):** espacio opcional al completar o fallar un hábito para escribir notas breves (por ejemplo: «Estaba muy cansado hoy»).
- **Modo oscuro e interfaz relajante:** soporte nativo para *Dark Mode*, con una paleta de colores de bajo contraste para reducir la fatiga visual.

## 3. Especificaciones no funcionales y arquitectura sugerida

Para la ejecución con OpenCode, se recomienda la siguiente arquitectura técnica, ideal para un entorno *full-stack* moderno y escalable:

| Componente | Tecnología sugerida |
| --- | --- |
| Frontend móvil | React Native con Expo (permite desarrollo ágil y compilación cruzada para iOS y Android) |
| Backend / API | Node.js con Express.js |
| Base de datos | PostgreSQL o MariaDB (adecuada para relacionar usuarios, tareas, hábitos y registros de cumplimiento diario) |
| Autenticación | JWT (*JSON Web Tokens*) para sesiones seguras |
| Notificaciones | Notificaciones push locales mediante Expo Notifications para recordatorios de hábitos |

## 4. Plan de desarrollo para OpenCode

Puedes introducir este plan fase por fase en OpenCode para mantener el contexto del agente enfocado y evitar que el código se descontrole.

### Fase 1: Arquitectura y base de datos

**Prompt / objetivo:**

> Inicializa un proyecto backend en Node.js/Express. Configura la conexión a la base de datos (PostgreSQL/MariaDB). Crea los esquemas relacionales para Usuarios, Tareas, Hábitos y RegistrosDeHábitos (HabitLogs).

**Entregables:**

- Servidor corriendo.
- Conexión a la base de datos exitosa.
- Migraciones de esquemas creadas.

### Fase 2: Desarrollo de la API REST (backend)

**Prompt / objetivo:**

> Implementa los endpoints CRUD completos. Necesito rutas para gestionar Tareas (con soporte para rollover) y Hábitos (creación con frecuencia personalizada y un endpoint para registrar el cumplimiento de un día específico).

**Entregables:**

- API funcional y probada, validable con Postman o cURL.
- Middleware de autenticación con JWT.

### Fase 3: Estructura del frontend y UI/UX (React Native/Expo)

**Prompt / objetivo:**

> Inicializa un proyecto en React Native con Expo. Configura React Navigation con una navegación por pestañas (Tabs): «Hoy» (tareas y hábitos del día), «Hábitos» (lista general y calendarios) y «Estadísticas». Implementa un diseño minimalista y soporte para Modo Oscuro.

**Entregables:**

- Cascarón de la aplicación móvil con navegación fluida.
- Gestión de estado global mediante Zustand o Context API.

### Fase 4: Integración y lógica de vistas (frontend)

**Prompt / objetivo:**

> Conecta el frontend con la API de Node.js. Crea los formularios para añadir nuevas tareas y hábitos. Implementa la lógica en la pantalla «Hoy» para marcar hábitos como completados y actualizar visualmente las barras de progreso.

**Entregables:**

- Aplicación funcional con persistencia de datos en el servidor.

### Fase 5: Gamificación suave y análisis

**Prompt / objetivo:**

> Desarrolla el componente de Heatmap (calendario de contribuciones) para los hábitos. Implementa la lógica para calcular y mostrar las rachas (streaks), respetando los «días de descanso» programados.

**Entregables:**

- Pantalla de estadísticas.
- Gráficos de cumplimiento renderizados en la aplicación.
