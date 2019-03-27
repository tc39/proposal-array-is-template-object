// Check that the testcases in the README are semi-valid JS given
// a known problematic stub implementation of Array.isTemplateObject.

const fs = require('fs');
const path = require('path');
const { expect } = require('chai');

describe('README.md', () => {
  describe('test262', () => {
    beforeEach(() => {
      Array.isTemplateObject = function (value) {
        return Array.isArray(value);
      };
    });
    afterEach(() => {
      delete Array.isTemplateObject;
    });

    it('runs, kind of', () => {
      const readmeContent = fs.readFileSync(
        path.join(__dirname, '..', 'README.md'),
        { encoding: 'UTF-8' });

      const contentAfterTest262Header =
        /^## test262.*\n([\s\S]*)/m.exec(readmeContent)[1];

      const firstFencedCodeBlockContent =
        /\n```js\n([\s\S]*?)\n```/.exec(contentAfterTest262Header)[1];

      const test262stubErrorList = [];
      function $ERROR(msg) {
        test262stubErrorList[test262stubErrorList.length] = msg;
      }

      eval(firstFencedCodeBlockContent);

      expect(test262stubErrorList)
        .to.deep.equal([
          '#2: Array.isTemplateObject producing spurious negative results:'
          + ' [ \"x\" ],proxy,forgery,argument not poked'
        ]);
    });
  });
});


