import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { authService } from '../services/authService';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { describirError } from '../lib/errores';
import { Mail, Lock, User, KanbanSquare, CheckCircle2, Circle, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface ErrorMostrado {
  mensaje: string;
  codigo?: string;
}

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const Register = () => {
  useDocumentTitle('Crear cuenta');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [emailTocado, setEmailTocado] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<ErrorMostrado | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const emailLimpio = email.trim();
  const errorEmail =
    emailTocado && emailLimpio && !FORMATO_EMAIL.test(emailLimpio)
      ? 'Escribe un correo completo, por ejemplo: ana@empresa.com'
      : undefined;

  const passwordRequirements = [
    { label: 'Al menos 8 caracteres', met: password.length >= 8 },
    { label: 'Al menos una letra', met: /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(password) },
    { label: 'Al menos un número', met: /\d/.test(password) },
    { label: 'Las dos contraseñas coinciden', met: Boolean(password && confirmPassword && password === confirmPassword) },
  ];

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setEmailTocado(true);

    if (!nombre.trim()) {
      setError({ mensaje: 'Escribe tu nombre: así te reconocerán tus compañeros.' });
      return;
    }
    if (!FORMATO_EMAIL.test(emailLimpio)) {
      setError({ mensaje: 'Revisa el correo electrónico: el formato no es válido.' });
      return;
    }
    if (password.length < 8 || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(password) || !/\d/.test(password)) {
      setError({ mensaje: 'La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número.' });
      return;
    }
    if (password !== confirmPassword) {
      setError({ mensaje: 'Las contraseñas no coinciden. Vuelve a escribir la confirmación.' });
      return;
    }

    setIsLoading(true);
    try {
      await authService.register({ nombre: nombre.trim(), email: emailLimpio, password });
      navigate('/login', { state: { registrado: emailLimpio } });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError({ mensaje: `Ya existe una cuenta con el correo ${emailLimpio}. Inicia sesión con ella o usa otro correo.` });
      } else {
        setError(describirError(err, 'No se pudo crear la cuenta'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const botonVer = (
    <button
      type="button"
      onClick={() => setVerPassword((v) => !v)}
      className="p-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
      aria-label={verPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
      aria-pressed={verPassword}
      title={verPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
    >
      {verPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
    </button>
  );

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
          <p className="text-gray-800 mt-1">Organiza el trabajo de tu equipo en tableros Kanban</p>
        </div>

        <div className="bg-white rounded-xl shadow-card border border-gray-200 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Crear cuenta</h1>
          <p className="text-sm text-gray-700 mb-6">
            Los campos marcados con <span aria-hidden="true" className="text-danger-600">*</span>
            <span className="sr-only">asterisco</span> son obligatorios.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              type="text"
              label="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan Pérez"
              icon={<User size={20} />}
              autoComplete="name"
              maxLength={255}
              required
              ayuda="Es el nombre que verán tus compañeros de equipo."
            />

            <Input
              type="email"
              label="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => emailLimpio && setEmailTocado(true)}
              placeholder="tu@email.com"
              icon={<Mail size={20} />}
              autoComplete="email"
              inputMode="email"
              required
              error={errorEmail}
              ayuda="Tus compañeros lo usarán para invitarte a sus equipos."
            />

            <Input
              type={verPassword ? 'text' : 'password'}
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={20} />}
              autoComplete="new-password"
              required
              accesorio={botonVer}
              aria-describedby="requisitos-password"
            />

            <Input
              type={verPassword ? 'text' : 'password'}
              label="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock size={20} />}
              autoComplete="new-password"
              required
              aria-describedby="requisitos-password"
            />

            {/* Requisitos de contraseña, visibles siempre y actualizados al escribir */}
            <div id="requisitos-password" className="p-4 bg-gray-50 rounded-lg border border-gray-300">
              <p className="text-sm font-semibold text-gray-900 mb-2">La contraseña debe cumplir:</p>
              <ul className="space-y-1.5">
                {passwordRequirements.map((req) => (
                  <li key={req.label} className="flex items-center gap-2 text-sm">
                    {req.met ? (
                      <CheckCircle2 size={18} className="text-success-600 shrink-0" aria-hidden="true" />
                    ) : (
                      <Circle size={18} className="text-gray-600 shrink-0" aria-hidden="true" />
                    )}
                    <span className={req.met ? 'text-gray-900 font-medium' : 'text-gray-800'}>
                      {req.label}
                      <span className="sr-only">{req.met ? ': cumplido' : ': pendiente'}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

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

            <p className="text-sm text-gray-800">
              Al registrarte aceptas que guardemos tu nombre y correo para que tus equipos puedan encontrarte.{' '}
              <Link to="/privacidad" className="font-semibold text-primary-800 underline underline-offset-2 hover:text-primary-900">
                Consulta cómo usamos tus datos
              </Link>
              .
            </p>

            <Button type="submit" isLoading={isLoading} className="w-full py-3">
              Crear cuenta
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-800">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-semibold text-primary-800 underline underline-offset-2 hover:text-primary-900">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};
