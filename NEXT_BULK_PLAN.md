# Plan del Proximo Bulk

## Estado actual

- Los PR `#111` y `#112` ya fueron mergeados.
- Completados los flujos de recetas, preparaciones reales y porciones servidas.
- La siguiente capacidad es confirmar consumo real y conservar sobrantes de una preparacion.

## Proximo Bulk: Issues #48-#49

Implementar consumo y sobrantes en una sola rama y un PR.

### Issue #48: Confirmar consumo real

- Crear `ConfirmServedPortionConsumptionUseCase`.
- Exponer `POST /api/served-portions/:portionId/confirm-consumption`.
- Validar acceso al hogar, fecha y estado de la porcion.
- Aceptar resto opcional y disposicion asociada.
- Calcular `consumedWeight = servedWeight - remainderWeight`.
- Calcular nutrientes desde los snapshots del `PreparedBatch` y su peso cocido.
- Crear la comida con fuente `PREPARED_BATCH`, perfil adulto y snapshots historicos.
- Asociar `mealId` y guardar el resto en una transaccion atomica.
- Rechazar confirmaciones repetidas.
- Si el resto es total, confirmar la porcion sin crear una comida.

### Issue #49: Registrar sobrantes preparados

- Crear el aggregate/read model `PreparedFoodLeftover`.
- Estados: `AVAILABLE`, `CONSUMED`, `DISCARDED`, `EXPIRED`.
- Exponer:
  - `POST /api/prepared-batches/:batchId/leftovers`
  - `GET /api/households/:householdId/prepared-leftovers`
  - `GET /api/prepared-leftovers/:leftoverId`
  - `PATCH /api/prepared-leftovers/:leftoverId/status`
- Validar peso positivo, disponibilidad, hogar y batch finalizado.
- Copiar la densidad nutricional historica del batch.
- Mantener trazabilidad a la preparacion original.
- Mantener historial al cambiar el estado.
- No integrar inventario general en este bulk.

## Decisiones de arquitectura

- El dominio y la aplicacion no conoceran NestJS, Prisma ni HTTP.
- `PortionRemainder` representa el resto de una porcion ya servida.
- `PreparedFoodLeftover` representa la parte no servida de una preparacion.
- Los nutrientes se calcularan con `totalNutrients / finalCookedWeight`, usando `Decimal` sin redondeo interno.
- La confirmacion de consumo usara un puerto de unidad de trabajo cruzada para persistir comida y porcion atomicamente.
- El resumen diario seguira leyendo comidas confirmadas; no se creara una escritura paralela.
- La densidad del sobrante sera un snapshot normalizado y no dependera de cambios futuros en la receta.

## Fuera de alcance

- Integracion con inventario, compras y lista de compras: Sprint 4.
- Consumo posterior automatico de sobrantes: se conserva trazabilidad y estado, pero no se implementa inventario.
- QA dedicado de `#50-#52`.
- Cambios en el frontend.

## Secuencia de implementacion

1. Actualizar Prisma, migracion y modelos de dominio para fuente de comida y sobrantes.
2. Implementar confirmacion de consumo y su transaccion cruzada.
3. Implementar registro, consultas y estados de sobrantes.
4. Actualizar Swagger y pruebas.
5. Ejecutar lint y tests permitidos.

## Flujo Git

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/48-49-consumption-leftovers
```

La rama debe contener commits separados por capacidad y un unico PR contra `main`.

## Validacion

Ejecutar unicamente:

```bash
npm run lint
npm run test -- --runInBand
npm run test:e2e -- --runInBand
```

No ejecutar build, servidores persistentes, Docker, migraciones, seeds ni operaciones contra bases de datos compartidas.
