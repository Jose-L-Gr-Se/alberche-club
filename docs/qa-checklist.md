# Checklist de QA Manual — Alberche Club

> Marca cada ítem como ✅ pasado, ❌ fallido o ⚠️ pendiente de revisión.
> Última actualización: 2026-04-16

---

## 1. Auth

### 1.1 Login
- [ ] Introducir email y contraseña correctos → redirige a `/staff/sesiones` (staff) o `/palista/sesiones` (palista)
- [ ] Introducir credenciales incorrectas → muestra mensaje de error en rojo en español
- [ ] Dejar campos vacíos → el navegador bloquea el submit (campos `required`)
- [ ] Email con formato inválido → el navegador bloquea el submit (`type="email"`)

### 1.2 Logout
- [ ] Pulsar "Cerrar sesión" → cierra la sesión y redirige a `/login`
- [ ] Tras cerrar sesión, intentar volver a una ruta privada con el botón "atrás" → redirige a `/login`

### 1.3 Redirecciones de sesión
- [ ] Usuario no autenticado accede a `/palista/sesiones` → redirige a `/login`
- [ ] Usuario no autenticado accede a `/staff/sesiones` → redirige a `/login`
- [ ] Usuario no autenticado accede a `/staff/sesiones/[id]/barcos` → redirige a `/login`
- [ ] Usuario autenticado accede a `/login` → redirige a `/` (que luego va a su ruta principal)
- [ ] Usuario con rol `palista` accede a `/staff/sesiones` → muestra "Sin permisos"
- [ ] Usuario con rol `staff` accede a `/palista/sesiones` → carga correctamente (staff puede ver vista palista)

### 1.4 Persistencia de sesión
- [ ] Recargar la página en una ruta privada → sigue mostrando la misma página (no redirige)
- [ ] Abrir nueva pestaña en ruta privada → no pide login de nuevo

---

## 2. Staff — Sesiones

### 2.1 Lista de sesiones
- [ ] Página carga con la lista de sesiones ordenada por fecha
- [ ] Filtro "Todas" muestra todas las sesiones
- [ ] Filtro "Operativas" muestra solo sesiones activas (abierta, cerrada, planificación)
- [ ] Filtro "Publicadas" muestra solo sesiones publicadas
- [ ] Filtro "Canceladas" muestra solo sesiones canceladas
- [ ] Búsqueda por texto filtra sesiones por tipo de entreno o sede
- [ ] Sesión sin resultados de búsqueda → muestra empty state apropiado
- [ ] Botón "Nueva sesión" lleva a `/staff/sesiones/nueva`

### 2.2 Crear sesión
- [ ] Formulario con todos los campos obligatorios vacíos → muestra error específico
- [ ] Fecha inválida → error de validación
- [ ] Cierre de inscripción con formato incorrecto → error de validación
- [ ] Formulario válido → crea sesión y redirige al detalle
- [ ] Sesión creada aparece en la lista con estado `abierta_inscripcion`

### 2.3 Editar sesión
- [ ] Editar sesión en estado `abierta_inscripcion` → formulario accesible
- [ ] Editar sesión en estado `cerrada_inscripcion` → formulario accesible
- [ ] Editar sesión en estado `publicada` → formulario bloqueado o no accesible
- [ ] Cambios guardados → reflejan en el detalle de la sesión

### 2.4 Detalle de sesión
- [ ] Muestra todos los datos de la sesión (fecha, hora, sede, tipo_entreno, estado)
- [ ] Muestra lista de inscritos con nombre y datos
- [ ] Muestra lista de espera separada de inscritos
- [ ] Muestra inscripciones canceladas si las hay

### 2.5 Cambios de estado
- [ ] `abierta_inscripcion` → `cerrada_inscripcion` → funciona
- [ ] `cerrada_inscripcion` → `abierta_inscripcion` → funciona
- [ ] `cerrada_inscripcion` → `en_planificacion` → funciona
- [ ] `en_planificacion` → `cerrada_inscripcion` → funciona
- [ ] Cualquier estado → `cancelada` → funciona
- [ ] Transición inválida (ej: `abierta_inscripcion` → `publicada`) → bloqueada

### 2.6 Gestión de inscripciones desde staff
- [ ] Marcar inscripción como "inscrito" → cambia estado y refresca lista
- [ ] Marcar inscripción como "lista de espera" → cambia estado
- [ ] Cancelar inscripción desde staff cuando estaba inscrito → libera plaza **y promociona al siguiente en espera**
- [ ] Cancelar inscripción desde staff cuando estaba en espera → se cancela sin promoción
- [ ] No se puede modificar inscripciones en sesiones `en_planificacion` o `publicada`

---

## 3. Staff — Planificación de barcos

### 3.1 Vista de barcos
- [ ] Accesible desde el detalle de sesión
- [ ] Solo accesible en estados: `abierta_inscripcion`, `cerrada_inscripcion`, `en_planificacion`
- [ ] Muestra inscritos pendientes de asignar a la izquierda
- [ ] Muestra barcos creados a la derecha

### 3.2 Crear y borrar barcos
- [ ] Crear barco → aparece en la lista con nombre "Barco N"
- [ ] Borrar barco vacío → desaparece y los restantes se renumeran
- [ ] Borrar barco con personas asignadas → muestra error "no se puede borrar"

### 3.3 Asignaciones
- [ ] Asignar inscripción a barco como **banco** → aparece en la lista de asignados del barco
- [ ] Asignar inscripción a barco como **tambor** → aparece en sección Tambor
- [ ] Asignar inscripción a barco como **timonel** → aparece en sección Timonel
- [ ] Intentar asignar un segundo tambor al mismo barco → error "puesto ocupado"
- [ ] Intentar asignar un segundo timonel al mismo barco → error "puesto ocupado"
- [ ] Desasignar inscripción → vuelve a la lista de pendientes
- [ ] Mover inscripción ya asignada a otro barco → la asignación se actualiza (upsert)

### 3.4 Editor de posición (banco)
- [ ] Seleccionar banco + lado + guardar → posición actualizada
- [ ] Seleccionar banco ocupado por otra persona → error "asiento ocupado"
- [ ] Banco fuera del rango del tipo de barco → error de validación
- [ ] Veterano asignado a hueco de iniciación → **error bloqueante** (rojo)
- [ ] Iniciación asignado a hueco de veterano → **error bloqueante** (rojo)
- [ ] Lado incompatible con preferencia → **warning** (amarillo), guarda igual
- [ ] Prep/rec desconocido → warning, guarda igual
- [ ] Tipo de hueco desconocido → warning, guarda igual

### 3.5 Editor de posición (tambor/timonel)
- [ ] Cambiar a Tambor → banco y lado se limpian y quedan deshabilitados
- [ ] Cambiar a Timonel → banco y lado se limpian y quedan deshabilitados
- [ ] Guardar como Tambor → no valida lado ni banco
- [ ] Incoherencias de tipo_entreno/tipo_hueco en tambor → aparecen como **warning** (no bloquean)

### 3.6 Publicar planificación
- [ ] Publicar con personas inscritas sin asignar → error bloqueante
- [ ] Publicar con asignaciones de banco incompletas (sin banco o sin lado) → error bloqueante
- [ ] Publicar con todo correcto → sesión pasa a `publicada`, barcos visibles para palistas
- [ ] Intentar publicar desde estado incorrecto (no `en_planificacion`) → bloqueado

---

## 4. Palista

### 4.1 Vista de sesiones
- [ ] Sesión con `abierta_inscripcion` y plazo abierto → muestra botón "Inscribirme"
- [ ] Sesión con `abierta_inscripcion` ya inscrito → muestra "Estás inscrito" + "Cancelar inscripción"
- [ ] Sesión con `abierta_inscripcion` en lista de espera → muestra "Estás en lista de espera" + "Cancelar inscripción"
- [ ] Sesión con inscripción cerrada (plazo pasado) → muestra "Inscripción cerrada"
- [ ] Sesión con inscripción cerrada, estando inscrito → muestra estado inscripción + "Inscripción cerrada" (sin botón cancelar)
- [ ] Sesión `en_planificacion`, inscrito → muestra estado + "Tu sitio se está preparando"
- [ ] Sesión `publicada`, inscrito → muestra "Estás inscrito" + botón "Ver mi sitio en el barco →"
- [ ] Sesión `publicada`, no inscrito → muestra "Barcos publicados"
- [ ] Columna Estado muestra texto humano (no estado interno crudo)
- [ ] Cierre de inscripción muestra fecha formateada (no ISO crudo)

### 4.2 Inscribirse
- [ ] Inscribirse en sesión abierta → estado cambia a "Estás inscrito"
- [ ] Inscribirse en sesión llena → estado cambia a "Estás en lista de espera"
- [ ] Intentar inscribirse dos veces → error por duplicado (no se crea segunda inscripción)
- [ ] Inscribirse en sesión cerrada (plazo pasado) → botón no accesible (no aparece)

### 4.3 Cancelar inscripción
- [ ] Cancelar desde estado "inscrito" → inscripción cancelada, plaza liberada
- [ ] Cancelar desde estado "inscrito" con lista de espera → el primero en espera pasa a "inscrito"
- [ ] Cancelar desde estado "lista de espera" → inscripción cancelada, no afecta otros
- [ ] Intentar cancelar con plazo cerrado → no se muestra el botón

### 4.4 Vista de barcos publicados
- [ ] Solo muestra barcos de sesiones en estado `publicada`
- [ ] Barco donde el usuario está asignado → muestra banner "Tu sitio" con la posición exacta
- [ ] **Tu sitio: Banco 3 · Derecha** → si está en banco con lado
- [ ] **Tu sitio: Tambor** → si está como tambor
- [ ] **Tu sitio: Timonel** → si está como timonel
- [ ] El usuario aparece en la tabla/sección con badge "Tú" verde
- [ ] Otros usuarios aparecen sin badge especial
- [ ] Huecos vacíos muestran "Vacío" con borde discontinuo
- [ ] Si no tiene inscripciones confirmadas → empty state apropiado
- [ ] Si tiene inscripciones pero no está asignado a ningún barco → empty state apropiado
- [ ] Si está asignado pero el barco no está publicado → no aparece nada (comportamiento correcto)

---

## 5. Seguridad y permisos

### 5.1 Acceso a rutas
- [ ] Palista no puede acceder a `/staff/*` → muestra "Sin permisos"
- [ ] No autenticado no puede acceder a `/palista/*` → redirige a `/login`
- [ ] No autenticado no puede acceder a `/staff/*` → redirige a `/login`

### 5.2 Acciones del servidor
- [ ] Palista no puede llamar a acciones de staff (cambiarEstadoSesion, crearBarco, etc.) → FORBIDDEN
- [ ] Staff puede llamar a acciones de palista (`inscribirmeEnSesion`) en su propio nombre
- [ ] Inscripción de otra sesión no puede asignarse a barco de esta sesión → validación bloqueante
- [ ] No se puede borrar barco de otra sesión mediante ID directo → sesion_id validado

### 5.3 Edge cases de estado
- [ ] No se puede publicar sesión que no está en `en_planificacion`
- [ ] No se puede asignar personas a barcos de sesión `publicada`
- [ ] No se puede modificar inscripciones de sesión `en_planificacion`

---

## 6. Datos incompletos / perfiles

- [ ] Persona sin nombre en inscripción → muestra fallback (ej: "Palista sin nombre")
- [ ] Persona sin peso → campo peso muestra "—" o similar, no falla la página
- [ ] Inscripción sin `tipo_hueco` → warning al asignar banco (no bloquea)
- [ ] Inscripción sin `prep_rec` → warning al asignar banco (no bloquea)
- [ ] Inscripción sin `lado_solicitado` → no warning de lado (no aplica)
- [ ] `lado_solicitado = ambos` → no warning de lado

---

## 7. Estados de sesión — Visibilidad palista

| Estado sesión       | Palista inscrito              | Palista no inscrito    |
|---------------------|-------------------------------|------------------------|
| `abierta_inscripcion` (abierto) | Inscrito + Cancelar | Inscribirme |
| `abierta_inscripcion` (cerrado) | Inscrito + Cerrada | Cerrada |
| `cerrada_inscripcion` | Inscrito + Cerrada | Cerrada |
| `en_planificacion`  | Inscrito + "se está preparando" | "se está preparando" |
| `publicada`         | Inscrito + "Ver mi sitio →" | "Barcos publicados" |
| `cancelada`         | (no aplica, sesión cancelada) | (ídem) |

---

## 8. Reglas de tripulación (assignment-rules)

- [ ] Sesión veteranos + hueco iniciación → error rojo, no guarda
- [ ] Sesión iniciación + hueco veterano → error rojo, no guarda
- [ ] Sesión veteranos + hueco indistinto → sin error, guarda
- [ ] Sesión iniciación + hueco indistinto → sin error, guarda
- [ ] Sesión veteranos + hueco veterano → sin error, guarda
- [ ] Lado solicitado izquierda, asignado derecha → warning amarillo, guarda
- [ ] Lado solicitado ambos → sin warning de lado
- [ ] Valor de lado no reconocible → warning, guarda
- [ ] Tambor/timonel con mismatch de tipo → warning (no bloquea)
- [ ] Tambor/timonel con datos incompletos → warnings, guarda

---

## 9. Rendimiento y robustez

- [ ] La app no muestra datos de otras personas a un palista que no le corresponden
- [ ] Páginas de error (sesiones no encontradas) muestran mensaje útil
- [ ] Recargar la página tras una acción no repite la acción (no resubmit)
- [ ] Botones de acción muestran estado "cargando" mientras se procesa

---

## Notas de deuda técnica (no bloquean QA pero registrar)

- Inscripción via palista usa defaults hardcodeados para `lado_solicitado` ('i') y `prep_rec` ('prep'). Deberían ser introducidos por el usuario o recogidos del perfil.
- Staff puede auto-inscribirse como palista vía `inscribirmeEnSesion` (rolecheck acepta 'staff'). Diseño deliberado pero revisar si es el comportamiento deseado.
- `capacidad_total` no se puede editar desde la UI de creación de sesión; se gestiona directamente en base de datos.
- Cierre de inscripción no valida que sea una fecha futura.
- No hay audit trail de quién realizó cada cambio de estado o inscripción.
