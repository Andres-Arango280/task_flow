import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  descripcion?: string;
  rol?: 'dialog' | 'alertdialog';
  ancho?: 'md' | 'lg';
}

const ENFOCABLES = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal = ({ isOpen, onClose, title, children, descripcion, rol = 'dialog', ancho = 'md' }: ModalProps) => {
  const idTitulo = useId();
  const idDescripcion = useId();
  const panel = useRef<HTMLDivElement>(null);
  const alCerrar = useRef(onClose);
  alCerrar.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const enfocadoAntes = document.activeElement as HTMLElement | null;

    // Enfoca el primer campo (o el primer botón) al abrir
    const primerCampo =
      panel.current?.querySelector<HTMLElement>('input, textarea, select') ??
      panel.current?.querySelector<HTMLElement>(ENFOCABLES);
    primerCampo?.focus();

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.stopPropagation();
        alCerrar.current();
        return;
      }
      // Mantiene el foco dentro de la ventana al usar Tab
      if (evento.key === 'Tab' && panel.current) {
        const elementos = Array.from(panel.current.querySelectorAll<HTMLElement>(ENFOCABLES));
        if (elementos.length === 0) return;
        const primero = elementos[0];
        const ultimo = elementos[elementos.length - 1];
        if (evento.shiftKey && document.activeElement === primero) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primero.focus();
        }
      }
    };

    document.addEventListener('keydown', alPulsar);
    return () => {
      document.removeEventListener('keydown', alPulsar);
      enfocadoAntes?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="flex min-h-full items-center justify-center p-4 py-8">
        <div
          ref={panel}
          role={rol}
          aria-modal="true"
          aria-labelledby={idTitulo}
          aria-describedby={descripcion ? idDescripcion : undefined}
          className={`relative bg-white rounded-2xl shadow-2xl w-full p-6 sm:p-8 border border-gray-200 animate-scaleIn ${
            ancho === 'lg' ? 'max-w-2xl' : 'max-w-md'
          }`}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 id={idTitulo} className="text-2xl font-bold text-gray-900">
                {title}
              </h2>
              {descripcion && (
                <p id={idDescripcion} className="mt-1 text-sm text-gray-700">
                  {descripcion}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg"
              aria-label="Cerrar ventana (Esc)"
              title="Cerrar (Esc)"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="border-t border-gray-200 pt-5 overflow-y-auto max-h-[calc(100vh-200px)]">{children}</div>
        </div>
      </div>
    </div>
  );
};
