#include "tree_sitter/parser.h"
#include <stdbool.h>
#include <string.h>

enum TokenType {
  WILDCARD_NAME,
  PATH,
  UNQUOTED_STRING,
  QUOTED_STRING,
  MULTILINE_TEXT,
  FILTER_QUOTED_VALUE,
};

// ---- helpers ---------------------------------------------------------------

static bool is_path_char(int32_t c) {
  return (c >= 'A' && c <= 'Z') ||
         (c >= 'a' && c <= 'z') ||
         (c >= '0' && c <= '9') ||
         c == '.' || c == '_' || c == '-' || c == '/';
}

static bool is_unquoted_string_char(int32_t c) {
  if (c == '\n' || c == '\r' || c == 0) return false;
  if (c == ';' || c == ',' || c == '"' || c == '=') return false;
  if (c == '<' || c == '>' || c == '|' || c == '&') return false;
  if (c == '!' || c == '(' || c == ')') return false;
  if (c == '[' || c == ']' || c == '\\') return false;
  return true;
}

// Check if newline+space prefix is a continuation line
static bool check_continuation(TSLexer *lexer) {
  if (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\f') {
    return true;
  }
  return false;
}

// ---- scan_multiline_text: single token spanning continuation lines -------

static bool scan_multiline_text(TSLexer *lexer) {
  if (lexer->lookahead == '\n' || lexer->lookahead == '\r' || lexer->lookahead == 0) {
    return false;
  }

  while (lexer->lookahead != '\n' &&
         lexer->lookahead != '\r' &&
         lexer->lookahead != 0) {
    lexer->advance(lexer, false);
    lexer->mark_end(lexer);
  }

  while (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
    while (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
      lexer->advance(lexer, false);
    }

    if (check_continuation(lexer)) {
      while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\f') {
        lexer->advance(lexer, false);
      }

      while (lexer->lookahead != '\n' &&
             lexer->lookahead != '\r' &&
             lexer->lookahead != 0) {
        lexer->advance(lexer, false);
        lexer->mark_end(lexer);
      }
    } else {
      break;
    }
  }

  lexer->result_symbol = MULTILINE_TEXT;
  return true;
}

// ---- filter_quoted_value: quoted string inside filter --------------------
//
//  Matches a double-quoted string that appears inside LDAP filter syntax.
//  The key difference from _quoted_string is that this scanner stops at
//  a closing paren ')' after the final quote, since the filter grammar
//  wraps the value in parens: (attr="value")
//
static bool scan_filter_quoted_value(TSLexer *lexer) {
  if (lexer->lookahead != '"') return false;
  lexer->advance(lexer, false);  // consume opening quote

  while (true) {
    if (lexer->lookahead == '"') {
      // Closing quote – consume it and then stop (don't consume ')' after)
      lexer->advance(lexer, false);
      lexer->mark_end(lexer);
      lexer->result_symbol = FILTER_QUOTED_VALUE;
      return true;
    }

    if (lexer->lookahead == '\\') {
      // Backslash escape – consume backslash + next char
      lexer->advance(lexer, false);
      if (lexer->lookahead != 0 && lexer->lookahead != '\n' && lexer->lookahead != '\r') {
        lexer->advance(lexer, false);
        lexer->mark_end(lexer);
      } else if (lexer->lookahead == 0) {
        lexer->result_symbol = FILTER_QUOTED_VALUE;
        return true;
      }
      continue;
    }

    if (lexer->lookahead == 0) {
      lexer->result_symbol = FILTER_QUOTED_VALUE;
      return true;
    }

    if (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
      while (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
        lexer->advance(lexer, false);
      }

      if (check_continuation(lexer)) {
        while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\f') {
          lexer->advance(lexer, false);
        }
        continue;
      }

      lexer->result_symbol = FILTER_QUOTED_VALUE;
      return true;
    }

    // Regular character inside quotes
    lexer->advance(lexer, false);
    lexer->mark_end(lexer);
  }
}

// ---- scanner core ----------------------------------------------------------

void *tree_sitter_osgi_bundle_manifest_external_scanner_create(void) {
  return NULL;
}

void tree_sitter_osgi_bundle_manifest_external_scanner_destroy(void *payload) {
  (void)payload;
}

unsigned tree_sitter_osgi_bundle_manifest_external_scanner_serialize(
    void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}

void tree_sitter_osgi_bundle_manifest_external_scanner_deserialize(
    void *payload, const char *buffer, unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

// ---- scan_wildcard_name ------------------------------------------------
//
//  Matches [A-Za-z0-9._\-]*\* (must contain at least one '*').
//  Must be checked BEFORE scan_path so names like com.foo.*
//  are consumed in one token rather than split into path + orphaned '*'.
//
static bool scan_wildcard_name(TSLexer *lexer) {
  int32_t c = lexer->lookahead;
  if (!((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') ||
        c == '.' || c == '_' || c == '-' || c == '*')) {
    return false;
  }

  bool has_star = false;
  while (true) {
    c = lexer->lookahead;
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') ||
        c == '.' || c == '_' || c == '-' || c == '*') {
      if (c == '*') has_star = true;
      lexer->advance(lexer, false);
      lexer->mark_end(lexer);
    } else {
      break;
    }
  }

  if (!has_star) return false;

  lexer->result_symbol = WILDCARD_NAME;
  return true;
}

// ---- scan_path ----------------------------------------------------

static bool scan_path(TSLexer *lexer) {
  if (!is_path_char(lexer->lookahead)) return false;

  while (is_path_char(lexer->lookahead)) {
    lexer->advance(lexer, false);
    lexer->mark_end(lexer);
  }

  if (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
    while (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
      lexer->advance(lexer, false);
    }

    if (check_continuation(lexer)) {
      while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\f') {
        lexer->advance(lexer, false);
      }

      if (is_path_char(lexer->lookahead)) {
        while (is_path_char(lexer->lookahead)) {
          lexer->advance(lexer, false);
          lexer->mark_end(lexer);
        }

        while (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
          while (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
            lexer->advance(lexer, false);
          }

          if (check_continuation(lexer)) {
            while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\f') {
              lexer->advance(lexer, false);
            }
            if (is_path_char(lexer->lookahead)) {
              while (is_path_char(lexer->lookahead)) {
                lexer->advance(lexer, false);
                lexer->mark_end(lexer);
              }
              continue;
            }
          }
          break;
        }

        lexer->result_symbol = PATH;
        return true;
      }
    }
  }

  lexer->result_symbol = PATH;
  return true;
}

static bool scan_unquoted_string(TSLexer *lexer) {
  if (!is_unquoted_string_char(lexer->lookahead)) return false;

  while (is_unquoted_string_char(lexer->lookahead)) {
    lexer->advance(lexer, false);
    lexer->mark_end(lexer);
  }

  if (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
    while (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
      lexer->advance(lexer, false);
    }

    if (check_continuation(lexer)) {
      while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\f') {
        lexer->advance(lexer, false);
      }

      if (is_unquoted_string_char(lexer->lookahead)) {
        while (is_unquoted_string_char(lexer->lookahead)) {
          lexer->advance(lexer, false);
          lexer->mark_end(lexer);
        }

        while (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
          while (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
            lexer->advance(lexer, false);
          }

          if (check_continuation(lexer)) {
            while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\f') {
              lexer->advance(lexer, false);
            }
            if (is_unquoted_string_char(lexer->lookahead)) {
              while (is_unquoted_string_char(lexer->lookahead)) {
                lexer->advance(lexer, false);
                lexer->mark_end(lexer);
              }
              continue;
            }
          }
          break;
        }

        lexer->result_symbol = UNQUOTED_STRING;
        return true;
      }
    }
  }

  lexer->result_symbol = UNQUOTED_STRING;
  return true;
}

// ---- scan_quoted_string -------------------------------------------------
//
//  Handles OSGi quoted values ("...").  Supports backslash escaping
//  of \" (quote), \\ (backslash), \, (comma), and continuation lines.
//
static bool scan_quoted_string(TSLexer *lexer) {
  if (lexer->lookahead != '"') return false;
  lexer->advance(lexer, false);  // consume opening quote

  while (true) {
    if (lexer->lookahead == '"') {
      // Closing quote – done
      lexer->advance(lexer, false);
      lexer->mark_end(lexer);
      lexer->result_symbol = QUOTED_STRING;
      return true;
    }

    if (lexer->lookahead == '\\') {
      // Backslash escape – consume backslash + next char
      lexer->advance(lexer, false);
      if (lexer->lookahead != 0 && lexer->lookahead != '\n' && lexer->lookahead != '\r') {
        lexer->advance(lexer, false);
        lexer->mark_end(lexer);
      } else if (lexer->lookahead == 0) {
        lexer->result_symbol = QUOTED_STRING;
        return true;
      }
      continue;
    }

    if (lexer->lookahead == 0) {
      lexer->result_symbol = QUOTED_STRING;
      return true;
    }

    if (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
      // Hit newline inside quoted string – check for continuation
      while (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
        lexer->advance(lexer, false);
      }

      if (check_continuation(lexer)) {
        while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\f') {
          lexer->advance(lexer, false);
        }
        continue;  // restart inner loop
      }

      // Not a continuation – end token without closing quote
      lexer->result_symbol = QUOTED_STRING;
      return true;
    }

    // Regular character inside quotes
    lexer->advance(lexer, false);
    lexer->mark_end(lexer);
  }
}

bool tree_sitter_osgi_bundle_manifest_external_scanner_scan(
    void *payload,
    TSLexer *lexer,
    const bool *valid_symbols) {
  (void)payload;

  // WILDCARD_NAME must be checked before PATH so that
  // names containing '*' (e.g., com.foo.*) are consumed as a single
  // wildcard token instead of being split into path + orphan '*'.
  if (valid_symbols[WILDCARD_NAME] && scan_wildcard_name(lexer)) {
    return true;
  }

  if (valid_symbols[FILTER_QUOTED_VALUE] && scan_filter_quoted_value(lexer)) {
    return true;
  }

  if (valid_symbols[PATH] && scan_path(lexer)) {
    return true;
  }

  if (valid_symbols[UNQUOTED_STRING] && scan_unquoted_string(lexer)) {
    return true;
  }

  if (valid_symbols[QUOTED_STRING] && scan_quoted_string(lexer)) {
    return true;
  }

  if (valid_symbols[MULTILINE_TEXT] && scan_multiline_text(lexer)) {
    return true;
  }

  return false;
}
