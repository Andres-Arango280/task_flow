import { Draggable } from '@hello-pangea/dnd';
import type { Tarea } from '../../types';
import { GripVertical, UserPlus } from 'lucide-react';
import { Avatar } from './Avatar';

interface TaskCardProps {
  tarea: Tarea;
  index: number;
  onClick: () => void;
  onAssignClick: () => void;
}

export const TaskCard = ({ tarea, index, onClick, onAssignClick }: TaskCardProps) => {
  const asignados = tarea.asignados ?? [];
  const nombresAsignados = asignados.map((u) => u.nombre).join(', ');

  return (
    <Draggable draggableId={tarea.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={onClick}
          className={`bg-white rounded-xl border-2 p-3 mb-3 cursor-pointer transition-all duration-300 group ${
            snapshot.isDragging
              ? 'shadow-2xl rotate-2 border-primary-600'
              : 'border-gray-200 shadow-sm hover:border-sky-400 hover:shadow-lg'
          }`}
        >
          <div className="flex items-start gap-2">
            {/* Asa de arrastre: siempre visible y accesible con teclado (Espacio + flechas) */}
            <div
              {...provided.dragHandleProps}
              aria-label={`Arrastrar tarea ${tarea.titulo}`}
              title="Arrastrar para mover (con teclado: Espacio, flechas y Espacio)"
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 p-1 -ml-1 rounded-md text-gray-600 hover:text-primary-700 hover:bg-primary-50 cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <GripVertical className="h-5 w-5" aria-hidden="true" />
            </div>

            {/* Área principal: abre el detalle con clic o con Enter */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="flex-1 min-w-0 text-left rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              data-testid="abrir-tarea"
              title="Ver detalle, editar o eliminar"
            >
              <span className="block font-semibold text-gray-900 group-hover:text-primary-800 transition-colors line-clamp-2 break-words">
                {tarea.titulo}
              </span>
              {tarea.descripcion && (
                <span className="block mt-1 text-sm text-gray-700 line-clamp-2 leading-relaxed break-words">
                  {tarea.descripcion}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAssignClick();
              }}
              className="p-1.5 rounded-lg text-gray-700 hover:text-primary-700 hover:bg-primary-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label={`Asignar miembros a la tarea ${tarea.titulo}`}
              title="Asignar miembros"
            >
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
            {asignados.length > 0 ? (
              <>
                <div className="flex -space-x-2" aria-hidden="true">
                  {asignados.slice(0, 3).map((usuario) => (
                    <Avatar key={usuario.id} usuario={usuario} tamano="sm" className="border-2 border-white" />
                  ))}
                  {asignados.length > 3 && (
                    <span className="w-7 h-7 bg-gray-200 rounded-full inline-flex items-center justify-center text-gray-800 text-sm font-bold border-2 border-white">
                      +{asignados.length - 3}
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-700 font-medium truncate" title={nombresAsignados}>
                  <span className="sr-only">Asignada a: {nombresAsignados}. </span>
                  <span aria-hidden="true">
                    {asignados.length} asignado{asignados.length !== 1 ? 's' : ''}
                  </span>
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-600 italic">Sin asignar</span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
