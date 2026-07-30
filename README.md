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

La base de datos, autenticación y módulos funcionales se incorporarán en las siguientes tareas del roadmap.

## Stack

- Node.js 20 o superior.
- NestJS 11.
- TypeScript.
- Jest y Supertest.
- Swagger/OpenAPI.
- PostgreSQL, Prisma y Supabase en etapas posteriores.

## Requisitos

- Node.js `>= 20`.
- npm.

La versión utilizada durante la inicialización fue Node.js 22.

## Instalación

```bash
git clone git@github.com:alejandrojsrvc/nutrihogar-api.git
cd nutrihogar-api
npm install
cp .env.example .env
```

## Variables de entorno

| Variable | Descripción | Requerida actualmente |
| --- | --- | --- |
| `NODE_ENV` | Entorno de ejecución: `development`, `test` o `production` | No, valor por defecto `development` |
| `PORT` | Puerto HTTP de la API | No, valor por defecto `3000` |
| `FRONTEND_URL` | Origen permitido por CORS | No, valor por defecto `http://localhost:5173` |
| `DATABASE_URL` | Conexión PostgreSQL | No, se utilizará al integrar Prisma |
| `SUPABASE_URL` | URL del proyecto Supabase | No, se utilizará al integrar Supabase |
| `SUPABASE_ANON_KEY` | Clave pública de Supabase | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada para operaciones de servidor | No |
| `SUPABASE_JWT_SECRET` | Secreto para validar tokens | No |

No se deben subir archivos `.env` ni credenciales al repositorio.

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

El dominio y los casos de uso no deben depender de NestJS, Prisma, Supabase, HTTP o proveedores externos. Las carpetas de cada contexto se crearán cuando exista una responsabilidad funcional real.

Consulta la [documentación de arquitectura](doc/arquitecture.md) para conocer las reglas completas.

## Repositorio frontend

La aplicación web se desarrolla en [nutrihogar-react-webapp](https://github.com/alejandrojsrvc/nutrihogar-react-webapp).

## Licencia

Proyecto privado en desarrollo. Todos los derechos reservados.
