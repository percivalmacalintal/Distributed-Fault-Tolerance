const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const authProto = protoDescriptor.auth;

const target = process.env.AUTH_ADDR || '127.0.0.1:50051';

const client = new authProto.AuthService(target, grpc.credentials.createInsecure());

module.exports = client;