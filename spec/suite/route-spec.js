var Route = require('../../src/route');

describe("Route", function() {

  describe(".constructor()", function() {

    it("initializes instances", function() {

      var parent = new Route();

      var route = new Route({
        name: 'post',
        pattern: '/post/{id}',
        content: { component: 'PostComponent' },
        params: { id: '1234' },
        parent: parent
      });

      expect(route.name()).toBe('post');
      expect(route.pattern()).toBe('post/{id}');
      expect(route.content()).toEqual({ component: 'PostComponent' });
      expect(route.params()).toEqual({ id: '1234' });
      expect(route.parent()).toBe(parent);

    });

  });

  describe(".name()", function() {

    it("gets the route's name", function() {

      var route = new Route();
      route.add('post', '/post');

      expect(route.fetch('post').name()).toBe('post');

    });

  });

  describe(".content()", function() {

    it("gets the route's content setted through `.add()`", function() {

      var route = new Route();
      var content = { component: 'PostComponent' };
      route.add('post', '/post', content);

      expect(route.fetch('post').content()).toEqual(content);

    });

    it("gets/sets route's content", function() {

      var route = new Route();
      var content = { component: 'PostComponent' };
      route.content(content);

      expect(route.content()).toBe(content);

    });

  });

  describe(".params()", function() {

    it("gets/sets pattern's params", function() {

      var route = new Route();
      var params = { id: '1234' };
      route.params(params);

      expect(route.params()).toBe(params);

    });

  });

  describe(".get()/.set()", function() {

    it("sets values", function() {

      var route = new Route();

      expect(route.set('variable', 'value')).toBe(route);
      expect(route.get('variable')).toBe('value');

    });

    it("sets an array of values", function() {

      var route = new Route();

      expect(route.set({
        variable1: 'value1',
        variable2: 'value2'
      })).toBe(route);

      expect(route.get('variable1')).toBe('value1');
      expect(route.get('variable2')).toBe('value2');

    });

  });

  describe(".data()", function() {

    it("returns route's custom attached data", function() {

      var route = new Route();

      expect(route.set('variable1', 'value1')).toBe(route);
      expect(route.set('variable2', 'value2')).toBe(route);

      expect(route.data()).toEqual({
        variable1: 'value1',
        variable2: 'value2'
      });

    });

  });

  describe(".isset()", function() {

    it("checks if a custom data is set", function() {

      var route = new Route();

      expect(route.set('variable1', 'value1')).toBe(route);
      expect(route.isset('variable1')).toBe(true);
      expect(route.isset('variable2')).toBe(false);

    });

  });

  describe(".unset()", function() {

    it("issets a custom data", function() {

      var route = new Route();

      expect(route.set('variable1', 'value1')).toBe(route);
      expect(route.isset('variable1')).toBe(true);

      expect(route.unset('variable1')).toBe(route);
      expect(route.isset('variable1')).toBe(false);

    });

  });

  describe(".clear()", function() {

    it("clears setted data", function() {

      var route = new Route();

      expect(route.set('variable1', 'value1')).toBe(route);
      expect(route.set('variable2', 'value2')).toBe(route);

      expect(route.clear()).toEqual(route);
      expect(route.data()).toEqual({});

    });

  });

  describe(".parent()", function() {

    it("returns the parent route", function() {

      var route = new Route();
      route.add('post', '/post');
      route.add('post.id', '/{id}');

      var middle = route.fetch('post');
      var leaf = route.fetch('post.id');

      expect(leaf.parent()).toBe(middle);
      expect(middle.parent()).toBe(route);

    });

  });

  describe(".hierarchy()", function() {

    it("returns all route's ancestors as well as the route itself", function() {

      var route = new Route();
      route.add('post', '/post');
      route.add('post.id', '/{id}');

      var leaf = route.fetch('post.id');

      expect(leaf.hierarchy()).toEqual([
        route,
        route.fetch('post'),
        route.fetch('post.id')
      ]);

    });

  });

  describe(".match()", function() {

    it("matches URL with no placeholders", function() {

      var route = new Route({'pattern': 'post'});
      expect(route.match('post').params).toEqual({});

    });

    it("matches URL with parameter placeholders", function() {

      var route = new Route({'pattern': 'post/{id}'});
      expect(route.match('post/123').params).toEqual({id: '123'});

    });

    it("matches URL with parameter placeholders with non slash prefix", function() {

      var route = new Route({'pattern': 'post/id-{id}'});
      expect(route.match('post/id-123').params).toEqual({id: '123'});

    });

    it("matches URL with parameter placeholders with custom capture group", function() {

      var route = new Route({'pattern': 'post/{id:[0-9]{8}}'});
      expect(route.match('post/12345678').params).toEqual({id: '12345678'});
      expect(route.match('post/123')).toBe(undefined);

    });

    it("casts repeatable parameter placeholders as an array", function() {

      var route = new Route({'pattern': 'post[/{id}]*'});
      expect(route.match('post/123').params).toEqual({id: ['123']});
      expect(route.match('post/123/456/789').params).toEqual({id: ['123', '456', '789']});
      expect(route.match('post').params).toEqual({id: []});

      var route = new Route({'pattern': 'post[/{id}]+'});
      expect(route.match('post/123').params).toEqual({id: ['123']});
      expect(route.match('post/123/456/789').params).toEqual({id: ['123', '456', '789']});
      expect(route.match('post')).toEqual(undefined);

    });

    it("doesn't filter out empty optionnal parameter", function() {

      var route = new Route({'pattern': 'post[/{id}]*'});
      expect(route.match('post/123').params).toEqual({id: ['123']});
      expect(route.match('post').params).toEqual({id: []});

      var route = new Route({'pattern': 'post[/{id}]'});
      expect(route.match('post/123').params).toEqual({id: '123'});
      expect(route.match('post').params).toEqual({id: null});

    });

    it("support query string parameters", function() {

      var route = new Route({'pattern': 'post/{id}?{foo}'});
      expect(route.match('post/123', {foo: 'bar', bar: 'foo'}).params).toEqual({ id: '123', foo: 'bar'});

    });

  });

  describe(".path()", function() {

    it("creates relative paths", function() {

      var route = new Route({ pattern: 'foo/{bar}' });

      var path = route.path({ bar: 'baz' });
      expect(path).toBe('/foo/baz');

    });

    it("supports optionnal parameters", function() {

      var path, route = new Route({ pattern: 'foo[/{bar}]' });

      path = route.path();
      expect(path).toBe('/foo');

      path = route.path({ bar: 'baz' });
      expect(path).toBe('/foo/baz');

    });

    it("supports multiple optionnal parameters", function() {

      var path, route = new Route({ pattern: 'file[/{paths}]*' });

      path = route.path();
      expect(path).toBe('/file');

      path = route.path({ paths: ['some', 'file', 'path'] });
      expect(path).toBe('/file/some/file/path');

    });

    it("merges default params", function() {

      var route = new Route({ pattern: 'foo/{bar}', params: { bar: 'baz' } });

      var path = route.path();
      expect(path).toBe('/foo/baz');

    });

    it("supports repeatable parameter placeholders as an array", function() {

      var route = new Route({pattern: 'post[/{id}]*'});
      expect(route.path({id: '123'})).toBe('/post/123');
      expect(route.path({id: ['123']})).toBe('/post/123');
      expect(route.path({id: ['123', '456', '789']})).toBe('/post/123/456/789');
      expect(route.path({})).toBe('/post');

      var route = new Route({'pattern': '/post[/{id}]+'});
      expect(route.path({id: ['123']})).toBe('/post/123');
      expect(route.path({id: ['123', '456', '789']})).toBe('/post/123/456/789');

    });

    it("supports route with multiple optional segments", function() {

      var path, route = new Route({pattern: '[{relation}/{rid:[^/:][^/]*}/]post[/{id:[^/:][^/]*}][/:{action}]'});

      path = route.path();
      expect(path).toBe('/post');

      path = route.path({ action: 'add' });
      expect(path).toBe('/post/:add');

      path = route.path({ action: 'edit', id: 12 });
      expect(path).toBe('/post/12/:edit');

      path = route.path({ relation: 'user', rid: 5 });
      expect(path).toBe('/user/5/post');

      path = route.path({ relation: 'user', rid: 5, action: 'edit', id: 12 });
      expect(path).toBe('/user/5/post/12/:edit');

    });

    it("supports route with complex repeatable optional segments", function() {

      var path, route = new Route({pattern: '[{relations:[^/]+/[^/:][^/]*}/]*post[/{id:[^/:][^/]*}][/:{action}]'});

      path = route.path();
      expect(path).toBe('/post');

      path = route.path({ action: 'add' });
      expect(path).toBe('/post/:add');

      path = route.path({ action: 'edit', id: 12 });
      expect(path).toBe('/post/12/:edit');

      path = route.path({ relations: [['user', 5]] });
      expect(path).toBe('/user/5/post');

      path = route.path({ relations: [['user', 5]], action: 'edit', id: 12 });
      expect(path).toBe('/user/5/post/12/:edit');

    });

    it("throws an exception for missing variables", function() {

      var closure = function() {
        var route = new Route({'pattern': 'post[/{id}]+'});
        route.path({});
      };
      expect(closure).toThrow(new Error("Missing parameters `'id'` for route: `'#/post[/{id}]+'`."));

    });

    it("throws an exception when a variable doesn't match its capture pattern", function() {

      var closure = function() {
        var route = new Route({'pattern': 'post/{id:[0-9]{3}}'});
        route.path({id: '1234'});
      };
      expect(closure).toThrow(new Error("Expected `'id'` to match `'[0-9]{3}'`, but received `'1234'`."));

    });

    it("throws an exception when a an array is provided for a non repeatable parameter placeholder", function() {

      var closure = function() {
        var route = new Route({'pattern': '/post/{id}'});
        route.path({id: ['123', '456']});
      };
      expect(closure).toThrow(new Error("Expected `'id'` to match `'[^/]+'`, but received `'123/456'`."));

    });

    it("throws an exception when one element of an array doesn't match the capture pattern", function() {

      var closure = function() {
        var route = new Route({'pattern': '/post[/{id:[0-9]{3}}]+'});
        route.path({id: ['123', '456', '78']});
      };
      expect(closure).toThrow(new Error("Expected `'id'` to match `'[0-9]{3}'`, but received `'78'`."));

    });

  });
});
