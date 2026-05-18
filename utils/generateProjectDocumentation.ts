import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateProjectDocumentation = () => {
  const doc = new jsPDF();
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  const addTitle = (text: string, size: number = 20) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, yPos);
    yPos += size * 0.5 + 5;
  };

  const addSubtitle = (text: string) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, yPos);
    yPos += 10;
  };

  const addParagraph = (text: string) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, yPos);
    yPos += lines.length * 5 + 5;
  };

  const addBulletPoint = (text: string, indent: number = 0) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const bulletX = margin + indent;
    doc.text('•', bulletX, yPos);
    const lines = doc.splitTextToSize(text, contentWidth - indent - 5);
    doc.text(lines, bulletX + 5, yPos);
    yPos += lines.length * 5 + 2;
  };

  const addCodeBlock = (code: string) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.setFillColor(245, 245, 245);
    const lines = doc.splitTextToSize(code, contentWidth - 10);
    const blockHeight = lines.length * 4 + 6;
    doc.rect(margin, yPos - 3, contentWidth, blockHeight, 'F');
    doc.text(lines, margin + 5, yPos + 2);
    yPos += blockHeight + 5;
  };

  const addSpace = (space: number = 10) => {
    yPos += space;
  };

  // ============ PORTADA ============
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('CITYZEN', pageWidth / 2, 60, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Gestión Musical Integral', pageWidth / 2, 75, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('Documentación Técnica Completa', pageWidth / 2, 90, { align: 'center' });
  doc.text('para Replicación del Proyecto', pageWidth / 2, 100, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, 130, { align: 'center' });

  // ============ PÁGINA 2: ÍNDICE ============
  doc.addPage();
  yPos = 20;
  addTitle('ÍNDICE DE CONTENIDOS', 18);
  addSpace(10);
  
  const indexItems = [
    '1. Descripción General del Proyecto',
    '2. Stack Tecnológico',
    '3. Estructura del Proyecto',
    '4. Sistema de Autenticación y Autorización',
    '5. Esquema de Base de Datos',
    '6. Módulos Principales',
    '   6.1 Dashboard',
    '   6.2 Calendario',
    '   6.3 Bookings (Conciertos)',
    '   6.4 Contactos',
    '   6.5 Proyectos',
    '   6.6 Presupuestos',
    '   6.7 EPKs (Electronic Press Kits)',
    '   6.8 Solicitudes',
    '   6.9 Lanzamientos (Releases)',
    '   6.10 Royalties',
    '   6.11 Finanzas',
    '   6.12 Chat',
    '   6.13 Aprobaciones',
    '7. Componentes UI Reutilizables',
    '8. Hooks Personalizados',
    '9. Edge Functions',
    '10. Sistema de Permisos',
    '11. Configuración de Estilos',
    '12. Instrucciones de Replicación'
  ];
  
  indexItems.forEach(item => addBulletPoint(item));

  // ============ SECCIÓN 1: DESCRIPCIÓN GENERAL ============
  doc.addPage();
  yPos = 20;
  addTitle('1. DESCRIPCIÓN GENERAL DEL PROYECTO', 16);
  addSpace(5);
  
  addParagraph('CITYZEN es una plataforma integral de gestión para la industria musical, diseñada para managers, booking agents, artistas y equipos de producción. Permite gestionar todos los aspectos de la carrera de un artista: desde bookings de conciertos hasta lanzamientos de música, pasando por presupuestos, contactos y documentación.');
  
  addSubtitle('Propósito Principal');
  addBulletPoint('Centralizar la gestión de artistas y proyectos musicales');
  addBulletPoint('Automatizar flujos de trabajo de booking y contratación');
  addBulletPoint('Gestionar presupuestos y finanzas de eventos');
  addBulletPoint('Crear y compartir EPKs (Electronic Press Kits)');
  addBulletPoint('Coordinar equipos con sistema de roles y permisos');
  addBulletPoint('Trackear royalties y distribución de ganancias');

  addSubtitle('Usuarios Objetivo');
  addBulletPoint('Managers de artistas');
  addBulletPoint('Booking agents');
  addBulletPoint('Tour managers');
  addBulletPoint('Artistas');
  addBulletPoint('Productores');
  addBulletPoint('Equipos de producción de eventos');

  // ============ SECCIÓN 2: STACK TECNOLÓGICO ============
  doc.addPage();
  yPos = 20;
  addTitle('2. STACK TECNOLÓGICO', 16);
  addSpace(5);

  addSubtitle('Frontend');
  addBulletPoint('React 18.3.1 - Biblioteca principal de UI');
  addBulletPoint('TypeScript - Tipado estático');
  addBulletPoint('Vite - Build tool y dev server');
  addBulletPoint('React Router DOM 6.26.2 - Enrutamiento');
  addBulletPoint('TanStack React Query 5.56.2 - Estado del servidor y caché');
  addBulletPoint('React Hook Form 7.53.0 + Zod 3.23.8 - Formularios y validación');

  addSubtitle('Estilos y UI');
  addBulletPoint('Tailwind CSS - Framework de utilidades CSS');
  addBulletPoint('shadcn/ui - Componentes base (Radix UI)');
  addBulletPoint('Lucide React 0.462.0 - Iconos');
  addBulletPoint('Framer Motion (via tailwindcss-animate) - Animaciones');
  addBulletPoint('Recharts 2.15.4 - Gráficos y visualizaciones');

  addSubtitle('Backend (Supabase)');
  addBulletPoint('@supabase/supabase-js 2.53.0 - Cliente de Supabase');
  addBulletPoint('PostgreSQL - Base de datos');
  addBulletPoint('Row Level Security (RLS) - Seguridad a nivel de fila');
  addBulletPoint('Edge Functions (Deno) - Funciones serverless');
  addBulletPoint('Supabase Storage - Almacenamiento de archivos');
  addBulletPoint('Supabase Auth - Autenticación');

  addSubtitle('Librerías Especializadas');
  addBulletPoint('jsPDF + jspdf-autotable - Generación de PDFs');
  addBulletPoint('JSZip 3.10.1 - Compresión de archivos');
  addBulletPoint('date-fns 4.1.0 - Manipulación de fechas');
  addBulletPoint('@dnd-kit - Drag and drop');
  addBulletPoint('Mapbox GL 3.14.0 - Mapas interactivos');
  addBulletPoint('@xyflow/react 12.8.4 - Diagramas de flujo (Gantt)');
  addBulletPoint('react-signature-canvas - Firmas digitales');
  addBulletPoint('html2canvas - Capturas de pantalla');

  // ============ SECCIÓN 3: ESTRUCTURA DEL PROYECTO ============
  doc.addPage();
  yPos = 20;
  addTitle('3. ESTRUCTURA DEL PROYECTO', 16);
  addSpace(5);

  addCodeBlock(`src/
├── assets/              # Imágenes y recursos estáticos
├── components/          # Componentes React
│   ├── ui/             # Componentes base shadcn/ui
│   ├── booking-detail/ # Componentes de detalle de booking
│   ├── calendar/       # Componentes de calendario
│   ├── chat/           # Componentes de chat
│   ├── epk/            # Componentes de EPK
│   ├── finanzas/       # Componentes financieros
│   ├── lanzamientos/   # Componentes de lanzamientos
│   ├── releases/       # Componentes de releases
│   └── royalties/      # Componentes de royalties
├── hooks/              # Hooks personalizados
├── integrations/       # Integraciones (Supabase)
├── lib/                # Utilidades y helpers
├── pages/              # Páginas/rutas principales
│   └── release-sections/ # Secciones de release
└── utils/              # Funciones utilitarias`);

  addSubtitle('Archivos de Configuración Clave');
  addBulletPoint('tailwind.config.ts - Configuración de Tailwind con tokens de diseño');
  addBulletPoint('src/index.css - Variables CSS y tokens del sistema de diseño');
  addBulletPoint('permissions.yml - Definición de permisos del sistema');
  addBulletPoint('supabase/config.toml - Configuración de Supabase');

  // ============ SECCIÓN 4: AUTENTICACIÓN Y AUTORIZACIÓN ============
  doc.addPage();
  yPos = 20;
  addTitle('4. SISTEMA DE AUTENTICACIÓN Y AUTORIZACIÓN', 16);
  addSpace(5);

  addSubtitle('Autenticación (useAuth.tsx)');
  addParagraph('El sistema usa Supabase Auth con soporte para email/password. El hook useAuth proporciona:');
  addBulletPoint('user - Usuario autenticado actual');
  addBulletPoint('profile - Perfil del usuario con metadata');
  addBulletPoint('session - Sesión activa');
  addBulletPoint('loading - Estado de carga');
  addBulletPoint('signIn/signUp/signOut - Métodos de autenticación');

  addSubtitle('Sistema de Roles');
  addParagraph('Roles a nivel de Workspace:');
  addBulletPoint('OWNER - Propietario del workspace, acceso total');
  addBulletPoint('ADMIN - Administrador con casi todos los permisos');
  addBulletPoint('MANAGER - Gestor de proyectos y equipos');
  addBulletPoint('MEMBER - Miembro estándar');
  addBulletPoint('VIEWER - Solo lectura');

  addParagraph('Roles a nivel de Artista:');
  addBulletPoint('owner - Propietario/Manager del artista');
  addBulletPoint('booking - Agente de booking');
  addBulletPoint('tour_manager - Tour manager');
  addBulletPoint('production - Producción');
  addBulletPoint('viewer - Solo lectura');

  addSubtitle('Permisos (useAuthz.ts)');
  addParagraph('Sistema granular de permisos definido en permissions.yml. Permisos incluyen:');
  addBulletPoint('BOOKING_VIEW, BOOKING_EDIT, BOOKING_DELETE');
  addBulletPoint('CONTACT_VIEW, CONTACT_EDIT, CONTACT_DELETE');
  addBulletPoint('PROJECT_VIEW, PROJECT_EDIT, PROJECT_DELETE');
  addBulletPoint('BUDGET_VIEW, BUDGET_EDIT, BUDGET_DELETE');
  addBulletPoint('EPK_VIEW, EPK_EDIT, EPK_DELETE');
  addBulletPoint('TEAM_MANAGER - Gestión de equipo');
  addBulletPoint('WORKSPACE_SETTINGS - Configuración del workspace');

  // ============ SECCIÓN 5: ESQUEMA DE BASE DE DATOS ============
  doc.addPage();
  yPos = 20;
  addTitle('5. ESQUEMA DE BASE DE DATOS', 16);
  addSpace(5);

  addSubtitle('Tablas Principales');
  
  addParagraph('PROFILES - Perfiles de usuario');
  addCodeBlock(`id, user_id, full_name, email, avatar_url, role,
workspace_id, created_at, updated_at`);

  addParagraph('WORKSPACES - Espacios de trabajo');
  addCodeBlock(`id, name, slug, owner_id, settings, created_at`);

  addParagraph('WORKSPACE_MEMBERSHIPS - Membresías');
  addCodeBlock(`id, workspace_id, user_id, role, permissions[], 
invited_by, created_at`);

  addParagraph('ARTISTS - Artistas');
  addCodeBlock(`id, name, stage_name, description, profile_id, 
workspace_id, metadata, created_by, created_at`);

  addParagraph('PROJECTS - Proyectos');
  addCodeBlock(`id, name, type (tour|album|single|ep|promo|other),
artist_id, status, start_date, end_date, description,
parent_folder_id, metadata, created_by, created_at`);

  doc.addPage();
  yPos = 20;
  
  addParagraph('BOOKING_OFFERS - Ofertas de conciertos');
  addCodeBlock(`id, artist_id, project_id, event_id, fecha, hora,
ciudad, pais, venue, lugar, promotor, contacto,
fee, comision_porcentaje, comision_euros, estado,
formato, duracion, capacidad, pvp, condiciones,
es_cityzen, es_internacional, es_privado, anunciado,
gastos_estimados, estado_facturacion, phase,
tour_manager, tour_manager_new, notas, adjuntos,
created_by, created_at, updated_at`);

  addParagraph('BUDGETS - Presupuestos');
  addCodeBlock(`id, name, type (concierto|tour|produccion|marketing),
artist_id, project_id, city, country, venue, fee,
event_date, event_time, formato, capacidad,
budget_status, show_status, template_id,
parent_folder_id, created_by, created_at`);

  addParagraph('BUDGET_ITEMS - Líneas de presupuesto');
  addCodeBlock(`id, budget_id, name, category, category_id,
quantity, unit_price, iva_percentage, irpf_percentage,
billing_status, invoice_link, observations,
is_attendee, created_at`);

  addParagraph('CONTACTS - Contactos');
  addCodeBlock(`id, name, stage_name, legal_name, email, phone,
company, role, category, city, country, address,
bank_info, iban, notes, allergies, clothing_size,
shoe_size, special_needs, preferred_hours,
is_public, public_slug, shared_with_users[],
artist_id, created_by, created_at`);

  doc.addPage();
  yPos = 20;

  addParagraph('EVENTS - Eventos de calendario');
  addCodeBlock(`id, title, description, start_date, end_date,
all_day, color, event_type, location, artist_id,
project_id, booking_id, created_by, created_at`);

  addParagraph('EPKS - Electronic Press Kits');
  addCodeBlock(`id, titulo, slug, artista_proyecto, bio_corta,
tagline, imagen_portada, tema, visibilidad,
acceso_directo, password_hash, expira_el,
permitir_zip, rastrear_analiticas, vistas_totales,
vistas_unicas, descargas_totales, ultima_vista_en,
booking, management, tour_manager, tour_production,
coordinadora_booking, proyecto_id, presupuesto_id,
creado_por, creado_en, actualizado_en`);

  addParagraph('EPK_FOTOS, EPK_VIDEOS, EPK_AUDIOS, EPK_DOCUMENTOS');
  addCodeBlock(`Tablas relacionadas para contenido multimedia de EPKs`);

  addParagraph('SOLICITUDES - Solicitudes/Peticiones');
  addCodeBlock(`id, type, status, applicant_name, applicant_email,
event_name, event_date, description, priority,
assigned_to, resolution_notes, artist_id, project_id,
created_by, created_at, resolved_at`);

  addParagraph('RELEASES - Lanzamientos musicales');
  addCodeBlock(`id, title, type (single|ep|album), artist_id,
release_date, status, cover_art_url, spotify_url,
apple_music_url, description, project_id,
created_by, created_at`);

  addParagraph('SONGS - Canciones');
  addCodeBlock(`id, title, duration, isrc, release_id, artist_id,
created_by, created_at`);

  addParagraph('SONG_SPLITS - División de royalties');
  addCodeBlock(`id, song_id, contact_id, role, percentage,
created_at`);

  addParagraph('PLATFORM_EARNINGS - Ganancias por plataforma');
  addCodeBlock(`id, song_id, platform, period, streams, earnings,
currency, created_at`);

  // ============ SECCIÓN 6: MÓDULOS PRINCIPALES ============
  doc.addPage();
  yPos = 20;
  addTitle('6. MÓDULOS PRINCIPALES', 16);
  addSpace(5);

  addSubtitle('6.1 Dashboard (src/pages/Dashboard.tsx)');
  addParagraph('Panel principal con vista general del estado de la aplicación. Incluye:');
  addBulletPoint('ComprehensiveDashboard - Dashboard completo con métricas');
  addBulletPoint('ManagementDashboard - Vista de gestión');
  addBulletPoint('ArtistDashboard - Dashboard específico para artistas');
  addBulletPoint('Widgets de próximos eventos, tareas pendientes, alertas');
  addBulletPoint('Gráficos de analytics con Recharts');

  addSubtitle('6.2 Calendario (src/pages/Calendar.tsx)');
  addParagraph('Calendario completo con múltiples vistas:');
  addBulletPoint('Vista mensual, semanal, diaria');
  addBulletPoint('YearlyCalendar - Vista anual compacta');
  addBulletPoint('Filtros por artista, tipo de evento, estado');
  addBulletPoint('Drag & drop para mover eventos');
  addBulletPoint('Sincronización con Google Calendar (opcional)');
  addBulletPoint('Exportación a PDF, CSV, iCal');
  addBulletPoint('CreateEventDialog - Crear eventos');
  addBulletPoint('EditEventDialog - Editar eventos');

  addSubtitle('6.3 Bookings (src/pages/Booking.tsx)');
  addParagraph('Gestión completa de conciertos y shows:');
  addBulletPoint('Vista Kanban por fase (lead, negociación, confirmado, etc.)');
  addBulletPoint('Vista tabla con ordenación y filtros');
  addBulletPoint('CreateBookingDialog / CreateBookingWizard - Wizard de creación');
  addBulletPoint('BookingDetail - Página de detalle con tabs');
  addBulletPoint('Gestión de gastos, itinerario, documentos');
  addBulletPoint('Generación de contratos con firma digital');
  addBulletPoint('Generación de facturas PDF');
  addBulletPoint('Cálculo automático de comisiones');

  doc.addPage();
  yPos = 20;

  addSubtitle('6.4 Contactos (src/pages/Contacts.tsx)');
  addParagraph('CRM completo para la industria musical:');
  addBulletPoint('RolodexView - Vista de tarjetas tipo rolodex');
  addBulletPoint('Vista tabla con búsqueda y filtros');
  addBulletPoint('Categorías: promotor, venue, artista, prensa, etc.');
  addBulletPoint('Grupos de contactos personalizables');
  addBulletPoint('Campos personalizados por contacto');
  addBulletPoint('Compartir contactos entre usuarios');
  addBulletPoint('Exportación de vCard');
  addBulletPoint('Importación masiva');

  addSubtitle('6.5 Proyectos (src/pages/Projects.tsx)');
  addParagraph('Organización jerárquica de proyectos:');
  addBulletPoint('Tipos: tour, album, single, ep, promo, other');
  addBulletPoint('Estructura de carpetas anidadas');
  addBulletPoint('ProjectDetail - Detalle con archivos, tareas, presupuestos');
  addBulletPoint('ProjectChecklistManager - Checklists con plantillas');
  addBulletPoint('ProjectFilesManager - Gestión de archivos');
  addBulletPoint('Asociación con bookings y presupuestos');
  addBulletPoint('Compartir proyectos con enlaces públicos');

  addSubtitle('6.6 Presupuestos (src/pages/Budgets.tsx)');
  addParagraph('Sistema completo de presupuestación:');
  addBulletPoint('Tipos: concierto, tour, producción, marketing');
  addBulletPoint('Plantillas reutilizables');
  addBulletPoint('Categorías personalizables');
  addBulletPoint('Cálculo automático de IVA e IRPF');
  addBulletPoint('Estados de facturación por línea');
  addBulletPoint('EnhancedBudgetItemsView - Vista avanzada de items');
  addBulletPoint('Exportación a PDF y Excel');
  addBulletPoint('Adjuntos y documentación');

  doc.addPage();
  yPos = 20;

  addSubtitle('6.7 EPKs (src/pages/EPKs.tsx, EPKBuilder.tsx)');
  addParagraph('Creador de Electronic Press Kits:');
  addBulletPoint('EPKForm - Formulario completo de creación');
  addBulletPoint('EPKPreview - Vista previa en tiempo real');
  addBulletPoint('Secciones: bio, fotos, videos, audios, documentos, tour');
  addBulletPoint('Temas visuales personalizables');
  addBulletPoint('Protección con contraseña');
  addBulletPoint('Fecha de expiración');
  addBulletPoint('Analytics de visitas y descargas');
  addBulletPoint('Descarga ZIP de todos los archivos');
  addBulletPoint('URL pública compartible (PublicEPK.tsx)');
  addBulletPoint('MediaLibrary - Biblioteca de medios reutilizable');

  addSubtitle('6.8 Solicitudes (src/pages/Solicitudes.tsx)');
  addParagraph('Sistema de gestión de peticiones:');
  addBulletPoint('Vista Kanban por estado');
  addBulletPoint('Vista tabla con filtros');
  addBulletPoint('Tipos: booking request, press inquiry, collaboration, etc.');
  addBulletPoint('Prioridades y asignación');
  addBulletPoint('Historial de cambios');
  addBulletPoint('Plantillas de respuesta');
  addBulletPoint('Exportación a Excel/PDF');
  addBulletPoint('Acciones en lote');

  addSubtitle('6.9 Lanzamientos (src/pages/Releases.tsx)');
  addParagraph('Gestión de releases musicales:');
  addBulletPoint('ReleaseDetail con secciones organizadas');
  addBulletPoint('Cronograma con diagrama Gantt');
  addBulletPoint('Gestión de audio y assets');
  addBulletPoint('Imagen y video promocional');
  addBulletPoint('Créditos y colaboradores');
  addBulletPoint('Presupuestos asociados');
  addBulletPoint('EPF (Electronic Press Files)');

  doc.addPage();
  yPos = 20;

  addSubtitle('6.10 Royalties (src/pages/Royalties.tsx)');
  addParagraph('Tracking de royalties y ganancias:');
  addBulletPoint('Gestión de canciones y splits');
  addBulletPoint('SongSplitsManager - División de porcentajes');
  addBulletPoint('PlatformEarningsManager - Ganancias por plataforma');
  addBulletPoint('ImportEarningsDialog - Importación de reportes');
  addBulletPoint('EarningsTrends - Gráficos de tendencias');
  addBulletPoint('PaymentTracker - Seguimiento de pagos');
  addBulletPoint('Exportación de reportes');

  addSubtitle('6.11 Finanzas (src/pages/Finanzas.tsx)');
  addParagraph('Módulo financiero integral:');
  addBulletPoint('FinanzasOverview - Resumen financiero');
  addBulletPoint('FinanzasPresupuestos - Vista de presupuestos');
  addBulletPoint('LiquidacionCalculator - Cálculo de liquidaciones');
  addBulletPoint('Integración con presupuestos y bookings');
  addBulletPoint('Reportes y exportaciones');

  addSubtitle('6.12 Chat (src/pages/Chat.tsx)');
  addParagraph('Sistema de mensajería interna:');
  addBulletPoint('ChannelList - Lista de canales');
  addBulletPoint('ChannelChatView - Vista de conversación');
  addBulletPoint('Canales por proyecto');
  addBulletPoint('Mensajes directos');
  addBulletPoint('Adjuntos de archivos');
  addBulletPoint('Indicadores de lectura');
  addBulletPoint('Realtime con Supabase subscriptions');

  addSubtitle('6.13 Aprobaciones (src/pages/Approvals.tsx)');
  addParagraph('Flujo de aprobaciones:');
  addBulletPoint('Tipos: gasto, contrato, presupuesto, contenido');
  addBulletPoint('Estados: pending, approved, rejected, revision');
  addBulletPoint('Comentarios y historial');
  addBulletPoint('Asignación a responsables');
  addBulletPoint('Notificaciones');

  // ============ SECCIÓN 7: COMPONENTES UI ============
  doc.addPage();
  yPos = 20;
  addTitle('7. COMPONENTES UI REUTILIZABLES', 16);
  addSpace(5);

  addSubtitle('Componentes shadcn/ui Base (src/components/ui/)');
  addBulletPoint('Button, Input, Textarea, Select, Checkbox, Switch, Slider');
  addBulletPoint('Dialog, Sheet, Drawer, Popover, Tooltip, HoverCard');
  addBulletPoint('Card, Badge, Avatar, Progress');
  addBulletPoint('Table, Tabs, Accordion, Collapsible');
  addBulletPoint('Command (cmdk), Calendar (react-day-picker)');
  addBulletPoint('Toast (sonner), Alert, AlertDialog');
  addBulletPoint('Form (react-hook-form integration)');
  addBulletPoint('Sidebar, Breadcrumb, NavigationMenu');
  addBulletPoint('DropdownMenu, ContextMenu, Menubar');
  addBulletPoint('ScrollArea, Separator, AspectRatio');
  addBulletPoint('Skeleton, CardSkeleton, TableSkeleton');

  addSubtitle('Componentes Personalizados Destacados');
  addBulletPoint('AppSidebar - Sidebar principal de navegación');
  addBulletPoint('DashboardLayout - Layout con sidebar y header');
  addBulletPoint('ProtectedRoute - Ruta protegida con auth');
  addBulletPoint('PermissionBoundary - Wrapper de permisos');
  addBulletPoint('ArtistSelector / SingleArtistSelector - Selectores de artista');
  addBulletPoint('ContactSelector - Selector de contactos');
  addBulletPoint('ProjectSelector - Selector de proyectos');
  addBulletPoint('BookingStatusCombobox - Combobox de estados');
  addBulletPoint('GlobalSearchDialog - Búsqueda global (Cmd+K)');
  addBulletPoint('NotificationBell - Campana de notificaciones');
  addBulletPoint('DevRoleSwitcher - Cambio de rol (desarrollo)');
  addBulletPoint('InlineEdit - Edición inline');
  addBulletPoint('CopyButton - Botón de copiar');
  addBulletPoint('EmptyState - Estado vacío');
  addBulletPoint('ConfirmationDialog - Diálogo de confirmación');
  addBulletPoint('LazyImage, LazyVideo - Carga lazy de media');

  // ============ SECCIÓN 8: HOOKS ============
  doc.addPage();
  yPos = 20;
  addTitle('8. HOOKS PERSONALIZADOS', 16);
  addSpace(5);

  addSubtitle('Hooks de Autenticación y Autorización');
  addBulletPoint('useAuth - Autenticación y perfil de usuario');
  addBulletPoint('useAuthz - Permisos y autorización');

  addSubtitle('Hooks de Datos');
  addBulletPoint('useCommon - Queries comunes (artistas, proyectos, etc.)');
  addBulletPoint('useBookingFolders - Gestión de carpetas de bookings');
  addBulletPoint('useBookingReminders - Recordatorios de bookings');
  addBulletPoint('useBookingCalendarSync - Sincronización con calendario');
  addBulletPoint('useChatChannels - Canales de chat');
  addBulletPoint('useEPK - Datos de EPK');
  addBulletPoint('useEPKStatus - Estado de EPK');
  addBulletPoint('useMediaLibrary - Biblioteca de medios');
  addBulletPoint('useNotifications - Sistema de notificaciones');
  addBulletPoint('useProjectFiles - Archivos de proyecto');
  addBulletPoint('useReleases - Lanzamientos');
  addBulletPoint('useRoyalties - Royalties y ganancias');

  addSubtitle('Hooks de UI y UX');
  addBulletPoint('useTheme - Tema claro/oscuro');
  addBulletPoint('useMobile - Detección de móvil');
  addBulletPoint('useToast - Sistema de toasts');
  addBulletPoint('useConfetti - Efectos de confetti');
  addBulletPoint('useGameSound - Sonidos de juego');
  addBulletPoint('useDraggable - Drag and drop');
  addBulletPoint('useKeyboardShortcuts - Atajos de teclado');
  addBulletPoint('useSolicitudesKeyboard - Atajos específicos');

  addSubtitle('Hooks de Integraciones');
  addBulletPoint('useGoogleCalendar - Integración Google Calendar');
  addBulletPoint('useI18n - Internacionalización');
  addBulletPoint('useAnalytics - Analytics');

  // ============ SECCIÓN 9: EDGE FUNCTIONS ============
  doc.addPage();
  yPos = 20;
  addTitle('9. EDGE FUNCTIONS (Supabase)', 16);
  addSpace(5);

  addSubtitle('Funciones Disponibles');
  
  addParagraph('approvals-api');
  addBulletPoint('Gestión de aprobaciones');
  addBulletPoint('Endpoints: GET, POST, PUT para approvals');

  addParagraph('google-calendar-api');
  addBulletPoint('Sincronización con Google Calendar');
  addBulletPoint('CRUD de eventos en calendario externo');

  addParagraph('google-calendar-oauth');
  addBulletPoint('Flujo OAuth para Google Calendar');
  addBulletPoint('Manejo de tokens de acceso');

  addParagraph('import-csv-events');
  addBulletPoint('Importación masiva de eventos desde CSV');

  addParagraph('reindex-event');
  addBulletPoint('Reindexación de eventos para búsqueda');

  addParagraph('search-event-ai');
  addBulletPoint('Búsqueda con AI de eventos');

  addParagraph('seed-contacts / seed-events');
  addBulletPoint('Funciones de seed para desarrollo');

  addParagraph('setup-test-users');
  addBulletPoint('Configuración de usuarios de prueba');

  addSubtitle('Configuración CORS');
  addCodeBlock(`// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 
    'authorization, x-client-info, apikey, content-type',
}`);

  // ============ SECCIÓN 10: SISTEMA DE PERMISOS ============
  doc.addPage();
  yPos = 20;
  addTitle('10. SISTEMA DE PERMISOS', 16);
  addSpace(5);

  addSubtitle('Archivo permissions.yml');
  addParagraph('Define la estructura jerárquica de permisos:');
  
  addCodeBlock(`roles:
  OWNER:
    inherits: []
    permissions: [ALL]
  ADMIN:
    inherits: [MANAGER]
    permissions: [WORKSPACE_SETTINGS, TEAM_MANAGER]
  MANAGER:
    inherits: [MEMBER]
    permissions: [PROJECT_DELETE, BUDGET_DELETE, ...]
  MEMBER:
    inherits: [VIEWER]
    permissions: [BOOKING_EDIT, CONTACT_EDIT, ...]
  VIEWER:
    inherits: []
    permissions: [BOOKING_VIEW, CONTACT_VIEW, ...]`);

  addSubtitle('Implementación (src/lib/authz/)');
  addBulletPoint('index.ts - Funciones principales de autorización');
  addBulletPoint('helpers.ts - Helpers para verificar permisos');
  addBulletPoint('authz.test.ts - Tests del sistema');

  addSubtitle('Uso en Componentes');
  addCodeBlock(`// PermissionBoundary - Wrapper de permisos
<PermissionBoundary permission="BOOKING_EDIT">
  <EditButton />
</PermissionBoundary>

// useAuthz hook
const { can, hasPermission } = useAuthz();
if (can('BOOKING_DELETE')) {
  // mostrar botón de eliminar
}`);

  // ============ SECCIÓN 11: CONFIGURACIÓN DE ESTILOS ============
  doc.addPage();
  yPos = 20;
  addTitle('11. CONFIGURACIÓN DE ESTILOS', 16);
  addSpace(5);

  addSubtitle('Tokens CSS (src/index.css)');
  addCodeBlock(`:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
  --sidebar-*: tokens específicos del sidebar
}`);

  addSubtitle('Tailwind Config (tailwind.config.ts)');
  addParagraph('Extensiones de tema que mapean a los tokens CSS:');
  addCodeBlock(`theme: {
  extend: {
    colors: {
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))'
      },
      // ... más colores semánticos
    },
    borderRadius: {
      lg: 'var(--radius)',
      md: 'calc(var(--radius) - 2px)',
      sm: 'calc(var(--radius) - 4px)'
    },
    keyframes: { /* animaciones */ },
    animation: { /* clases de animación */ }
  }
}`);

  // ============ SECCIÓN 12: INSTRUCCIONES DE REPLICACIÓN ============
  doc.addPage();
  yPos = 20;
  addTitle('12. INSTRUCCIONES DE REPLICACIÓN', 16);
  addSpace(5);

  addSubtitle('Paso 1: Crear Proyecto Base');
  addBulletPoint('Crear nuevo proyecto en Lovable');
  addBulletPoint('Conectar Supabase (o usar Lovable Cloud)');
  addBulletPoint('Configurar autenticación por email');

  addSubtitle('Paso 2: Crear Esquema de Base de Datos');
  addParagraph('Ejecutar migraciones en orden para crear:');
  addBulletPoint('Tablas principales (profiles, workspaces, artists, etc.)');
  addBulletPoint('Tablas de bookings y presupuestos');
  addBulletPoint('Tablas de EPKs y releases');
  addBulletPoint('Tablas de chat y notificaciones');
  addBulletPoint('Políticas RLS para cada tabla');
  addBulletPoint('Funciones y triggers');

  addSubtitle('Paso 3: Configurar Estructura de Archivos');
  addBulletPoint('Crear carpetas: components, hooks, pages, utils, lib');
  addBulletPoint('Configurar tailwind.config.ts con tokens');
  addBulletPoint('Configurar index.css con variables CSS');

  addSubtitle('Paso 4: Implementar Módulos');
  addParagraph('Orden recomendado:');
  addBulletPoint('1. Sistema de autenticación (useAuth)');
  addBulletPoint('2. Componentes UI base (shadcn)');
  addBulletPoint('3. Layout principal (Sidebar, Dashboard)');
  addBulletPoint('4. Sistema de permisos (useAuthz)');
  addBulletPoint('5. Módulos uno por uno empezando por Contactos');

  addSubtitle('Paso 5: Agregar Funcionalidades Avanzadas');
  addBulletPoint('Generación de PDFs');
  addBulletPoint('Firma digital de contratos');
  addBulletPoint('Sincronización con Google Calendar');
  addBulletPoint('Sistema de notificaciones realtime');
  addBulletPoint('Exportación de datos');

  doc.addPage();
  yPos = 20;
  
  addSubtitle('Consideraciones Importantes');
  addBulletPoint('Mantener consistencia en naming: español para campos de negocio');
  addBulletPoint('Usar siempre tokens semánticos de color, nunca colores directos');
  addBulletPoint('Implementar RLS desde el principio en cada tabla');
  addBulletPoint('Crear componentes pequeños y reutilizables');
  addBulletPoint('Usar React Query para todo el estado del servidor');
  addBulletPoint('Implementar feedback visual (toasts, loading states)');
  addBulletPoint('Hacer todo responsive desde el inicio');

  addSubtitle('Dependencias Críticas');
  addCodeBlock(`npm install @supabase/supabase-js @tanstack/react-query
npm install react-router-dom react-hook-form zod
npm install @hookform/resolvers
npm install date-fns lucide-react
npm install jspdf jspdf-autotable jszip
npm install recharts @dnd-kit/core @dnd-kit/sortable
npm install sonner vaul cmdk
npm install tailwind-merge class-variance-authority clsx`);

  // Pie de página final
  doc.addPage();
  yPos = 100;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FIN DEL DOCUMENTO', pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Este documento contiene toda la información necesaria', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  doc.text('para replicar la aplicación CITYZEN con la mayor precisión posible.', pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;
  doc.text(`Generado automáticamente el ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, yPos, { align: 'center' });

  // Guardar PDF
  doc.save('CITYZEN_Documentacion_Tecnica_Completa.pdf');
};
