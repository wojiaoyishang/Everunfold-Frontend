import { watchInventory } from "../../tools/plugins/inventory.mts";

const stop = watchInventory(process.argv[2]);
for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, stop);
