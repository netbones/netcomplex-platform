import { router } from '@api/server';
import { maintenanceRequestProcedures } from './maintenance/maintenance-requests';
import { maintenanceCategoryProcedures } from './maintenance/maintenance-categories';
import { maintenanceProviderProcedures } from './maintenance/maintenance-providers';
import { maintenanceTeamProcedures } from './maintenance/maintenance-teams';

export const maintenanceRouter = router({
  ...maintenanceRequestProcedures,
  ...maintenanceCategoryProcedures,
  ...maintenanceProviderProcedures,
  ...maintenanceTeamProcedures,
});
