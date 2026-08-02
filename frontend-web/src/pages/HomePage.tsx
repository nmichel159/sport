import { OrganizationsView } from '../views/OrganizationsView'

// Kept as a compatibility entry point for older imports. The routed
// organization screen owns the canonical event-creation form.
export function HomePage() {
  return <OrganizationsView />
}
