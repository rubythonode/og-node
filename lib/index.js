// Generated by CoffeeScript 1.7.1
var OpenGraph, async, cheerio, iconv, request, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

cheerio = require('cheerio');

_ = require('underscore');

request = require('request');

iconv = require('iconv-lite');

async = require('async');

OpenGraph = (function() {
  var getEncoding;

  function OpenGraph(options) {
    if (options == null) {
      options = {};
    }
    this.getMetaFromBuffer = __bind(this.getMetaFromBuffer, this);
    this.getMetaFromUrl = __bind(this.getMetaFromUrl, this);
    this.options = _.defaults(options, {
      parseFlat: true,
      encoding: null,
      followRedirect: true,
      followAllRedirects: false,
      maxRedirects: 3,
      timeout: 15 * 1000,
      headers: {
        'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.104 Safari/537.36"
      },
      pool: {
        maxSockets: Infinity
      }
    });
    this.extractors = [];
  }

  OpenGraph.prototype.registerExtractor = function(extractor) {
    var _ref;
    if (!(extractor && _.isString(extractor.name) && extractor.name.length && _.isFunction(extractor.extract))) {
      throw new Error("Bad extractor format!");
    }
    if (_ref = extractor.name, __indexOf.call(_.pluck(this.extractors, 'name'), _ref) >= 0) {
      throw new Error("Extractor name duplication: " + extractor.name);
    }
    return this.extractors.push(extractor);
  };

  getEncoding = function(header) {
    var declaration, declarations, key, value, _i, _len, _ref;
    try {
      declarations = header.split(';');
      for (_i = 0, _len = declarations.length; _i < _len; _i++) {
        declaration = declarations[_i];
        _ref = declaration.split('='), key = _ref[0], value = _ref[1];
        key = (function() {
          try {
            return key.replace(/\s/g, '');
          } catch (_error) {}
        })();
        value = (function() {
          try {
            return value.replace(/\s/g, '');
          } catch (_error) {}
        })();
        if (key && key.toLowerCase() === 'charset') {
          return value;
        }
      }
    } catch (_error) {}
    return null;
  };

  OpenGraph.prototype.getMetaFromUrl = function(url, callback) {
    return request.get(_.extend({
      url: url
    }, this.options), (function(_this) {
      return function(err, res, body) {
        if (err) {
          return callback(err);
        }
        if (Buffer.isBuffer(body)) {
          return _this.getMetaFromBuffer(body, res, callback);
        } else {
          return _this.getMetaFromHtml(body, res, callback);
        }
      };
    })(this));
  };

  OpenGraph.prototype.getMetaFromBuffer = function(buffer, res, callback) {
    var $, asciiHtml, e, encoding, html, metaTag, metaTags, _i, _len, _ref;
    if (!callback) {
      callback = res;
    }
    asciiHtml = buffer.toString('ascii');
    $ = cheerio.load(asciiHtml);
    encoding = (function() {
      try {
        return getEncoding(res.headers['content-type']);
      } catch (_error) {}
    })();
    if (!encoding) {
      metaTags = $('meta[http-equiv]');
      for (_i = 0, _len = metaTags.length; _i < _len; _i++) {
        metaTag = metaTags[_i];
        if (metaTag.attribs['http-equiv'].toLowerCase() === 'content-type') {
          encoding = getEncoding(metaTag.attribs.content);
        }
      }
    }
    if (encoding == null) {
      encoding = "utf-8";
    }
    if ((_ref = encoding.toLowerCase()) === 'utf-8' || _ref === 'utf8' || _ref === null) {
      encoding = 'utf-8';
    }
    try {
      html = iconv.decode(buffer, encoding);
    } catch (_error) {
      e = _error;
      return callback(e);
    }
    return this.getMetaFromHtml(html, res, callback);
  };

  OpenGraph.prototype.getMetaFromHtml = function(html, res, callback) {
    var $, attrName, attrValue, createTree, meta, metaTags, namespace, parsed, properties, property, _i, _len;
    if (!callback) {
      callback = res;
    }
    parsed = {
      og: {},
      custom: {}
    };
    $ = cheerio.load(html);
    namespace = null;
    html = (function() {
      try {
        return $('html')[0];
      } catch (_error) {}
    })();
    if (html != null ? html.attribs : void 0) {
      for (attrName in html.attribs) {
        attrValue = html.attribs[attrName];
        if (attrValue.toLowerCase() === 'http://opengraphprotocol.org/schema/' && attrName.substring(0, 6) === 'xmlns:') {
          namespace = attrName.substring(6);
          break;
        }
      }
    }
    if (namespace == null) {
      namespace = 'og';
    }
    namespace += ':';
    metaTags = $("meta");
    for (_i = 0, _len = metaTags.length; _i < _len; _i++) {
      meta = metaTags[_i];
      properties = _.pick(meta.attribs, 'property', 'content');
      if (!(properties.property && properties.property.substring(0, namespace.length) === namespace)) {
        continue;
      }
      property = properties.property.substring(namespace.length);
      if (this.options.parseFlat) {
        if (_.isArray(parsed.og[property])) {
          parsed.og[property].push(properties.content);
        } else if (parsed.og[property]) {
          parsed.og[property] = [parsed.og[property], properties.content];
        } else {
          parsed.og[property] = properties.content;
        }
      } else {
        createTree = function(ref, keys) {
          var key, obj;
          key = keys.shift();
          if (keys.length) {
            if (_.isString(ref[key])) {
              ref[key] = [
                {
                  __root: ref[key]
                }
              ];
            } else {
              if (ref[key] == null) {
                ref[key] = [];
              }
            }
          } else {
            if (_.isArray(ref) && !ref.length) {
              obj = {};
              obj[key] = properties.content;
              ref.push(obj);
            } else if (_.isArray(ref) && !ref[ref.length - 1][key]) {
              ref[ref.length - 1][key] = properties.content;
            } else if (_.isArray(ref) && ref[ref.length - 1][key]) {
              obj = {};
              obj[key] = properties.content;
              ref.push(obj);
            } else if (_.isArray(ref[key])) {
              ref[key].push({
                __root: properties.content
              });
            } else {
              ref[key] = properties.content;
            }
          }
          if (keys.length) {
            return createTree(ref[key], keys);
          }
        };
        createTree(parsed.og, property.split(":"));
      }
    }
    return async.each(this.extractors, function(extractor, next) {
      var e;
      try {
        return extractor.extract($, res, function(err, value) {
          if (err) {
            return next(err);
          }
          if (value) {
            parsed.custom[extractor.name] = value;
          }
          return setImmediate(function() {
            return next(null);
          });
        });
      } catch (_error) {
        e = _error;
        return setImmediate(function() {
          return next("extractor " + extractor.name + " thrown: " + e);
        });
      }
    }, function(error) {
      return callback(error, parsed);
    });
  };

  return OpenGraph;

})();

OpenGraph.extractors = require('./extractors');

module.exports = OpenGraph;