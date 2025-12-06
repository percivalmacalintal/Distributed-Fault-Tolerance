require('dotenv').config();

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const PROTO_PATH = path.join(__dirname, 'register.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const registerProto = protoDescriptor.register;

const User = require('./user');

async function register(email, password) {
    const temp_user = await User.findByEmail(email);

    if (temp_user) {
        const err = new Error('Email is already used');
        err.code = 'UNAUTH';
        throw err;
    }

    const [username, domain] = email.split('@');

    if (domain != 'dlsu.edu.ph') {
        const err = new Error('Invalid domain');
        err.code = 'UNAUTH';
        throw err;
    }
    
    let temp = ""

    if (username.includes('_') && !username.includes('.')){
        temp = 'student'
    }
    else if (username.includes('.') && !username.includes('_')){
        temp = 'faculty'
    }
    else{
        const err = new Error('Invalid username');
        err.code = 'UNAUTH';
        throw err;
    }

    const role = temp

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.createUser(email, hashedPassword, role);

    if (!user) {
        const err = new Error('Failed to register user');
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

server.addService(registerProto.RegisterService.service, {
    async Register(call, callback) {
        const { email, password } = call.request;
        try {
            const token = await register(email, password);
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
                message: 'Register server error.',
            });
        }
        
    }
})

const PORT = process.env.PORT || 50056;

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            process.exit(1);
        }
        console.log(`Register node listening on ${port}`);
    }
);