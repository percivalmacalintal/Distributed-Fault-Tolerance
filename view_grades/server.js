require('dotenv').config();

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const jwt = require('jsonwebtoken');

const PROTO_PATH = path.join(__dirname, 'student_grades.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const studentGradesProto = protoDescriptor.student_grades;

const server = new grpc.Server();
const Enrollment = require('./enrollment');

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

server.addService(studentGradesProto.StudentGradesService.service, {
    async ListMyEnrollments(call, callback) {
        try {
            const user = await getUserFromMetadata(call.metadata);
            const enrollments = await Enrollment.getEnrollmentsWithGrade(user.id);

            const formatted = enrollments.map(e => ({
                id: e.id,
                courseCode: e.courseCode,
                units: e.units,
                section: e.section,
                schoolYear: e.schoolYear,
                term: String(e.term),
                grade: parseFloat(e.grade) || 0.0,
            }));

            callback(null, { enrollments: formatted });

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
                message: 'Failed to fetch enrollments.',
            });
        }
    }
})

const PORT = process.env.PORT || 50054;

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            process.exit(1);
        }
        console.log(`ViewGrades node listening on ${port}`);
    }
);