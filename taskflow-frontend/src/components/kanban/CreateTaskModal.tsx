import { useId, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Lista, Usuario } from '../../types';
import { useBorrador } from '../../hooks/useBorrador';
import { Avatar } from './Avatar';
import { MAX_DESCRIPCION, MAX_TITULO } from './limites';


export interface DatosNuevaTarea {
  titulo: string;
  descripcion: string;
  listaId: string;
  asignados: string[];
}

interface CreateTaskModalProps {
  onClose: () => void;
  onCreate: (datos: DatosNuevaTarea) => Promise<void>;
  listas: Lista[];
  listaPreseleccionada?: string;
  proyectoId: string;
  miembros: Usuario[];
}

const BORRADOR_VACIO = { titulo: '', descripcion: '' };

// Se monta solo mientras está abierta: así la columna preseleccionada siempre es la correcta
export const CreateTaskModal = ({
  onClose,
  onCreate,
  listas,
  listaPreseleccionada,
  proyectoId,
  miembros,
}: CreateTaskModalProps) => {
  const id = useId();
  const [borrador, setBorrador, descartarBorrador] = useBorrador(`tarea-nueva:${proyectoId}`, BORRADOR_VACIO);
  const [listaId, setListaId] = useState(listaPreseleccionada || listas[0]?.id || '');
  const [asignados, setAsignados] = useState<string[]>([]);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const titulo = borrador.titulo ?? '';
  const descripcion = borrador.descripcion ?? '';
  const tituloVacio = !titulo.trim();
  const errorTitulo = intentoEnviar && tituloVacio ? 'Escribe un título para la tarea (es obligatorio).' : '';
  const hayBorrador = titulo.trim() !== '' || descripcion.trim() !== '';

  const alternarAsignado = (usuarioId: string) => {
    setAsignados((prev) => (prev.includes(usuarioId) ? prev.filter((x) => x !== usuarioId) : [...prev, usuarioId]));
  };

  const handleCreate = async () => {
    setIntentoEnviar(true);
    if (tituloVacio || isLoading) return;

    setIsLoading(true);
    try {
      await onCreate({ titulo: titulo.trim(), descripcion: descripcion.trim(), listaId, asignados });
      descartarBorrador();
      onClose();
    } catch {
      // El tablero ya mostró el error; el borrador se conserva para reintentar
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Crear nueva tarea"
      descripcion="Lo que escribas se guarda como borrador automáticamente hasta que crees la tarea."
      ancho="lg"
    >
      <form className="space-y-5" onSubmit={(e) => {
          e.preventDefault();
          void handleCreate();
        }} noValidate>
        <div>
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <label htmlFor={`${id}-titulo`} className="block text-sm font-semibold text-gray-800">
              Título de la tarea <span className="text-red-700">*</span>
            </label>
            <span id={`${id}-titulo-contador`} className="text-sm text-gray-700">
              {titulo.length}/{MAX_TITULO}
            </span>
          </div>
          <input
            id={`${id}-titulo`}
            type="text"
            value={titulo}
            maxLength={MAX_TITULO}
            required
            aria-required="true"
            aria-invalid={errorTitulo ? true : undefined}
            aria-describedby={`${id}-titulo-contador${errorTitulo ? ` ${id}-titulo-error` : ''}`}
            onChange={(e) => setBorrador({ titulo: e.target.value, descripcion })}
            placeholder="Ej: Diseñar la pantalla de inicio"
            className={`w-full px-4 py-3 border-2 rounded-xl bg-white text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errorTitulo ? 'border-danger-600' : 'border-gray-300 focus:border-primary-600'
            }`}
          />
          {errorTitulo ? (
            <p id={`${id}-titulo-error`} className="mt-2 text-sm font-medium text-red-700" role="alert">
              {errorTitulo}
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-700">Pulsa Enter para crearla rápidamente.</p>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <label htmlFor={`${id}-descripcion`} className="block text-sm font-semibold text-gray-800">
              Descripción (opcional)
            </label>
            <span id={`${id}-descripcion-contador`} className="text-sm text-gray-700">
              {descripcion.length}/{MAX_DESCRIPCION}
            </span>
          </div>
          <textarea
            id={`${id}-descripcion`}
            value={descripcion}
            maxLength={MAX_DESCRIPCION}
            aria-describedby={`${id}-descripcion-contador`}
            onChange={(e) => setBorrador({ titulo, descripcion: e.target.value })}
            placeholder="Describe los detalles de la tarea…"
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-600"
          />
        </div>

        <div>
          <label htmlFor={`${id}-lista`} className="block text-sm font-semibold text-gray-800 mb-2">
            Columna
          </label>
          <select
            id={`${id}-lista`}
            value={listaId}
            onChange={(e) => setListaId(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-600"
          >
            {listas.map((lista) => (
              <option key={lista.id} value={lista.id}>
                {lista.nombre}
              </option>
            ))}
          </select>
        </div>

        {miembros.length > 0 && (
          <fieldset>
            <legend className="text-sm font-semibold text-gray-800 mb-2">Asignar a (opcional)</legend>
            <div className="flex flex-wrap gap-2">
              {miembros.map((miembro) => {
                const marcado = asignados.includes(miembro.id);
                return (
                  <label
                    key={miembro.id}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 cursor-pointer text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-primary-500 ${
                      marcado ? 'bg-primary-50 border-primary-600 text-primary-900' : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary-600"
                      checked={marcado}
                      onChange={() => alternarAsignado(miembro.id)}
                    />
                    <Avatar usuario={miembro} tamano="sm" />
                    {miembro.nombre}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
          {hayBorrador ? (
            <button
              type="button"
              onClick={() => {
                descartarBorrador();
                setIntentoEnviar(false);
              }}
              className="text-sm font-semibold text-gray-800 underline hover:text-red-700"
            >
              Descartar borrador
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} title="Cerrar sin crear (el borrador se conserva)">
              Cerrar
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Crear tarea
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
