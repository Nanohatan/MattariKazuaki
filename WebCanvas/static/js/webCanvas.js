$(function(){
	var socket = io.connect();　// C02. ソケットへの接続
	var canvas = document.getElementById("mycanvas");
	if(!canvas || !canvas.getContext){
		console.log("canvas err");
		return false;
	}

	//メインキャンバスのコンテキスト（ペン形状を円形に設定）
	var ctx = canvas.getContext("2d");
	ctx.lineCap = "round";

	//カラープレビューキャンバスとペンサイズプレビューキャンバス
	const picker = Picker.create({
		el: '#pickr',
		theme: 'classic',
		components: {
		  preview: true,
		  opacity: true,
		  hue: true,
		},
	  });
	  
	var ctxColorPrev = document.getElementById("colorPrev").getContext("2d");
	var ctxWidthPrev = document.getElementById("widthPrev").getContext("2d");
	var r=0,g=0,b=0,pW=1;//R,G,B　ペンの太さ

	var startX,startY,x,y;//マウスを動かし始めた時の座標、終点の座標
	var borderWidth = 10;//ボーダー分の座標のズレを修正するためにボーダーの値を保存
	var isDrowing = false;

	/*
	マウスがCanvas内でクリックされている間だけ描画する
	*/
	$("#mycanvas").mousedown(function(e){
		isDrowing = true;

		startX = e.pageX - $(this).offset().left - borderWidth;
		startY = e.pageY - $(this).offset().top - borderWidth;
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
		ctx.strokeStyle = data.style;
		ctx.lineWidth = data.width;

		ctx.beginPath();
		ctx.moveTo(data.sX,data.sY);
		ctx.lineTo(data.tX,data.tY);
		ctx.stroke();

		ctx.strokeStyle = "rgb("+r+","+g+","+b+")";
		ctx.lineWidth = pW;
	});
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
	
	function RGBfunc(){
		ctxColorPrev.clearRect(0,0, 50, 50);
		ctxColorPrev.fillStyle = "rgb("+r+","+g+","+b+")";
		ctxColorPrev.fillRect(0,0,50,50);

		ctx.strokeStyle = "rgb("+r+","+g+","+b+")";
	}
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
	

	$("#penWidth").slider({
		formater: function(value){
			//プレビュに反映しながらスライダの値をｐWに保存、ペンサイズにも反映する
			pW = value;
			ctxWidthPrev.clearRect(0,0, 50, 50);
			ctxWidthPrev.beginPath();
			ctxWidthPrev.fillStyle = "rgb("+r+","+g+","+b+")";
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

	var name;
	//チャットメッセージの送信処理
	//これはデフォルトの送信処理です。多分もういらない
	/*
	$("#send").submit(function(e){
		e.preventDefault();
		name = $("#name").val();
		socket.json.emit("send_msg_fromClient",{
			name: $("#name").val(),
			msg: $("#msg").val()
		});
		$("#msg").val("").focus();
	});
	*/
	//追加項目
	//----------------------------------------↓こっから
	
	
	sessionStorage.setItem('loginUser', '');

	var isEnter = false;
	var name = '';

	// C04. server_to_clientイベント・データを受信する
	socket.on("server_to_client", function(data){appendMsg(data.value)});
	function appendMsg(text) {
		$("#chat").append("<div>" + text + "</div>");
	}

	$("form").submit(function(e) {
		var message = $("#msg").val();
		var selectRoom = $("#rooms").val();
		$("#msg").val('');
		if (isEnter) {
		  message = "[" + name + "]: " + message;
			// C03. client_to_serverイベント・データを送信する
			socket.emit("client_to_server", {value : message});
		} else {
			name = message;
			var entryMessage = name + "さんが入室しました。";
			socket.emit("client_to_server_join", {value : selectRoom});
			// C05. client_to_server_broadcastイベント・データを送信する
			socket.emit("client_to_server_broadcast", {value : entryMessage});
			// C06. client_to_server_personalイベント・データを送信する
			socket.emit("client_to_server_personal", {value : name});
			changeLabel();
		}
		e.preventDefault();
	});

	function changeLabel() {
		$(".nameLabel").text("メッセージ：");
		$("#rooms").prop("disabled", true);
		$("sendButton").text("send");
		isEnter = true;
	}

	//追加項目
	//--------------------↑ここまで


	/*
	//回答(追加)
	$("#answer").submit(function(e){
		e.preventDefault();
		console.log("user answer = " + $("#userAnswer").val());
		var answer = $("#userAnswer").val();
		if (answer.includes(odai) ){ //文字列に含まれるかどうか？
			answer =  "「" + answer + "」は 正解　ｾｲｶｲヾﾉ｡ÒㅅÓ)ﾉｼ\"";
			nowtime = 0;
			odai = "まだ決まってないよ";
		} else {
			answer = "「" + answer + "」は 不正解　ﾑﾘﾀﾞﾅ(・×・)";
		}
		socket.json.emit("send_userAnswer_fromClient",{
			userAnswer: answer
		});
		$("#userAnswer").val("").focus();
	});

	$("#startTimer").submit(function(e){
		e.preventDefault();
		socket.json.emit("startTimer_fromClient",{
		});
	});

	$("#endTimer").submit(function(e){
		e.preventDefault();
		socket.json.emit("stopTimer_fromClient",{
		});
	});

	socket.on("send_msg_fromServer",function(data){
		console.log(data);
		//チャットを上詰めに変更
		document.getElementById("chat").innerHTML = "";
		for (var msg in data){
			$($("<li>").text(data[msg])).prependTo("#chat");
		}
	});

	socket.on("send_odaiKakite_fromServer",function(data){
		console.log("kokodayo!");
		if (data.kakite == name || data.kakite == "everyone" ){
			var odaiLog = "お題「" + data.odai + "」，描く人"+ data.kakite +"さん";
		} else {
			var odaiLog = "描く人"+ data.kakite +"さん";
		}
		$($("<li>").text(odaiLog)).prependTo("#chat");
		//$("#chat").append($("<li>").text(data));
	});

	//プレイヤー一覧生成
	socket.on("send_name_fromServer",function(data){
		document.getElementById("players").innerHTML = "<li> プレイヤー一覧 </li>";
		for (var name in data){
			$("#players").append($("<li>").text(data[name]));
		}
	});	


	//表示秒数変更
	socket.on("send_nowtime_fromServer",function(data){
		document.getElementById("timer").innerHTML = data.htmlStile;
	});	

	//お題の変更
	socket.on("send_odai_fromServer",function(data){
		console.log("お題表示変更");
		if (data.name == name || data.name == "everyone" ){
			document.getElementById("odai").innerHTML = data.htmlStile;
		} else {
			document.getElementById("odai").innerHTML = "<h2 style=\"text-align:center\"><font size=\"7\"> 描き手は" + data.name + "さん</font></td>";
		}
		odai = data.odai;
	});	

	//サーバーからタイマーを起動
	socket.on("startTimer_fromServer",function(data){
		console.log("スタート");
		document.getElementById("sTimer").setAttribute("disabled", true);
	});	

	//サーバーからタイマー停止
	socket.on("stopTimer_fromServer",function(data){
		document.getElementById("sTimer").removeAttribute("disabled");
		console.log("停止");
	});

	//リロード時の処理
	window.addEventListener('load', function(e){
		socket.json.emit("send_msg_fromClient", {msg : "リロードしました(-人-;)"});
		console.log('load');
	});
	一回消してみる
	*/


	
	});