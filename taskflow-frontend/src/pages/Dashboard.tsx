import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { equiposService } from '../services/equiposService';
import { proyectosService } from '../services/proyectosService';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useAvisos } from '../components/ui/Toast';
import { leerRecientes, quitarRecientes } from '../components/equipo/recientes';
import type { ProyectoReciente } from '../components/equipo/recientes';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAtajos } from '../hooks/useAtajos';
import { useBorrador } from '../hooks/useBorrador';
import { coincide } from '../lib/busqueda';
import { describirError } from '../lib/errores';
import type { Equipo } from '../types';
import {
  Plus,
  Users,
  Crown,
  ChevronRight,
  Search,
  CheckCircle2,
  Circle,
  X,
  LayoutGrid,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

const LIMITE_NOMBRE = 255;
const CLAVE_PRIMEROS_PASOS = 'taskflow:primeros-pasos-oculto';

function leerOculto(): boolean {
  try {
    return localStorage.getItem(CLAVE_PRIMEROS_PASOS) === '1';
  } catch {
    return false;
  }
}

function contarMiembros(equipo: Equipo): number {
  return new Set([equipo.lider?.id, ...(equipo.miembros ?? []).map((m) => m.id)].filter(Boolean)).size;
}

export const Dashboard = () => {
  useDocumentTitle('Mis equipos');
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const avisos = useAvisos();

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<{ mensaje: string; codigo: string } | null>(null);
  const [totalProyectos, setTotalProyectos] = useState<number | null>(null);
  const [recientes, setRecientes] = useState<ProyectoReciente[]>(() => leerRecientes());
  const [busqueda, setBusqueda] = useState('');
  const [primerosPasosOculto, setPrimerosPasosOculto] = useState(leerOculto);

  const [showModal, setShowModal] = useState(false);
  const [nombreEquipo, setNombreEquipo, descartarBorrador] = useBorrador('equipo', '');
  const [isCreating, setIsCreating] = useState(false);

  // Comprueba qué proyectos recientes siguen existiendo y actualiza sus nombres
  const validarRecientes = useCallback(async (lista: Equipo[]) => {
    const resultados = await Promise.allSettled(lista.map((e) => proyectosService.getByEquipo(e.id)));
    let total = 0;
    let todosOk = true;
    const existentes = new Map<string, { nombre: string; equipoNombre: string }>();
    resultados.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        total += r.value.length;
        r.value.forEach((p) => existentes.set(p.id, { nombre: p.nombre, equipoNombre: lista[i].nombre }));
      } else {
        todosOk = false;
      }
    });
    setTotalProyectos(total);

    const guardados = leerRecientes();
    if (todosOk) {
      const obsoletos = guardados.filter((r) => !existentes.has(r.id)).map((r) => r.id);
      if (obsoletos.length) quitarRecientes(obsoletos);
    }
    setRecientes(
      guardados
        .filter((r) => !todosOk || existentes.has(r.id))
        .map((r) => ({ ...r, ...(existentes.get(r.id) ?? {}) })),
    );
  }, []);

  const loadEquipos = useCallback(async () => {
    setErrorCarga(null);
    try {
      const data = await equiposService.getAll();
      setEquipos(data);
      void validarRecientes(data);
    } catch (error) {
      setErrorCarga(describirError(error, 'No se pudieron cargar tus equipos'));
      avisos.error(error, 'No se pudieron cargar tus equipos');
    } finally {
      setIsLoading(false);
    }
  }, [avisos, validarRecientes]);

  useEffect(() => {
    void loadEquipos();
  }, [loadEquipos]);

  useAtajos({ e: () => setShowModal(true) });

  const nombreLimpio = nombreEquipo.trim();

  const handleCreateEquipo = async (evento?: { preventDefault: () => void }) => {
    evento?.preventDefault();
    if (!nombreLimpio || isCreating) return;
    setIsCreating(true);

    try {
      const creado = await equiposService.create(nombreLimpio);
      descartarBorrador();
      setShowModal(false);
      avisos.exito(`Equipo «${creado?.nombre ?? nombreLimpio}» creado. Ahora puedes invitar a tus compañeros.`, {
        accion: creado?.id ? { etiqueta: 'Abrir equipo', alPulsar: () => navigate(`/equipos/${creado.id}`) } : undefined,
      });
      await loadEquipos();
    } catch (error) {
      avisos.error(error, 'No se pudo crear el equipo');
    } finally {
      setIsCreating(false);
    }
  };

  const ocultarPrimerosPasos = () => {
    setPrimerosPasosOculto(true);
    try {
      localStorage.setItem(CLAVE_PRIMEROS_PASOS, '1');
    } catch {
      // Sin almacenamiento: se oculta solo durante esta visita
    }
  };

  const equiposFiltrados = useMemo(
    () => equipos.filter((e) => coincide(busqueda, e.nombre, e.lider?.nombre)),
    [equipos, busqueda],
  );

  const pasos = [
    { texto: 'Crear tu primer equipo', hecho: equipos.length > 0 },
    { texto: 'Invitar a un compañero por su correo', hecho: equipos.some((e) => contarMiembros(e) > 1) },
    { texto: 'Crear un proyecto dentro de un equipo', hecho: (totalProyectos ?? 0) > 0 },
    { texto: 'Abrir un tablero y mover una tarea entre listas', hecho: recientes.length > 0 },
  ];
  const pasosHechos = pasos.filter((p) => p.hecho).length;

  if (isLoading) {
    // Esqueleto con la misma estructura que la página para evitar saltos de diseño (CLS) al cargar
    return (
      <div className="pb-12" role="status" aria-live="polite">
        <span className="sr-only">Cargando tus equipos…</span>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8" aria-hidden="true">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="h-10 w-56 rounded-lg bg-gray-200 animate-pulse" />
              <div className="h-5 w-40 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="h-11 w-40 rounded-lg bg-gray-200 animate-pulse" />
          </div>
          <div className="h-40 rounded-2xl bg-gray-200 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Encabezado: un solo título y una sola acción principal */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Mis equipos</h1>
            <p className="mt-1 text-gray-800">
              {equipos.length === 0
                ? 'Organiza tu trabajo en equipos y proyectos.'
                : `Perteneces a ${equipos.length} ${equipos.length === 1 ? 'equipo' : 'equipos'}.`}
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} title="Nuevo equipo (e)">
            <Plus className="h-5 w-5" aria-hidden="true" />
            Nuevo equipo
          </Button>
        </header>

        {/* Primeros pasos */}
        {!primerosPasosOculto && !errorCarga && (
          <section aria-labelledby="titulo-primeros-pasos" className="card-elevated p-5 sm:p-6 border border-gray-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="titulo-primeros-pasos" className="text-xl font-bold text-gray-900">
                  Primeros pasos
                </h2>
                <p className="text-sm text-gray-700 mt-1">
                  {pasosHechos} de {pasos.length} completados.{' '}
                  <Link to="/ayuda" className="font-semibold text-primary-800 underline underline-offset-2 hover:text-primary-900">
                    Ver la guía de ayuda
                  </Link>
                </p>
              </div>
              <button
                type="button"
                onClick={ocultarPrimerosPasos}
                className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                aria-label="Ocultar la lista de primeros pasos"
                title="Ocultar"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <ol className="mt-4 grid gap-2 sm:grid-cols-2">
              {pasos.map((paso) => (
                <li key={paso.texto} className="flex items-center gap-2 text-gray-900">
                  {paso.hecho ? (
                    <CheckCircle2 className="h-5 w-5 text-success-600 shrink-0" aria-hidden="true" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-600 shrink-0" aria-hidden="true" />
                  )}
                  <span className={paso.hecho ? 'line-through text-gray-700' : ''}>{paso.texto}</span>
                  <span className="sr-only">{paso.hecho ? '(completado)' : '(pendiente)'}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Proyectos recientes */}
        {recientes.length > 0 && (
          <section aria-labelledby="titulo-recientes">
            <h2 id="titulo-recientes" className="text-xl font-bold text-gray-900 mb-3">
              Proyectos recientes
            </h2>
            <ul className="flex flex-wrap gap-3">
              {recientes.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/proyectos/${p.id}`}
                    className="flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 hover:border-primary-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                  >
                    <LayoutGrid className="h-5 w-5 text-primary-700 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold text-gray-900 underline underline-offset-2">{p.nombre}</span>
                      {p.equipoNombre && <span className="block text-sm text-gray-700">{p.equipoNombre}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Equipos */}
        {errorCarga ? (
          <div role="alert" className="card-elevated p-8 text-center border border-danger-600">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-danger-600" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No se pudieron cargar tus equipos</h2>
            <p className="text-gray-800">{errorCarga.mensaje}</p>
            <p className="text-sm text-gray-700 mt-1 mb-5">Código de referencia: {errorCarga.codigo}</p>
            <Button
              onClick={() => {
                setIsLoading(true);
                void loadEquipos();
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : equipos.length === 0 ? (
          <div className="card-elevated p-8 sm:p-12 text-center border-2 border-dashed border-gray-300">
            <Users className="h-12 w-12 mx-auto mb-4 text-primary-700" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Todavía no tienes equipos</h2>
            <p className="text-gray-800 mb-6 max-w-md mx-auto">
              Un equipo agrupa a las personas con las que trabajas y sus proyectos. Crea uno y luego invita a tus
              compañeros por su correo.
            </p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-5 w-5" aria-hidden="true" />
              Crear mi primer equipo
            </Button>
          </div>
        ) : (
          <section aria-labelledby="titulo-equipos">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <h2 id="titulo-equipos" className="text-xl font-bold text-gray-900">
                Equipos
              </h2>
              <div className="w-full sm:w-72">
                <label htmlFor="buscar-equipos" className="sr-only">
                  Buscar equipos por nombre
                </label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="buscar-equipos"
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar equipo…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border-2 border-gray-400 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-primary-700 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <p className="sr-only" aria-live="polite">
              {busqueda ? `${equiposFiltrados.length} equipos coinciden con la búsqueda` : ''}
            </p>

            {equiposFiltrados.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
                <p className="font-semibold text-gray-900">Ningún equipo coincide con «{busqueda}»</p>
                <p className="text-sm text-gray-700 mt-1 mb-4">Revisa la escritura o prueba con otra palabra.</p>
                <Button variant="secondary" onClick={() => setBusqueda('')}>
                  Limpiar búsqueda
                </Button>
              </div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {equiposFiltrados.map((equipo) => {
                  const esLider = equipo.lider?.id === user?.id;
                  const total = contarMiembros(equipo);
                  return (
                    <li key={equipo.id}>
                      <Link
                        to={`/equipos/${equipo.id}`}
                        data-testid="tarjeta-equipo"
                        className="group flex h-full flex-col rounded-xl border border-gray-300 bg-white p-5 shadow-sm hover:border-primary-700 hover:shadow-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:underline break-words">
                            {equipo.nombre}
                          </h3>
                          {esLider && (
                            <span className="inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-900 border border-yellow-300">
                              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                              Líder
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-4">
                          Líder: <span className="font-medium text-gray-900">{equipo.lider?.nombre}</span>
                        </p>
                        <div className="mt-auto pt-3 border-t border-gray-200 flex items-center justify-between text-sm">
                          <span className="inline-flex items-center gap-1.5 text-gray-800">
                            <Users className="h-4 w-4 text-gray-700" aria-hidden="true" />
                            {total} {total === 1 ? 'miembro' : 'miembros'}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-primary-800">
                            Abrir
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* Ventana para crear equipo */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nuevo equipo"
        descripcion="Serás el líder: podrás invitar miembros y crear proyectos."
      >
        <form onSubmit={handleCreateEquipo} className="space-y-6" noValidate>
          <Input
            label="Nombre del equipo"
            value={nombreEquipo}
            onChange={(e) => setNombreEquipo(e.target.value)}
            placeholder="Ej.: Equipo Backend"
            maxLength={LIMITE_NOMBRE}
            required
            ayuda={`${nombreEquipo.length}/${LIMITE_NOMBRE} caracteres. Se guarda un borrador si cierras la ventana.`}
          />
          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!nombreLimpio} isLoading={isCreating}>
              Crear equipo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
