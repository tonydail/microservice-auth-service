import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import jwt from 'jsonwebtoken';
import { config } from '../config/index';
import { logger } from '../config/logger';

const PROTO_PATH = path.join(__dirname, 'proto/auth.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  defaults: true,
});
const proto = grpc.loadPackageDefinition(packageDef) as unknown as {
  auth: { AuthService: grpc.ServiceClientConstructor };
};

function validateToken(
  call: grpc.ServerUnaryCall<{ token: string }, { valid: boolean; user_id: string }>,
  callback: grpc.sendUnaryData<{ valid: boolean; user_id: string }>,
): void {
  try {
    const payload = jwt.verify(call.request.token, config.JWT_SECRET) as { sub: string };
    callback(null, { valid: true, user_id: payload.sub });
  } catch {
    callback(null, { valid: false, user_id: '' });
  }
}

export function startGrpcServer(): void {
  const server = new grpc.Server();
  server.addService(proto.auth.AuthService.service, { validateToken });
  server.bindAsync(
    `0.0.0.0:${config.GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) throw err;
      logger.info(`gRPC server listening on port ${port}`);
    },
  );
}
