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
      basePath: '',
      handler: (name, routes) => {
        throw new Error('Missing dispatching handler, you need to define a dispatching handler.');
      },
      interval: 100
    }, options);

    if (!this._options.basePath) {
      var bases = document.getElementsByTagName('base');
      this._options.basePath = bases.length > 0 ? bases[0].href.replace(/^(?:\/\/|[^\/]+)*\//, "") : '';
    }
    /**
     * The router base path
     *
     * var String
     */
    this._basePath = trim(this._options.basePath, '/');
    this._basePath = this._basePath ?  '/' + this._basePath : '';

    /**
     * The router base path regexp
     *
     * var RegExp
     */
    var basePath = this._basePath.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    this._basePathRegExp =  new RegExp('^' + '(' + basePath + '$|' + basePath + '\/)');

    /**
     * The router's tree
     *
     * var Object
     */
    this._route = new Route();

    /**
     * The ongoing route instance
     *
     * var Object
     */
    this._ongoingRoute = null;

    /**
     * The ongoing params
     *
     * var Object
     */
    this._ongoingParams = {};

    /**
     * The current route instance
     *
     * var Object
     */
    this._currentRoute = null;

    /**
     * The current params
     *
     * var Object
     */
    this._currentParams = {};

    /**
     * The current location
     *
     * var String
     */
    this._currentLocation = null;

    /**
     * The URL listener
     *
     * var Function
     */
    this._listener = null;

    /**
     * The URL checked
     *
     * var RegExp
     */
    this._isAbsoluteUrl = new RegExp('^(?:[a-z]+:)?//', 'i');
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
   * Get/set the ongoing route.
   *
   * @param  Object|undefined The ongoing route to set or none to get the setted one.
   * @return Object|self
   */
  ongoingRoute(route) {
    if (!arguments.length) {
      return this._ongoingRoute;
    }
    this._ongoingRoute = route;
    return this;
  }

  /**
   * Get/set the ongoing params.
   *
   * @param  Object|undefined The ongoing params to set or none to get the setted one.
   * @return Object|self
   */
  ongoingParams(params) {
    if (!arguments.length) {
      return this._ongoingParams;
    }
    this._ongoingParams = extend({}, params);
    return this;
  }

  /**
   * Get/set the current route.
   *
   * @param  Object|undefined The current route to set or none to get the setted one.
   * @return Object|self
   */
  currentRoute(route) {
    if (!arguments.length) {
      return this._currentRoute;
    }
    this._currentRoute = route;
    return this;
  }

  /**
   * Get/set the current params.
   *
   * @param  Object|undefined The current params to set or none to get the setted one.
   * @return Object|self
   */
  currentParams(params) {
    if (!arguments.length) {
      return this._currentParams;
    }
    this._currentParams = extend({}, params);
    return this;
  }

  /**
   * Get/set the current URL.
   *
   * @param  String|undefined location The current location to set or none to get the setted one.
   * @return String|self
   */
  currentLocation(location) {
    if (!arguments.length) {
      return this._currentLocation;
    }
    var path = '/' + trim.left(location, '/');
    this._currentLocation = '/' + trim.left(path.replace(this._basePathRegExp, '').replace(/index\.html$/, ''), '/');
    return this;
  }

  /**
   * Check is a state is active or not.
   *
   * @param  params Object  The params of the state.
   * @return        Boolean
   */
  isActive(name, params) {
    var currentRoute = this.currentRoute();
    if (!this._currentRoute) {
      return false;
    }
    function paramsMatch(currentParams, params) {
      if (currentParams === params) {
        return true;
      }
      for (var name in params) {
        if (String(currentParams[name]) !== String(params[name])) {
          return false;
        }
      }
      return true;
    }
    var currentRouteName = currentRoute.name();
    return (name === currentRouteName || currentRouteName.indexOf(name + '.') === 0) && paramsMatch(this.currentParams(), params);
  }

  /**
   * Generate an URL from a route name and route params.
   *
   * @param  String name    The route name
   * @param  Object params  The route params (key-value pairs)
   * @param  Object options Some link generation options
   * @return String         The built URL
   */
  link(name, params, options) {
    if (name && name.match(/^(.*:)?\/\/.*/)) {
      return name;
    }

    if (name === '.') {
      var ongoingRoute = this.ongoingRoute();
      if (ongoingRoute) {
        name = ongoingRoute.name();
      } else {
        throw new Error("No current route available, the `'.'` shortcut can't be used.");
      }
    }
    var defaults = {
      basePath: this._basePath,
      query: undefined
    };
    options = extend({}, defaults, options);

    var route, content;

    do {
      route = this._route.fetch(name);
      content = route.content();
      if (content.redirectTo) {
        name = content.redirectTo;
      }
    } while(content.redirectTo);

    if (typeof options.query === 'string') {
      options.query = qs.parse(options.query);
    } else if (options.query == null) {
      options.query = this.buildQueryParams(name, params);
    }

    return route.link(params, options);
  }

  /**
   * Build query string params.
   *
   * @param  mixed  names   The dotted route name string or a route name array.
   * @param  Array  params  The route parameters.
   * @return Object         The query string parameters.
   */
  buildQueryParams(names, params) {
    if (names == null) {
      throw new Error("A route's name can't be empty.");
    }

    names = Array.isArray(names) ? names : names.split('.');

    var route = this._route;
    var params = params || {};
    var result = {}

    while(names.length) {
      var route = route.getChildren(names[0]);
      result = extend(result, route.buildQueryParams(params));
      names.shift();
    }
    return result;
  }

  /**
   * Return a transition matching a defined URL.
   *
   * @param  String location The location to match
   * @return Object          The matched transition object (undefined if no match found)
   */
  match(location) {
    var parts = location.split('?');
    var path = trim.left(parts[0], '/');
    var bag = this._route.match(path, parts[1] ? qs.parse(parts[1]) : {});

    if (!bag) {
      return;
    }

    var content = bag.route.content();

    while (content.redirectTo) {
      var name = content.redirectTo;
      bag.route = this._route.fetch(name);
      content = bag.route.content();
    }

    return new Transition({
      from: this.currentRoute(),
      to: bag.route,
      params: bag.params
    });
  }

  /**
   * Return a route instance from a route name.
   *
   * @param  mixed  name The dotted route name string or a route name array.
   * @return Object      Returns the corresponding route.
   */
  fetch(name) {
    return this._route.fetch(name);
  }

  /**
   * Return the browser location.
   *
   * @return String The browser location.
   */
  location() {
    var path = '';
    path = decodeURI(location.pathname + location.search);
    return '/' + trim.left(path.replace(this._basePathRegExp, '').replace(/index\.html$/, ''), '/');
  }

  /**
   * Navigate to an new location to the browser.
   *
   * @param  mixed  name The dotted route name string or a route name array.
   * @param  Object params The route params (key-value pairs)
   */
  push(name, params, replace) {
    var location = this.link(name, params);
    this.navigate(location, replace);
  }

  /**
   * Navigate to an new location to the browser without pushing a new history entry.
   *
   * @param  mixed  name The dotted route name string or a route name array.
   * @param  Object params The route params (key-value pairs)
   */
  replace(name, params) {
    this.push(name, params, true);
  }

  /**
   * Navigate to an new location to the browser.
   *
   * @param  String  location The location URL.
   * @param  Boolean replace  If `true` replace the url without pushing a new history entry.
   */
  navigate(location, replace) {
    location = this._isAbsoluteUrl.test(location) ? location : '/' + trim.left(location, '/');
    history[replace ? 'replaceState' : 'pushState'](null, null, location);
    this.dispatch(this.location());
  }

  /**
   * Move forwards/backwards in the history stack.
   * This method takes a single integer as parameter that indicates by how many steps to go forwards or go backwards in the history stack
   *
   * @param Number step How many steps to go forwards or go backwards.
   */
  go(step) {
    return history.go(step);
  }

  /**
   * Dispatch an URL.
   *
   * @param String|undefined location The URL to dispatch.
   */
  dispatch(location) {
    location = location || this.location();
    location = '/' + trim.left(location, '/');
    if (this.currentLocation() === location) {
      return;
    }
    this.currentLocation(location);

    var transition = this.match(location);

    if (!transition) {
      this.emit('404', location);
      return;
    }
    var to = transition.to();
    var toLocation = this.link(to.name(), transition.params());

    // It happens when transition has been redirected through redirectTo
    if (location.split('?')[0] !== toLocation.split('?')[0]) {
      this.currentLocation(toLocation);
      history.replaceState(null, null, toLocation);
    }

    let oldRoute = this.currentRoute();
    let oldParams = this.currentParams();

    return this._options.handler(transition, this).then((updated) => {
      this.currentRoute(transition.to());
      this.currentParams(transition.params());
      this.emit('transitioned', transition);
    }, () => {
      this.emit('424', transition);
      if (oldRoute) {
        this.push(oldRoute.name(), oldParams);
      }
    });
  };

  /**
   * Listen for browser URL changes.
   */
  listen() {
    if (this._listener) {
      return;
    }
    this._listener = setInterval(this.dispatch.bind(this), this._options.interval);
  }

  /**
   * Stop listening.
   */
  stop() {
    if (!this._listener) {
      return;
    }
    clearInterval(this._listener);
  }
}

Emitter(Router.prototype);

module.exports = Router;
