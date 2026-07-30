# AGENTS.md

Instrucciones para cualquier agente que trabaje en `nutrihogar-api`.

## Proyecto

NutriHogar API es el backend REST de una plataforma de control nutricional familiar. Utiliza NestJS, TypeScript y una arquitectura de monolito modular con DDD pragmático, arquitectura hexagonal, Clean Architecture y CQRS ligero.

Repositorio: `alejandrojsrvc/nutrihogar-api`

## Fuentes de verdad

Antes de implementar una tarea, leer en este orden:

1. La issue completa en GitHub mediante `gh issue view`.
2. `doc/arquitecture.md`.
3. El código y las pruebas del bounded context afectado.
4. `PDR.md`, `BACKLOG.md` y el sprint correspondiente desde el directorio padre cuando sean necesarios para aclarar producto.
5. Las instrucciones más recientes del usuario.

La issue de GitHub define el alcance de implementación. No usar el sprint como sustituto de la issue.

## Flujo obligatorio por issue

### 1. Leer la issue

```bash
gh issue view <numero> --repo alejandrojsrvc/nutrihogar-api \
  --json number,title,body,labels,milestone,state,url
```

Extraer objetivo, alcance, criterios de aceptación, pruebas, dependencias y exclusiones. Confirmar que la issue esté abierta.

### 2. Revisar Git y actualizar local

Antes de cambiar ramas:

```bash
git status --short
git branch -vv
git remote -v
git log --oneline -10
```

No sobrescribir, revertir ni guardar en stash cambios ajenos. Si un cambio existente entra en conflicto directo con la tarea, detenerse y consultar al usuario.

Con el árbol limpio o sin conflictos:

```bash
git switch main
git pull --ff-only origin main
```

### 3. Crear rama

Crear una rama desde `main` actualizado:

```text
feat/<issue>-<descripcion-corta>
fix/<issue>-<descripcion-corta>
chore/<issue>-<descripcion-corta>
```

Usar minúsculas, ASCII y guiones.

### 4. Revisar arquitectura y planificar

Antes de editar:

- Identificar el bounded context afectado.
- Revisar dependencias de la issue.
- Inspeccionar implementaciones y pruebas relacionadas.
- Presentar un plan corto, asociado a los criterios de aceptación.
- Indicar explícitamente qué queda fuera de alcance.

No pedir aprobación del plan cuando la issue sea clara. Preguntar solo ante una decisión funcional o arquitectónica ambigua.

### 5. Implementar solo el alcance solicitado

- No agregar funcionalidades de issues futuras.
- No resolver dependencias pendientes de forma silenciosa.
- Preferir el cambio mínimo correcto.
- Crear o actualizar las pruebas exigidas.
- Actualizar Swagger cuando cambie un contrato HTTP.
- Actualizar `.env.example` y README cuando cambie la configuración.
- Crear migraciones reproducibles cuando la issue lo requiera, pero no ejecutarlas.
- No añadir compatibilidad retroactiva sin una necesidad concreta.

### 6. Validar únicamente con lint y tests

Se permite ejecutar:

```bash
npm run lint
npm run test -- --runInBand
npm run test:e2e -- --runInBand
```

Adaptar los comandos a los scripts existentes. Se permiten pruebas unitarias, de integración y e2e que se ejecuten en proceso y terminen automáticamente.

No ejecutar:

- `npm run build` ni otros comandos de compilación.
- `npm run start`, `start:dev` o servidores persistentes.
- Docker o Docker Compose.
- Migraciones o seeds.
- Despliegues.
- Operaciones contra bases de datos compartidas.

La instalación de paquetes sí está permitida cuando sea necesaria para la issue.

Si lint o tests fallan, corregir los fallos causados por la tarea. No debilitar reglas ni eliminar pruebas para hacerlos pasar. Si permanece un bloqueo, no presentar la tarea como completada ni abrir un PR normal.

### 7. Revisar, crear commit y push

Antes del commit:

```bash
git status --short
git diff
git log --oneline -10
```

Preparar solo los archivos de la issue y verificar:

```bash
git diff --cached --check
git diff --cached --stat
```

Usar un commit convencional y conciso. No hacer amend salvo solicitud explícita. No usar force push.

### 8. Abrir PR contra main

Antes del PR:

```bash
git status --short
git branch -vv
git log --oneline --decorate -10
git diff main...HEAD --check
git diff main...HEAD --stat
```

Crear el PR con `gh pr create`, usando `main` como base. El cuerpo debe incluir:

- Resumen de cambios.
- Decisiones arquitectónicas relevantes.
- Lint y tests realmente ejecutados.
- Build y verificaciones manuales no ejecutadas.
- Instrucciones exactas para probar.
- Riesgos o limitaciones conocidas.
- `Closes #<issue>` solo cuando todos los criterios estén cubiertos.

Después de abrir el PR, detenerse. Nunca hacer merge ni cerrar manualmente la issue.

## Reglas de arquitectura backend

- Las dependencias apuntan hacia el dominio.
- `domain` y `application` no conocen NestJS, Prisma, Supabase, HTTP ni proveedores externos.
- Los controllers solo adaptan HTTP y llaman casos de uso.
- No colocar reglas de negocio en controllers ni repositorios Prisma.
- No usar modelos Prisma como entidades de dominio.
- Separar DTO HTTP, commands, results y modelos de dominio.
- Definir puertos antes de adaptadores cuando exista una necesidad real.
- Usar mappers explícitos entre persistencia, dominio y presentación.
- Usar `UnitOfWork` para cambios transaccionales en múltiples registros.
- La autorización funcional debe existir en los casos de uso, no solo en guards.
- Los cálculos nutricionales son deterministas y usan precisión decimal.
- La IA nunca es fuente de verdad para calorías o nutrientes.
- No crear abstracciones, capas o carpetas vacías sin una responsabilidad actual.

## Pruebas

- Dominio: pruebas unitarias puras, sin NestJS ni base de datos.
- Aplicación: casos de uso con dobles, repositorios en memoria o mocks.
- Infraestructura: integración de adaptadores cuando corresponda.
- Presentación: pruebas HTTP para DTO, códigos, autenticación y autorización.

## Entrega al usuario

La respuesta final debe incluir:

1. URL del PR.
2. Resumen de archivos o áreas modificadas.
3. Resultado de lint y tests.
4. Declaración explícita de que no se ejecutó build ni se inició la aplicación.
5. Comandos para instalar, compilar e iniciar.
6. Pasos manuales numerados para verificar los criterios de aceptación.
7. Riesgos o validaciones pendientes.
