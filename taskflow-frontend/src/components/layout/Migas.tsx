import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface Miga {
  etiqueta: string;
  ruta?: string;
}

// Ruta de navegación: indica dónde está el usuario y permite volver a cualquier nivel
export const Migas = ({ items }: { items: Miga[] }) => (
  <nav aria-label="Ruta de navegación" className="mb-4">
    <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-700">
      <li className="flex items-center">
        <Link to="/" className="flex items-center gap-1 underline-offset-2 hover:underline hover:text-primary-700">
          <Home className="h-4 w-4" aria-hidden="true" />
          Mis equipos
        </Link>
      </li>
      {items.map((item, indice) => {
        const ultimo = indice === items.length - 1;
        return (
          <li key={`${item.etiqueta}-${indice}`} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-gray-500" aria-hidden="true" />
            {item.ruta && !ultimo ? (
              <Link to={item.ruta} className="underline-offset-2 hover:underline hover:text-primary-700">
                {item.etiqueta}
              </Link>
            ) : (
              <span className="font-semibold text-gray-900" aria-current={ultimo ? 'page' : undefined}>
                {item.etiqueta}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);
