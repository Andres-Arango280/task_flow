import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Tarea, Usuario } from '../../types';
import { Check } from 'lucide-react';
import { Avatar } from './Avatar';

interface AssignMembersModalProps {
  onClose: () => void;
  onAssign: (tareaId: string, miembros: string[]) => Promise<void>;
  tarea: Tarea;
  miembrosDisponibles: Usuario[];
}

// Se monta solo mientras está abierta (con key = id de la tarea) para partir de la asignación actual
export const AssignMembersModal = ({ onClose, onAssign, tarea, miembrosDisponibles }: AssignMembersModalProps) => {
  const [inicial] = useState(() => (tarea.asignados ?? []).map((u) => u.id));
  const [seleccionados, setSeleccionados] = useState<string[]>(inicial);
  const [isLoading, setIsLoading] = useState(false);

  const hayCambios =
    seleccionados.length !== inicial.length || seleccionados.some((idUsuario) => !inicial.includes(idUsuario));

  const toggleMiembro = (userId: string) => {
    setSeleccionados((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const handleAssign = async () => {
    setIsLoading(true);
    try {
      await onAssign(tarea.id, seleccionados);
      onClose();
    } catch {
      // El tablero ya mostró el aviso de error; la ventana sigue abierta para reintentar
    } finally {
      setIsLoading(false);
    }
  };

  const miembrosValidos = miembrosDisponibles.filter((m) => m?.id);

  return (
    <Modal isOpen onClose={onClose} title="Asignar miembros" descripcion={`Tarea: ${tarea.titulo}`}>
      <fieldset className="space-y-4">
        <legend className="text-sm text-gray-800 mb-3">Marca las personas del equipo que trabajarán en esta tarea:</legend>

        {miembrosValidos.length === 0 ? (
          <p className="text-sm text-gray-700">Este equipo aún no tiene miembros. Invítalos desde la página del equipo.</p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {miembrosValidos.map((miembro) => {
              const isSelected = seleccionados.includes(miembro.id);
              const nombre = miembro.nombre?.trim() || 'Usuario';
              return (
                <li key={miembro.id}>
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors focus-within:ring-2 focus-within:ring-primary-500 ${
                      isSelected ? 'bg-primary-50 border-primary-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => toggleMiembro(miembro.id)}
                    />
                    <Avatar usuario={miembro} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-gray-900 truncate">{nombre}</span>
                      <span className="block text-sm text-gray-700 truncate">{miembro.email || 'Sin correo'}</span>
                    </span>
                    <span
                      className={`w-6 h-6 rounded-md border-2 inline-flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-500'
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected && <Check className="h-4 w-4" />}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-800" aria-live="polite">
            {seleccionados.length} miembro{seleccionados.length !== 1 ? 's' : ''} seleccionado
            {seleccionados.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              isLoading={isLoading}
              disabled={!hayCambios}
              title={hayCambios ? 'Guardar la asignación' : 'No hay cambios que guardar'}
            >
              Guardar
            </Button>
          </div>
        </div>
      </fieldset>
    </Modal>
  );
};
