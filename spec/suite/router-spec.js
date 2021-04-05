var Router = require('../../src/router');

describe("Router", function() {

  context("without any scope", function() {


    beforeEach(function() {

      this.dispatchedTransition = null;
      this.dispatchedRouter = null;
      this.handler = (transition, router) => {
        this.dispatchedTransition = transition;
        this.dispatchedRouter = router;
        return Promise.resolve();
      }
      this.router = new Router({
        handler: this.handler
      });

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

      context("with nested path", function() {

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
        expect(this.router.match('post/123?id=bar').params()).toEqual({ id: '123' });

      });

      context("with nested path", function() {

        it("merges query string variables", function() {

          this.router.add('post', 'post?{foo}');
          this.router.add('post.id', '/{id}');

          expect(this.router.match('post/123?foo=bar').params()).toEqual({ id: '123', foo: 'bar' });

        });

        it("doesn't override path's variables with query string variables", function() {

          this.router.add('post', 'post');
          this.router.add('post.id', '/{id}');

          expect(this.router.match('post/123?id=bar').params()).toEqual({ id: '123' });

        });

      });

    });

    describe(".buildQueryParams()", function() {

      it("builds query string params", function() {

        this.router.add('post', 'post/{id}?{foo}');
        expect(this.router.buildQueryParams('post', { id: '123', foo: 'bar' })).toEqual({foo: 'bar'});

      });

      context("with nested path", function() {

        it("builds query string params", function() {

          this.router.add('post', 'post?{foo}');
          this.router.add('post.id', '/{id}?{bar}');
          expect(this.router.buildQueryParams('post.id', { bar: 'foo', foo: 'bar' })).toEqual({ foo: 'bar', bar: 'foo' });

        });

      });

    });

    describe(".dispatch()", function() {

      it("dispatch a route", function() {

        this.router.add('post', 'post?{foo}');
        this.router.add('post.id', '/{id}?{bar}');
        this.router.dispatch('post/123?foo=bar&bar=foo');

        expect(this.dispatchedRouter).toBe(this.router);
        expect(this.dispatchedTransition.from()).toBe(null);
        expect(this.dispatchedTransition.params()).toEqual({ id: '123', foo: 'bar', bar: 'foo' });
        expect(this.dispatchedTransition.to()).toBe(this.router.fetch('post.id'));

      });

    });

  });

  context("with scopes", function() {


    beforeEach(function() {

      this.dispatchedTransition = null;
      this.dispatchedRouter = null;
      this.handler = (transition, router) => {
        this.dispatchedTransition = transition;
        this.dispatchedRouter = router;
        return Promise.resolve();
      }
      this.router = new Router({
        handler: this.handler,
        scopes: ['scope1', 'scope2']
      });

    });

    describe(".link()", function() {

      it("creates absolute paths with custom base path", function() {

        this.router.add('foobar', 'foo/{bar}');

        var link = this.router.link('foobar', { bar: 'baz' }, {
          scheme: 'https',
          host: 'www.example.com',
          basePath: 'app',
          absolute: true,
          scope: 'scope1'
        });
        expect(link).toBe('https://www.example.com/app/scope1/foo/baz');

      });

      context("with nested path", function() {

        it("creates absolute paths with custom base path", function() {

          this.router.add('foo', '/foo');
          this.router.add('foo.bar', '/{bar}');

          var link = this.router.link('foo.bar', { bar: 'baz' }, {
            scheme: 'https',
            host: 'www.example.com',
            basePath: 'app',
            absolute: true,
            scope: 'scope1'
          });
          expect(link).toBe('https://www.example.com/app/scope1/foo/baz');

        });

      });

    });

    describe(".match()", function() {

      it("detects scopes", function() {

        this.router.add('post', 'post/{id}?{foo}');
        expect(this.router.match('scope1/post/123?foo=bar').scope()).toEqual('scope1');
        expect(this.router.match('scope2/post/123?foo=bar').scope()).toEqual('scope2');

      });

    });

    describe(".dispatch()", function() {

      it("dispatch a route", function() {

        this.router.add('post', 'post?{foo}');
        this.router.add('post.id', '/{id}?{bar}');
        this.router.dispatch('scope1/post/123?foo=bar&bar=foo');

        expect(this.dispatchedRouter).toBe(this.router);
        expect(this.dispatchedTransition.from()).toBe(null);
        expect(this.dispatchedTransition.params()).toEqual({ id: '123', foo: 'bar', bar: 'foo' });
        expect(this.dispatchedTransition.to()).toBe(this.router.fetch('post.id'));
        expect(this.dispatchedTransition.scope()).toBe('scope1');

      });

    });

  });

});
