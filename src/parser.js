/**
 * Parses route pattern.
 *
 * Path parameter placeholders can be specified using a curly brace
 * syntax, which optionally allows a regular expression for the parameter to be specified:
 *
 * - `'{name}'`  - placeholder
 * - `'{name?}'` - optionnal placeholder
 * - `'{name+}'` - recurring placeholder
 * - `'{name*}'` - optionnal recurring placeholder
 * - `'{name:regex}'` - placeholder with regex definition.
 *
 * Parameter names may contain only word characters (latin letters, digits, and underscore) and
 * must be unique within the pattern (across both path and search parameters). For colon
 * placeholders or curly placeholders without an explicit regex, a path parameter matches any
 * number of characters other than '/' (i.e `[^/]+`).
 *
 * Examples:
 *
 * - `'/hello/'` - Matches only if the path is exactly '/hello/'. There is no special treatment for
 *   trailing slashes, and patterns have to match the entire path, not just a prefix.
 * - `'/user/{id}'` - Matches '/user/bob' or '/user/1234!!!' or even '/user/bob/details' but not '/user/' or '/user'.
 * - `'/user/{id:[^/]+}'` - Same as the previous example.
 * - `'/user/{id?}'` - Same as the previous example, but also match '/user' and '/user/'.
 * - `'/user/{id:[0-9a-fA-F]{1,8}}'` - Only matches if the id parameter consists of 1 to 8 hex digits.
 * - `'/files/{path:.*}'` - Matches any URL starting with '/files/' and captures the rest of the
 *   path into the parameter 'path'.
 *
 *
 * The parser can produce a tokens structure from route pattern using `Parser.tokenize()`.
 * A tokens structure root node is of the following form:
 *
 * ```php
 * var token = Parser.tokenize('/test/{param}');
 * ```
 *
 * The returned `token` looks like the following:
 * ```
 * {
 *     optional: false,
 *     greedy: '',
 *     repeat: false,
 *     pattern: '/test/{param}',
 *     tokens: [
 *         '/test/',
 *         {
 *             name: 'param',
 *             pattern: '[^/]+'
 *         }
 *     ]
 * }
 * ```
 *
 * Then tokens structures can be compiled to get the regex representation with associated variable.
 *
 * ```php
 * rule = Parser::compile(token);
 * ```
 *
 * `rule` looks like the following:
 *
 * ```
 * {
 *     '/test/([^/]+)',
 *     [{ param: false }]
 * }
 * ```
 */
class Parser {

  /**
   * Tokenizes a route pattern. Optional segments are identified by square brackets.
   *
   * @param String pattern   A route pattern
   * @param String delimiter The path delimiter.
   * @param Object           The tokens structure root node.
   */
  static tokenize(pattern, delimiter) {
    var context = {};
    delimiter = delimiter ? delimiter : '/';
    return {
      optional: false,
      greedy: '',
      repeat: false,
      pattern: pattern,
      tokens: Parser._tokenizePattern(pattern, delimiter, context)
    };
  }

  /**
   * Tokenizes patterns.
   *
   * @param String pattern   A route pattern
   * @param String delimiter The path delimiter.
   * @param Array            An array of tokens structure.
   */
  static _tokenizePattern(pattern, delimiter, context) {
    var tokens = [];
    var index = 0;
    var path = '';
    var parts = Parser.split(pattern);

    for (var part of parts) {
      if (typeof part === 'string') {
        tokens = tokens.concat(Parser._tokenizeSegment(part, delimiter, context));
        continue;
      }

      var greedy = part[1];
      var repeat = greedy === '+' || greedy === '*';
      var optional = greedy === '?' || greedy === '*';

      var children = Parser._tokenizePattern(part[0], delimiter, context);

      tokens.push({
        optional: optional,
        greedy: greedy ? greedy : '?',
        repeat: repeat ? context.variable : false,
        pattern: part[0],
        tokens: children
      });

    }

    return tokens;
  }

  /**
   * Tokenizes segments which are patterns with optional segments filtered out.
   * Only classic placeholder are supported.
   *
   * @param String pattern   A route pattern with no optional segments.
   * @param String delimiter The path delimiter.
   * @param Array            An array of tokens structure.
   */
  static _tokenizeSegment(pattern, delimiter, context) {
    var tokens = [];
    var key = 0;
    var index = 0;
    var path = '';
    var match;

    while ((match = Parser.VARIABLE_REGEX.exec(pattern)) != null) {
      var m = match[0];

      var offset = match.index;

      path += pattern.slice(index, offset);
      index = offset + m.length;

      if (path) {
        tokens.push(path);
        path = '';
      }

      context.variable = match[1];
      var capture = match[2] ? match[2] : '[^' + delimiter + ']+';

      tokens.push({
        name: context.variable,
        pattern: capture
      });
    }

    if (index < pattern.length) {
      path += pattern.substr(index);
      if (path) {
        tokens.push(path);
      }
    }
    return tokens;
  }

  /**
   * Splits a pattern in segments and patterns.
   * segments will be represented by string value and patterns by an array containing
   * the string pattern as first value and the greedy value as second value.
   *
   * example:
   * `/user[/{id}]*` will gives `['/user', ['id', '*']]`
   *
   * Unfortunately recursive regex matcher can't help here so this function is required.
   *
   * @param String pattern A route pattern.
   * @param Array          The splitted pattern.
   */
  static split(pattern)
  {
    var segments = [];
    var len = pattern.length;
    var buffer = '';
    var opened = 0;

    for (var i = 0; i < len; i++) {
      if (pattern[i] === '{') {
        do {
          buffer += pattern[i++];
          if (pattern[i] === '}') {
            buffer += pattern[i];
            break;
          }
        } while (i < len);
      } else if (pattern[i] === '[') {
        opened++;
        if (opened === 1) {
          segments.push(buffer);
          buffer = '';
        } else {
          buffer += pattern[i];
        }
      } else if (pattern[i] === ']') {
        opened--;
        if (opened === 0) {
          var greedy = '?';
          if (i < len - 1) {
            if (pattern[i + 1] === '*' || pattern[i + 1] === '+') {
              greedy = pattern[i + 1];
              i++;
            }
          }
          segments.push([buffer, greedy]);
          buffer = '';
        } else {
          buffer += pattern[i];
        }
      } else {
        buffer += pattern[i];
      }
    }
    if (buffer) {
      segments.push(buffer);
    }
    if (opened) {
      throw new Error("Number of opening '[' and closing ']' does not match.");
    }
    return segments;
  }

  /**
   * Builds a regex from a tokens structure array.
   *
   * @param  Array token A tokens structure root node.
   * @return Array       An array containing the regex pattern and its associated variable names.
   */
  static compile(token) {
    var name;
    var pattern;
    var variable;
    var variables = [];
    var duplicates = {};
    var regex = '';
    var escapeString = /[|\\{}()[\]^$+*?.]/g;

    for (var child of token['tokens']) {
      if (typeof child === 'string') {
        regex += child.replace(escapeString, '\\$&');
      } else if (child['tokens']) {
        var rule = Parser.compile(child);
        if (child['repeat']) {
          if (rule[1].length > 1) {
            throw new Error("Only a single placeholder is allowed in repeatable segments.");
          }
          regex += '((?:' + rule[0] + ')' + child['greedy'] + ')';
        } else if (child['optional']) {
          regex += '(?:' + rule[0] + ')?';
        }
        for (variable of rule[1]) {
          name = variable.name;
          if (duplicates[name]) {
            throw new Error("Cannot use the same placeholder `" + name + "` twice.");
          }
          duplicates[name] = true;
          variables.push(variable);
        }
      } else {
        name = child['name'];
        if (duplicates[name]) {
          throw new Error("Cannot use the same placeholder `" + name + "` twice.");
        }
        duplicates[name] = true;
        if (token['repeat']) {
          variables.push({ name: name, pattern: token['pattern'] });
          regex += child['pattern'];
        } else {
          variables.push({ name: name, pattern: false });
          regex += '(' + child['pattern'] + ')';
        }
      }
    }
    return [regex, variables];
  }
}

Parser.VARIABLE_REGEX = /\{(\w+)(?::([^{}]*(?:\{(?:([^{}]*(?:\{(?:.*?)\}[^{}]*)*))\}[^{}]*)*))?\}/g
export default Parser;
