var Emitter = require('component-emitter');
var qs = require('qs');
var trim = require('trim-character');
var extend = require('extend-merge').extend;
var merge = require('extend-merge').merge;
var Route = require('./route');
var Transition = require('./transition');

class Router {

  constructor(options) {
    this._options = extend({
      basePath: null,
      mode: (history && history.pushState) ? 'history' : 'hash',
      handler: (name, routes) => {
        throw new Error('Missing dispatching handler, you need to define a dispatching handler.');
      }
    }, options);

    if (!this._options.basePath) {
      var bases = document.getElementsByTagName('base');
      this._options.basePath = bases.length > 0 ? bases[0].href.replace(/^(?:\/\/|[^\/]+)*\//, "") : '';
    }
    this._basePath = trim(this._options.basePath, '/');
    this._basePath = this._basePath ?  '/' + this._basePath : '';
    this._route = new Route();
    this._interval = null;
    /**
     * The current route instance
     *
     * var Object
     */
    this._current = null;
  }

  /**
   * Gets/sets the router dispatch handler.
   *
   * @param  Function      handler The dispatch handler.
   * @return Function|self         The dispatch handler on get or `this` on set.
   */
  handler(handler) {
    if (!arguments.length) {
      return this._options.handler;
    }
    this._options.handler = handler;
    return this;
  }

  /**
   * Adds a route state.
   *
   * @param  mixed   names   The dotted route name string or a route name array.
   * @param  String  pattern A string pattern.
   * @param  Object  content The custom route content to attach to the pattern
   *
   * @return self
   */
  add(name, pattern, content) {
    this._route.add(name, pattern, content);
    return this;
  }

  /**
   * Get the current route name.
   *
   * @return String|undefined
   */
  name() {
    if (!this._current) {
      return;
    }
    return this._current.name();
  }

  /**
   * Get/set the current route.
   *
   * @param  Object|undefined The current route to set or none to get the setted one.
   * @return Object|self
   */
  current(route) {
    if (!arguments.length) {
      return this._current;
    }
    this._current = route;
    return this;
  }

  /**
   * Generates an URL from a route name and route params.
   *
   * @param  String name  The route name
   * @param  Object params The route params (key-value pairs)
   * @return String        The built URL
   */
  link(name, params, options) {

    if (name && name.match(/^(.*:)?\/\/.*/)) {
      return name;
    }

    var defaults = {
      'absolute': false,
      'basePath': this._basePath,
      'query': '',
      'fragment': ''
    };
    options = extend({}, defaults, options);

    var path = this._route.link(name, params);

    path = trim.right(options.basePath, '/') + (this._options.mode === 'hash' ? '#' : '') + path;

    if (typeof options['query'] !== 'string') {
      options['query'] = qs.stringify(options['query']);
    }

    var query = options['query'] ? '?' + options['query'] : '';
    var fragment = options['fragment'] ? '#' + options['fragment'] : '';

    var link = path + query + fragment;
    link = '/' + trim.left(link, '/');

    if (options.absolute) {
      options = extend({}, { scheme: 'http', host: 'localhost' }, options);
      options.scheme = options.scheme ? options.scheme + '://' : '//';
      link = options.scheme + options.host + link;
    }
    return link;
  }

  /**
   * Match a path against the route tree.
   *
   * @param  String path   The path to match
   * @return Object        The matched route object (null if no match)
   */
  match(url) {
    var parts = url.split('?');
    var path = trim.left(parts[0], '/');
    var bag = this._route.match(path);
    var result;

    if (bag) {
      if (path[1]) {
        bag.params = extend({}, qs.parse(parts[1]), bag.params);
      }
      result = new Transition({
        from: this.current(),
        to: bag.route,
        params: bag.params
      });
    }
    return result;
  }

  location() {
    var path = '';
    if (this._options.mode === 'history') {
      path = decodeURI(location.pathname + location.search);
      path = path.replace(/\?(.*)$/, '');
      path = path.replace(this._basePath, '');
    } else {
      var match = window.location.href.match(/#(.*)$/);
      path = match ? match[1] : '';
    }
    return path.replace(/index\.html$/, '');
  }

  push(name, params, options) {
    var path = this.link(name, params, options);
    var promise = new Promise(function(resolve, reject) {
      function transitioned(transition) {
        if (transition.to().name() === name) {
          resolve(this.location());
          this.off('transitioned', transitioned);
        }
      }
      function errored(transition) {
        if (transition.to().name() === name) {
          reject(this.location());
          this.off('424', errored);
        }
      }
      this.on('transitioned', transitioned);
      this.on('424', errored);
    }.bind(this));
    if (this._options.mode === 'history') {
        history.pushState(null, null, this._basePath + path);
    } else {
        location.href = location.href.replace(/#(.*)$/, '') + '#' + path;
    }
    return promise;
  }

  listen() {
    if (this._interval) {
      return;
    }
    var current = undefined;

    var listen = () => {
      var path = this.location();
      if (current === path) {
        return;
      }
      current = path;

      var transition = this.match(path);
      if (!transition) {
        this.emit('404', path);
        return;
      }

      return this._options.handler(transition, this).then(() => {
        this.current(transition.to());
        this.emit('transitioned', transition);
      }, () => {
        this.emit('424', transition);
        if (this.current()) {
          this.push(this.name());
        }
      });
    };

    var result = listen();
    this._interval = setInterval(listen, 50);
    return result;
  }

  stop() {
    if (!this._interval) {
      return;
    }
    clearInterval(this._interval);
  }
}

Emitter(Router.prototype);

module.exports = Router;
