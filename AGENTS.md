# AGENTS.md

Instrucciones para trabajar exclusivamente en `alejandrojsrvc/nutrihogar-api`.

## Producto y arquitectura

API REST NestJS y TypeScript con monolito modular, DDD pragmatico, arquitectura hexagonal, Clean Architecture y CQRS ligero.

- Las dependencias apuntan hacia el dominio.
- `domain` y `application` no conocen NestJS, Prisma, Supabase, HTTP ni proveedores externos.
- Los controllers adaptan HTTP y llaman casos de uso; no contienen reglas de negocio.
- Prisma es persistencia, nunca el modelo de dominio.
- Separar DTO HTTP, commands, results, entidades y modelos de persistencia.
- Usar puertos, mappers y `UnitOfWork` solo cuando la issue los necesite.
- La autorizacion funcional vive en los casos de uso, no solo en guards.
- Los calculos nutricionales son deterministas y usan precision decimal.
- La IA no es fuente de verdad para calorias o nutrientes.
- No crear abstracciones o carpetas sin responsabilidad actual.

## Fuente de verdad y contexto

1. Leer la issue completa:

```bash
gh issue view <numero> --repo alejandrojsrvc/nutrihogar-api
```

La salida ya presenta el cuerpo Markdown de la issue. No convertirla a JSON ni guardarla en un archivo temporal.

2. Inspeccionar codigo y pruebas del bounded context afectado.
3. Leer `doc/arquitecture.md` solo si hay una decision arquitectonica o el modulo es desconocido.
4. Consultar el sprint o `../PDR.md` solo para aclarar dependencias o producto.

La issue define objetivo, alcance, criterios, pruebas y exclusiones. No ampliar el alcance.

## Busqueda de codigo

- Buscar siempre en el repositorio local mediante Glob y Grep.
- No usar `gh api search/code` para explorar codigo.
- GitHub se usa para leer issues y gestionar PRs, no para buscar implementaciones.
- Realizar como maximo dos busquedas dirigidas antes de leer los archivos relacionados.
- No consultar `git log`, `git show`, `git blame` ni commits anteriores salvo que la issue describa una regresion, cite un commit o requiera contexto historico.
- Si una capacidad no existe localmente, informar la dependencia en lugar de seguir buscando remotamente.

## Flujo rapido

### Inicio

```bash
git status --short
git branch --show-current
```

Preservar cambios ajenos. Si entran en conflicto directo, detenerse y consultar.

Con un arbol compatible:

```bash
git fetch origin main
git switch -c <tipo>/<issue-o-rango>-<slug> origin/main
```

Usar `feat`, `fix` o `chore`, en minusculas, ASCII y con guiones.

### Implementacion

- Presentar un plan de hasta cinco puntos y no pedir aprobacion si la issue es clara.
- Hacer el cambio minimo correcto.
- Crear o actualizar pruebas unitarias y de integracion que verifiquen comportamiento observable y criterios de aceptacion.
- Cubrir el camino correcto, errores importantes e invariantes; evitar tests triviales, mocks excesivos o assertions que siempre pasan.
- No eliminar, omitir ni debilitar pruebas existentes para conseguir un resultado verde.
- Actualizar OpenAPI cuando cambie un contrato HTTP.
- Crear migraciones reproducibles cuando corresponda, pero no ejecutarlas.
- Actualizar `.env.example` y README solo si cambia configuracion.
- No implementar dependencias o issues futuras de forma silenciosa.

## Comandos

Permitidos para validar:

```bash
npm run lint
npm run test -- --runInBand <ruta-spec>
npm run test:e2e -- --runInBand <ruta-e2e>
```

Reglas:

- Ejecutar lint y las pruebas dirigidas una sola vez, al terminar todo el pedido.
- Ejecutar integracion local solo cuando termine en proceso y no necesite servicios externos.
- Omitir e2e salvo cambio HTTP o requisito explicito.
- No ejecutar `test:db` ni pruebas que requieran PostgreSQL o Supabase local.
- No ejecutar la suite completa localmente por defecto; GitHub Actions ejecuta lint y la suite unitaria en el PR.
- Si se necesita otro script, verificar primero `package.json`; no inventarlo.
- La instalacion de paquetes esta permitida solo si la issue la necesita.

Prohibido ejecutar:

- Build, `start`, `start:dev` o procesos persistentes.
- Docker o Docker Compose.
- `db:migrate`, `db:deploy`, `db:seed`, `db:reset`, Supabase local o Prisma Studio.
- Despliegues o conexiones a bases compartidas.
- Comandos Git destructivos, force push, amend no solicitado o merge.

## Varias issues en un pedido

- Una rama y un PR para todo el pedido.
- Rama: `<tipo>/<primera>-<ultima>-<slug>`.
- Un solo commit convencional para todo el pedido.
- Una sola validacion al terminar todas las implementaciones.
- Un `Closes #<numero>` por cada issue completamente resuelta en el PR.

## Commit y PR

Al terminar, revisar el diff una sola vez para confirmar que solo contiene archivos del pedido. Preparar esos archivos, crear un unico commit convencional, hacer un solo push y abrir un solo PR.

No repetir `git status`, no consultar `git log` ni ejecutar revisiones redundantes salvo que exista un problema real de Git.

El PR contra `main` debe incluir resumen por issue, decisiones relevantes, lint y pruebas dirigidas ejecutadas, pruebas externas no ejecutadas, checks pendientes en GitHub, pasos manuales, riesgos y todos los `Closes #N` aplicables.

Despues de abrirlo, devolver la URL y detenerse. No esperar GitHub Actions, hacer merge ni cerrar issues manualmente.

## Pruebas por capa

- Dominio: unitarias puras, sin NestJS ni base de datos.
- Aplicacion: casos de uso con dobles o repositorios en memoria.
- Infraestructura: integracion del adaptador cuando corresponda.
- Presentacion: DTO, codigos HTTP, autenticacion y autorizacion.
- Probar resultados y efectos observables, no detalles internos de implementacion.
