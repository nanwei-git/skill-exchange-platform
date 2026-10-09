const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { loadEnv } = require('./utils/env');

loadEnv();

const routes = require('./routes');
const { notFoundHandler } = require('./middlewares/notFoundHandler');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/favicon.ico', (_req, res) => res.status(204).end());

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: '个人技能交换平台 API',
      version: '1.0.0',
      time: new Date().toISOString(),
    },
    error: null,
    message: '服务运行正常',
  });
});

app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`[Server] 服务已启动：http://localhost:${port}`);
  });
}

module.exports = app;
