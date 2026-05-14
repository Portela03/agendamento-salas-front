import { Navigate, Route, Routes } from 'react-router-dom';
import { PrivateRoute } from './components/PrivateRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { CoordinatorDashboard } from './pages/CoordinatorDashboard';
import { HistoricoReservasPage } from './pages/HistoricoReservasPage';
import { SolicitarReservaPage } from './pages/SolicitarReservaPage';
import { CalendarioPage } from './pages/CalendarioPage';
import ClassManagementPage from './pages/ClassManagementPage';
import { GestaoPerfilPage } from './pages/GestaoPerfilPage';
import { ControlePeriodosPage } from './pages/ControlePeriodosPage';
import { useKeepAlive } from './hooks/useKeepAlive';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { FontSizeControls } from './components/accessibility/FontSizeControls';

export function App() {
  // Pings /api/health every 10 min so the Render free-tier backend never sleeps.
  useKeepAlive();

  return (
    <>
      <FontSizeControls />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/resetar-senha" element={<ResetPasswordPage />} />


        {/* Protected: Coordenador only */}
        <Route element={<PrivateRoute allowedRoles={['COORDENADOR']} />}>
          <Route element={<AppLayout />}>
            <Route path="/coordenador/dashboard" element={<CoordinatorDashboard />} />
            <Route path="/coordenador/salas" element={<ClassManagementPage />} />
            <Route path="/coordenador/usuarios" element={<GestaoPerfilPage />} />
            <Route path="/coordenador/calendario" element={<CalendarioPage />} />
            <Route path="/coordenador/periodos" element={<ControlePeriodosPage />} />
          </Route>
        </Route>

        {/* Protected: Professor only */}
        <Route element={<PrivateRoute allowedRoles={['PROFESSOR']} />}>
          <Route element={<AppLayout />}>
            <Route path="/professor/dashboard" element={<Navigate to="/professor/reservas" replace />} />
            <Route path="/professor/reservas" element={<SolicitarReservaPage />} />
            <Route path="/professor/historicoreservas" element={<HistoricoReservasPage />} />
            <Route path="/professor/calendario" element={<CalendarioPage />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
