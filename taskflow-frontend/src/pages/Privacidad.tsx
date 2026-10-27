import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuthStore } from '../store/useAuthStore';

const SECCIONES: { titulo: string; puntos: string[] }[] = [
  {
    titulo: 'Qué datos guardamos',
    puntos: [
      'Tu nombre y tu correo electrónico.',
      'Tu contraseña, siempre cifrada (nadie, ni el equipo de TaskFlow, puede leerla).',
      'Los equipos, proyectos y tareas que creas, y a quién están asignadas.',
      'En tu navegador: la sesión, tus preferencias de accesibilidad y los borradores de formularios.',
    ],
  },
  {
    titulo: 'Para qué los usamos',
    puntos: [
      'Para que puedas iniciar sesión y trabajar desde cualquier dispositivo.',
      'Para mostrar tu nombre a los miembros de tus equipos.',
      'No los vendemos, no hacemos publicidad y no los compartimos con terceros.',
    ],
  },
  {
    titulo: 'Quién puede verlos',
    puntos: [
      'Solo los miembros de tus equipos ven tu nombre y tu correo.',
      'Otro usuario solo puede encontrarte si escribe tu correo exacto para invitarte.',
    ],
  },
  {
    titulo: 'Tus derechos y controles',
    puntos: [
      'Cambiar tu nombre desde Preferencias.',
      'Salir de la sesión en cualquier momento con "Salir".',
      'Eliminar tu cuenta y tus datos personales desde Preferencias > Privacidad y cuenta.',
      'Borrar los datos de tu navegador limpiando los datos del sitio.',
    ],
  },
];

export const Privacidad = () => {
  useDocumentTitle('Privacidad');
  const { isAuthenticated } = useAuthStore();

  return (
    <main id="contenido" className="min-h-screen bg-gray-100 py-10 px-4">
      <article className="max-w-3xl mx-auto bg-white rounded-2xl shadow-card p-6 sm:p-10 border border-gray-200 space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-success-600" aria-hidden="true" />
            Privacidad y uso de tus datos
          </h1>
          <p className="text-gray-700 mt-2">Explicado de forma sencilla, sin letra pequeña.</p>
        </header>

        {SECCIONES.map((seccion) => (
          <section key={seccion.titulo}>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{seccion.titulo}</h2>
            <ul className="list-disc pl-6 space-y-1 text-gray-800">
              {seccion.puntos.map((punto) => (
                <li key={punto}>{punto}</li>
              ))}
            </ul>
          </section>
        ))}

        <div className="pt-4 border-t border-gray-200 flex flex-wrap gap-4">
          {isAuthenticated ? (
            <>
              <Link to="/preferencias" className="font-semibold text-primary-700 underline">
                Ir a Preferencias
              </Link>
              <Link to="/" className="font-semibold text-primary-700 underline">
                Volver a mis equipos
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="font-semibold text-primary-700 underline">
                Volver al registro
              </Link>
              <Link to="/login" className="font-semibold text-primary-700 underline">
                Iniciar sesión
              </Link>
            </>
          )}
        </div>
      </article>
    </main>
  );
};
