import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  /** Texto de ayuda que se muestra bajo el campo y lo lee el lector de pantalla */
  ayuda?: string;
  /** Contenido adicional dentro del campo, a la derecha (p. ej. botón "mostrar contraseña") */
  accesorio?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, ayuda, accesorio, className = '', id, required, ...props }, ref) => {
    const idGenerado = useId();
    const idCampo = id ?? idGenerado;
    const idAyuda = `${idCampo}-ayuda`;
    const idError = `${idCampo}-error`;
    const describedBy =
      [props['aria-describedby'], ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(' ') ||
      undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={idCampo} className="block text-sm font-semibold text-gray-800 mb-2">
            {label}
            {required && (
              <>
                <span className="text-danger-600 ml-0.5" aria-hidden="true">
                  *
                </span>
                <span className="sr-only"> (obligatorio)</span>
              </>
            )}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div
              className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600 group-focus-within:text-primary-700 transition-colors"
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={idCampo}
            required={required}
            {...props}
            aria-invalid={error ? true : props['aria-invalid']}
            aria-describedby={describedBy}
            className={`
              w-full px-4 py-3 border-2 rounded-xl shadow-sm bg-white text-gray-900
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-1
              ${icon ? 'pl-11' : ''}
              ${accesorio ? 'pr-12' : ''}
              ${error
                ? 'border-danger-600 focus:border-danger-600 focus:ring-danger-500'
                : 'border-gray-400 focus:border-primary-700 focus:ring-primary-500'
              }
              placeholder:text-gray-500
              ${className}
            `}
          />
          {accesorio && <div className="absolute inset-y-0 right-0 pr-2 flex items-center">{accesorio}</div>}
        </div>
        {ayuda && !error && (
          <p id={idAyuda} className="mt-1.5 text-sm text-gray-700">
            {ayuda}
          </p>
        )}
        {ayuda && error && (
          <p id={idAyuda} className="sr-only">
            {ayuda}
          </p>
        )}
        {error && (
          <p id={idError} className="mt-1.5 text-sm font-medium text-danger-600" aria-live="polite">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
