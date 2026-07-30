Arquitectura Backend
Plataforma de control nutricional familiar
Stack inicial: NestJS, TypeScript, PostgreSQL, Prisma y Supabase Auth
Enfoque: DDD pragmático, arquitectura hexagonal, Clean Architecture y monolito modular
1. Propósito
Este documento define la arquitectura que debe seguir el backend de la plataforma de control nutricional
familiar.
El objetivo es construir una aplicación:
• Independiente de NestJS.
• Independiente de Prisma.
• Independiente de Supabase.
• Independiente de proveedores de inteligencia artificial.
• Organizada alrededor del dominio y sus casos de uso.
• Fácil de probar sin base de datos ni servidor HTTP.
• Preparada para sustituir infraestructura sin modificar las reglas de negocio.
• Implementada inicialmente como monolito modular, no como microservicios.
La regla principal es:
El dominio y los casos de uso no conocen NestJS, Prisma,
Supabase, HTTP, OpenAI ni ninguna infraestructura externa.
2. Estilo arquitectónico
El backend seguirá una combinación de:
• Domain-Driven Design.
• Arquitectura hexagonal.
• Clean Architecture.
• CQRS ligero.
• Monolito modular.
La aplicación se dividirá por contextos funcionales y no únicamente por tipos técnicos.
1

Dirección de dependencias
Presentation
↓
Application
↓
Domain
Infrastructure
↑
Application / Domain ports
Las capas externas dependen de las internas.
Nunca debe ocurrir lo contrario.
Permitido
Controller NestJS
→ Use Case
→ Domain
Prisma Repository
→ Repository Port
→ Domain Entity
No permitido
Domain Entity
→ Prisma
Use Case
→ NestJS Controller
Domain Service
→ Supabase Client
2

3. Monolito modular
El sistema comenzará como una sola aplicación NestJS, pero estará dividido en contextos claramente
delimitados.
src/
├── identity/
├── households/
├── food-catalog/
├── nutrition/
├── meal-tracking/
├── recipes/
├── inventory/
├── meal-planning/
├── health-tracking/
├── notifications/
└── shared/
Cada contexto debe poder evolucionar con independencia razonable.
No se crearán microservicios durante el MVP.
4. Bounded contexts
Identity and Access
Responsabilidades:
• Identidad autenticada.
• Usuarios.
• Validación de tokens.
• Sesiones externas.
• Autorización general.
Entidades y conceptos:
• User.
• AuthenticatedIdentity.
• IdentityProvider.
• AccessToken.
3

Households
Responsabilidades:
• Hogares.
• Integrantes.
• Invitaciones.
• Roles.
• Configuración compartida.
Entidades:
• Household.
• HouseholdMembership.
• HouseholdInvitation.
• AdultProfile.
• DietaryRestriction.
Food Catalog
Responsabilidades:
• Alimentos.
• Productos comerciales.
• Categorías.
• Nutrientes.
• Porciones y equivalencias.
• Fuentes nutricionales.
Entidades:
• Food.
• FoodCategory.
• FoodServing.
• FoodAlias.
• NutrientDefinition.
• FoodNutrient.
Nutrition
Responsabilidades:
• Cálculos nutricionales.
• Metabolismo basal.
• Gasto estimado.
• Metas nutricionales.
• Versionado de objetivos.
• Cantidades y nutrientes.
4

Conceptos:
• NutritionGoal.
• NutritionGoalSuggestion.
• NutrientAmount.
• NutrientCollection.
• FoodQuantity.
• Calories.
• Macronutrients.
Meal Tracking
Responsabilidades:
• Registro de comidas.
• Elementos consumidos.
• Snapshots nutricionales.
• Edición, cancelación y duplicación.
• Resúmenes diarios.
Entidades:
• Meal.
• MealItem.
• NutritionSnapshot.
Recipes and Preparation
Responsabilidades:
• Recetas reutilizables.
• Ingredientes.
• Preparaciones reales.
• Peso final cocido.
• Densidad nutricional.
• Porciones servidas.
• Restos.
Entidades:
• Recipe.
• RecipeIngredient.
• PreparedBatch.
• ServedPortion.
• PortionRemainder.
5

Inventory
Responsabilidades:
• Existencias del hogar.
• Movimientos.
• Compras.
• Desperdicios.
• Sobrantes.
• Sincronización offline.
Entidades:
• InventoryItem.
• InventoryMovement.
• Purchase.
• PurchaseItem.
• ShoppingList.
• ShoppingListItem.
Meal Planning
Responsabilidades:
• Plan semanal.
• Comidas planificadas.
• Participantes.
• Presupuesto.
• Propuestas generadas por IA.
Entidades:
• WeeklyPlan.
• PlannedMeal.
• PlannedMealParticipant.
Health Tracking
Responsabilidades:
• Peso.
• Medidas corporales.
• Síntomas digestivos.
• Tendencias.
• Sugerencias de revisión de metas.
6

Entidades:
• BodyMeasurement.
• DigestiveSymptom.
Notifications
Responsabilidades:
• Preferencias de recordatorios.
• Suscripciones push.
• Entrega y auditoría de notificaciones.
Entidades:
• NotificationPreference.
• PushSubscription.
• NotificationDelivery.
5. Estructura interna de cada contexto
Ejemplo para meal-tracking :
src/meal-tracking/
├── domain/
│ ├── entities/
│ ├── value-objects/
│ ├── services/
│ ├── events/
│ ├── errors/
│ └── repositories/
├── application/
│ ├── commands/
│ ├── queries/
│ ├── use-cases/
│ ├── ports/
│ └── dto/
├── infrastructure/
│ ├── persistence/
│ ├── authentication/
│ ├── messaging/
│ └── mappers/
├── presentation/
│ └── http/
│ ├── controllers/
7

│       ├── request-dto/
│       ├── response-dto/
│       ├── mappers/
│       └── presenters/
└── meal-tracking.module.ts
No todos los contextos necesitarán todas las carpetas desde el primer día.
Se crearán cuando exista una responsabilidad real.
6. Capa Domain
La capa de dominio contiene:
• Entidades.
• Aggregates.
• Value Objects.
• Servicios de dominio.
• Eventos de dominio.
• Errores de negocio.
• Interfaces de repositorio cuando sean necesarias para expresar el dominio.
No contiene:
• Decoradores de NestJS.
• DTO HTTP.
• Prisma.
• Supabase.
• Swagger.
• Variables de entorno.
• Logging técnico.
• Requests o responses.
Ejemplo de entidad
| export class Meal | {   |     |
| ----------------- | --- | --- |
private constructor(
| public readonly     | id: MealId,     |                 |
| ------------------- | --------------- | --------------- |
| public readonly     | householdId:    | HouseholdId,    |
| public readonly     | adultProfileId: | AdultProfileId, |
| private type:       | MealType,       |                 |
| private consumedAt: | Date,           |                 |
| private items:      | MealItem[],     |                 |
| private status:     | MealStatus,     |                 |
) {}
8

| static create(props:        | CreateMealProps): | Meal { |
| --------------------------- | ----------------- | ------ |
| if (props.items.length      | === 0)            | {      |
| throw new EmptyMealError(); |                   |        |
}
| return new Meal( |     |     |
| ---------------- | --- | --- |
props.id,
props.householdId,
props.adultProfileId,
props.type,
props.consumedAt,
props.items,
MealStatus.confirmed(),
);
}
| replaceItems(items:         | MealItem[]): | void { |
| --------------------------- | ------------ | ------ |
| if (items.length            | === 0) {     |        |
| throw new EmptyMealError(); |              |        |
}
| this.items = items; |     |     |
| ------------------- | --- | --- |
}
| cancel(): void {                       |     |     |
| -------------------------------------- | --- | --- |
| if (this.status.isCancelled())         |     | {   |
| throw new MealAlreadyCancelledError(); |     |     |
}
| this.status = | MealStatus.cancelled(); |     |
| ------------- | ----------------------- | --- |
}
| calculateTotals(): | NutrientCollection | {   |
| ------------------ | ------------------ | --- |
return this.items.reduce(
| (totals, item) | => totals.add(item.nutrients), |     |
| -------------- | ------------------------------ | --- |
NutrientCollection.empty(),
);
}
}
7. Value Objects
Los valores relevantes del dominio no deben circular como números o strings sin significado.
9

Value Objects recomendados:
HouseholdId
UserId
AdultProfileId
FoodId
MealId
RecipeId
InventoryItemId
Email
Calories
Grams
Milliliters
BodyWeight
Height
Money
FoodQuantity
NutrientAmount
NutrientCode
DateRange
Ejemplo:
| export class                | Grams              | {                         |          |        |            |
| --------------------------- | ------------------ | ------------------------- | -------- | ------ | ---------- |
| private                     | constructor(public |                           | readonly | value: | number) {} |
| static create(value:        |                    | number):                  | Grams    | {      |            |
| if (!Number.isFinite(value) |                    |                           | ||       | value  | <= 0) {    |
| throw                       | new                | InvalidGramsError(value); |          |        |            |
}
| return | new | Grams(value); |     |     |     |
| ------ | --- | ------------- | --- | --- | --- |
}
| add(other: | Grams):                 | Grams | {   |                 |     |
| ---------- | ----------------------- | ----- | --- | --------------- | --- |
| return     | Grams.create(this.value |       |     | + other.value); |     |
}
| subtract(other: |        | Grams):                  | Grams {        |     |     |
| --------------- | ------ | ------------------------ | -------------- | --- | --- |
| const           | result | = this.value             | - other.value; |     |     |
| if (result      |        | < 0) {                   |                |     |     |
| throw           | new    | NegativeQuantityError(); |                |     |     |
}
10

return Grams.create(result);
}
}
Las validaciones esenciales deben vivir aquí, no únicamente en los DTO HTTP.
8. Aggregates
No debe tratarse cada tabla de base de datos como un aggregate.
Aggregates iniciales propuestos:
Household
Responsable de:
• Configuración del hogar.
• Reglas básicas de membresía.
• Roles administrativos.
AdultProfile
Responsable de:
• Datos nutricionales personales.
• Restricciones.
• Preferencias.
Food
Responsable de:
• Información del alimento.
• Nutrientes.
• Porciones.
• Alias.
• Estado crudo o cocido.
NutritionGoal
Responsable de:
• Meta activa.
• Valores nutricionales.
• Período de vigencia.
• Versionado.
11

Meal
Responsable de:
• Tipo y fecha.
• Elementos.
• Snapshots.
• Totales.
• Estado confirmado o cancelado.
Recipe
Responsable de:
• Definición reutilizable.
• Ingredientes.
• Instrucciones.
PreparedBatch
Responsable de:
• Preparación concreta.
• Cantidades reales.
• Peso final cocido.
• Densidad nutricional.
• Porciones.
• Sobrantes.
InventoryItem
Responsable de:
• Existencia actual.
• Unidad.
• Mínimo.
• Estado.
Los movimientos serán registros inmutables relacionados con el aggregate.
WeeklyPlan
Responsable de:
• Semana.
• Comidas planificadas.
• Participantes.
• Estado del plan.
12

9. Capa Application
La capa de aplicación contiene:
• Casos de uso.
• Commands.
• Queries.
• Puertos.
• Resultados.
• Coordinación de transacciones.
• Autorización específica de aplicación.
• Orquestación entre aggregates.
No contiene:
• Controllers.
• Prisma.
• Requests HTTP.
• Decoradores de framework.
• Componentes externos concretos.
Ejemplos de casos de uso
CreateHouseholdUseCase
InviteHouseholdMemberUseCase
AcceptHouseholdInvitationUseCase
CreateAdultProfileUseCase
CreateCustomFoodUseCase
GenerateNutritionGoalSuggestionUseCase
ConfirmNutritionGoalUseCase
RegisterMealUseCase
UpdateMealUseCase
CancelMealUseCase
DuplicateMealUseCase
GetDailyNutritionSummaryQuery
CreateRecipeUseCase
FinalizePreparedBatchUseCase
RegisterServedPortionUseCase
RegisterPurchaseUseCase
AdjustInventoryUseCase
GenerateWeeklyPlanUseCase
13

10. Commands y Queries
Se utilizará CQRS ligero.
No es necesario introducir buses complejos durante el MVP.
Commands
Cambian estado.
RegisterMealCommand
CancelMealCommand
CreateHouseholdCommand
ConfirmNutritionGoalCommand
AdjustInventoryCommand
Queries
Consultan información.
GetMealQuery
ListFoodsQuery
GetDailyNutritionSummaryQuery
GetCurrentInventoryQuery
GetWeeklyPlanQuery
Las queries pueden utilizar read models optimizados sin reconstruir aggregates cuando no se necesitan
reglas de negocio.
11. Ejemplo de caso de uso
| export interface  | RegisterMealCommand | {   |
| ----------------- | ------------------- | --- |
| actorId: string;  |                     |     |
| householdId:      | string;             |     |
| adultProfileId:   | string;             |     |
| mealType: string; |                     |     |
| consumedAt:       | Date;               |     |
items: Array<{
| foodId: string; |         |     |
| --------------- | ------- | --- |
| quantity:       | number; |     |
| unit: string;   |         |     |
| servingId?:     | string; |     |
14

| measurementMethod: |     | string; |     |     |
| ------------------ | --- | ------- | --- | --- |
}>;
}
| export | class RegisterMealUseCase |     | {   |     |
| ------ | ------------------------- | --- | --- | --- |
constructor(
| private | readonly | authorization:         | HouseholdAuthorizationPort, |                      |
| ------- | -------- | ---------------------- | --------------------------- | -------------------- |
| private | readonly | adultProfiles:         | AdultProfileRepository,     |                      |
| private | readonly | foods: FoodRepository, |                             |                      |
| private | readonly | meals: MealRepository, |                             |                      |
| private | readonly | nutritionCalculator:   |                             | NutritionCalculator, |
| private | readonly | unitOfWork:            | UnitOfWork,                 |                      |
| private | readonly | idGenerator:           | IdGenerator,                |                      |
) {}
| async    | execute(                         |     |     |     |
| -------- | -------------------------------- | --- | --- | --- |
| command: | RegisterMealCommand,             |     |     |     |
| ):       | Promise<RegisterMealResult>      |     | {   |     |
| await    | this.authorization.ensureMember( |     |     |     |
command.actorId,
command.householdId,
);
| const | profile | = await this.adultProfiles.findById( |     |     |
| ----- | ------- | ------------------------------------ | --- | --- |
AdultProfileId.create(command.adultProfileId),
);
if (!profile || profile.householdId.value !== command.householdId) {
|     | throw new AdultProfileNotFoundError(); |     |     |     |
| --- | -------------------------------------- | --- | --- | --- |
}
| const | foods = | await this.foods.findVisibleByIds( |     |     |
| ----- | ------- | ---------------------------------- | --- | --- |
HouseholdId.create(command.householdId),
|     | command.items.map((item) |     | => FoodId.create(item.foodId)), |     |
| --- | ------------------------ | --- | ------------------------------- | --- |
);
| const | mealItems   | = command.items.map((item) |     | => {             |
| ----- | ----------- | -------------------------- | --- | ---------------- |
|       | const food  | = foods.find(              |     |                  |
|       | (candidate) | => candidate.id.value      |     | === item.foodId, |
);
|     | if (!food) | {                                   |     |     |
| --- | ---------- | ----------------------------------- | --- | --- |
|     | throw new  | FoodNotAvailableError(item.foodId); |     |     |
}
|     | return this.nutritionCalculator.createMealItem(food, |     |     | item); |
| --- | ---------------------------------------------------- | --- | --- | ------ |
});
15

| const meal                                      | = Meal.create({                                |     |     |
| ----------------------------------------------- | ---------------------------------------------- | --- | --- |
| id: MealId.create(this.idGenerator.generate()), |                                                |     |     |
| householdId:                                    | HouseholdId.create(command.householdId),       |     |     |
| adultProfileId:                                 | AdultProfileId.create(command.adultProfileId), |     |     |
| type:                                           | MealType.create(command.mealType),             |     |     |
| consumedAt:                                     | command.consumedAt,                            |     |     |
| items:                                          | mealItems,                                     |     |     |
});
| await this.unitOfWork.execute(async |                        | () => | {   |
| ----------------------------------- | ---------------------- | ----- | --- |
| await                               | this.meals.save(meal); |       |     |
});
| return { |                                        |     |     |
| -------- | -------------------------------------- | --- | --- |
| mealId:  | meal.id.value,                         |     |     |
| totals:  | meal.calculateTotals().toPrimitives(), |     |     |
};
}
}
12. Puertos
Los casos de uso dependen de abstracciones.
Repositorios
| export interface | MealRepository        | {        |     |
| ---------------- | --------------------- | -------- | --- |
| findById(id:     | MealId): Promise<Meal | | null>; |     |
| save(meal:       | Meal): Promise<void>; |          |     |
}
| export interface | FoodRepository | {   |     |
| ---------------- | -------------- | --- | --- |
findVisibleByIds(
| householdId: | HouseholdId, |     |     |
| ------------ | ------------ | --- | --- |
| foodIds:     | FoodId[],    |     |     |
): Promise<Food[]>;
}
| export interface | HouseholdRepository | {                 |          |
| ---------------- | ------------------- | ----------------- | -------- |
| findById(id:     | HouseholdId):       | Promise<Household | | null>; |
| save(household:  | Household):         | Promise<void>;    |          |
}
16

Transacciones
| export interface     | UnitOfWork |     | {               |     |             |
| -------------------- | ---------- | --- | --------------- | --- | ----------- |
| execute<T>(callback: |            | ()  | => Promise<T>): |     | Promise<T>; |
}
Identidad
| export interface | IdentityProvider |     |     | {   |     |
| ---------------- | ---------------- | --- | --- | --- | --- |
verifyAccessToken(token: string): Promise<AuthenticatedIdentity>;
}
Inteligencia artificial
| export interface | WeeklyPlanGenerator |     |     |     | {   |
| ---------------- | ------------------- | --- | --- | --- | --- |
generate(
| input: WeeklyPlanGenerationInput, |     |     |     |     |     |
| --------------------------------- | --- | --- | --- | --- | --- |
): Promise<WeeklyPlanProposal>;
}
Notificaciones
| export interface | PushNotificationSender |     |                |     | {   |
| ---------------- | ---------------------- | --- | -------------- | --- | --- |
| send(message:    | PushMessage):          |     | Promise<void>; |     |     |
}
Tiempo e IDs
| export interface | Clock | {   |     |     |     |
| ---------------- | ----- | --- | --- | --- | --- |
| now(): Date;     |       |     |     |     |     |
}
| export interface | IdGenerator |     | {   |     |     |
| ---------------- | ----------- | --- | --- | --- | --- |
| generate():      | string;     |     |     |     |     |
}
Esto permite probar casos de uso con dobles de prueba.
17

13. Capa Infrastructure
Contiene implementaciones concretas de los puertos.
infrastructure/
├── persistence/
│ └── prisma/
├── authentication/
│ └── supabase/
├── ai/
│ └── openai/
├── notifications/
├── clock/
└── identifiers/
Ejemplos:
PrismaMealRepository
PrismaFoodRepository
PrismaHouseholdRepository
PrismaUnitOfWork
SupabaseIdentityProvider
OpenAiWeeklyPlanGenerator
WebPushNotificationSender
SystemClock
UuidGenerator
14. Prisma como adaptador
Prisma no representa el modelo de dominio.
Sus modelos representan persistencia.
model Meal {
id String @id @db.Uuid
householdId String @db.Uuid
adultProfileId String @db.Uuid
mealType String
consumedAt DateTime
status String
18

  items          MealItem[]
}
El repositorio debe convertir entre persistencia y dominio.
Mapper
| export class     | PrismaMealMapper                                 | {   |     |
| ---------------- | ------------------------------------------------ | --- | --- |
| static toDomain( |                                                  |     |     |
| record:          | MealWithItemsPersistence,                        |     |     |
| ): Meal          | {                                                |     |     |
| return           | Meal.restore({                                   |     |     |
| id:              | MealId.create(record.id),                        |     |     |
| householdId:     | HouseholdId.create(record.householdId),          |     |     |
| adultProfileId:  | AdultProfileId.create(record.adultProfileId),    |     |     |
| type:            | MealType.create(record.mealType),                |     |     |
| consumedAt:      | record.consumedAt,                               |     |     |
| status:          | MealStatus.create(record.status),                |     |     |
| items:           | record.items.map(PrismaMealItemMapper.toDomain), |     |     |
});
}
| static toPersistence(meal: |                            | Meal): MealPersistenceData | {   |
| -------------------------- | -------------------------- | -------------------------- | --- |
| return                     | {                          |                            |     |
| id:                        | meal.id.value,             |                            |     |
| householdId:               | meal.householdId.value,    |                            |     |
| adultProfileId:            | meal.adultProfileId.value, |                            |     |
| mealType:                  | meal.type.value,           |                            |     |
| consumedAt:                | meal.consumedAt,           |                            |     |
| status:                    | meal.status.value,         |                            |     |
};
}
}
Nunca se deben devolver modelos Prisma desde los repositorios.
15. Capa Presentation
NestJS se utilizará como adaptador de entrada HTTP y composition root.
La capa HTTP contiene:
• Controllers.
• DTO de request.
19

• DTO de response.
• Guards.
• Decoradores.
• Presenters.
• Mappers HTTP.
• Documentación Swagger.
Controller
@Controller('households/:householdId/meals')
| export class | RegisterMealController |     | {   |
| ------------ | ---------------------- | --- | --- |
constructor(
| private | readonly registerMeal: |     | RegisterMealUseCase, |
| ------- | ---------------------- | --- | -------------------- |
) {}
@Post()
| async execute(                       |                                |                             |         |
| ------------------------------------ | ------------------------------ | --------------------------- | ------- |
| @Param('householdId')                |                                | householdId:                | string, |
| @Body()                              | body: RegisterMealHttpRequest, |                             |         |
| @CurrentUser()                       | user:                          | AuthenticatedUserHttp,      |         |
| ): Promise<RegisterMealHttpResponse> |                                |                             | {       |
| const                                | result = await                 | this.registerMeal.execute({ |         |
| actorId:                             | user.id,                       |                             |         |
householdId,
| adultProfileId: | body.adultProfileId,                                  |     |     |
| --------------- | ----------------------------------------------------- | --- | --- |
| mealType:       | body.mealType,                                        |     |     |
| consumedAt:     | new Date(body.consumedAt),                            |     |     |
| items:          | body.items.map(RegisterMealHttpMapper.toCommandItem), |     |     |
});
| return | RegisterMealHttpPresenter.present(result); |     |     |
| ------ | ------------------------------------------ | --- | --- |
}
}
El controller no debe:
• Consultar Prisma.
• Calcular nutrientes.
• Aplicar reglas de negocio.
• Crear entidades directamente.
• Manejar transacciones.
16. Tipos de DTO
Se distinguirán tres tipos.
20

DTO HTTP
| Pertenece a  | presentation | .   |     |
| ------------ | ------------ | --- | --- |
Puede utilizar:
| •  class-validator   |     | .   |     |
| -------------------- | --- | --- | --- |
| •  class-transformer |     | .   |     |
• Swagger.
| export | class RegisterMealHttpRequest |     | {   |
| ------ | ----------------------------- | --- | --- |
@IsUUID()
| adultProfileId!: |     | string; |     |
| ---------------- | --- | ------- | --- |
@IsString()
| mealType!: | string; |     |     |
| ---------- | ------- | --- | --- |
@IsISO8601()
| consumedAt!:      |                                | string;    |     |
| ----------------- | ------------------------------ | ---------- | --- |
| @ValidateNested({ |                                | each: true | })  |
| items!:           | RegisterMealItemHttpRequest[]; |            |     |
}
Command de aplicación
| Pertenece a  | application | .   |     |
| ------------ | ----------- | --- | --- |
No usa decoradores.
| export          | interface                  | RegisterMealCommand | {   |
| --------------- | -------------------------- | ------------------- | --- |
| actorId:        | string;                    |                     |     |
| householdId:    |                            | string;             |     |
| adultProfileId: |                            | string;             |     |
| mealType:       | string;                    |                     |     |
| consumedAt:     |                            | Date;               |     |
| items:          | RegisterMealItemCommand[]; |                     |     |
}
Result de aplicación
También es independiente del framework.
21

export interface RegisterMealResult {
mealId: string;
totals: Record<string, number>;
}
Response DTO
Pertenece a presentation .
Adapta el resultado para HTTP.
17. Errores
Errores de dominio
Ejemplos:
EmptyMealError
InvalidFoodQuantityError
MealAlreadyCancelledError
NegativeInventoryError
InvalidNutritionGoalError
Errores de aplicación
Ejemplos:
FoodNotAvailableError
HouseholdAccessDeniedError
AdultProfileNotFoundError
InvitationExpiredError
Traducción HTTP
La capa presentation convierte errores a códigos HTTP.
Domain/Application error → HTTP exception response
El dominio nunca debe conocer BadRequestException , NotFoundException o
ForbiddenException .
22

18. Eventos de dominio
Los eventos se utilizarán cuando exista una consecuencia clara.
Ejemplos:
MealRegistered
MealCancelled
PreparedBatchFinalized
PurchaseRegistered
InventoryAdjusted
NutritionGoalConfirmed
No es necesario introducir un broker durante el MVP.
Inicialmente pueden publicarse mediante un dispatcher en memoria después de confirmar la transacción.
Ejemplo:
MealRegistered
→ actualizar proyección diaria
→ evaluar recordatorio pendiente
19. Transacciones
Los casos de uso que cambien varios registros deben usar UnitOfWork .
Ejemplos:
• Crear hogar y membresía administrativa.
• Confirmar una meta y cerrar la anterior.
• Registrar comida y snapshots.
• Finalizar preparación y crear sobrante.
• Registrar compra y movimientos de inventario.
La implementación Prisma debe mantener el mismo contexto transaccional para todos los repositorios
utilizados.
20. Lecturas y proyecciones
No todas las consultas necesitan aggregates completos.
23

Para reportes y listados se permiten read repositories.
export interface DailyNutritionSummaryReadRepository {
getByProfileAndDate(
profileId: AdultProfileId,
date: LocalDate,
): Promise<DailyNutritionSummaryReadModel>;
}
Estos repositorios pueden consultar Prisma directamente y devolver read models.
No deben devolver entidades de dominio cuando la consulta solo requiere presentación.
21. Autorización
Habrá dos niveles.
Autenticación técnica
La capa de infraestructura valida el token de Supabase.
Autorización funcional
Los casos de uso verifican:
• Pertenencia al hogar.
• Rol.
• Acceso al perfil.
• Visibilidad de alimentos.
• Capacidad para modificar recursos.
No debe depender exclusivamente de guards HTTP, porque los casos de uso podrían ejecutarse desde
workers o CLI.
22. Cálculos nutricionales
El motor nutricional será código determinista y agnóstico.
No dependerá de IA.
Responsabilidades:
24

CalculateFoodNutrients
ConvertServingToBaseQuantity
SumNutrients
CalculateRecipeTotals
CalculateRecipeDensity
CalculatePortionNutrients
CalculateConsumedQuantity
CalculateBmr
CalculateTdee
CalculateNutritionGoal
Los cálculos deberán usar precisión decimal.
Los valores se redondearán únicamente para presentación.
23. IA como adaptador externo
La IA nunca será fuente de verdad para calorías o macros.
La IA podrá proponer:
• Planes semanales.
• Recetas.
• Sustituciones.
• Cantidades aproximadas.
• Patrones posibles.
El backend debe validar:
• Existencia de alimentos.
• Restricciones.
• Cantidades positivas.
• Integrantes.
• Recetas.
• Presupuesto.
• Estructura de respuesta.
Después, los cálculos nutricionales se realizan mediante el dominio.
25

24. Pruebas
Domain
Pruebas unitarias puras.
Sin NestJS, Prisma ni base de datos.
Ejemplos:
• Crear comida válida.
• Rechazar comida vacía.
• Calcular consumo real.
• Calcular densidad de receta.
• Rechazar cantidad negativa.
• Versionar meta.
Application
Pruebas de casos de uso con repositorios en memoria o mocks.
Ejemplos:
• Registrar comida.
• Verificar permisos.
• Confirmar meta.
• Cancelar comida.
• Registrar compra.
Infrastructure
Pruebas de integración.
Ejemplos:
• Repositorio Prisma.
• Mapper Prisma.
• Transacciones.
• Validación de token de Supabase.
Presentation
Pruebas e2e HTTP.
Ejemplos:
• Requests válidos.
26

• DTO inválido.
• 401 .
• 403 .
• Respuestas y códigos HTTP.
25. Composition root
NestJS será responsable de conectar interfaces con implementaciones.
Ejemplo conceptual:
{
provide: MealRepositoryToken,
useClass: PrismaMealRepository,
}
{
provide: IdentityProviderToken,
useClass: SupabaseIdentityProvider,
}
Los casos de uso reciben los puertos mediante inyección.
Los tokens de dependencia se definirán en application o en un módulo de composición, no dentro del
dominio.
26. Reglas para Codex
Cada tarea de backend deberá respetar:
1. Identificar el bounded context afectado.
2. No colocar lógica de negocio en controllers.
3. No colocar lógica de negocio en repositorios Prisma.
4. No usar modelos Prisma como entidades.
5. Crear o reutilizar Value Objects.
6. Implementar un caso de uso por acción.
7. Separar DTO HTTP de commands.
8. Definir puertos antes de adaptadores.
9. Añadir mappers explícitos.
10. Probar dominio y casos de uso sin NestJS.
11. Mantener transacciones en UnitOfWork .
12. No importar infraestructura desde domain o application.
27

13. No crear abstracciones sin una necesidad real.
14. No implementar funcionalidades fuera del issue.
15. Ejecutar lint, tests y build.
27. Definición de terminado
Una tarea backend está terminada cuando:
• El dominio expresa las reglas.
• Existe un caso de uso explícito.
• Los puertos necesarios están definidos.
• Prisma está encapsulado en infraestructura.
• NestJS está limitado a presentación y composición.
• Los DTO HTTP no llegan directamente al dominio.
• Existen pruebas unitarias del dominio.
• Existen pruebas del caso de uso.
• Existen pruebas de integración cuando se agrega infraestructura.
• Swagger está actualizado.
• Las migraciones son reproducibles.
• No se rompen lint, test ni build.
28
