
var tinySvg = require('tiny-svg');
var minDom = require('min-dom');
var GridUtil = require('diagram-js/lib/features/grid-snapping/GridUtil');
var LayoutUtil = require('diagram-js/lib/layout/LayoutUtil');

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
  var defs = minDom.query('defs', this._canvas._svg);

  if (!defs) {
    defs = tinySvg.create('defs');

    tinySvg.append(this._canvas._svg, defs);
  }

  var pattern = this._pattern = tinySvg.create('pattern');

  var patternId = 'djs-grid-pattern-' + randomNumber();

  tinySvg.attr(pattern, {
    id: patternId,
    width: GridUtil.SPACING,
    height: GridUtil.SPACING,
    patternUnits: 'userSpaceOnUse'
  });

  var circle = this._circle = tinySvg.create('circle');

  tinySvg.attr(circle, {
    cx: 0.5,
    cy: 0.5,
    r: 0.5,
    fill: GRID_COLOR
  });

  tinySvg.append(pattern, circle);

  tinySvg.append(defs, pattern);

  var grid = this._gfx = tinySvg.create('rect');

  tinySvg.attr(grid, {
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

  var mid = LayoutUtil.getMid(viewbox);

  tinySvg.attr(this._gfx, {
    x: -(GRID_DIMENSIONS.width / 2) + GridUtil.quantize(mid.x, GridUtil.SPACING),
    y: -(GRID_DIMENSIONS.height / 2) + GridUtil.quantize(mid.y, GridUtil.SPACING)
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
    tinySvg.append(parent, this._gfx);
  } else {
    tinySvg.clear(parent);
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

module.exports = index;