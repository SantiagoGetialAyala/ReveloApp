export declare const COLOMBIA_CATALOG: Record<string, {
    name: string;
    code: string;
    lat: number;
    lng: number;
}[]>;
export declare const USER_ROLES: readonly ["CLIENT", "TRANSPORTER", "ADMIN"];
export type UserRole = (typeof USER_ROLES)[number];
export declare const CARGO_STATUSES: readonly ["DRAFT", "OPEN", "ASSIGNED", "CANCELLED", "COMPLETED"];
export type CargoStatus = (typeof CARGO_STATUSES)[number];
export declare const PROPOSAL_STATUSES: readonly ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"];
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export declare const TRIP_STATUSES: readonly ["PENDING_PICKUP", "AT_PICKUP", "IN_TRANSIT", "DELIVERED", "COMPLETED", "CANCELLED"];
export type TripStatus = (typeof TRIP_STATUSES)[number];
export declare const VEHICLE_TYPES: readonly ["PICKUP", "VAN", "SMALL_TRUCK", "MEDIUM_TRUCK", "HEAVY_TRUCK", "TRACTOR_TRUCK", "OTHER"];
export type VehicleType = (typeof VEHICLE_TYPES)[number];
