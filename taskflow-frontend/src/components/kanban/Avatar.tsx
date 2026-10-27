import type { Usuario } from '../../types';

const COLORES = ['bg-blue-700', 'bg-purple-700', 'bg-pink-700', 'bg-green-700', 'bg-amber-700', 'bg-indigo-700'];

// Color estable por usuario para que la misma persona siempre se vea igual
function colorDe(id: string) {
  let suma = 0;
  for (const caracter of id) suma += caracter.charCodeAt(0);
  return COLORES[suma % COLORES.length];
}

interface AvatarProps {
  usuario: Usuario;
  tamano?: 'sm' | 'md';
  className?: string;
}

export const Avatar = ({ usuario, tamano = 'md', className = '' }: AvatarProps) => {
  const nombre = usuario.nombre?.trim() || 'Usuario';
  const medidas = tamano === 'sm' ? 'w-7 h-7 text-sm' : 'w-10 h-10 text-base';
  return (
    <span
      className={`${medidas} ${colorDe(usuario.id)} rounded-full inline-flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      title={nombre}
      aria-hidden="true"
    >
      {nombre.charAt(0).toUpperCase()}
    </span>
  );
};
