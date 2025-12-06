const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'enrollment.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const enrollmentProto = protoDescriptor.enrollment;

const target = process.env.ENROLLMENT_ADDR || '127.0.0.1:50053';

const client = new enrollmentProto.EnrollmentService(target, grpc.credentials.createInsecure());

module.exports = client;