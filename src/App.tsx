import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PrivateRoute } from './components/PrivateRoute';
import { LoginPage } from './pages/LoginPage';
import { CoordinatorDashboard } from './pages/CoordinatorDashboard';
import { HistoricoReservasPage } from './pages/HistoricoReservasPage';
import { ProfessorDashboard } from './pages/ProfessorDashboard';
import { SolicitarReservaPage } from './pages/SolicitarReservaPage';
import { api } from './services/api';
import ClassManagementPage from './pages/ClassManagementPage';

export function App() {
  useEffect(() => {
    const wakeupKey = '@agendamento:backend:wakeup-sent';
    if (sessionStorage.getItem(wakeupKey)) return;

    sessionStorage.setItem(wakeupKey, '1');
    void api.get('/health').catch(() => {
      // The wake-up ping is best-effort and should not impact UX if it fails.
    });
  }, []);

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected: Coordenador only */}
      <Route element={<PrivateRoute allowedRoles={['COORDENADOR']} />}>
        <Route path="/coordenador/dashboard" element={<CoordinatorDashboard />} />
        <Route path="/coordenador/salas" element={<ClassManagementPage />} />
      </Route>

      {/* Protected: Professor only */}
      <Route element={<PrivateRoute allowedRoles={['PROFESSOR']} />}>
        <Route path="/professor/dashboard" element={<ProfessorDashboard />} />
        <Route path="/professor/reservas" element={<SolicitarReservaPage />} />
        <Route path="/professor/historicoreservas" element={<HistoricoReservasPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
