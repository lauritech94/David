import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute, ForbiddenPage } from "@/components/ProtectedRoute";
import { HubGate } from "@/components/permissions/HubGate";

import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Budgets from "./pages/Budgets";
import Booking from "./pages/Booking";
import Sincronizaciones from "./pages/Sincronizaciones";
import BookingDetail from "./pages/BookingDetail";
import Royalties from "./pages/Royalties";

import FinanzasHub from "./pages/FinanzasHub";
import Analytics from "./pages/Analytics";
import Documents from "./pages/Documents";
import Chat from "./pages/Chat";
import Solicitudes from "./pages/Solicitudes";
import Contacts from "./pages/Contacts";
import Agenda from "./pages/Agenda";
import Teams from "./pages/Teams";
import TeamRoles from "./pages/TeamRoles";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";
import Projects from "./pages/Projects";
import Proyectos from "./pages/Proyectos";
import Carpetas from "./pages/Carpetas";
import Drive from "./pages/Drive";
import ProjectDetail from "./pages/ProjectDetail";
import Approvals from "./pages/Approvals";
import ApprovalDetail from "./pages/ApprovalDetail";
import EPKBuilder from "./pages/EPKBuilder";
import EPKs from "./pages/EPKs";
import { PublicEPKPage } from "./pages/PublicEPK";
import { EPKPasswordProtectionPage } from "./pages/EPKPasswordProtection";
import GoogleCalendarCallback from "./pages/GoogleCalendarCallback";
import SharedProject from "./pages/SharedProject";
import SignContractMulti from "./pages/SignContractMulti";
import SharedFile from "./pages/SharedFile";
import SharedRelease from "./pages/SharedRelease";
import ContractDraftView from "./pages/ContractDraftView";
import PublicSyncRequestForm from "./pages/PublicSyncRequestForm";
import PublicArtistForm from "./pages/PublicArtistForm";
import PublicReleaseForm from "./pages/PublicReleaseForm";
import PublicContactForm from "./pages/PublicContactForm";

import Releases from "./pages/Releases";
import ReleaseDetail from "./pages/ReleaseDetail";
import ReleaseCronograma from "./pages/release-sections/ReleaseCronograma";
import ReleasePresupuestos from "./pages/release-sections/ReleasePresupuestos";
import ReleaseImagenVideo from "./pages/release-sections/ReleaseImagenVideo";
import ReleaseCreditos from "./pages/release-sections/ReleaseCreditos";
import ReleaseAudio from "./pages/release-sections/ReleaseAudio";
import ReleaseEPF from "./pages/release-sections/ReleaseEPF";
import ReleasePitch from "./pages/release-sections/ReleasePitch";
import ReleaseContratos from "./pages/release-sections/ReleaseContratos";

// Roadmaps pages
import Roadmaps from "./pages/Roadmaps";
import RoadmapDetail from "./pages/RoadmapDetail";

// Management pages
import MyManagement from "./pages/MyManagement";
import ArtistProfile from "./pages/ArtistProfile";
import Correo from "./pages/Correo";
import Automatizaciones from "./pages/Automatizaciones";
import Modelo111 from "./pages/Modelo111";
const queryClient = new QueryClient();

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? "/dashboard" : "/auth"} replace />;
}

function AuthRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <HelmetProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/auth" element={<AuthRedirect />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/403" element={<ForbiddenPage />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/calendar" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Calendar />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/budgets" element={<Navigate to="/finanzas/pagos" replace />} />
              <Route path="/budgets/:id" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Budgets />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/booking" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="bookings" required="view">
                      <Booking />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/booking/:id" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <BookingDetail />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/sincronizaciones" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="solicitudes" required="view">
                      <Sincronizaciones />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/royalties" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Royalties />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/finanzas" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="budgets" required="view">
                      <FinanzasHub />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/finanzas/cobros" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="cashflow" required="view">
                      <FinanzasHub />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/finanzas/pagos" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="cashflow" required="view">
                      <FinanzasHub />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/finanzas/presupuestos" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="budgets" required="view">
                      <FinanzasHub />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/finanzas/liquidaciones" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="cashflow" required="view">
                      <FinanzasHub />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/finanzas/fiscal" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="cashflow" required="view">
                      <FinanzasHub />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="analytics" required="view">
                      <Analytics />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/modelo-111" element={<Navigate to="/finanzas/fiscal" replace />} />
              <Route path="/documents" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="contracts" required="view">
                      <Documents />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/correo" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Correo />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/chat" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Chat />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/solicitudes" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Solicitudes />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/contacts" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Contacts />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/agenda" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="bookings" required="view">
                      <Agenda />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/teams" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Teams />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/teams/roles" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <TeamRoles />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/mi-management" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <MyManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/artistas/:id" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ArtistProfile />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/proyectos" element={
                <ProtectedRoute>
                  <HubGate module="projects" required="view">
                    <Proyectos />
                  </HubGate>
                </ProtectedRoute>
              } />
              <Route path="/projects" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="projects" required="view">
                      <Projects />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/carpetas" element={
                <ProtectedRoute>
                  <Carpetas />
                </ProtectedRoute>
              } />
              <Route path="/drive" element={
                <ProtectedRoute>
                  <HubGate module="drive" required="view">
                    <Drive />
                  </HubGate>
                </ProtectedRoute>
              } />
              <Route path="/projects/:id" element={
                <ProtectedRoute projectId={window.location.pathname.split('/')[2]}>
                  <DashboardLayout>
                    <ProjectDetail />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/projects/:id/approvals" element={
                <ProtectedRoute projectId={window.location.pathname.split('/')[2]}>
                  <DashboardLayout>
                    <Approvals />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/approvals/:id" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ApprovalDetail />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/epks" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <EPKs />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/epk-builder" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <EPKBuilder />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/epk-builder/:id" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <EPKBuilder />
                  </DashboardLayout>
              </ProtectedRoute>
              } />
              {/* Redirect old /lanzamientos to /releases */}
              <Route path="/lanzamientos" element={<Navigate to="/releases" replace />} />
              {/* Releases (Discography) */}
              <Route path="/releases" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="releases" required="view">
                      <Releases />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/releases/:id" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="releases" required="view">
                      <ReleaseDetail />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/releases/:id/cronograma" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="releases" required="view">
                      <ReleaseCronograma />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/releases/:id/presupuestos" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="releases" required="view">
                      <ReleasePresupuestos />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/releases/:id/imagen-video" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="releases" required="view">
                      <ReleaseImagenVideo />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/releases/:id/creditos" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="releases" required="view">
                      <ReleaseCreditos />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/releases/:id/audio" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="releases" required="view">
                      <ReleaseAudio />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/releases/:id/epf" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="releases" required="view">
                      <ReleaseEPF />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/releases/:id/pitch" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="releases" required="view">
                      <ReleasePitch />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/releases/:id/contratos" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="releases" required="view">
                      <ReleaseContratos />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              {/* Roadmaps Routes */}
              <Route path="/roadmaps" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="roadmaps" required="view">
                      <Roadmaps />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/roadmaps/:id" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="roadmaps" required="view">
                      <RoadmapDetail />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/automatizaciones" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <HubGate module="automations" required="view">
                      <Automatizaciones />
                    </HubGate>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              {/* Public EPK Routes */}
              <Route path="/epk/:slug" element={<PublicEPKPage />} />
              <Route path="/epk/:slug/password" element={<EPKPasswordProtectionPage />} />
              {/* Public Shared Project Route */}
              <Route path="/shared/project/:token" element={<SharedProject />} />
              {/* Public Shared Release Playback */}
              <Route path="/shared/release/:token" element={<SharedRelease />} />
              {/* Public Shared File Route */}
              <Route path="/shared/:token" element={<SharedFile />} />
              {/* Public Contract Draft Negotiation */}
              <Route path="/contract-draft/:token" element={<ContractDraftView />} />
              {/* Public Contract Signature Route */}
              <Route path="/sign/:token" element={<SignContractMulti />} />
              {/* Public Sync Request Form */}
              <Route path="/sync-request/:token" element={<PublicSyncRequestForm />} />
              {/* Public Artist Form */}
              <Route path="/artist-form/:token" element={<PublicArtistForm />} />
              {/* Public Release Pitch Form */}
              <Route path="/release-form/:token" element={<PublicReleaseForm />} />
              {/* Public Contact Form */}
              <Route path="/contact-form/:token" element={<PublicContactForm />} />
              {/* Google Calendar OAuth Callback */}
              <Route path="/calendar/callback" element={<GoogleCalendarCallback />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </HelmetProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
