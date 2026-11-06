export const galleryScope = "ef-sc-8f403f7d3b044d30b848c818c4ae91d3";
const root = "." + galleryScope;

/** Emitted with the shortcode, never imported into the site's global reader stylesheet. */
export const galleryStyles = `
${root} .ef-gallery { display:grid; gap:12px; grid-template-columns:repeat(3,minmax(0,1fr)); }
${root} .ef-gallery-2 { grid-template-columns:repeat(2,minmax(0,1fr)); }
${root} .ef-gallery-4 { grid-template-columns:repeat(4,minmax(0,1fr)); }
${root} figure { margin:0; min-width:0; }
${root} img { width:100%; height:auto; }
${root} .ef-gallery-sample { min-height:120px; padding:16px; background:var(--admin-subtle,var(--surface)); border-radius:8px; }
${root} .ef-gallery-sample span { border-radius:6px; background:linear-gradient(145deg,var(--admin-border,var(--line)),var(--admin-surface,var(--surface))); }
@media (max-width:600px) { ${root} .ef-gallery { grid-template-columns:repeat(2,minmax(0,1fr)); } }
`;
