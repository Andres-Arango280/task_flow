import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useConfirmacion } from '../ui/Confirmacion';
import { LogOut, KanbanSquare, HelpCircle, Settings, Keyboard, Home } from 'lucide-react';

const claseEnlace = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
    isActive ? 'bg-primary-50 text-primary-800' : 'text-gray-800 hover:bg-gray-100'
  }`;

export const Navbar = ({ alAbrirAtajos }: { alAbrirAtajos: () => void }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const confirmar = useConfirmacion();

  const handleLogout = async () => {
    const ok = await confirmar({
      titulo: '¿Cerrar sesión?',
      mensaje: 'Tendrás que volver a introducir tu correo y contraseña para entrar. Tus equipos y tareas quedan guardados.',
      textoConfirmar: 'Cerrar sesión',
    });
    if (!ok) return;
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200" aria-label="Navegación principal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 min-h-16 py-2">
          <Link to="/" className="flex items-center space-x-2" aria-label="TaskFlow, ir al inicio">
            <KanbanSquare className="h-8 w-8 text-primary-700" aria-hidden="true" />
            <span className="text-xl font-bold text-gray-900">TaskFlow</span>
          </Link>

          <div className="flex flex-wrap items-center gap-1">
            <NavLink to="/" end className={claseEnlace} title="Mis equipos (atajo: i)">
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>Inicio</span>
            </NavLink>
            <NavLink to="/ayuda" className={claseEnlace} title="Ayuda y preguntas frecuentes (atajo: h)">
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
              <span>Ayuda</span>
            </NavLink>
            <NavLink to="/preferencias" className={claseEnlace} title="Perfil, accesibilidad y privacidad">
              <Settings className="h-4 w-4" aria-hidden="true" />
              <span>Preferencias</span>
            </NavLink>
            <button
              type="button"
              onClick={alAbrirAtajos}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-100"
              title="Atajos de teclado (atajo: ?)"
              aria-label="Ver atajos de teclado"
            >
              <Keyboard className="h-4 w-4" aria-hidden="true" />
            </button>
            {user && (
              <span className="text-sm text-gray-800 hidden md:block px-2" title={user.email}>
                {user.nombre}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
