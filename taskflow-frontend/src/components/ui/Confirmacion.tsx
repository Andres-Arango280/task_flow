import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface OpcionesConfirmacion {
  titulo: string;
  mensaje: string;
  consecuencias?: string[];
  textoConfirmar?: string;
  peligroso?: boolean;
}

type Confirmar = (opciones: OpcionesConfirmacion) => Promise<boolean>;

const ContextoConfirmacion = createContext<Confirmar | null>(null);

// Ventana de confirmación reutilizable que explica las consecuencias antes de actuar
export const ProveedorConfirmacion = ({ children }: { children: ReactNode }) => {
  const [opciones, setOpciones] = useState<OpcionesConfirmacion | null>(null);
  const resolver = useRef<(valor: boolean) => void>(undefined);

  const confirmar = useCallback<Confirmar>((nuevas) => {
    setOpciones(nuevas);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const responder = (valor: boolean) => {
    resolver.current?.(valor);
    resolver.current = undefined;
    setOpciones(null);
  };

  return (
    <ContextoConfirmacion.Provider value={confirmar}>
      {children}
      <Modal
        isOpen={opciones !== null}
        onClose={() => responder(false)}
        title={opciones?.titulo ?? ''}
        rol="alertdialog"
      >
        {opciones && (
          <div className="space-y-5">
            <div className="flex gap-3">
              {opciones.peligroso && <AlertTriangle className="h-6 w-6 text-danger-600 shrink-0" aria-hidden="true" />}
              <div className="space-y-2">
                <p className="text-gray-800">{opciones.mensaje}</p>
                {opciones.consecuencias && opciones.consecuencias.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                    {opciones.consecuencias.map((consecuencia) => (
                      <li key={consecuencia}>{consecuencia}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="secondary" onClick={() => responder(false)}>
                Cancelar
              </Button>
              <Button variant={opciones.peligroso ? 'danger' : 'primary'} onClick={() => responder(true)}>
                {opciones.textoConfirmar ?? 'Confirmar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ContextoConfirmacion.Provider>
  );
};

export function useConfirmacion(): Confirmar {
  const contexto = useContext(ContextoConfirmacion);
  if (!contexto) {
    throw new Error('useConfirmacion debe usarse dentro de ProveedorConfirmacion');
  }
  return contexto;
}
