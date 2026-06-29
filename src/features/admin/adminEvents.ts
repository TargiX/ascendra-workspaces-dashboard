export const OPEN_ADMIN_VM_EVENT = "ascendra:open-admin-vm";

export type OpenAdminVmEvent = CustomEvent<{ vmId: string }>;

export function dispatchOpenAdminVm(vmId: string) {
  window.dispatchEvent(new CustomEvent(OPEN_ADMIN_VM_EVENT, { detail: { vmId } }));
}
