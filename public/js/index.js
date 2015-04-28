$(function() {
  var history = new Josh.History();
  var shell = new Josh.Shell({history: history});
  shell.activate();
});
