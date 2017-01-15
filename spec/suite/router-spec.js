var Router = require('../../src/router');

describe("Router", function() {

  beforeEach(function() {

    this.router = new Router();

  });

  describe(".link()", function() {

    it("creates absolute paths with custom base path", function() {

      this.router.add('foobar', 'foo/{bar}');

      var link = this.router.link('foobar', { bar: 'baz' }, {
        scheme: 'https',
        host: 'www.example.com',
        basePath: 'app',
        absolute: true
      });
      expect(link).toBe('https://www.example.com/app/foo/baz');

    });

  });

  describe(".match()", function() {

    it("merges query string variables", function() {

      this.router.add('post', 'post/{id}?{foo}');
      expect(this.router.match('post/123?foo=bar').params()).toEqual({id: '123', foo: 'bar'});

    });

    it("matches relationships based routes", function() {

      this.router.add('comment', '[{relations:[^/]+/[^/:][^/]*}/]*comment[/{id:[^/:][^/]*}][/:{action}]');
      expect(this.router.match('blog/1/post/22/comment/:something').params()).toEqual({
        relations: [
          ['blog', '1'],
          ['post', '22']
        ],
        id: null,
        action: 'something',
      });

    });

    it("doesn't override path's variables with query string variables", function() {

      this.router.add('post', 'post/{id}');
      expect(this.router.match('post/123?id=bar').params()).toEqual({id: '123'});

    });

  });

  context("with nested path", function() {

    describe(".link()", function() {

      it("creates absolute paths with custom base path", function() {

        this.router.add('foo', '/foo');
        this.router.add('foo.bar', '/{bar}');

        var link = this.router.link('foo.bar', { bar: 'baz' }, {
          scheme: 'https',
          host: 'www.example.com',
          basePath: 'app',
          absolute: true
        });
        expect(link).toBe('https://www.example.com/app/foo/baz');

      });

    });

    describe(".match()", function() {

      it("merges query string variables", function() {

        this.router.add('post', 'post?{foo}');
        this.router.add('post.id', '/{id}');

        expect(this.router.match('post/123?foo=bar').params()).toEqual({id: '123', foo: 'bar'});

      });

      it("doesn't override path's variables with query string variables", function() {

        this.router.add('post', 'post');
        this.router.add('post.id', '/{id}');

        expect(this.router.match('post/123?id=bar').params()).toEqual({id: '123'});

      });

    });

  });

});
