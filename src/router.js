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
      mode: history.pushState ? 'history' : 'hash',
      dispatch: (state, routes) => {
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
  state(name, pattern, content) {
    this._route.state(name, pattern, content);
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
        from: Router.currentRoute,
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
    return path;
  }

  navigate(name, params, options) {
    var path = this._route.link(name, params, options);
    if (this._options.mode === 'history') {
        history.pushState(null, null, this._basePath + path);
    } else {
        location.href = location.href.replace(/#(.*)$/, '') + '#' + path;
    }
    return this.location();
  }

  start() {
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

      return this._options.dispatch(transition, this).then(() => {
        Router.currentRoute = transition.to();
      }, () => {
        this.emit('424', transition.to());
        if (Router.currentRoute) {
          this.navigate(Router.currentRoute.name());
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

/**
 * The current route instance
 *
 * var Object
 */
Router.currentRoute = null;

module.exports = Router;
