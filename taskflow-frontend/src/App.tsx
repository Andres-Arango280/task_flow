import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { PrivateRoute } from './components/layout/PrivateRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { TeamView } from './pages/TeamView';
import { KanbanBoard } from './pages/KanbanBoard';
import { Ayuda } from './pages/Ayuda';
import { Preferencias } from './pages/Preferencias';
import { Privacidad } from './pages/Privacidad';

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/equipos/:id"
          element={
            <PrivateRoute>
              <TeamView />
            </PrivateRoute>
          }
        />
        <Route
          path="/proyectos/:id"
          element={
            <PrivateRoute>
              <KanbanBoard />
            </PrivateRoute>
          }
        />
        <Route
          path="/ayuda"
          element={
            <PrivateRoute>
              <Ayuda />
            </PrivateRoute>
          }
        />
        <Route
          path="/preferencias"
          element={
            <PrivateRoute>
              <Preferencias />
            </PrivateRoute>
          }
        />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;