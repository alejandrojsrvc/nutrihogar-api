# Plan de Sprint 6 Backend - Seguimiento corporal y sintomas

## Fuente y alcance

Este documento define el primer bloque backend del Sprint 6 para las issues `#89-#93`.

El alcance se ejecutara en secuencia:

```text
#89 -> #90 -> #91 -> #92 -> #93
```

Las issues posteriores del Sprint 6 quedan fuera de este bloque:

- `#94-#95`: persistencia y casos de uso de sintomas.
- `#96`: tendencias corporales.
- `#97`: patrones descriptivos de sintomas.
- `#98-#100`: reportes.
- `#101-#102`: revision de metas nutricionales.
- `#103`: exportaciones CSV.

## Resultado esperado

El backend debe permitir:

```text
configurar medidas corporales
  -> registrar peso
  -> consultar historial y ultimo registro
  -> corregir sin sobrescribir historia
  -> registrar medidas habilitadas
  -> consultar medidas por tipo y fecha
  -> crear el dominio base de sintomas digestivos
```

No se realizaran diagnosticos, recomendaciones clinicas ni inferencias causales.

## Dependencias disponibles

- Autenticacion y guard de Supabase.
- Hogares, membresias, roles y aislamiento por hogar.
- Perfiles adultos.
- `Clock` en el modulo de Nutrition.
- Prisma y PostgreSQL.
- Comidas registradas y snapshots nutricionales.
- Catalogo de alimentos y nutrientes.

## Arquitectura

Crear un bounded context independiente:

```text
src/health-tracking/
  domain/
  application/
  infrastructure/
  presentation/
  health-tracking.module.ts
```

Reglas de dependencia:

- `domain` no conoce NestJS, Prisma, HTTP ni proveedores externos.
- `application` usa puertos y casos de uso, no adaptadores concretos.
- `infrastructure` contiene Prisma, mappers y repositorios.
- `presentation` adapta HTTP, DTOs, Swagger y errores.
- El contexto valida pertenencia al perfil y al hogar en los casos de uso.

## Modelo de datos

### #89 - Dominio corporal

Crear los aggregates y entidades:

- `BodyWeightEntry`.
- `BodyMeasurementEntry`.
- `MeasurementConfiguration`.
- `CustomMeasurementDefinition` como entidad interna de configuracion.

Value objects:

- `BodyWeightEntryId`.
- `BodyMeasurementEntryId`.
- `MeasurementConfigurationId`.
- `BodyWeight`.
- `BodyMeasurementValue`.
- `MeasurementType`.
- `MeasurementUnit`.
- `MeasurementRecordedAt`.
- `MeasurementSource`.

Tipos de medida iniciales:

```text
WAIST, HIPS, CHEST, ARM_LEFT, ARM_RIGHT,
THIGH_LEFT, THIGH_RIGHT, NECK, CALF_LEFT,
CALF_RIGHT, CUSTOM
```

Fuentes:

```text
MANUAL, IMPORTED, DEVICE
```

Reglas:

- Peso y medidas deben ser positivos.
- Las unidades deben pertenecer al conjunto controlado.
- Cada registro pertenece a un perfil adulto.
- No sobrescribir registros historicos.
- Una correccion crea un nuevo registro relacionado.
- No eliminar fisicamente datos usados por reportes.
- Las medidas personalizadas requieren nombre normalizado unico por perfil.
- La fecha no puede estar excesivamente en el futuro.
- Se permiten varios registros el mismo dia.
- El dominio no calcula diagnosticos ni composicion corporal clinica.

Comportamientos:

```text
BodyWeightEntry.create()
BodyWeightEntry.correct()
BodyMeasurementEntry.create()
BodyMeasurementEntry.correct()
MeasurementConfiguration.createDefault()
MeasurementConfiguration.enable()
MeasurementConfiguration.disable()
MeasurementConfiguration.addCustomMeasurement()
MeasurementConfiguration.removeCustomMeasurement()
MeasurementConfiguration.changeUnits()
```

### #90 - Persistencia corporal

Crear modelos Prisma:

- `BodyWeightEntry`.
- `BodyMeasurementEntry`.
- `MeasurementConfiguration`.
- `CustomMeasurementDefinition`.

Crear puertos:

```text
BodyWeightRepository
  findById()
  save()
  listByAdult()
  findLatest()

BodyMeasurementRepository
  findById()
  save()
  listByAdult()

MeasurementConfigurationRepository
  findByAdult()
  save()
```

Persistencia:

- Usar `Decimal` para peso y medidas.
- Conservar la unidad original.
- Mantener `correctedFromId` o relacion equivalente.
- Guardar configuracion y medidas personalizadas en transaccion.
- No exponer modelos Prisma fuera de infraestructura.
- Aplicar indices por perfil, fecha y tipo.
- Aislar siempre por hogar mediante el perfil adulto.
- Crear una migracion reproducible sin ejecutarla localmente.

### #91 - Casos de uso de peso

Crear:

```text
RegisterBodyWeightUseCase
CorrectBodyWeightUseCase
GetBodyWeightEntryQuery
ListBodyWeightEntriesQuery
GetLatestBodyWeightQuery
```

Endpoints:

```text
POST /api/adult-profiles/:adultProfileId/body-weight
GET  /api/adult-profiles/:adultProfileId/body-weight
GET  /api/body-weight/:entryId
POST /api/body-weight/:entryId/corrections
GET  /api/adult-profiles/:adultProfileId/body-weight/latest
```

Reglas de aplicacion:

- Validar acceso activo al perfil.
- Los adultos pueden consultar datos de su hogar segun la politica vigente.
- Cada adulto registra y corrige sus propios datos.
- Los administradores pueden corregir con auditoria explicita.
- La correccion nunca modifica el registro original.
- Normalizar fechas usando la zona horaria del hogar.
- Soportar filtros `dateFrom`, `dateTo`, `unit`, `page` y `limit`.
- No interpretar el peso como saludable o no saludable.

### #92 - Configuracion y medidas

Crear:

```text
GetMeasurementConfigurationQuery
UpdateMeasurementConfigurationUseCase
RegisterBodyMeasurementUseCase
CorrectBodyMeasurementUseCase
ListBodyMeasurementsQuery
```

Endpoints:

```text
GET  /api/adult-profiles/:adultProfileId/measurement-configuration
PUT  /api/adult-profiles/:adultProfileId/measurement-configuration
POST /api/adult-profiles/:adultProfileId/body-measurements
GET  /api/adult-profiles/:adultProfileId/body-measurements
POST /api/body-measurements/:entryId/corrections
```

Reglas:

- La configuracion inicial usa tipos controlados por defecto.
- Solo se registran tipos habilitados, salvo habilitacion en la misma operacion.
- Permitir registrar una o varias medidas.
- La operacion de varias medidas debe ser atomica.
- No exigir todas las medidas habilitadas.
- Cada medida conserva historial independiente.
- Las medidas personalizadas pertenecen al perfil.
- Filtrar por tipo y rango de fechas.
- No calcular porcentaje de grasa sin formula aprobada.

### #93 - Dominio de sintomas digestivos

Crear el aggregate:

- `DigestiveSymptomEntry`.

Entidades internas:

- `SymptomMealLink`.
- `SymptomFoodLink`.

Value objects:

- `DigestiveSymptomEntryId`.
- `DigestiveSymptomType`.
- `SymptomIntensity`.
- `SymptomDuration`.
- `SymptomOccurredAt`.
- `SymptomStatus`.

Tipos iniciales:

```text
GAS, BLOATING, ABDOMINAL_PAIN, HEARTBURN,
NAUSEA, DIARRHEA, CONSTIPATION, OTHER
```

Estados:

```text
ACTIVE, RESOLVED, CORRECTED, CANCELLED
```

Reglas:

- Intensidad entre 1 y 5.
- `OTHER` requiere nombre descriptivo.
- La fecha de fin no puede ser anterior al inicio.
- La duracion debe poder calcularse de forma determinista.
- Los enlaces a comidas y alimentos son opcionales.
- Un alimento puede provenir de una comida relacionada o de una hipotesis manual.
- Un sintoma no implica causalidad.
- Una correccion conserva el registro anterior.
- Cancelar no elimina fisicamente el registro.
- No realizar diagnosticos ni interpretar notas clinicas.

Comportamientos:

```text
create()
resolve()
linkMeal()
linkFood()
unlinkMeal()
correct()
cancel()
```

La persistencia y los casos de uso de sintomas pertenecen a `#94-#95` y no se implementan en este bloque.

## Autorizacion y privacidad

- Toda query y mutation exige membresia activa en el hogar.
- La pertenencia del perfil se valida en el caso de uso.
- Los recursos no aceptan `householdId` del body como sustituto de autorizacion.
- Los registros historicos no se eliminan fisicamente.
- Las correcciones mantienen actor, fecha y referencia al registro anterior.
- No devolver datos de perfiles de otro hogar.

## Precision y fechas

- Usar `Decimal` para peso y medidas.
- No redondear durante operaciones internas.
- Redondear solo en la presentacion o politica explicita de unidad.
- Persistir timestamps en UTC.
- Interpretar fechas de consulta segun la zona horaria del hogar.
- Rechazar fechas futuras fuera de la tolerancia definida por el dominio.

## Pruebas por issue

### #89

- Crear peso y medidas validos.
- Rechazar valores cero, negativos y unidades invalidas.
- Crear y corregir conservando historial.
- Configuracion por defecto y medidas personalizadas.
- Evitar nombres personalizados duplicados.
- Rechazar fechas futuras.

### #90

- Round-trip de mappers.
- Persistencia de Decimal sin perdida de precision.
- Historial y ultimo registro.
- Correcciones relacionadas.
- Configuracion y personalizados en transaccion.
- Aislamiento por hogar.

### #91

- Registrar, consultar, listar y obtener ultimo peso.
- Filtros por fecha, unidad y paginacion.
- Autorizacion de perfil y hogar.
- Correccion sin mutar el registro original.
- Permisos de adulto y administrador.

### #92

- Obtener configuracion por defecto.
- Habilitar y deshabilitar tipos.
- Registrar una y varias medidas atomicas.
- Rechazar medidas no habilitadas.
- Registrar y corregir personalizadas.
- Listar por tipo y rango de fechas.

### #93

- Crear sintomas validos.
- Validar intensidad, tipo `OTHER` y duracion.
- Resolver, cancelar y corregir.
- Vincular y desvincular comidas y alimentos.
- Conservar historial de correcciones.
- Verificar que no existan inferencias causales.

## Orden de entrega

Una rama y un PR por issue, en orden:

```text
feat/89-health-tracking-domain
feat/90-body-tracking-persistence
feat/91-body-weight-use-cases
feat/92-body-measurements
feat/93-digestive-symptom-domain
```

Cada PR debe cerrar solamente su issue correspondiente.

## Validacion

Por cada issue:

```bash
npm run lint
npm run test -- --runInBand <specs-dirigidos>
```

Ejecutar e2e solo cuando cambie HTTP y la prueba termine sin servicios externos.

No ejecutar localmente:

- Build.
- Servidores persistentes.
- Docker.
- Migraciones o seeds.
- `test:db`.
- Conexiones a bases compartidas.

## Fuera de alcance

- Diagnosticos clinicos.
- Clasificacion de peso saludable o no saludable.
- Porcentaje de grasa corporal sin formula aprobada.
- Inferencia causal entre sintomas y alimentos.
- Analisis de texto libre para diagnosticos.
- Tendencias corporales de `#96`.
- Persistencia y casos de uso de sintomas de `#94-#95`.
- Reportes, revision de metas y exportaciones.

## Definicion de terminado

- Las issues `#89-#93` cumplen sus criterios de aceptacion.
- El dominio no conoce NestJS, Prisma ni HTTP.
- Los hogares y perfiles permanecen aislados.
- Las correcciones conservan historial y auditoria.
- Los valores conservan precision Decimal.
- Prisma, OpenAPI y migraciones estan actualizados cuando corresponda.
- Las pruebas dirigidas pasan sin debilitar pruebas existentes.
