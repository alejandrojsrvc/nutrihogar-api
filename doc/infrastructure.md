# Infraestructura de NutriHogar API

Runbook operativo para las personas y sesiones que mantengan el despliegue de la API.

## Alcance

La infraestructura de producción está formada por:

| Componente     | Responsabilidad                                                           |
| -------------- | ------------------------------------------------------------------------- |
| Neon           | PostgreSQL administrado, migraciones y datos de la API                    |
| Render         | Build, ejecución y health check de NestJS                                 |
| Cloudflare R2  | Object Storage privado para archivos temporales                           |
| GitHub Actions | Validación de PR y, como flujo objetivo, migraciones y disparo del deploy |

El entorno local utiliza PostgreSQL y MinIO mediante `docker compose`. MinIO implementa la misma API S3-compatible que
R2, pero no se utiliza como almacenamiento de producción.

## Arquitectura

```text
PR hacia main
  |
  +--> GitHub Actions: lint y tests

Merge del PR hacia main
  |
  +--> GitHub Actions: prisma migrate deploy --> Neon
  |                                      |
  |                                      +--> Render Deploy Hook
  |
  +--> Render Web Service --> NestJS --> Neon PostgreSQL
                                      |
                                      +--> Cloudflare R2 privado
```

El workflow `.github/workflows/migrate-and-deploy.yml` implementa el flujo de migraciones y Deploy Hook. El workflow
`.github/workflows/ci.yml` mantiene la validación de lint y tests.

## Entornos

| Entorno    | API                        | Base de datos                         | Object Storage          |
| ---------- | -------------------------- | ------------------------------------- | ----------------------- |
| Local      | NestJS en `localhost:3000` | PostgreSQL local                      | MinIO local             |
| Produccion | Render Web Service         | Neon                                  | Cloudflare R2           |
| Tests      | Jest                       | Dobles o base explícita según el test | `InMemoryObjectStorage` |

No se deben mezclar las credenciales de un entorno con otro. En particular, `STORAGE_DRIVER=minio` es para local y
`STORAGE_DRIVER=r2` es para producción.

## Neon

### Recursos

Neon debe tener un proyecto con una branch y una base de datos PostgreSQL seleccionadas explícitamente. El nombre de la
base por defecto puede ser `neondb`, pero la API debe usar el nombre que aparezca en las URLs de conexión configuradas.

La migración de Prisma crea tablas en una base existente. No crea el proyecto, la branch ni la base de datos dentro de
Neon.

En la consola de Neon, para inspeccionar la estructura:

1. Abrir el proyecto correcto.
2. Seleccionar la branch correcta, normalmente `main`.
3. Seleccionar la base de datos indicada al final de la URL.
4. Revisar el schema `public` y la tabla `_prisma_migrations`.

Consulta útil en el SQL Editor:

```sql
SELECT migration_name, started_at, finished_at, rolled_back_at
FROM "_prisma_migrations"
ORDER BY started_at;
```

### URLs de conexión

`prisma/schema.prisma` define:

```prisma
url       = env("DATABASE_URL")
directUrl = env("DIRECT_URL")
```

Usar las dos URLs para la misma branch, base de datos y usuario:

| Variable       | Uso                                           | Recomendación                            |
| -------------- | --------------------------------------------- | ---------------------------------------- |
| `DATABASE_URL` | API y Prisma Client en runtime                | Connection string pooled de Neon         |
| `DIRECT_URL`   | `prisma migrate deploy` y herramientas Prisma | Connection string directa, sin `-pooler` |

Las URLs de Neon deben conservar `sslmode=require` cuando Neon lo incluya. No pegar URLs completas en issues, logs,
commits ni documentación: contienen credenciales.

### Migraciones

Las migraciones versionadas en `prisma/migrations` son la fuente reproducible del esquema.

```bash
# Genera el cliente; no cambia la base de datos.
npm run db:generate

# Crea una migración durante desarrollo local.
npm run db:migrate -- --name nombre_del_cambio

# Aplica migraciones pendientes sin crear una nueva.
npm run db:deploy
```

Reglas de producción:

- Ejecutar `db:deploy` únicamente contra la base de datos de producción correcta.
- No ejecutar `db:reset`, `db:migrate` interactivo ni `db:seed` en producción.
- No borrar ni editar una migración que ya haya sido aplicada.
- Si una migración falla, conservar los logs y revisar `_prisma_migrations` antes de reintentar.
- Toda migración nueva debe viajar en el mismo commit que el cambio de `schema.prisma` que la necesita.

La migración de autenticación propia crea `password_hash` y `auth_sessions`, y elimina la dependencia de
`auth_provider_id`. R2 no necesita migraciones porque los objetos no se persisten como filas en PostgreSQL.

## Render

### Servicio

El servicio debe ser un Web Service conectado al repositorio `alejandrojsrvc/nutrihogar-api` y a la branch `main`.
El root directory debe ser la raíz del repositorio, donde existen `package.json` y `prisma/`.

Configuración de build:

```bash
npm ci --include=dev && npm run db:generate && npm run build
```

Configuración normal de ejecución:

```bash
npm run start:prod
```

El resultado esperado del build es `dist/main.js`. El health check de Render debe apuntar a:

```text
/api/health
```

### Variables en Render

Configurar como secretos o variables privadas del servicio:

```env
NODE_ENV=production
DATABASE_URL=<Neon pooled connection string>
DIRECT_URL=<Neon direct connection string>
JWT_ACCESS_SECRET=<minimo 32 caracteres>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<otro secreto de minimo 32 caracteres>
JWT_REFRESH_EXPIRES_IN=30d
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=<Cloudflare account id>
R2_ACCESS_KEY_ID=<R2 access key>
R2_SECRET_ACCESS_KEY=<R2 secret key>
R2_BUCKET=<bucket privado>
FRONTEND_URL=<origen del frontend>
VERYFI_CLIENT_ID=<si se usa OCR>
VERYFI_CLIENT_API_KEY=<si se usa OCR>
VERYFI_BASE_URL=https://api.veryfi.com
VERYFI_TIMEOUT_MS=120000
UPLOAD_MAX_FILE_SIZE_MB=10
```

Render proporciona `PORT` cuando corresponde; la aplicación mantiene `3000` como valor local por defecto.
`NODE_ENV=pro` no es válido; el valor de producción es `production`.

No configurar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` ni variables equivalentes: Auth y
Storage ya no dependen de Supabase.

### Free tier y migraciones

El Free tier no ofrece el Pre-Deploy Command. GitHub Actions ejecuta las migraciones y el seed antes de pedirle a Render
que despliegue:

1. Render debe tener Auto-Deploy desactivado para evitar desplegar antes de migrar.
2. Un workflow de GitHub se ejecuta únicamente después de que un PR se mergea a `main`.
3. El workflow instala dependencias, genera Prisma Client, ejecuta `npm run db:deploy` y después `npm run db:seed` contra Neon.
4. Solo si la migración y el seed terminan correctamente, el workflow llama al Render Deploy Hook.
5. El hook apunta al commit mergeado de `main`; Render despliega y ejecuta `npm run start:prod`.

El workflow necesita estos GitHub Actions secrets:

| Secret                   | Uso                                         |
| ------------------------ | ------------------------------------------- |
| `NEON_DATABASE_URL`      | Valor de `DATABASE_URL` para Prisma         |
| `NEON_DIRECT_URL`        | Valor de `DIRECT_URL` para migraciones      |
| `RENDER_DEPLOY_HOOK_URL` | Hook privado que inicia el deploy de Render |

El workflow de producción escucha únicamente eventos `pull_request` cerrados y ejecuta el job solo cuando
`merged == true`. No se ejecuta en pushes de ramas feature, PRs abiertos ni PRs cerrados sin merge. Los PRs solo ejecutan
validaciones. La branch `main` debe estar protegida para impedir pushes directos y exigir que el check de CI pase antes
del merge.

Mientras el workflow no esté activo en GitHub, la alternativa temporal en un único servicio es usar este Start Command:

```bash
npm run db:deploy && npm run start:prod
```

No usar simultáneamente esta alternativa y el workflow de migraciones: ambas intentarían aplicar migraciones durante el
mismo despliegue.

### Diagnóstico de despliegues

Si la API arranca pero Neon no tiene tablas:

1. Confirmar que Render desplegó el commit más reciente de `main`.
2. Confirmar que `DATABASE_URL` y `DIRECT_URL` apuntan al mismo proyecto, branch y base.
3. Confirmar que la acción o el Start Command ejecutó `npm run db:deploy`.
4. Revisar los logs en busca de `Applying migration` o `No pending migrations to apply`.
5. Revisar la tabla `_prisma_migrations` en el schema `public`.

Si aparece `No pending migrations to apply` pero la base está vacía, se está consultando una base distinta de la que usa
Render.

Si el servicio falla antes de iniciar, revisar primero `DIRECT_URL`, las credenciales JWT y la validación condicional de
R2.

## Cloudflare R2

### Configuración

Crear un bucket privado y una API token con permisos mínimos de lectura, escritura y eliminación sobre ese bucket.
No hace falta habilitar un dominio público: la API genera URLs presigned bajo demanda.

La aplicación construye el endpoint de R2 como:

```text
https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
```

Usa la región `auto`, el bucket de `R2_BUCKET` y el adapter S3-compatible con `forcePathStyle`.

Variables requeridas:

```env
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=<account id>
R2_ACCESS_KEY_ID=<access key>
R2_SECRET_ACCESS_KEY=<secret key>
R2_BUCKET=<bucket privado>
```

### Comportamiento de archivos

- Los objetos son privados por defecto.
- Las URLs de descarga se firman bajo demanda entre 60 y 900 segundos; OCR usa 10 minutos.
- No se guardan URLs presigned ni metadata de archivos en PostgreSQL.
- Las keys de recibos siguen `households/{householdId}/receipts/{uuid}.{extension}`.
- El flujo OCR elimina el objeto temporal después de procesarlo.
- El adapter valida keys para impedir segmentos vacíos, `.`, `..`, barras iniciales, barras invertidas y bytes nulos.
- Storage no tiene endpoints genéricos de subida o descarga.

### Errores comunes

| Síntoma               | Causa probable                                                         |
| --------------------- | ---------------------------------------------------------------------- |
| `403` al subir        | Token sin permiso de escritura o bucket incorrecto                     |
| `403` al borrar       | Token sin permiso de eliminación                                       |
| `NoSuchBucket`        | `R2_BUCKET` no existe en la cuenta indicada                            |
| Error de conexión     | `R2_ACCOUNT_ID` incorrecto o endpoint construido para otra cuenta      |
| OCR no puede leer URL | El objeto no es accesible mediante la URL presigned o ya fue eliminado |

## Seguridad y secretos

- No subir `.env`, exports de Render, URLs de Neon ni credenciales R2.
- Rotar inmediatamente cualquier credencial que haya sido pegada en chat, issue, PR, log o archivo compartido.
- Mantener secretos de runtime en Render y secretos de migración/deploy en GitHub Actions.
- Usar secretos JWT de acceso y refresh diferentes.
- Mantener el bucket R2 privado y limitar el token al bucket de NutriHogar.
- No reintroducir variables ni dependencias de Supabase Auth/Storage.

## Checklist de una instalacion nueva

- [ ] Crear proyecto, branch y base en Neon.
- [ ] Copiar las URLs pooled y direct a los secretos correspondientes.
- [ ] Crear bucket privado y token restringido en R2.
- [ ] Configurar variables de Render.
- [ ] Conectar Render a `main` y verificar build/start/health check.
- [ ] Proteger `main` y exigir CI antes del merge.
- [ ] Configurar secrets de GitHub Actions.
- [ ] Desactivar Auto-Deploy de Render cuando exista el workflow de migraciones.
- [ ] Ejecutar el primer merge y confirmar `_prisma_migrations` en Neon.
- [ ] Probar `GET /api/health` y el flujo de autenticación.
- [ ] Probar un upload temporal con R2 antes de habilitar OCR.

## Referencias del repositorio

- `prisma/schema.prisma`: conexión y fuente del modelo de datos.
- `prisma/migrations/`: migraciones reproducibles.
- `.env.example`: variables locales.
- `.github/workflows/ci.yml`: validación actual de lint y tests.
- `src/config/environment-validation.schema.ts`: validación de variables.
- `src/storage/storage.module.ts`: selección MinIO/R2.
- `src/storage/infrastructure/s3-compatible/s3-compatible-object-storage.adapter.ts`: adapter S3-compatible.
