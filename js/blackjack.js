var bjjs = require('bjjs');

var gamethrottle = 20 // ms per hand target

// A little timeseries-style graph to show how things go.
function BlackjackSimpleHistory() {
  var colors = ["#BC772F","#9876AA","#619647","#BED6FF","#D25252"];

  // init X-axis with scale
  var xScale = d3.scale.linear();
  var xAxis = d3.svg.axis()
    .orient("bottom")
    .scale(xScale);

  // init X-axis with scale
  var yScale = d3.scale.linear();
  var yAxis = d3.svg.axis()
    .orient("left")
    .scale(yScale);

  // Init Line generator
  var contentPath = d3.svg.line()
    .x(function(d,i) { return xScale(i); })
    .y(function(d) { return yScale(d); });

  // The render function proper
  var history = function(selection) {
    // Init axis if not already present
    selection.selectAll("g.xaxis").data([0])
      .enter()
        .append("svg:g")
        .classed("xaxis", true);

    selection.selectAll("g.yaxis").data([0])
      .enter()
        .append("svg:g")
        .classed("yaxis", true);

    // Init and render paths
    var d3Paths = selection.selectAll("path.content")
      .data(function(players) {
        return players.map(function(playerHistory) {
          return playerHistory.history;
        });
      });

    d3Paths.enter()
      .append("svg:path")
      .style("stroke", function(d,i) { return colors[i]; })
      .classed("content",true);

    d3Paths.attr("d", contentPath);
  }

  history.height = function(value) {
    if (!arguments.length) return height;
    // XXX: Two sources of truth?
    height = value;
    yScale.range([height,0]);
    return history;
  };

  history.width = function(value) {
    if (!arguments.length) return width;
    // XXX: Two sources of truth?
    width = value;
    xScale.range([0,width]);
    return history;
  };

  // Delegate range get/setting to internal handlers
  history.xDomain = function(value) {
    if (!arguments.length) return xScale.domain();
    xScale.domain(value);
    return history;
  };

  history.yDomain = function(value) {
    if (!arguments.length) return yScale.domain();
    yScale.domain(value);
    return history;
  };

  return history;
}

$(function() {
  var height = $(window).height() - 100 // px
  var width = $(window).width(); // px

  var numToSimulate = 1000;

  // init poker
  var game = new bjjs.blackjack({});
  var basic = new bjjs.player(new bjjs.strategy.basic());
  var basic2 = new bjjs.player(new bjjs.strategy.basic());
  game.addPlayer(basic);
  game.addPlayer(basic2);
  
  // We're going to keep history in a simple little object.  Someday it might
  // be formalized.
  game.getPlayers().forEach(function(player) {
    player.history = [];
  });

  // Init visualization logic
  var histVis = BlackjackSimpleHistory()
    .height(height)
    .width(width)
    .xDomain([0,numToSimulate])
    .yDomain([-1000, 1000]);

  // Find/init svg
  var d3Svg = d3.select('svg.blackjack')
    .attr("height", height)
    .attr("width", width);

  // Find init svg groups for visualizations
  var d3Hist = d3Svg.selectAll('g.history').data([game.getPlayers()]);
  d3Hist.enter()
    .append('svg:g')
    .classed('history', true)
    .call(histVis);

  // A design decision here.  Since we're not doing web workers, we need to
  // keep the simulation throttled.  We'll do that by setting a little timer
  // between runs.  This gives the visualization a chance to keep up in real
  // time.
  var runCount = 0;
  var players = game.getPlayers();
  var simulate = function() {
    game.doOneRound();
    runCount += 1;
    players.forEach(function(player) {
      player.history.push(player.getBalance());
    });
    d3Hist.call(histVis);

    if (runCount < numToSimulate) {
      window.setTimeout(simulate, gamethrottle);
    }
  }
  window.setTimeout(simulate, gamethrottle);
  
});
