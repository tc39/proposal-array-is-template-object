# Array.isTemplateObject explainer (stage [0](https://tc39.github.io/process-document/))

Provides a way for template tag functions to tell whether they were
called with a template string bundle.

**Table of Contents**

* [Use cases & Prior Discussions](#use-cases---prior-discussions)
  + [Distinguishing strings from a trusted developer from strings that may be attacker controlled](#distinguishing-strings-from-a-trusted-developer-from-strings-that-may-be-attacker-controlled)
* [What this is not](#what-this-is-not)
* [Possible Spec Language](#possible-spec-language)
  + [22.1.2.x Array.isTemplateObject ( *value* )](#2212x-arrayistemplateobject----value---)
  + [22.1.2.x.x Runtime Semantics: IsTemplateObject ( *value* )](#2212xx-runtime-semantics--istemplateobject----value---)
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
  if (!ArrayisTemplateObject(trustedStrings)) {
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
`eval` and tail-call optimizations that weighed against alternate approahces.

## Possible Spec Language

Added under [Properties of the Array Constructor](https://www.ecma-international.org/ecma-262/#sec-properties-of-the-array-constructor)

### 22.1.2.x Array.isTemplateObject ( *value* )

When the `isTemplateObject` method is called with argument *value* the following steps are taken:

1. Let *result* be IsTemplateObject(*value*)
1. Return *result*

### 22.1.2.x.x Runtime Semantics: IsTemplateObject ( *value* )

The abstract operation IsTemplateObject is called with a value, *strings*, as an argument.
It performs the following steps:

1. Let *realm* be the [current Realm Record](https://www.ecma-international.org/ecma-262/#current-realm).
1. Let *templateRegistry* be *realm*.\[\[TemplateMap\]\].
1. For each element *e* of *templateRegistry*, do
    1. If *e*.\[\[Array\]\] is the same value as *strings*, then
        1. Return **true**.
1. Return **false**.

## test262 draft

Added under [test/built-ins/Array](https://github.com/tc39/test262/tree/master/test/built-ins/Array)

```js
function directTag(strings) {
  return Array.isTemplateObject(strings);
}

function indirectTag(strings) {
  return directTag(strings);
}

var escapedStrings = null;
((x) => (escapedStrings = x))`foo ${ null } bar`;

var posTestCases = [
  [ 'direct', () => directTag`foo` ],
  [ 'indirect', () => indirectTag`bar` ],
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
      return Array.isTemplateObject(arg) || poked;
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
  $ERROR(`#1: Array.isTemplateObject producing spurious positiive results: ${ falsePositives }`);
}
if (falseNegatives.length) {
  $ERROR(`#2: Array.isTemplateObject producing spurious negative results: ${ falseNegatives }`);
}
```
