// Server-only public API barrel for @entities/vehicle.
// Import from here in API routes and server-side utilities.

export {
  softDeleteVehiclesForJoinRequest,
  reparentVehiclesToProfile,
  reparentVehiclesToSeat,
  reparentVehiclesForAcceptedInvitation,
  listStagedVehicles,
} from './services';
