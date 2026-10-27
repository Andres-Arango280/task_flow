import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { authService } from '../../services/authService';
import { describirError } from '../../lib/errores';
import type { Usuario } from '../../types';
import { Mail, UserCheck, AlertCircle, Search } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (userId: string) => Promise<void>;
  /** Ids de quienes ya pertenecen al equipo, para avisar antes de enviar */
  idsMiembros?: string[];
}

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface ErrorMostrado {
  mensaje: string;
  codigo?: string;
}

function estadoHttp(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

export const InviteMemberModal = ({ isOpen, onClose, onInvite, idsMiembros = [] }: InviteMemberModalProps) => {
  const [email, setEmail] = useState('');
  const [tocado, setTocado] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorMostrado | null>(null);
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<Usuario | null>(null);

  const emailLimpio = email.trim();
  const formatoValido = FORMATO_EMAIL.test(emailLimpio);
  const errorFormato =
    tocado && emailLimpio && !formatoValido ? 'Escribe un correo completo, por ejemplo: ana@empresa.com' : undefined;
  const yaEsMiembro = usuarioEncontrado ? idsMiembros.includes(usuarioEncontrado.id) : false;

  const handleSearch = async (evento?: { preventDefault: () => void }) => {
    evento?.preventDefault();
    setTocado(true);
    if (!formatoValido || isLoading) return;

    setIsLoading(true);
    setError(null);
    setUsuarioEncontrado(null);

    try {
      const usuario = await authService.searchByEmail(emailLimpio);
      if (!usuario?.id) {
        setError({ mensaje: `No hay ningún usuario registrado con el correo ${emailLimpio}.` });
      } else {
        setUsuarioEncontrado(usuario);
      }
    } catch (err) {
      if (estadoHttp(err) === 404) {
        setError({
          mensaje: `No hay ningún usuario registrado con el correo ${emailLimpio}. Pídele que cree su cuenta en TaskFlow y vuelve a intentarlo.`,
        });
      } else {
        const { mensaje, codigo } = describirError(err, 'No se pudo buscar al usuario');
        setError({ mensaje, codigo });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!usuarioEncontrado || yaEsMiembro) return;

    setIsLoading(true);
    setError(null);
    try {
      await onInvite(usuarioEncontrado.id);
      handleClose();
    } catch (err) {
      const estado = estadoHttp(err);
      if (estado === 409) {
        setError({ mensaje: `${usuarioEncontrado.nombre || emailLimpio} ya es miembro de este equipo.` });
      } else if (estado === 404) {
        setError({ mensaje: `No hay ningún usuario registrado con el correo ${emailLimpio}.` });
      } else {
        const { mensaje, codigo } = describirError(err, 'No se pudo añadir al miembro');
        setError({ mensaje, codigo });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setTocado(false);
    setError(null);
    setUsuarioEncontrado(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invitar a un miembro"
      descripcion="La persona debe estar registrada en TaskFlow. Búscala por su correo exacto."
    >
      <div className="space-y-4">
        <form onSubmit={handleSearch} noValidate className="flex flex-col sm:flex-row sm:items-start gap-2">
          <div className="flex-1">
            <Input
              type="email"
              label="Correo electrónico"
              placeholder="ana@empresa.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setUsuarioEncontrado(null);
                setError(null);
              }}
              onBlur={() => emailLimpio && setTocado(true)}
              icon={<Mail size={20} />}
              autoComplete="email"
              required
              error={errorFormato}
              ayuda="Pulsa Intro o «Buscar» para comprobar que la cuenta existe."
            />
          </div>
          <Button type="submit" isLoading={isLoading && !usuarioEncontrado} disabled={!emailLimpio} className="sm:mt-7">
            <Search className="h-4 w-4" aria-hidden="true" />
            Buscar
          </Button>
        </form>

        {error && (
          <div
            role="alert"
            className="p-3 bg-danger-50 border border-danger-600 rounded-lg text-gray-900 text-sm flex items-start gap-2"
          >
            <AlertCircle className="h-5 w-5 text-danger-600 shrink-0" aria-hidden="true" />
            <div>
              <p>{error.mensaje}</p>
              {error.codigo && <p className="mt-1 text-gray-700">Código de referencia: {error.codigo}</p>}
            </div>
          </div>
        )}

        {usuarioEncontrado && (
          <div className="p-4 bg-success-50 border border-success-600 rounded-lg" aria-live="polite">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 bg-success-600 rounded-full flex items-center justify-center text-white font-semibold"
                aria-hidden="true"
              >
                {(usuarioEncontrado.nombre?.trim() || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{usuarioEncontrado.nombre || 'Sin nombre'}</p>
                <p className="text-sm text-gray-700 break-all">{usuarioEncontrado.email}</p>
              </div>
            </div>
            {yaEsMiembro ? (
              <p className="text-sm font-medium text-gray-900">Esta persona ya es miembro del equipo.</p>
            ) : (
              <Button type="button" onClick={handleInvite} isLoading={isLoading} className="w-full">
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                Añadir al equipo
              </Button>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
