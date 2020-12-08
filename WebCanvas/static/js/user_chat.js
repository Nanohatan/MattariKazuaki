$(function () {
    var socket = io();

    var url_string = window.location.href;
    var url = new URL(url_string);
    var r = url.searchParams.get("roomName");
    var u = url.searchParams.get("userName");

    socket.emit("client_to_server_join",{room:r, name:u} )

    $('form').submit(function(e){
      e.preventDefault(); // prevents page reloading
      socket.emit("client_to_server", {value: $('#userAnswer').val()});
      $('#userAnswer').val('');
      return false;
    });
    
    socket.on('server_to_client', function(data){
      console.log(data)
      $('#chat').prepend($('<li>').text(data.name+':'+data.value));
    });
});