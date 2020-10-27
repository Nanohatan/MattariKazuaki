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
	socket.on("send_msg_fromServer",function(data){
		console.log(data);
		$("#chat").append($("<li>").text(data));
		
	});

});
