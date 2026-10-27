import type { Usuario } from '../../types';
import { Button } from '../ui/Button';
import { UserPlus, UserMinus, Crown } from 'lucide-react';

interface MembersListProps {
  lider: Usuario;
  miembros: Usuario[];
  usuarioActual: Usuario;
  esLider: boolean;
  onInviteClick: () => void;
  onRemoveMember: (userId: string) => void;
}

const getInitial = (nombre?: string, email?: string): string =>
  (nombre?.trim() || email?.trim() || '?').charAt(0).toUpperCase();

export const MembersList = ({
  lider,
  miembros,
  usuarioActual,
  esLider,
  onInviteClick,
  onRemoveMember,
}: MembersListProps) => {
  // El líder también figura en "miembros": se muestra una sola vez, arriba
  const otros = miembros.filter((m) => m?.id && m.id !== lider?.id);
  const personas = [lider, ...otros].filter((p): p is Usuario => Boolean(p?.id));

  return (
    <section className="card-elevated p-6" aria-labelledby="titulo-miembros">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 id="titulo-miembros" className="text-2xl font-bold text-gray-900">
          Miembros <span className="text-gray-700 font-semibold text-lg">({personas.length})</span>
        </h2>
        {esLider && (
          <Button size="sm" onClick={onInviteClick} title="Invitar a un miembro (m)">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Invitar
          </Button>
        )}
      </div>

      <ul className="space-y-2">
        {personas.map((persona) => {
          const esElLider = persona.id === lider?.id;
          const esYo = persona.id === usuarioActual?.id;
          const nombre = persona.nombre || 'Usuario sin nombre';
          return (
            <li
              key={persona.id}
              className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border ${
                esElLider ? 'bg-warning-50 border-warning-500' : 'bg-white border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold ${
                    esElLider ? 'bg-yellow-700' : 'bg-primary-700'
                  }`}
                  aria-hidden="true"
                >
                  {getInitial(persona.nombre, persona.email)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 flex flex-wrap items-center gap-2">
                    {nombre}
                    {esElLider && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-900 border border-yellow-300">
                        <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                        Líder
                      </span>
                    )}
                    {esYo && (
                      <span className="px-2 py-0.5 rounded-full text-sm font-semibold bg-primary-100 text-primary-900 border border-primary-500">
                        Tú
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-700 break-all">{persona.email || 'Sin correo'}</p>
                </div>
              </div>

              {esLider && !esElLider && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveMember(persona.id)}
                  aria-label={`Quitar a ${nombre} del equipo`}
                  title={`Quitar a ${nombre} del equipo`}
                  className="text-danger-600 hover:bg-danger-50 border border-gray-300"
                >
                  <UserMinus className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Quitar</span>
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {otros.length === 0 && (
        <div className="mt-4 rounded-xl border-2 border-dashed border-gray-300 p-5 text-center">
          <p className="font-semibold text-gray-900">Todavía no hay más personas en el equipo</p>
          {esLider ? (
            <>
              <p className="text-sm text-gray-700 mt-1 mb-4">
                Invita a tus compañeros por su correo para trabajar juntos en los proyectos.
              </p>
              <Button size="sm" onClick={onInviteClick}>
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Invitar al primer miembro
              </Button>
            </>
          ) : (
            <p className="text-sm text-gray-700 mt-1">Solo el líder puede invitar a nuevos miembros.</p>
          )}
        </div>
      )}
    </section>
  );
};
