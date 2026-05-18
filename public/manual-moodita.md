# Manual de Uso - MOODITA: Plataforma de Gestión Artística

---

## 1. ACCESO Y AUTENTICACIÓN

### 1.1 Iniciar sesión
- Accede a la URL de la aplicación
- Introduce tu email y contraseña
- Si es tu primera vez, regístrate con tu email

### 1.2 Roles del sistema
La plataforma tiene dos roles principales:
- **Management**: Acceso completo a todas las herramientas (booking, discografía, proyectos, sincronizaciones, equipos, contactos, analytics, ajustes)
- **Colaborador**: Acceso limitado a los artistas y proyectos donde ha sido asignado

El rol activo se puede cambiar desde el selector en la parte inferior de la barra lateral.

---

## 2. NAVEGACIÓN PRINCIPAL (Barra lateral)

La barra lateral se divide en secciones:

### PRINCIPAL
| Sección | Descripción |
|---------|-------------|
| **Dashboard** | Vista general con resumen de actividad, próximos eventos y estadísticas |
| **Artistas** | Listado del roster de artistas gestionados. Punto de entrada a toda la información de cada artista |
| **Drive** | Gestor de archivos organizado por artista y categorías (Conciertos, Prensa, Legal, etc.) |
| **Calendario** | Vista semanal, mensual, trimestral o anual de todos los eventos |
| **Action Center** | Centro de solicitudes y aprobaciones (entrevistas, bookings, consultas, información, otros) |
| **Finanzas** | Presupuestos, royalties, liquidaciones y tendencias financieras |

### GESTIÓN (solo rol Management)
| Sección | Descripción |
|---------|-------------|
| **Booking** | Gestión completa de ofertas de conciertos |
| **Sincronizaciones** | Gestión de ofertas de sincronización (cine, TV, publicidad) |
| **Hojas de Ruta** | Roadmaps logísticos para eventos y giras |
| **Proyectos** | Gestión de proyectos con checklist, archivos y seguimiento |
| **Discografía** | Gestión de lanzamientos (singles, EPs, álbums) |

### HERRAMIENTAS
| Sección | Descripción |
|---------|-------------|
| **Correo** | Gestor de correo electrónico integrado |
| **Chat** | Canales de comunicación interna |
| **Documentos** | Generador de contratos y documentos |
| **EPKs** | Electronic Press Kits - dossiers de prensa digitales |
| **Analytics** | Estadísticas y métricas (solo Management) |

### ADMINISTRACIÓN (solo rol Management)
| Sección | Descripción |
|---------|-------------|
| **Equipos** | Gestión de miembros del equipo organizados por artista y categoría |
| **Contactos** | Agenda de contactos profesionales con etiquetas |
| **Mi Perfil** | Datos personales, documentos de identidad, información financiera |
| **Ajustes** | Preferencias de notificaciones, privacidad y apariencia |

La barra lateral se puede colapsar/expandir con el icono de menú en la esquina superior.

---

## 3. ARTISTAS (Mi Management)

### 3.1 Crear un artista
1. Ve a **Artistas** en la barra lateral
2. Pulsa **"Nuevo Artista"**
3. Rellena nombre, nombre artístico y descripción
4. El artista aparecerá en el roster

### 3.2 Ficha de artista
Al hacer clic en un artista, accedes a su ficha que muestra:
- Información básica
- Accesos directos a Booking, Discografía, Finanzas, Calendario, Carpetas y Sincronizaciones filtrados por ese artista

---

## 4. BOOKING

### 4.1 Vista general
El módulo de Booking muestra todas las ofertas de conciertos. Tiene dos vistas:
- **Lista/Tabla**: Vista tabular con todas las columnas configurables
- **Kanban**: Vista de tarjetas organizadas por fases

### 4.2 Fases del Booking (flujo Kanban)
Las ofertas pasan por las siguientes fases:

```
Interés → Oferta → Negociación → Confirmado → Facturado → Cerrado
                                                            │
                                                       Cancelado
```

- **Interés**: Primera toma de contacto o solicitud recibida
- **Oferta**: Se ha enviado o recibido una propuesta económica
- **Negociación**: Se están negociando condiciones
- **Confirmado**: Evento confirmado por ambas partes
- **Facturado**: Factura emitida
- **Cerrado**: Evento completamente liquidado
- **Cancelado**: Evento cancelado

### 4.3 Crear una oferta de booking
1. Pulsa **"+ Crear Booking"**
2. Rellena los campos:
   - **Artista**: Selecciona del roster
   - **Fecha y hora** del evento
   - **Festival/Ciclo**: Nombre del evento
   - **Venue/Lugar**: Recinto o sala
   - **Ciudad y País**
   - **Capacidad**: Aforo del recinto
   - **Promotor**: Nombre del promotor
   - **Fee**: Caché acordado (en euros)
   - **Formato**: Tipo de show (acústico, banda completa, DJ, etc.)
   - **Contacto**: Selecciona de la agenda de contactos
   - **Estado/Fase**: Fase inicial de la oferta
   - **CityZen / Internacional**: Marcadores especiales
   - **Link de venta, Condiciones, Notas**: Campos adicionales

### 4.4 Alerta de confirmación
Cuando se intenta crear o mover un booking a estado **"Confirmado"**, el sistema muestra un diálogo con dos opciones:
- **"Consultar disponibilidad y viabilidad"** (opción recomendada): Crea el booking en fase "Interés" con estado "Pendiente" para verificar la disponibilidad del equipo primero
- **"Confirmar directamente"**: Confirma inmediatamente sin verificaciones

Esto aplica al crear, editar o arrastrar en Kanban.

### 4.5 Detalle de un booking
Al hacer clic en una oferta, se accede al detalle con pestañas:
- **Vista General**: Datos principales, contacto, promotor, fee, validaciones
- **Hoja de Ruta**: Roadmap logístico del evento
- **Gastos**: Registro de gastos asociados al evento
- **Documentos**: Contratos y archivos adjuntos
- **Carpeta**: Acceso a la carpeta del evento en Drive

### 4.6 Disponibilidad y Viabilidad
Desde el detalle de un booking:
- **Solicitar disponibilidad**: Envía consultas al equipo para confirmar que están disponibles en la fecha
- **Chequeos de viabilidad**: Permite que manager, artista y técnico aprueben el evento

### 4.7 Validaciones automáticas
El sistema valida automáticamente:
- **Conflicto de fechas**: No permite dos confirmados en la misma fecha para el mismo artista
- **Contacto obligatorio**: Para propuestas y confirmados
- **Contratos obligatorios**: Para ofertas confirmadas
- **Link de venta**: Aviso para shows confirmados futuros sin link
- **Lead time**: Aviso si el evento está a menos de 14 días

### 4.8 Filtros
Los filtros disponibles son:
- Búsqueda por texto (venue, ciudad, festival)
- Filtro por artista
- Filtro por fase (interés, oferta, negociación, confirmado, etc.)
- Filtro por país
- Filtro por promotor
- Rango de fechas
- Internacional (sí/no)
- CityZen (sí/no)

### 4.9 Exportar
Puedes exportar los bookings a CSV desde el botón de descarga.

---

## 5. ACTION CENTER (Solicitudes)

### 5.1 Tipos de solicitudes
- **Entrevista**: Solicitudes de medios de comunicación
- **Booking**: Propuestas de conciertos
- **Consulta**: Preguntas internas o externas
- **Información**: Solicitudes de información
- **Otro**: Cualquier otra solicitud

### 5.2 Crear una solicitud
1. Pulsa **"+ Nueva Solicitud"** (o usa el atajo de teclado)
2. Selecciona el tipo
3. Rellena los campos según el tipo:
   - Entrevista: medio, entrevistador, programa, hora
   - Booking: festival, lugar, ciudad, hora del show
   - Consulta/Información/Otro: descripción libre
4. Asigna a un artista
5. Opcionalmente establece una fecha límite de respuesta

### 5.3 Estados
- **Pendiente**: Sin resolver
- **Aprobada**: Aceptada
- **Denegada**: Rechazada

### 5.4 Vistas
- **Lista**: Vista tabular
- **Kanban**: Tarjetas por estado
- **Estadísticas**: Gráficos y métricas

### 5.5 Acciones
- Cambiar estado con comentario de decisión
- Archivar/desarchivar solicitudes
- Asociar a un proyecto existente
- Crear proyecto desde la solicitud
- Programar encuentro
- Selección múltiple para acciones en lote
- Exportar a CSV

### 5.6 Atajos de teclado
- `Ctrl/Cmd + N`: Nueva solicitud
- `Ctrl/Cmd + 1/2/3`: Cambiar vista (Lista/Kanban/Stats)
- `Ctrl/Cmd + E`: Exportar

---

## 6. CALENDARIO

### 6.1 Vistas
- **Semana**: Vista semanal detallada
- **Mes**: Vista mensual con puntos de color
- **Trimestre**: Vista de 3 meses
- **Año**: Vista anual completa

### 6.2 Crear evento
1. Pulsa **"+ Evento"**
2. Rellena título, fecha inicio, fecha fin, tipo, ubicación
3. Asigna a un artista

### 6.3 Filtros
- Por artista (múltiples)
- Por proyecto
- Por equipo
- Por departamento

### 6.4 Exportar calendario
Puedes exportar el calendario en formato iCal (.ics) para importar en Google Calendar, Apple Calendar, etc.

---

## 7. FINANZAS

### 7.1 Pestañas disponibles

| Pestaña | Descripción |
|---------|-------------|
| **Resumen** | Visión general financiera con gráficos |
| **Presupuestos** | Gestión de presupuestos por proyecto/evento |
| **Canciones & Splits** | Registro de canciones con sus porcentajes de autoría (splits) |
| **Ganancias** | Registro de ingresos por plataforma (Spotify, Apple Music, etc.) |
| **Liquidación** | Calculadora de liquidaciones y pagos pendientes |
| **Tendencias** | Gráficos de evolución de ingresos |

### 7.2 Filtro por artista
Todas las pestañas se pueden filtrar por artista usando el selector superior.

### 7.3 Presupuestos
- Crear presupuestos con partidas detalladas
- Comparar gastos estimados vs reales
- Versionar presupuestos

### 7.4 Royalties y Splits
- Registrar canciones con sus colaboradores
- Definir porcentajes de autoría (compositor, letrista, productor, intérprete)
- Importar ganancias por plataforma
- Calcular distribuciones automáticas

---

## 8. DISCOGRAFÍA (Releases)

### 8.1 Crear un lanzamiento
1. Pulsa **"+ Nuevo Release"**
2. Tipo: Single, EP o Álbum
3. Nombre, artista, fecha de lanzamiento, sello
4. Estado: Planificando, En Progreso, Publicado, Archivado

### 8.2 Secciones de un lanzamiento
Cada release tiene 6 secciones:

| Sección | Contenido |
|---------|-----------|
| **Cronograma** | Timeline con hitos y tareas del lanzamiento (Gantt) |
| **Presupuestos** | Control de gastos estimados vs reales |
| **Imagen & Video** | Galería de fotos y videoclips |
| **Créditos y Autoría** | Compositores, productores, colaboradores |
| **Audio** | Tracklist y versiones de audio |
| **EPF** | Electronic Press Folder - documentos de prensa |

### 8.3 Vistas
- **Tarjetas**: Vista de cards por release
- **Cronogramas**: Vista general de todos los cronogramas activos

---

## 9. SINCRONIZACIONES

### 9.1 Qué es
Gestión de ofertas de sincronización: uso de música en cine, televisión, publicidad, videojuegos, etc.

### 9.2 Crear oferta de sincronización
Campos principales:
- Título de la producción
- Tipo de producción (película, serie, anuncio, etc.)
- Productora, director, territorio
- Canción y artista
- Tipo de uso y duración
- Presupuesto total, fee de sync, fee de master
- Porcentajes de master y editorial
- Contacto del solicitante

### 9.3 Fases
Las ofertas pasan por un flujo Kanban similar al booking.

### 9.4 Formulario público
Puedes generar un enlace público para que terceros envíen solicitudes de sincronización directamente.

---

## 10. HOJAS DE RUTA (Roadmaps)

### 10.1 Qué es
Documento logístico para eventos que contiene toda la información operativa: horarios, viajes, hospitality, equipo, contactos, producción.

### 10.2 Crear hoja de ruta
1. Pulsa **"+ Nueva Hoja de Ruta"**
2. Asigna un nombre (si se crea desde un booking, se sugiere automáticamente con formato: `DD.MM.YYYY Artista (Venue, Ciudad)`)
3. Asigna artista
4. Opcionalmente vincula a un booking existente

### 10.3 Bloques del roadmap
Un roadmap se compone de bloques:
- **Cabecera**: Información general del evento
- **Horarios**: Timeline del día
- **Viajes**: Transporte ida y vuelta
- **Hospitality**: Catering, alojamiento, backstage
- **Producción**: Rider técnico, backline, sonido
- **Contactos**: Personas clave del evento
- **Equipo**: Miembros del equipo asignados

### 10.4 Estados
- Borrador
- Confirmado
- En Revisión
- Cancelado

---

## 11. CONTACTOS

### 11.1 Dos sistemas de contactos

#### Equipos (Teams)
Para **miembros del equipo** que trabajan contigo directamente. Información detallada:
- Nombre completo, DNI, IBAN, dirección
- Teléfono, email, contacto de emergencia
- Tallas de ropa y calzado
- Alergias, fumador, tipo de carnet
- Categoría: Banda, Artístico, Técnico, Management, Comunicación, Legal, Producción, Tour Manager, Booking, Compositor, Letrista, Productor, Intérprete, Sello, Editorial, Otros

#### Agenda
Para **contactos profesionales** externos. Información mínima y flexible:
- Nombre, email, teléfono
- Etiquetas libres por profesión (#prensa, #tourmanager), ubicación (#barcelona, #paris), o entidad (#sonar, #primavera)
- Categoría unificada con Equipos

### 11.2 Gestión de equipos
- Organiza miembros por artista
- Vistas: Cuadrícula, Lista, Lienzo libre
- Filtra por categoría o equipo
- Gestiona categorías personalizadas
- Crea equipos nombrados (ej: "La Banda", "Equipo Tour")

### 11.3 Gestión de agenda
- Vista de tarjetas o Rolodex (como una agenda de móvil)
- Filtra por categoría, búsqueda de texto
- Comparte contactos
- Grupos de contactos para envíos masivos

---

## 12. MI PERFIL

### 12.1 Secciones del perfil
- **Identificación**: Nombre artístico, nombres, DNI/NIE, fecha nacimiento, seguridad social
- **Dirección**: Calle, código postal, ciudad, provincia, país
- **Tallas**: Calzado, pantalón, camisa, chaqueta, altura
- **Salud y Otros**: Alergias, fumador
- **Contacto y Financiero**: Teléfono, IBAN
- **Observaciones**: Notas libres
- **Documentos**: Fotos de DNI, pasaporte, carnet de conducir (almacenamiento privado)

Solo se muestran los campos que están rellenados.

---

## 13. DRIVE (Carpetas)

### 13.1 Estructura
Archivos organizados por artista con categorías predefinidas:
- Conciertos (con subcarpetas automáticas por evento)
- Prensa
- Legal
- Fotos
- Videos
- Música
- Documentos
- Otros

### 13.2 Funcionalidades
- Subir archivos
- Crear subcarpetas
- Compartir archivos con enlace público
- Vista de archivos por evento (Conciertos)

---

## 14. PROYECTOS

### 14.1 Crear proyecto
- Nombre, descripción, artista
- Fecha inicio y fin
- Estado y prioridad

### 14.2 Funcionalidades
- Checklist de tareas
- Archivos adjuntos
- Compartir proyecto con enlace público
- Progreso visual
- Vincular a solicitudes y bookings

---

## 15. EPKs (Electronic Press Kit)

### 15.1 Qué es
Dossier de prensa digital que se puede compartir con un enlace público.

### 15.2 Crear EPK
- Selecciona artista
- Configura secciones: biografía, fotos, videos, discografía, fechas de gira, contacto
- Personaliza colores y diseño
- Opcionalmente protege con contraseña

### 15.3 Compartir
- Genera URL pública (ej: `/epk/nombre-artista`)
- Copia el enlace y compártelo con periodistas, promotores, etc.
- Protección opcional con contraseña

---

## 16. DOCUMENTOS Y CONTRATOS

### 16.1 Generador de contratos
- Plantillas predefinidas: Contrato estándar, Contrato festival
- Placeholders automáticos: nombre artista, NIF, fecha, venue, caché, etc.
- Genera PDF descargable

### 16.2 Firma digital
- Envía contratos para firma vía enlace público
- Múltiples firmantes
- Seguimiento del estado de firma

---

## 17. PERMISOS Y ROLES (RBAC)

### 17.1 Niveles de acceso
El sistema usa 3 niveles jerárquicos:

```
WORKSPACE (nivel organización)
  → ARTIST (nivel artista)
    → PROJECT (nivel proyecto)
```

### 17.2 Roles por nivel

**Workspace:**
- **Owner**: Acceso total, facturación, invitar usuarios, crear artistas
- **Team Manager**: Invitar usuarios, crear artistas, ver todo

**Artista:**
- **Artist Manager**: Control total sobre proyectos del artista, ventas, calendario
- **Artist Observer**: Solo lectura (dashboard, ventas, calendario)

**Proyecto:**
- **Editor**: Ver, editar, crear tareas, enviar presupuestos, cambiar estados, subir archivos
- **Commenter**: Ver proyecto, comentar, aprobar si está asignado
- **Viewer**: Solo lectura

### 17.3 Herencia
Los permisos se heredan hacia abajo:
- Un Owner de Workspace tiene acceso a TODO
- Un Manager de Artista tiene acceso a TODOS los proyectos de ese artista
- Un Editor de Proyecto solo tiene acceso a ESE proyecto

---

## 18. NOTIFICACIONES

- Campana de notificaciones en la barra lateral
- Alertas de recordatorios de booking
- Alertas de validación (campos faltantes, conflictos de fecha)
- Notificaciones de cambios de estado en solicitudes

---

## 19. BÚSQUEDA GLOBAL

Accede con `Ctrl/Cmd + K` para encontrar rápidamente:
- Bookings
- Solicitudes
- Contactos
- Proyectos
- Releases

---

## 20. AJUSTES

### 20.1 Notificaciones
- Activar/desactivar notificaciones por email
- Activar/desactivar notificaciones push

### 20.2 Privacidad
- Perfil público sí/no
- Autenticación de dos factores

### 20.3 Apariencia
- Modo oscuro / claro

### 20.4 Idioma
- Configuración de idioma

---

## 21. ENLACES PÚBLICOS

La plataforma genera varios tipos de enlaces públicos para compartir con terceros:
- **EPK**: Dossier de prensa `/epk/slug`
- **Proyecto compartido**: `/shared/project/token`
- **Archivo compartido**: `/shared/token`
- **Firma de contrato**: `/sign/token`
- **Formulario de sincronización**: `/sync-request/token`
- **Formulario de artista**: `/artist-form/token`

---

## 22. RESUMEN DE ATAJOS

| Atajo | Acción |
|-------|--------|
| `Ctrl/Cmd + K` | Búsqueda global |
| `Ctrl/Cmd + N` | Nueva solicitud (en Action Center) |
| `Ctrl/Cmd + 1` | Vista lista |
| `Ctrl/Cmd + 2` | Vista Kanban |
| `Ctrl/Cmd + 3` | Vista estadísticas |
| `Ctrl/Cmd + E` | Exportar |

---

*MOODITA — Gestión Artística*
