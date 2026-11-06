-- База данных приложения «Кинотеатр» (PostgreSQL 13+).
--
-- Бэкенд выполняет этот файл сам при первом запуске, если база ещё пуста.
--
-- Как развернуть вручную в pgAdmin:
--   1. Databases → Create → Database..., имя как в PGDATABASE из .env
--   2. На новой базе: Tools → Query Tool
--   3. Открыть этот файл и выполнить (F5)
--
-- Посмотреть диаграмму: правый клик по базе → ERD For Database.
--
-- Чтобы выполнить скрипт повторно в той же базе, раскомментируйте блок ниже.
-- Он удалит все таблицы вместе с данными.
--
-- DROP TABLE IF EXISTS tickets, orders, showtimes, seats, halls,
--   movie_genres, genres, movies, refresh_tokens, users CASCADE;

SET client_encoding = 'UTF8';

BEGIN;

-- =========================== Пользователи ===========================

CREATE TABLE users (
  id            SERIAL       PRIMARY KEY,
  public_id     UUID         NOT NULL DEFAULT gen_random_uuid(),
  login         VARCHAR(100) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT users_public_id_key UNIQUE (public_id),
  CONSTRAINT users_login_key UNIQUE (login),
  CONSTRAINT users_login_lowercase_check CHECK (login = lower(login)),
  CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'))
);

-- Хранится только SHA-256 от токена: утечка таблицы не даёт войти в чужой аккаунт.
CREATE TABLE refresh_tokens (
  id         SERIAL      PRIMARY KEY,
  user_id    INTEGER     NOT NULL,
  token_hash CHAR(64)    NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash),
  CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- ============================== Фильмы ==============================

CREATE TABLE movies (
  id           SERIAL       PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  age_rating   VARCHAR(3)   NOT NULL,
  description  TEXT         NOT NULL,
  poster_url   VARCHAR(500),
  duration_min INTEGER      NOT NULL,
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT movies_age_rating_check
    CHECK (age_rating IN ('0+', '6+', '12+', '16+', '18+')),
  CONSTRAINT movies_duration_check CHECK (duration_min > 0)
);

CREATE TABLE genres (
  id   SERIAL      PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  CONSTRAINT genres_name_key UNIQUE (name)
);

CREATE TABLE movie_genres (
  movie_id INTEGER NOT NULL,
  genre_id INTEGER NOT NULL,
  CONSTRAINT movie_genres_pkey PRIMARY KEY (movie_id, genre_id),
  CONSTRAINT movie_genres_movie_id_fkey
    FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE,
  CONSTRAINT movie_genres_genre_id_fkey
    FOREIGN KEY (genre_id) REFERENCES genres (id) ON DELETE CASCADE
);

-- =============================== Залы ===============================

CREATE TABLE halls (
  id            SERIAL      PRIMARY KEY,
  name          VARCHAR(50) NOT NULL,
  rows_count    INTEGER     NOT NULL,
  seats_per_row INTEGER     NOT NULL,
  CONSTRAINT halls_name_key UNIQUE (name),
  CONSTRAINT halls_rows_count_check CHECK (rows_count > 0),
  CONSTRAINT halls_seats_per_row_check CHECK (seats_per_row > 0)
);

CREATE TABLE seats (
  id          SERIAL  PRIMARY KEY,
  hall_id     INTEGER NOT NULL,
  row_number  INTEGER NOT NULL,
  seat_number INTEGER NOT NULL,
  CONSTRAINT seats_hall_row_seat_key UNIQUE (hall_id, row_number, seat_number),
  CONSTRAINT seats_hall_id_fkey
    FOREIGN KEY (hall_id) REFERENCES halls (id) ON DELETE CASCADE
);

-- ============================== Сеансы ==============================

-- start_time — местное время кинотеатра, поэтому без часового пояса.
CREATE TABLE showtimes (
  id         SERIAL        PRIMARY KEY,
  movie_id   INTEGER       NOT NULL,
  hall_id    INTEGER       NOT NULL,
  start_time TIMESTAMP     NOT NULL,
  price      NUMERIC(8, 2) NOT NULL,
  CONSTRAINT showtimes_hall_start_key UNIQUE (hall_id, start_time),
  CONSTRAINT showtimes_price_check CHECK (price > 0),
  CONSTRAINT showtimes_whole_hour_check
    CHECK (start_time = date_trunc('hour', start_time)),
  CONSTRAINT showtimes_movie_id_fkey
    FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE RESTRICT,
  CONSTRAINT showtimes_hall_id_fkey
    FOREIGN KEY (hall_id) REFERENCES halls (id) ON DELETE RESTRICT
);

-- ========================== Заказы и билеты ==========================

CREATE TABLE orders (
  id         SERIAL      PRIMARY KEY,
  user_id    INTEGER     NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
);

-- price копируется из сеанса: цена купленного билета не меняется вместе с расписанием.
CREATE TABLE tickets (
  id          SERIAL        PRIMARY KEY,
  order_id    INTEGER       NOT NULL,
  showtime_id INTEGER       NOT NULL,
  seat_id     INTEGER       NOT NULL,
  price       NUMERIC(8, 2) NOT NULL,
  status      VARCHAR(20)   NOT NULL DEFAULT 'paid',
  CONSTRAINT tickets_price_check CHECK (price >= 0),
  CONSTRAINT tickets_status_check
    CHECK (status IN ('booked', 'paid', 'cancelled', 'used')),
  CONSTRAINT tickets_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT tickets_showtime_id_fkey
    FOREIGN KEY (showtime_id) REFERENCES showtimes (id) ON DELETE RESTRICT,
  CONSTRAINT tickets_seat_id_fkey
    FOREIGN KEY (seat_id) REFERENCES seats (id) ON DELETE RESTRICT
);

-- Одно место на сеанс можно продать один раз; отменённый билет место освобождает.
CREATE UNIQUE INDEX tickets_showtime_seat_active_key
  ON tickets (showtime_id, seat_id) WHERE status <> 'cancelled';

-- ============================= Индексы ==============================

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX movie_genres_genre_id_idx ON movie_genres (genre_id);
CREATE INDEX showtimes_movie_start_idx ON showtimes (movie_id, start_time);
CREATE INDEX showtimes_start_time_idx ON showtimes (start_time);
CREATE INDEX orders_user_id_idx ON orders (user_id);
CREATE INDEX tickets_order_id_idx ON tickets (order_id);
CREATE INDEX tickets_seat_id_idx ON tickets (seat_id);

-- ========================= Начальные данные ==========================

-- Демо-аккаунты, пароли указаны в README.md. Для реального запуска их нужно заменить.
INSERT INTO users (login, password_hash, name, role) VALUES
  ('admin', '$2a$10$XzqzD1WovWqywsQFgH2op.3niS2049.NW6sSHvWiKqx4h/MTLDEte', 'Администратор', 'admin'),
  ('user',  '$2a$10$vEGhBZCjPpQ4zcs08bXkVOwtz6ZRclHu0zNWUbx/LV/Xaog048nby', 'Покупатель', 'user');

INSERT INTO halls (name, rows_count, seats_per_row) VALUES
  ('Зал 1', 8, 10),
  ('Зал 2', 8, 10),
  ('Зал 3', 8, 10),
  ('Зал 4', 8, 10);

INSERT INTO seats (hall_id, row_number, seat_number)
SELECT h.id, r, s
FROM halls h
CROSS JOIN LATERAL generate_series(1, h.rows_count) AS r
CROSS JOIN LATERAL generate_series(1, h.seats_per_row) AS s;

INSERT INTO movies (title, age_rating, description, poster_url, duration_min) VALUES
  ('Человек-паук', '12+',
   'Питеру Паркеру снова предстоит защищать город: новый враг угрожает Нью-Йорку, а личная жизнь героя становится всё сложнее.',
   'https://i.pinimg.com/736x/c4/df/96/c4df96094eb6c1b8d81667781ec47489.jpg', 140),
  ('Сумерки', '18+',
   '«Запретный плод сладок». История любви обычной девушки и вампира, которая переворачивает её жизнь.',
   'https://images.weserv.nl/?url=image.tmdb.org%2Ft%2Fp%2Fw500%2F3Gkb6jm6962ADUPaCBqzz9CTbn9.jpg', 122),
  ('Гарри Поттер и философский камень', '12+',
   'Мальчик, который выжил, отправляется в Хогвартс — школу чародейства и волшебства. Его ждут новые друзья, тайны и первое настоящее приключение.',
   'https://images.weserv.nl/?url=image.tmdb.org%2Ft%2Fp%2Fw500%2FwuMc08IPKEatf9rnMNXvIDxqP4W.jpg', 152),
  ('Интерстеллар', '18+',
   'Отец летит к звёздам ради будущего детей — и всего человечества. Космическая одиссея Кристофера Нолана.',
   'https://images.weserv.nl/?url=image.tmdb.org%2Ft%2Fp%2Fw500%2FgEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 210);

INSERT INTO genres (name) VALUES
  ('Боевик'), ('Драма'), ('Приключения'), ('Фантастика'), ('Фэнтези');

INSERT INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM (VALUES
  ('Человек-паук', 'Фантастика'),
  ('Человек-паук', 'Боевик'),
  ('Сумерки', 'Фэнтези'),
  ('Сумерки', 'Драма'),
  ('Гарри Поттер и философский камень', 'Фэнтези'),
  ('Гарри Поттер и философский камень', 'Приключения'),
  ('Интерстеллар', 'Фантастика'),
  ('Интерстеллар', 'Драма'),
  ('Интерстеллар', 'Приключения')
) AS link (title, genre)
JOIN movies m ON m.title = link.title
JOIN genres g ON g.name = link.genre;

-- Расписание на 14 дней от даты запуска скрипта: в залах 1–3 по 4 сеанса с шагом 4 часа,
-- этого хватает на самый длинный фильм. Фильмы чередуются по залам и дням.
-- Зал 4 оставлен свободным, чтобы администратору было куда добавлять новые сеансы.
INSERT INTO showtimes (movie_id, hall_id, start_time, price)
SELECT m.id,
       h.id,
       CURRENT_DATE + day + slot.start_at,
       slot.price
FROM generate_series(0, 13) AS day
CROSS JOIN (VALUES
  (0, TIME '10:00', 300),
  (1, TIME '14:00', 350),
  (2, TIME '18:00', 400),
  (3, TIME '22:00', 450)
) AS slot (position, start_at, price)
CROSS JOIN halls h
JOIN movies m ON m.id = (day + slot.position + h.id) % 4 + 1
WHERE h.name <> 'Зал 4';

-- Пример покупки, чтобы в зале были занятые места, а в кабинете демо-покупателя — билеты.
WITH first_showtime AS (
  SELECT id, hall_id, price
  FROM showtimes
  WHERE start_time > LOCALTIMESTAMP
  ORDER BY start_time, hall_id
  LIMIT 1
), new_order AS (
  INSERT INTO orders (user_id)
  SELECT id FROM users WHERE login = 'user'
  RETURNING id
)
INSERT INTO tickets (order_id, showtime_id, seat_id, price)
SELECT new_order.id, st.id, s.id, st.price
FROM new_order
CROSS JOIN first_showtime st
JOIN seats s ON s.hall_id = st.hall_id AND s.row_number = 4 AND s.seat_number IN (5, 6);

COMMIT;
