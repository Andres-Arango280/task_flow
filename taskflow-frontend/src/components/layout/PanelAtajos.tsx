import { Modal } from '../ui/Modal';
import { ATAJOS } from '../../hooks/useAtajos';

export const TablaAtajos = () => {
  const ambitos = [...new Set(ATAJOS.map((atajo) => atajo.ambito))];
  return (
    <div className="space-y-4">
      {ambitos.map((ambito) => (
        <div key={ambito}>
          <h3 className="text-sm font-bold text-gray-900 mb-2">{ambito}</h3>
          <dl className="space-y-1.5">
            {ATAJOS.filter((atajo) => atajo.ambito === ambito).map((atajo) => (
              <div key={atajo.tecla} className="flex items-center justify-between gap-4 text-sm">
                <dt className="text-gray-800">{atajo.descripcion}</dt>
                <dd>
                  <kbd className="px-2 py-1 rounded-md border border-gray-400 bg-gray-100 font-mono text-sm text-gray-900">
                    {atajo.tecla}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
};

export const PanelAtajos = ({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) => (
  <Modal
    isOpen={abierto}
    onClose={alCerrar}
    title="Atajos de teclado"
    descripcion="Funcionan cuando no estás escribiendo en un campo. Puedes desactivarlos en Preferencias."
  >
    <TablaAtajos />
  </Modal>
);
