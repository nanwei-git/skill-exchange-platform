const mysql = require('mysql2/promise');
const { loadEnv } = require('../utils/env');

loadEnv();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'skill_exchange',
  charset: 'utf8mb4',
  dateStrings: ['DATE', 'DATETIME', 'TIMESTAMP'],
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = { pool };
