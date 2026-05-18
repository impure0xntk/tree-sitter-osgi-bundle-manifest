; tags.scm — tree-sitter tagging queries for OSGi Bundle MANIFEST.MF
;
; Capture reference (tree-sitter standard):
;   @definition.class       — section_name_header   (logical unit heading)
;   @definition.var         — individual_section    (contiguous section block)
;   @local.scope            — clause groups    (local scope for packages)
;   @name                   — section_name / path symbolic name

; ── Section delimiter ("Name: …") ──────────────
(section_name_header
  name: (section_name) @name) @definition.class

; ── Section body ───────────────────────────────
(individual_section) @definition.var

; ── OSGi-specific tags ──────────────────────────

; ── OSGi version range ──────────────────────────
(version_range) @local.scope

; ── OSGi filter (LDAP filter syntax) ────────────
(filter) @local.scope

; ── OSGi clause groups (Import-Package, Export-Package, Require-Bundle, etc.) ─
(clauses) @local.scope
(capabilities) @local.scope

; ── Individual OSGi clauses ─────────────────────
(clause
  (path) @name)
(capability
  (clause
    (path) @name))

; ── Dynamic Import Package ──────────────────────
(dynamic_import_package) @local.scope
(dynamic_import_clause
  (wildcard_name) @name)

; ── OSGi directives and attributes ──────────────
(directive
  (path) @name)
(attribute
  (path) @name)
(typed_attribute
  (path) @name)

; ── Special OSGi header values ──────────────────
(bundle_license) @local.scope
(bundle_developers) @local.scope
(bundle_scm) @local.scope
(bundle_native_code) @local.scope
(bundle_icon) @local.scope

; ── Require-Bundle / Fragment-Host clause path ───
(require_bundle
  (clause
    (path) @name))
(fragment_host
  (clause
    (path) @name))
