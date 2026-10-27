import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DragStart, DragUpdate, DropResult, ResponderProvided } from '@hello-pangea/dnd';
import { isAxiosError } from 'axios';
import { ArrowLeft, Plus, Search, RefreshCw, Loader2, Lightbulb, X, AlertTriangle } from 'lucide-react';
import { proyectosService } from '../services/proyectosService';
import { tareasService } from '../services/tareasService';
import { equiposService } from '../services/equiposService';
import type { Lista, Tarea, Proyecto, Equipo, Usuario } from '../types';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { CreateTaskModal } from '../components/kanban/CreateTaskModal';
import type { DatosNuevaTarea } from '../components/kanban/CreateTaskModal';
import { AssignMembersModal } from '../components/kanban/AssignMembersModal';
import { TaskDetailModal } from '../components/kanban/TaskDetailModal';
import { tipoColumna } from '../components/kanban/estilosColumna';
import { Button } from '../components/ui/Button';
import { Migas } from '../components/layout/Migas';
import { useAvisos } from '../components/ui/Toast';
import { useConfirmacion } from '../components/ui/Confirmacion';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAtajos } from '../hooks/useAtajos';
import { useActualizacionPeriodica } from '../hooks/useActualizacionPeriodica';
import { useAuthStore } from '../store/useAuthStore';
import { coincide } from '../lib/busqueda';

const FILTRO_TODOS = 'todos';
const FILTRO_SIN_ASIGNAR = 'sin-asignar';

type ErrorCarga = 'no-encontrado' | 'sin-acceso' | 'error' | null;

export const KanbanBoard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const avisos = useAvisos();
  const confirmar = useConfirmacion();
  const usuarioActual = useAuthStore((estado) => estado.user);

  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [listas, setListas] = useState<Lista[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<ErrorCarga>(null);

  // Operaciones en curso: mientras haya alguna se muestra "Guardando…" y se pausa la recarga automática
  const pendientes = useRef(0);
  const [guardando, setGuardando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroMiembro, setFiltroMiembro] = useState(FILTRO_TODOS);
  const buscador = useRef<HTMLInputElement>(null);

  const [crear, setCrear] = useState<{ abierto: boolean; listaId: string }>({ abierto: false, listaId: '' });
  const [idDetalle, setIdDetalle] = useState<string | null>(null);
  const [detalleOculto, setDetalleOculto] = useState(false);
  const [idAsignar, setIdAsignar] = useState<string | null>(null);

  useDocumentTitle(proyecto?.nombre ?? 'Tablero');

  const iniciarOperacion = () => {
    pendientes.current += 1;
    setGuardando(true);
  };
  const terminarOperacion = () => {
    pendientes.current = Math.max(0, pendientes.current - 1);
    if (pendientes.current === 0) setGuardando(false);
  };

  const recargarTareas = useCallback(async () => {
    if (!id || pendientes.current > 0) return;
    const tareasData = await tareasService.getByProyecto(id);
    if (pendientes.current === 0) setTareas(tareasData);
  }, [id]);

  const { marcarActualizado, textoActualizacion } = useActualizacionPeriodica(
    recargarTareas,
    15000,
    Boolean(proyecto),
  );

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorCarga(null);
    try {
      const proyectoData = await proyectosService.getById(id);
      const [equipoData, listasData, tareasData] = await Promise.all([
        proyectoData.equipo?.miembros ? Promise.resolve(proyectoData.equipo) : equiposService.getById(proyectoData.equipoId),
        proyectosService.getListas(id),
        tareasService.getByProyecto(id),
      ]);
      setProyecto(proyectoData);
      setEquipo(equipoData);
      setListas([...listasData].sort((a, b) => a.orden - b.orden));
      setTareas(tareasData);
      marcarActualizado();
    } catch (error) {
      const estado = isAxiosError(error) ? error.response?.status : undefined;
      setErrorCarga(estado === 403 ? 'sin-acceso' : estado === 404 || estado === 400 ? 'no-encontrado' : 'error');
      avisos.error(error, 'No se pudo cargar el tablero');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Miembros que se pueden asignar: líder + miembros, sin duplicados
  const miembros = useMemo<Usuario[]>(() => {
    if (!equipo) return [];
    const todos = [equipo.lider, ...(equipo.miembros ?? [])].filter((u): u is Usuario => Boolean(u?.id));
    return todos.filter((u, i) => todos.findIndex((otro) => otro.id === u.id) === i);
  }, [equipo]);

  const abrirCrear = (listaId?: string) => {
    if (listas.length === 0) return;
    setCrear({ abierto: true, listaId: listaId || listas[0].id });
  };

  useAtajos({
    n: () => abrirCrear(),
    '/': () => buscador.current?.focus(),
  });

  // ---------- Acciones ----------

  const nombreLista = (listaId: string) => listas.find((l) => l.id === listaId)?.nombre ?? 'otra columna';

  const moverTarea = async (tarea: Pick<Tarea, 'id' | 'titulo' | 'listaId'>, destinoId: string, conDeshacer = true) => {
    const origenId = tarea.listaId;
    if (origenId === destinoId) return;
    const listaDestino = listas.find((l) => l.id === destinoId);

    setTareas((prev) => prev.map((t) => (t.id === tarea.id ? { ...t, listaId: destinoId, lista: listaDestino ?? t.lista } : t)));
    iniciarOperacion();
    try {
      await tareasService.mover(tarea.id, destinoId);
      if (conDeshacer) {
        avisos.exito(`"${tarea.titulo}" movida a ${nombreLista(destinoId)}.`, {
          accion: {
            etiqueta: 'Deshacer',
            alPulsar: () => void moverTarea({ ...tarea, listaId: destinoId }, origenId, false),
          },
        });
      } else {
        avisos.info(`"${tarea.titulo}" ha vuelto a ${nombreLista(destinoId)}.`);
      }
    } catch (error) {
      // Revierte el cambio optimista para que el tablero refleje lo que hay en el servidor
      setTareas((prev) => prev.map((t) => (t.id === tarea.id ? { ...t, listaId: origenId } : t)));
      avisos.error(error, 'No se pudo mover la tarea; se ha devuelto a su columna');
    } finally {
      terminarOperacion();
    }
  };

  // Mensajes para lectores de pantalla en español (por defecto la librería los anuncia en inglés y con ids internos)
  const tituloTarea = (id: string) => tareas.find((t) => t.id === id)?.titulo ?? 'la tarea';
  const handleDragStart = (inicio: DragStart, provided: ResponderProvided) => {
    setArrastrando(true);
    provided.announce(
      `Has levantado "${tituloTarea(inicio.draggableId)}" en ${nombreLista(inicio.source.droppableId)}. ` +
        'Usa las flechas izquierda y derecha para cambiar de columna, Espacio para soltar o Escape para cancelar.',
    );
  };
  const handleDragUpdate = (actualizacion: DragUpdate, provided: ResponderProvided) => {
    if (!actualizacion.destination) {
      provided.announce('No estás sobre ninguna columna.');
      return;
    }
    provided.announce(`Sobre la columna ${nombreLista(actualizacion.destination.droppableId)}.`);
  };

  const handleDragEnd = (result: DropResult, provided: ResponderProvided) => {
    setArrastrando(false);
    const { destination, source, draggableId } = result;
    if (result.reason === 'CANCEL' || !destination) {
      provided.announce(`Movimiento cancelado. "${tituloTarea(draggableId)}" sigue en ${nombreLista(source.droppableId)}.`);
    } else if (destination.droppableId === source.droppableId) {
      provided.announce(`"${tituloTarea(draggableId)}" se queda en ${nombreLista(source.droppableId)}.`);
    } else {
      provided.announce(`Has movido "${tituloTarea(draggableId)}" a ${nombreLista(destination.droppableId)}.`);
    }
    if (!destination || destination.droppableId === source.droppableId) return;
    const tarea = tareas.find((t) => t.id === draggableId);
    if (!tarea) return;
    void moverTarea(tarea, destination.droppableId);
  };

  const handleCreateTask = async ({ titulo, descripcion, listaId, asignados }: DatosNuevaTarea) => {
    iniciarOperacion();
    try {
      const nuevaTarea = await tareasService.create({
        titulo,
        descripcion: descripcion || undefined,
        listaId,
        asignados: asignados.length > 0 ? asignados : undefined,
      });
      setTareas((prev) => [...prev, { ...nuevaTarea, asignados: nuevaTarea.asignados ?? [] }]);
      avisos.exito(`Tarea "${titulo}" creada en ${nombreLista(listaId)}.`);
    } catch (error) {
      avisos.error(error, 'No se pudo crear la tarea');
      throw error;
    } finally {
      terminarOperacion();
    }
  };

  const handleAssignMembers = async (tareaId: string, ids: string[]) => {
    iniciarOperacion();
    try {
      const tareaActualizada = await tareasService.asignarMiembros(tareaId, ids);
      setTareas((prev) =>
        prev.map((t) => (t.id === tareaId ? { ...t, ...tareaActualizada, asignados: tareaActualizada.asignados ?? [] } : t)),
      );
      avisos.exito(ids.length === 0 ? 'La tarea ya no tiene personas asignadas.' : 'Asignación guardada.');
    } catch (error) {
      avisos.error(error, 'No se pudo guardar la asignación');
      throw error;
    } finally {
      terminarOperacion();
    }
  };

  const guardarCambios = async (tarea: Tarea, cambios: { titulo: string; descripcion: string }) => {
    iniciarOperacion();
    try {
      const actualizada = await tareasService.actualizar(tarea.id, cambios);
      setTareas((prev) =>
        prev.map((t) =>
          t.id === tarea.id ? { ...t, ...cambios, ...actualizada, asignados: actualizada?.asignados ?? t.asignados } : t,
        ),
      );
      avisos.exito('Cambios guardados.');
    } catch (error) {
      avisos.error(error, 'No se pudieron guardar los cambios');
      throw error;
    } finally {
      terminarOperacion();
    }
  };

  const restaurarTarea = async (tarea: Tarea) => {
    iniciarOperacion();
    try {
      const recreada = await tareasService.create({
        titulo: tarea.titulo,
        descripcion: tarea.descripcion || undefined,
        listaId: tarea.listaId,
        asignados: (tarea.asignados ?? []).map((u) => u.id),
      });
      setTareas((prev) => [...prev, { ...recreada, asignados: recreada.asignados ?? [] }]);
      avisos.info(`Tarea "${tarea.titulo}" restaurada.`);
    } catch (error) {
      avisos.error(error, 'No se pudo restaurar la tarea');
    } finally {
      terminarOperacion();
    }
  };

  const eliminarTarea = async (tarea: Tarea) => {
    setDetalleOculto(true);
    const ok = await confirmar({
      titulo: '¿Eliminar esta tarea?',
      mensaje: `Vas a eliminar la tarea "${tarea.titulo}".`,
      consecuencias: [
        'Desaparecerá del tablero para todo el equipo.',
        'Se perderán su descripción y las personas asignadas.',
        'Podrás deshacerlo durante unos segundos desde el aviso que aparecerá.',
      ],
      textoConfirmar: 'Eliminar tarea',
      peligroso: true,
    });
    if (!ok) {
      setDetalleOculto(false);
      return;
    }

    iniciarOperacion();
    try {
      await tareasService.eliminar(tarea.id);
      setTareas((prev) => prev.filter((t) => t.id !== tarea.id));
      setIdDetalle(null);
      avisos.exito(`Tarea "${tarea.titulo}" eliminada.`, {
        accion: { etiqueta: 'Deshacer', alPulsar: () => void restaurarTarea(tarea) },
        duracionMs: 8000,
      });
    } catch (error) {
      avisos.error(error, 'No se pudo eliminar la tarea');
    } finally {
      setDetalleOculto(false);
      terminarOperacion();
    }
  };

  // ---------- Estados de carga y error ----------

  if (isLoading && !proyecto) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-sky-200 border-t-primary-700" aria-hidden="true" />
          <p className="text-gray-800 font-semibold">Cargando el tablero…</p>
        </div>
      </div>
    );
  }

  if (!proyecto || !equipo) {
    const TEXTOS: Record<'no-encontrado' | 'sin-acceso' | 'error', { titulo: string; detalle: string }> = {
      'no-encontrado': {
        titulo: 'Proyecto no encontrado',
        detalle: 'Puede que el proyecto se haya eliminado o que el enlace no sea correcto.',
      },
      'sin-acceso': {
        titulo: 'No tienes acceso a este proyecto',
        detalle: 'Solo los miembros del equipo pueden ver su tablero. Pide al líder del equipo que te invite.',
      },
      error: {
        titulo: 'No se pudo cargar el tablero',
        detalle: 'Comprueba tu conexión e inténtalo de nuevo. Si el problema continúa, avisa al líder del equipo.',
      },
    };
    const tipo = errorCarga ?? 'error';
    const noEncontrado = tipo !== 'error';
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <span className="inline-flex items-center justify-center w-16 h-16 bg-danger-50 rounded-full mb-4">
          <AlertTriangle className="h-8 w-8 text-red-700" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{TEXTOS[tipo].titulo}</h1>
        <p className="text-gray-800 mb-6">{TEXTOS[tipo].detalle}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {!noEncontrado && (
            <Button onClick={() => void loadData()} isLoading={isLoading}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a mis equipos
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Datos derivados ----------

  const filtrando = busqueda.trim() !== '' || filtroMiembro !== FILTRO_TODOS;
  const tareasVisibles = tareas.filter((t) => {
    if (!coincide(busqueda, t.titulo, t.descripcion)) return false;
    const asignados = t.asignados ?? [];
    if (filtroMiembro === FILTRO_SIN_ASIGNAR) return asignados.length === 0;
    if (filtroMiembro !== FILTRO_TODOS) return asignados.some((u) => u.id === filtroMiembro);
    return true;
  });

  const listaHecho = listas.find((l) => tipoColumna(l.nombre) === 'hecho');
  const totalTareas = tareas.length;
  const tareasHechas = listaHecho ? tareas.filter((t) => t.listaId === listaHecho.id).length : 0;
  const progreso = totalTareas > 0 ? Math.round((tareasHechas / totalTareas) * 100) : 0;

  const tareaDetalle = idDetalle ? tareas.find((t) => t.id === idDetalle) ?? null : null;
  const tareaAsignar = idAsignar ? tareas.find((t) => t.id === idAsignar) ?? null : null;

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroMiembro(FILTRO_TODOS);
  };

  return (
    <div className="flex flex-col px-4 sm:px-6">
      {/* Cabecera */}
      <header className="bg-white border border-gray-200 rounded-2xl px-4 sm:px-6 py-4 shadow-sm">
        <Migas
          items={[
            { etiqueta: equipo.nombre, ruta: `/equipos/${equipo.id}` },
            { etiqueta: proyecto.nombre },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{proyecto.nombre}</h1>
            <p className="text-sm text-gray-700 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Equipo <span className="font-semibold text-gray-900">{equipo.nombre}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span title="El tablero se actualiza solo cada 15 segundos">{textoActualizacion}</span>
              <span role="status" aria-live="polite" className="inline-flex items-center gap-1 font-semibold text-primary-800">
                {guardando && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Guardando…
                  </>
                )}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Progreso real: tareas en la columna "Hecho" */}
            <div className="min-w-[13rem] bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg">
              <div className="flex items-baseline justify-between gap-3">
                <span id="progreso-etiqueta" className="text-sm font-semibold text-gray-800">
                  Progreso
                </span>
                <span className="text-sm font-bold text-green-700">{progreso}%</span>
              </div>
              <div
                role="progressbar"
                aria-labelledby="progreso-etiqueta"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progreso}
                aria-valuetext={`${tareasHechas} de ${totalTareas} tareas hechas (${progreso}%)`}
                className="mt-1 w-full bg-gray-200 rounded-full h-2 overflow-hidden"
              >
                <div className="bg-success-600 h-full rounded-full transition-all duration-500" style={{ width: `${progreso}%` }} />
              </div>
              <p className="text-sm text-gray-700 mt-1">
                {listaHecho
                  ? `${tareasHechas} de ${totalTareas} tarea${totalTareas !== 1 ? 's' : ''} hecha${totalTareas !== 1 ? 's' : ''}`
                  : 'No hay columna "Hecho"'}
              </p>
            </div>

            <Button onClick={() => abrirCrear()} title="Nueva tarea (n)" aria-keyshortcuts="n" disabled={listas.length === 0}>
              <Plus className="h-5 w-5" aria-hidden="true" />
              Nueva tarea
            </Button>
          </div>
        </div>

        {/* Búsqueda y filtros */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-end gap-3" role="search" aria-label="Buscar y filtrar tareas">
          <div className="flex-1 min-w-[14rem]">
            <label htmlFor="buscar-tareas" className="block text-sm font-semibold text-gray-800 mb-1">
              Buscar tareas
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-700 pointer-events-none" aria-hidden="true" />
              <input
                ref={buscador}
                id="buscar-tareas"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && busqueda) {
                    e.stopPropagation();
                    setBusqueda('');
                  }
                }}
                placeholder="Buscar tareas… (/)"
                aria-keyshortcuts="/"
                title="Busca en título y descripción (atajo: /)"
                className="w-full pl-9 pr-3 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-600"
              />
            </div>
          </div>

          <div className="min-w-[12rem]">
            <label htmlFor="filtro-miembro" className="block text-sm font-semibold text-gray-800 mb-1">
              Asignada a
            </label>
            <select
              id="filtro-miembro"
              value={filtroMiembro}
              onChange={(e) => setFiltroMiembro(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-600"
            >
              <option value={FILTRO_TODOS}>Todos</option>
              <option value={FILTRO_SIN_ASIGNAR}>Sin asignar</option>
              {miembros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                  {m.id === usuarioActual?.id ? ' (tú)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 py-2" aria-live="polite">
            <p className="text-sm text-gray-800">
              Mostrando <span className="font-semibold">{tareasVisibles.length}</span> de{' '}
              <span className="font-semibold">{totalTareas}</span> tareas
            </p>
            {filtrando && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-800 underline hover:text-primary-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Ayuda inicial cuando el tablero está vacío */}
      {totalTareas === 0 && (
        <aside className="mt-4 flex gap-3 bg-primary-50 border border-sky-200 rounded-xl p-4 text-gray-900" aria-label="Cómo empezar">
          <Lightbulb className="h-6 w-6 text-primary-800 shrink-0" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Tu tablero está vacío. Así se usa:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Pulsa <strong>Nueva tarea</strong> (o la tecla <kbd className="px-1 border border-gray-400 rounded bg-white">n</kbd>) o
                "Agregar tarea" al pie de una columna.
              </li>
              <li>Arrastra la tarea por su asa de puntos hacia "En Progreso" y luego a "Hecho" a medida que avance.</li>
              <li>Haz clic en una tarea para ver su detalle, editarla, asignarla o eliminarla.</li>
            </ol>
          </div>
        </aside>
      )}

      {filtrando && (
        <p className="mt-3 text-sm text-gray-800">
          Estás viendo un tablero filtrado. Puedes seguir arrastrando tareas entre columnas; los contadores muestran
          "visibles de total".
        </p>
      )}

      {/* Tablero: scroll horizontal con ajuste por columna en pantallas pequeñas */}
      <div
        className={`mt-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 ${arrastrando ? '' : 'snap-x snap-mandatory lg:snap-none'}`}
        aria-label="Columnas del tablero"
        role="region"
        tabIndex={0}
      >
        <DragDropContext
          onDragStart={handleDragStart}
          onDragUpdate={handleDragUpdate}
          onDragEnd={handleDragEnd}
          dragHandleUsageInstructions="Para mover la tarea con el teclado: pulsa Espacio para levantarla, usa las flechas izquierda y derecha para cambiar de columna y pulsa Espacio para soltarla o Escape para cancelar."
        >
          <div className="flex gap-4 lg:gap-6 items-start w-max">
            {listas.map((lista) => {
              const deLaLista = tareasVisibles.filter((t) => t.listaId === lista.id);
              return (
                <div key={lista.id} className="snap-start shrink-0">
                  <KanbanColumn
                    lista={lista}
                    tareas={deLaLista}
                    totalSinFiltrar={tareas.filter((t) => t.listaId === lista.id).length}
                    filtrando={filtrando}
                    onAddTask={() => abrirCrear(lista.id)}
                    onTaskClick={(tarea) => {
                      setDetalleOculto(false);
                      setIdDetalle(tarea.id);
                    }}
                    onAssignClick={(tarea) => setIdAsignar(tarea.id)}
                  />
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Ventanas */}
      {crear.abierto && (
        <CreateTaskModal
          onClose={() => setCrear({ abierto: false, listaId: '' })}
          onCreate={handleCreateTask}
          listas={listas}
          listaPreseleccionada={crear.listaId}
          proyectoId={proyecto.id}
          miembros={miembros}
        />
      )}

      {tareaDetalle && (
        <TaskDetailModal
          key={tareaDetalle.id}
          tarea={tareaDetalle}
          listas={listas}
          oculto={detalleOculto || tareaAsignar !== null}
          onClose={() => setIdDetalle(null)}
          onGuardar={(cambios) => guardarCambios(tareaDetalle, cambios)}
          onCambiarColumna={(listaId) => moverTarea(tareaDetalle, listaId)}
          onAsignar={() => setIdAsignar(tareaDetalle.id)}
          onEliminar={() => void eliminarTarea(tareaDetalle)}
        />
      )}

      {tareaAsignar && (
        <AssignMembersModal
          key={tareaAsignar.id}
          tarea={tareaAsignar}
          onClose={() => setIdAsignar(null)}
          onAssign={handleAssignMembers}
          miembrosDisponibles={miembros}
        />
      )}
    </div>
  );
};
