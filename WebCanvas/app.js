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

  //追加
  var room = '';
  socket.on('client_to_server_join', function(data) {
    room = data.value;
    socket.join(room);
  });
  //追加

	//送信されてきた描画情報を送信元以外のクライアントに転送
	socket.on("draw_line_fromClient",function(data){
		socket.broadcast.to(room).emit("draw_line_fromServer",data);
	});

	//画面消去の通知を送信元以外のクライアントに転送
	socket.on("erase_fromClient",function(data){
		socket.broadcast.to(room).emit("erase_fromServer","");
	});
	socket.on('drawing', (data) => socket.broadcast.to(room).emit('drawing', data));
});

//グローバルは良くないですが...
var nameDict = {};
var msgDict = {};
// S04. connectionイベントを受信する
io.sockets.on('connection', function(socket) {
    var room = '';
    var name = '';

    var timerDict = {};
 
    // roomへの入室は、「socket.join(room名)」
    socket.on('client_to_server_join', function(data) {
        room = data.value;
        socket.join(room);
        //ルーム毎にプレイヤー名とチャットログのdict作成
        if ( !(room in nameDict)){
            nameDict[room] = [];
            msgDict[room] = [];
            //初めに入室した人のみスタートを押せるように
            io.to(room).emit("stopTimer_fromServer" , '' );
            console.log('cleate room：' + room);
        }
    });

    // S05. client_to_serverイベント・データを受信する
    socket.on('client_to_server', function(data) {
        // S06. server_to_clientイベント・データを送信する
        msgDict[room].push(data.value);
        io.to(room).emit('server_to_client', {value : data.value});
    });

    // S07. client_to_server_broadcastイベント・データを受信し、送信元以外に送信する
    socket.on('client_to_server_broadcast', function(data) {
        msgDict[room].push(data.value);
        socket.broadcast.to(room).emit('server_to_client', {value : data.value});
    });
    // S08. client_to_server_personalイベント・データを受信し、送信元のみに送信する
    socket.on('client_to_server_personal', function(data) {
        var id = socket.id;
        //name = data.value;
        //var personalMessage = "あなたは、" + name + "さんとして入室しました。"
        //ログ修復
        io.to(id).emit('fix_log', {value :msgDict[room]});
    });
    //Sアユム追加 名前をチェックして，同じであればポップアップ表示＋入室拒否
    socket.on('client_to_server_addPlayer', function(data) {
        var checkName = data.value;
        if (!nameDict[room].includes(checkName) && checkName != null){
            name = checkName;
            nameDict[room].push( name );
            console.log("nameDict key = " + room +" \nadd name：" + name);
            nameDict[room].sort();
            io.to(room).emit('make_playerList', {nameDict : nameDict[room]});
            io.to(room).emit( "is_same_name" , {flag : true} );
        } else {
            io.to(room).emit( "is_same_name" , {flag : false} );
            console.log("use same name：" + checkName);
        }
    });

    //退室時にプレイヤー一覧から削除，リストから削除処理追加
    // S09. dicconnectイベントを受信し、退出メッセージを送信する
    socket.on('disconnect', function() {
        if (name == '') {
            console.log("未入室のまま、どこかへ去っていきました。");
        } else {
            var endMessage = name + "さんが退出しました。"
            msgDict[room].push(endMessage);
            const index = nameDict[room].findIndex((removeName) => removeName === name);
            nameDict[room].splice( index, 1);
            if (nameDict[room].length == 0 ){
                delete nameDict[room];
                delete msgDict[room];
                stopTimer();
                delete timerDict[room];
                console.log("delete room：" + room);
                return;
            }
            console.log("name remove：" + name + "\nnow nameDict：" + nameDict[room] );
            socket.broadcast.to(room).emit('make_playerList', {nameDict : nameDict[room]});
            io.to(room).emit('server_to_client', {value : endMessage});
        }
    });

	//回答の受信 + 送信
	socket.on("send_userAnswer_fromClient",function(data){
	    var answer = data.userAnswer;
		console.log("user answer = " + answer + "\nnow odai is " + odai);
		if (answer.includes("ｾｲｶｲ") ){
			nowtime = 0;
		}
		io.to(room).emit('server_to_client', { value : answer });
	});

	//タイマーの起動
	socket.on("startTimer_fromClient",function(data){
		startTimer();
		io.to(room).emit("startTimer_fromServer","");
	});

/*
	//タイマーの停止
	socket.on("stopTimer_fromClient",function(data){
		stopTimer();
		io.to(room).emit("stopTimer_fromServer","");
	});
*/

    //お題の変更関数
    let odaiList = ["ちくわ" , "とうふ" , "だいこん" , "もち巾着" , "牛すじ" , "はんぺん" , "こんにゃく" , "じゃがいも" , "おでん食べたい！"];
    var odai;
    var kakite;
    function changeOdai(){
    	odai = odaiList[Math.floor( Math.random() * odaiList.length )];
    	kakite = nameDict[room][Math.floor( Math.random() * nameDict[room].length )];
    	console.log(odai);
    	console.log(nameDict);
    	io.to(room).emit("send_odai_fromServer",{
    		htmlStile : "<h2 style=\"text-align:center\"><font size=\"7\">" + odai + "</font></td>",
    		odai : odai ,
    		name : kakite
    	});
    	io.to(room).emit("send_odaiKakite_fromServer",{
    		kakite : kakite,
    		odai : odai
    	});
    }

    //タイマー関数
    var nowtime = 0;
    var drowFlag = true;
    var timerText = "<h2>";
    function time(){
    		io.to(room).emit("send_nowtime_fromServer",{
    			htmlStile: timerText + nowtime + "秒</h2>"
    		});
    	if (nowtime > 0){
    		nowtime = nowtime - 1;
    	} else {
    		console.log("timer reset!");
    		clearInterval(timerDict[room]);
    		if (drowFlag){
    			nowtime = 5;
    			timerText = "<h2 style=\"color:blue\">";
    			io.to(room).emit("send_odai_fromServer",{
    				htmlStile: "<h2 style=\"text-align:center\"><font size=\"7\">次のお題は…I˙꒳​˙)</font></td>" ,
    				odai :"現在クールタイム中..." ,
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
    	console.log("start timer!!");
    	timerDict[room] = timer;
    }

    //タイマーストップ
    function stopTimer(){
    	clearInterval(timerDict[room]);
    	console.log("stop timer!!");
    }

});
