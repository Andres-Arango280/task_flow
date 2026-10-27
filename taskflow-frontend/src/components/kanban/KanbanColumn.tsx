import { Droppable } from '@hello-pangea/dnd';
import type { DroppableProvided, DroppableStateSnapshot } from '@hello-pangea/dnd';
import type { Lista, Tarea } from '../../types';
import { TaskCard } from './TaskCard';
import { Plus, Inbox, SearchX } from 'lucide-react';
import { estiloColumna } from './estilosColumna';

interface KanbanColumnProps {
  lista: Lista;
  tareas: Tarea[];
  totalSinFiltrar: number;
  filtrando: boolean;
  onAddTask: () => void;
  onTaskClick: (tarea: Tarea) => void;
  onAssignClick: (tarea: Tarea) => void;
}

export const KanbanColumn = ({
  lista,
  tareas,
  totalSinFiltrar,
  filtrando,
  onAddTask,
  onTaskClick,
  onAssignClick,
}: KanbanColumnProps) => {
  const estilo = estiloColumna(lista.nombre);
  const idTitulo = `columna-${lista.id}`;
  const contador = filtrando ? `${tareas.length} de ${totalSinFiltrar}` : `${tareas.length}`;

  return (
    <section
      aria-labelledby={idTitulo}
      className={`flex flex-col w-80 lg:w-96 ${estilo.fondo} rounded-2xl p-4 shadow-sm border border-t-4 ${estilo.borde}`}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-3 h-3 rounded-full shrink-0 ${estilo.punto}`} aria-hidden="true" />
          <h2 id={idTitulo} className={`font-bold text-lg truncate ${estilo.titulo}`}>
            {lista.nombre}
          </h2>
        </div>
        <span
          className={`text-sm font-bold px-3 py-1 rounded-full ${estilo.contador}`}
          aria-label={filtrando ? `${tareas.length} de ${totalSinFiltrar} tareas visibles` : `${tareas.length} tareas`}
        >
          {contador}
        </span>
      </header>

      <Droppable droppableId={lista.id}>
        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[200px] transition-colors duration-300 rounded-xl px-1 py-1 ${
              snapshot.isDraggingOver ? 'bg-white/70 ring-2 ring-primary-500' : ''
            }`}
          >
            {tareas.length === 0 && !snapshot.isDraggingOver ? (
              <div className="text-center py-10 px-3 text-gray-700">
                <span className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-full mb-3">
                  {filtrando ? <SearchX className="h-6 w-6" aria-hidden="true" /> : <Inbox className="h-6 w-6" aria-hidden="true" />}
                </span>
                {filtrando ? (
                  <>
                    <p className="text-sm font-semibold">Ninguna tarea coincide aquí</p>
                    <p className="text-sm mt-1">Prueba otra búsqueda o cambia el filtro.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold">Sin tareas en esta columna</p>
                    <p className="text-sm mt-1">Arrastra una tarea aquí o crea una nueva.</p>
                  </>
                )}
              </div>
            ) : (
              tareas.map((tarea, index) => (
                <TaskCard
                  key={tarea.id}
                  tarea={tarea}
                  index={index}
                  onClick={() => onTaskClick(tarea)}
                  onAssignClick={() => onAssignClick(tarea)}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <button
        type="button"
        onClick={onAddTask}
        className="w-full mt-3 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-gray-800 bg-white/60 border border-gray-300 hover:bg-white hover:border-sky-400 hover:text-primary-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label={`Agregar tarea en ${lista.nombre}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Agregar tarea
      </button>
    </section>
  );
};
