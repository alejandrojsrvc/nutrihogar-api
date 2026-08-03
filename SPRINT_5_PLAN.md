# Plan de Sprint 5 Backend - Planificacion semanal familiar

## Fuente y alcance

Este documento consolida las decisiones, dependencias y criterios de implementacion de las issues backend abiertas `#72-#84` del Sprint 5.

Las issues QA `#85-#88` quedan fuera de las ramas de implementacion y se ejecutaran despues de completar los tres bloques backend.

### Issues backend

| Issue | Capacidad | Bloque |
| --- | --- | --- |
| #72 | Aggregate `WeeklyPlan`, `PlannedMeal` y participantes | A |
| #73 | Persistencia Prisma de planificacion | A |
| #74 | CRUD de planes semanales | A |
| #75 | Gestion de comidas planificadas | A |
| #76 | Asignacion de participantes | A |
| #77 | Sugerencias deterministas de porciones | B |
| #78 | Confirmacion y edicion de cantidades | B |
| #79 | Requerimientos de ingredientes | B |
| #80 | Comparacion con inventario | B |
| #81 | Faltantes a lista de compras | B |
| #82 | Iniciar preparacion desde el plan | C |
| #83 | Vincular consumo real | C |
| #84 | Adherencia semanal | C |

## Resultado esperado

El backend debe permitir este recorrido:

```text
crear semana
  -> agregar recetas y comidas libres
  -> asignar adultos
  -> proponer cantidades
  -> confirmar cantidades
  -> calcular ingredientes requeridos
  -> comparar contra inventario
  -> agregar faltantes a la lista
  -> iniciar preparacion
  -> vincular consumo real
  -> consultar adherencia semanal
```

La planificacion sera manual y determinista. La generacion autonoma mediante IA queda fuera del Sprint 5 y pertenece al Sprint 7.

## Dependencias ya disponibles

- Autenticacion y guard JWT propio.
- Hogares, membresias y roles.
- Perfiles adultos y metas nutricionales.
- Catalogo de alimentos y equivalencias.
- Recetas, `PreparedBatch`, porciones servidas y sobrantes.
- Registro de comidas y resumen nutricional diario.
- Inventario, movimientos, compras y lista de compras del Sprint 4.

## Decisiones de arquitectura

### Bounded context

Crear `src/meal-planning/` como contexto independiente:

```text
src/meal-planning/
  domain/
  application/
  infrastructure/
  presentation/
  meal-planning.module.ts
```

El dominio y la aplicacion no importan NestJS, Prisma, HTTP ni infraestructura concreta.

### Aggregate y entidades

- `WeeklyPlan` es el aggregate root.
- `PlannedMeal` y `PlannedMealParticipant` son entidades internas.
- El aggregate expresa invariantes de semana, estados, recetas, participantes, sustituciones y edicion.
- Las queries de requerimientos, inventario y adherencia usaran read repositories cuando no necesiten mutar el aggregate.

### Semana y fechas

- El MVP usa lunes como inicio de semana.
- La fecha recibida por HTTP se interpreta en la zona horaria del hogar.
- La semana se normaliza antes de crear o buscar el plan.
- Los timestamps se persisten en UTC.
- `WeekStart` y `PlanningDate` son value objects, no strings sin validar.

### Estados

Plan:

```text
DRAFT -> ACTIVE -> COMPLETED
  |       |
  +----> CANCELLED
```

Comida planificada:

```text
PLANNED -> PREPARED -> SERVED -> CONSUMED
   |          |         |
   +------> SKIPPED  REPLACED
```

Una comida consumida no se elimina. Una sustitucion conserva la comida anterior mediante `replacedMealId` y snapshots.

### Unicidad de planes activos

Un hogar solo puede tener un plan `ACTIVE` por semana. La persistencia debe reforzarlo con una restriccion unica parcial o una estrategia equivalente que sea segura ante concurrencia.

Un plan `DRAFT` de la misma semana puede existir segun la politica de producto, pero no puede activarse si ya existe otro activo.

### Snapshots e historial

Al confirmar cantidades se conservan:

- Meta nutricional utilizada.
- Datos nutricionales de la receta.
- Cantidad sugerida.
- Cantidad confirmada.
- Actor y fecha de confirmacion.

Los cambios posteriores de receta o meta no alteran planificaciones historicas.

### Autorizacion

- Toda query y mutation exige membresia activa en el hogar.
- La pertenencia del recurso se valida en el caso de uso, no solo en el controller.
- Los perfiles adultos y recetas deben pertenecer al hogar o ser visibles globalmente.
- No se acepta un `householdId` del body como sustituto de la comprobacion del recurso.

### Cantidades y precision

- Usar `Decimal` para cantidades, nutrientes y presupuesto.
- No redondear durante calculos internos.
- Redondear solo para presentar o para la politica explicita de sugerencias/lista.
- Las unidades deben estar normalizadas antes de agregar requerimientos.
- No calcular inventario ni nutrientes dentro del aggregate `WeeklyPlan`.

## Bloque A - Plan base (#72-#76)

### #72 - Aggregate WeeklyPlan

Crear:

- `WeeklyPlanId`, `PlannedMealId`, `PlannedMealParticipantId`.
- `WeekStart`, `PlanningDate`, `PlannedMealType`, `PlannedMealStatus`.
- `PlannedMealSource`, `PlannedQuantity`.
- `WeeklyPlan`, `PlannedMeal`, `PlannedMealParticipant`.
- Errores de dominio y pruebas puras.

Comportamientos:

```text
create()
addMeal()
updateMeal()
removeMeal()
assignParticipant()
confirmParticipantQuantity()
replaceMeal()
activate()
complete()
cancel()
markPrepared()
markServed()
markConsumed()
markSkipped()
```

Reglas:

- Una comida `RECIPE` requiere `recipeId`.
- `FREE_MEAL`, `RESTAURANT`, `DELIVERY`, `UNPLANNED` y `EMPTY` no requieren receta.
- Una comida activa necesita participante, salvo `EMPTY`.
- No se duplican participantes.
- No se elimina una comida consumida.
- Un plan completado no se edita sin accion explicita.

### #73 - Persistencia WeeklyPlan

Crear:

- Puerto `WeeklyPlanRepository`.
- Modelos Prisma `WeeklyPlan`, `PlannedMeal`, `PlannedMealParticipant`.
- `PrismaWeeklyPlanMapper`.
- Repositorio Prisma y pruebas.
- Migracion reproducible.

Persistir en transaccion:

- Plan.
- Comidas.
- Participantes.
- Sustituciones.
- Snapshots.

Indices previstos:

- Hogar y semana.
- Estado del plan.
- Fecha y tipo de comida.
- Receta.
- Estado de comida.
- Perfil adulto.

### #74 - CRUD de planes

Casos de uso:

```text
CreateWeeklyPlanUseCase
GetWeeklyPlanQuery
ListWeeklyPlansQuery
UpdateWeeklyPlanUseCase
ActivateWeeklyPlanUseCase
CancelWeeklyPlanUseCase
CompleteWeeklyPlanUseCase
```

Endpoints:

```text
POST   /api/households/:householdId/weekly-plans
GET    /api/households/:householdId/weekly-plans
GET    /api/weekly-plans/:weeklyPlanId
PATCH  /api/weekly-plans/:weeklyPlanId
POST   /api/weekly-plans/:weeklyPlanId/activate
POST   /api/weekly-plans/:weeklyPlanId/complete
DELETE /api/weekly-plans/:weeklyPlanId
```

### #75 - Comidas planificadas

Casos de uso:

```text
AddPlannedMealUseCase
UpdatePlannedMealUseCase
RemovePlannedMealUseCase
ReplacePlannedMealUseCase
```

Endpoints:

```text
POST   /api/weekly-plans/:weeklyPlanId/meals
PATCH  /api/planned-meals/:plannedMealId
DELETE /api/planned-meals/:plannedMealId
POST   /api/planned-meals/:plannedMealId/replace
```

Validar que la fecha este dentro de la semana y que las recetas sean visibles, activas y del hogar correcto.

### #76 - Participantes

Casos de uso:

```text
AssignPlannedMealParticipantsUseCase
RemovePlannedMealParticipantUseCase
UpdatePlannedMealParticipantUseCase
```

Endpoints:

```text
POST   /api/planned-meals/:plannedMealId/participants
PATCH  /api/planned-meal-participants/:participantId
DELETE /api/planned-meal-participants/:participantId
```

La asignacion valida perfiles activos del mismo hogar. Agregar participantes no calcula cantidades automaticamente.

### Entrega del bloque A

Crear y administrar un plan semanal con comidas, recetas, comidas libres, sustituciones y participantes, incluyendo persistencia y aislamiento por hogar.

## Bloque B - Cantidades y requerimientos (#77-#81)

### #77 - Proponer cantidades

Casos de uso:

```text
ProposeMealQuantitiesUseCase
GetPlannedMealQuantitiesQuery
AcceptSuggestedQuantitiesUseCase
```

Endpoints:

```text
POST /api/planned-meals/:plannedMealId/quantities/propose
GET  /api/planned-meals/:plannedMealId/quantities
POST /api/planned-meals/:plannedMealId/quantities/accept-suggestions
```

Algoritmo inicial:

1. Leer meta vigente del adulto.
2. Calcular necesidades restantes del dia.
3. Considerar comidas restantes.
4. Leer nutrientes de receta.
5. Priorizar energia y proteina.
6. Convertir objetivo a cantidad de receta.
7. Aplicar limites minimo/maximo.
8. Redondear con politica fija.
9. Devolver advertencias y razonamiento resumido.

La propuesta debe ser pura y determinista para las mismas entradas. No modifica cantidades confirmadas.

### #78 - Confirmar cantidades

Caso de uso:

```text
ConfirmParticipantQuantityUseCase
```

Endpoint:

```text
PATCH /api/planned-meal-participants/:participantId
```

Permitir editar antes de preparar. Guardar sugerida, confirmada, unidad, actor, fecha y snapshots. No recalcular otros participantes ni permitir cambios posteriores a `PREPARED`.

### #79 - Requerimientos

Caso de uso:

```text
CalculateWeeklyRequirementsUseCase
```

Endpoint:

```text
GET /api/weekly-plans/:weeklyPlanId/requirements
```

Proceso:

1. Leer comidas en `PLANNED` o `PREPARED`.
2. Excluir canceladas, saltadas y consumidas.
3. Usar cantidades confirmadas o sugeridas.
4. Escalar ingredientes de cada receta.
5. Normalizar unidades.
6. Agrupar solo alimentos compatibles.
7. Devolver comidas de origen y advertencias.

El resultado no se persiste en esta fase.

### #80 - Comparar con inventario

Caso de uso:

```text
ComparePlanWithInventoryUseCase
```

Endpoint:

```text
GET /api/weekly-plans/:weeklyPlanId/inventory-comparison
```

Estados de respuesta:

```text
COMPLETE
PARTIAL
MISSING
NOT_NEEDED
```

Reglas:

- Consultar inventario vigente del hogar.
- Considerar unidades compatibles y vencimientos.
- No modificar ni reservar inventario.
- No usar `PREPARED_FOOD` como sustituto de ingrediente crudo.
- Si no existe inventario controlado, devolver faltante o estado no rastreable según la unidad.

### #81 - Agregar faltantes a la lista

Caso de uso:

```text
AddMissingIngredientsToShoppingListUseCase
```

Endpoints:

```text
POST   /api/weekly-plans/:weeklyPlanId/shopping-list/items
GET    /api/weekly-plans/:weeklyPlanId/shopping-list/items
DELETE /api/shopping-list-items/:shoppingListItemId
```

Usar fuente `MEAL_PLAN`, conservar referencia al plan, sumar cantidades compatibles y mantener la operacion idempotente. No crear ni confirmar compras.

### Entrega del bloque B

Calcular porciones, guardar confirmaciones, determinar ingredientes semanales, comparar disponibilidad y agregar faltantes a la lista.

## Bloque C - Ejecucion y adherencia (#82-#84)

### #82 - Iniciar preparacion

Caso de uso:

```text
StartPreparationFromPlannedMealUseCase
```

Endpoints:

```text
POST /api/planned-meals/:plannedMealId/preparation
GET  /api/planned-meals/:plannedMealId/preparation
```

Crear `PreparedBatch` desde una comida `RECIPE`, copiar participantes y cantidades confirmadas, conservar `plannedMealId`, marcar la comida como `PREPARED` y evitar batches activos duplicados.

Debe existir un puerto de unidad de trabajo que coordine Meal Planning y Recipes.

### #83 - Vincular consumo real

Caso de uso:

```text
LinkConsumedMealToPlannedMealUseCase
```

Endpoints:

```text
POST /api/consumed-meals/:consumedMealId/link
GET  /api/planned-meals/:plannedMealId/consumption
```

Validar adulto y fecha, impedir asociaciones incompatibles o duplicadas, permitir comidas manuales posteriores y marcar la comida como `CONSUMED` cuando corresponda.

### #84 - Adherencia

Caso de uso:

```text
CalculateWeeklyAdherenceUseCase
```

Endpoints:

```text
GET /api/weekly-plans/:weeklyPlanId/adherence
GET /api/households/:householdId/adherence?weekStart=...
```

Calcular como read model:

- Comidas planificadas.
- Comidas consumidas.
- Omitidas.
- Reemplazadas.
- No planificadas.
- Diferencias de energia y proteina.
- Porcentajes por semana, dia y adulto.

Usar snapshots historicos y no persistir el resultado.

### Entrega del bloque C

Conectar comida planificada, preparacion, consumo real y reporte de adherencia.

## Dependencias y orden

```text
#72 -> #73 -> #74 -> #75 -> #76
                         |
                         +-> #77 -> #78 -> #79 -> #80 -> #81
                         |
                         +-> #82 -> #83 -> #84
```

Dependencias externas:

- `#75` requiere Recipes.
- `#76` requiere Adult Profiles.
- `#77` requiere Nutrition Goals, Nutrition y Meal Tracking.
- `#79` requiere Recipe ingredients y equivalencias.
- `#80` requiere Inventory del Sprint 4.
- `#81` requiere Shopping List del Sprint 4.
- `#82` requiere PreparedBatch y la transaccion del flujo de preparacion.
- `#83` requiere Meal Tracking.
- `#84` requiere asociaciones de `#83` y resumen nutricional.

## Archivos y puertos esperados

### Nuevos

```text
src/meal-planning/
  domain/entities/weekly-plan.ts
  domain/entities/planned-meal.ts
  domain/entities/planned-meal-participant.ts
  domain/models/meal-planning.models.ts
  domain/value-objects/
  domain/errors/
  application/ports/
  application/queries/
  application/use-cases/
  application/services/
  infrastructure/persistence/
  presentation/http/
  meal-planning.module.ts
```

### Probablemente modificados

- `src/app.module.ts`.
- `prisma/schema.prisma` y nuevas migraciones.
- `src/recipes/recipes.module.ts` para puertos estrechos de batches/recetas.
- `src/meal-tracking/meal-tracking.module.ts` y puertos de lectura/enlace de comidas.
- `src/inventory/application/ports/inventory-repository.port.ts` para consultas específicas de comparación.
- `src/shopping-list/application/ports/shopping-list-repository.port.ts` para fuente `MEAL_PLAN` y referencia al plan.
- OpenAPI DTOs y mappers HTTP.

## Pruebas por bloque

### Bloque A

- Dominio: semanas, estados, recetas, comidas libres, participantes, sustituciones y edicion.
- Aplicacion: permisos, hogar, duplicado activo, fecha fuera de semana y transiciones.
- Infraestructura: round-trip, transaccion, indices, snapshots y aislamiento.
- HTTP: CRUD, DTOs, autenticacion, autorizacion y codigos.

### Bloque B

- Determinismo de sugerencias.
- Metas distintas y ausencia de meta.
- Confirmacion manual y bloqueo posterior a preparacion.
- Escalado de recetas, cantidades confirmadas/sugeridas y unidades incompatibles.
- Inventario completo, parcial, ausente, vencido y preparado excluido.
- Generacion idempotente de lista y fusion con items existentes.

### Bloque C

- Preparacion valida, receta no valida y batch duplicado.
- Participantes y cantidades copiadas.
- Asociacion correcta de comida real, adulto y fecha.
- Consumo duplicado o incompatible.
- Adherencia total, parcial, omisiones, sustituciones, comidas no planificadas y snapshots historicos.

## Estrategia Git

Una rama y PR por bloque:

```text
feat/72-76-weekly-plan-core
feat/77-81-plan-quantities-inventory
feat/82-84-plan-execution-adherence
```

Cada PR debe cerrar solamente sus issues implementadas:

- Bloque A: `Closes #72` hasta `Closes #76`.
- Bloque B: `Closes #77` hasta `Closes #81`.
- Bloque C: `Closes #82` hasta `Closes #84`.

## Validacion

Por cada bloque, ejecutar una sola validacion final:

```bash
npm run lint
npm run test -- --runInBand <specs-dirigidos>
npm run test:e2e -- --runInBand <e2e-dirigidos>
```

No ejecutar build, servidores persistentes, Docker, migraciones, seeds, `test:db` ni conexiones a bases compartidas localmente.

## Fuera de alcance

- Generacion autonoma con IA.
- Optimizacion automatica de presupuesto.
- Prediccion de preferencias.
- Sincronizacion offline del plan.
- Calendarios externos.
- Compras automaticas.
- Sustituciones inteligentes.
- Planificacion mensual.
- Recomendaciones medicas.

## Definicion de terminado

- Las issues del bloque cumplen sus criterios de aceptacion.
- El dominio no conoce NestJS, Prisma ni HTTP.
- Las mutaciones multi-aggregate son atomicas.
- Las cantidades y snapshots conservan precision historica.
- Los hogares permanecen aislados.
- OpenAPI y migraciones estan actualizados.
- Lint, pruebas dirigidas y e2e permitidos pasan.
