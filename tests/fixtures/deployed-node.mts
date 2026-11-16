import { createServer } from "node:http";
import { readConfigurationFiles } from "../../src/core/config/files";
import { configuredSettingsHandler } from "../../src/server/settings/runtime";
import { frontendHandler } from "../../src/server/http";
import { watchInventory } from "../../tools/plugins/inventory.mts";

const root = process.argv[2];
const { settings } = readConfigurationFiles(root);
const handler = configuredSettingsHandler(root);
const server = createServer(
  frontendHandler((_request, response) => {
    response.writeHead(404);
    response.end();
  }, handler),
);
server.listen(settings.listener.port, settings.listener.host);
const stop = watchInventory(root);
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    stop();
    server.close();
    server.closeAllConnections();
  });
}
