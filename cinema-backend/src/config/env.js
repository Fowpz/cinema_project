const path = require('path');
const dotenv = require('dotenv');

const ENV_FILE = path.join(__dirname, '../../.env');
dotenv.config({ path: ENV_FILE });

function getPgConfig(database = process.env.PGDATABASE || 'cinema') {
  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database,
  };
}

module.exports = { getPgConfig };
