import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Created only inside a disposable production build; central registries are untouched. */
export async function installExtensionFixture(workspace) {
  const files = {
    "src/plugins/verification/plugin.ts":
      'export default {id:"verification.plugin",version:"1.0.0",setup({components}:{components:{register:(name:string)=>void}}){components.register("verification.plugin-control");}};',
    "src/plugins/verification/components.tsx":
      'const components={"verification.plugin-control":function Control(){return <div data-extension-plugin="true">Discovered plugin component</div>;}}; export default components;',
    "src/themes/verification/theme.ts":
      'export default {id:"verification",version:"1.0.0",parent:"paper",components:["verification.theme-control","public.hero","verification.layout","verification.page","verification.note","paper.footer-note"],templates:{home:"verification.layout","page:core.people":"verification.page",article:"verification.missing-template"},slots:{"shell.footer.after":["verification.note"]},styles:true};',
    "src/themes/verification/styles.ts":
      'const css=".public-theme[data-theme-chain~=verification] { --verification-style: 1; }";export default css;',
    "src/themes/verification/components.tsx": `
import type {ThemeTemplateProps} from "@/core/extensions/types";
import type {Site} from "@/core/content/types";
import {ParentThemeComponent} from "@/core/extensions/components";
const components={
  "verification.theme-control":function Control(){return <div data-extension-theme="true">Discovered theme component</div>;},
  "public.hero":function Hero({site}:{site:Site}){return <div data-grandchild-hero="true"><ParentThemeComponent name="public.hero" site={site}/></div>;},
  "verification.layout":function Layout({children}:ThemeTemplateProps){return <section data-child-template="true">{children}</section>;},
  "verification.page":function Layout({children}:ThemeTemplateProps){return <section data-child-page="true">{children}</section>;},
  "verification.note":function Note(){return <p data-child-hook="true">Child hook</p>;},
  "paper.footer-note":function Note(){return <p data-overridden-inherited-hook="true">Overridden inherited hook</p>;}
};export default components;`,
    "src/app/health/extension-verification/page.tsx": `
import {ExtensionComponent} from "@/core/extensions/components";
import {PublicTheme,ThemeTemplate,ThemeSlot} from "@/core/themes/presentation";
import {readPublicSnapshot} from "@/core/content/snapshot";
export default async function Page(){const {site}=await readPublicSnapshot();const page={id:"fixture-instance",source:"registered" as const,implementation_id:"core.people",title:"Fixture",path:"/fixture",description:"",enabled:true as const,revision:1};return <PublicTheme theme="verification">
<ExtensionComponent name="verification.plugin-control"/><ExtensionComponent name="verification.theme-control"/><ExtensionComponent name="verification.unregistered"/>
<ExtensionComponent name="public.hero" site={site}/>
<ThemeTemplate name="home" context={{site}}><p data-parent-view="true">Parent view</p></ThemeTemplate>
<ThemeTemplate name="page" context={{page}}><p data-parent-page="true">Parent page</p></ThemeTemplate>
<ThemeTemplate name="article" context={{site}}><p data-retained-parent="true">Retained parent when template is missing</p></ThemeTemplate>
<ThemeSlot name="shell.footer.after" context={{site}}/>
</PublicTheme>;}`,
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
  for (const marker of [
    "data-extension-plugin",
    "data-extension-theme",
    "data-grandchild-hero",
    "data-child-template",
    "data-parent-view",
    "data-child-page",
    "data-parent-page",
    "data-retained-parent",
    "data-child-hook",
    "data-overridden-inherited-hook",
  ])
    assert.match(html, new RegExp(`${marker}="true"`));
  assert.match(html, /data-paper-hero="true"/);
  assert.match(html, /data-paper-page="true"/);
  assert.match(html, /data-theme-chain="verification paper argon"/);
  assert.match(html, /verification\.unregistered/);
  assert.match(html, /verification\.missing-template/);
  assert.match(html, /组件暂不可用/);
  assert.ok(
    html.indexOf('data-theme-style="paper"') <
      html.indexOf('data-theme-style="verification"'),
  );
  console.log(
    "Production child-theme discovery passed: three-level parent composition, ID templates, hooks, ordered styles and missing-template parent preservation.",
  );
}

/** Change only a disposable runtime config, after building. */
export async function verifyThemeSwitch(base, configFile) {
  const before = await readFile(configFile, "utf8");
  try {
    await writeFile(configFile, before + '\n[theme]\nactive = "paper"\n');
    const selected = await fetch(base + "/");
    assert.equal(selected.status, 200);
    const html = await selected.text();
    assert.match(html, /data-public-theme="paper"/);
    assert.match(html, /data-paper-hero="true"/);
    assert.match(html, /data-theme-style="paper"/);
    assert.doesNotMatch(
      html,
      /data-grandchild-hero="true"|data-theme-style="verification"/,
    );
    const admin = await (await fetch(base + "/admin/settings")).text();
    assert.doesNotMatch(admin, /data-public-theme=|data-theme-style=/);
  } finally {
    await writeFile(configFile, before);
  }
  const original = await (await fetch(base + "/")).text();
  assert.match(original, /data-public-theme="argon"/);
  assert.doesNotMatch(original, /data-theme-style="paper"|data-paper-hero/);
  console.log(
    "Post-build theme switching passed without restarting; private settings remain in the default context.",
  );
}
