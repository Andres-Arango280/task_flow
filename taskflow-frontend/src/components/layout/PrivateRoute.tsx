import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAtajos } from '../../hooks/useAtajos';
import { Navbar } from './Navbar';
import { BannerConexion } from './BannerConexion';
import { PanelAtajos } from './PanelAtajos';

interface PrivateRouteProps {
  children: ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [atajosAbiertos, setAtajosAbiertos] = useState(false);

  useAtajos({
    '?': () => setAtajosAbiertos(true),
    i: () => navigate('/'),
    h: () => navigate('/ayuda'),
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-white px-4 py-2 rounded-lg shadow font-semibold"
      >
        Saltar al contenido
      </a>
      <BannerConexion />
      <Navbar alAbrirAtajos={() => setAtajosAbiertos(true)} />
      <main id="contenido" className="py-6">
        {children}
      </main>
      <PanelAtajos abierto={atajosAbiertos} alCerrar={() => setAtajosAbiertos(false)} />
    </div>
  );
};
