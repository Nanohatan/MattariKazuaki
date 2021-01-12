jikken DB環境構築

・実行コマンド
```
docker-compose up -d
```
でアプリ起動。

```
docker logs -f jikken
```
でログ確認。

```
docker-compose down --volume --remove-orphans
```
でコンテナを消す。

```
docker image list
docker rmi <IMAGE ID>
```
で定期的にイメージ確認して消すのがいいかも。ストレージくわれます。