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
    res.sendfile('static/webCanvas.html');
});

app.get('/canv_only', (req, res) => {
    res.sendfile('static/canv.html');
});

http.listen(port, () => {
	console.log('listening on *:'+port);
});

io.sockets.on("connection",function(socket){
	//クライアントからのチャットメッセージ受信、配信処理
    socket.on("send_msg_fromClient",function(data){
        console.log(data.msg);
        io.sockets.emit("send_msg_fromServer","["+ data.name+"] "+data.msg);
    });

	//お題変更
	socket.on("send_changeOdai_fromClient",function(data){
		odai = data.odai;
		console.log("push odai button \nnow Odai is " + odai);
		io.sockets.emit("send_msg_fromServer",data.odaiLog);
	});

	//回答の受信 + 送信
	socket.on("send_userAnswer_fromClient",function(data){
		console.log("user answer = " +data.userAnswer + "\nnow odai is " + odai);
		io.sockets.emit("send_msg_fromServer",data.userAnswer);
	});

	//名前受信
	socket.on('setUserName', function (userName) {
		if(!userName) {
			userName = "秘密(*/□＼*)";
		}
		userName = userName + "さん"
		socket.userName = userName;
		console.log("new user name : " + socket.userName);
	});

	//送信されてきた描画情報を送信元以外のクライアントに転送
	socket.on("draw_line_fromClient",function(data){
		socket.broadcast.json.emit("draw_line_fromServer",data);
	});

	//画面消去の通知を送信元以外のクライアントに転送
	socket.on("erase_fromClient",function(data){
		socket.broadcast.emit("erase_fromServer","");
	});
	socket.on('drawing', (data) => socket.broadcast.emit('drawing', data));
});
