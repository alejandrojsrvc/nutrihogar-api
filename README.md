# NutriHogar API

API REST de NutriHogar, una plataforma familiar para registrar la alimentación, calcular nutrientes, administrar
inventario, planificar comidas y seguir metas nutricionales individuales.

## Stack

- Node.js 20 o superior.
- NestJS 11 y TypeScript.
- PostgreSQL estándar.
- Prisma 6.
- JWT propio mediante `@nestjs/jwt`.
- Argon2 para el hash de contraseñas.
- Jest, Supertest y Swagger/OpenAPI.

## Instalación

```bash
git clone git@github.com:alejandrojsrvc/nutrihogar-api.git
cd nutrihogar-api
npm install
cp .env.example .env
```

Configura dos secretos JWT diferentes de al menos 32 caracteres en `.env`.

## Desarrollo local

El desarrollo local utiliza PostgreSQL y MinIO, que implementa la misma API S3-compatible utilizada por R2:

```bash
docker compose up -d
npm run db:generate
npm run db:deploy
npm run db:seed
npm run start:dev
```

Servicios locales:

| Servicio      | URL o conexión                                             |
| ------------- | ---------------------------------------------------------- |
| API NestJS    | `http://localhost:3000/api`                                |
| PostgreSQL    | `postgresql://postgres:postgres@127.0.0.1:5432/nutrihogar` |
| MinIO API     | `http://localhost:9000`                                    |
| MinIO Console | `http://localhost:9001`                                    |
| Swagger UI    | `http://localhost:3000/api/docs`                           |

Prisma Studio continúa disponible con `npm run db:studio`.

## Variables de entorno

| Variable                  | Descripción                                                 | Requerida                    |
| ------------------------- | ----------------------------------------------------------- | ---------------------------- |
| `NODE_ENV`                | `development`, `test` o `production`                        | No, `development`            |
| `PORT`                    | Puerto HTTP                                                 | No, `3000`                   |
| `DATABASE_URL`            | Conexión PostgreSQL de la API y Prisma Client               | Sí fuera de tests            |
| `DIRECT_URL`              | Conexión directa para migraciones y herramientas Prisma     | Según el comando Prisma      |
| `JWT_ACCESS_SECRET`       | Secreto del access token, mínimo 32 caracteres              | Sí fuera de tests            |
| `JWT_ACCESS_EXPIRES_IN`   | Expiración del access token                                 | No, `15m`                    |
| `JWT_REFRESH_SECRET`      | Secreto diferente para refresh tokens, mínimo 32 caracteres | Sí fuera de tests            |
| `JWT_REFRESH_EXPIRES_IN`  | Expiración del refresh token                                | No, `30d`                    |
| `STORAGE_DRIVER`          | `minio` en local, `r2` en producción                        | No, `minio`                  |
| `MINIO_ENDPOINT`          | Endpoint S3 local                                           | Sí con `minio`               |
| `MINIO_ACCESS_KEY_ID`     | Credencial local de MinIO                                   | Sí con `minio`               |
| `MINIO_SECRET_ACCESS_KEY` | Secreto local de MinIO                                      | Sí con `minio`               |
| `MINIO_BUCKET`            | Bucket local privado                                        | Sí con `minio`               |
| `R2_ACCOUNT_ID`           | Account ID de Cloudflare                                    | Sí con `r2`                  |
| `R2_ACCESS_KEY_ID`        | Access key de R2                                            | Sí con `r2`                  |
| `R2_SECRET_ACCESS_KEY`    | Secret key de R2                                            | Sí con `r2`                  |
| `R2_BUCKET`               | Bucket privado de R2                                        | Sí con `r2`                  |
| `UPLOAD_MAX_FILE_SIZE_MB` | Tamaño máximo de uploads                                    | No, `10`                     |
| `FRONTEND_URL`            | Origen permitido por CORS                                   | No, `http://localhost:5173`  |
| `VERYFI_CLIENT_ID`        | Identificador privado de Veryfi                             | Sí para OCR                  |
| `VERYFI_CLIENT_API_KEY`   | API key privada de Veryfi                                   | Sí para OCR                  |
| `VERYFI_BASE_URL`         | URL base de Veryfi                                          | No, `https://api.veryfi.com` |
| `VERYFI_TIMEOUT_MS`       | Timeout OCR en milisegundos                                 | No, `120000`                 |

No se deben subir archivos `.env` ni credenciales al repositorio.

La configuración completa de Neon, Render, Cloudflare R2, migraciones y el flujo de despliegue está en
[doc/infrastructure.md](doc/infrastructure.md).

## Object Storage

La aplicación depende del puerto agnóstico `ObjectStorage`. En desarrollo se conecta a MinIO y en producción a
Cloudflare R2 mediante el mismo adapter S3-compatible. El dominio y los casos de uso no conocen AWS, S3, MinIO ni R2.

Los objetos son privados por defecto. Las URLs de descarga se generan bajo demanda y expiran en 10 minutos; nunca se
guardan URLs firmadas en PostgreSQL.

R2 requiere un bucket privado y una API token con permisos mínimos de lectura, escritura y eliminación únicamente sobre
ese bucket. No es necesario configurar una URL pública.

Configuración de producción:

```env
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET=nutrihogar
```

Para local, `docker compose up -d` crea el bucket `nutrihogar` en MinIO automáticamente. Las credenciales por defecto
son `minioadmin` / `minioadmin` y solo deben usarse en desarrollo.

## Autenticación

La API implementa autenticación propia con email/password, Argon2, JWT y sesiones de refresh persistidas en PostgreSQL.

Endpoints:

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/users/me
```

Registro:

```bash
curl --request POST \
  --url http://localhost:3000/api/auth/register \
  --header 'Content-Type: application/json' \
  --data '{"email":"dev@example.com","password":"LocalOnly-123456","displayName":"Alejandro"}'
```

Login:

```bash
curl --request POST \
  --url http://localhost:3000/api/auth/login \
  --header 'Content-Type: application/json' \
  --data '{"email":"dev@example.com","password":"LocalOnly-123456"}'
```

La respuesta incluye `accessToken`, `refreshToken` y `user`. El access token dura por defecto 15 minutos. El refresh
token dura por defecto 30 días, se almacena únicamente como hash y rota al usar `/api/auth/refresh`.

Consulta del usuario autenticado:

```bash
curl --request GET \
  --url http://localhost:3000/api/users/me \
  --header "Authorization: Bearer $ACCESS_TOKEN"
```

Logout revoca la sesión asociada al refresh token. Un refresh token revocado o reutilizado devuelve `401`.
La validación del access token comprueba firma, expiración y existencia del usuario por `JWT.sub`; nunca crea usuarios
automáticamente.

## Prisma, migraciones y seeds

Prisma es la fuente de verdad para tablas, relaciones, índices y migraciones reproducibles:

```bash
npm run db:generate
npm run db:migrate -- --name nombre_del_cambio
npm run db:deploy
npm run db:seed
npm run db:studio
```

La migración de autenticación elimina la identidad externa, agrega `password_hash` y crea `auth_sessions`. La columna
`password_hash` es nullable para conservar filas existentes sin destrucción; esas cuentas no pueden iniciar sesión hasta
que exista un proceso de restablecimiento de contraseña.

La prueba de integración de persistencia usa una transacción con rollback y requiere una URL local explícita:

```bash
DATABASE_URL_TEST=postgresql://postgres:postgres@127.0.0.1:5432/nutrihogar npm run test:db
```

## OCR de recibos

El endpoint existente `POST /api/households/:householdId/purchases/ocr-draft` utiliza Storage temporal. Genera una key
privada con el formato `households/{householdId}/receipts/{uuid}.{extension}`, crea una URL presigned para Veryfi y
elimina el objeto después del procesamiento. No se persiste metadata de archivo.

En local, Veryfi no puede acceder a URLs de MinIO en `localhost`; para probar OCR local se requiere un túnel público.
El flujo de Storage sí puede probarse completamente contra MinIO. En producción R2 proporciona URLs accesibles para
Veryfi.

No se modifican las reglas de negocio de compras, inventario ni hogares.

## Calidad

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Arquitectura

El backend es un monolito modular con DDD pragmático, arquitectura hexagonal, Clean Architecture y CQRS ligero.

```text
Presentation -> Application -> Domain
Infrastructure -> Application/Domain ports
```

El dominio y los casos de uso no dependen de NestJS, Prisma, HTTP ni proveedores externos. Los controllers adaptan HTTP,
los casos de uso contienen la coordinación y autorización funcional, y Prisma vive detrás de repositorios y mappers.
El Storage sigue el mismo patrón:

```text
NestJS
  |
ObjectStorage port
  |
  +-- S3CompatibleObjectStorageAdapter -> MinIO (development)
  +-- S3CompatibleObjectStorageAdapter -> Cloudflare R2 (production)
  +-- InMemoryObjectStorage -> tests
```

Consulta [doc/arquitecture.md](doc/arquitecture.md) para conocer las reglas completas.

## Repositorio frontend

La aplicación web se desarrolla en
[nutrihogar-react-webapp](https://github.com/alejandrojsrvc/nutrihogar-react-webapp).

## Licencia

Proyecto privado en desarrollo. Todos los derechos reservados.
