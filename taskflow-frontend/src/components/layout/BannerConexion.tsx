import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

// Avisa cuando se pierde la conexión para que el usuario sepa que sus cambios no se guardarán
export const BannerConexion = () => {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine);

  useEffect(() => {
    const conectado = () => setEnLinea(true);
    const desconectado = () => setEnLinea(false);
    window.addEventListener('online', conectado);
    window.addEventListener('offline', desconectado);
    return () => {
      window.removeEventListener('online', conectado);
      window.removeEventListener('offline', desconectado);
    };
  }, []);

  if (enLinea) return null;

  return (
    <div role="alert" className="bg-warning-600 text-gray-900 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      Sin conexión a internet. Los cambios no se guardarán hasta que vuelva la conexión; lo que escribas en los formularios se conserva como borrador.
    </div>
  );
};
