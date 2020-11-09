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

	//チャットメッセージの送信処理
	$("#send").submit(function(e){
		e.preventDefault();
		socket.json.emit("send_msg_fromClient",{
			name: $("#name").val(),
			msg: $("#msg").val()
		});
		$("#msg").val("").focus();
	});

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

	//名前入力
	socket.on('connect', function(){
		socket.json.emit('setUserName', prompt('ユーザー名を入力してください'));
	});

	socket.on('connect', function(){
		socket.json.emit('setUserName', prompt('ユーザー名を入力してください'));
	});

	socket.on("send_msg_fromServer",function(data){
		console.log(data);
		//チャットを上詰めに変更
		$($("<li>").text(data)).prependTo("#chat");
		//$("#chat").append($("<li>").text(data));
	});

});

//お題変更のボタン処理
let odaiList = ["ちくわ" , "とうふ" , "だいこん" , "もち巾着" , "牛すじ" , "はんぺん" , "こんにゃく" , "じゃがいも" , "おでん食べたい！"];
var odai;
function change_odai(){
	odai = odaiList[Math.floor( Math.random() * odaiList.length )];
	var val = document.getElementById("odai").innerHTML = "<h2 style=\"text-align:center\"><font size=\"7\">" + odai + "</font></td>" ;

	var socket = io.connect();
	socket.json.emit("send_changeOdai_fromClient",{
		odaiLog: "お題「" + odai + "」，描く人〇〇さん",
		odai: odai
	});
}

//タイマー
var nowtime = 0;
var drowFlag = true;
var timer;
var timerText = "<h2>";
var time = function(){
	var val = document.getElementById("timer").innerHTML = timerText + nowtime + "秒</h2>";
	if (nowtime > 0){
		nowtime = nowtime - 1;
	} else {
		console.log("timer reset!");
		clearInterval(timer);
		if (drowFlag){
			nowtime = 5;
			timerText = "<h2 style=\"color:blue\">";
			var val = document.getElementById("odai").innerHTML = "<h2 style=\"text-align:center\"><font size=\"7\">次のお題は…I˙꒳​˙)</font></td>" ;
		} else {
			nowtime = 10;
			timerText = "<h2 style=\"color:red\">";
			change_odai();
		}
	startTimer();
	drowFlag = !drowFlag;
	return;
	}
}

function startTimer(){
	timer = setInterval(time, 1000);
}

function stopTimer(){
	clearInterval(timer);
	var val = document.getElementById("timer").innerHTML = "<h2>ストップ</td>" ;
}
