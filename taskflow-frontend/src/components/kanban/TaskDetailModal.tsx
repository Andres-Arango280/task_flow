import { useId, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Trash2, UserPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Lista, Tarea } from '../../types';
import { Avatar } from './Avatar';
import { estiloColumna } from './estilosColumna';
import { MAX_DESCRIPCION, MAX_TITULO } from './limites';

interface TaskDetailModalProps {
  tarea: Tarea;
  listas: Lista[];
  onClose: () => void;
  onGuardar: (cambios: { titulo: string; descripcion: string }) => Promise<void>;
  onCambiarColumna: (listaId: string) => Promise<void>;
  onAsignar: () => void;
  onEliminar: () => void;
  /** Oculta la ventana sin perder lo escrito (p. ej. mientras se asignan miembros o se confirma) */
  oculto?: boolean;
}

function fechaLegible(iso?: string) {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return {
    completa: format(fecha, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es }),
    relativa: formatDistanceToNow(fecha, { locale: es, addSuffix: true }),
  };
}

// Detalle de una tarea: lectura completa, edición, cambio de columna, asignación y eliminación.
// Se monta con key = id de la tarea para que el formulario parta de los datos actuales.
export const TaskDetailModal = ({
  tarea,
  listas,
  onClose,
  onGuardar,
  onCambiarColumna,
  onAsignar,
  onEliminar,
  oculto = false,
}: TaskDetailModalProps) => {
  const id = useId();
  const [original, setOriginal] = useState({ titulo: tarea.titulo, descripcion: tarea.descripcion ?? '' });
  const [titulo, setTitulo] = useState(original.titulo);
  const [descripcion, setDescripcion] = useState(original.descripcion);
  const [guardando, setGuardando] = useState(false);
  const [moviendo, setMoviendo] = useState(false);

  const tituloVacio = !titulo.trim();
  const hayCambios = titulo.trim() !== original.titulo.trim() || descripcion.trim() !== original.descripcion.trim();
  const fecha = fechaLegible(tarea.createdAt);
  const asignados = tarea.asignados ?? [];
  const listaActual = listas.find((l) => l.id === tarea.listaId);

  const guardar = async () => {
    if (!hayCambios || tituloVacio || guardando) return;
    setGuardando(true);
    try {
      const cambios = { titulo: titulo.trim(), descripcion: descripcion.trim() };
      await onGuardar(cambios);
      setOriginal(cambios);
      setTitulo(cambios.titulo);
      setDescripcion(cambios.descripcion);
    } catch {
      // El tablero ya mostró el error; los cambios se mantienen en el formulario
    } finally {
      setGuardando(false);
    }
  };

  const cambiarColumna = async (listaId: string) => {
    if (listaId === tarea.listaId) return;
    setMoviendo(true);
    try {
      await onCambiarColumna(listaId);
    } catch {
      // Error ya comunicado por el tablero
    } finally {
      setMoviendo(false);
    }
  };

  const cerrar = () => {
    if (hayCambios && !window.confirm('Tienes cambios sin guardar en esta tarea. ¿Cerrar y descartarlos?')) return;
    onClose();
  };

  return (
    <Modal isOpen={!oculto} onClose={cerrar} title="Detalle de la tarea" ancho="lg">
      <form
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void guardar();
        }}
      >
        <div>
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <label htmlFor={`${id}-titulo`} className="block text-sm font-semibold text-gray-800">
              Título <span className="text-red-700">*</span>
            </label>
            <span id={`${id}-titulo-contador`} className="text-sm text-gray-700">
              {titulo.length}/{MAX_TITULO}
            </span>
          </div>
          <textarea
            id={`${id}-titulo`}
            value={titulo}
            maxLength={MAX_TITULO}
            rows={2}
            required
            aria-required="true"
            aria-invalid={tituloVacio ? true : undefined}
            aria-describedby={`${id}-titulo-contador${tituloVacio ? ` ${id}-titulo-error` : ''}`}
            onChange={(e) => setTitulo(e.target.value.replace(/\n/g, ' '))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void guardar();
              }
            }}
            className={`w-full px-4 py-3 border-2 rounded-xl bg-white text-lg font-semibold text-gray-900 resize-y focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              tituloVacio ? 'border-danger-600' : 'border-gray-300 focus:border-primary-600'
            }`}
          />
          {tituloVacio && (
            <p id={`${id}-titulo-error`} className="mt-2 text-sm font-medium text-red-700" role="alert">
              El título no puede quedar vacío.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <label htmlFor={`${id}-descripcion`} className="block text-sm font-semibold text-gray-800">
              Descripción
            </label>
            <span id={`${id}-descripcion-contador`} className="text-sm text-gray-700">
              {descripcion.length}/{MAX_DESCRIPCION}
            </span>
          </div>
          <textarea
            id={`${id}-descripcion`}
            value={descripcion}
            maxLength={MAX_DESCRIPCION}
            rows={6}
            aria-describedby={`${id}-descripcion-contador`}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Sin descripción. Escribe aquí los detalles de la tarea…"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-600 resize-y focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-600"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-columna`} className="block text-sm font-semibold text-gray-800 mb-2">
              Columna
            </label>
            <select
              id={`${id}-columna`}
              value={tarea.listaId}
              disabled={moviendo}
              onChange={(e) => void cambiarColumna(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 ${
                listaActual ? estiloColumna(listaActual.nombre).etiqueta : 'border-gray-300 bg-white text-gray-900'
              }`}
            >
              {listas.map((lista) => (
                <option key={lista.id} value={lista.id}>
                  {lista.nombre}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-700" aria-live="polite">
              {moviendo ? 'Moviendo la tarea…' : 'El cambio de columna se guarda al momento.'}
            </p>
          </div>

          <div>
            <p className="block text-sm font-semibold text-gray-800 mb-2">Creada</p>
            <p className="flex items-center gap-2 text-gray-900">
              <CalendarDays className="h-5 w-5 text-gray-700 shrink-0" aria-hidden="true" />
              {fecha ? (
                <span>
                  <span className="block">{fecha.completa}</span>
                  <span className="block text-sm text-gray-700">{fecha.relativa}</span>
                </span>
              ) : (
                <span className="text-gray-700">Fecha no disponible</span>
              )}
            </p>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-800">Asignada a</h3>
            <Button type="button" variant="ghost" size="sm" onClick={onAsignar} className="border border-gray-300">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Asignar miembros
            </Button>
          </div>
          {asignados.length === 0 ? (
            <p className="text-sm text-gray-700">Nadie tiene asignada esta tarea todavía.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {asignados.map((usuario) => (
                <li
                  key={usuario.id}
                  className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-gray-100 text-sm font-medium text-gray-900"
                >
                  <Avatar usuario={usuario} tamano="sm" />
                  {usuario.nombre}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="danger" onClick={onEliminar} title="Eliminar esta tarea (podrás deshacerlo)">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Eliminar
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={cerrar}>
              Cerrar
            </Button>
            <Button
              type="submit"
              isLoading={guardando}
              disabled={!hayCambios || tituloVacio}
              title={hayCambios ? 'Guardar los cambios (Enter en el título)' : 'Modifica el título o la descripción para guardar'}
            >
              Guardar cambios
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
