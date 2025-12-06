const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'view_offering.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const viewOfferingProto = protoDescriptor.view_offering;

const target = process.env.VIEWOFFERING_ADDR || '127.0.0.1:50052';

const client = new viewOfferingProto.ViewOfferingsService(target, grpc.credentials.createInsecure());

module.exports = client;