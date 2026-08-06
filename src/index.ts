import express from 'express';
import pinoHttp from 'pino-http';
import { config } from './config/index';
import { logger } from './config/logger';
import { authRouter } from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler';
import { startGrpcServer } from './grpc/server';

const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));

app.use('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-service' }));
app.use('/', authRouter);
app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info(`auth-service REST listening on port ${config.PORT}`);
});

startGrpcServer();
