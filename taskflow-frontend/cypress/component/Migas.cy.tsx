import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Migas } from '../../src/components/layout/Migas';

describe('Componente - Migas (ruta de navegación)', () => {
  const items = [
    { etiqueta: 'Equipo Backend', ruta: '/equipos/1' },
    { etiqueta: 'API REST' },
  ];

  it('CMP-MIG-01 Muestra "Mis equipos" y los niveles intermedios como enlaces y el último como página actual', () => {
    cy.mount(
      <MemoryRouter initialEntries={['/proyectos/9']}>
        <Migas items={items} />
      </MemoryRouter>,
    );
    cy.findByRole('navigation', { name: 'Ruta de navegación' }).within(() => {
      cy.findAllByRole('listitem').should('have.length', 3);
      cy.findByRole('link', { name: 'Mis equipos' }).should('have.attr', 'href', '/');
      cy.findByRole('link', { name: 'Equipo Backend' }).should('have.attr', 'href', '/equipos/1');
      cy.findByRole('link', { name: 'API REST' }).should('not.exist');
      cy.findByText('API REST').should('have.attr', 'aria-current', 'page');
    });
    cy.screenshot('CMP-MIG-01-01-migas');
    cy.registrarCaso('CMP-MIG-01', 'Se mostraron 3 niveles: enlaces a "/" y "/equipos/1" y "API REST" como texto con aria-current="page".');
  });

  it('CMP-MIG-02 Pulsar un nivel navega a su ruta', () => {
    cy.mount(
      <MemoryRouter initialEntries={['/proyectos/9']}>
        <Routes>
          <Route path="/proyectos/:id" element={<Migas items={items} />} />
          <Route path="/equipos/:id" element={<h1>Página del equipo</h1>} />
          <Route path="/" element={<h1>Inicio</h1>} />
        </Routes>
      </MemoryRouter>,
    );
    cy.findByRole('link', { name: 'Equipo Backend' }).click();
    cy.findByRole('heading', { name: 'Página del equipo' }).should('exist');
    cy.registrarCaso('CMP-MIG-02', 'Al pulsar "Equipo Backend" el router mostró la ruta /equipos/:id ("Página del equipo").');
  });

  it('CMP-MIG-03 Un último nivel con ruta no se convierte en enlace', () => {
    cy.mount(
      <MemoryRouter>
        <Migas items={[{ etiqueta: 'Preferencias', ruta: '/preferencias' }]} />
      </MemoryRouter>,
    );
    cy.findByRole('link', { name: 'Preferencias' }).should('not.exist');
    cy.findByText('Preferencias').should('have.attr', 'aria-current', 'page');
    cy.registrarCaso('CMP-MIG-03', 'El único nivel "Preferencias" se mostró como texto con aria-current="page", sin enlace, aunque tuviera ruta.');
  });
});
