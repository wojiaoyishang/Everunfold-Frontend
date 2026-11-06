import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/** Created only inside a disposable production build; central registries are untouched. */
export async function installExtensionFixture(workspace) {
  const files = {
    "src/plugins/verification/plugin.ts":
      'export default {id:"verification.plugin",version:"1.0.0",setup({components}:{components:{register:(name:string)=>void}}){components.register("verification.plugin-control");}};',
    "src/plugins/verification/components.tsx":
      'export default {"verification.plugin-control":function Control(){return <div data-extension-plugin="true">Discovered plugin component</div>;}};',
    "src/themes/verification/theme.ts":
      'export default {id:"verification",version:"1.0.0",components:["verification.theme-control"]};',
    "src/themes/verification/components.tsx":
      'export default {"verification.theme-control":function Control(){return <div data-extension-theme="true">Discovered theme component</div>;}};',
    "src/app/health/extension-verification/page.tsx":
      'import {ExtensionComponent,ThemeComponentsProvider} from "@/core/extensions/components"; export default function Page(){return <ThemeComponentsProvider theme="verification"><ExtensionComponent name="verification.plugin-control"/><ExtensionComponent name="verification.theme-control"/><ExtensionComponent name="verification.unregistered"/></ThemeComponentsProvider>;}',
  };
  for (const [name, value] of Object.entries(files)) {
    const target = path.join(workspace, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, value + "\n");
  }
}

export async function verifyExtensionFixture(base) {
  const response = await fetch(base + "/health/extension-verification");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /data-extension-plugin="true"/);
  assert.match(html, /Discovered plugin component/);
  assert.match(html, /data-extension-theme="true"/);
  assert.match(html, /Discovered theme component/);
  assert.match(html, /verification\.unregistered/);
  assert.match(html, /组件暂不可用/);
  console.log(
    "Native production discovery passed: added plugin and theme render without central edits; unknown components show a placeholder.",
  );
}
