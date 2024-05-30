// Check that the test262 tests do something sensible when run against
// a known problematic stub implementation of Reflect.isTemplateObject.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { expect } = require('chai');

describe('README.md', () => {
  describe('test262', () => {
    beforeEach(() => {
      Reflect.isTemplateObject = require('is-template-object').implementation;
    });
    afterEach(() => {
      delete Reflect.isTemplateObject;
    });

    it('runs, kind of', () => {
      const testContent = fs.readFileSync(
        path.join(
          __dirname, '..',
          'test262', 'test', 'built-ins', 'Reflect', 'is-template-object.js'),
        { encoding: 'UTF-8' });

      // Stub out some of the API provided at
      // https://github.com/tc39/test262/blob/master/INTERPRETING.md#host-defined-functions
      const test262stubErrorList = [];
      function $ERROR(msg) {
        test262stubErrorList[test262stubErrorList.length] = msg;
      }

      const $262 = {
        createRealm() {
          return { global: vm.runInNewContext('this') };
        },
      }

      // Evaluate the test content.
      new Function(
        '$ERROR', '$262', testContent)(
        ($ERROR), ($262));

      expect(test262stubErrorList)
        .to.deep.equal([
          '#2: Reflect.isTemplateObject producing spurious negative results:'
          + ' proxy,forgery,argument not poked'
        ]);
    });
  });
});


