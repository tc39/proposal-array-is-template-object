/*---
info: |
    Array.isTemplateObject returns true given a
    template tag strings object and false otherwise.
es5id: TBD
description: Applies Array.isTemplateObject to various inputs.
--*/

// A template tag that applies the function under test
// and returns its result.
function directTag(strings) {
  return Array.isTemplateObject(strings);
}

// A template tag that does the same but passes its
// argument via normal function application.
function indirectTag(strings) {
  return directTag(strings);
}

// A template object that escapes the tag function body.
var escapedTemplateObject = null;
((x) => (escapedTemplateObject = x))`foo ${ null } bar`;

var foreignTemplateObject = null;
(() => {
  const realm = $262.createRealm();
  foreignTemplateObject =
    (new realm.global.Function('return ((x) => x)`foreign strings`;'))();
})();

// Things that ought be recognized as template objects.
// Elements are [ description, candidate value ] pairs.
var posTestCases = [
  [ 'direct', () => directTag`foo` ],
  // It doesn't matter whether the strings were used with the tag that's running.
  [ 'indirect', () => indirectTag`bar` ],
  // Or whether there is even a tag function on the stack.
  [ 'escaped', () => Array.isTemplateObject(escapedTemplateObject) ],
  [
    'called with null this',
    () => Reflect.apply(Array.isTemplateObject, null, [ escapedTemplateObject ]),
  ],
  // IsTemplateObject is realm-agnostic
  [
    'cross-realm template objects',
    () => Array.isTemplateObject(foreignTemplateObject),
  ],
];

var falsePositives = [];

for (const [ message, f ] of posTestCases) {
  let result = null;
  try {
    result = f();
  } catch (e) {
    falsePositives.push(message + ' threw');
    continue;
  }
  if (result !== true) {
    falsePositives.push(message);
  }
}

// Things that should not be recognized as template objects.
// Elements are [ description, candidate value ] pairs.
var negTestCases = [
  // Common values are not template string objects.
  [ 'zero args', () => directTag() ],
  [ 'null', () => directTag(null) ],
  [ 'undefined', () => directTag(undefined) ],
  [ 'zero', () => directTag(0) ],
  [ '-zero', () => directTag(-0) ],
  [ 'number', () => directTag(123) ],
  [ 'NaN', () => directTag(NaN) ],
  [ '+Inf', () => directTag(+Infinity) ],
  [ '-Inf', () => directTag(-Infinity) ],
  [ 'false', () => directTag(false) ],
  [ 'true', () => directTag(true) ],
  [ '{}', () => directTag({}) ],
  [ '[ "x" ]', () => directTag([ "x" ]) ],
  [ 'empty string', () => directTag('') ],
  [ 'string', () => directTag('foo') ],
  [ 'function', () => directTag(directTag) ],
  // A proxy over a template string object is not a template string object.
  [ 'proxy', () => directTag(new Proxy(escapedTemplateObject, {})) ],
  [ 'Array.prototype', () => Array.isTemplateObject(Array.prototype) ],
  // User code can't distinguish this case which is why this proposal adds value.
  [
    'forgery',
    () => {
      let arr = [ 'really really real' ];
      Object.defineProperty(arr, 'raw', { value: arr });
      Object.freeze(arr);
      return directTag(arr);
    }
  ],
  // The implementation shouldn't muck with its argument.
  [
    'argument not poked', () => {
      let poked = false;
      // Use a proxy to see if isTemplateObject
      // mucks with arg in an observable way.
      let arg = new Proxy(
        [],
        // The proxy handler is itself a proxy which
        // flips the poked bit if any proxy trap is
        // invoked.
        new Proxy(
          {},
          {
            has(...args) {
              poked = true;
              return Reflect.has(...args);
            },
            get(...args) {
              poked = true;
              return Reflect.get(...args);
            },
            getPropertyDescriptor(...args) {
              poked = true;
              return Reflect.getPropertyDescriptor(...args);
            },
            getPrototypeOf(...args) {
              poked = true;
              return Reflect.getPrototypeOf(...args);
            },
          }));
      return Array.isTemplateObject(arg) || poked;
    }
  ],
  // Since a motivating use case is to identify strings that
  // originated within the current origin, the idiom from the spec note
  // shouldn't return true for a template object that originated in a
  // different realm.
  [
    'same-realm template object idiom',
    () =>
      Array.isTemplateObject(foreignTemplateObject)
      && foreignTemplateObject instanceof Array,
  ],
];

var falseNegatives = [];

for (const [ message, f ] of negTestCases) {
  let result = null;
  try {
    result = f();
  } catch (e) {
    falseNegatives.push(message + ' threw');
    continue;
  }
  if (result !== false) {
    falseNegatives.push(message);
  }
}

if (falsePositives.length) {
  $ERROR(`#1: Array.isTemplateObject producing spurious positive results: ${ falsePositives }`);
}
if (falseNegatives.length) {
  $ERROR(`#2: Array.isTemplateObject producing spurious negative results: ${ falseNegatives }`);
}
if (typeof Array.isTemplateObject !== 'function') {
  $ERROR('#3: Array.isTemplateObject has wrong typeof');
}
if (Array.isTemplateObject.length !== 1) {
  $ERROR('#4: Array.isTemplateObject has wrong length');
}
if (Array.isTemplateObject.name !== 'isTemplateObject') {
  $ERROR('#5: Array.isTemplateObject has wrong name');
}
if (Object.prototype.toString.call(Array.isTemplateObject) !== '[object Function]') {
  $ERROR('#6: Array.isTemplateObject is not a normal function');
}
