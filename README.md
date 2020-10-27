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
srcに行って、app.js
```
node app.js
```

