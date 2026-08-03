# Plan de Sprint 4 Backend - Issues #54-#67

## Estado actual

- Las issues `#54` a `#67` están abiertas y pertenecen al milestone **Sprint 4 - Inventario, compras y lista de compras**.
- El repositorio ya contiene autenticación, hogares, catálogo de alimentos, motor nutricional, comidas, recetas, preparaciones, porciones servidas y sobrantes preparados.
- No existe todavía el bounded context `src/inventory/` ni modelos Prisma de inventario, compras o lista de compras.
- `PreparedBatch` conserva los ingredientes confirmados y sus cantidades normalizadas.
- `PreparedFoodLeftover` conserva el peso disponible y la densidad nutricional histórica por gramo.
- `MealSource` todavía no incluye `PREPARED_INVENTORY`.

## Objetivo

Completar el Sprint 4 en dos bulks coherentes, comenzando por las siete issues que forman el flujo completo de inventario y alimentos preparados:

```text
existencia
  -> movimientos
  -> administración y consulta
  -> consumos manuales
  -> descuento de preparaciones
  -> incorporación de sobrantes
  -> consumo del sobrante como comida
```

## División del sprint

### Bulk 1: Inventario y alimentos preparados

Issues `#54-#60`.

Este bulk es la primera mitad recomendada porque constituye una cadena cerrada de dependencias y entrega una capacidad funcional completa sin depender de compras, lista de compras o sincronización offline.

### Bulk 2: Compras, lista de compras y sincronización

Issues `#61-#67`.

Este bulk se implementará después de estabilizar las reglas, contratos, versionado e idempotencia del inventario.

## Mapa de dependencias

```text
#54 Inventory domain
  -> #55 Inventory persistence
      -> #56 Inventory queries and administration
          -> #57 Manual consumption, waste and expiration
              -> #58 Prepared-batch inventory consumption
                  -> #59 Prepared leftover into inventory
                      -> #60 Consume prepared inventory as meal
              -> #67 Offline inventory synchronization
          -> #63 Purchase confirmation
          -> #65 Shopping-list generation

#61 Purchase domain
  -> #62 Purchase persistence
      -> #63 Purchase application flows

#64 Shopping-list domain
  -> #65 Shopping-list application flows

#63 + #65
  -> #66 Convert shopping-list selection into purchase
```

## Decisiones acordadas

### Autorización

- Todo usuario debe ser integrante activo del hogar para consultar recursos.
- `ADMIN` puede crear entradas, ajustar cantidades, establecer mínimos, archivar, incorporar sobrantes y confirmar descuentos de preparaciones.
- `MEMBER` puede consultar inventario y registrar consumo, desperdicio o vencimiento.
- El consumo de un preparado que crea una comida también estará disponible para integrantes activos, sujeto al acceso al perfil adulto.
- La autorización funcional debe vivir en los casos de uso, no solamente en guards HTTP.

### Descuento de preparaciones

- El descuento de ingredientes de `#58` solo se permitirá para un `PreparedBatch` en estado `FINALIZED`.
- Cada ingrediente seleccionado se consume usando su cantidad base confirmada completa o se ignora.
- No se permitirán cantidades parciales arbitrarias por ingrediente en este bulk.
- Cuando existan varias existencias compatibles, el cliente debe seleccionar una explícitamente.
- La ausencia de inventario no bloquea la preparación.

### Cantidades y unidades

- Las cantidades persistidas usarán `Decimal` y unidades base `GRAM`, `MILLILITER` o `UNIT`.
- No se redondearán cantidades para cálculos o persistencia.
- El redondeo será únicamente de presentación.
- Cada `InventoryItem` mantendrá una sola unidad base y rechazará movimientos incompatibles.
- Las equivalencias de porciones se convertirán antes de aplicar un movimiento.

### Movimientos y concurrencia

- La cantidad inicial debe generar un movimiento `MANUAL_ENTRY` o el movimiento específico del origen.
- Los movimientos serán append-only e inmutables.
- `currentQuantity` se almacenará como saldo materializado y deberá coincidir con la suma firmada de movimientos.
- Cada cambio incrementará la versión del elemento mediante concurrencia optimista.
- `syncOperationId`, cuando exista, será único y estará respaldado por una restricción de base de datos.
- Un reintento idempotente no debe crear un segundo movimiento.

### Alimentos preparados

- Cada sobrante producirá un `InventoryItem` independiente de tipo `PREPARED_FOOD`.
- No se mezclarán sobrantes de batches diferentes aunque provengan de la misma receta.
- La relación única con `preparedFoodLeftoverId` impedirá incorporarlo dos veces.
- La densidad nutricional histórica se conservará sin recalcularla desde la receta actual.
- Consumir un preparado generará una comida con fuente `PREPARED_INVENTORY`.

## Bulk 1: Detalle de issues

### #54 - Crear aggregate InventoryItem y movimientos de inventario

**Objetivo:** modelar las existencias del hogar y sus movimientos sin dependencias de Prisma, NestJS o HTTP.

**Dominio:**

- Aggregate `InventoryItem`.
- Entidad relacionada e inmutable `InventoryMovement`.
- Value Objects para IDs, cantidad, mínimo, ubicación, estado, tipo de movimiento y referencia de origen.
- Tipos de elemento: `FOOD`, `PREPARED_FOOD`, `CUSTOM`.
- Estados: `ACTIVE`, `DEPLETED`, `ARCHIVED`.
- Movimientos: `PURCHASE`, `CONSUMPTION`, `ADJUSTMENT_INCREASE`, `ADJUSTMENT_DECREASE`, `WASTE`, `EXPIRATION`, `PREPARATION_CONSUMPTION`, `REMAINDER_RETURN`, `MANUAL_ENTRY`.

**Invariantes principales:**

- La cantidad y el mínimo nunca son negativos.
- Todo cambio de cantidad produce un movimiento.
- No se aplican movimientos sobre elementos archivados.
- Un saldo cero marca el elemento como `DEPLETED`.
- Una entrada posterior reactiva un elemento agotado como `ACTIVE`.
- Un ajuste absoluto se transforma en un movimiento por la diferencia.
- Un mismo `syncOperationId` no se aplica dos veces.
- La suma firmada de movimientos coincide con la cantidad actual.

**Pruebas dirigidas:** creación positiva y negativa, compra, consumo parcial/total/excesivo, ajustes en ambas direcciones, desperdicio, vencimiento, archivo, unidades incompatibles, inmutabilidad e idempotencia.

### #55 - Implementar persistencia Prisma para inventario y movimientos

**Objetivo:** persistir el aggregate y sus movimientos sin exponer modelos Prisma.

**Entregables:**

- Modelos Prisma `InventoryItem` e `InventoryMovement`.
- Migración reproducible.
- Puertos de escritura y lectura.
- `PrismaInventoryItemMapper` y `PrismaInventoryMovementMapper`.
- Repositorio con guardado transaccional de saldo y movimientos pendientes.
- Índices por hogar, estado, alimento y vencimiento.
- Restricción única para operaciones sincronizadas.
- Control de versión mediante compare-and-swap.

**Pruebas dirigidas:** round-trip de mappers, precisión decimal, filtros, aislamiento por hogar, transacción, rollback, conflicto de versión y operación duplicada.

### #56 - Implementar consultas y ajustes de inventario

**Objetivo:** listar y administrar existencias manualmente.

**Casos de uso:**

- `ListInventoryItemsQuery`
- `GetInventoryItemQuery`
- `CreateManualInventoryItemUseCase`
- `AdjustInventoryItemUseCase`
- `ArchiveInventoryItemUseCase`
- `SetInventoryMinimumUseCase`

**Endpoints:**

```text
GET    /api/households/:householdId/inventory
POST   /api/households/:householdId/inventory/items
GET    /api/inventory/items/:inventoryItemId
PATCH  /api/inventory/items/:inventoryItemId
POST   /api/inventory/items/:inventoryItemId/adjustments
GET    /api/inventory/items/:inventoryItemId/movements
DELETE /api/inventory/items/:inventoryItemId
```

**Filtros:** `query`, `itemType`, `status`, `location`, `belowMinimum`, `expiresBefore`, `page`, `limit`.

**Reglas:**

- La creación manual acepta alimentos globales o personalizados visibles para el hogar.
- No permite crear `PREPARED_FOOD`; estos se originan en sobrantes.
- No permite modificar `currentQuantity` mediante `PATCH`.
- Evita duplicar una existencia compatible o devuelve un conflicto explícito.
- `DELETE` archiva y conserva el historial.

**Pruebas dirigidas:** entrada inicial, ajuste positivo/negativo, mínimo inválido, duplicado, filtros, paginación, permisos y acceso cruzado entre hogares.

### #57 - Implementar consumos, desperdicios y vencimientos manuales

**Objetivo:** registrar salidas de inventario que no provengan de compras o preparaciones.

**Casos de uso:**

- `ConsumeInventoryItemUseCase`
- `RegisterInventoryWasteUseCase`
- `RegisterInventoryExpirationUseCase`

**Endpoints:**

```text
POST /api/inventory/items/:inventoryItemId/consumptions
POST /api/inventory/items/:inventoryItemId/waste
POST /api/inventory/items/:inventoryItemId/expiration
```

**Reglas:**

- Convertir cantidades a la unidad base antes de mutar el aggregate.
- Rechazar cantidades superiores al saldo disponible.
- Registrar actor, fecha, razón y origen.
- Diferenciar `EXPIRATION` de `WASTE`.
- No crear una comida desde un consumo manual.

**Pruebas dirigidas:** consumo parcial/total/excesivo, desperdicio, vencimiento, unidad incompatible, elemento archivado, agotamiento y permisos de miembro.

### #58 - Descontar ingredientes al confirmar una preparación

**Objetivo:** mostrar una propuesta y aplicar movimientos desde los ingredientes confirmados de un batch finalizado.

**Casos de uso:**

- `PreviewPreparedBatchInventoryConsumptionUseCase`
- `ConfirmPreparedBatchInventoryConsumptionUseCase`

**Endpoints:**

```text
GET  /api/prepared-batches/:batchId/inventory-consumption-preview
POST /api/prepared-batches/:batchId/inventory-consumption
```

**Diseño:**

- La vista previa usa `foodId`, `baseQuantity` y `baseUnit` de los snapshots del batch.
- Devuelve todas las existencias compatibles para que la selección sea explícita.
- Cada ingrediente se confirma con acción `CONSUME` o `IGNORE`.
- La confirmación registra movimientos `PREPARATION_CONSUMPTION` con referencia al batch y al ingrediente.
- Una marca persistida y única por batch impide aplicar la operación dos veces.
- Todos los elementos seleccionados se validan y actualizan en una sola transacción.

**Pruebas dirigidas:** disponibilidad completa, faltante, saldo insuficiente, varios candidatos, ingredientes ignorados, doble confirmación, batch no finalizado, unidad incompatible, rollback y acceso no autorizado.

### #59 - Convertir sobrantes preparados en inventario

**Objetivo:** incorporar un `PreparedFoodLeftover` disponible como una existencia preparada.

**Caso de uso:** `AddPreparedLeftoverToInventoryUseCase`.

**Endpoint:**

```text
POST /api/prepared-leftovers/:leftoverId/add-to-inventory
```

**Proceso:**

1. Cargar el sobrante y validar acceso al hogar.
2. Verificar estado `AVAILABLE` y cantidad positiva.
3. Verificar que no exista un item asociado al mismo sobrante.
4. Crear un `InventoryItem` `PREPARED_FOOD` en gramos.
5. Registrar `REMAINDER_RETURN` por el peso disponible.
6. Conservar nombre, batch, densidad nutricional, ubicación y vencimiento.
7. Persistir la incorporación atómicamente.

**Pruebas dirigidas:** incorporación válida, duplicada, sobrante cerrado, cantidad cero, otro hogar y rollback.

### #60 - Consumir preparados y generar comidas individuales

**Objetivo:** consumir total o parcialmente una existencia preparada y crear una comida individual.

**Caso de uso:** `ConsumePreparedInventoryItemUseCase`.

**Endpoint:**

```text
POST /api/inventory/items/:inventoryItemId/consume-prepared-food
```

**Proceso:**

1. Validar integrante, perfil adulto e item `PREPARED_FOOD`.
2. Validar cantidad y disponibilidad.
3. Calcular nutrientes con la densidad histórica por gramo.
4. Registrar movimiento `CONSUMPTION`.
5. Crear comida, item y snapshots con fuente `PREPARED_INVENTORY`.
6. Conservar la referencia al batch original.
7. Actualizar saldo, estado y versión en la misma transacción.

**Pruebas dirigidas:** consumo parcial/total/excesivo, item no preparado, perfil de otro hogar, exactitud de nutrientes, snapshots, agotamiento, resumen diario y rollback.

## Bulk 2: Detalle de issues

### #61 - Crear aggregate Purchase y productos comprados

Modelar `Purchase` y `PurchaseItem`, estados `DRAFT`, `CONFIRMED`, `CANCELLED`, total monetario decimal, moneda del hogar, productos con cantidades positivas y confirmación no repetible.

### #62 - Implementar persistencia Prisma de compras

Crear modelos, migración, repositorio y mappers de compras; conservar canceladas, mantener precisión monetaria e indexar por hogar, fecha y estado.

### #63 - Implementar creación y confirmación de compras

Exponer creación, edición, listado, detalle, confirmación y cancelación. Solo la confirmación crea o incrementa inventario mediante movimientos `PURCHASE`, dentro de una transacción.

```text
POST   /api/households/:householdId/purchases
GET    /api/households/:householdId/purchases
GET    /api/purchases/:purchaseId
PATCH  /api/purchases/:purchaseId
POST   /api/purchases/:purchaseId/confirm
DELETE /api/purchases/:purchaseId
```

### #64 - Crear lista de compras compartida

Modelar una única `ShoppingList` por hogar con items `PENDING`, `PURCHASED` o `REMOVED`, fuentes `MANUAL`, `BELOW_MINIMUM`, `DEPLETED` y `MEAL_PLAN`, evitando duplicados compatibles y conservando auditoría.

### #65 - Implementar casos de uso de lista de compras

Implementar consulta, agregado, edición, marcado, eliminación y generación idempotente desde agotados o elementos bajo mínimo. Los preparados no se agregan como productos por comprar.

```text
GET    /api/households/:householdId/shopping-list
POST   /api/households/:householdId/shopping-list/items
PATCH  /api/shopping-list/items/:itemId
POST   /api/shopping-list/items/:itemId/mark-purchased
DELETE /api/shopping-list/items/:itemId
POST   /api/households/:householdId/shopping-list/generate-from-inventory
```

### #66 - Crear compra desde elementos de la lista

Crear un draft idempotente desde items pendientes seleccionados, conservar relaciones y marcar los items como comprados solamente cuando la compra se confirme.

```text
POST /api/households/:householdId/shopping-list/convert-to-purchase
```

### #67 - Crear sincronización idempotente de inventario

Procesar lotes offline, aplicar movimientos acumulables, detectar conflictos en ajustes absolutos, devolver resultados previos en reintentos y mantener una transacción independiente por operación.

```text
POST /api/households/:householdId/inventory/sync
```

Conflictos esperados: cantidad insuficiente, elemento archivado, versión obsoleta, unidad incompatible, elemento inexistente y permiso revocado.

## Estructura prevista para Bulk 1

```text
src/inventory/
  domain/
    entities/
    value-objects/
    models/
    errors/
  application/
    use-cases/
    ports/
    models/
    errors/
    services/
  infrastructure/
    persistence/
  presentation/
    http/
      dto/
  inventory.module.ts
```

No se crearán carpetas vacías ni abstracciones sin una responsabilidad requerida por las issues.

## Cambios transversales previstos

- Registrar `InventoryModule` en `src/app.module.ts`.
- Agregar modelos, enums, relaciones e índices a `prisma/schema.prisma`.
- Crear migraciones reproducibles sin ejecutarlas localmente.
- Exportar o adaptar puertos de recetas necesarios para consultar batches y sobrantes.
- Agregar `PREPARED_INVENTORY` al contrato de `MealSource` y a Prisma.
- Crear unidades de trabajo específicas para operaciones que cruzan inventario, recetas y comidas.
- Actualizar DTOs, respuestas y documentación OpenAPI de todos los contratos HTTP nuevos.

## Secuencia de implementación del Bulk 1

1. Implementar y probar el dominio de `#54`.
2. Crear el esquema, migración, mappers y persistencia de `#55`.
3. Implementar la API operativa de `#56-#57` y sus pruebas HTTP.
4. Implementar las transacciones cruzadas de `#58-#59`.
5. Completar `#60`, actualizar `MealSource` y validar todo el bulk.

## Estrategia de pruebas

### Dominio

- Pruebas unitarias puras para cantidades, movimientos, estados, idempotencia e invariantes.
- Sin NestJS, Prisma ni base de datos.

### Aplicación

- Casos de uso con dobles o repositorios en memoria.
- Caminos correctos, permisos, recursos cruzados entre hogares, errores e invariantes.
- Verificación de efectos observables y comandos enviados a los puertos.

### Infraestructura

- Mappers y repositorios Prisma con dobles del cliente.
- Transacciones, filtros, versionado, restricciones e idempotencia.
- No ejecutar localmente pruebas que requieran servicios externos.

### Presentación

- E2E dirigido para rutas, DTOs, autenticación, autorización, códigos HTTP y respuestas.
- OpenAPI actualizado cuando cambien los contratos.

## Validación del Bulk 1

Ejecutar una sola vez al terminar toda la implementación:

```bash
npm run lint
npm run test -- --runInBand <specs-dirigidos>
npm run test:e2e -- --runInBand <e2e-dirigidos>
```

No ejecutar build, servidores persistentes, Docker, migraciones, seeds, `test:db` ni conexiones a bases compartidas.

## Flujo Git previsto

```bash
git fetch origin main
git switch -c feat/54-60-inventory-prepared-food origin/main
```

- Una rama para `#54-#60`.
- Un único commit convencional para todo el bulk.
- Un único PR contra `main`.
- El PR debe incluir `Closes #54` hasta `Closes #60` solamente si todas quedan completamente resueltas.

## Fuera del alcance del Bulk 1

- Compras y confirmación de compras.
- Lista de compras.
- Conversión de lista a compra.
- Sincronización offline.
- Cambios en el frontend.
- Precios individuales, códigos de barras o integraciones con supermercados.
- Alertas avanzadas de vencimiento y trazabilidad industrial por lotes.

## Riesgos que deben vigilarse

- La persistencia debe insertar movimientos y actualizar saldos en la misma transacción.
- Las operaciones con varios items necesitan una única transacción, no una transacción independiente por repositorio.
- La idempotencia requiere restricciones de base de datos además de verificaciones previas.
- El contrato HTTP debe evitar pérdida de precisión al exponer cantidades decimales.
- Las relaciones con sobrantes y batches no deben permitir cascadas que eliminen el historial de inventario.
- La vista previa de preparación debe evitar consultas N+1 y selecciones implícitas de existencias.
- El resumen diario debe seguir derivándose de comidas confirmadas, sin una escritura paralela.

## Definición de terminado del Bulk 1

- Las issues `#54-#60` cumplen sus criterios observables.
- El dominio no importa NestJS, Prisma, HTTP ni módulos de infraestructura.
- Las cantidades conservan precisión decimal y los movimientos son inmutables.
- Todas las escrituras compuestas son atómicas.
- La autorización funcional está cubierta por pruebas.
- Los contratos HTTP y OpenAPI están actualizados.
- Existen migraciones reproducibles, pero no fueron ejecutadas localmente.
- Lint y pruebas dirigidas finalizan correctamente.
