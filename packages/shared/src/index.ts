import colombia from './colombia.json';

export const COLOMBIA_CATALOG: Record<
  string,
  { name: string; code: string; lat: number; lng: number }[]
> = colombia;

export const USER_ROLES = ['CLIENT', 'TRANSPORTER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CARGO_STATUSES = ['DRAFT', 'OPEN', 'ASSIGNED', 'CANCELLED', 'COMPLETED'] as const;
export type CargoStatus = (typeof CARGO_STATUSES)[number];

export const PROPOSAL_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const TRIP_STATUSES = [
  'PENDING_PICKUP',
  'AT_PICKUP',
  'IN_TRANSIT',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const VEHICLE_TYPES = [
  'PICKUP',
  'VAN',
  'SMALL_TRUCK',
  'MEDIUM_TRUCK',
  'HEAVY_TRUCK',
  'TRACTOR_TRUCK',
  'OTHER',
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];
