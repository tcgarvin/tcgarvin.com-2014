var bjjs = require('bjjs');

var gamethrottle = 2000 // ms per hand target

// A little timeseries-style graph to show how things go.
function BlackjackSimpleHistory() {
  var width;
  var height;
  var colors = ["#BC772F","#9876AA","#619647","#BED6FF","#D25252"];

  // init X-axis with scale
  var xScale = d3.scale.linear();
  var xAxis = d3.svg.axis()
    .orient("bottom")
    .tickFormat(function(tick) { return tick != 0 ? tick : ""; })
    .scale(xScale);

  // init X-axis with scale
  var yScale = d3.scale.linear();
  var yAxis = d3.svg.axis()
    .orient("right") // Picked because of the resulting text-anchor.  Wrong?
    .tickFormat(function(tick) { return tick != 0 ? tick : ""; })
    .scale(yScale);

  // Init Line generator
  var contentPath = d3.svg.line()
    .x(function(d,i) { return xScale(i); })
    .y(function(d) { return yScale(d); });

  // The render function proper
  var history = function(selection) {
    // Init axis if not already present
    var xAxisSelection = selection.selectAll("g.xaxis").data([0]);
    xAxisSelection
      .enter()
        .append("svg:g")
        .classed("xaxis", true);

    xAxisSelection
        .attr("transform", function() { return "translate(0,"+yScale(0)+")"; })
        .call(xAxis);

    yAxis.tickSize(width);
    var yAxisSelection = selection.selectAll("g.yaxis").data([0]);
    yAxisSelection
      .enter()
        .append("svg:g")
        .classed("yaxis", true);

    yAxisSelection.call(yAxis);

    yAxisSelection.selectAll("g.tick text")
        .attr("x","1em")
        .attr("y","-0.72em");

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

var CARDS_URL = "images/cards.svg";
function getCardSVGUrl(card) {
  var rank = card.getRank();
  if (rank === "A") { rank = "ace"; }
  else if (rank === "K") { rank = "king"; }
  else if (rank === "Q") { rank = "queen"; }
  else if (rank === "J") { rank = "jack"; }
  return CARDS_URL + "#card-" + rank + "-" + card.getSuit();
}

var curOid = 0;
function idObject(o) {
  if (!o.__id) {
    o.__id = curOid
    curOid += 1;
  }
  return o.__id;
}

function BlackjackTable() {
  var height;
  var width;

  var playerHands = [];
  var dealerHand;

  function render(selection) {
    // There's two approaches we could take here.  We could attach location
    // info to each card as we collect information about it, before handing
    // it off to d3, or we could give d3 functions to determine location as
    // needed.
    //
    // Normally, I'd be in favor of pushing that logic out as far as possible,
    // so we don't have potential sync issues, but it just seems so slow..
    // Let's try attaching info as we go, for now.

    var game = selection.data()[0]; // Bleh
    var cards = [];
    function syncCardInfo(playerHand) {
      var player = playerHand.player;
      var hand = playerHand.hand;

      var handX, handY, handDY;

      if (player === "dealer") {
        handX = (width / 2) - 110;
        handY = 0;
        handDY = 10;
      } else if (player === game.getPlayers()[0]) {
        handX = (width / 2) - 110;
        handY = height - 310;
        handDY = -10;
      } else {
        handX = -1000;
        handY = -1000;
        handDY = -10;
      }

      hand.getCards().forEach(function(card, i) {
        card.x = handX + (30 * i);
        card.y = handY + (handDY * i);
        cards.push(card);
      });
    }

    syncCardInfo({hand:dealerHand, player:"dealer"});
    playerHands.forEach(function(playerHand) {
      syncCardInfo(playerHand);
    });

    // Display cards
    var d3cards = selection.selectAll("use.card")
      .data(cards, function(d,i) {
        return idObject(d);
      });

    d3cards.enter()
      .append("svg:use")
        .classed("card", true)
        .attr("xlink:href", getCardSVGUrl);

    d3cards
      .attr("x", function(d) { return d.x; })
      .attr("y", function(d) { return d.y; });

    d3cards.exit().remove();

    //Display Win/Lose/Bust?

      
  }

  function table(selection) {
    // This isn't really the render function.  This just sets things up so that
    // we render on game changes correctly.
    var game = selection.data()[0]; // Bleh
    game.on("endround", function(ph, dh) {
      playerHands = ph;
      dealerHand = dh;
      render(selection);
    });
  }

  table.height = function(value) {
    if (!arguments.length) return height;
    height = value;
    return table;
  };

  table.width = function(value) {
    if (!arguments.length) return width;
    width = value;
    return table;
  };

  return table;
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
  var tableVis = BlackjackTable()
    .height(height)
    .width(width);

  var histVis = BlackjackSimpleHistory()
    .height(height)
    .width(width)
    .xDomain([0,numToSimulate])
    .yDomain([-900, 900]);

  // Find/init svg
  var d3Svg = d3.select('svg.blackjack')
    .attr("height", height)
    .attr("width", width);

  // Find init svg groups for visualizations
  var d3CardTable = d3Svg.selectAll('g.cardtable').data([game]);
  d3CardTable.enter()
    .append('svg:g')
    .classed('cardtable', true)
    .call(tableVis);

//  var d3Hist = d3Svg.selectAll('g.history').data([game.getPlayers()]);
//  d3Hist.enter()
//    .append('svg:g')
//    .classed('history', true)
//    .call(histVis);

  // A design decision here.  Since we're not doing web workers, we need to
  // keep the simulation throttled.  We'll do that by setting a little timer
  // between runs.  This gives the UI a chance to keep up in real time.
  var runCount = 0;
  var players = game.getPlayers();
  var simulate = function() {
    game.doOneRound();
    runCount += 1;
    players.forEach(function(player) {
      player.history.push(player.getBalance());
    });
    //d3Hist.call(histVis);
    //d3CardTable.call(tableVis);

    if (runCount < numToSimulate) {
      window.setTimeout(simulate, gamethrottle);
    }
  }
  window.setTimeout(simulate, gamethrottle);
  
});
