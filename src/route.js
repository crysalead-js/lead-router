var qs = require('qs');
var extend = require('extend-merge').extend;
var merge = require('extend-merge').merge;
var trim = require('trim-character');
var Parser = require('./parser');

class Route {

  /**
   * Constructor.
   */
  constructor(config) {
    var defaults = {
      name: '',
      pattern: '',
      content: {},
      params: {},
      parent: null
    };

    config = extend({}, defaults, config);

    /**
     * Route's name.
     *
     * @var String
     */
    this._name = '';

    /**
     * Route's pattern.
     *
     * @var String
     */
    this._pattern = null;

    /**
     * Route's content
     *
     * @var Object
     */
    this._content = {};

    /**
     * Route's params
     *
     * @var Object
     */
    this._params = {};

    /**
     * Route's parent.
     *
     * @var Object
     */
    this._parent = null;

    /**
     * Route's pattern token structure.
     *
     * @var Object
     */
    this._token = null;

    /**
     * Route's regex pattern.
     *
     * @var String
     */
    this._regex = null;

    /**
     * Route's variables.
     *
     * @var Array
     */
    this._variables = [];

    /**
     * Route's query string variables.
     *
     * @var Array
     */
    this._queryString = [];

    /**
     * Children trees.
     *
     * @var Array
     */
    this._children = new Map();

    /**
     * Arbitarty data attached to the route
     *
     * @var Object
     */
    this._data = {};

    /**
     * Route's name.
     *
     * @var String
     */
    this.name(config['name']);

    /**
     * Route's name.
     *
     * @var String
     */
    this.params(config['params']);

    /**
     * Route content.
     *
     * @var Object
     */
    this.content(config['content']);

    /**
     * Route parent.
     *
     * @var Object
     */
    this.parent(config['parent']);

    /**
     * Route pattern.
     *
     * @var Array
     */
    this.pattern(config['pattern']);
  }

  /**
   * Gets/sets the route name.
   *
   * @param  Object      name The route's name to set or none to get the setted one.
   * @return Object|self      The route's name on get or `this` on set.
   */
  name(name) {
    if (!arguments.length) {
      return this._name;
    }
    this._name = name;
    return this;
  }

  /**
   * Gets/sets the route params.
   *
   * @param  Object      params The route's params to set or none to get the setted one.
   * @return Object|self        The route's params on get or `this` on set.
   */
  params(params) {
    if (!arguments.length) {
      return this._params;
    }
    this._params = params;
    return this;
  }

  /**
   * Gets/sets the route content.
   *
   * @param  Object      content The route's content to set or none to get the setted one.
   * @return Object|self         The route's content on get or `this` on set.
   */
  content(content) {
    if (!arguments.length) {
      return this._content;
    }
    this._content = content;
    return this;
  }

  /**
   * Gets the whole custom data.
   *
   * @return Object|self      The route's data on get or `this` on set.
   */
  data(data) {
    return this._data;
  }

  /**
   * Gets a custom data.
   *
   * @param  String name If name is defined, it'll only return the field value.
   * @return mixed.
   */
  get(name) {
    return this._data[name];
  }

  /**
   * Sets one or several properties.
   *
   * @param  mixed name    A field name or an associative array of fields and values.
   * @param  Array data    An associative array of fields and values or an options array.
   * @param  Array options An options array.
   * @return object        Returns `this`.
   */
  set(name, value) {
    if (arguments.length !== 1) {
      this._data[name] = value;
      return this;
    }
    var data = name || {};
    if (data === null || typeof data !== 'object' || data.constructor !== Object) {
      throw new Error('A plain object is required to set data in bulk.');
    }
    for (var key in data) {
      this._data[key] = data[key];
    }
    return this;
  }

  /**
   * Checks if property exists.
   *
   * @param String name A field name.
   */
  isset(name) {
    return this._data[name] !== undefined;
  }

  /**
   * Unsets a property.
   *
   * @param String name A field name.
   */
  unset(name) {
    delete this._data[name];
    return this;
  }

  /**
   * Clears the route custom data.
   *
   * @return self Returns `this`.
   */
  clear() {
    this._data = {};
    return this;
  }

  /**
   * Gets/sets the route parent.
   *
   * @param  Object      parent The route's parent to set or none to get the setted one.
   * @return Object|self        The route's parent on get or `this` on set.
   */
  parent(parent) {
    if (!arguments.length) {
      return this._parent;
    }
    this._parent = parent;
    return this;
  }

  /**
   * Returns all routes up to the root one.
   *
   * @return Array All the routes.
   */
  hierarchy() {
    var current = this;
    var routes = [];
    do {
      routes.unshift(current);
    } while (current = current.parent());
    return routes;
  }

  /**
   * Gets/sets the route pattern.
   *
   * @param  String      pattern The route pattern to set or none to get the setted one.
   * @return String|self         The route pattern on get or `this` on set.
   */
  pattern(pattern) {
    if (!arguments.length) {
      return this._pattern;
    }
    var parts = pattern.split('?');
    this._pattern = trim.left(parts[0], '/');
    this._token = Parser.tokenize(this._pattern);
    var rule = Parser.compile(this._token);
    this._regex = rule[0];
    this._variables = rule[1];

    if (parts[1]) {
      var params = parts[1].split('&');
      for (var param of params) {
        this._queryString.push(param.substring(1, param.length - 1));
      }
    }
    return this;
  }

  /**
   * Gets the route's pattern root token.
   *
   * return Object
   */
  token() {
    return this._token;
  }

  /**
   * Gets the route's pattern regexp.
   *
   * return String
   */
  regex() {
    return this._regex;
  }

  /**
   * Gets the route's pattern variables.
   *
   * return Array
   */
  variables() {
    return this._variables;
  }

  /**
   * Checks if an URL match the route
   *
   * @param  String path              The URL path string.
   * @param  Object queryString       The URL queryString.
   * @param  Object queryStringParams The matched queryString params.
   * @return Object                   Returns the matched variables or `undefined` if the URL doesn't match.
   */
  match(path, queryString, queryStringParams) {
    var regex = new RegExp('^' + this._regex);
    var matches = regex.exec(path);
    if (!matches) {
      return;
    }

    queryStringParams = extend(queryStringParams || {}, this._buildQueryStringVariables(queryString));
    var result;
    for (var [name, child] of this) {
      result = child.match(path, queryString, queryStringParams);
      if (result !== undefined) {
        return result;
      }
    }

    regex = new RegExp('^' + this._regex + '\/?$');
    matches = regex.exec(path);
    if (!matches) {
      return;
    }

    return {
      route: this,
      params: extend ({}, this.params(), this._buildVariables(matches), queryStringParams || {})
    };
  }

  /**
   * Combines route's variables names with the regex matched route's values.
   *
   * @param  Array  varNames The variable names array with their corresponding pattern segment when applicable.
   * @param  Array  values   The matched values.
   * @return Object          The route's variables.
   */
  _buildVariables(values) {
    var variables = {};
    var i = 1;

    for (var variable of this.variables()) {
      var name = variable.name;
      var pattern = variable.pattern;

      if (!values[i]) {
        variables[name] = !pattern ? null : [];
        i++;
        continue;
      }
      if (!pattern) {
        variables[name] = values[i] ? values[i] : null;
      } else {
        variables[name] = [];

        var token = Parser.tokenize(pattern, '/');
        var rule = Parser.compile(token);

        var regex = new RegExp(rule[0], 'g');
        var matches;

        while (matches = regex.exec(values[i])) {
          var value = matches[1];
          if (value.indexOf('/') !== -1) {
            variables[name].push(value.split('/'));
          } else {
            variables[name].push(value);
          }
        }
      }
      i++;
    }
    return variables;
  }

  /**
   * Combines route's query string with url query string values.
   *
   * @param  String queryString The url query string.
   * @return Object             The query string variables.
   */
  _buildQueryStringVariables(queryString) {
    var params = {};
    for (var name of this._queryString) {
      if (queryString[name] !== undefined) {
        params[name] = queryString[name];
      }
    }
    return params;
  }

  /**
   * Check if a route is still identical with two different set of params.
   *
   * @param Object  fromParams
   * @param Object  toParams
   * @param Boolean
   */
  matchParams(fromParams, toParams) {
    for (var name of this._queryString) {
      if (String(fromParams[name]) !== String(toParams[name])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns the route path.
   *
   * @param  Array  params The route's variable parameters.
   * @return string        The route path.
   */
  path(params) {
    var params = extend ({}, this.params(), params);
    var path = this._path(this.token(), params);
    path = trim.left(path, '/');
    return path ? '/' + path : path;
  }

  /**
   * Helper for `Route::path()`.
   *
   * @param  array  $token    The token structure array.
   * @param  array  $params   The route parameters.
   * @return string           The URL path representation of the token structure array.
   */
  _path(token, params)
  {
    var path = '';
    for (var child of token['tokens']) {
      if (typeof child === 'string') {
        path += child;
        continue;
      }
      if (child.tokens !== undefined) {
        if (child.repeat) {
          var name = child.repeat;
          var values = Array.isArray(params[name]) ? params[name] : (params[name] != null ? [params[name]] : []);
          if (!values.length && !child.optional) {
            throw new Error("Missing parameters `'"  + name + "'` for route: `'" + this.name() + "#/" + this.pattern() + "'`.");
          }
          for (var value of values) {
            path += this._path(child, extend({}, params, { [name]: value }));
          }
        } else {
          path += this._path(child, params);
        }
        continue;
      }
      if (params[child.name] == null) {
        if (!token.optional) {
          throw new Error("Missing parameters `'"  + child.name + "'` for route: `'" + this.name() + "#/" + this.pattern() + "'`.");
        }
        return '';
      }

      var data = params[child.name];
      var parts = [];
      if (data) {
        parts = Array.isArray(data) ? data : [data];
      }

      for (var i = 0, len = parts.length; i < len; i++) {
        parts[i] = encodeURIComponent(parts[i]);
      }

      var value = parts.join('/');
      var regex = new RegExp('^' + child.pattern + '$');
      if (!regex.test(value)) {
        throw new Error("Expected `'" + child.name + "'` to match `'" + child.pattern + "'`, but received `'" + value + "'`.");
      }
      path += value;
    }
    return path;
  }

  /**
   * Returns the route path.
   *
   * @param  mixed  names   The dotted route name string or a route name array.
   * @param  Array  params  The route parameters.
   * @param  Array  options Options for generating the proper prefix. Accepted values are:
   *                        - `'query'`    _mixed_   : The query string.
   * @return string         The prefixed path, depending on the passed options.
   */
  link(names, params, options) {
    var defaults = {
      'query': {},
    };
    options = extend({}, defaults, options);

    if (typeof options['query'] === 'string') {
      options['query'] = qs.parse(options['query']);
    }

    if (names == null) {
      throw new Error("A route's name can't be empty.");
    }
    names = Array.isArray(names) ? names : names.split('.');
    params = params || {};
    options.query = extend(options.query, this._buildQueryStringVariables(params));

    if (names.length === 0) {
      return this.path(params);
    } else {
      if (!this._children.has(names[0])) {
        throw new Error("Missing parent route `'" + names[0] + "'`.");
      }
      var child = this._children.get(names[0]);
      names.shift();
      return child.link(names, params, options);
    }
  }

  /**
   * Gets/sets a route state.
   *
   * @param  mixed   names   The dotted route name string or a route name array.
   * @param  String  pattern A string pattern.
   * @param  Object  content The custom route content to attach to the pattern
   *
   * @return self
   */
  add(names, pattern, content) {
    if (names == null) {
      throw new Error("A route's name can't be empty.");
    }
    names = Array.isArray(names) ? names : names.split('.');

    pattern = pattern || '';
    content = content || {};

    if (names.length === 1) {
      this._children.set(names[0], new Route({
        name: this.name() ? this.name() + '.' + names[0] : names[0],
        pattern: this.pattern() + '/' + trim.left(pattern, '/'),
        content: content,
        parent: this
      }));
    } else {
      if (!this._children.has(names[0])) {
        throw new Error("Missing parent route `'" + names[0] + "'`.");
      }
      var parent = this._children.get(names[0]);
      names.shift();
      parent.add(names, pattern, content);
    }
    return this;
  }


  /**
   * Return a route instance from a route name.
   *
   * @param  mixed  names The dotted route name string or a route name array.
   * @return Object       Returns the corresponding route.
   */
  fetch(names) {
    if (names == null) {
      throw new Error("A route's name can't be empty.");
    }
    names = Array.isArray(names) ? names : names.split('.');

    if (names.length === 0) {
      return this;
    } else {
      if (!this._children.has(names[0])) {
        throw new Error("Missing children route `'" + names[0] + "'` for `'" + this.name() + "'`.");
      }
      var child = this._children.get(names[0]);
      names.shift();
      return child.fetch(names);
    }
  }

  /**
   * Iterator
   */
  [Symbol.iterator]() {
    return this._children[Symbol.iterator]();
  }
}

module.exports = Route
