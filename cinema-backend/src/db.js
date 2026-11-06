const { Pool } = require('pg');
const { getPgConfig } = require('./config/env');

const pool = new Pool(getPgConfig());

pool.on('error', (error) => console.error('Ошибка соединения с БД:', error.message));

function createDb(executor) {
  return {
    // Выполняет запрос и возвращает все строки результата.
    async query(text, params = []) {
      const { rows } = await executor.query(text, params);
      return rows;
    },
    // Выполняет запрос и возвращает первую строку или null.
    async queryOne(text, params = []) {
      const { rows } = await executor.query(text, params);
      return rows[0] || null;
    },
  };
}

// Выполняет work в транзакции. Внутри запросы идут через переданный tx,
// при любой ошибке всё откатывается.
async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(createDb(client));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { ...createDb(pool), transaction };
