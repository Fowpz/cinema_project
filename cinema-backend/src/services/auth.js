const pool = require('../config/database');

async function createUser({ email, passwordHash, name }) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, role`,
    [email, passwordHash, name]
  );
  return rows[0];
}

async function getUserByEmail(email) {
  const { rows } = await pool.query(
    'SELECT id, email, name, role, password_hash FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  return rows[0] || null;
}

async function getUserById(id) {
  const { rows } = await pool.query(
    'SELECT id, email, name, role FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function updateUserPasswordHash(id, passwordHash) {
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
}

module.exports = { createUser, getUserByEmail, getUserById, updateUserPasswordHash };
