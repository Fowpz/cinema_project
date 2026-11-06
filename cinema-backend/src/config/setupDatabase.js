const { Client } = require('pg');
const { getPgConfig } = require('./env');

// Проверяет соединение с уже созданной базой, не создавая и не меняя её.
async function checkDatabaseConnection() {
  const client = new Client(getPgConfig());
  await client.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    await client.end();
  }
}

function describeConnectionError(error) {
  const { host, port, user } = getPgConfig();
  if (error.code === '28P01') {
    return `PostgreSQL не принял пароль пользователя «${user}». Проверьте PGPASSWORD в файле .env.`;
  }
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return `PostgreSQL не отвечает на ${host}:${port}. Проверьте, что служба запущена, и PGHOST и PGPORT в .env.`;
  }
  if (error.code === '3D000') {
    return 'Указанная база данных не найдена. Создайте её вручную и загрузите cinema_db.sql один раз.';
  }
  if (error.code === '42501') {
    return `У пользователя «${user}» нет доступа к базе. Проверьте права PGUSER.`;
  }
  return error.message;
}

module.exports = { checkDatabaseConnection, describeConnectionError };
