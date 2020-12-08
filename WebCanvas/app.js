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

var nameList = [];
io.sockets.on("connection",function(socket){
	//クライアントからのチャットメッセージ受信、配信処理
    socket.on("send_msg_fromClient",function(data){
        console.log(data.msg);
        if (!nameList.includes(data.name)){
        	console.log("nameList add：" + data.name);
        	nameList.unshift( data.name );
        	io.sockets.emit("send_name_fromServer", data.name);
        }
        io.sockets.emit("send_msg_fromServer","["+ data.name+"] "+data.msg);
    });

	//回答の受信 + 送信
	socket.on("send_userAnswer_fromClient",function(data){
		console.log("user answer = " +data.userAnswer + "\nnow odai is " + odai);
		if (data.userAnswer.includes("ｾｲｶｲ") ){
			nowtime = 0;
		}
		io.sockets.emit("send_msg_fromServer",data.userAnswer);
	});

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
		socket.broadcast.json.emit("draw_line_fromServer",data);
	});

	//画面消去の通知を送信元以外のクライアントに転送
	socket.on("erase_fromClient",function(data){
		socket.broadcast.emit("erase_fromServer","");
	});
	socket.on('drawing', (data) => socket.broadcast.emit('drawing', data));
});


//お題の変更関数
function gettheme(){
	const client = require("./db_client").pg_client()
	var theme = [];

	client.connect()
		.then(() => console.log("Connected successfuly"))
		.then(() => client.query("select word from sample_table order by timestamp desc"))
		.then(function (results) {
			console.log(console.table(results.rows))
			theme.push(console.table(results.rows))
			console.table(results.rows)
			// res.render('index', { title: 'セレクト', sql_result: results.rows})
		})
	.catch((e => console.log(e)))
	.catch((() => client.end()))

	return theme;
}

let odaiList = ["ちくわ" , "とうふ" , "だいこん" , "もち巾着" , "牛すじ" , "はんぺん" , "こんにゃく" , "じゃがいも" , "おでん食べたい！"];
var odai;
var kakite;
var odaiLog;
function changeOdai(){
	// odaiList = gettheme();
	odai = odaiList[Math.floor( Math.random() * odaiList.length )];
	kakite = nameList[Math.floor( Math.random() * nameList.length )];
	odaiLog = "お題「" + odai + "」，描く人"+ kakite +"さん";
	console.log(odai);
	console.log(nameList);
	io.sockets.json.emit("send_odai_fromServer",{
		htmlStile : "<h2 style=\"text-align:center\"><font size=\"7\">" + odai + "</font></td>",
		odai : odai ,
		name : kakite
	});
	io.sockets.json.emit("send_msg_fromServer",odaiLog);
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
			nowtime = 60;
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