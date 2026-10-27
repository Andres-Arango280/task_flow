import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { equiposService } from '../services/equiposService';
import { proyectosService } from '../services/proyectosService';
import { useAuthStore } from '../store/useAuthStore';
import type { Equipo, Proyecto, Usuario } from '../types';
import { TeamHeader } from '../components/equipo/TeamHeader';
import { MembersList } from '../components/equipo/MembersList';
import { InviteMemberModal } from '../components/equipo/InviteMemberModal';
import { ProjectsList } from '../components/equipo/ProjectsList';
import { CreateProjectModal } from '../components/equipo/CreateProjectModal';
import { quitarRecientes, registrarReciente } from '../components/equipo/recientes';
import { Migas } from '../components/layout/Migas';
import { useAvisos } from '../components/ui/Toast';
import { useConfirmacion } from '../components/ui/Confirmacion';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAtajos } from '../hooks/useAtajos';
import { useActualizacionPeriodica } from '../hooks/useActualizacionPeriodica';
import { describirError } from '../lib/errores';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export const TeamView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const avisos = useAvisos();
  const confirmar = useConfirmacion();

  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<{ mensaje: string; codigo: string } | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  const esLider = Boolean(equipo && user && equipo.lider.id === user.id);
  useDocumentTitle(equipo?.nombre ?? (isLoading ? 'Cargando equipo' : 'Equipo'));

  // Pide equipo y proyectos; lanza el error para que cada llamador decida cómo mostrarlo
  const recargar = useCallback(async () => {
    if (!id) return;
    const [equipoData, proyectosData] = await Promise.all([
      equiposService.getById(id),
      proyectosService.getByEquipo(id),
    ]);
    setEquipo(equipoData);
    setProyectos(proyectosData);
  }, [id]);

  const { marcarActualizado, textoActualizacion } = useActualizacionPeriodica(recargar, 15000, Boolean(equipo));

  useEffect(() => {
    if (!id) return;
    let cancelado = false;
    setIsLoading(true);
    setErrorCarga(null);
    recargar()
      .then(() => {
        if (!cancelado) marcarActualizado();
      })
      .catch((error: unknown) => {
        if (cancelado) return;
        setErrorCarga(describirError(error, 'No se pudo cargar el equipo'));
        avisos.error(error, 'No se pudo cargar el equipo');
      })
      .finally(() => {
        if (!cancelado) setIsLoading(false);
      });
    return () => {
      cancelado = true;
    };
    // marcarActualizado y avisos no deben relanzar la carga inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, recargar]);

  // Recarga tras una acción del usuario; si falla, se avisa
  const recargarTrasAccion = async () => {
    try {
      await recargar();
      marcarActualizado();
    } catch (error) {
      avisos.error(error, 'No se pudieron actualizar los datos del equipo');
    }
  };

  useAtajos({
    p: () => setShowCreateProjectModal(true),
    m: () => {
      if (esLider) setShowInviteModal(true);
    },
  });

  const handleInviteMember = async (userId: string) => {
    if (!id) return;
    // Los errores se muestran dentro de la ventana de invitación
    const actualizado = await equiposService.addMiembro(id, userId);
    const nuevo = actualizado?.miembros?.find((m) => m.id === userId);
    avisos.exito(`${nuevo?.nombre ?? 'La persona'} ahora es miembro del equipo.`);
    await recargarTrasAccion();
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id || !equipo) return;
    const miembro: Usuario | undefined = equipo.miembros.find((m) => m.id === userId);
    const nombre = miembro?.nombre || miembro?.email || 'este miembro';

    const aceptado = await confirmar({
      titulo: `¿Quitar a ${nombre} del equipo?`,
      mensaje: `${nombre} dejará de pertenecer a «${equipo.nombre}».`,
      consecuencias: [
        'Perderá el acceso a todos los proyectos y tableros del equipo.',
        'Las tareas que tenga asignadas se conservan.',
        'Podrás deshacerlo justo después o volver a invitarle cuando quieras.',
      ],
      textoConfirmar: 'Quitar del equipo',
      peligroso: true,
    });
    if (!aceptado) return;

    try {
      await equiposService.removeMiembro(id, userId);
      avisos.exito(`${nombre} ya no forma parte del equipo.`, {
        accion: {
          etiqueta: 'Deshacer',
          alPulsar: async () => {
            try {
              await equiposService.addMiembro(id, userId);
              avisos.info(`${nombre} ha vuelto al equipo.`);
              await recargarTrasAccion();
            } catch (error) {
              avisos.error(error, `No se pudo volver a añadir a ${nombre}`);
            }
          },
        },
        duracionMs: 10000,
      });
      await recargarTrasAccion();
    } catch (error) {
      avisos.error(error, `No se pudo quitar a ${nombre}`);
    }
  };

  const handleCreateProject = async (nombre: string) => {
    if (!id) return;
    // Si falla, la ventana muestra el error y conserva el borrador
    const proyecto = await proyectosService.create(nombre, id);
    avisos.exito(`Proyecto «${proyecto?.nombre ?? nombre}» creado con sus 3 listas.`, {
      accion: proyecto?.id
        ? {
            etiqueta: 'Abrir tablero',
            alPulsar: () => {
              registrarReciente({ id: proyecto.id, nombre: proyecto.nombre, equipoNombre: equipo?.nombre ?? '' });
              navigate(`/proyectos/${proyecto.id}`);
            },
          }
        : undefined,
    });
    await recargarTrasAccion();
  };

  const handleDeleteProject = async (proyecto: Proyecto) => {
    const aceptado = await confirmar({
      titulo: `¿Eliminar el proyecto «${proyecto.nombre}»?`,
      mensaje: 'Esta acción es permanente y afecta a todo el equipo.',
      consecuencias: [
        'Se eliminarán sus listas y todas sus tareas.',
        'Ningún miembro podrá volver a abrir este tablero.',
        'No se puede deshacer.',
      ],
      textoConfirmar: 'Eliminar proyecto',
      peligroso: true,
    });
    if (!aceptado) return;

    try {
      await proyectosService.eliminar(proyecto.id);
      quitarRecientes([proyecto.id]);
      avisos.exito(`Proyecto «${proyecto.nombre}» eliminado.`);
      await recargarTrasAccion();
    } catch (error) {
      avisos.error(error, 'No se pudo eliminar el proyecto');
    }
  };

  const handleDeleteTeam = async () => {
    if (!id || !equipo) return;
    const aceptado = await confirmar({
      titulo: `¿Eliminar el equipo «${equipo.nombre}»?`,
      mensaje: 'Esta acción es permanente y afecta a todos sus miembros.',
      consecuencias: [
        `Se eliminarán sus ${proyectos.length} proyecto(s), con todas sus listas y tareas.`,
        'Todos los miembros perderán el acceso.',
        'No se puede deshacer.',
      ],
      textoConfirmar: 'Eliminar equipo',
      peligroso: true,
    });
    if (!aceptado) return;

    try {
      await equiposService.eliminar(id);
      quitarRecientes(proyectos.map((p) => p.id));
      avisos.exito(`Equipo «${equipo.nombre}» eliminado.`);
      navigate('/');
    } catch (error) {
      avisos.error(error, 'No se pudo eliminar el equipo');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" role="status">
        <div className="flex flex-col items-center gap-4">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-primary-700"
            aria-hidden="true"
          ></div>
          <p className="text-gray-800 font-medium">Cargando equipo…</p>
        </div>
      </div>
    );
  }

  if (!equipo || !user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-danger-600" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">No se pudo abrir este equipo</h1>
        <p className="text-gray-800 mb-1">
          {errorCarga?.mensaje ?? 'Puede que el equipo se haya eliminado o que ya no seas miembro.'}
        </p>
        {errorCarga?.codigo && <p className="text-sm text-gray-700 mb-6">Código de referencia: {errorCarga.codigo}</p>}
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-4 font-semibold text-primary-800 underline underline-offset-2 hover:text-primary-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a mis equipos
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Migas items={[{ etiqueta: equipo.nombre }]} />

        <TeamHeader
          equipo={equipo}
          esLider={esLider}
          onDeleteClick={esLider ? handleDeleteTeam : undefined}
          textoActualizacion={textoActualizacion}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-6 lg:mt-8">
          <ProjectsList
            proyectos={proyectos}
            equipoNombre={equipo.nombre}
            onCreateClick={() => setShowCreateProjectModal(true)}
            onDeleteProject={esLider ? handleDeleteProject : undefined}
          />

          <MembersList
            lider={equipo.lider}
            miembros={equipo.miembros}
            usuarioActual={user}
            esLider={esLider}
            onInviteClick={() => setShowInviteModal(true)}
            onRemoveMember={handleRemoveMember}
          />
        </div>
      </div>

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteMember}
        idsMiembros={[equipo.lider.id, ...equipo.miembros.map((m) => m.id)]}
      />

      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onCreate={handleCreateProject}
        equipoId={equipo.id}
      />
    </div>
  );
};
