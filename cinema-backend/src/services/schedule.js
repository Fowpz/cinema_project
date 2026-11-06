const db = require('../db');
const { MOVIE_COLUMNS } = require('./movies');

function getScheduleForDate(date) {
  return db.query(
    `SELECT ${MOVIE_COLUMNS},
            st.id AS showtime_id,
            to_char(st.start_time, 'HH24:MI') AS start_time,
            st.price,
            h.name AS hall_name
     FROM showtimes st
     JOIN movies m ON m.id = st.movie_id
     JOIN halls h ON h.id = st.hall_id
     WHERE m.is_active
       AND st.start_time >= COALESCE($1::date, CURRENT_DATE)
       AND st.start_time < COALESCE($1::date, CURRENT_DATE) + 1
       AND st.start_time > LOCALTIMESTAMP
     ORDER BY m.id, h.name, st.start_time`,
    [date]
  );
}

module.exports = { getScheduleForDate };
