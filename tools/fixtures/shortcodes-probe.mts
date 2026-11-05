/** Read-only consumer in a fresh Node process; used by the isolated multi-process P0. */
import { FileSettingsStore } from "../../src/server/settings/store";
import { renderContent } from "../../src/core/rendering/content";
import { enhanceContentHtml } from "../../src/core/rendering/features/content-features";
if (process.env.NODE_ENV !== "test") throw new Error("Test fixture only");
const [directory, node, epoch, name] = process.argv.slice(2);
const applied = await new FileSettingsStore(directory, node, epoch).read(
  "public-settings",
);
if (!applied || !("shortcodes" in applied.value))
  throw new Error("Missing shortcode snapshot");
const rendered = renderContent(
  {
    id: "p0-native",
    content: [
      {
        id: "body",
        type: "markdown",
        content: `{{< ${name} title="From applied snapshot" >}}\n\n**P0 body** and $a^2$.\n\n{{< /${name} >}}`,
      },
    ],
    media_urls: {},
  },
  applied.value.shortcodes,
);
process.stdout.write(
  JSON.stringify({
    revision: applied.revision,
    html: await enhanceContentHtml(rendered.html),
    diagnostics: rendered.diagnostics,
  }),
);
