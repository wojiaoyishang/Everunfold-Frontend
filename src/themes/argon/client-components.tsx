import { ShellFrame } from "./components/shell";
import { SiteHeader } from "./components/site-header";
import { SiteHero, SiteFooter } from "./components/shell-parts";
import { Sidebar } from "./components/sidebar";
import { FloatingTools } from "./components/floating-tools";
import { ManagedPageSurface, ManagedPageHeading } from "./pages/view";
import { ManagedPageComments } from "./pages/comments";
import {
  TextControl,
  NumberControl,
  BooleanControl,
  SelectControl,
  ObjectControl,
  ListControl,
} from "./forms/controls";

/**
 * Interactive implementations loaded by the public client registry.
 * Static article surfaces are server-resolved from components.tsx instead.
 */
const components = {
  "public.shell": ShellFrame,
  "public.header": SiteHeader,
  "public.hero": SiteHero,
  "public.sidebar": Sidebar,
  "public.footer": SiteFooter,
  "public.tools": FloatingTools,
  "public.page.surface": ManagedPageSurface,
  "public.page.heading": ManagedPageHeading,
  "public.page.comments": ManagedPageComments,
  "form.text": TextControl,
  "form.textarea": TextControl,
  "form.number": NumberControl,
  "form.boolean": BooleanControl,
  "form.select": SelectControl,
  "form.object": ObjectControl,
  "form.list": ListControl,
};

export default components;
