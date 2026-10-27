import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRound, Accessibility, RotateCcw, ShieldAlert } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuthStore } from '../store/useAuthStore';
import { usePreferencias, PREFERENCIAS_POR_DEFECTO } from '../store/usePreferencias';
import type { TamanoTexto } from '../store/usePreferencias';
import { authService } from '../services/authService';
import { useAvisos } from '../components/ui/Toast';
import { useConfirmacion } from '../components/ui/Confirmacion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Migas } from '../components/layout/Migas';

const TAMANOS: { valor: TamanoTexto; etiqueta: string }[] = [
  { valor: 'normal', etiqueta: 'Normal' },
  { valor: 'grande', etiqueta: 'Grande' },
  { valor: 'muy-grande', etiqueta: 'Muy grande' },
];

const Interruptor = ({
  id,
  etiqueta,
  descripcion,
  activo,
  alCambiar,
}: {
  id: string;
  etiqueta: string;
  descripcion: string;
  activo: boolean;
  alCambiar: (valor: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-4 py-3">
    <div>
      <label htmlFor={id} className="font-semibold text-gray-900">
        {etiqueta}
      </label>
      <p className="text-sm text-gray-700">{descripcion}</p>
    </div>
    <input
      id={id}
      type="checkbox"
      role="switch"
      checked={activo}
      onChange={(e) => alCambiar(e.target.checked)}
      className="mt-1 h-6 w-6 accent-primary-700 cursor-pointer"
    />
  </div>
);

export const Preferencias = () => {
  useDocumentTitle('Preferencias');
  const navigate = useNavigate();
  const avisos = useAvisos();
  const confirmar = useConfirmacion();
  const { user, token, login, logout } = useAuthStore();
  const preferencias = usePreferencias();

  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [guardando, setGuardando] = useState(false);

  const guardarPerfil = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !token) return;
    setGuardando(true);
    try {
      const actualizado = await authService.actualizarPerfil(nombre.trim());
      login(actualizado, token);
      avisos.exito('Tu nombre se actualizó correctamente.');
    } catch (error) {
      avisos.error(error, 'No se pudo actualizar tu nombre');
    } finally {
      setGuardando(false);
    }
  };

  const restablecer = async () => {
    const ok = await confirmar({
      titulo: '¿Restablecer valores por defecto?',
      mensaje: 'Se volverá a la configuración por defecto de accesibilidad:',
      consecuencias: [
        'Tamaño del texto: Normal.',
        'Alto contraste: desactivado.',
        'Animaciones: activadas.',
        'Atajos de teclado: activados.',
        'Tus equipos, proyectos, tareas y tu nombre NO se modifican.',
      ],
      textoConfirmar: 'Restablecer',
    });
    if (!ok) return;
    preferencias.restablecer();
    avisos.exito('Se restablecieron los valores por defecto.');
  };

  const eliminarCuenta = async () => {
    const ok = await confirmar({
      titulo: '¿Eliminar tu cuenta definitivamente?',
      mensaje: 'Esta acción no se puede deshacer.',
      consecuencias: [
        'Se borrarán tu nombre, tu correo y tu contraseña.',
        'Saldrás de todos los equipos y se quitarán tus asignaciones de tareas.',
        'Si eres líder de algún equipo, primero debes eliminar ese equipo.',
      ],
      textoConfirmar: 'Eliminar mi cuenta',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await authService.eliminarCuenta();
      logout();
      navigate('/login');
    } catch (error) {
      avisos.error(error, 'No se pudo eliminar la cuenta');
    }
  };

  const esPorDefecto = (Object.keys(PREFERENCIAS_POR_DEFECTO) as (keyof typeof PREFERENCIAS_POR_DEFECTO)[]).every(
    (clave) => preferencias[clave] === PREFERENCIAS_POR_DEFECTO[clave],
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <Migas items={[{ etiqueta: 'Preferencias' }]} />
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Preferencias</h1>
        <p className="text-gray-700 mt-1">Tu perfil, la apariencia de TaskFlow y tus datos. Los cambios se guardan al instante.</p>
      </header>

      <section aria-labelledby="titulo-perfil" className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
        <h2 id="titulo-perfil" className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <UserRound className="h-6 w-6 text-primary-700" aria-hidden="true" />
          Perfil
        </h2>
        <form onSubmit={guardarPerfil} className="space-y-4">
          <Input label="Nombre visible para tu equipo" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={255} required />
          <p className="text-sm text-gray-700">
            Correo: <strong>{user?.email}</strong> (no se puede cambiar)
          </p>
          <Button type="submit" isLoading={guardando} disabled={!nombre.trim() || nombre.trim() === user?.nombre}>
            Guardar nombre
          </Button>
        </form>
      </section>

      <section aria-labelledby="titulo-accesibilidad" className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
        <h2 id="titulo-accesibilidad" className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Accessibility className="h-6 w-6 text-primary-700" aria-hidden="true" />
          Apariencia y accesibilidad
        </h2>

        <fieldset className="py-3">
          <legend className="font-semibold text-gray-900">Tamaño del texto</legend>
          <div className="flex flex-wrap gap-2 mt-2">
            {TAMANOS.map((tamano) => (
              <label
                key={tamano.valor}
                className={`px-4 py-2 rounded-lg border-2 cursor-pointer font-semibold ${
                  preferencias.tamanoTexto === tamano.valor
                    ? 'border-primary-700 bg-primary-50 text-primary-900'
                    : 'border-gray-300 text-gray-800 hover:border-gray-500'
                }`}
              >
                <input
                  type="radio"
                  name="tamano-texto"
                  value={tamano.valor}
                  checked={preferencias.tamanoTexto === tamano.valor}
                  onChange={() => preferencias.cambiar({ tamanoTexto: tamano.valor })}
                  className="sr-only"
                />
                {tamano.etiqueta}
                {tamano.valor === PREFERENCIAS_POR_DEFECTO.tamanoTexto && ' (por defecto)'}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="divide-y divide-gray-200">
          <Interruptor
            id="alto-contraste"
            etiqueta="Alto contraste"
            descripcion="Texto negro sobre fondo blanco y bordes marcados, útil para visión reducida."
            activo={preferencias.altoContraste}
            alCambiar={(valor) => preferencias.cambiar({ altoContraste: valor })}
          />
          <Interruptor
            id="reducir-animaciones"
            etiqueta="Reducir animaciones"
            descripcion="Quita los movimientos y transiciones de la interfaz."
            activo={preferencias.reducirAnimaciones}
            alCambiar={(valor) => preferencias.cambiar({ reducirAnimaciones: valor })}
          />
          <Interruptor
            id="atajos"
            etiqueta="Atajos de teclado"
            descripcion='Teclas rápidas como "n" para nueva tarea. Pulsa "?" para ver la lista.'
            activo={preferencias.atajosTeclado}
            alCambiar={(valor) => preferencias.cambiar({ atajosTeclado: valor })}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={restablecer} disabled={esPorDefecto}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Restablecer valores por defecto
          </Button>
          {esPorDefecto && <span className="text-sm text-gray-700">Estás usando los valores por defecto.</span>}
        </div>
      </section>

      <section aria-labelledby="titulo-privacidad" className="bg-white rounded-2xl shadow-card p-6 border-2 border-danger-200">
        <h2 id="titulo-privacidad" className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-danger-600" aria-hidden="true" />
          Privacidad y cuenta
        </h2>
        <p className="text-gray-800 mb-4">
          Revisa qué datos guardamos y para qué en{' '}
          <Link to="/privacidad" className="font-semibold text-primary-700 underline">
            Privacidad
          </Link>
          . Puedes eliminar tu cuenta y tus datos personales cuando quieras.
        </p>
        <Button variant="danger" onClick={eliminarCuenta}>
          Eliminar mi cuenta
        </Button>
      </section>
    </div>
  );
};
