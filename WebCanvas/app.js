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

//本当はグローバル変数は良くないですが...
var nameDict = {}; // { room1 : { name:[t,1] , name2:[t,2] } , room2 : {…} , ...}
var msgDict = {}; // { room1 : [ msg1 , msg2 , ...] , room2 : [msgA , msgB , ...] , ...}
var timerDict = {}; // { room1 : [ timer1 , true ] , room2 : [ timer2 , false ] , ...}
// S04. connectionイベントを受信する
io.sockets.on('connection', function(socket) {
    var room = '';
    var name = '';
    // roomへの入室は、「socket.join(room名)」
    socket.on('client_to_server_join', function(data) {
        room = data.value;
        socket.join(room);
        //ルーム毎にプレイヤー名とチャットログのdict作成
        if ( !(room in nameDict)){
            timerDict[room] = [];
            msgDict[room] = [];
            console.log('cleate room：' + room);
        }
    });

    // S05. client_to_serverイベント・データを受信する
    socket.on('client_to_server', function(data) {
        // S06. server_to_clientイベント・データを送信する
        //スタンプかメッセージ？
        if (data.isMsg){
            var text =  "<div>" + data.value + "</div>" ;
        } else {
            var text =  '<li><div> [' + data.value[0] + ']: </div><img class="stampImage" src="./img/' + data.value[1] + '.png" alt="" }></img></li>' ;
        }
        msgDict[room].push(text);
        console.log(msgDict[room]);
        io.to(room).emit('server_to_client', {value : text });
    });

    //画像サイズ指定
    function resizeImagePercent(id , resizeRate ) {
   var resizeImg = document.getElementById(id);
   resizeImg.width  = resizeImg.naturalWidth  * resizeRate;
   resizeImg.height = resizeImg.naturalHeight * resizeRate;
}

    // S07. client_to_server_broadcastイベント・データを受信し、送信元以外に送信する
    socket.on( 'client_to_server_broadcast' , function(data) {
        var text = "<div>" + data.value + "</div>" ;
        msgDict[room].push(text);
        socket.broadcast.to(room).emit('server_to_client', {value : text});
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
        //部屋を作った人だけの処理
        if ( !(nameDict[room]) ){
            name = checkName;
            nameDict[room] = {};
            nameDict[room][name] = [ true , 0 ] ;
            console.log(nameDict[room]);
            io.to(room).emit('make_playerList', {nameDict : nameDict[room]});
            io.to(room).emit( "is_same_name" , {flag : true} );
            io.to(room).emit("stopTimer_fromServer" , '' );
            return;
        }
        //2人目からは名前のチェックが入る
        for ( var playerInfo in nameDict[room]) {
            if (playerInfo == checkName ){
                io.to(room).emit( "is_same_name" , {flag : false} );
                console.log("the name already exist");
                return;
            }
        }
        //同じ名前が無い場合メンバーとして追加
        name = checkName;
        //nameDict[room]の中身は，[名前 , マスターか？ , 点数（仮）]
        nameDict[room][name] = [ false , 0 ] ;
        console.log("nameDict key = " + room +" \nadd name：" + name);
        console.log(nameDict[room]);
        io.to(room).emit('make_playerList', {nameDict : nameDict[room]});
        io.to(room).emit( "is_same_name" , {flag : true} );
    });

    //退室時にルーム初期化
    // S09. dicconnectイベントを受信し、退出メッセージを送信する
    socket.on('disconnect', function() {
        if (name == '') {
            console.log("未入室のまま、どこかへ去っていきました。");
        } else {
            var endMessage = "<li><div>" + name + "さんが退出しました。</div></li>"
            msgDict[room].push(endMessage);
            //マスターが抜けるかどうか？
            if (nameDict[room][name][0]){
                delete nameDict[room][name];
                //ルームから人がいなくなったら初期化
                var nameKeyList = Object.keys(nameDict[room]);
                if ( nameKeyList.length == 0 ){
                    delete nameDict[room];
                    delete msgDict[room];
                    stopTimer();
                    delete timerDict[room];
                    console.log("delete room：" + room);
                    return;
                }
                //ランダムに選んだ人にマスター権限付与
                var newMaster = nameKeyList [Math.floor( Math.random() * nameKeyList.length )];
                nameDict[room][newMaster][0] = true;
                io.to(room).emit('master_change' , { timer : timerDict[room][1] });//オバーフロー直った？
                io.to(room).emit('server_to_client' , {value : "<li><div>部屋主が" + newMaster +"さんに変わりました。</div></li>" })
            } else {
                delete nameDict[room][name];
            }
            console.log("name remove：" + name );
            console.log(nameDict[room]);
            socket.broadcast.to(room).emit('make_playerList', {nameDict : nameDict[room]});
            io.to(room).emit('server_to_client', {value : endMessage});
        }
    });

	//回答の受信 + 送信
	socket.on("send_userAnswer_fromClient",function(data){
	    var answer = "<div>" + data.userAnswer + "</div>";
		console.log("user answer = " + answer + "\nnow odai is " + odai);
		if (answer.includes("ｾｲｶｲ") ){
			nowtime = 0;
			nameDict[room][data.answerName][1] += 1;
		}
		io.to(room).emit('make_playerList', {nameDict : nameDict[room]});
		io.to(room).emit('server_to_client', { value : answer });
	});

	//タイマーの起動
	socket.on("startTimer_fromClient",function(data){
		startTimer();
		io.to(room).emit("startTimer_fromServer","");
	});

	//タイマーの停止
	socket.on("stopTimer_fromClient",function(data){
		stopTimer();
		io.to(room).emit("stopTimer_fromServer","");
	});

    //お題の変更関数
    let odaiList = ["ちくわ" , "とうふ" , "だいこん" , "もち巾着" , "牛すじ" , "はんぺん" , "こんにゃく" , "じゃがいも" , "おでん食べたい！"];
    var odai;
    var kakite;
    function changeOdai(){
        var nameKeyList = Object.keys(nameDict[room]);
    	kakite = nameKeyList[Math.floor( Math.random() * nameKeyList.length)];
    	odai = odaiList[Math.floor( Math.random() * odaiList.length )];
    	console.log(odai);
    	console.log(nameDict);
    	io.to(room).emit("send_odai_fromServer",{
    		htmlStile : "<h2 style=\"text-align:center\"><font size=\"7\">" + odai + "</font></td>",
    		odai : odai ,
    		name : kakite
    	});
    	io.to(room).emit("send_odaiMsg_fromServer",{
    		name : kakite,
    		odai : odai
    	});
    }

    //タイマー関数
    var nowtime = 0;
    var drowFlag = true;
    var timerText = "<div>";
    function time(){
    		io.to(room).emit("send_nowtime_fromServer",{
    			htmlStile: timerText + nowtime + "秒</div>"
    		});
    	if (nowtime > 0){
    		nowtime = nowtime - 1;
    	} else {
    		console.log("timer reset!");
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
    		drowFlag = !drowFlag;
    	}
    }

    //タイマースタート
    function startTimer(){
    	timerDict[room] = [ setInterval(time, 1000) , true ] ;
    	console.log("timer start：" + room);
    }

    //タイマーストップ
    function stopTimer(){
    	clearInterval(timerDict[room][0]);
        timerDict[room][1] = false;
    	console.log("timer stop：" + room);
    }

});
