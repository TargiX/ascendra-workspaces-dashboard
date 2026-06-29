import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Navigate,
} from "@tanstack/react-router";
import { AppShell } from "../components/layout/AppShell";
import { NotFoundPage } from "../features/shared/NotFoundPage";

type AdminTemplatesSearch = {
  create?: "template";
};

function validateAdminTemplatesSearch(search: Record<string, unknown>): AdminTemplatesSearch {
  return search.create === "template" ? { create: "template" } : {};
}

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFoundPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "login",
  component: lazyRouteComponent(() => import("../features/shared/LoginPage"), "LoginPage"),
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  component: () => <Navigate to="/workspace/machines" replace />,
});

const workspaceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "workspace",
  component: Outlet,
});

const workspaceMachinesRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "machines",
  component: lazyRouteComponent(() => import("../features/workspace/WorkspaceMachinesPage"), "WorkspaceMachinesPage"),
});

const workspaceMachineDetailRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "machines/$machineId",
  component: lazyRouteComponent(() => import("../features/workspace/MachineDetailPage"), "MachineDetailPage"),
});

const adminRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "admin",
  component: Outlet,
});

const adminFleetRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "fleet",
  component: lazyRouteComponent(() => import("../features/admin/AdminFleetPage"), "AdminFleetPage"),
});

const adminInventoryRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "vms",
  component: lazyRouteComponent(() => import("../features/admin/AdminInventoryPage"), "AdminInventoryPage"),
});

const adminTemplatesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "templates",
  validateSearch: validateAdminTemplatesSearch,
  component: lazyRouteComponent(() => import("../features/admin/AdminTemplatesPage"), "AdminTemplatesPage"),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedRoute.addChildren([
    indexRoute,
    workspaceRoute.addChildren([workspaceMachinesRoute, workspaceMachineDetailRoute]),
    adminRoute.addChildren([adminFleetRoute, adminInventoryRoute, adminTemplatesRoute]),
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
