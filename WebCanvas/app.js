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
        //送信されてきた描画情報を送信元以外のクライアントに転送
	socket.on("draw_line_fromClient",function(data){
		socket.broadcast.json.emit("draw_line_fromServer",data);
	});

	//画面消去の通知を送信元以外のクライアントに転送
	socket.on("erase_fromClient",function(data){
		socket.broadcast.emit("erase_fromServer","");
	});
	socket.on('drawing', (data) => socket.broadcast.emit('drawing', data));

	//next turnボタンを押した際にチャットにメッセージを送る
	socket.on("game_start",function(data){
		console.log("次の描き手は" + data.player_name + "さんです。\n お題は" + data.theme　+ "です。");
		io.sockets.emit("send_msg_fromServer", "次の描き手は" + data.player_name + "さんです。\n お題は" + data.theme　+ "です。");
	});

	//answerボタンを押した際に正解かどうかを判定する
	socket.on("judge",function(data){
		if(data.answer == data.theme){
			console.log(data.answer + ":正解！");
			io.sockets.emit("send_msg_fromServer","正解！答えは" + data.answer + "です！");
		}else{
			console.log("正解:" + data.theme + "\n" + data.answer + ":不正解");
			io.sockets.emit("send_msg_fromServer",data.answer + "は不正解！");
		}
	});
	
});