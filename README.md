# Система кинотеатров

Учебный проект: мобильное приложение для кинотеатров.

- `CinemaApp/` — клиент на Expo и React Native.
- `cinema-backend/` — API на Express и PostgreSQL.
- `cinema-backend/schema.sql` — структура таблиц и связи между ними.
- `cinema-backend/src/services/` — функции для работы с БД; маршруты API вызывают эти функции.

## Запуск

Нужны Node.js и PostgreSQL. Для применения `schema.sql` понадобится клиент `psql`.
Резервная копия `cinema_db.sql`, если она у вас есть, создана в бинарном формате
`pg_dump`; её нужно восстановить через `pg_restore`, а не запускать через `psql`.

1. Создайте базу `cinema`, если её ещё нет, и из корня репозитория выполните
   SQL-схему:

   ```powershell
   createdb -U postgres cinema
   psql -U postgres -d cinema -f .\cinema-backend\schema.sql
   ```

   Если база уже создана, выполните только команду `psql`.
2. В `cinema-backend/` установите зависимости (`npm install`), скопируйте
   `.env.example` в `.env` и укажите параметры подключения к PostgreSQL и
   секрет `JWT_SECRET`.
3. Запустите API в отдельном терминале:

   ```sh
   cd .\cinema-backend
   npm start
   ```

4. Запустите мобильное приложение в другом терминале:

   ```sh
   cd .\CinemaApp
   npm install
   npm start
   ```

Клиент и backend находятся в отдельных папках на одном уровне. Для запуска
клиента в браузере используйте `npm run web` из `CinemaApp/`. SQL-запросы
приложения находятся в функциях `cinema-backend/src/services/`, а маршруты
вызывают эти функции вместо прямого обращения к PostgreSQL.
