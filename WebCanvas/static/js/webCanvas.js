$(function(){
	var socket = io.connect();
	var canvas = document.getElementById("mycanvas");
	if(!canvas || !canvas.getContext){
		console.log("canvas err");
		return false;
	}
	//メインキャンバスのコンテキスト（ペン形状を円形に設定）
	var ctx = canvas.getContext("2d");
	ctx.lineCap = "round";

	//カラープレビューキャンバスとペンサイズプレビューキャンバス
	var ctxColorPrev = document.getElementById("colorPrev").getContext("2d");
	var ctxWidthPrev = document.getElementById("widthPrev").getContext("2d");
	var r=0,g=0,b=0,pW=1;//R,G,B　ペンの太さ
	var pikcolor;

	var startX,startY,x,y;//マウスを動かし始めた時の座標、終点の座標
	var borderWidth = 10;//ボーダー分の座標のズレを修正するためにボーダーの値を保存
	var isDrowing = false;

	/*
	マウスがCanvas内でクリックされている間だけ描画する
	*/
	$("#mycanvas").mousedown(function(e){
		if( kakite == u_name || kakite == "everyone" ){
			isDrowing = true;
	
			startX = e.pageX - $(this).offset().left - borderWidth;
			startY = e.pageY - $(this).offset().top - borderWidth;
		}
	})
	.mousemove(function(e){
		if(!isDrowing) return;

		x = e.pageX - $(this).offset().left - borderWidth;
		y = e.pageY - $(this).offset().top - borderWidth;

		ctx.beginPath();
		ctx.moveTo(startX,startY);
		ctx.lineTo(x,y);
		ctx.stroke();

		//ペン設定と合わせて描画した線分座標を送信
		socket.json.emit("draw_line_fromClient",{
			sX: startX,
			sY: startY,
			tX: x,
			tY: y,
			style: "rgb("+r+","+g+","+b+")",
			width: pW
		});

		startX = x;
		startY = y;
	})
	.mouseup(function(){
		isDrowing = false;
	})
	.mouseleave(function(){
		isDrowing = false;
	});
	
	//サーバーから転送されてきた描画情報を反映
	socket.on("draw_line_fromServer",function(data){
		draw_line(data);
	});
	
	function draw_line(data){
		ctx.strokeStyle = data.style;
		ctx.lineWidth = data.width;

		ctx.beginPath();
		ctx.moveTo(data.sX,data.sY);
		ctx.lineTo(data.tX,data.tY);
		ctx.stroke();

		//ctx.strokeStyle = "rgb("+r+","+g+","+b+")";
		ctx.strokeStyle = inputElement.value;
		ctx.lineWidth = pW;
	}
	
	//全消し
	$("#erase").click(function(){
		ctx.clearRect(0,0, canvas.width, canvas.height);
		socket.emit("erase_fromClient","");
	});
	socket.on("erase_fromServer",function(data){
		ctx.clearRect(0,0, canvas.width, canvas.height);
	});

	/*
	ペンの設定の反映
	*/

	//ここからカラーピッカー 
	const inputElement = document.querySelector('.pickr');

	const pickr = new Pickr({
		el: inputElement,
		useAsButton: true,
		default: '#42445A',
		theme: 'classic',

	swatches: [
		'rgba(244, 67, 54, 1)',
		'rgba(233, 30, 99, 0.95)',
		'rgba(156, 39, 176, 0.9)',
		'rgba(103, 58, 183, 0.85)',
		'rgba(63, 81, 181, 0.8)',
		'rgba(33, 150, 243, 0.75)',
		'rgba(3, 169, 244, 0.7)',
		'rgba(0, 188, 212, 0.7)',
		'rgba(0, 150, 136, 0.75)',
		'rgba(76, 175, 80, 0.8)',
		'rgba(139, 195, 74, 0.85)',
		'rgba(205, 220, 57, 0.9)',
		'rgba(255, 235, 59, 0.95)',
		'rgba(255, 193, 7, 1)'
	],

	components: {
		preview: true,
		opacity: true,
		hue: true,

		interaction: {
		hex: true,
		rgba: true,
		hsva: true,
		input: true,
		save: true
		}
	}

	}).on('init', pickr => {
		inputElement.value = pickr.getSelectedColor().toRGBA().toString(0);
	}).on('save', color => {
		inputElement.value = color.toRGBA().toString(0);
		pikcolor = color.toRGBA().toString(0);
		RGBfunc();
		pickr.hide();
	})

	//ここまでカラーピッカー 

	function RGBfunc(){
		ctxColorPrev.clearRect(0,0, 50, 50);
		//ctxColorPrev.fillStyle = "rgb("+r+","+g+","+b+")";
		ctxColorPrev.fillStyle = inputElement.value;
		ctxColorPrev.fillRect(0,0,50,50);

		//ctx.strokeStyle = "rgb("+r+","+g+","+b+")";
		ctx.strokeStyle = inputElement.value;
	}
	/*
	$("#colorR").slider({
		formater: function(value){
			r = value;
			RGBfunc();
			return "R: "+value;
		}
	});
	$("#colorG").slider({
		formater: function(value){
			g = value;
			RGBfunc();
			return "G: "+value;
		}
	});
	$("#colorB").slider({
		formater: function(value){
			b = value;
			RGBfunc();
			return "B: "+value;
		}
	});
	*/

	$("#penWidth").slider({
		formater: function(value){
			//プレビュに反映しながらスライダの値をｐWに保存、ペンサイズにも反映する
			pW = value;
			ctxWidthPrev.clearRect(0,0, 50, 50);
			ctxWidthPrev.beginPath();
			//ctxWidthPrev.fillStyle = "rgb("+r+","+g+","+b+")";
			ctxColorPrev.fillStyle = inputElement.value;
			ctxWidthPrev.arc(25,25,pW,0,Math.PI*2,false);
			ctxWidthPrev.fill();

			ctx.lineWidth = value;

			return "Pen size: "+value;
		}
	});

	//画像の保存、サムネイルにしてギャラリーに追加
	$("#save").click(function(){
		var img = $("<img>").attr({
			width: 320,
			height: 180,
			src: canvas.toDataURL()
		});
		var link = $("<a>").attr({
			href: canvas.toDataURL().replace("image/png","application/octet-stream"),
			download: new Date().getTime() + ".png"
		});

		$("#gallery").append(link.append(img.addClass("thumbnail")));
	});

//〜〜〜〜〜〜〜〜〜〜〜↓追加項目ｱﾕﾑ
	//回答(追加)
	$("#answer").submit(function(e){
		e.preventDefault();
		console.log("user answer = " + $("#userAnswer").val());
		var answer = $("#userAnswer").val();
		if (answer.includes(odai) ){ //文字列に含まれるかどうか？
			answer =  "「" + answer + "」は 正解　ｾｲｶｲヾﾉ｡ÒㅅÓ\)ﾉｼ\"";
			odai = "まだ決まってないよ";
			var torf = true;
		} else {
			answer = "「" + answer + "」は 不正解　ﾑﾘﾀﾞﾅ(・×・)";
			//ここでお手付きタイマースタート
			//ユーザー一人一人に対しての処理なので，emitいらないかも
			document.getElementById("userAnswer").setAttribute("disabled" , true);
			startOtetukiTimer();
			var torf = false;
		}
		socket.emit("send_userAnswer_fromClient",{
			userAnswer: answer,
			answerName : u_name,
			isAnswer : torf
		});
		$("#userAnswer").val('');
	});

	//お手付きの処理
    var nowtime ;
    var nowBadTime;
    var timerText = "<h2>";
    var badAnswerTimer;
    function time(){
    	document.getElementById("otetukiTimer").innerHTML = "<div>お手付き！" + nowtime + "</div>";
    	if (nowtime > 0){
    		nowtime = nowtime - 1;
    	} else {
    		nowtime = nowBadTime;
    		clearInterval(badAnswerTimer)
    		document.getElementById("userAnswer").removeAttribute("disabled");
    		document.getElementById("otetukiTimer").innerHTML = "<div>" + 'お手付きタイマー' + "</div>";
    	}
    }

    //お手付きタイマースタート
    function startOtetukiTimer(){
    	badAnswerTimer = setInterval(time, 1000);
    }

	//スタンプ仮
	$("#stampButton").submit(function(e){
		console.log("hogehoge");
		if (!document.getElementById('input1')){
			var list = ["ok" , "no" , "kuyashii" ,"koronnbia" , "wakarann" , "tyottomatte" ,"wakatta" , "arigato" , "otukaresama" , "baibai" , "gomen" , "oko" , "irassyai" , "hazukashi" , "omedetou" , "ohayou" , "ne-" ,"hai" , "warau" , "-ko" , "oyasumi"]; //ここデータベースにする？予定はスタンプの名前一覧
			e.preventDefault();
			const div = document.getElementById("allBody");//全部の元id
			const input0 = document.createElement("div");//装飾
			input0.setAttribute("class" , "input0");
			const input1 = document.createElement("div");//追加する箱
			input1.setAttribute("class" , "input1");
			input1.setAttribute("id" , 'input11');
			div.appendChild(input0);
			input0.appendChild(input1);
			//マウスオーバーしているのを拡大表示
			const overImg = document.createElement("img");
			overImg.setAttribute("class" , "overImg");
			overImg.setAttribute("id" , "overImg");
			overImg.setAttribute('src' , './img/' + list[Math.floor( Math.random() * list.length )] + '.png');
			input1.appendChild(overImg);
			const input2 = document.createElement("div"); //ボタン並べる箱1
			input2.setAttribute("class" , "input2");
			const input3 = document.createElement("div"); //ボタン並べる箱2
			//スタンプボタン追加
			for (var id in list ) {
				var button = document.createElement("button");
				button.setAttribute("class" , "sampButton");
				button.style.backgroundImage = 'url(./img/' + list[id] + '.png)';
				button.type = "button";
				button.id = list[id];
				button.onclick = function(){hoge(this.id);} ;
				button.addEventListener("mouseover", function( event ) {
					overImg.setAttribute('src' , './img/' + this.id + '.png');
					overImg.name = this.id;
				},false);
				//マウスオーバーの時に<button>ではできなかったので...
				var a = document.createElement("a");
				a.appendChild(button);
				input3.appendChild(a);
			}
			input1.appendChild(input2);
			input2.appendChild(input3);
		}
	});

	//スタンプの送信
	function hoge(stampID){
		socket.emit("client_to_server", {value : [u_name , stampID] , isMsg : false});
		document.getElementById('input11').remove();
		console.log(stampID);
	}

	//もういっかい遊べるドン
	$("#gameReset").submit(function(e) {
		e.preventDefault();
		if(ismaster){
			e.preventDefault();
			socket.emit("stopTimer_fromClient",'');
			socket.emit("game_reset" , '' );
		}else{
			alert("マスターしか押せません|ﾉ･ω･)ﾉ⌒(*･-･)");
		}
	});

	//画面の他の場所をクリックされたら，スタンプ選択を消す
	document.onclick = function(){
		try{
			document.getElementById('input11').remove();
			document.getElementById('overImg').remove();
		}catch(e){};
	};

	$("#startTimerForm").submit(function(e){
		e.preventDefault();
		socket.emit("startTimer_fromClient",'');
	});

	$("#stopTimerForm").submit(function(e){
		e.preventDefault();
		socket.emit("stopTimer_fromClient",'');
	});

	//お題や描きてなどのチャットメッセージ生成
	socket.on("send_odaiMsg_fromServer",function(data){

		if (data.name == u_name ){

			var odaiLog = "お題「" + data.odai + "」！！";
		} else {
			var odaiLog = "描く人"+ data.name +"さん";
		}
		$("<hr>").prependTo("#chat");
		$($("<div>").text(odaiLog)).prependTo("#chat");
		document.getElementsByName(data.name)[0].setAttribute("class" , "kakite");
	});

	var ismaster;
	//プレイヤー一覧生成
	socket.on("make_playerList",function(data){
		document.getElementById("players").innerHTML = "<div> プレイヤー一覧 </div>";
		for (var player in data.nameDict){
			var html = player + "　　　点数：" + data.nameDict[player][1];
			var htmlTag = '<div name=' + player +'>' ;
			if (player == u_name){
				ismaster = data.nameDict[player][0];
				htmlTag =  '<div style="color:blue" name=' + player +'>' ;
				console.log("ismaster："+ismaster);
			}
			if (data.nameDict[player][0]){
					html = "Master -> " + html;
			}
			$("#players").append($(htmlTag).text(html));
		}
	});	

	//表示秒数変更
	socket.on("send_nowtime_fromServer",function(data){
		document.getElementById("badAnswerTimer").innerHTML = data.htmlStile;
	});	

	//お題の変更
	var kakite = "everyone";
	socket.on("send_odai_fromServer",function(data){
		console.log("お題表示変更");
		if (data.name == u_name || data.name == "everyone" ){
			document.getElementById("odai").innerHTML = data.htmlStile;
		} else {
			document.getElementById("odai").innerHTML = "<h2 style=\"text-align:center\"><font size=\"7\"> 描き手は" + data.name + "さん</font></td>";
		}
		$("#odai").append('<div style="text-align: center;" >' +data.round + "</div>");
		kakite = data.name;
		odai = data.odai;
		if (odai == "現在終了中..."){
			document.getElementById("gameReset").style.display = "revert";
		}else{
			document.getElementById("gameReset").style.display = "none";
		}
	});	

	//ゲームカウント，描画時間，インターバルタイム，お手付き時間の設定
	$("#setGameTimes").submit(function(e) {
		console.log(parseInt($("#gameCount").val() ,10));
		if (ismaster){
			if ( !(isNaN(parseInt($("#gameCount").val() ,10))) && !(isNaN(parseInt($("#drowTime").val() ,10))) && !(isNaN(parseInt($("#intervalTime").val() ,10))) && !(isNaN(parseInt($("#nowBadTime").val()))) ) {
				var themeName = document.getElementById("themeName").value;
				console.log("お題タイトル：" + themeName);
				socket.emit("set_game_time" , {
					gameCount : parseInt($("#gameCount").val() ,10) ,
					drowTime : parseInt($("#drowTime").val() ,10) ,
					intervalTime : parseInt($("#intervalTime").val() ,10) ,
					nowBadTime : parseInt($("#nowBadTime").val() ,10) ,
					themeName : themeName
				});
				document.getElementById("startTimer").removeAttribute("disabled");
			}else{
				alert('全部の設定を決めてから決定を押してね…I˙꒳​˙)');
			}
		} else{
			alert('ゲーム設定はマスターしかできません( ‘д‘⊂彡☆))Д´) ﾊﾟｰﾝw');
		}
		e.preventDefault();
	});

	//ゲームの初期値色々の表示
	socket.on("setGameTimes_fromServer",function(data){
		document.getElementById("setGameTimes").innerHTML = '<main><div><div>ラウンド数：' + data.gameCount + '回</div><div>制限時間：' + data.drowTime +'秒</div></div><div><div>インターバル：' + data.intervalTime + '秒</div><div>お手付き時間：' + data.nowBadTime + '秒</div></div><div style="text-align: center;"><div>お題：' + data.themeName + '</div></div></main>';
		nowBadTime = data.nowBadTime;
		nowtime = data.nowBadTime;
	});

	//サーバーからタイマーを起動
	socket.on("startTimer_fromServer",function(data){
		if (ismaster){
			document.getElementById("stopTimer").removeAttribute("disabled");
			document.getElementById("startTimer").setAttribute("disabled" , true);
			console.log("スタート");
		}
	});	

	//サーバーからタイマー停止
	socket.on("stopTimer_fromServer",function(data){
		if (ismaster){
			document.getElementById("startTimer").removeAttribute("disabled");
			document.getElementById("stopTimer").setAttribute("disabled" , true);
			console.log("停止");
		}
	});

	//マスター権限が移った際にボタンを押せるようにする
	socket.on('master_change' , function(data) {
		if (!data.badAnswerTimer){
			document.getElementById("startTimer").removeAttribute("disabled");
			document.getElementById("stopTimer").setAttribute("disabled" , true);
		} else {
			document.getElementById("stopTimer").removeAttribute("disabled");
			document.getElementById("startTimer").setAttribute("disabled" , true);
		}
	});

	//ログの復元機能
	socket.on("fix_log" , function(data){
    	for (var msg in data.value){
			$(data.value[msg]).prependTo("#chat");
		}
		for (var drow in data.canvasDict){
			draw_line(data.canvasDict[drow]);
		}
		console.log("log fix compleet!!");
	});

//〜〜〜〜〜〜〜〜〜〜〜↑ここまでｱﾕﾑ

	//追加項目
	//----------------------------------------↓こっからｷﾔﾏ
	
		sessionStorage.setItem('loginUser', '');

        var isEnter = false;

        // C04. server_to_clientイベント・データを受信する
        socket.on("server_to_client", function(data){appendMsg(data.value)});
        function appendMsg(text) {
			$(text).prependTo("#chat");
		}

		const urlParams = new URLSearchParams(window.location.search);
		const r_name = urlParams.get('roomName');
		const u_name = urlParams.get('userName');
		console.log(u_name,r_name);
		afterAddPlayer(r_name , u_name);

		//formのタグで一括同じ処理させられてみたいなので，特定のid名つけてあげて下さい（仮id："formInline"）
        $("#formInline").submit(function(e) {
			var message = $("#msgForm").val();
            var selectRoom = $("#rooms").val();
            $("#msgForm").val('');
            message = "[" + u_name + "]: " + message;
            // C03. client_to_serverイベント・データを送信する
            socket.emit("client_to_server" ,  {value : message , isMsg : true});
            e.preventDefault();
        });

		function afterAddPlayer(roomName , userName) {
			socket.emit("client_to_server_join", {value : roomName , name : userName});
			socket.emit("client_to_server_addPlayer", {value : userName});
			var entryMessage = userName + "さんが入室しました。";
			// C05. client_to_server_broadcastイベント・データを送信する
			socket.emit("client_to_server_broadcast", {value : entryMessage});
			// C06. client_to_server_personalイベント・データを送信する
			socket.emit("client_to_server_personal", /*{value : name}*/"");
		}
		//--------------------↑ここまでｷﾔﾏ
	});
