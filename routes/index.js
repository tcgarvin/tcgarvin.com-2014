var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('/', function(req, res) {
  res.render('index', { title: "Hello - tcgarvin.com" });
});

router.get('/blackjack', function(req, res) {
  res.render('blackjack', { title: "Blackjack Simulation - tcgarvin.com" });
});

module.exports = router;
