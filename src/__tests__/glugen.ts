import { generate } from '../glugen';

describe('glugen', () => {
  describe('generate', () => {
    it('should compile', () => {
      expect(generate()).toMatchInlineSnapshot(`"template"`);
    });
  });
});
