# Array.isTemplateString explainer (stage [0](https://tc39.github.io/process-document/))

Provides a way for template tag functions to tell whether they were
called with a template string bundle.

## Use cases & Prior Discussions

TODO

## Possible Spec Language

TODO

## Tests

```js
function directTag(strings) {
  return Array.isTemplateString(strings);
}

function indirectTag(strings) {
  return directTag(strings);
}

var escapedStrings = null;
((x) => (escapedStrings = x))`foo ${ null } bar`;

var posTestCases = [
  [ 'direct', () => directTag`foo` ],
  [ 'indirect', () => indirectTag`bar` ],
  [ 'escaped', () => Array.isTemplateString(escapedStrings) ],
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

var negTestCases = [
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
  [ 'proxy', () => directTag(new Proxy(escapedStrings, {})) ],
  [ 
    'forgery',
    () => {
      let arr = [ 'foo' ];
      arr.raw = arr;  // TODO Enumerable?
      Object.freeze(arr);  // TODO and/or seal?
      return directTag(arr);
    }
  ],
  [
    'argument not poked', () => {
      let poked = false;
      let arg = new Proxy(
        [],
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
      return Array.isTemplateString(arg) || poked;
    }
  ],   
  // TODO: cross realm test is negative
];

for (const [ message, f ] of negTestCases) {
  let result = null;
  try {
    result = !f();
  } catch (e) {
    falseNegatives.push(message + ' threw');
    continue;
  }
  if (result !== false) {
    falseNegatives.push(message);
  }
}

if (falsePositives.length) {
  $ERROR(`#1: Array.isTemplateString producing spurious positiive results: ${ falsePositives }`);
}
if (falseNegatives.length) {
  $ERROR(`#2: Array.isTemplateString producing spurious negative results: ${ falseNegatives }`);
}
```
