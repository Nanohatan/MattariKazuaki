const port = process.env.PORT || 5000;
const { SIGQUIT } = require('constants');
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
});

app.get('/canv_and_chat', (req, res) => {
    res.sendFile(__dirname+'/static/webCanvas.html');

});

app.get('/canv_only', (req, res) => {
    res.sendFile(__dirname+'/static/canv.html');
});

app.get('/createRoom', (req, res) => {
	const queryObject = url.parse(req.url,true).query
	res.render('canv',{roomName:queryObject.roomName,userName:queryObject.userName})
});

http.listen(port, () => {
	console.log('listening on *:'+port);
});

//本当はグローバル変数は良くないですが...
var canvasDict ={}; // {room1 : [~~~ , /// , @@@ , ...] , room2 :{...} , ... }
var nameDict = {}; // { room1 : { name:[true,1] , name2:[false,2] } , room2 : {…} , ...}
var msgDict = {}; // { room1 : [ msg1 , msg2 , ...] , room2 : [msgA , msgB , ...] , ...}
var timerDict = {}; // { room1 : [ timer1 , true ] , room2 : [ timer2 , false ] , ...}
// S04. connectionイベントを受信する
io.sockets.on('connection', function(socket) {
    var room = '';
    var name = '';


    socket.on('client_to_server_join', function(data) {
        room = data.value;
        socket.join(room);
      });
      //追加

        //送信されてきた描画情報を送信元以外のクライアントに転送
        socket.on("draw_line_fromClient",function(data){
            canvasDict[room].push(data);
            socket.broadcast.to(room).emit("draw_line_fromServer",data);
        });
    
        //画面消去の通知を送信元以外のクライアントに転送
        socket.on("erase_fromClient",function(data){
            socket.broadcast.to(room).emit("erase_fromServer","");
            canvasDict[room] = [];
        });
        socket.on('drawing', (data) => socket.broadcast.to(room).emit('drawing', data));



    // roomへの入室は、「socket.join(room名)」
    socket.on('client_to_server_join', function(data) {
        room = data.value;
        socket.join(room);
        //ルーム毎にプレイヤー名とチャットログのdict作成
        if ( !(room in nameDict)){
            timerDict[room] = [];
            msgDict[room] = [];
            canvasDict[room] = [];
            console.log('cleate room：' + room);
        }
    });

    // S05. client_to_serverイベント・データを受信する
    socket.on('client_to_server', function(data) {
        // S06. server_to_clientイベント・データを送信する
        //スタンプかメッセージ？
        if (data.isMsg){
            var text =  "<div>" + data.value + "</div><hr>" ;
        } else {
            var text =  '<li><div> [' + data.value[0] + ']: </div><img class="stampImage" src="./img/' + data.value[1] + '.png" alt="" }></img></li><hr>' ;
        }

        msgDict[room].push(text);
        console.log(msgDict[room]);
        io.to(room).emit('server_to_client', {value : text });
    });

    // S07. client_to_server_broadcastイベント・データを受信し、送信元以外に送信する
    socket.on( 'client_to_server_broadcast' , function(data) {
        var text = "<div>" + data.value + "</div><hr>" ;
        msgDict[room].push(text);
        socket.broadcast.to(room).emit('server_to_client', {value : text});
    });
    // S08. client_to_server_personalイベント・データを受信し、送信元のみに送信する
    socket.on('client_to_server_personal', function(data) {
        io.to(socket.id).emit('fix_log', {value :msgDict[room] , canvasDict : canvasDict[room]});
        var id = socket.id;
        //ログ修復
        io.to(id).emit('fix_log', {value :msgDict[room]});
    });

    //Sアユム_入室処理
    socket.on('client_to_server_addPlayer', function(data) {
        var checkName = data.value;
        //部屋を作った人だけの処理
        if ( !(nameDict[room]) ){
            name = checkName;
            makeTable(room);
            nameDict[room] = {};
            nameDict[room][name] = [ true , 0 ] ;
            console.log(nameDict[room]);
            io.to(room).emit('make_playerList', {nameDict : nameDict[room]});
            io.to(room).emit( "is_same_name" , {flag : true} );
            insertData(room,name);
            return;
        }
        name = checkName;
        //nameDict[room]の中身は，[名前 , マスターか？ , 点数（仮）]
        nameDict[room][name] = [ false , 0 ] ;
        console.log("nameDict key = " + room +" \nadd name：" + name);
        console.log(nameDict[room]);
        io.to(room).emit('make_playerList', {nameDict : nameDict[room]});
        io.to(room).emit( "is_same_name" , {flag : true} );
        insertData(room,name);
    });

    //退室時にルーム初期化
    // S09. dicconnectイベントを受信し、退出メッセージを送信する
    socket.on('disconnect', function() {
        if (name == '') {
            console.log("未入室のまま、どこかへ去っていきました。");
        } else {
            var endMessage = "<li><div>" + name + "さんが退出しました。</div></li><hr>"
            msgDict[room].push(endMessage);
            //マスターが抜けるかどうか？
            if (nameDict[room][name][0]){
                delete nameDict[room][name];
                deleteData( room, name );
                //ルームから人がいなくなったら初期化
                var nameKeyList = Object.keys(nameDict[room]);
                if ( nameKeyList.length == 0 ){
                    dropTable(room);
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
                io.to(room).emit('master_change' , { timer : timerDict[room][1] });
                io.to(room).emit('server_to_client' , {value : "<li><div>部屋主が" + newMaster +"さんに変わりました。</div></li><hr>" })
            } else {
                delete nameDict[room][name];
                deleteData( room, name );
            }
            console.log("name remove：" + name );
    		console.log(nameDict[room]);
            socket.broadcast.to(room).emit('make_playerList', {nameDict : nameDict[room]});
            io.to(room).emit('server_to_client', {value : endMessage});
        }
    });

	//回答の受信 + 送信
	socket.on("send_userAnswer_fromClient",function(data){
	    var answer = "<div>" +  data.userAnswer + "</div><hr>";
		console.log("user answer = " + answer + "\nnow odai is " + odai);
		if (data.isAnswer){
		    var score = timerDict[room][2] + 1;
            nameDict[room][data.answerName][1] += score;
			timerDict[room][2] = 0;
		}
		io.to(room).emit('make_playerList', {nameDict : nameDict[room]});
		io.to(room).emit('server_to_client', { value : answer });
	});

	//タイマーの起動
	socket.on("startTimer_fromClient",function(data){
        var themeName = data;
        console.log("お題タイトル(app側)：" + themeName);
        startTimer();
        gettheme(themeName);
		io.to(room).emit("startTimer_fromServer","");
	});

	//タイマーの停止
	socket.on("stopTimer_fromClient",function(data){
        stopTimer();
        theme = [];
		io.to(room).emit("stopTimer_fromServer","");
	});

    //お題の変更関数
    var theme = [];
    var odai;
    function changeOdai( kakiteName ){
        io.to(room).emit("erase_fromServer","");
        canvasDict[room] = [];
        odaiList = theme;
    	odai = odaiList[Math.floor( Math.random() * odaiList.length )];
    	console.log(odai);
    	io.to(room).emit("send_odai_fromServer",{
    		htmlStile : "<h2 style=\"text-align:center\"><font size=\"7\">" + odai + "</font></td>",
    		odai : odai ,
    		name : kakiteName,
    		round : '<h2 style="text-align:center; "><font size="4">第' + nowGameCount + "ラウンド"
    	});
    	io.to(room).emit("send_odaiMsg_fromServer",{
    		name : kakiteName,
    		odai : odai
    	});
    }

	function gettheme(themeName){
        var themeName = themeName;
        const client = require("./db_client").pg_client()

		client.connect()
			.then(() => console.log("Connected successfuly"))
            .then(() => client.query("select word from " + themeName + " order by timestamp desc"))
			.then(function (results) {
                console.table(results.rows)
                for(var item of results.rows){
                    console.log(item.word + "append to themeList");
                    theme.push(item.word);
                }
			})
            .catch((e => console.log(e)))
            .catch((() => client.end()))
	}

    //ラウンドとかの変数セット
    var gameCount;
    var drowTime;
    var intervalTime;
    socket.on("set_game_time",function(data){
        gameCount = data.gameCount;
        drowTime = data.drowTime;
        intervalTime = data.intervalTime;
        io.to(room).emit("setGameTimes_fromServer" , {
            gameCount : data.gameCount,
            drowTime : data.drowTime,
            intervalTime : data.intervalTime,
            nowBadTime : data.nowBadTime
        });
	});

    //ゲームリセット
    socket.on("game_reset",function(data){
        var nameKeyList = Object.keys(nameDict[room]);
        for (var i in nameKeyList ){
            nameDict[room][nameKeyList[i]][1] = 0;
        }
        timerDict[room][2] = 0;
        drowFlag = true;
        timerText = "<h2>";
        nowGameCount = 0;
        nowNameCount = 1;
        io.to(room).emit("send_odai_fromServer",{
    		htmlStile : "<h2 style=\"text-align:center\"><font size=\"7\">" +'ゲーム開始待ち...' + "</font></td>",
    		odai :"開始待ち中..." ,
    		name : "everyone",
    		round : ''
    	});
    	io.to(room).emit('make_playerList', {nameDict : nameDict[room]});
    });

    //タイマー関数
    var drowFlag = true;
    var timerText = "<h2>";
    var nowGameCount = 0;
    var nowNameCount = 1;
    function time(){
        var nameKeyList = Object.keys(nameDict[room]);
        if( nowNameCount == nameKeyList.length){
            nowGameCount +=1;
            nowNameCount = 0;
        }
        if (nowGameCount > gameCount) {
            stopTimer();
            io.to(room).emit("send_odai_fromServer",{
    		htmlStile : "<h2 style=\"text-align:center\"><font size=\"7\">" +'ゲーム終了(_๑òωó)_ﾊﾞｧﾝ' + "</font></td>",
    		odai :"現在終了中..." ,
    		name : "everyone",
    		round : 'おわり'
    	});
            return;
        }
    		io.to(room).emit("send_nowtime_fromServer",{
    			htmlStile: timerText + timerDict[room][2] + "秒</h2>"
    		});
    	if (timerDict[room][2] > 0){
    		timerDict[room][2] = timerDict[room][2] - 1;
    	} else {
    		console.log("timer reset!");
    		if (drowFlag){
    		    nowNameCount += 1;
    			timerDict[room][2] = intervalTime;
    			timerText = "<h2 style=\"color:blue\">";
    			io.to(room).emit("send_odai_fromServer" , {
    				htmlStile: "<h2 style=\"text-align:center\"><font size=\"7\">次のお題は…I˙꒳​˙)</font></td>" ,
    				odai :"現在クールタイム中..." ,
    				name : "everyone",
    				round : '<h2 style="text-align:center; "><font size="4">第' + nowGameCount + "ラウンド"
    		    });
                io.to(room).emit('make_playerList', {nameDict : nameDict[room]});
    		} else {
    			timerDict[room][2] = drowTime;
    			timerText = "<h2 style=\"color:red\">";
    			changeOdai(nameKeyList[nowNameCount]);
    		}
    		drowFlag = !drowFlag;
    	}
    }

    //タイマースタート
    function startTimer(){
    	timerDict[room] = [ setInterval(time, 1000) , true , 0 ] ;
    	console.log("timer start：" + room);
    }

    //タイマーストップ
    function stopTimer(){
    	clearInterval(timerDict[room][0]);
        timerDict[room][1] = false;
    	console.log("timer stop：" + room);
    }

    //以下データベースのfanc()
    function makeTable(roomName){
        const client = require("./db_client").pg_client()
        client.connect()
            .then(() => console.log("Connected successfuly：make"))
            .then(() => client.query("create table " + roomName + "(names varchar(10))"))
            .catch((e => console.log(e)))
            .catch((() => client.end()))
    }

    function insertData( roomName, userName ){
        setTimeout(function() {
        const client = require("./db_client").pg_client()
        client.connect()
            .then(() => console.log("Connected successfuly：insert"))
            .then(() => client.query("insert into " + roomName + "( names ) values('" + userName + "')"))
            .catch((e => console.log(e)))
            .catch((() => client.end()))
        } ,100);
    }

    function dropTable( roomName ){
        const client = require("./db_client").pg_client()
        client.connect()
            .then(() => console.log("Connected successfuly：drop"))
            .then(() => client.query("drop table " + roomName))
            .catch((e => console.log(e)))
            .catch((() => client.end()))
    }

    function deleteData( roomName, userName ){
        const client = require("./db_client").pg_client()
        client.connect()
            .then(() => console.log("Connected successfuly：delete"))
            .then(() => client.query("delete from " + roomName + " where names='" + userName + "'"))
            .catch((e => console.log(e)))
            .catch((() => client.end()))
    }
});
