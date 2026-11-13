import { ThemeSettingsHost } from "@/core/settings/theme-settings-host";
import {
  readPublicSnapshot,
  SnapshotUnavailable,
} from "@/core/content/snapshot";

export default async function Page() {
  const taxonomies = await readPublicSnapshot()
    .then((snapshot) =>
      snapshot.taxonomies.map(({ id, kind, name, slug }) => ({
        id,
        kind,
        name,
        slug,
      })),
    )
    .catch((error: unknown) => {
      if (!(error instanceof SnapshotUnavailable)) throw error;
      return undefined;
    });
  return <ThemeSettingsHost taxonomies={taxonomies} />;
}
