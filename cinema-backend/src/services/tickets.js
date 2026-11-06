const db = require('../db');
const { httpError } = require('../utils/http');

function createOrder({ showtimeId, seatIds, userId }) {
  return db.transaction(async (tx) => {
    const showtime = await tx.queryOne(
      `SELECT price, hall_id, start_time <= LOCALTIMESTAMP AS is_past
       FROM showtimes
       WHERE id = $1`,
      [showtimeId]
    );
    if (!showtime) throw httpError(404, 'Сеанс не найден');
    if (showtime.is_past) throw httpError(400, 'Нельзя купить билет на прошедший сеанс');

    const { count } = await tx.queryOne(
      'SELECT COUNT(*)::int AS count FROM seats WHERE hall_id = $1 AND id = ANY($2::int[])',
      [showtime.hall_id, seatIds]
    );
    if (count !== seatIds.length) {
      throw httpError(400, 'Одно или несколько выбранных мест не принадлежат этому залу');
    }

    const order = await tx.queryOne(
      'INSERT INTO orders (user_id) VALUES ($1) RETURNING id',
      [userId]
    );
    // Если место уже продано, уникальный индекс отменит всю транзакцию (код 23505).
    await tx.query(
      `INSERT INTO tickets (order_id, showtime_id, seat_id, price)
       SELECT $1, $2, selected.seat_id, $3
       FROM UNNEST($4::int[]) AS selected (seat_id)`,
      [order.id, showtimeId, showtime.price, seatIds]
    );

    return { orderId: order.id, total: seatIds.length * Number(showtime.price) };
  });
}

function getOrdersForUser(userId) {
  return db.query(
    `SELECT o.id,
            m.title AS movie_title, m.age_rating, m.poster_url, m.duration_min,
            (SELECT string_agg(g.name, ', ' ORDER BY g.name)
             FROM movie_genres mg
             JOIN genres g ON g.id = mg.genre_id
             WHERE mg.movie_id = m.id) AS genres,
            h.name AS hall_name,
            to_char(st.start_time, 'YYYY-MM-DD') AS start_date,
            to_char(st.start_time, 'HH24:MI') AS start_time,
            MIN(t.status) AS status,
            SUM(t.price) AS total,
            json_agg(
              json_build_object('row', s.row_number, 'seat', s.seat_number, 'price', t.price)
              ORDER BY s.row_number, s.seat_number
            ) AS seats
     FROM orders o
     JOIN tickets t ON t.order_id = o.id
     JOIN seats s ON s.id = t.seat_id
     JOIN showtimes st ON st.id = t.showtime_id
     JOIN movies m ON m.id = st.movie_id
     JOIN halls h ON h.id = st.hall_id
     WHERE o.user_id = $1
     GROUP BY o.id, st.id, m.id, h.id
     ORDER BY st.start_time DESC, o.id DESC`,
    [userId]
  );
}

module.exports = { createOrder, getOrdersForUser };
