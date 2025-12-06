require('dotenv').config();

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const jwt = require('jsonwebtoken');

const PROTO_PATH = path.join(__dirname, 'faculty_grades.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const facultyGradesProto = protoDescriptor.faculty_grades;

const server = new grpc.Server();
const Offering = require('./offering');

async function getUserFromMetadata(metadata) {
    const authHeaders = metadata.get('authorization');
    if (!authHeaders || authHeaders.length === 0) {
        const err = new Error('Missing authorization')
        err.code = 'UNAUTH';
        throw err;
    }

    const header = authHeaders[0];
    const parts = header.split(' ');

    if (parts.length !== 2 || parts [0] !== 'Bearer') {
        const err = new Error('Invalid authorization')
        err.code = 'UNAUTH';
        throw err;
    }

    const token = parts[1];
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        const err = new Error('Invalid or expired token');
        err.code = 'UNAUTH';
        throw err;
    }
}

server.addService(facultyGradesProto.FacultyGradesService.service, {
    async ListMyOfferings(call, callback) {
        try {
            const user = await getUserFromMetadata(call.metadata);
            const offerings = await Offering.getOfferingByFaculty(user.id);
            callback(null, { offerings });
        } catch (err) {
            if (err.code === 'UNAUTH') {
                return callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: err.message,
                });
            }
            if (err.code === 'FORBIDDEN') {
                return callback({
                    code: grpc.status.PERMISSION_DENIED,
                    message: err.message,
                });
            }

            return callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to fetch offerings.',
            });
        }
    },
    async ListStudents(call, callback) {
        try {
            const user = await getUserFromMetadata(call.metadata);
            const { offeringId } = call.request;
            const result = await Offering.listStudentsForOfferingWithHeader(offeringId);
            callback(null, result);
        } catch (err) {
            if (err.code === 'UNAUTH') {
                return callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: err.message,
                });
            }
            if (err.code === 'FORBIDDEN') {
                return callback({
                    code: grpc.status.PERMISSION_DENIED,
                    message: err.message,
                });
            }

            return callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to fetch offerings.',
            });
        }
    },
    async SetGrade(call, callback) {
        try {
            const user = getUserFromMetadata(call.metadata);
            const { enrollmentId, grade } = call.request;
            const message = await Offering.setGradeForEnrollment(enrollmentId, grade);
            callback(null, { message });
        } catch (err) {
            if (err.code === 'UNAUTH') {
                return callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: err.message,
                });
            }
            if (err.code === 'FORBIDDEN') {
                return callback({
                    code: grpc.status.PERMISSION_DENIED,
                    message: err.message,
                });
            }
            if (err.code === 'BAD_REQUEST') {
                return callback({
                    code: grpc.status.INVALID_ARGUMENT,
                    message: err.message,
                });
            }
            if (err.code === 'NOT_FOUND') {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: err.message,
                });
            }

            return callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to set grade.',
            });
        }
    },
})

const PORT = process.env.PORT || 50055;

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            process.exit(1);
        }
        console.log(`UploadGrades node listening on ${port}`);
    }
);