import * as layout from '../index';

describe('layout barrel', () => {
  it('re-exports the public layout components', () => {
    expect(layout.Navbar).toEqual(expect.any(Function));
    expect(layout.Footer).toEqual(expect.any(Function));
    expect(layout.AppSidebar).toEqual(expect.any(Function));
    expect(layout.AppHeader).toEqual(expect.any(Function));
    expect(layout.AppShell).toEqual(expect.any(Function));
  });
});
