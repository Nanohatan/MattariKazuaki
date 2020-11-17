const port = process.env.PORT || 5000;
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require("socket.io")(http);



app.use(express.static('static'));
app.set('views', './views');
app.set('view engine', 'pug');

app.get('/', (req, res) => {
	res.sendfile('static/index.html');
    //res.render('index');
});

app.get('/canv_and_chat', (req, res) => {
    res.sendFile('/src/WebCanvas/static/webCanvas.html');
});

app.get('/canv_only', (req, res) => {
    res.sendfile('static/canv.html');
});

http.listen(port, () => {
	console.log('listening on *:'+port);
});

var nameList = [];
var msgList = [];
io.sockets.on("connection",function(socket){

  //追加
  var room = '';
  socket.on('client_to_server_join', function(data) {
    room = data.value;
    socket.join(room);
  });
  //追加
/*
	//クライアントからのチャットメッセージ受信、配信処理
    socket.on("send_msg_fromClient",function(data){
        if (!nameList.includes(data.name) && data.name != null){
        	console.log("nameList add：" + data.name);
        	nameList.unshift( data.name );
        	nameList.sort();
        }
        var msg = "["+ data.name+"] "+ data.msg;
        msgList.push(msg);
        io.sockets.emit("send_name_fromServer", nameList);
        io.sockets.emit("send_msg_fromServer",msgList);
    });

	//回答の受信 + 送信
	socket.on("send_userAnswer_fromClient",function(data){
		console.log("user answer = " +data.userAnswer + "\nnow odai is " + odai);
		if (data.userAnswer.includes("ｾｲｶｲ") ){
			nowtime = 0;
		}
		io.sockets.emit("send_msg_fromServer",data.userAnswer);
	});
*/
	//タイマーの起動
	socket.on("startTimer_fromClient",function(data){
		console.log("start timer!!");
		startTimer();
		io.sockets.emit("startTimer_fromServer","");
	});

	//タイマーの停止
	socket.on("stopTimer_fromClient",function(data){
		console.log("stop timer!!");
		stopTimer();
		io.sockets.emit("stopTimer_fromServer","");
	});

	//送信されてきた描画情報を送信元以外のクライアントに転送
	socket.on("draw_line_fromClient",function(data){
		socket.broadcast.json.to(room).emit("draw_line_fromServer",data);
	});

	//画面消去の通知を送信元以外のクライアントに転送
	socket.on("erase_fromClient",function(data){
		socket.broadcast.to(room).emit("erase_fromServer","");
	});
	socket.on('drawing', (data) => socket.broadcast.emit('drawing', data));
});



 
// S04. connectionイベントを受信する
io.sockets.on('connection', function(socket) {
    var room = '';
    var name = '';
 
    // roomへの入室は、「socket.join(room名)」
    socket.on('client_to_server_join', function(data) {
        room = data.value;
        socket.join(room);
    });
    // S05. client_to_serverイベント・データを受信する
    socket.on('client_to_server', function(data) {
        // S06. server_to_clientイベント・データを送信する
        io.to(room).emit('server_to_client', {value : data.value});
    });
    // S07. client_to_server_broadcastイベント・データを受信し、送信元以外に送信する
    socket.on('client_to_server_broadcast', function(data) {
        socket.broadcast.to(room).emit('server_to_client', {value : data.value});
    });
    // S08. client_to_server_personalイベント・データを受信し、送信元のみに送信する
    socket.on('client_to_server_personal', function(data) {
        var id = socket.id;
        name = data.value;
        var personalMessage = "あなたは、" + name + "さんとして入室しました。"
        io.to(id).emit('server_to_client', {value : personalMessage});
    });
    // S09. dicconnectイベントを受信し、退出メッセージを送信する
    socket.on('disconnect', function() {
        if (name == '') {
            console.log("未入室のまま、どこかへ去っていきました。");
        } else {
            var endMessage = name + "さんが退出しました。"
            io.to(room).emit('server_to_client', {value : endMessage});
        }
    });
});
//お題の変更関数
let odaiList = ["ちくわ" , "とうふ" , "だいこん" , "もち巾着" , "牛すじ" , "はんぺん" , "こんにゃく" , "じゃがいも" , "おでん食べたい！"];
var odai;
var kakite;
function changeOdai(){
	odai = odaiList[Math.floor( Math.random() * odaiList.length )];
	kakite = nameList[Math.floor( Math.random() * nameList.length )];
	console.log(odai);
	console.log(nameList);
	io.sockets.json.emit("send_odai_fromServer",{
		htmlStile : "<h2 style=\"text-align:center\"><font size=\"7\">" + odai + "</font></td>",
		odai : odai ,
		name : kakite
	});
	io.sockets.json.emit("send_odaiKakite_fromServer",{
		kakite : kakite,
		odai : odai
	});
}

//タイマー関数
var nowtime = 0;
var drowFlag = true;
var timerText = "<h2>";
function time(){
		io.sockets.json.emit("send_nowtime_fromServer",{
			htmlStile: timerText + nowtime + "秒</h2>"
		});
	if (nowtime > 0){
		nowtime = nowtime - 1;
	} else {
		console.log("timer reset!");
		clearInterval(timer);
		if (drowFlag){
			nowtime = 5;
			timerText = "<h2 style=\"color:blue\">";
			io.sockets.json.emit("send_odai_fromServer",{
				htmlStile: "<h2 style=\"text-align:center\"><font size=\"7\">次のお題は…I˙꒳​˙)</font></td>" ,
				odai : odai ,
				name : "everyone"
		});
		} else {
			nowtime = 10;
			timerText = "<h2 style=\"color:red\">";
			changeOdai();
		}
		startTimer();
		drowFlag = !drowFlag;
		return;
	}
}

//タイマースタート
function startTimer(){
	timer = setInterval(time, 1000);
}

//タイマーストップ
function stopTimer(){
	clearInterval(timer);
}

