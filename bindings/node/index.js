const { readFileSync } = require("node:fs");
const path = require("node:path");

let binding;
if (typeof process.versions.bun === "string") {
  binding = require(path.join(__dirname, "..", "..", "prebuilds", `${process.platform}-${process.arch}`, "tree-sitter-osgi-bundle-manifest.node"));
} else {
  binding = require(path.join(__dirname, "..", "..", "build", "Release", "tree_sitter_osgi_bundle_manifest.node"));
}

try {
  const nodeTypes = require(path.join(__dirname, "..", "..", "src", "node-types.json"));
  binding.nodeTypeInfo = nodeTypes;
} catch { }

const queries = [
  ["HIGHLIGHTS_QUERY", path.join(__dirname, "..", "..", "queries", "highlights.scm")],
  ["INJECTIONS_QUERY", path.join(__dirname, "..", "..", "queries", "injections.scm")],
  ["LOCALS_QUERY", path.join(__dirname, "..", "..", "queries", "locals.scm")],
  ["TAGS_QUERY", path.join(__dirname, "..", "..", "queries", "tags.scm")],
];

for (const [prop, filePath] of queries) {
  Object.defineProperty(binding, prop, {
    configurable: true,
    enumerable: true,
    get() {
      delete binding[prop];
      try {
        binding[prop] = readFileSync(filePath, "utf8");
      } catch { }
      return binding[prop];
    }
  });
}

module.exports = binding;
