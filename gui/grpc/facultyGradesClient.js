const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'faculty_grades.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const facultyGradesProto = protoDescriptor.faculty_grades;

const target = process.env.FACULTYGRADES_ADDR || '127.0.0.1:50055';

const client = new facultyGradesProto.FacultyGradesService(target, grpc.credentials.createInsecure());

module.exports = client;