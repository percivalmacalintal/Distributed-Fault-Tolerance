require('dotenv').config();

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const jwt = require('jsonwebtoken');

const PROTO_PATH = path.join(__dirname, 'enrollment.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const enrollmentProto = protoDescriptor.enrollment;

const server = new grpc.Server();
const Offering = require('./offering');
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

async function enrollStudent(studentId, offeringId) {
    const offering = await Offering.getEnrollmentCountForOffering(offeringId)
    if (offering.enrolledCount >= offering.capacity) {
        const err = new Error('Offering is already full');
        err.code = 'FULL';
        throw err;
    }
    await Enrollment.create(studentId, offeringId);
    return 'Enrollment successful';
}

server.addService(enrollmentProto.EnrollmentService.service, {
    async ListOpenOfferings(call, callback) {
        try {
          const user = await getUserFromMetadata(call.metadata);
          const offerings = await Offering.listOpenOfferings(user.id);
          callback(null, { offerings });
        } catch (err) {
            console.error("Error in ListOpenOfferings:", err);
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
                message: 'Failed to fetch open offerings.',
            });
        }
    },
    async Enroll(call, callback) {
        try {
            const user = await getUserFromMetadata(call.metadata);
            const { offeringId } = call.request;
            if (!offeringId) {
                const err = new Error('Missing offering');
                err.code = 'BAD_REQUEST';
                throw err;
            }
            const message = await enrollStudent(user.id, offeringId);
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
            if (err.code === 'FULL' || err.code === 'ALREADY_ENROLLED') {
                return callback({
                    code: grpc.status.FAILED_PRECONDITION,
                    message: err.message,
                });
            }

            return callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to enroll.',
            });
        }
  },
});


const PORT = process.env.PORT || 50053;

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            process.exit(1);
        }
        console.log(`Enrollment node listening on ${port}`);
    }
);