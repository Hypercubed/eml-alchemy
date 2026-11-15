# EML Alchemy

An alchemy-style game. You start with the number `1` and one operation,
`eml`, where `a b eml = e^a - ln b`. Combine them until all 34 keys of a
scientific calculator exist.

The calculator is RPN. Values land on a stack and an operation uses the top of
it, so `1 1 eml` is e and `x 1 eml` is exp(x). There is no equals key: a new key
unlocks as soon as a result behaves like it at many values of `x` and `y`.

A **Key map** tab draws the dependency graph of all 34 keys and flags the very
hard ones (150+ `eml` operations): sin, cos, tan, asin, acos, atan.

## Run

Open `index.html` in a browser. It is one self-contained file. Progress is kept in `localStorage`.

## Test

    npm install
    npm test

`tests/recipes.test.js` replays every guided recipe and checks it unlocks only its own key.
`tests/smoke.test.js` drives the page in jsdom, including a full 34-key playthrough and the key map.
