import { Link } from 'react-router-dom';
import type { Proyecto } from '../../types';
import { FolderKanban, Plus, LayoutGrid, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { registrarReciente } from './recientes';

interface ProjectsListProps {
  proyectos: Proyecto[];
  onCreateClick: () => void;
  /** Nombre del equipo, para recordar el proyecto en "Proyectos recientes" */
  equipoNombre?: string;
  /** Si se indica (solo líder), se muestra el botón para eliminar cada proyecto */
  onDeleteProject?: (proyecto: Proyecto) => void;
}

export const ProjectsList = ({ proyectos, onCreateClick, equipoNombre = '', onDeleteProject }: ProjectsListProps) => {
  return (
    <section className="card-elevated p-6" aria-labelledby="titulo-proyectos">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 id="titulo-proyectos" className="text-2xl font-bold text-gray-900">
          Proyectos <span className="text-gray-700 font-semibold text-lg">({proyectos.length})</span>
        </h2>
        <Button size="sm" onClick={onCreateClick} title="Nuevo proyecto (p)">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo proyecto
        </Button>
      </div>

      {proyectos.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border-2 border-dashed border-gray-300">
          <FolderKanban className="h-10 w-10 mx-auto mb-3 text-gray-600" aria-hidden="true" />
          <p className="text-gray-900 font-semibold mb-1">Este equipo aún no tiene proyectos</p>
          <p className="text-sm text-gray-700 mb-5">
            Crea un proyecto para obtener un tablero con las listas Por Hacer, En Progreso y Hecho.
          </p>
          <Button onClick={onCreateClick}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Crear el primer proyecto
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {proyectos.map((proyecto) => (
            <li
              key={proyecto.id}
              className="flex items-stretch rounded-xl border border-gray-300 bg-white hover:border-primary-700 hover:shadow-md transition-colors"
            >
              <Link
                to={`/proyectos/${proyecto.id}`}
                onClick={() => registrarReciente({ id: proyecto.id, nombre: proyecto.nombre, equipoNombre })}
                className="group flex flex-1 items-center gap-4 p-4 min-w-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                data-testid="tarjeta-proyecto"
              >
                <span className="inline-flex shrink-0 items-center justify-center w-11 h-11 bg-primary-700 rounded-lg" aria-hidden="true">
                  <LayoutGrid className="h-5 w-5 text-white" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-gray-900 group-hover:underline truncate">{proyecto.nombre}</span>
                  <span className="block text-sm text-gray-700">Abrir tablero</span>
                </span>
                <ChevronRight className="h-5 w-5 text-gray-700 shrink-0" aria-hidden="true" />
              </Link>
              {onDeleteProject && (
                <button
                  type="button"
                  onClick={() => onDeleteProject(proyecto)}
                  className="shrink-0 px-3 border-l border-gray-300 text-danger-600 hover:bg-danger-50 rounded-r-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-danger-500"
                  aria-label={`Eliminar el proyecto ${proyecto.nombre}`}
                  title="Eliminar proyecto"
                >
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
