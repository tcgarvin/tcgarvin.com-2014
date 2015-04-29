var shell = null;

function openShell() {
  $(".shell").addClass("open");
  $("#shell-cli").css("display","");
}

function closeShell() {
  $(".shell").removeClass("open");
  $("#shell-cli").css("display","none");
}

$(function() {
  var history = new Josh.History();
  shell = new Josh.Shell({history: history});
  shell.activate();
  closeShell();
});
