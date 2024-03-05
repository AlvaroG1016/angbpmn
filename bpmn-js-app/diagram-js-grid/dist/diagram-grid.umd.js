(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.DiagramJSGrid = factory());
})(this, (function () { 'use strict';

  function ensureImported(element, target) {

    if (element.ownerDocument !== target.ownerDocument) {
      try {

        // may fail on webkit
        return target.ownerDocument.importNode(element, true);
      } catch (e) {

        // ignore
      }
    }

    return element;
  }

  /**
   * appendTo utility
   */

  /**
   * Append a node to a target element and return the appended node.
   *
   * @param  {SVGElement} element
   * @param  {SVGElement} target
   *
   * @return {SVGElement} the appended node
   */
  function appendTo(element, target) {
    return target.appendChild(ensureImported(element, target));
  }

  /**
   * append utility
   */

  /**
   * Append a node to an element
   *
   * @param  {SVGElement} element
   * @param  {SVGElement} node
   *
   * @return {SVGElement} the element
   */
  function append(target, node) {
    appendTo(node, target);
    return target;
  }

  /**
   * attribute accessor utility
   */

  var LENGTH_ATTR = 2;

  var CSS_PROPERTIES = {
    'alignment-baseline': 1,
    'baseline-shift': 1,
    'clip': 1,
    'clip-path': 1,
    'clip-rule': 1,
    'color': 1,
    'color-interpolation': 1,
    'color-interpolation-filters': 1,
    'color-profile': 1,
    'color-rendering': 1,
    'cursor': 1,
    'direction': 1,
    'display': 1,
    'dominant-baseline': 1,
    'enable-background': 1,
    'fill': 1,
    'fill-opacity': 1,
    'fill-rule': 1,
    'filter': 1,
    'flood-color': 1,
    'flood-opacity': 1,
    'font': 1,
    'font-family': 1,
    'font-size': LENGTH_ATTR,
    'font-size-adjust': 1,
    'font-stretch': 1,
    'font-style': 1,
    'font-variant': 1,
    'font-weight': 1,
    'glyph-orientation-horizontal': 1,
    'glyph-orientation-vertical': 1,
    'image-rendering': 1,
    'kerning': 1,
    'letter-spacing': 1,
    'lighting-color': 1,
    'marker': 1,
    'marker-end': 1,
    'marker-mid': 1,
    'marker-start': 1,
    'mask': 1,
    'opacity': 1,
    'overflow': 1,
    'pointer-events': 1,
    'shape-rendering': 1,
    'stop-color': 1,
    'stop-opacity': 1,
    'stroke': 1,
    'stroke-dasharray': 1,
    'stroke-dashoffset': 1,
    'stroke-linecap': 1,
    'stroke-linejoin': 1,
    'stroke-miterlimit': 1,
    'stroke-opacity': 1,
    'stroke-width': LENGTH_ATTR,
    'text-anchor': 1,
    'text-decoration': 1,
    'text-rendering': 1,
    'unicode-bidi': 1,
    'visibility': 1,
    'word-spacing': 1,
    'writing-mode': 1
  };


  function getAttribute(node, name) {
    if (CSS_PROPERTIES[name]) {
      return node.style[name];
    } else {
      return node.getAttributeNS(null, name);
    }
  }

  function setAttribute(node, name, value) {
    var hyphenated = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

    var type = CSS_PROPERTIES[hyphenated];

    if (type) {

      // append pixel unit, unless present
      if (type === LENGTH_ATTR && typeof value === 'number') {
        value = String(value) + 'px';
      }

      node.style[hyphenated] = value;
    } else {
      node.setAttributeNS(null, name, value);
    }
  }

  function setAttributes(node, attrs) {

    var names = Object.keys(attrs), i, name;

    for (i = 0, name; (name = names[i]); i++) {
      setAttribute(node, name, attrs[name]);
    }
  }

  /**
   * Gets or sets raw attributes on a node.
   *
   * @param  {SVGElement} node
   * @param  {Object} [attrs]
   * @param  {String} [name]
   * @param  {String} [value]
   *
   * @return {String}
   */
  function attr(node, name, value) {
    if (typeof name === 'string') {
      if (value !== undefined) {
        setAttribute(node, name, value);
      } else {
        return getAttribute(node, name);
      }
    } else {
      setAttributes(node, name);
    }

    return node;
  }

  function remove(element) {
    var parent = element.parentNode;

    if (parent) {
      parent.removeChild(element);
    }

    return element;
  }

  /**
   * Clear utility
   */

  /**
   * Removes all children from the given element
   *
   * @param  {DOMElement} element
   * @return {DOMElement} the element (for chaining)
   */
  function clear(element) {
    var child;

    while ((child = element.firstChild)) {
      remove(child);
    }

    return element;
  }

  var ns = {
    svg: 'http://www.w3.org/2000/svg'
  };

  /**
   * DOM parsing utility
   */

  var SVG_START = '<svg xmlns="' + ns.svg + '"';

  function parse(svg) {

    var unwrap = false;

    // ensure we import a valid svg document
    if (svg.substring(0, 4) === '<svg') {
      if (svg.indexOf(ns.svg) === -1) {
        svg = SVG_START + svg.substring(4);
      }
    } else {

      // namespace svg
      svg = SVG_START + '>' + svg + '</svg>';
      unwrap = true;
    }

    var parsed = parseDocument(svg);

    if (!unwrap) {
      return parsed;
    }

    var fragment = document.createDocumentFragment();

    var parent = parsed.firstChild;

    while (parent.firstChild) {
      fragment.appendChild(parent.firstChild);
    }

    return fragment;
  }

  function parseDocument(svg) {

    var parser;

    // parse
    parser = new DOMParser();
    parser.async = false;

    return parser.parseFromString(svg, 'text/xml');
  }

  /**
   * Create utility for SVG elements
   */


  /**
   * Create a specific type from name or SVG markup.
   *
   * @param {String} name the name or markup of the element
   * @param {Object} [attrs] attributes to set on the element
   *
   * @returns {SVGElement}
   */
  function create(name, attrs) {
    var element;

    if (name.charAt(0) === '<') {
      element = parse(name).firstChild;
      element = document.importNode(element, true);
    } else {
      element = document.createElementNS(ns.svg, name);
    }

    if (attrs) {
      attr(element, attrs);
    }

    return element;
  }

  var bugTestDiv;
  if (typeof document !== 'undefined') {
    bugTestDiv = document.createElement('div');
    // Setup
    bugTestDiv.innerHTML = '  <link/><table></table><a href="/a">a</a><input type="checkbox"/>';
    // Make sure that link elements get serialized correctly by innerHTML
    // This requires a wrapper element in IE
    !bugTestDiv.getElementsByTagName('link').length;
    bugTestDiv = undefined;
  }

  function query(selector, el) {
    el = el || document;

    return el.querySelector(selector);
  }

  var SPACING = 10;

  function quantize(value, quantum, fn) {
    if (!fn) {
      fn = 'round';
    }

    return Math[ fn ](value / quantum) * quantum;
  }

  /**
   * Flatten array, one level deep.
   *
   * @template T
   *
   * @param {T[][]} arr
   *
   * @return {T[]}
   */

  const nativeToString = Object.prototype.toString;
  const nativeHasOwnProperty = Object.prototype.hasOwnProperty;

  function isObject(obj) {
    return nativeToString.call(obj) === '[object Object]';
  }

  /**
   * Return true, if target owns a property with the given key.
   *
   * @param {Object} target
   * @param {String} key
   *
   * @return {Boolean}
   */
  function has(target, key) {
    return nativeHasOwnProperty.call(target, key);
  }

  /**
   * Checks whether a value is an instance of Connection.
   *
   * @param {any} value
   *
   * @return {boolean}
   */
  function isConnection(value) {
    return isObject(value) && has(value, 'waypoints');
  }

  /**
   * @param {Point} point
   *
   * @returns {Point}
   */
  function roundPoint(point) {

    return {
      x: Math.round(point.x),
      y: Math.round(point.y)
    };
  }


  /**
   * Get the mid of the given bounds or point.
   *
   * @param {Point|Rect} bounds
   *
   * @return {Point}
   */
  function getBoundsMid(bounds) {
    return roundPoint({
      x: bounds.x + (bounds.width || 0) / 2,
      y: bounds.y + (bounds.height || 0) / 2
    });
  }


  /**
   * Get the mid of the given Connection.
   *
   * @param {Connection} connection
   *
   * @return {Point}
   */
  function getConnectionMid(connection) {
    var waypoints = connection.waypoints;

    // calculate total length and length of each segment
    var parts = waypoints.reduce(function(parts, point, index) {

      var lastPoint = waypoints[index - 1];

      if (lastPoint) {
        var lastPart = parts[parts.length - 1];

        var startLength = lastPart && lastPart.endLength || 0;
        var length = distance(lastPoint, point);

        parts.push({
          start: lastPoint,
          end: point,
          startLength: startLength,
          endLength: startLength + length,
          length: length
        });
      }

      return parts;
    }, []);

    var totalLength = parts.reduce(function(length, part) {
      return length + part.length;
    }, 0);

    // find which segement contains middle point
    var midLength = totalLength / 2;

    var i = 0;
    var midSegment = parts[i];

    while (midSegment.endLength < midLength) {
      midSegment = parts[++i];
    }

    // calculate relative position on mid segment
    var segmentProgress = (midLength - midSegment.startLength) / midSegment.length;

    var midPoint = {
      x: midSegment.start.x + (midSegment.end.x - midSegment.start.x) * segmentProgress,
      y: midSegment.start.y + (midSegment.end.y - midSegment.start.y) * segmentProgress
    };

    return midPoint;
  }


  /**
   * Get the mid of the given Element.
   *
   * @param {Element} element
   *
   * @return {Point}
   */
  function getMid(element) {
    if (isConnection(element)) {
      return getConnectionMid(element);
    }

    return getBoundsMid(element);
  }

  // helpers //////////////////////

  function distance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  /**
   * @typedef {import('diagram-js/lib/core/Canvas').default} Canvas
   * @typedef {import('diagram-js/lib/core/EventBus').default} EventBus
   */

  var GRID_COLOR = '#ccc',
      LAYER_NAME = 'djs-grid';

  var GRID_DIMENSIONS = {
    width: 100000,
    height: 100000
  };

  /**
   * @param {Canvas} canvas
   * @param {EventBus} eventBus
   */
  function Grid(canvas, eventBus) {
    this._canvas = canvas;

    var self = this;

    eventBus.on('diagram.init', function() {
      self._init();
      self.toggle(true);
    });

    eventBus.on('gridSnapping.toggle', function(event) {
      var active = event.active;

      self.toggle(active);

      self._centerGridAroundViewbox();
    });

    eventBus.on('canvas.viewbox.changed', function(context) {
      var viewbox = context.viewbox;

      self._centerGridAroundViewbox(viewbox);
    });
  }

  Grid.prototype._init = function() {
    var defs = query('defs', this._canvas._svg);

    if (!defs) {
      defs = create('defs');

      append(this._canvas._svg, defs);
    }

    var pattern = this._pattern = create('pattern');

    var patternId = 'djs-grid-pattern-' + randomNumber();

    attr(pattern, {
      id: patternId,
      width: SPACING,
      height: SPACING,
      patternUnits: 'userSpaceOnUse'
    });

    var circle = this._circle = create('circle');

    attr(circle, {
      cx: 0.5,
      cy: 0.5,
      r: 0.5,
      fill: GRID_COLOR
    });

    append(pattern, circle);

    append(defs, pattern);

    var grid = this._gfx = create('rect');

    attr(grid, {
      x: -(GRID_DIMENSIONS.width / 2),
      y: -(GRID_DIMENSIONS.height / 2),
      width: GRID_DIMENSIONS.width,
      height: GRID_DIMENSIONS.height,
      fill: `url(#${ patternId })`
    });
  };

  Grid.prototype._centerGridAroundViewbox = function(viewbox) {
    if (!viewbox) {
      viewbox = this._canvas.viewbox();
    }

    var mid = getMid(viewbox);

    attr(this._gfx, {
      x: -(GRID_DIMENSIONS.width / 2) + quantize(mid.x, SPACING),
      y: -(GRID_DIMENSIONS.height / 2) + quantize(mid.y, SPACING)
    });
  };

  /**
   * Return the current grid visibility.
   *
   * @return {boolean}
   */
  Grid.prototype.isVisible = function() {
    return this._visible;
  };

  /**
   * Toggle grid visibility.
   *
   * @param {boolean} [visible] new visible state
   */
  Grid.prototype.toggle = function(visible) {

    if (typeof visible === 'undefined') {
      visible = !this._visible;
    }

    if (visible === this._visible) {
      return;
    }

    var parent = this._getParent();

    if (visible) {
      append(parent, this._gfx);
    } else {
      clear(parent);
    }

    this._visible = visible;
  };

  Grid.prototype._getParent = function() {
    return this._canvas.getLayer(LAYER_NAME, -2);
  };

  Grid.$inject = [
    'canvas',
    'eventBus'
  ];


  // helpers ///////////////

  function randomNumber() {
    return Math.trunc(Math.random() * 1000000);
  }

  var index = {
    __init__: [ 'grid' ],
    grid: [ 'type', Grid ]
  };

  return index;

}));