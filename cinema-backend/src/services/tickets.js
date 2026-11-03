const pool = require('../config/database');

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function createTickets({ showtimeId, seatIds, user }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const stRes = await client.query(
      `SELECT st.price, st.hall_id,
              st.start_time <= clock_timestamp()::timestamp AS is_past,
              EXISTS (
                SELECT 1
                FROM showtimes duplicate
                WHERE duplicate.id < st.id
                  AND duplicate.movie_id = st.movie_id
                  AND duplicate.hall_id = st.hall_id
                  AND duplicate.start_time = st.start_time
              ) AS is_duplicate
       FROM showtimes st
       WHERE st.id = $1
       FOR UPDATE`,
      [showtimeId]
    );
    if (!stRes.rows.length) throw httpError(404, 'Сеанс не найден');
    if (stRes.rows[0].is_past) {
      throw httpError(400, 'Нельзя купить билет на прошедший сеанс');
    }
    if (stRes.rows[0].is_duplicate) {
      throw httpError(409, 'Этот сеанс уже есть в расписании. Выберите показанное время из афиши.');
    }

    const seatResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM seats WHERE hall_id = $1 AND id = ANY($2::int[])',
      [stRes.rows[0].hall_id, seatIds]
    );
    if (seatResult.rows[0].count !== seatIds.length) {
      throw httpError(400, 'Одно или несколько выбранных мест не принадлежат этому залу');
    }

    const price = stRes.rows[0].price;
    const ticketResult = await client.query(
      `INSERT INTO tickets (guest_email, guest_name, user_id, showtime_id, seat_id, price, status)
       SELECT $1, $2, $3, $4, seat_id, $5, 'paid'
       FROM UNNEST($6::int[]) AS selected(seat_id)
       RETURNING id`,
      [user.email, user.name, user.id, showtimeId, price, seatIds]
    );

    await client.query('COMMIT');
    return {
      ticketIds: ticketResult.rows.map((row) => row.id),
      total: seatIds.length * Number(price),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getTicketsForUser(userId) {
  const { rows } = await pool.query(
    `SELECT t.id, t.price, t.status, t.created_at, t.guest_email,
            st.id AS showtime_id,
            m.id AS movie_id, m.title AS movie_title, m.age_rating,
            m.poster_url, m.genres, m.duration_min,
            to_char(st.start_time, 'YYYY-MM-DD"T"HH24:MI:SS') AS start_time,
            h.name AS hall_name,
            s.row_number, s.seat_number
     FROM tickets t
     JOIN showtimes st ON st.id = t.showtime_id
     JOIN movies m ON m.id = st.movie_id
     JOIN halls h ON h.id = st.hall_id
     JOIN seats s ON s.id = t.seat_id
     WHERE t.user_id = $1
     ORDER BY st.start_time DESC`,
    [userId]
  );
  return rows;
}

module.exports = { createTickets, getTicketsForUser };
