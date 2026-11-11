"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VEHICLE_TYPES = exports.TRIP_STATUSES = exports.PROPOSAL_STATUSES = exports.CARGO_STATUSES = exports.USER_ROLES = exports.COLOMBIA_CATALOG = void 0;
const colombia_json_1 = __importDefault(require("./colombia.json"));
exports.COLOMBIA_CATALOG = colombia_json_1.default;
exports.USER_ROLES = ['CLIENT', 'TRANSPORTER', 'ADMIN'];
exports.CARGO_STATUSES = ['DRAFT', 'OPEN', 'ASSIGNED', 'CANCELLED', 'COMPLETED'];
exports.PROPOSAL_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
exports.TRIP_STATUSES = [
    'PENDING_PICKUP',
    'AT_PICKUP',
    'IN_TRANSIT',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
];
exports.VEHICLE_TYPES = [
    'PICKUP',
    'VAN',
    'SMALL_TRUCK',
    'MEDIUM_TRUCK',
    'HEAVY_TRUCK',
    'TRACTOR_TRUCK',
    'OTHER',
];
//# sourceMappingURL=index.js.map