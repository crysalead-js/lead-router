import { extend, merge } from 'extend-merge';

class Transition {

  constructor(config) {
    config = extend({
      from: null,
      to: null,
      params: {}
    }, config);

    /**
     * From state.
     *
     * @var String
     */
    this._from = config['from'];

    /**
     * To state.
     *
     * @var String
     */
    this._to = config['to'];

    /**
     * Router instance.
     *
     * @var Array
     */
    this._params = config['params'];
  }

  /**
   * Gets sets the current route.
   *
   * @param  Object      params The route to set or none to get the setted one.
   * @return Object|self        The route on get or `this` on set.
   */
  from(from) {
    if (!arguments.length) {
      return this._from;
    }
    this._from = from;
    return this;
  }

  /**
   * Gets sets the new route.
   *
   * @param  Object      params The route to set or none to get the setted one.
   * @return Object|self        The route on get or `this` on set.
   */
  to(to) {
    if (!arguments.length) {
      return this._to;
    }
    this._to = to;
    return this;
  }

  /**
   * Gets the list of routes to unmount.
   *
   * @return Array The routes to unmount.
   */
  disabled() {
    var list = [];
    var from = this.from();

    if (!from) {
      return list;
    }

    var to = this.to();

    var origin = from.hierarchy();
    var len = origin.length;

    var target = to.hierarchy() || [];

    for (var index = 0; index < len; index++) {
      if (origin[index] !== target[index]) {
        var i = len - 1;
        while (i >= index) {
          list.push(origin[i]);
          i--;
        }
        return list;
      }
    }
    return list;
  }

  /**
   * Return the junction route.
   *
   * @return Object The junction route.
   */
  junction() {
    return this.enabled()[0] ? this.enabled()[0].parent() : undefined;
  }

  /**
   * Gets the list of routes to mount.
   *
   * @return Array The routes to unmout.
   */
  enabled() {
    var list = [];
    var from = this.from();
    var to = this.to();

    var target = to.hierarchy();

    var index = 0;
    var len = target.length;

    if (from) {
      var origin = from.hierarchy();

      for (index = 0; index < len; index++) {
        if (origin[index] !== target[index]) {
          break;
        }
      }
    }

    for (var i = index; i < len; i++) {
      list.push(target[i]);
    }

    return list;
  }

  /**
   * Gets sets the transition params.
   *
   * @param  Object      params The transition's params to set or none to get the setted one.
   * @return Object|self        The transition's params on get or `this` on set.
   */
  params(params) {
    if (!arguments.length) {
      return this._params;
    }
    this._params = params;
    return this;
  }

}

export default Transition;
