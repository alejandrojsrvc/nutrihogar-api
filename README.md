# NutriHogar API

API REST de NutriHogar, una plataforma familiar para registrar la alimentación, calcular nutrientes, administrar inventario, planificar comidas y seguir metas nutricionales individuales.

## Estado

El proyecto se encuentra en desarrollo activo. Esta primera base incluye:

- NestJS y TypeScript.
- Configuración mediante variables de entorno.
- Prefijo global `/api`.
- Validación global de DTO.
- Respuestas de error consistentes.
- Documentación OpenAPI con Swagger.
- Endpoint de salud.
- Pruebas unitarias y e2e.
- Supabase CLI para PostgreSQL, Auth, Storage local y Mailpit.
- Prisma como fuente de verdad del esquema de negocio y sus migraciones.

Los módulos funcionales y sus entidades se incorporarán en las siguientes tareas del roadmap. Esta base ya deja
separados los servicios locales de cualquier proyecto remoto de Supabase.

## Stack

- Node.js 20 o superior.
- NestJS 11.
- TypeScript.
- PostgreSQL mediante Supabase.
- Prisma 6.
- Supabase CLI.
- Jest y Supertest.
- Swagger/OpenAPI.

## Requisitos

- Node.js `>= 20`.
- npm `>= 10`.
- Docker Desktop u otro runtime compatible con la API de Docker para Supabase local.

La versión utilizada durante la inicialización fue Node.js 22.

## Instalación

```bash
git clone git@github.com:alejandrojsrvc/nutrihogar-api.git
cd nutrihogar-api
npm install
cp .env.example .env
```

La dependencia `supabase` queda instalada en el proyecto. Por eso los comandos de este README usan `npx supabase`
o los scripts `npm run supabase:*`; no es necesario instalar la CLI globalmente.

## Entorno local

El entorno local usa la configuración versionada de [`supabase/config.toml`](supabase/config.toml). Supabase CLI
levanta PostgreSQL, Auth, Storage, Studio, Realtime y Mailpit dentro de Docker. Ningún comando local necesita acceso
a staging o producción.

Desde la raíz del repositorio:

```bash
# Solo es necesario si se elimina la carpeta supabase/.
npm run supabase:init

npm run supabase:start
npm run supabase:status

# Copia las claves que muestra `supabase status` a .env.
npm run db:generate
npm run db:migrate
npm run db:seed

npm run start:dev
```

Servicios locales por defecto:

| Servicio | URL o conexión |
| --- | --- |
| API NestJS | `http://localhost:3000/api` |
| Supabase API/Auth | `http://127.0.0.1:54321` |
| PostgreSQL | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Supabase Studio | `http://127.0.0.1:54323` |
| Mailpit | `http://127.0.0.1:54324` |

`supabase status` muestra las claves locales generadas por la CLI. Son credenciales de desarrollo y no deben
subirse al repositorio.

## Variables de entorno

| Variable | Descripción | Requerida actualmente |
| --- | --- | --- |
| `NODE_ENV` | Entorno de ejecución: `development`, `test` o `production` | No, valor por defecto `development` |
| `PORT` | Puerto HTTP de la API | No, valor por defecto `3000` |
| `DATABASE_URL` | Conexión PostgreSQL usada por la API y Prisma Client | Sí fuera de `test` |
| `DIRECT_URL` | Conexión directa usada por Prisma Migrate y herramientas administrativas | Sí para los comandos Prisma |
| `SUPABASE_URL` | URL del proyecto Supabase usado por Auth/Storage | No hasta integrar sus adaptadores |
| `SUPABASE_PUBLISHABLE_KEY` | Clave pública preferida para clientes Supabase | No hasta integrar Auth |
| `SUPABASE_SECRET_KEY` | Clave privada preferida para operaciones de servidor | No; nunca debe exponerse al frontend |
| `SUPABASE_ANON_KEY` | Clave pública legacy, compatible durante la transición | No hasta integrar Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada legacy, compatible durante la transición | No; nunca debe exponerse al frontend |
| `SUPABASE_JWT_SECRET` | Secreto de validación JWT del proyecto | No hasta integrar el guard de Auth |
| `SUPABASE_STORAGE_BUCKET` | Bucket privado por defecto para archivos | No, valor por defecto `user-files` |
| `FRONTEND_URL` | Origen permitido por CORS | No, valor por defecto `http://localhost:5173` |

No se deben subir archivos `.env` ni credenciales al repositorio.

En el entorno local, `DATABASE_URL` y `DIRECT_URL` apuntan al puerto `54322`. Después de `supabase start`, copia
las claves locales que entrega `supabase status` en `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y
`SUPABASE_JWT_SECRET` cuando sean necesarias. Las variables `SUPABASE_ANON_KEY` y
`SUPABASE_SERVICE_ROLE_KEY` se mantienen para compatibilidad con integraciones legacy.

## Prisma, migraciones y seeds

Prisma es la fuente de verdad para:

- Tablas, columnas, relaciones e índices de la aplicación.
- Migraciones reproducibles en `prisma/migrations/`.
- Seeds del dominio en `prisma/seed.ts`.

Supabase CLI es la fuente de verdad para la infraestructura local, Auth, Storage, Mailpit, extensiones y SQL
especializado de Supabase cuando se necesite. No se crearán migraciones equivalentes en `supabase/migrations/`.

El modelo `TechnicalSeed` es únicamente una migración técnica para validar este flujo inicial; las entidades del
producto se añadirán en sus bounded contexts.

```bash
# Generar Prisma Client después de cambiar el schema.
npm run db:generate

# Crear una migración durante el desarrollo.
npm run db:migrate -- --name nombre_del_cambio

# Aplicar migraciones existentes en staging/producción.
npm run db:deploy

# Ejecutar explícitamente los datos iniciales.
npm run db:seed

# Abrir Prisma Studio contra DATABASE_URL.
npm run db:studio
```

El esquema inicial de identidad y hogares está en `prisma/schema.prisma` y contiene `User`, `Household`,
`HouseholdMembership` y `HouseholdInvitation`. La relación `createdBy` impide borrar físicamente al creador de un
hogar; la membresía tiene una restricción única por usuario y hogar, y las invitaciones guardan únicamente
`tokenHash`. La creación del hogar y la membresía `ADMIN` se coordinarán en el caso de uso correspondiente.

La prueba de integración de persistencia usa una transacción que siempre hace rollback. Para ejecutarla contra el
PostgreSQL local, hay que proporcionar explícitamente una URL local; nunca se ejecuta contra staging o producción:

```bash
DATABASE_URL_TEST=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run test:db
```

Sin `DATABASE_URL_TEST`, la suite queda omitida para que `npm run test` y `npm run test:e2e` no dependan de Docker.

El reinicio completo local se ejecuta así:

```bash
npm run db:reset
```

Ese script hace `supabase db reset`, `prisma migrate deploy` y `prisma db seed`. El comando aislado
`supabase db reset` solo reconstruye la infraestructura local de Supabase porque el esquema de negocio pertenece a
Prisma; esta separación evita mantener migraciones duplicadas.

No ejecutar `supabase db reset --linked` contra producción. `--linked` solo debe utilizarse de forma deliberada
contra un proyecto remoto de desarrollo o staging.

## Local, staging, producción y Vercel

Cada entorno debe usar un proyecto Supabase independiente:

| Entorno | `DATABASE_URL` / `SUPABASE_URL` | Variables en Vercel |
| --- | --- | --- |
| Local | `127.0.0.1`, valores generados por Supabase CLI | No se configura en Vercel |
| Staging/Preview | Proyecto Supabase de staging | Environment `Preview` |
| Producción | Proyecto Supabase de producción | Environment `Production` |

En Vercel, configura también `DIRECT_URL` solo para los procesos controlados que ejecuten Prisma Migrate. La API
debe usar la conexión adecuada para el runtime y no debe ejecutar migraciones al arrancar cada función.

Los buckets de Storage siguen la misma separación: `user-files` local, `user-files` en staging y `user-files` en
producción son buckets de proyectos diferentes. El bucket local es privado; sus políticas y las políticas remotas
deben definirse y revisarse por entorno. El backend deberá usar la API de Supabase Storage para subir archivos, no
el sistema de archivos efímero de Vercel.

## Pruebas manuales del entorno

1. Elimina los contenedores locales de Supabase si necesitas una prueba desde cero y ejecuta `npm run supabase:start`.
2. Confirma los servicios y las claves con `npm run supabase:status`.
3. Ejecuta `npm run db:generate`, `npm run db:migrate` y `npm run db:seed`.
4. Inicia la API con `npm run start:dev` y comprueba `GET http://localhost:3000/api/health`.
5. Crea un usuario Auth local usando la clave pública local:

   ```bash
   set -a
   source .env
   set +a

   curl --request POST \
     --url http://127.0.0.1:54321/auth/v1/signup \
     --header "apikey: $SUPABASE_PUBLISHABLE_KEY" \
     --header 'Content-Type: application/json' \
     --data '{"email":"dev@nutrihogar.local","password":"LocalOnly-123456"}'
   ```

6. Inicia sesión con `POST /auth/v1/token?grant_type=password` y la misma clave pública; la respuesta debe incluir
   la sesión local.
7. Abre `http://127.0.0.1:54324` y confirma que Mailpit recibe los correos de Auth cuando se habiliten
   confirmaciones.
8. Ejecuta `npm run db:reset` y confirma que la migración técnica y el seed se aplican otra vez.
9. Verifica en Studio que el bucket privado `user-files` existe en el proyecto local. Los buckets de staging y
   producción se crean y revisan en sus proyectos remotos respectivos.

## Ejecución

```bash
# Desarrollo
npm run start:dev

# Ejecución normal
npm run start

# Compilar y ejecutar producción
npm run build
npm run start:prod
```

La API queda disponible en `http://localhost:3000/api`.

## Endpoints base

### Health check

```http
GET /api/health
```

Respuesta:

```json
{
  "status": "ok",
  "timestamp": "2026-07-29T17:00:00.000Z"
}
```

### OpenAPI

- Swagger UI: `http://localhost:3000/api/docs`
- Documento JSON: `http://localhost:3000/api/docs-json`

## Errores

Los errores HTTP usan un formato común:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["name must be a string"],
  "path": "/api/example",
  "timestamp": "2026-07-29T17:00:00.000Z"
}
```

Los errores internos no exponen detalles sensibles al cliente.

## Calidad

```bash
# Lint sin modificar archivos
npm run lint

# Corregir lint automáticamente
npm run lint:fix

# Formato
npm run format

# Pruebas unitarias
npm run test

# Pruebas e2e
npm run test:e2e

# Cobertura
npm run test:cov

# Build
npm run build
```

## Arquitectura

El backend se construirá como un monolito modular con DDD pragmático, arquitectura hexagonal, Clean Architecture y CQRS ligero.

La regla principal de dependencias es:

```text
Presentation -> Application -> Domain
Infrastructure -> Application/Domain ports
```

El dominio y los casos de uso no deben depender de NestJS, Prisma, Supabase, HTTP o proveedores externos. Prisma vive
en `src/database` como adaptador global de infraestructura; los repositorios de cada bounded context lo encapsularán
mediante puertos y mappers explícitos. Las carpetas de cada contexto se crearán cuando exista una responsabilidad
funcional real.

Consulta la [documentación de arquitectura](doc/arquitecture.md) para conocer las reglas completas.

## Repositorio frontend

La aplicación web se desarrolla en [nutrihogar-react-webapp](https://github.com/alejandrojsrvc/nutrihogar-react-webapp).

## Licencia

Proyecto privado en desarrollo. Todos los derechos reservados.
