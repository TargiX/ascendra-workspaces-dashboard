# Ascendra Workspaces Dashboard

Take-home assignment for a Product Design Engineer role. The project implements a focused slice of **Ascendra Workspaces**, a dashboard for developer machines with distinct engineer and admin experiences.

## Stack

- React + TypeScript
- Vite
- TanStack Router for route-based product areas
- TanStack Query for server state, loading, error and mutation states
- TanStack Table for the admin VM inventory
- MSW for the mock backend
- Recharts for utilization visualizations
- Tailwind CSS 4 for styling
- Self-hosted Geist Sans and Geist Mono
- React Aria Components for accessible overlays and menus
- Simple Icons React for recognizable service marks
- Local component layer plus Untitled UI Icons

The app supports light and dark mode. Light mode is the default, and the theme toggle persists the user's preference in `localStorage`.

I chose this stack to keep the submission close to how I would build the first product slice in a real frontend codebase:

- TypeScript keeps the VM, template, user and utilization contracts explicit.
- TanStack Query models the dashboard as server state instead of local component state, which makes loading, retry, cache invalidation and lifecycle mutations feel realistic.
- MSW provides a stateful mock backend with real request/response boundaries, latency, errors and mutations without adding backend infrastructure to the take-home.
- TanStack Table fits the admin inventory because that view is search, filter and sort heavy.
- Recharts is enough for readable utilization trends without over-investing in custom chart infrastructure.

## Running locally

```bash
pnpm install
pnpm dev
```

The MSW service worker is initialized automatically through `postinstall`. If your package manager blocks postinstall scripts, run:

```bash
pnpm msw:init
pnpm dev
```

Then open the local Vite URL.

## Build

```bash
pnpm build
pnpm preview
```

## Live demo

[Ascendra Workspaces Dashboard](https://ascendra-workspaces-dashboard-sand.vercel.app)

## Design artifact

[Low-fidelity mockups](https://www.figma.com/make/ePVCIyUdmNmusp6FbslVFp/Create-Low-Fidelity-Mockups?fullscreen=1&t=OtyDUi9OfOc5MXcX-1&code-node-id=0-9)

## Product interpretation

The brief describes one product surface serving two different user groups, but their jobs are very different.

Engineers want to get back into their development environment quickly. For them, the dashboard should answer:

- Is my machine available?
- Can I open it in the browser IDE?
- Is it healthy enough to work in?
- Can I start, stop or restart it safely?

DevOps and DevEx admins need an operational view of the fleet. For them, the dashboard should answer:

- Is the infrastructure healthy?
- Where are we wasting resources?
- Which VMs are hot, idle or in an error state?
- How much is this costing?
- Which VM templates are available for provisioning?

Because of that, I separated the product into two role-based areas rather than reusing the same generic dashboard with different data.

## Information architecture

```txt
Ascendra Workspaces

Workspace
  My Machines
    VM card
      status
      current usage
      Connect to IDE
      Start / Stop / Restart
    Machine Detail
      CPU and memory trend
      template and specs
      runtime metadata

Admin Console
  Fleet Overview
    top-level KPIs
    fleet utilization chart
    attention summary
    top resource consumers

  VM Inventory
    search
    status filter
    health / signal filter
    sortable table

  Templates
    template catalog
    create template
    edit template
```

## Developer vs admin distinction

I modeled Ascendra Workspaces as one product with two role-based areas: **Workspace** and **Admin Console**.

The Workspace area is designed for engineers. It is action-first and only shows the current user's machines. The primary flow is to find a VM, understand its state and open it in the browser IDE.

The Admin Console is designed for DevOps and DevEx admins. It is scan-first and shows aggregate fleet health, utilization, cost and searchable inventory across all VMs.

Both areas share the same Ascendra visual system, but they use different navigation, density, page structure and primary actions:

| Aspect | Workspace | Admin Console |
|---|---|---|
| Main object | My VMs | All VMs and fleet |
| Main question | Can I work now? | Is infra healthy and efficient? |
| UI density | Lower | Higher |
| Primary action | Connect to IDE | Investigate, filter, manage |
| Main components | Cards, details, simple chart | KPIs, charts, tables, filters |
| Data scope | Current user only | Organization-wide |

Authentication is mocked through a top-level Workspace / Admin switcher so reviewers can quickly explore both personas. The selected demo role is persisted in `localStorage` so refreshes and direct links keep the reviewer in the same persona during a walkthrough. In production, the available routes and default landing page would be determined by the authenticated user's role.

## Key product decisions

The main product decision was to split the experience by job-to-be-done rather than by data model.

For engineers, the dashboard is action-first. The main path is: find my machine, understand whether it is usable, open the browser IDE, or change the VM lifecycle state. I kept this area lower density because engineers are usually trying to get back to work, not audit the whole platform.

For admins, the dashboard is scan-first. Fleet Overview is intentionally denser because DevOps and DevEx users need aggregate signals, cost, utilization and exceptions in one place. I prioritized an exception-driven flow: show fleet health and utilization first, then keep VM inventory close so an admin can move from "something needs attention" to the specific idle, hot or error machines without rebuilding context on another page.

The inventory defaults and quick filters support that same flow. "Needs attention" is more useful than a raw list when an admin is trying to decide where to act first, while the full table still supports deeper search, owner/template filtering and sorting.

## Prioritized flows

I prioritized the flows that best represent the product's core value:

1. An engineer can find a VM, understand its state and open it in the browser IDE.
2. An engineer can start, stop or restart a VM and see transition states.
3. An admin can quickly understand fleet health, utilization and cost.
4. An admin can identify idle, hot or error machines from the inventory.
5. An admin can view, create and edit VM templates.

## Scope decisions and trade-offs

The original brief includes a broad product surface: developer workspaces, fleet monitoring, templates, policies, users, quotas and real-time metrics.

For this submission, I focused on the smallest coherent slice that demonstrates the product split between engineers and admins:

- Engineers can view, open and control their own machines.
- Admins can monitor fleet health, cost and utilization across 24-hour, 7-day and 30-day trend ranges.
- Admins can search the VM inventory and identify idle, hot or error machines.
- Admins can view and manage VM templates.

I intentionally left out full authentication, users and teams management, policies, quotas and real WebSocket updates. Those are important, but they are secondary to the core dashboard experience.

I treated the implemented UI as the product artifact and documented the product reasoning here.

## Backend and data layer

The UI talks to a mock backend through a typed API layer. Components do not import mock data directly.

Data fetching and mutations are handled through TanStack Query:

- loading states for initial fetches
- error states with retry actions
- empty states for filtered or empty data
- lifecycle mutations for start, stop and restart actions
- query invalidation after mutations
- period-aware fleet utilization trends for the admin range control
- simulated transition states like `starting` and `stopping`
- a shared admin refresh policy so the Fleet auto-refresh toggle also controls header notification polling

The mock backend is implemented with MSW and exposes endpoints such as:

```txt
GET  /api/developer/machines
GET  /api/developer/machines/:id
GET  /api/developer/machines/:id/metrics
POST /api/machines/:id/start
POST /api/machines/:id/stop
POST /api/machines/:id/restart
GET  /api/admin/fleet?period=24h|7d|30d
GET  /api/admin/vms
GET  /api/admin/templates
POST /api/admin/templates
PATCH /api/admin/templates/:id
```

This keeps the frontend implementation realistic without adding backend infrastructure to the submission.

## Frontend performance notes

Route components are lazy-loaded through TanStack Router so heavier admin-only surfaces, charts and tables are split out of the initial application bundle. Shared server state is deduplicated through TanStack Query rather than separate ad hoc fetch effects.

## Utilization and health logic

The admin experience surfaces exception handling rather than just raw tables.

A running VM is marked as idle when:

```txt
CPU < 10%
Memory < 25%
Last active > 60 minutes ago
```

A VM is marked as hot when:

```txt
CPU >= 85%
OR memory >= 85%
OR disk >= 90%
```

The Fleet Overview uses this logic to calculate idle machines, hot machines, error states and possible daily savings. The range control requests different mock utilization series for `24h`, `7d` and `30d` rather than only changing the label.

## Accessibility and responsiveness

The interface uses semantic headings, buttons, tables, forms and labels where appropriate. Interactive controls have visible focus states, disabled states and accessible names. Repeated row actions keep short visible labels like `View`, `Stop` and `Edit`, while their accessible names include the VM or template context for screen readers.

Keyboard interaction was treated as part of the core dashboard experience:

- Drawers and the mobile navigation menu use modal semantics, move focus inside when opened, trap `Tab` within the active surface, close with `Escape`, and return focus to the triggering control.
- Segmented controls use pressed-button semantics instead of pretending to be full tab panels.
- Search fields, filters, lifecycle actions, template forms and table sorting are reachable from the keyboard.

The layout is responsive: the developer view uses cards and actions, while admin tables remain horizontally scrollable on smaller screens to preserve data density.

## What I would do with more time

- Add Policies & Quotas management for max VMs per user, idle timeout and allowed templates.
- Add Users & Teams views with per-user utilization and cost.
- Add WebSocket-based live updates for VM status and utilization metrics.
- Add deeper per-VM diagnostics: process-level usage, activity log, recent restarts and connection history.
- Add real role-based authentication instead of the mocked mode switcher.
- Expand automated tests around API transformations, filtering logic and lifecycle transitions.
- Add a proper design handoff file once the core information hierarchy is validated.
