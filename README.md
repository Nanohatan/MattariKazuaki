# MattariKazuaki
後期実験！
jikkenという名前のイメージを作る
```
docker build . -t jikken
``` 
runする
```
docker run -p 8080:5000 -it -v $(pwd):/src jikken
``` 

*初めてdocker runしたときにエラーが出る場合があるので、その際は以下コマンドを実行。
```
export DOCKER_CONTENT_TRUST=0
```

srcに行って、app.js
```
node app.js
```
http://localhost:8080/ でアプリのページが確認できる。