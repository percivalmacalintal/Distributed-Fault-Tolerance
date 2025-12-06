const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'register.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const registerProto = protoDescriptor.register;

const target = process.env.REGISTER_ADDR || '127.0.0.1:50056';

const client = new registerProto.RegisterService(target, grpc.credentials.createInsecure());

module.exports = client;