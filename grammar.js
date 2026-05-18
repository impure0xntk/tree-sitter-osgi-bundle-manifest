// ==========================================================================
//  OSGi R8 Bundle MANIFEST.MF Grammar for tree-sitter (standalone)
// ==========================================================================
//
//  References:
//    [SPEC] JAR File Specification (manifest format)
//           https://docs.oracle.com/javase/8/docs/technotes/guides/jar/jar.html
//    [OSGi] OSGi Core Release 8 – Framework Module Layer
//           https://docs.osgi.org/specification/osgi.core/8.0.0/framework.module.html
//    [NS]   OSGi Core Release 8 – Framework Namespaces Specification
//           https://docs.osgi.org/specification/osgi.core/8.0.0/framework.namespaces.html
//    [SCR]  OSGi Compendium Release 8 – Declarative Services Specification
//           https://docs.osgi.org/specification/osgi.cmpn/8.0.0/service.component.html
// ==========================================================================

module.exports = grammar({
  name: 'osgi_bundle_manifest',

  // -----------------------------------------------------------------------
  //  Extras: intra-line whitespace and line terminators
  // -----------------------------------------------------------------------
  extras: $ => [
    /[ \t\f]+/,
    /\r?\n|\r/,
  ],

  // -----------------------------------------------------------------------
  //  word token – keyword extraction
  // -----------------------------------------------------------------------
  word: $ => $.attribute_key,

  // -----------------------------------------------------------------------
  //  External scanner tokens – handles continuation-line merging
  // -----------------------------------------------------------------------
  externals: $ => [
    $.wildcard_name,
    $.path,
    $._unquoted_string,
    $._quoted_string,
    $._multiline_text,
  ],

  // -----------------------------------------------------------------------
  //  Extras: intra-line whitespace and line terminators.
  // -----------------------------------------------------------------------
  extras: $ => [
    /[ \t\f]+/,
    /\r?\n|\r/,
  ],

  // ========================================================================
  //  Grammar rules
  // ========================================================================
  rules: {

    // ----------------------------------------------------------------------
    //  manifest – root node
    // ----------------------------------------------------------------------
    manifest: $ => seq(
      $.main_section,
      repeat($.individual_section),
    ),

    // ----------------------------------------------------------------------
    //  main_section – attributes before the first "Name:" header
    // ----------------------------------------------------------------------
    main_section: $ => repeat1(choice(
      $.attribute_entry,
      $.continuation_line,
    )),

    // ----------------------------------------------------------------------
    //  individual_section – per-entry attributes delimited by "Name:"
    // ----------------------------------------------------------------------
    individual_section: $ => seq(
      $.section_name_header,
      repeat($.attribute_entry),
    ),

    // ----------------------------------------------------------------------
    //  section_name_header – "Name:" delimiter + its value
    // ----------------------------------------------------------------------
    section_name_header: $ => prec.right(seq(
      /[Nn][Aa][Mm][Ee]/,
      ': ',
      field('name', $.section_name),
      repeat($.section_name_continuation),
    )),

    section_name: $ => token.immediate(/[^\x00\n\r]+/),

    section_name_continuation: $ => seq(
      ' ',
      token.immediate(/[^\x00\n\r]*/),
    ),

    // ----------------------------------------------------------------------
    //  header_value – wraps value + continuation lines
    // ----------------------------------------------------------------------
    header_value: $ => prec.right(seq(
      token.immediate(/[^\x00\n\r]*/),
      repeat(seq(
        ' ',
        token.immediate(/[^\x00\n\r]*/),
      )),
    )),

    // ----------------------------------------------------------------------
    //  attribute_entry – key: value pairs (OSGi-aware)
    // ----------------------------------------------------------------------
    attribute_entry: $ => prec(-1, choice(
      // Manifest-Version
      seq(field('key', 'Manifest-Version'), ': ', field('value', $.manifest_version)),
      // Bundle-ManifestVersion
      seq(field('key', 'Bundle-ManifestVersion'), ': ', field('value', $.bundle_manifest_version)),
      // Bundle-SymbolicName
      seq(field('key', 'Bundle-SymbolicName'), ': ', field('value', $.bundle_symbolic_name)),
      // Bundle-Version
      seq(field('key', 'Bundle-Version'), ': ', field('value', $.bundle_version)),
      // Bundle-Name
      seq(field('key', 'Bundle-Name'), ': ', field('value', $.bundle_name)),
      // Bundle-ActivationPolicy
      seq(field('key', 'Bundle-ActivationPolicy'), ': ', field('value', $.bundle_activation_policy)),
      // Bundle-Activator
      seq(field('key', 'Bundle-Activator'), ': ', field('value', $.bundle_activator)),
      // ExtensionBundle-Activator (OSGi R8 §3.15.4)
      seq(field('key', 'ExtensionBundle-Activator'), ': ', field('value', $.bundle_activator)),
      // Bundle-Category
      seq(field('key', 'Bundle-Category'), ': ', field('value', $.bundle_category)),
      // Bundle-ClassPath
      seq(field('key', 'Bundle-ClassPath'), ': ', field('value', $.bundle_class_path)),
      // Bundle-Copyright
      seq(field('key', 'Bundle-Copyright'), ': ', field('value', $.bundle_copyright)),
      // Bundle-Description
      seq(field('key', 'Bundle-Description'), ': ', field('value', $.bundle_description)),
      // Bundle-DocURL
      seq(field('key', 'Bundle-DocURL'), ': ', field('value', $.bundle_docurl)),
      // Bundle-Localization
      seq(field('key', 'Bundle-Localization'), ': ', field('value', $.bundle_localization)),
      // Bundle-UpdateLocation
      seq(field('key', 'Bundle-UpdateLocation'), ': ', field('value', $.bundle_update_location)),
      // Bundle-Vendor
      seq(field('key', 'Bundle-Vendor'), ': ', field('value', $.bundle_vendor)),
      // Export-Package
      seq(field('key', 'Export-Package'), ': ', field('value', $.clause_values)),
      // Import-Package
      seq(field('key', 'Import-Package'), ': ', field('value', $.clause_values)),
      // Export-Service (deprecated)
      seq(field('key', 'Export-Service'), ': ', field('value', $.clause_values)),
      // Import-Service (deprecated)
      seq(field('key', 'Import-Service'), ': ', field('value', $.clause_values)),
      // Require-Capability – namespace-aware clauses
      seq(field('key', 'Require-Capability'), ': ', field('value', $.capability_values)),
      // Provide-Capability – namespace-aware clauses
      seq(field('key', 'Provide-Capability'), ': ', field('value', $.capability_values)),
      // Bundle-License
      seq(field('key', 'Bundle-License'), ': ', field('value', $.bundle_license)),
      // Bundle-Developers
      seq(field('key', 'Bundle-Developers'), ': ', field('value', $.bundle_developers)),
      // Bundle-SCM
      seq(field('key', 'Bundle-SCM'), ': ', field('value', $.bundle_scm)),
      // Bundle-NativeCode
      seq(field('key', 'Bundle-NativeCode'), ': ', field('value', $.bundle_native_code)),
      // Bundle-RequiredExecutionEnvironment (deprecated, OSGi R8 §3.4.1)
      seq(field('key', 'Bundle-RequiredExecutionEnvironment'), ': ', field('value', $.bree)),
      // Service-Component (OSGi Compendium R8 §112 – Declarative Services)
      seq(field('key', 'Service-Component'), ': ', field('value', $.service_component)),
      // Multi-Release (JAR spec – OSGi R8 §3.2.8)
      seq(field('key', 'Multi-Release'), ': ', field('value', $.multi_release)),
      // Bundle-Icon
      seq(field('key', 'Bundle-Icon'), ': ', field('value', $.bundle_icon)),
      // Require-Bundle
      seq(field('key', 'Require-Bundle'), ': ', field('value', $.require_bundle)),
      // Fragment-Host
      seq(field('key', 'Fragment-Host'), ': ', field('value', $.fragment_host)),
      // DynamicImport-Package
      seq(field('key', 'DynamicImport-Package'), ': ', field('value', $.dynamic_import_package)),

      // ================================================================
      //  Eclipse Foundation (Equinox) extension headers
      // ================================================================

      // Eclipse-PlatformFilter
      seq(field('key', 'Eclipse-PlatformFilter'), ': ', field('value', $.eclipse_platform_filter)),
      // Eclipse-BuddyPolicy
      seq(field('key', 'Eclipse-BuddyPolicy'), ': ', field('value', $.eclipse_buddy_policy)),
      // Eclipse-RegisterBuddy
      seq(field('key', 'Eclipse-RegisterBuddy'), ': ', field('value', $.eclipse_register_buddy)),
      // Eclipse-ExtensibleAPI
      seq(field('key', 'Eclipse-ExtensibleAPI'), ': ', field('value', $.eclipse_extensible_api)),
      // Eclipse-BundleShape
      seq(field('key', 'Eclipse-BundleShape'), ': ', field('value', $.eclipse_bundle_shape)),

      // ================================================================
      //  Spring Dynamic Modules extension headers
      // ================================================================

      // Spring-Context
      seq(field('key', 'Spring-Context'), ': ', field('value', $.spring_context)),
      // SpringExtender-Version
      seq(field('key', 'SpringExtender-Version'), ': ', field('value', $.spring_extender_version)),

      // ================================================================
      //  aQute / bnd build instructions
      // ================================================================

      // Private-Package
      seq(field('key', 'Private-Package'), ': ', field('value', $.clause_values)),
      // Include-Resource
      seq(field('key', 'Include-Resource'), ': ', field('value', $.include_resource)),
      // Ignore-Package
      seq(field('key', 'Ignore-Package'), ': ', field('value', $.ignore_package)),

      // ------------------------------------------------------------------
      //  Fallback: generic attribute_entry for unknown headers
      // ------------------------------------------------------------------
      seq(
        field('key', $.attribute_key),
        ': ',
        field('value', $.header_value),
      ),
    )),

    // ----------------------------------------------------------------------
    //  continuation_line – a wrapped continuation of the previous value
    // ----------------------------------------------------------------------
    continuation_line: $ => seq(
      ' ',
      field('value', $.continuation_value),
    ),
    continuation_value: $ => token.immediate(/[^\x00\n\r]*/),

    attribute_key: $ => token(/[A-Za-z0-9][A-Za-z0-9_\-]*/),

    // ======================================================================
    //  Manifest-Version (must be "1.0")
    // ======================================================================
    manifest_version: $ => seq('1', '.', '0'),

    // ======================================================================
    //  Bundle-ManifestVersion
    // ======================================================================
    bundle_manifest_version: $ => $.number,

    // ======================================================================
    //  Bundle-SymbolicName (OSGi R8 §3.6.2)
    // ======================================================================
    bundle_symbolic_name: $ => seq(
      $.symbolic_name,
      repeat($.symbolic_name_parameter),
    ),
    symbolic_name: $ => $._unquoted_string,
    symbolic_name_parameter: $ => seq(';', $.directive_or_attribute),

    // ======================================================================
    //  Bundle-Version
    // ======================================================================
    bundle_version: $ => $.version,
    version: $ => $._version,

    // OSGi R8 §3.2.5: major(.minor(.micro(.qualifier)?)?)?
    _version: $ => seq(
      $.number,
      optional(seq(
        '.', $.number,
        optional(seq(
          '.', $.number,
          optional(seq('.', $.version_qualifier)),
        )),
      )),
    ),
    number: $ => token(/[0-9]+/),
    version_qualifier: $ => token(/[A-Za-z0-9_\-]+/),

    // ======================================================================
    //  Simple text headers – single token spanning continuation lines
    // ======================================================================
    bundle_name: $ => $._multiline_text,
    // Bundle-ActivationPolicy: "lazy" (OSGi R8 §3.2.1.1)
    bundle_activation_policy: $ => 'lazy',
    bundle_activator: $ => $._multiline_text,
    bundle_copyright: $ => $._multiline_text,
    bundle_description: $ => $._multiline_text,
    bundle_docurl: $ => $._multiline_text,
    bundle_localization: $ => $._multiline_text,
    bundle_update_location: $ => $._multiline_text,
    bundle_vendor: $ => $._multiline_text,

    // ======================================================================
    //  Comma-separated simple-token headers
    // ======================================================================
    bundle_category: $ => prec.right(seq(
      commaSep1($._simple_token),
      repeat($.continuation_line),
    )),
    bundle_class_path: $ => prec.right(seq(
      commaSep1($._simple_token),
      repeat($.continuation_line),
    )),

    // ======================================================================
    //  Bundle-License (OSGi R8 §3.2.1.11)
    //    Bundle-License ::= '<<EXTERNAL>>' | ( license ( ',' license ) * )
    // ======================================================================
    bundle_license: $ => choice(
      token('<<EXTERNAL>>'),
      commaSep1($.license_clause),
    ),
    license_clause: $ => seq($.license_identifier, repeat($.license_attr)),
    license_identifier: $ => $._unquoted_string,
    license_attr: $ => seq(';', $.directive_or_attribute),

    // ======================================================================
    //  Bundle-Developers
    // ======================================================================
    bundle_developers: $ => commaSep1($.developer_clause),
    developer_clause: $ => seq($.developer_identifier, repeat($.developer_attr)),
    developer_identifier: $ => $._unquoted_string,
    developer_attr: $ => seq(';', $.directive_or_attribute),

    // ======================================================================
    //  Bundle-SCM (OSGi R8 §3.2.1.17: comma-separated attributes)
    // ======================================================================
    bundle_scm: $ => commaSep1($.scm_attr),
    scm_attr: $ => $.attribute,

    // ======================================================================
    //  Bundle-NativeCode
    // ======================================================================
    bundle_native_code: $ => commaSep1($.native_code_clause),
    native_code_clause: $ => seq($.path, repeat($.native_code_attr)),
    native_code_attr: $ => seq(';', $.directive_or_attribute),

    directive_or_attribute: $ => choice(
      $.typed_attribute,
      $.directive,
      $.attribute,
    ),

    // ======================================================================
    //  Bundle-RequiredExecutionEnvironment (OSGi R8 §3.4.1)
    // ======================================================================
    bree: $ => commaSep1($.bree_clause),
    bree_clause: $ => seq(
      $.bree_token,
      optional($.bree_version_suffix),
      optional($.bree_sub_ee),
    ),
    bree_token: $ => token(/[A-Za-z][A-Za-z0-9]*/),
    bree_version_suffix: $ => seq(
      '-',
      $._version,
    ),
    bree_sub_ee: $ => seq(
      '/',
      $.bree_token,
      optional(seq('-', $._version)),
    ),

    // ======================================================================
    //  Bundle-Icon (OSGi R8 §3.2.1.10)
    // ======================================================================
    bundle_icon: $ => commaSep1($.icon_clause),
    icon_clause: $ => seq($.icon_path, repeat($.icon_param)),
    icon_path: $ => $._unquoted_string,
    icon_param: $ => seq(';', $.icon_attr),
    icon_attr: $ => seq(
      $.icon_attr_key,
      '=',
      $.icon_attr_value,
    ),
    icon_attr_key: $ => token(/[A-Za-z][A-Za-z0-9]*/),
    icon_attr_value: $ => token(/[0-9]+/),

    // ======================================================================
    //  Service-Component (OSGi Compendium R8 §112)
    // ======================================================================
    service_component: $ => commaSep1($.path),

    // ======================================================================
    //  Eclipse-PlatformFilter – LDAP filter with optional ; processing
    // ======================================================================
    eclipse_platform_filter: $ => $._multiline_text,

    // ======================================================================
    //  Eclipse-BuddyPolicy – comma-separated policy names
    // ======================================================================
    eclipse_buddy_policy: $ => commaSep1($.buddy_policy_token),
    buddy_policy_token: $ => token(/dependent|global|registered|app|ext|boot|parent/),

    // ======================================================================
    //  Eclipse-RegisterBuddy – comma-separated bundle symbolic names
    //  Parsed as multiline text since comma-separated bundle names
    //  overlap with the external scanner's token boundaries.
    // ======================================================================
    eclipse_register_buddy: $ => $._multiline_text,

    // ======================================================================
    //  Eclipse-ExtensibleAPI – true or false
    // ======================================================================
    eclipse_extensible_api: $ => choice('true', 'false'),

    // ======================================================================
    //  Eclipse-BundleShape – jar or dir
    // ======================================================================
    eclipse_bundle_shape: $ => choice('jar', 'dir'),

    // ======================================================================
    //  Spring-Context – comma-separated context definitions
    //  Parsed as multiline text; the mixed path/directive syntax
    //  (e.g. "*;create-asynchronously:=true;timeout:=60")
    //  conflicts with existing token boundaries.
    // ======================================================================
    spring_context: $ => $._multiline_text,

    // ======================================================================
    //  SpringExtender-Version – version range
    // ======================================================================
    spring_extender_version: $ => $._multiline_text,

    // ======================================================================
    //  Ignore-Package – comma-separated package names (may include wildcards)
    // ======================================================================
    ignore_package: $ => $._multiline_text,

    // ======================================================================
    //  Include-Resource – bnd build instruction
    // ======================================================================
    include_resource: $ => $._multiline_text,

    // ======================================================================
    //  Multi-Release (JAR spec – OSGi R8 §3.2.8)
    // ======================================================================
    multi_release: $ => choice('true', 'false'),

    // ======================================================================
    //  Require-Bundle
    // ======================================================================
    require_bundle: $ => commaSep1($.clause),

    // ======================================================================
    //  Fragment-Host
    // ======================================================================
    fragment_host: $ => $.clause,

    // ======================================================================
    //  DynamicImport-Package (OSGi R8 §3.2.1.22)
    // ======================================================================
    dynamic_import_package: $ => commaSep1($.dynamic_import_clause),
    dynamic_import_clause: $ => seq(
      $.wildcard_name,
      repeat(choice(
        seq(';', $.wildcard_name),
        $.dynamic_import_attribute,
      )),
    ),
    dynamic_import_attribute: $ => seq(';', choice($.typed_attribute, $.directive, $.attribute)),

    // ======================================================================
    //  OSGi Clause syntax (Export/Import/Require/Provide-Capability)
    // ======================================================================

    clause_values: $ => $.clauses,
    capability_values: $ => $.capabilities,

    clauses: $ => commaSep1($.clause),
    capabilities: $ => commaSep1($.capability),

    // generic clause: path followed by parameters and/or semicolon-separated sub-paths
    // used by Export-Package, Import-Package, Require-Bundle, Fragment-Host
    clause: $ => seq(
      $.path,
      repeat(choice(
        $.parameter,
        seq(';', $.path),
      )),
    ),

    // namespace-aware clause for Require-Capability / Provide-Capability
    capability: $ => choice(
      $.namespace_ee_clause,
      $.namespace_identity_clause,
      $.namespace_native_clause,
      $.clause,
    ),

    // ------------------------------------------------------------------
    //  osgi.ee namespace clause (OSGi R8 §8.2)
    //  e.g., osgi.ee;osgi.ee="JavaSE";version:List<Version>="1.2,1.3"
    // ------------------------------------------------------------------
    namespace_ee_clause: $ => seq(
      'osgi.ee',
      repeat(choice(
        seq(';', $.ee_name_attribute),
        seq(';', $.parameter),
      )),
    ),
    ee_name_attribute: $ => seq(
      'osgi.ee',
      '=',
      choice($._quoted_string, $.ee_name_token),
    ),
    ee_name_token: $ => token(/[A-Za-z][A-Za-z0-9]*(\/[A-Za-z][A-Za-z0-9]*)?/),

    // ------------------------------------------------------------------
    //  osgi.identity namespace clause (OSGi R8 §8.6)
    // ------------------------------------------------------------------
    namespace_identity_clause: $ => seq(
      'osgi.identity',
      repeat(seq(';', $.parameter)),
    ),

    // ------------------------------------------------------------------
    //  osgi.native namespace clause (OSGi R8 §8.7)
    // ------------------------------------------------------------------
    namespace_native_clause: $ => seq(
      'osgi.native',
      repeat(seq(';', $.parameter)),
    ),

    parameter: $ => seq(
      ';',
      choice($.typed_attribute, $.directive, $.attribute),
    ),

    // ------------------------------------------------------------------
    //  directive – path ':=' value
    //
    //  Known directives: singleton, fragment-attachment, mandatory,
    //  resolution, cardinality, visibility, extension, effective,
    //  scope, filter, uses, policy
    //  Values are parsed as generic param values.
    // ------------------------------------------------------------------
    directive: $ => seq(
      $.path,
      ':=',
      $.parameter_value,
    ),

    // ------------------------------------------------------------------
    //  typed_attribute – attr:type=value
    //  e.g., version:Version=1.0, osgi.ee:List<String>="JavaSE,OSGi/Minimum"
    // ------------------------------------------------------------------
    typed_attribute: $ => seq(
      $.path,
      ':',
      $._type_name,
      '=',
      choice(
        $.version_range,
        $.filter,
        $.parameter_value,
      ),
    ),

    // type ::= scalar | list
    // scalar ::= 'String' | 'Version' | 'Long' | 'Double'
    // list ::= 'List' ( '<' scalar '>' )?
    _type_name: $ => token(/[A-Za-z][A-Za-z0-9]*(?:<[A-Za-z][A-Za-z0-9]*>)?/),

    // ------------------------------------------------------------------
    //  attribute – simple attribute: name=value
    // ------------------------------------------------------------------
    attribute: $ => prec(3, seq(
      $.path,
      '=',
      choice(
        $.version_range,
        $.filter,
        $.parameter_value,
      ),
    )),

    // Version range – [1.0,2.0) or quoted "[1.0,2.0)"
    version_range: $ => prec(4, seq(
      optional('"'),
      choice('[', '('),
      $._version_interval,
      choice(']', ')'),
      optional('"'),
    )),

    parameter_value: $ => choice($._quoted_string, $._unquoted_string),

    // ======================================================================
    //  Path and string tokens
    // ======================================================================
    path: $ => token(/[A-Za-z0-9][A-Za-z0-9._\-\/]*/),

    _unquoted_string: $ => token(/[^\n\r;,"=<>|&!()\[\]\\]+/),

    _simple_token: $ => token(/[^,\n\r]+/),

    _rest_of_line: $ => token(/[^\n\r]+/),

    // ======================================================================
    //  Version Range interval
    // ======================================================================
    _version_interval: $ => seq(
      $._version,
      ',',
      $._version,
    ),

    // ======================================================================
    //  Filter Syntax (LDAP-style)  – OSGi R8 §3.2.7
    // ======================================================================
    filter: $ => choice(
      $.filter_and,
      $.filter_or,
      $.filter_not,
      $.filter_simple,
    ),

    filter_and: $ => prec.left(seq('&', repeat1($.filter))),

    filter_or: $ => prec.left(seq('|', repeat1($.filter))),

    filter_not: $ => seq('!', $.filter),

    filter_simple: $ => choice(
      $.filter_substring,
      $.filter_present,
      $.filter_compare,
    ),

    filter_compare: $ => seq(
      $.filter_attr,
      choice('>=', '<=', '~=', '='),
      $.filter_value,
    ),

    filter_present: $ => seq($.filter_attr, '=*'),

    filter_substring: $ => seq(
      $.filter_attr,
      '=',
      optional($.filter_value),
      '*',
      optional($.filter_value),
    ),

    filter_attr: $ => token(/[A-Za-z0-9_\-.]+/),

    filter_value: $ => token(/[^\n\r;,"=<>|&!()*\]\\)]+/),

  },
});

// ---- helpers ---------------------------------------------------------------

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
