import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { describirError } from '../lib/errores';
import { Mail, Lock, KanbanSquare, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

// El interceptor de la API recarga /login ante un 401: el error se guarda para mostrarlo tras la recarga
const CLAVE_ERROR = 'taskflow:error-login';

function leerErrorGuardado(): ErrorMostrado | null {
  try {
    const guardado = sessionStorage.getItem(CLAVE_ERROR);
    return guardado ? (JSON.parse(guardado) as ErrorMostrado) : null;
  } catch {
    return null;
  }
}

function borrarErrorGuardado() {
  try {
    sessionStorage.removeItem(CLAVE_ERROR);
  } catch {
    // nada que limpiar
  }
}

function guardarError(error: ErrorMostrado) {
  try {
    sessionStorage.setItem(CLAVE_ERROR, JSON.stringify(error));
  } catch {
    // sin almacenamiento: el mensaje solo se ve si no hay recarga
  }
}

interface ErrorMostrado {
  mensaje: string;
  codigo?: string;
  email?: string;
}

export const Login = () => {
  useDocumentTitle('Iniciar sesión');
  const location = useLocation();
  const registrado = (location.state as { registrado?: string } | null)?.registrado;
  const [error, setError] = useState<ErrorMostrado | null>(leerErrorGuardado);
  const [email, setEmail] = useState(registrado ?? error?.email ?? '');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // El mensaje guardado solo se muestra una vez
  useEffect(() => {
    const temporizador = window.setTimeout(borrarErrorGuardado, 1000);
    return () => window.clearTimeout(temporizador);
  }, []);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { access_token } = await authService.login({ email: email.trim(), password });
      localStorage.setItem('access_token', access_token);
      const user = await authService.getProfile();
      login(user, access_token);
      borrarErrorGuardado();
      navigate('/');
    } catch (err) {
      const mostrado =
        isAxiosError(err) && err.response?.status === 401
          ? { mensaje: 'El correo o la contraseña no son correctos. Revísalos e inténtalo de nuevo.' }
          : describirError(err, 'No se pudo iniciar sesión');
      guardarError({ ...mostrado, email: email.trim() });
      setError(mostrado);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 bg-primary-700 rounded-2xl mb-4"
            aria-hidden="true"
          >
            <KanbanSquare className="h-10 w-10 text-white" />
          </div>
          <p className="text-3xl font-bold text-gray-900">TaskFlow</p>
          <p className="text-gray-800 mt-1">Gestión colaborativa de tareas</p>
        </div>

        <div className="bg-white rounded-xl shadow-card border border-gray-200 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Iniciar sesión</h1>

          {registrado && !error && (
            <div
              role="status"
              className="flex items-start gap-2 p-4 mb-5 bg-success-50 border border-success-600 rounded-lg text-gray-900 text-sm"
            >
              <CheckCircle2 className="h-5 w-5 text-success-600 shrink-0" aria-hidden="true" />
              <p>Cuenta creada correctamente. Inicia sesión con tu contraseña para empezar.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              label="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              icon={<Mail size={20} />}
              autoComplete="email"
              inputMode="email"
              required
            />

            <Input
              type={verPassword ? 'text' : 'password'}
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={20} />}
              autoComplete="current-password"
              required
              accesorio={
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  className="p-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verPassword}
                  title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {verPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
              }
            />

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 p-4 bg-danger-50 border border-danger-600 rounded-lg text-gray-900 text-sm"
              >
                <AlertCircle className="h-5 w-5 text-danger-600 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium">{error.mensaje}</p>
                  {error.codigo && <p className="mt-1 text-gray-700">Código de referencia: {error.codigo}</p>}
                </div>
              </div>
            )}

            <Button type="submit" isLoading={isLoading} className="w-full py-3">
              Iniciar sesión
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 space-y-2 text-center text-sm text-gray-800">
            <p>
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                className="font-semibold text-primary-800 underline underline-offset-2 hover:text-primary-900"
              >
                Regístrate aquí
              </Link>
            </p>
            <p>
              <Link to="/privacidad" className="text-gray-800 underline underline-offset-2 hover:text-gray-900">
                Privacidad y uso de tus datos
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};
