import type { SyncCatalog, SyncDirection } from '../types/makerspace-sync'

/** Derive types and scope from the published declaration, never editable inputs. */
export function selectSyncContract(catalog: SyncCatalog, resourceName: string, direction: SyncDirection, selected: string[]) {
  const resource = Object.hasOwn(catalog.resources, resourceName) ? catalog.resources[resourceName] : undefined
  if (!resource || !resource.directions.includes(direction) || !selected.length || selected.length > 24
    || new Set(selected).size !== selected.length || selected.some(name => !Object.hasOwn(resource.fields, name))) {
    throw new Error('sync_invalid_contract')
  }
  return {
    deployment_id: catalog.deployment_id, contract_digest: catalog.contract_digest,
    resource: resourceName, direction, record_scope: resource.record_scope,
    fields: Object.fromEntries(selected.map(name => [name, resource.fields[name]])),
  }
}
