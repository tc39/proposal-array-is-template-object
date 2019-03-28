# Array.isTemplateObject explainer (stage [0](https://tc39.github.io/process-document/))

Provides a way for template tag functions to tell whether they were
called with a template string bundle.

**Table of Contents**

* [Use cases & Prior Discussions](#use-cases--prior-discussions)
  + [Distinguishing strings from a trusted developer from strings that may be attacker controlled](#distinguishing-strings-from-a-trusted-developer-from-strings-that-may-be-attacker-controlled)
* [What this is not](#what-this-is-not)
* [Possible Spec Language](#possible-spec-language)
  + [22.1.2.x Array.isTemplateObject ( *value* )](#2212x-arrayistemplateobject--value-)
  + [22.1.2.x.x Runtime Semantics: IsTemplateObject ( *value* )](#2212xx-runtime-semantics-istemplateobject--value-)
* [test262 draft](#test262-draft)


## Use cases & Prior Discussions

### Distinguishing strings from a trusted developer from strings that may be attacker controlled

Issue [WICG/trusted-types#96](https://github.com/WICG/trusted-types/issues/96)
describes a scenario where a template tag assumes that the literal strings were
authored by a trusted developer but that the interpolated values may not be.

```js
result = sensitiveOperation`trusted0 ${ untrusted } trusted1`
// Authored by dev          ^^^^^^^^                ^^^^^^^^
// May come from outside                ^^^^^^^^^
```

This proposal would provide enough context to warn or erroring out when this
is not the case.

```js
function (trustedStrings, ...untrustedArguments) {
  if (!Array.isTemplateObject(trustedStrings)) {
    // Do not trust trustedStrings
  }
  // Proceed knowing that trustedStrings
}
```

This assumes that an attacker cannot get a string to `eval` or `new Function` as in

```js
const attackerControlledString = '((x) => x)`evil string`';

// Naive code
let x = eval(attackerControlledString)

console.log(Array.isTemplateObject(x));
```

Many other security assumptions break if an attacker can execute arbitrary code,
so this check is still useful.

## What this is not

This is not an attempt to determine whether the current function was called as a template literal.
See the linked issue as to why that is untenable.  Especially the discussion around threat models,
`eval` and tail-call optimizations that weighed against alternate approaches.

## Possible Spec Language

You can browse the [ecmarkup output](https://mikesamuel.github.io/proposal-array-is-template-object/)
or browse the [source](https://github.com/mikesamuel/proposal-array-is-template-object/blob/master/spec.emu).

## test262 draft

Added under [test/built-ins/Array](https://github.com/tc39/test262/tree/master/test/built-ins/Array)

```js
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
var escapedStrings = null;
((x) => (escapedStrings = x))`foo ${ null } bar`;

// Things that out be recognized as template objects.
// Elements are [ description, candidate value ] pairs.
var posTestCases = [
  [ 'direct', () => directTag`foo` ],
  // It doesn't matter whether the strings were used with the tag that's running.
  [ 'indirect', () => indirectTag`bar` ],
  // Or whether there is even a tag function on the stack.
  [ 'escaped', () => Array.isTemplateObject(escapedStrings) ],
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
  [ 'proxy', () => directTag(new Proxy(escapedStrings, {})) ],
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
      return Array.isTemplateObject(arg) || poked;
    }
  ],
  // Since a motivating use case is to identify strings that originated within
  // the current origin, it shouldn't return true for a template object that
  // originated in a different realm.
  // TODO: cross realm test is negative
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
```
