const assert = require("node:assert");
const { test } = require("node:test");
const Parser = require("tree-sitter");

test("can load grammar", () => {
  const parser = new Parser();
  assert.doesNotReject(() => {
    const language = require("./index.js").default;
    parser.setLanguage(language);
  });
});
