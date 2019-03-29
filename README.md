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

## Tests

The test262
[draft tests](https://github.com/mikesamuel/proposal-array-is-template-object/blob/master/test262/test/built-ins/Array/is-template-object.js)
which would be added under
[test/built-ins/Array](https://github.com/tc39/test262/tree/master/test/built-ins/Array)
