import type { Equipo } from '../../types';
import { Users, Crown, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface TeamHeaderProps {
  equipo: Equipo;
  esLider: boolean;
  /** Se mantienen por compatibilidad: las acciones están en cada sección (Miembros / Proyectos) */
  onInviteClick?: () => void;
  onCreateProjectClick?: () => void;
  /** Solo líder: eliminar el equipo completo */
  onDeleteClick?: () => void;
  /** Texto "Actualizado hace X s" de la actualización automática */
  textoActualizacion?: string;
}

export const TeamHeader = ({
  equipo,
  esLider,
  onDeleteClick,
  textoActualizacion,
}: TeamHeaderProps) => {
  const totalMiembros = new Set([equipo.lider?.id, ...equipo.miembros.map((m) => m.id)].filter(Boolean)).size;

  return (
    <header className="card-elevated p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 break-words">{equipo.nombre}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-800">
            <span>
              Líder: <strong className="text-gray-900">{equipo.lider.nombre}</strong>
            </span>
            {esLider && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-900 border border-yellow-300">
                <Crown className="h-4 w-4" aria-hidden="true" />
                Eres el líder
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gray-700" aria-hidden="true" />
              {totalMiembros} {totalMiembros === 1 ? 'miembro' : 'miembros'}
            </span>
          </div>
          {textoActualizacion && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-gray-700" aria-live="off">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {textoActualizacion} · se actualiza solo cada 15 s
            </p>
          )}
        </div>

        {esLider && onDeleteClick && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              onClick={onDeleteClick}
              className="text-danger-600 border border-danger-600 hover:bg-danger-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Eliminar equipo
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
