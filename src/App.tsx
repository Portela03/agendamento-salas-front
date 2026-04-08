import { Navigate, Route, Routes } from 'react-router-dom';
import { PrivateRoute } from './components/PrivateRoute';
import { LoginPage } from './pages/LoginPage';
import { CoordinatorDashboard } from './pages/CoordinatorDashboard';
import { ProfessorDashboard } from './pages/ProfessorDashboard';

export function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected: Coordenador only */}
      <Route element={<PrivateRoute allowedRoles={['COORDENADOR']} />}>
        <Route path="/coordenador/dashboard" element={<CoordinatorDashboard />} />
      </Route>

      {/* Protected: Professor only */}
      <Route element={<PrivateRoute allowedRoles={['PROFESSOR']} />}>
        <Route path="/professor/dashboard" element={<ProfessorDashboard />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
