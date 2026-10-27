import { coincide, normalizar } from '../../src/lib/busqueda';
import { tipoColumna } from '../../src/components/kanban/estilosColumna';

describe('Unidad - lib/busqueda y tipo de columna', () => {
  it('UNI-BUS-01 normalizar() quita tildes, mayúsculas y espacios', () => {
    expect(normalizar('  Diseñar CANCIÓN  ')).to.eq('disenar cancion');
    expect(normalizar('Ñandú')).to.eq('nandu');
    cy.registrarCaso('UNI-BUS-01', 'normalizar("  Diseñar CANCIÓN  ") devolvió "disenar cancion" y normalizar("Ñandú") devolvió "nandu".');
  });

  it('UNI-BUS-02 coincide() encuentra textos con tildes, mayúsculas y faltas leves', () => {
    const casos: [string, string, boolean][] = [
      ['DISENAR', 'Diseñar pantalla de inicio', true],
      ['documentasion', 'Escribir documentación', true],
      ['pantala', 'Diseñar pantalla', true],
      ['base datos', 'Configurar base de datos', true],
      ['', 'cualquier cosa', true],
    ];
    casos.forEach(([consulta, texto, esperado]) => expect(coincide(consulta, texto), `${consulta} ~ ${texto}`).to.eq(esperado));
    cy.registrarCaso('UNI-BUS-02', `Los ${casos.length} casos positivos (sin tildes, mayúsculas, erratas de 1-2 letras, varios términos y consulta vacía) devolvieron true.`);
  });

  it('UNI-BUS-03 coincide() no da falsos positivos con términos cortos o distintos', () => {
    const casos: [string, string][] = [
      ['api', 'Diseñar la app'], // menos de 4 letras: sin tolerancia
      ['servidor', 'Diseñar pantalla de inicio'],
      ['base nube', 'Configurar base de datos'], // todos los términos deben coincidir
    ];
    casos.forEach(([consulta, texto]) => expect(coincide(consulta, texto), `${consulta} !~ ${texto}`).to.eq(false));
    expect(coincide('readme', null, undefined, 'README.md')).to.eq(true);
    cy.registrarCaso('UNI-BUS-03', `Los ${casos.length} casos negativos devolvieron false; los campos null/undefined se ignoraron ("readme" encontró "README.md").`);
  });

  it('UNI-COL-01 tipoColumna() reconoce los nombres de columna habituales', () => {
    expect(tipoColumna('Por Hacer')).to.eq('pendiente');
    expect(tipoColumna('EN PROGRESO')).to.eq('progreso');
    expect(tipoColumna('Hecho')).to.eq('hecho');
    expect(tipoColumna('Terminado')).to.eq('hecho');
    expect(tipoColumna('Revisión')).to.eq('otra');
    cy.registrarCaso('UNI-COL-01', '"Por Hacer"→pendiente, "EN PROGRESO"→progreso, "Hecho" y "Terminado"→hecho, "Revisión"→otra.');
  });
});
