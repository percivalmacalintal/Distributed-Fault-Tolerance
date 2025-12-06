require('dotenv').config();

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const jwt = require('jsonwebtoken');

const PROTO_PATH = path.join(__dirname, 'view_offering.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const viewOfferingProto = protoDescriptor.view_offering;

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

server.addService(viewOfferingProto.ViewOfferingsService.service, {
    async ListOfferings(call, callback) {
        try {
            const user = getUserFromMetadata(call.metadata);
            const offerings = await Offering.listWithEnrollmentCount();

            callback(null, { offerings });
        } catch (err) {
            if (err.code === 'UNAUTH') {
                return callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: err.message,
                });
            }

            return callback({
                code: grpc.status.INTERNAL,
                message: 'Failed to fetch course offerings.',
            });
        }
    }
})

const PORT = process.env.PORT || 50052;

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            process.exit(1);
        }
        console.log(`ViewOfferings node listening on ${port}`);
    }
);