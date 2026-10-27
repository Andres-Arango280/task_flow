import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { describirError } from '../../lib/errores';

type TipoAviso = 'exito' | 'error' | 'info';

interface AccionAviso {
  etiqueta: string;
  alPulsar: () => void;
}

interface Aviso {
  id: number;
  tipo: TipoAviso;
  mensaje: string;
  codigo?: string;
  accion?: AccionAviso;
}

interface OpcionesAviso {
  accion?: AccionAviso;
  duracionMs?: number;
}

interface ApiAvisos {
  exito: (mensaje: string, opciones?: OpcionesAviso) => void;
  info: (mensaje: string, opciones?: OpcionesAviso) => void;
  error: (errorOMensaje: unknown, contexto?: string) => void;
}

const ContextoAvisos = createContext<ApiAvisos | null>(null);

const ESTILOS: Record<TipoAviso, { caja: string; icono: ReactNode; titulo: string }> = {
  exito: {
    caja: 'bg-white border-success-600 text-gray-900',
    icono: <CheckCircle2 className="h-5 w-5 text-success-600 shrink-0" aria-hidden="true" />,
    titulo: 'Listo',
  },
  error: {
    caja: 'bg-white border-danger-600 text-gray-900',
    icono: <AlertTriangle className="h-5 w-5 text-danger-600 shrink-0" aria-hidden="true" />,
    titulo: 'Error',
  },
  info: {
    caja: 'bg-white border-primary-600 text-gray-900',
    icono: <Info className="h-5 w-5 text-primary-700 shrink-0" aria-hidden="true" />,
    titulo: 'Aviso',
  },
};

export const ProveedorAvisos = ({ children }: { children: ReactNode }) => {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguienteId = useRef(1);

  const cerrar = useCallback((id: number) => {
    setAvisos((actuales) => actuales.filter((aviso) => aviso.id !== id));
  }, []);

  const mostrar = useCallback(
    (aviso: Omit<Aviso, 'id'>, duracionMs: number) => {
      const id = siguienteId.current++;
      setAvisos((actuales) => [...actuales.slice(-3), { ...aviso, id }]);
      window.setTimeout(() => cerrar(id), duracionMs);
    },
    [cerrar],
  );

  const api = useMemo<ApiAvisos>(
    () => ({
      exito: (mensaje, opciones) =>
        mostrar({ tipo: 'exito', mensaje, accion: opciones?.accion }, opciones?.duracionMs ?? (opciones?.accion ? 7000 : 4000)),
      info: (mensaje, opciones) =>
        mostrar({ tipo: 'info', mensaje, accion: opciones?.accion }, opciones?.duracionMs ?? 5000),
      error: (errorOMensaje, contexto) => {
        const { mensaje, codigo } =
          typeof errorOMensaje === 'string'
            ? { mensaje: errorOMensaje, codigo: undefined }
            : describirError(errorOMensaje, contexto);
        mostrar({ tipo: 'error', mensaje, codigo }, 8000);
      },
    }),
    [mostrar],
  );

  return (
    <ContextoAvisos.Provider value={api}>
      {children}
      <div
        className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-3 sm:w-96"
        aria-live="polite"
        aria-atomic="false"
      >
        {avisos.map((aviso) => {
          const estilo = ESTILOS[aviso.tipo];
          return (
            <div
              key={aviso.id}
              role={aviso.tipo === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-3 rounded-xl border-l-4 shadow-xl p-4 animate-slideInUp ${estilo.caja}`}
            >
              {estilo.icono}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{estilo.titulo}</p>
                <p className="text-sm text-gray-800 break-words">{aviso.mensaje}</p>
                {aviso.codigo && <p className="text-sm text-gray-700 mt-1">Código de referencia: {aviso.codigo}</p>}
                {aviso.accion && (
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-primary-700 underline hover:text-primary-900"
                    onClick={() => {
                      aviso.accion?.alPulsar();
                      cerrar(aviso.id);
                    }}
                  >
                    {aviso.accion.etiqueta}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => cerrar(aviso.id)}
                className="text-gray-600 hover:text-gray-900 p-1 rounded"
                aria-label="Cerrar aviso"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ContextoAvisos.Provider>
  );
};

export function useAvisos(): ApiAvisos {
  const contexto = useContext(ContextoAvisos);
  if (!contexto) {
    throw new Error('useAvisos debe usarse dentro de ProveedorAvisos');
  }
  return contexto;
}
