import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAvisos } from '../ui/Toast';
import { useBorrador } from '../../hooks/useBorrador';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (nombre: string) => Promise<void>;
  /** Identifica el borrador para que cada equipo conserve el suyo */
  equipoId?: string;
}

const LIMITE_NOMBRE = 255;

export const CreateProjectModal = ({ isOpen, onClose, onCreate, equipoId = 'general' }: CreateProjectModalProps) => {
  const [nombre, setNombre, descartarBorrador] = useBorrador(`proyecto:${equipoId}`, '');
  const [isLoading, setIsLoading] = useState(false);
  const avisos = useAvisos();
  const limpio = nombre.trim();

  const handleCreate = async (evento?: { preventDefault: () => void }) => {
    evento?.preventDefault();
    if (!limpio || isLoading) return;

    setIsLoading(true);
    try {
      await onCreate(limpio);
      descartarBorrador();
      onClose();
    } catch (error) {
      avisos.error(error, 'No se pudo crear el proyecto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo proyecto"
      descripcion="Un proyecto es un tablero Kanban compartido con todo el equipo."
    >
      <form onSubmit={handleCreate} className="space-y-5" noValidate>
        <div className="rounded-lg bg-primary-50 border border-primary-100 p-3 text-sm text-gray-800">
          Se crearán automáticamente 3 listas: <strong>Por Hacer</strong>, <strong>En Progreso</strong> y{' '}
          <strong>Hecho</strong>.
        </div>

        <Input
          label="Nombre del proyecto"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej.: Desarrollo de la API"
          maxLength={LIMITE_NOMBRE}
          required
          ayuda={`${nombre.length}/${LIMITE_NOMBRE} caracteres. Lo que escribas se guarda como borrador si cierras la ventana.`}
        />

        <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!limpio} isLoading={isLoading}>
            Crear proyecto
          </Button>
        </div>
      </form>
    </Modal>
  );
};
