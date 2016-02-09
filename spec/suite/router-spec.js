import Router from '../../src/router';

describe("Router", function() {

  beforeEach(function() {

    this.router = new Router();

  });

  describe(".link()", function() {

    it("creates absolute paths with custom base path", function() {

      this.router.state('foobar', 'foo/{bar}');

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

      this.router.state('post', 'post/{id}');
      expect(this.router.match('post/123?foo=bar').params()).toEqual({id: '123', foo: 'bar'});

    });

    it("doesn't override path's variables with query string variables", function() {

      this.router.state('post', 'post/{id}');
      expect(this.router.match('post/123?id=bar').params()).toEqual({id: '123'});

    });

  });

  context("with nested path", function() {

    describe(".link()", function() {

      it("creates absolute paths with custom base path", function() {

        this.router.state('foo', '/foo');
        this.router.state('foo.bar', '/{bar}');

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

        this.router.state('post', 'post');
        this.router.state('post.id', '/{id}');

        expect(this.router.match('post/123?foo=bar').params()).toEqual({id: '123', foo: 'bar'});

      });

      it("doesn't override path's variables with query string variables", function() {

        this.router.state('post', 'post');
        this.router.state('post.id', '/{id}');

        expect(this.router.match('post/123?id=bar').params()).toEqual({id: '123'});

      });

    });

  });

});
