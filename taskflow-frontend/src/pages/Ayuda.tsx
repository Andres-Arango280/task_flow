import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, LifeBuoy, ListChecks, Keyboard, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { coincide } from '../lib/busqueda';
import { TablaAtajos } from '../components/layout/PanelAtajos';
import { Migas } from '../components/layout/Migas';

interface Pregunta {
  pregunta: string;
  respuesta: string;
  claves: string;
}

const PREGUNTAS_FRECUENTES: Pregunta[] = [
  {
    pregunta: '¿Cómo creo mi primer equipo?',
    respuesta: 'En "Mis equipos" pulsa "Nuevo equipo" (o la tecla e), escribe un nombre, por ejemplo "Equipo Backend", y pulsa "Crear equipo". Quedarás como líder.',
    claves: 'crear equipo nuevo grupo empezar',
  },
  {
    pregunta: '¿Cómo invito a un compañero?',
    respuesta: 'Tu compañero debe registrarse primero. Después, en la página del equipo, el líder pulsa "Invitar" (o la tecla m), escribe el correo con el que se registró, por ejemplo ana@empresa.com, pulsa "Buscar" y luego "Añadir al equipo".',
    claves: 'invitar agregar añadir miembro compañero usuario correo email',
  },
  {
    pregunta: '¿Cómo creo un proyecto?',
    respuesta: 'Abre un equipo y pulsa "Nuevo proyecto" (o la tecla p). Cada proyecto se crea con tres columnas por defecto: Por Hacer, En Progreso y Hecho.',
    claves: 'crear proyecto tablero kanban columnas listas',
  },
  {
    pregunta: '¿Cómo creo, edito o elimino una tarea?',
    respuesta: 'En el tablero pulsa "Nueva tarea" (o la tecla n) o "Agregar tarea" al pie de una columna. Para editarla o eliminarla, haz clic sobre la tarea: se abrirá su detalle con los botones "Guardar cambios" y "Eliminar".',
    claves: 'crear editar modificar eliminar borrar tarea detalle',
  },
  {
    pregunta: '¿Cómo muevo una tarea de columna?',
    respuesta: 'Arrástrala con el ratón desde el asa de puntos hasta otra columna. Con el teclado: sitúate en la tarea con Tab, pulsa Espacio para levantarla, usa las flechas y Espacio para soltarla. También puedes cambiar la columna desde el detalle de la tarea. Después de mover aparece "Deshacer" durante unos segundos.',
    claves: 'mover arrastrar columna estado progreso hecho teclado',
  },
  {
    pregunta: '¿Cómo asigno una tarea a alguien?',
    respuesta: 'Pulsa el icono de personas de la tarea o abre su detalle y elige "Asignar miembros". Solo puedes asignar a miembros del equipo.',
    claves: 'asignar responsable miembro persona',
  },
  {
    pregunta: '¿Cómo busco una tarea?',
    respuesta: 'En el tablero usa el buscador (o la tecla /). Encuentra coincidencias en el título y la descripción aunque escribas sin tildes o con pequeños errores, y puedes filtrar por persona asignada.',
    claves: 'buscar encontrar filtrar tarea',
  },
  {
    pregunta: '¿Puedo deshacer una acción?',
    respuesta: 'Sí: al mover, eliminar una tarea o quitar un miembro aparece un aviso con el botón "Deshacer" durante unos segundos.',
    claves: 'deshacer revertir error equivocado recuperar',
  },
  {
    pregunta: '¿Se guarda mi trabajo automáticamente?',
    respuesta: 'Sí. Cada cambio se guarda en el servidor al instante y lo verás desde cualquier dispositivo. Lo que escribes en los formularios se guarda como borrador aunque cierres la ventana.',
    claves: 'guardar autoguardado borrador perder cambios dispositivo',
  },
  {
    pregunta: '¿Por qué no veo los cambios de mis compañeros?',
    respuesta: 'El tablero y el equipo se actualizan solos cada 15 segundos; la hora de la última actualización aparece en la cabecera. Si no hay conexión verás un aviso amarillo arriba.',
    claves: 'actualizar sincronizar compañeros cambios tiempo real',
  },
  {
    pregunta: '¿Cómo cambio el tamaño del texto o el contraste?',
    respuesta: 'En "Preferencias" puedes elegir texto normal, grande o muy grande, activar alto contraste, reducir animaciones y desactivar los atajos. "Restablecer valores por defecto" vuelve a la configuración inicial.',
    claves: 'texto letra tamaño contraste accesibilidad animaciones visión preferencias',
  },
  {
    pregunta: '¿Qué datos guarda TaskFlow y cómo borro mi cuenta?',
    respuesta: 'Guardamos tu nombre, correo, contraseña cifrada y el contenido de tus equipos. Puedes ver el detalle en "Privacidad" y eliminar tu cuenta desde "Preferencias".',
    claves: 'privacidad datos cuenta borrar eliminar correo',
  },
];

const PASOS = [
  'Regístrate con tu nombre, correo y una contraseña de al menos 8 caracteres con letras y números.',
  'Crea un equipo: por ejemplo "Equipo Backend". Serás su líder.',
  'Invita a tus compañeros escribiendo el correo con el que se registraron.',
  'Crea un proyecto dentro del equipo, por ejemplo "Lanzamiento v1".',
  'Añade tareas, asígnalas y muévelas de "Por Hacer" a "En Progreso" y "Hecho".',
];

const CODIGOS = [
  ['TF-RED', 'No hay conexión con el servidor.', 'Revisa tu conexión a internet y vuelve a intentarlo.'],
  ['TF-400', 'Algún dato del formulario no es válido.', 'Lee el mensaje: indica qué campo corregir.'],
  ['TF-401', 'Tu sesión caducó.', 'Vuelve a iniciar sesión.'],
  ['TF-403', 'No tienes permiso para esa acción.', 'Pide al líder del equipo que la haga o que te invite.'],
  ['TF-404', 'El elemento ya no existe.', 'Otro miembro pudo eliminarlo; vuelve a la página anterior.'],
  ['TF-409', 'Conflicto con datos existentes.', 'Por ejemplo, el correo ya está registrado o el usuario ya es miembro.'],
  ['TF-500', 'Error interno del servidor.', 'Espera unos minutos y vuelve a intentarlo.'],
];

export const Ayuda = () => {
  useDocumentTitle('Ayuda');
  const [consulta, setConsulta] = useState('');

  const resultados = useMemo(
    () => PREGUNTAS_FRECUENTES.filter((p) => coincide(consulta, p.pregunta, p.respuesta, p.claves)),
    [consulta],
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <Migas items={[{ etiqueta: 'Ayuda' }]} />

      <header>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <LifeBuoy className="h-8 w-8 text-primary-700" aria-hidden="true" />
          Ayuda
        </h1>
        <p className="text-gray-700 mt-1">Guía rápida, preguntas frecuentes y solución de problemas.</p>
      </header>

      <section aria-labelledby="titulo-asistente" className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
        <h2 id="titulo-asistente" className="text-xl font-bold text-gray-900 mb-1">
          ¿En qué te ayudamos?
        </h2>
        <p className="text-sm text-gray-700 mb-4">
          Escribe tu duda con tus palabras; las respuestas aparecen al instante aunque escribas sin tildes o con errores.
        </p>
        <label htmlFor="buscar-ayuda" className="sr-only">
          Buscar en la ayuda
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" aria-hidden="true" />
          <input
            id="buscar-ayuda"
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Ej: como muevo una tarea"
            className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary-600"
          />
        </div>

        <div className="mt-5 space-y-3" aria-live="polite">
          {resultados.length === 0 ? (
            <p className="text-gray-800">
              No encontramos una respuesta para "{consulta}". Prueba con otras palabras, por ejemplo "invitar", "mover" o "borrar".
            </p>
          ) : (
            resultados.map((p) => (
              <details key={p.pregunta} className="group rounded-xl border border-gray-200 p-4 open:bg-primary-50/40" open={consulta.length > 2}>
                <summary className="cursor-pointer font-semibold text-gray-900">{p.pregunta}</summary>
                <p className="mt-2 text-gray-800">{p.respuesta}</p>
              </details>
            ))
          )}
        </div>
      </section>

      <section aria-labelledby="titulo-pasos" className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
        <h2 id="titulo-pasos" className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary-700" aria-hidden="true" />
          Primeros pasos
        </h2>
        <ol className="list-decimal pl-6 space-y-2 text-gray-800">
          {PASOS.map((paso) => (
            <li key={paso}>{paso}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="titulo-errores" className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
        <h2 id="titulo-errores" className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-warning-600" aria-hidden="true" />
          Solución de problemas y códigos de error
        </h2>
        <p className="text-gray-800 mb-4">
          Cuando algo falla, el aviso muestra un código de referencia. Esto es lo que significa cada uno:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-300 text-gray-900">
                <th scope="col" className="py-2 pr-4">Código</th>
                <th scope="col" className="py-2 pr-4">Qué pasó</th>
                <th scope="col" className="py-2">Qué hacer</th>
              </tr>
            </thead>
            <tbody>
              {CODIGOS.map(([codigo, que, hacer]) => (
                <tr key={codigo} className="border-b border-gray-200 text-gray-800">
                  <td className="py-2 pr-4 font-mono font-semibold">{codigo}</td>
                  <td className="py-2 pr-4">{que}</td>
                  <td className="py-2">{hacer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="titulo-atajos" className="bg-white rounded-2xl shadow-card p-6 border border-gray-200">
        <h2 id="titulo-atajos" className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Keyboard className="h-6 w-6 text-primary-700" aria-hidden="true" />
          Atajos de teclado
        </h2>
        <TablaAtajos />
      </section>

      <p className="text-gray-800 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-success-600" aria-hidden="true" />
        Consulta qué datos guardamos en{' '}
        <Link to="/privacidad" className="font-semibold text-primary-700 underline">
          Privacidad
        </Link>
        .
      </p>
    </div>
  );
};
