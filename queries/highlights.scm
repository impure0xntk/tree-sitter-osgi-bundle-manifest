; ==========================================================================
;  tree-sitter-osgi-bundle-manifest  highlight queries
; ==========================================================================

; ------------------------------------------------------------------
;  Header keys – known OSGi / JAR manifest headers.
;  In the grammar each header key is an anonymous string literal
;  inside a field('key', ...) of attribute_entry.  We match each
;  literal explicitly.
; ------------------------------------------------------------------
(attribute_entry
  key: "Manifest-Version" @keyword)
(attribute_entry
  key: "Bundle-ManifestVersion" @keyword)
(attribute_entry
  key: "Bundle-SymbolicName" @keyword)
(attribute_entry
  key: "Bundle-Version" @keyword)
(attribute_entry
  key: "Bundle-Name" @keyword)
(attribute_entry
  key: "Bundle-ActivationPolicy" @keyword)
(attribute_entry
  key: "Bundle-Activator" @keyword)
(attribute_entry
  key: "ExtensionBundle-Activator" @keyword)
(attribute_entry
  key: "Bundle-Category" @keyword)
(attribute_entry
  key: "Bundle-ClassPath" @keyword)
(attribute_entry
  key: "Bundle-Copyright" @keyword)
(attribute_entry
  key: "Bundle-Description" @keyword)
(attribute_entry
  key: "Bundle-Developers" @keyword)
(attribute_entry
  key: "Bundle-DocURL" @keyword)
(attribute_entry
  key: "Bundle-Icon" @keyword)
(attribute_entry
  key: "Bundle-License" @keyword)
(attribute_entry
  key: "Bundle-Localization" @keyword)
(attribute_entry
  key: "Bundle-NativeCode" @keyword)
(attribute_entry
  key: "Bundle-RequiredExecutionEnvironment" @keyword)
(attribute_entry
  key: "Bundle-SCM" @keyword)
(attribute_entry
  key: "Bundle-UpdateLocation" @keyword)
(attribute_entry
  key: "Bundle-Vendor" @keyword)
(attribute_entry
  key: "Export-Package" @keyword)
(attribute_entry
  key: "Export-Service" @keyword)
(attribute_entry
  key: "Import-Package" @keyword)
(attribute_entry
  key: "Import-Service" @keyword)
(attribute_entry
  key: "DynamicImport-Package" @keyword)
(attribute_entry
  key: "Require-Bundle" @keyword)
(attribute_entry
  key: "Fragment-Host" @keyword)
(attribute_entry
  key: "Require-Capability" @keyword)
(attribute_entry
  key: "Provide-Capability" @keyword)
(attribute_entry
  key: "Service-Component" @keyword)
(attribute_entry
  key: "Multi-Release" @keyword)

; ------------------------------------------------------------------
;  Fallback: any attribute_key not covered above (custom headers)
; ------------------------------------------------------------------
(attribute_key) @keyword

; ------------------------------------------------------------------
;  Section delimiter
; ------------------------------------------------------------------
(section_name_header) @keyword.directive
(section_name) @label

; ------------------------------------------------------------------
;  Values – bundled text spanning continuation lines
; ------------------------------------------------------------------
(continuation_value) @string
(parameter_value) @string

; ------------------------------------------------------------------
;  Values – numbers
; ------------------------------------------------------------------
(manifest_version) @number
(bundle_manifest_version) @number
(number) @number
(version) @number
(bundle_version) @number
(version_range) @number
(icon_attr_value) @number

; ------------------------------------------------------------------
;  Values – strings / special
; ------------------------------------------------------------------
(version_qualifier) @string.special
(filter_value) @string

; ------------------------------------------------------------------
;  Type-level identifiers (package names, bundle names, paths)
; ------------------------------------------------------------------
(path) @type
(bundle_symbolic_name) @type
(symbolic_name) @type
(license_identifier) @type
(developer_identifier) @type
(icon_path) @type
(icon_attr_key) @attribute

; ------------------------------------------------------------------
;  BREE (Bundle-RequiredExecutionEnvironment)
; ------------------------------------------------------------------
(bree_clause) @type
(bree_token) @type
(bree_sub_ee) @type
(bree_version_suffix
  (number) @number)

; ------------------------------------------------------------------
;  Wildcard names (DynamicImport-Package)
; ------------------------------------------------------------------
(wildcard_name) @type

; ------------------------------------------------------------------
;  Filter attribute keys
; ------------------------------------------------------------------
(filter_attr) @attribute

; ------------------------------------------------------------------
;  Clause-level structures – scope / namespace grouping
; ------------------------------------------------------------------
(clause) @namespace
(clauses) @namespace
(capability) @namespace
(capabilities) @namespace
(require_bundle) @namespace
(fragment_host) @namespace
(dynamic_import_package) @namespace
(dynamic_import_clause) @namespace
(icon_clause) @namespace
(license_clause) @namespace
(developer_clause) @namespace
(native_code_clause) @namespace
(scm_attr) @namespace

; ------------------------------------------------------------------
;  Directive / typed attribute / attribute — parameter-level nodes
; ------------------------------------------------------------------
(parameter) @punctuation.delimiter
(directive_or_attribute) @attribute
(directive) @keyword.directive
(typed_attribute) @attribute
(attribute) @attribute

; ------------------------------------------------------------------
;  Operators
; ------------------------------------------------------------------
":=" @operator
":" @operator
"~=" @operator
"<=" @operator
">=" @operator
"=" @operator
"*" @operator
"&" @operator
"|" @operator
"!" @operator

; ------------------------------------------------------------------
;  Brackets / delimiters
; ------------------------------------------------------------------
"[" @punctuation.bracket
"]" @punctuation.bracket
"(" @punctuation.bracket
")" @punctuation.bracket
