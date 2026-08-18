import { fetchRemoteCase } from './convexServer';
import { getCase, saveCase } from './store';
import { CaseFile } from './types';

/**
 * Read through: local first, Convex when the local copy is cold. Hydrating into
 * the local store means the synchronous patchCase calls later in the same
 * request merge onto real state rather than an empty case.
 */
export async function loadCase(id: string): Promise<CaseFile> {
  const local = getCase(id);
  const warm =
    Boolean(local.contract) ||
    local.moveInPhotos.length > 0 ||
    local.moveOutPhotos.length > 0 ||
    Boolean(local.comparison);
  if (warm) return local;

  const remote = await fetchRemoteCase(id);
  if (!remote) return local;
  return saveCase({ ...remote, id });
}
