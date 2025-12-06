require('dotenv').config();

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const jwt = require('jsonwebtoken');

const PROTO_PATH = path.join(__dirname, 'auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const authProto = protoDescriptor.auth;

const User = require('./user');

const bcrypt = require("bcrypt");

async function login(email, password) {
    const user = await User.findByEmail(email);

    if (!user) {
        const err = new Error('Invalid email or password');
        err.code = 'UNAUTH';
        throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        const err = new Error('Invalid email or password');
        err.code = 'UNAUTH';
        throw err;
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d'}
    )

    return token;
}

const server = new grpc.Server();

server.addService(authProto.AuthService.service, {
    async Login(call, callback) {
        const { email, password } = call.request;
        try {
            const token = await login(email, password);
            callback(null, { token });
        } catch (err) {
            if (err.code === 'UNAUTH') {
                return callback({
                    code: grpc.status.UNAUTHENTICATED,
                    message: err.message,
                });
            }

            return callback({
                code: grpc.status.INTERNAL,
                message: 'Login server error.',
            });
        }
        
    }
})

const PORT = process.env.PORT || 50051;

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            process.exit(1);
        }
        console.log(`Auth node listening on ${port}`);
    }
);