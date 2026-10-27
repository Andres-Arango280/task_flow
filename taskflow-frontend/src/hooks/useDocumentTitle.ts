import { useEffect } from 'react';

export function useDocumentTitle(titulo: string | undefined) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · TaskFlow` : 'TaskFlow';
  }, [titulo]);
}
