import path from "node:path";
import {
  projectRoot,
  readBrowserBackendBaseUrl,
  readPageConfiguration,
} from "@/core/config/server";
import { NodeStatusPage } from "@/themes/argon/admin/settings/node-status";

function displayDirectory(
  root: string,
  directory: string,
  sourceEpoch?: string,
) {
  const relative = path.relative(root, directory);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    return null;
  if (!relative) return "./";
  const segments = relative
    .split(path.sep)
    .map((segment) => (segment === sourceEpoch ? "<source_epoch>" : segment));
  return `./${segments.join("/")}/`;
}

export default async function Page() {
  const config = readPageConfiguration();
  const root = projectRoot();
  const { frontendNodeId, settings, cache } = config;
  const sourceEpoch = settings.sourceEpoch;
  return (
    <NodeStatusPage
      runtime={{
        nodeId: frontendNodeId,
        publicSiteUrl: config.publicSiteUrl ?? null,
        backendBaseUrl: await readBrowserBackendBaseUrl(),
        sourceBound: Boolean(sourceEpoch),
        settingsReplicaDirectory: sourceEpoch
          ? displayDirectory(
              root,
              path.join(settings.directory, frontendNodeId, sourceEpoch),
              sourceEpoch,
            )
          : null,
        publicSnapshotDirectory: displayDirectory(
          root,
          cache.directory,
          sourceEpoch,
        ),
      }}
    />
  );
}
