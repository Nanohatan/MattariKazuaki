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

ディレクトリで
```
docker-compose exec database /bin/bash
```
コンテナ内で
```
psql -U postgres -d jikken_db
```
でDBの中に入れます。