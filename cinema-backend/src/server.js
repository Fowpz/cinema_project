require('./config/env');

const { getJwtSecret } = require('./config/jwt');
const { checkDatabaseConnection, describeConnectionError } = require('./config/setupDatabase');

getJwtSecret();

const app = require('./app');

const PORT = process.env.PORT || 4000;

checkDatabaseConnection()
  .then(() => {
    app.listen(PORT, () => console.log(`API запущен на http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error(describeConnectionError(error));
    process.exit(1);
  });
