const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'student_grades.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const studentGradesProto = protoDescriptor.student_grades;

const target = process.env.STUDENTGRADES_ADDR || '127.0.0.1:50054';

const client = new studentGradesProto.StudentGradesService(target, grpc.credentials.createInsecure());

module.exports = client;