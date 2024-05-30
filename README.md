# Array.isTemplateObject explainer (stage [2](https://tc39.es/process-document/))

Authors: [@mikesamuel](https://github.com/mikesamuel), [@koto](https://github.com/koto)
Champions: [@littledan](https://github.com/littledan), [@ljharb](https://github.com/ljharb)
Reviewers: [@erights](https://github.com/erights), [@jridgewell](https://github.com/jridgewell)

Provides a way for template tag functions to tell whether they were called with a template string bundle.

**Table of Contents**

* [Use cases & Prior Discussions](#use-cases--prior-discussions)
  + [Distinguishing strings from a trusted developer from strings that may be attacker controlled](#distinguishing-strings-from-a-trusted-developer-from-strings-that-may-be-attacker-controlled)
* [An example](#an-example)
* [What this is not](#what-this-is-not)
* [Possible Spec Language](#possible-spec-language)
* [Polyfill](#polyfill)
* [Tests](#tests)
* [Related Work](#related-work)


## Use cases & Prior Discussions

### Distinguishing strings from a trusted developer from strings that may be attacker controlled

Issue [WICG/trusted-types#96](https://github.com/WICG/trusted-types/issues/96) describes a scenario where a template tag assumes that the literal strings were authored by a trusted developer but that the interpolated values may not be.

```js
result = sensitiveOperation`trusted0 ${ untrusted } trusted1`
// Authored by dev          ^^^^^^^^                ^^^^^^^^
// May come from outside                ^^^^^^^^^
```

This proposal would provide enough context to warn or error out when this is not the case.

```js
function (trustedStrings, ...untrustedArguments) {
  if (Array.isTemplateObject(trustedStrings)
      // instanceof provides a same-Realm guarantee for early frozen objects.
      && trustedStrings instanceof Array) {
    // Proceed knowing that trustedStrings come from
    // the JavaScript module's authors.
  } else {
    // Do not trust trustedStrings
  }
}
```

This assumes that an attacker cannot get a string to `eval` or `new Function` as in

```js
const attackerControlledString = '((x) => x)`evil string`';

// Naive code
let x = eval(attackerControlledString)

console.log(Array.isTemplateObject(x));
```

Many other security assumptions break if an attacker can execute arbitrary code, so this check is still useful.

## An Example

Here's an example of how `isTemplateObject` lets a tag function wisely use a sensitive operation, namely *[Create a Trusted Type][]*.
The sensitive operation is not directly accessible to the tag function's callers since it's in a local scope.
This assumes that TT's [first-come-first-serve name restrictions][TT-block] solve provisioning, letting only authorized callers access the sensitive operation.

```js
const { Array, TypeError } = globalThis;
const { createPolicy } = trustedTypes;
const { isTemplateObject } = Array;
const { error: consoleErr } = console;

/**
 * A tag function that produces *TrustedHTML* or null if the
 * policy name "trustedHTMLTagFunction" is not available.
 */
export trustedHTML = (() => {
  // We use TrustedType's first-come-first-serve policy name restrictions
  // to provision this scope with sensitiveOperation.
  const policyName = 'trustedHTMLTagFunction';
  let policy;
  try {
    policy = createPolicy(
        'trustedHTMLTagFunction',
        { createHTML(s) { return s } }
    );
  } catch (ex) {
    consoleErr(`${policyName} is not an allowed trustedTypes policy name`);
    return null;
  }

  // This is the sensitive operation.
  const { createHTML } = policy;

  // This tag function uses isTemplateObject to reject strings that
  // do not appear in user code in the same realm.
  //
  // With a reliable isTemplateObject check, the attack surface is
  // <= |set of template applications in trusted code|.
  //
  // That set is finite.
  //
  // Without a reliable isTemplateObject check, the attack surface is
  // <= |set of attacker controlled strings|.  That is, in practice,
  // unbounded.
  //
  // This assumes no attacker has eval.
  const trustedHTMLTagFunction = (strings) => {
    if (isTemplateObject(strings) && strings instanceof Array) {
      return createHTML(strings.raw[0]);
    }
    throw new TypeError("Expected template object");
  };

  // With the check it's safe to export this tag function that closes
  // over a sensitive operation to anyone.
  return trustedHTMLTagFunction;
})()
```

Without `isArrayTemplate`, this can be bypassed:

```js
// A naive, but non-malicious function.
function f(x) {
  // People trust trustedHTMLTagFunction.
  // Our HTML is trustworthy because <bad argument> so we'll just
  // piggyback off that by using a value that looks like a template object.
  // What could possibly go wrong?
  const s = dodgyMarkdownToHTMLConverter(x);
  const pseudoTemplateObject = [s];
  pseudoTemplateObject.raw = Object.freeze([s]);
  return trustedHTML(Object.freeze(pseudoTemplateObject));
}

// An attacker controlled string reaches f().
const payload = '<img onerror=alert(document.origin) src=x>';
console.log(`f(${ JSON.stringify(payload) }) = ${ f(payload) }`);
```

The threat model here involves three actors:
*  A team of *first-party developers* (in conjunction with security specialists) decides to trust the tag function.
*  A malicious *attacker* controls a string in the variable `payload`.
*  Non-malicious but confusable third-party library tries to provide a higher level of service by forging a template object.
   It assumes its clients are comfortable with trusting `dodgyMarkdownToHTMLConverter` to produce HTML for the current origin.

We've addressed this threat model when the first-party developers can be less tolerant of risk than the most risk tolerant third party dependency w.r.t. HTML injection.

This simple implementation doesn't deal with interpolations.
A more thorough implementation could do [contextual autoescaping][].

## What this is not

This is not an attempt to determine whether the current function was called as a template literal.
See the linked issue as to why that is untenable.  Especially the discussion around threat models, `eval`, and tail-call optimizations that weighed against alternate approaches.

## Possible Spec Language

You can browse the [ecmarkup output](https://tc39.es/proposal-array-is-template-object/) or browse the [source](https://github.com/tc39/proposal-array-is-template-object/blob/master/spec.emu).

<!--
## Polyfill

An es-shim API compatible polyfill available at [![npm](https://img.shields.io/npm/v/is-template-object.svg)](https://www.npmjs.com/package/is-template-object).

A polyfill is available in the [core-js](https://github.com/zloirock/core-js) library. You can find it in the [ECMAScript proposals section](https://github.com/zloirock/core-js#arrayistemplateobject).
-->

## Tests

The test262
[draft tests](https://github.com/tc39/proposal-array-is-template-object/blob/master/test262/test/built-ins/Array/is-template-object.js)
which would be added under
[test/built-ins/Array](https://github.com/tc39/test262/tree/master/test/built-ins/Array)

## Related Work

If the [literals proposal](https://github.com/mikewest/tc39-proposal-literals) were to advance, this proposal would be unnecessary since they both cover the use cases from this document.

[contextual autoescaping]: https://rawgit.com/mikesamuel/sanitized-jquery-templates/trunk/safetemplate.html
[TT-block]: https://w3c.github.io/webappsec-trusted-types/dist/spec/#abstract-opdef-should-trusted-type-policy-creation-be-blocked-by-content-security-policy
[Create a Trusted Type]: https://w3c.github.io/webappsec-trusted-types/dist/spec/#create-a-trusted-type-algorithm
