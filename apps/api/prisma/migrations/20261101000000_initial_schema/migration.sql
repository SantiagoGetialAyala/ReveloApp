-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'TRANSPORTER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "VerificationDocumentType" AS ENUM ('ID_CARD', 'CRIMINAL_RECORD');

-- CreateEnum
CREATE TYPE "VehicleVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VehicleChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('PICKUP', 'VAN', 'SMALL_TRUCK', 'MEDIUM_TRUCK', 'HEAVY_TRUCK', 'TRACTOR_TRUCK', 'OTHER');

-- CreateEnum
CREATE TYPE "BodyType" AS ENUM ('STAKE', 'BOX', 'REFRIGERATED', 'TANK', 'PLATFORM', 'DUMP', 'OTHER');

-- CreateEnum
CREATE TYPE "CargoStatus" AS ENUM ('DRAFT', 'OPEN', 'ASSIGNED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PENDING_PICKUP', 'AT_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'WAITING_INFO', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDocument" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "VerificationDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "city" TEXT,
    "department" TEXT,
    "photoData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "businessName" TEXT NOT NULL,
    "taxId" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransporterProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "baseCity" TEXT,
    "baseDepartment" TEXT,
    "availability" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransporterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "bodyType" "BodyType" NOT NULL,
    "maxWeightKg" DECIMAL(12,2) NOT NULL,
    "volumeM3" DECIMAL(10,2),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationUpdatedAt" TIMESTAMP(3),
    "operatingCity" TEXT NOT NULL,
    "description" TEXT,
    "photos" TEXT[],
    "ownershipDocumentData" TEXT,
    "ownershipDocumentName" TEXT,
    "verificationStatus" "VehicleVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleChangeRequest" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "reviewerId" UUID,
    "status" "VehicleChangeStatus" NOT NULL DEFAULT 'PENDING',
    "changes" JSONB NOT NULL,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "VehicleChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cargo" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" DECIMAL(12,2),
    "quantityUnit" TEXT,
    "weightKg" DECIMAL(12,2) NOT NULL,
    "volumeM3" DECIMAL(10,2),
    "dimensions" TEXT,
    "units" INTEGER NOT NULL,
    "specialInstructions" TEXT,
    "originDepartment" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupLat" DECIMAL(10,7) NOT NULL,
    "pickupLng" DECIMAL(10,7) NOT NULL,
    "destinationDepartment" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryLat" DECIMAL(10,7) NOT NULL,
    "deliveryLng" DECIMAL(10,7) NOT NULL,
    "pickupWindowStart" TIMESTAMP(3) NOT NULL,
    "deliveryDeadline" TIMESTAMP(3) NOT NULL,
    "requiredVehicleType" "VehicleType" NOT NULL,
    "requiredBodyType" "BodyType",
    "requiredCapacityKg" DECIMAL(12,2) NOT NULL,
    "estimatedBudgetCop" DECIMAL(14,2) NOT NULL,
    "negotiable" BOOLEAN NOT NULL DEFAULT true,
    "observations" TEXT,
    "status" "CargoStatus" NOT NULL DEFAULT 'OPEN',
    "routeDistanceKm" DECIMAL(10,2),
    "routeDurationMinutes" INTEGER,
    "routeProvider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoImage" (
    "id" UUID NOT NULL,
    "cargoId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CargoImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" UUID NOT NULL,
    "cargoId" UUID NOT NULL,
    "transporterId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "proposedPriceCop" DECIMAL(14,2) NOT NULL,
    "availablePickupDate" TIMESTAMP(3) NOT NULL,
    "estimatedTransportHours" INTEGER NOT NULL,
    "message" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalMessage" (
    "id" UUID NOT NULL,
    "proposalId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalPriceOffer" (
    "id" UUID NOT NULL,
    "proposalId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "priceCop" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalPriceOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" UUID NOT NULL,
    "cargoId" UUID NOT NULL,
    "proposalId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "transporterId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "agreedPriceCop" DECIMAL(14,2) NOT NULL,
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "estimatedDeliveryDate" TIMESTAMP(3) NOT NULL,
    "originLabel" TEXT NOT NULL,
    "destinationLabel" TEXT NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'PENDING_PICKUP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripMessage" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripIncident" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentHistory" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "status" "IncidentStatus" NOT NULL,
    "note" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripReview" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripStatusHistory" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "status" "TripStatus" NOT NULL,
    "changedById" UUID NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "VerificationDocument_userId_idx" ON "VerificationDocument"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationDocument_userId_type_key" ON "VerificationDocument"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_userId_key" ON "CompanyProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TransporterProfile_userId_key" ON "TransporterProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Vehicle_ownerId_idx" ON "Vehicle"("ownerId");

-- CreateIndex
CREATE INDEX "Vehicle_vehicleType_bodyType_idx" ON "Vehicle"("vehicleType", "bodyType");

-- CreateIndex
CREATE INDEX "Vehicle_isAvailable_isActive_idx" ON "Vehicle"("isAvailable", "isActive");

-- CreateIndex
CREATE INDEX "VehicleChangeRequest_status_createdAt_idx" ON "VehicleChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "VehicleChangeRequest_vehicleId_status_idx" ON "VehicleChangeRequest"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "Cargo_clientId_idx" ON "Cargo"("clientId");

-- CreateIndex
CREATE INDEX "Cargo_status_idx" ON "Cargo"("status");

-- CreateIndex
CREATE INDEX "Cargo_originDepartment_originCity_idx" ON "Cargo"("originDepartment", "originCity");

-- CreateIndex
CREATE INDEX "Cargo_destinationDepartment_destinationCity_idx" ON "Cargo"("destinationDepartment", "destinationCity");

-- CreateIndex
CREATE INDEX "Cargo_pickupWindowStart_idx" ON "Cargo"("pickupWindowStart");

-- CreateIndex
CREATE INDEX "Cargo_requiredVehicleType_idx" ON "Cargo"("requiredVehicleType");

-- CreateIndex
CREATE INDEX "Cargo_estimatedBudgetCop_idx" ON "Cargo"("estimatedBudgetCop");

-- CreateIndex
CREATE INDEX "CargoImage_cargoId_idx" ON "CargoImage"("cargoId");

-- CreateIndex
CREATE INDEX "Proposal_cargoId_idx" ON "Proposal"("cargoId");

-- CreateIndex
CREATE INDEX "Proposal_transporterId_idx" ON "Proposal"("transporterId");

-- CreateIndex
CREATE INDEX "Proposal_vehicleId_idx" ON "Proposal"("vehicleId");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_cargoId_transporterId_key" ON "Proposal"("cargoId", "transporterId");

-- CreateIndex
CREATE INDEX "ProposalMessage_proposalId_createdAt_idx" ON "ProposalMessage"("proposalId", "createdAt");

-- CreateIndex
CREATE INDEX "ProposalPriceOffer_proposalId_createdAt_idx" ON "ProposalPriceOffer"("proposalId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_cargoId_key" ON "Trip"("cargoId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_proposalId_key" ON "Trip"("proposalId");

-- CreateIndex
CREATE INDEX "Trip_clientId_idx" ON "Trip"("clientId");

-- CreateIndex
CREATE INDEX "Trip_transporterId_idx" ON "Trip"("transporterId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE INDEX "TripMessage_tripId_createdAt_idx" ON "TripMessage"("tripId", "createdAt");

-- CreateIndex
CREATE INDEX "TripMessage_senderId_readAt_idx" ON "TripMessage"("senderId", "readAt");

-- CreateIndex
CREATE INDEX "TripIncident_tripId_createdAt_idx" ON "TripIncident"("tripId", "createdAt");

-- CreateIndex
CREATE INDEX "TripIncident_status_createdAt_idx" ON "TripIncident"("status", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentHistory_incidentId_createdAt_idx" ON "IncidentHistory"("incidentId", "createdAt");

-- CreateIndex
CREATE INDEX "TripReview_recipientId_createdAt_idx" ON "TripReview"("recipientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TripReview_tripId_authorId_key" ON "TripReview"("tripId", "authorId");

-- CreateIndex
CREATE INDEX "TripStatusHistory_tripId_idx" ON "TripStatusHistory"("tripId");

-- CreateIndex
CREATE INDEX "TripStatusHistory_changedById_idx" ON "TripStatusHistory"("changedById");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransporterProfile" ADD CONSTRAINT "TransporterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleChangeRequest" ADD CONSTRAINT "VehicleChangeRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleChangeRequest" ADD CONSTRAINT "VehicleChangeRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleChangeRequest" ADD CONSTRAINT "VehicleChangeRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cargo" ADD CONSTRAINT "Cargo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoImage" ADD CONSTRAINT "CargoImage_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalMessage" ADD CONSTRAINT "ProposalMessage_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalMessage" ADD CONSTRAINT "ProposalMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalPriceOffer" ADD CONSTRAINT "ProposalPriceOffer_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalPriceOffer" ADD CONSTRAINT "ProposalPriceOffer_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripMessage" ADD CONSTRAINT "TripMessage_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripMessage" ADD CONSTRAINT "TripMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripIncident" ADD CONSTRAINT "TripIncident_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripIncident" ADD CONSTRAINT "TripIncident_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentHistory" ADD CONSTRAINT "IncidentHistory_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "TripIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentHistory" ADD CONSTRAINT "IncidentHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripReview" ADD CONSTRAINT "TripReview_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripReview" ADD CONSTRAINT "TripReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripReview" ADD CONSTRAINT "TripReview_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStatusHistory" ADD CONSTRAINT "TripStatusHistory_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStatusHistory" ADD CONSTRAINT "TripStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

