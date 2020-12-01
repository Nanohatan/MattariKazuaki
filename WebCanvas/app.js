const port = process.env.PORT || 5000;
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require("socket.io")(http);
const url = require('url');


app.use(express.static('static'));
app.set('views', './views');
app.set('view engine', 'pug');

app.get('/', (req, res) => {
	res.sendFile(__dirname+'/static/index.html');
    //res.render('index');
});

app.get('/canv_and_chat', (req, res) => {
    res.sendFile(__dirname+'/static/webCanvas.html');
});

app.get('/canv_only', (req, res) => {
    res.sendFile(__dirname+'/static/canv.html');
});

app.get('/createRoom', (req, res) => {
	const queryObject = url.parse(req.url,true).query
	res.render('index',{roomName:queryObject.roomName,userName:queryObject.userName})
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
});
