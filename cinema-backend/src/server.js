require('dotenv').config();

const { getJwtSecret } = require('./config/jwt');

getJwtSecret();

const app = require('./app');

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API запущен на http://localhost:${PORT}`));
