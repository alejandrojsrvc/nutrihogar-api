# Plan backend Sprint 7: IA y propuestas (#127-#135)

## 1. Objetivo

Implementar el primer lote de capacidades de inteligencia artificial sin permitir que
una respuesta del proveedor modifique directamente los agregados del dominio.

El flujo objetivo es:

```text
Solicitud -> Contexto minimo -> Proveedor IA -> Propuesta persistida
                                      |
                                      v
                         Validacion determinista
                                      |
                                      v
                 Revision/edicion/decision del usuario
                                      |
                                      v
                 Aggregate normal en estado draft o activo
```

Las propuestas son datos revisables y auditables. No son recetas ni planes hasta que
un caso de uso de aceptacion las convierta mediante los casos de uso normales del
bounded context correspondiente.

## 2. Alcance exacto

| Issue | Resultado | Dependencias directas |
| --- | --- | --- |
| #127 | Modelo de solicitudes, propuestas, validaciones y decisiones IA | `HouseholdId`, `AdultProfileId`, `Clock`, `IdGenerator` |
| #128 | Persistencia Prisma y repositorio de propuestas IA | #127, Prisma |
| #129 | Puertos agnosticos para planes, recetas y sustituciones | #127 |
| #130 | Adaptador estructurado para el proveedor IA | #129 |
| #131 | Constructor seguro de contexto para planes semanales | Meal Planning, Inventory, Recipes, Nutrition Goals |
| #132 | Generacion y persistencia de propuesta de plan semanal | #128-#131 |
| #133 | Validacion determinista de propuestas de plan | #132, Food Catalog, Inventory, motor nutricional |
| #134 | Edicion, aceptacion y rechazo de propuestas de plan | #133, Weekly Plan |
| #135 | Propuestas de recetas basadas en inventario y restricciones | #129-#133, Inventory, Recipes |

Queda fuera de este lote:

- Aplicar sustituciones de alimentos, issue posterior #138.
- Aceptar recetas sugeridas como recetas del hogar, issue posterior #136.
- Recordatorios, notificaciones y metricas, issues #139-#147.
- Regeneracion parcial de una propuesta.
- Reserva o descuento de inventario durante una propuesta.
- Activacion automatica de planes o recetas.

## 3. Estado actual relevante

La aplicacion ya dispone de los contextos y puertos que deben reutilizarse:

- `src/recipes/`: `Recipe`, `RecipeRepository`, `CreateRecipeUseCase` y calculo nutricional.
- `src/meal-planning/`: `WeeklyPlan`, planned meals, participantes y repositorio.
- `src/inventory/`: inventario y movimientos, sin reservar existencias para propuestas.
- `src/nutrition/`: motor nutricional, metas y `Clock`.
- `src/households/`: autorizacion por hogar, adultos y restricciones.
- `src/meal-planning/meal-planning.module.ts` y `src/recipes/recipes.module.ts` ya exponen
  varios casos de uso y repositorios mediante tokens NestJS.

No existe actualmente un bounded context de Recommendations/AI ni modelos Prisma para
solicitudes o propuestas. Se debe crear el modulo sin introducir dependencias de NestJS,
Prisma o un SDK de proveedor en `domain` o `application`.

## 4. Decisiones de arquitectura

### 4.1 Bounded context

Crear `src/recommendations/` como contexto de recomendaciones, aunque al inicio se
integre con Meal Planning y Recipes mediante puertos de aplicacion.

```text
src/recommendations/
  domain/
    entities/
    value-objects/
    errors/
    models/
  application/
    ports/
    services/
    use-cases/
    errors/
  infrastructure/
    persistence/
    ai/
  presentation/
    http/
      dto/
  recommendations.module.ts
```

Los controllers solo traducen HTTP a commands y results. Los servicios de validacion y
construccion de contexto no deben leer Prisma directamente.

### 4.2 Identidad y estados

Usar value objects o tipos cerrados para:

- Tipo de propuesta: `WEEKLY_PLAN`, `RECIPE`, `FOOD_SUBSTITUTION`, `PORTION`,
  `MEAL_ADJUSTMENT`.
- Estado: `REQUESTED`, `GENERATED`, `VALIDATED`, `REQUIRES_CHANGES`,
  `READY_FOR_REVIEW`, `ACCEPTED`, `PARTIALLY_ACCEPTED`, `REJECTED`, `EXPIRED`,
  `FAILED`.
- Decision: `ACCEPT`, `ACCEPT_WITH_CHANGES`, `REJECT`, `REGENERATE`, `POSTPONE`.
- Severidad: `INFO`, `WARNING`, `BLOCKING`.

Las transiciones deben ser explicitas y validarse en el dominio. Una propuesta:

- No puede aceptarse sin validacion.
- No puede aceptarse con errores `BLOCKING`.
- No puede decidirse dos veces.
- No puede modificarse despues de expirar o quedar terminal.
- Conserva immutable la salida original del proveedor.
- Guarda la edicion del usuario en una version separada.

### 4.3 JSON y versionado

`structuredPayload`, `editedPayload`, warnings y errores se almacenan como JSON
versionado porque son documentos estructurados. Las relaciones principales no deben
depender de JSON.

Cada payload debe contener o estar asociado a:

- `schemaVersion`.
- `contextVersion` cuando provenga de un contexto construido.
- Tipo de propuesta.
- Identificadores opacos de alimentos, recetas, adultos y slots.

No guardar prompts completos, notas medicas, nombres innecesarios ni respuestas crudas
del proveedor. `rawResponseReference` solo se guarda como referencia tecnica opcional.

### 4.4 Persistencia y concurrencia

La aceptacion debe usar una transaccion que incluya:

1. Lectura y bloqueo logico de la propuesta.
2. Validacion de estado y actor.
3. Revalidacion de la version editada.
4. Creacion del aggregate destino en estado draft.
5. Registro de la decision.

La unicidad de una decision debe estar respaldada por una restriccion de base de datos
y manejo de conflicto. No usar un patron `find` seguido de `create` como unica defensa.

## 5. Fases de implementacion

### Fase 0: Preparacion y contratos compartidos

Objetivo: fijar tipos, limites y dependencias antes de tocar persistencia o proveedor.

Trabajo:

- Crear el contexto `recommendations` y sus tokens de inyeccion.
- Definir `Clock` e `IdGenerator` como puertos reutilizables.
- Definir commands/results internos, separados de DTO HTTP.
- Definir limites de tamanio para contextos, listas, payloads y respuestas.
- Definir errores normalizados del proveedor:
  `AI_PROVIDER_UNAVAILABLE`, `AI_PROVIDER_TIMEOUT`, `AI_RATE_LIMITED`,
  `AI_INVALID_RESPONSE`, `AI_CONTENT_REJECTED`, `AI_CONFIGURATION_ERROR`.
- Definir politica de expiracion y retencion de propuestas.

Salida: contratos compilables y pruebas de tipos/dominio sin NestJS ni Prisma.

### Fase 1: #127 - Dominio de propuestas IA

Crear las entidades:

- `AiGenerationRequest`.
- `AiGeneratedProposal`.
- `AiProposalValidation`.
- `AiProposalDecision`.

Crear value objects para ids, tipo, estado, proveedor, modelo, version de prompt y
decision. La propuesta debe enlazar a una solicitud y la decision debe enlazar a una
propuesta.

Comportamientos minimos:

- `AiGenerationRequest.create`, `markGenerated`, `markFailed`.
- `AiGeneratedProposal.register`, `attachValidation`, `markReadyForReview`, `expire`.
- `accept`, `acceptPartially`, `reject` con actor, fecha y seleccion.
- Rechazo de transiciones invalidas y decisiones duplicadas.

Pruebas:

- Solicitud valida e invalida.
- Propuesta sin solicitud.
- Validacion con y sin errores bloqueantes.
- Aceptacion completa y parcial.
- Rechazo, expiracion y decision duplicada.
- Separacion entre payload original y payload editado.

### Fase 2: #128 - Persistencia Prisma

Agregar al schema Prisma:

- `AiGenerationRequest`.
- `AiGeneratedProposal`.
- `AiProposalValidation`.
- `AiProposalDecision`.

Relaciones y restricciones recomendadas:

- Solicitud asociada a `householdId` y actor solicitante.
- Adultos relacionados mediante tabla de asociacion, no lista opaca en JSON.
- Propuesta asociada a solicitud.
- Una validacion vigente por propuesta o historial explicitamente versionado.
- Una decision terminal por propuesta.
- Indices por hogar, tipo, estado, `requestedAt` y `expiresAt`.
- Indices y claves para aislamiento por hogar.

Implementar:

- Puertos `AiProposalRepository` y, si se necesita, un puerto de transaccion.
- Mappers Prisma-dominio.
- Guardado de solicitud, propuesta, validacion y decision.
- Consulta paginada por hogar y filtros de estado/tipo/fecha.
- Persistencia de JSON solo en campos versionados.
- Migracion reproducible, sin ejecutarla localmente.

Pruebas de integracion:

- Flujo completo.
- Propuesta fallida.
- JSON versionado.
- Aceptacion parcial.
- Paginacion.
- Aislamiento entre hogares.
- Rollback de una transaccion fallida.

### Fase 3: #129 - Puertos agnosticos de generacion

Definir puertos de aplicacion:

```ts
interface WeeklyPlanGenerator {
  generate(context: WeeklyPlanGenerationContext): Promise<WeeklyPlanGenerationResult>;
}

interface RecipeSuggestionProvider {
  suggest(context: RecipeSuggestionContext): Promise<RecipeSuggestionResult>;
}

interface FoodSubstitutionProvider {
  suggestSubstitutions(context: FoodSubstitutionContext): Promise<FoodSubstitutionResult>;
}
```

Los contextos deben ser DTOs internos, pequenos y versionados. No transportar entidades
de dominio completas ni objetos Prisma.

Cada puerto debe documentar timeout, cancelacion, reintentos limitados y errores
normalizados. El puerto no debe decidir si una propuesta cumple restricciones o metas;
eso corresponde a validadores deterministas.

Pruebas:

- Adaptador falso con resultado valido.
- Cada error normalizado.
- Cancelacion y timeout.
- Verificar que el caso de uso no dependa de clases concretas del proveedor.

### Fase 4: #130 - Adaptador estructurado

Implementar en infraestructura un adaptador con nombre agnostico en el dominio, por
ejemplo `OpenAiStructuredRecommendationAdapter` si el proveedor seleccionado lo exige.

Responsabilidades:

- Traducir el contexto tipado al request del proveedor.
- Solicitar respuesta estructurada.
- Validar tamano y esquema basico de la respuesta.
- Traducir timeout, rate limit, indisponibilidad y respuesta invalida.
- Registrar solo metadatos tecnicos: latencia, modelo, tokens, costo estimado y
  correlation id.
- Aplicar timeout, limite de reintentos y cancelacion.

No debe:

- Crear entidades de dominio.
- Persistir propuestas.
- Calcular nutrientes.
- Mutar planes, recetas o inventario.
- Registrar prompts completos o secretos.

Configuracion a agregar a validacion de entorno y `.env.example`:

- `AI_PROVIDER`.
- `AI_MODEL_WEEKLY_PLAN`.
- `AI_MODEL_RECIPE`.
- `AI_REQUEST_TIMEOUT_MS`.
- `AI_MAX_RETRIES`.
- `AI_FEATURE_ENABLED`.
- `AI_MAX_REQUESTS_PER_HOUSEHOLD`.
- Credencial del proveedor, con nombre especifico y solo backend.

Pruebas:

- Respuesta estructurada valida.
- JSON invalido.
- Timeout.
- Rate limit.
- Error de configuracion.
- Feature desactivada.
- Respuesta demasiado grande.
- Redaccion de datos sensibles en logs.

### Fase 5: #131 - Constructor seguro de contexto

Crear `WeeklyPlanGenerationContextBuilder` como servicio de aplicacion.

Debe consultar puertos existentes para reunir:

- Hogar: moneda, presupuesto, timezone, preferencias y cantidad de adultos.
- Adultos: ids opacos, metas nutricionales, restricciones y preferencias necesarias.
- Inventario: alimentos activos, cantidades, unidades, preparados y vencimientos
  relevantes.
- Recetas: ids, nombres funcionales, ingredientes, nutrientes, tiempo y categoria.
- Planificacion: slots, comidas existentes, dias excluidos y repeticiones permitidas.

Reglas:

- Excluir peso, medidas, sintomas, email, nombres completos, notas libres y ids
  externos salvo que exista una razon documentada.
- No enviar entidades completas.
- Limitar cantidad de inventario y recetas con una politica determinista de relevancia.
- Permitir hogar sin inventario, recetas o presupuesto.
- No inventar metas o costos ausentes.
- Generar `contextVersion` y hash estable del contexto normalizado.
- No incluir datos de otro hogar.

Pruebas:

- Hogar completo.
- Sin inventario.
- Sin recetas.
- Adulto sin meta.
- Restricciones.
- Presupuesto ausente.
- Contexto que excede limite.
- Verificacion explicita de exclusion de datos sensibles.

### Fase 6: #132 - Generacion de propuesta de plan

Crear `GenerateAiWeeklyPlanProposalUseCase` y el endpoint:

```text
POST /api/households/:householdId/ai/weekly-plan-proposals
```

Flujo:

1. Autenticar actor y verificar acceso activo al hogar.
2. Validar `weekStart`, tipos de comida y preferencias.
3. Aplicar rate limit por hogar y feature flag.
4. Construir contexto seguro.
5. Crear `AiGenerationRequest` en `REQUESTED`.
6. Invocar `WeeklyPlanGenerator`.
7. Registrar propuesta estructurada o fallo normalizado.
8. Ejecutar validacion determinista.
9. Persistir solicitud, propuesta y validacion.
10. Devolver una vista revisable, nunca un `WeeklyPlan`.

La propuesta debe expirar. El endpoint no crea, activa, reserva ni descuenta un plan.
Los DTO HTTP deben ocultar referencias crudas del proveedor y detalles internos de
errores.

Pruebas de aplicacion/presentacion:

- Propuesta valida.
- Proveedor caido.
- Contexto incompleto.
- Respuesta invalida.
- Restriccion violada.
- Rate limit.
- Hogar diferente.
- Feature desactivada.
- Ninguna llamada a creacion de `WeeklyPlan`.

### Fase 7: #133 - Validacion determinista

Crear `AiWeeklyPlanProposalValidator` y servicios pequenos por responsabilidad:

- Validacion estructural.
- Resolucion de alimentos y recetas.
- Restricciones y preferencias obligatorias.
- Recalculo nutricional.
- Disponibilidad de inventario sin reserva.
- Evaluacion de presupuesto cuando haya datos suficientes.

Validar como minimo:

- Dias y tipos de comida permitidos.
- Identificadores del hogar correcto.
- Cantidades positivas y unidades compatibles.
- Alimentos, recetas e ingredientes existentes.
- Estados raw/cooked compatibles.
- Alergias, intolerancias y exclusiones.
- Calorias, macros, rangos configurables y porciones extremas.
- Faltantes de inventario y preparados aprovechables.
- Presupuesto como `NOT_EVALUATED` cuando falten costos.

El resultado debe conservar severidad, codigo estable, referencia del elemento afectado
y mensaje seguro para UI. Un error `BLOCKING` impide aceptar; un `WARNING` no lo impide
por defecto.

Pruebas unitarias:

- Propuesta correcta.
- Restricciones de gluten y lactosa.
- Receta o alimento inexistente.
- Porcion extrema.
- Inventario insuficiente.
- Presupuesto no evaluable.
- Multiples errores con severidades distintas.
- Precision decimal y ausencia de mutacion del inventario.

### Fase 8: #134 - Revision y conversion a plan draft

Crear queries y casos de uso:

- `GetAiWeeklyPlanProposalQuery`.
- `UpdateAiWeeklyPlanProposalUseCase`.
- `AcceptAiWeeklyPlanProposalUseCase`.
- `RejectAiWeeklyPlanProposalUseCase`.

Endpoints:

```text
GET   /api/ai/weekly-plan-proposals/:proposalId
PATCH /api/ai/weekly-plan-proposals/:proposalId
POST  /api/ai/weekly-plan-proposals/:proposalId/accept
POST  /api/ai/weekly-plan-proposals/:proposalId/reject
```

La edicion puede eliminar comidas, cambiar receta, fuente, participantes, cantidades
y notas permitidas. La edicion se guarda separada de la salida original.

Aceptacion:

1. Cargar propuesta dentro del hogar autorizado.
2. Aplicar seleccion completa o parcial y ediciones.
3. Revalidar todo el payload.
4. Rechazar errores bloqueantes o propuesta expirada.
5. Crear `WeeklyPlan` en `DRAFT` mediante su caso de uso normal.
6. Crear planned meals y participantes mediante sus invariantes existentes.
7. Guardar snapshots y advertencias relevantes.
8. Registrar la decision y los elementos seleccionados.
9. Confirmar todo en una unica transaccion.

Nunca activar el plan automaticamente ni sobrescribir uno existente sin una orden
explicita fuera del alcance de esta issue.

Pruebas:

- Consulta aislada por hogar.
- Edicion valida e invalida.
- Aceptacion completa y parcial.
- Propuesta expirada.
- Advertencia no bloqueante.
- Error bloqueante.
- Plan existente.
- Aceptacion duplicada concurrente.
- Rollback si falla la creacion del plan.

### Fase 9: #135 - Propuestas de recetas desde inventario

Crear `GenerateAiRecipeSuggestionsUseCase` y el endpoint:

```text
POST /api/households/:householdId/ai/recipe-suggestions
```

Flujo:

1. Verificar hogar y adultos solicitados.
2. Validar limites de tiempo, cantidad maxima y tipo de comida.
3. Construir contexto minimo de inventario, recetas, catalogo y restricciones.
4. Crear solicitud IA de tipo `RECIPE`.
5. Invocar `RecipeSuggestionProvider`.
6. Resolver alimentos contra el catalogo.
7. Recalcular nutrientes con el motor backend.
8. Detectar faltantes, restricciones y unidades incompatibles.
9. Clasificar alimentos desconocidos y advertencias.
10. Persistir propuesta revisable.

La respuesta debe incluir ids temporales de sugerencia, ingredientes resueltos,
advertencias, faltantes, cobertura aproximada de inventario y nutrientes recalculados.
No debe crear una `Recipe` ni modificar inventario.

Pruebas:

- Inventario suficiente.
- Inventario parcial.
- Producto proximo a vencer.
- Restriccion incompatible.
- Alimento desconocido.
- Sin inventario.
- Proveedor fallido.
- Nutrientes recalculados de forma determinista.
- No creacion automatica de receta.

## 6. Contratos de seguridad y privacidad

- Todas las consultas y comandos deben validar `householdId` mediante el actor
  autenticado.
- Las referencias de adultos deben pertenecer al hogar solicitado.
- El proveedor nunca recibe email, token, nombre completo, sintomas, peso, medidas ni
  notas libres sensibles.
- Los logs contienen correlation id, tipo, estado y duracion, nunca prompt ni payload
  completo.
- Las respuestas HTTP no exponen `rawResponseReference`, credenciales, prompts ni
  errores internos.
- El rate limit debe aplicarse antes de llamar al proveedor.
- El feature flag apagado debe producir un error funcional estable, sin llamar a
  infraestructura IA.
- La retencion de payloads y datos tecnicos debe quedar documentada antes de migrar.

## 7. Transacciones e integracion con modulos existentes

No duplicar reglas de `Recipe`, `WeeklyPlan`, `PlannedMeal`, participantes o calculos
nutricionales en Recommendations.

Crear puertos de aplicacion para las operaciones que el contexto necesite y adaptar los
casos de uso existentes cuando sea posible. Si la aceptacion atraviesa propuesta y plan,
introducir un `UnitOfWork` minimo en el limite de aplicacion, respaldado por Prisma, en
lugar de coordinar varias escrituras independientes.

El modulo debe importar solamente los modulos que expongan puertos/casos de uso y no
debe importar `PrismaService` desde `domain` o `application`.

## 8. Validacion del lote

Ejecutar solo al terminar todas las implementaciones del lote:

```bash
npm run lint
npm run test -- --runInBand src/recommendations
npm run test -- --runInBand src/meal-planning
npm run test -- --runInBand src/recipes
```

Las pruebas de persistencia deben usar el formato de integracion ya existente y no se
deben ejecutar contra PostgreSQL compartido durante el desarrollo local. No ejecutar
`build`, servidores, Docker, migraciones, seed ni pruebas de base de datos como parte de
la validacion local por defecto.

## 9. Criterios de salida

El lote esta listo cuando:

- Las nueve issues tienen implementacion y pruebas alineadas con sus criterios.
- El dominio funciona sin NestJS, Prisma ni SDK de IA.
- El proveedor puede sustituirse mediante los puertos definidos.
- Las propuestas se guardan, validan, expiran y auditan.
- No se crea ni activa ningun plan o receta sin decision explicita del usuario.
- Los errores bloqueantes impiden aceptacion.
- La aceptacion es idempotente y transaccional.
- Se verifica aislamiento entre hogares.
- Los nutrientes se calculan en backend con precision decimal.
- No se persisten ni registran datos prohibidos.
- OpenAPI se actualiza para los endpoints de #132, #134 y #135.
- Se documentan variables de entorno y politica de retencion.

## 10. Orden de commits y entregas

Mantener el trabajo en una rama y un PR del lote, con commits internos agrupados por
capacidad si el flujo del repositorio lo requiere:

1. #127: dominio y pruebas.
2. #128: Prisma, migracion, mappers y repositorio.
3. #129-#130: puertos, adaptador y configuracion.
4. #131: constructor de contexto.
5. #132-#133: generacion y validacion de planes.
6. #134: revision y aceptacion transaccional.
7. #135: sugerencias de recetas.

No cerrar una issue que dependa de otra sin incluir sus contratos implementados y
pruebas de integracion observables.
