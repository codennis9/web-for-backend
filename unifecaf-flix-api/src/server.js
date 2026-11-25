'use strict';

require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
  console.log(`UniFECAF Flix API disponível em http://localhost:${port}`);
});

async function shutdown(signal) {
  console.log(`\n${signal} recebido. Encerrando a API...`);
  server.close(async (error) => {
    if (error) {
      console.error('Erro ao encerrar o servidor:', error);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
    process.exit();
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
