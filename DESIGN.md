# Design Document (DESIGN.md)

## 1. Overview

`tree-sitter-osgi-bundle-manifest` is a [tree-sitter](https://tree-sitter.github.io/tree-sitter/) parser for Java OSGi Bundle `MANIFEST.MF` files.

Primary references:

| Alias | Document |
|-------|----------|
| [SPEC] | [JAR File Specification](https://docs.oracle.com/javase/8/docs/technotes/guides/jar/jar.html) |
| [OSGi] | [OSGi Core Release 8 – Framework Module Layer](https://docs.osgi.org/specification/osgi.core/8.0.0/framework.module.html) |
| [NS]   | [OSGi Core Release 8 – Framework Namespaces](https://docs.osgi.org/specification/osgi.core/8.0.0/framework.namespaces.html) |
| [SCR]  | [OSGi Compendium R8 – Declarative Services](https://docs.osgi.org/specification/osgi.cmpn/8.0.0/service.component.html) |

## 2. Architecture

The parser consists of the following files:

| File | Role | Lines |
|------|------|-------|
| `grammar.js` | All rule definitions in tree-sitter DSL (rules, precedence, lexical tokens) | ~560 |
| `src/scanner.c` | External scanner — handles continuation lines, quoted strings, and stateful tokenization across multiple tokens | ~400 |
| `src/parser.c` | Auto-generated C parser produced by `tree-sitter generate` (committed) | ~750k |
| `queries/highlights.scm` | Syntax highlighting tree-sitter queries | ~145 |
| `queries/tags.scm` | Tag navigation queries | ~50 |
| `test/corpus/manifest_test.txt` | Tree tests (expected S-expressions for parser output) | ~1105 |

**Division of responsibilities:**

- **`grammar.js`** defines specialized rules for each header key under `attribute_entry` (e.g., `Bundle-Version`, `Export-Package`, `Require-Capability`). Unknown keys fall back to the generic `header_value` rule.
- **`src/scanner.c`** handles tokenization that cannot be expressed via `token()` in tree-sitter alone: continuation line merging, wildcard names, quoted strings, and filter-quoted values. Tokens processed by the external scanner are declared in the `externals` array.

## 3. Parsing Strategy

### 3.1 Top-Level Structure

The entire manifest is parsed as:

```
manifest
  main_section          ← attributes before the first "Name:" header
    attribute_entry ...
  individual_section    ← "Name:" header + attributes of that subsection
    section_name_header
    attribute_entry ...
```

`attribute_entry` selects a specialized rule based on the header key. This yields appropriately typed AST nodes for each header.

### 3.2 Header Value Specialization

Examples:

| Header Key | Value Rule | Notes |
|------------|-----------|-------|
| `Manifest-Version` | `manifest_version` | Fixed at "1.0" |
| `Bundle-ManifestVersion` | `bundle_manifest_version` | Integer |
| `Bundle-Version` | `bundle_version` → `version` | Up to 4-element version string |
| `Bundle-SymbolicName` | `bundle_symbolic_name` | `symbolic_name` + parameters |
| `Export-Package` | `clause_values` → `clauses` → `clause` | List of `path` + parameters |
| `Import-Package` | Same as above | |
| `Require-Bundle` | `clauses` → `clause` | |
| `Fragment-Host` | `clause` (singular) | |
| `DynamicImport-Package` | `dynamic_import_clause` | Wildcard name support |
| `Require-Capability` | `capability_values` → `capabilities` → `capability` | Namespace clauses |
| `Provide-Capability` | Same as above | |
| `Bundle-RequiredExecutionEnvironment` | `bree` | Decomposed BREE (name, version, sub-ee) |

### 3.3 Namespace Clauses

`Require-Capability` / `Provide-Capability` values carry OSGi namespaces (`osgi.ee`, `osgi.identity`, `osgi.native`, `osgi.wiring.*`).

Initially, dedicated rules were created for each namespace (e.g., `namespace_ee_clause`). However, distinguishing namespace names (e.g., `osgi.wiring.package`) from parameter keys (e.g., `osgi.wiring.package=...`) proved difficult due to tokenizer conflicts.

**Current approach:**

- The `capability` rule is defined as `choice(namespace_ee_clause, namespace_identity_clause, namespace_native_clause, clause)`.
  Namespace-specific rules are tried first; if none match, the parser falls back to the generic `clause` rule.
- Namespace names themselves are tokenized as `path` tokens.
- Semantic differentiation (identifying which namespace is used) is deferred to **tree-sitter queries** (`highlights.scm` / `tags.scm`).
  Grammar rules carry minimal namespace knowledge.

This approach accommodates future namespace additions (`osgi.cluster`, `osgi.repository`, etc.) without grammar changes.

### 3.4 Token Disambiguation in Parameters

Parameter sections distinguish three token types:

| Token Type | Syntax | Example |
|-----------|--------|---------|
| `directive` | `key:=value` | `resolution:=optional` |
| `typed_attribute` | `key:Type=value` | `version:Version="1.0"` |
| `attribute` | `key=value` | `bundle=mybundle` |

To correctly separate all three, `directive_or_attribute` calls `choice(typed_attribute, directive, attribute)`.
`typed_attribute` takes precedence over `directive` via `prec` to avoid `:` in `:Type=` being misinterpreted as the start of `:=`.

## 4. External Scanner (`scanner.c`)

### 4.1 Scanned Tokens

| Token | Description |
|-------|-------------|
| `WILDCARD_NAME` | Wildcard-containing package names (`com.foo.*` etc.), used in OSGi `DynamicImport-Package` |
| `PATH` | OSGi path lexeme (`[A-Za-z0-9][A-Za-z0-9._\-/]*`), mapped to the grammar rule `path` |
| `_unquoted_string` | Unquoted value token (excludes `;`, `,`, `"`, `=`, parentheses, etc.) |
| `_quoted_string` | Double-quoted value token with escape handling |
| `_multiline_text` | Plain text value spanning continuation lines |

### 4.2 Continuation Lines

In OSGi manifests, a header value that is too long can continue on the next line if that line begins with a single **space character**.
Each scanner function, upon encountering a line ending, checks whether the next line starts with whitespace and, if so, merges the continuation content into the same token.

```
Export-Package: com.example.foo;version="1.0",
 com.example.bar;version="2.0"
```

Here, `com.example.bar...` is merged into the `_unquoted_string` or `PATH` as a continuation.

### 4.3 Wildcard Name vs. Path Precedence

To correctly parse `DynamicImport-Package: com.example.*`, `WILDCARD_NAME` (tokens containing `*`) is scanned before `PATH`:

```c
if (valid_symbols[WILDCARD_NAME] && scan_wildcard_name(lexer)) return true;
if (valid_symbols[PATH] && scan_path(lexer)) return true;
```

This prevents `com.example.*` from being split into `PATH("com.example")` + `"*"`.

## 5. Naming Conventions (OSGi R8 Aligned)

On 2026-06-06, node names were renamed to align with actual OSGi R8 specification terminology.

**Guiding principles:**

- Node names use the concept names defined in the OSGi Core R8 Specification (e.g., `clause`, `directive`, `attribute`, `typed_attribute`, `parameter`).
- Redundant prefixes (`osgi_`) have been removed — the parser's scope is self-contained.
- Header value wrappers follow the `bundle_*` or `*_values` naming pattern (e.g., `bundle_version`, `capability_values`).
- Underscore-prefixed names (`_version`, `_version_interval`) denote internal/private rules.
- Names are kept short and intuitive: `osgi_clause` → `clause`, `osgi_path` → `path`.

For a full mapping table, refer to the refactoring commit diff.

## 6. Testing

Tests are written in tree-sitter's corpus test format in `test/corpus/manifest_test.txt`.

- Each test case consists of an **OSGi header line (input)** and the **expected S-expression**.
- `tree-sitter test` parses each line of input and compares the generated CST against the expected S-expression.
- Sections are delimited by `=== ... ===`.

**Coverage targets:**

- Basic headers (Manifest-Version, Bundle-SymbolicName, Bundle-Version, etc.)
- Export-Package / Import-Package (single/multiple clauses, version attributes, directives)
- Require-Bundle / Fragment-Host (single/multiple, with parameters)
- DynamicImport-Package (wildcards, attributes, directives)
- Bundle-License / Bundle-Developers / Bundle-SCM / Bundle-NativeCode / Bundle-Icon
- Bundle-RequiredExecutionEnvironment (single EE, versioned, sub-EE)
- Require-Capability / Provide-Capability (all namespaces: ee, identity, native, wiring.package)
- Cases with continuation lines
- Generic fallback (unknown headers)

## 7. Future Work

- Unsupported namespaces (`osgi.cluster`, `osgi.repository`, `osgi.unresolvable`, etc.) parse via the generic `clause` rule. If dedicated rules are needed, add them to the `capability` rule's `choice()`.
- Queries (`highlights.scm`, `tags.scm`) can be extended for better namespace identification and symbol queries.
- The LDAP-style `filter` sub-grammar can be improved for greater parsing accuracy.
