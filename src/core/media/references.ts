export function mediaReferenceId(reference: string) {
  return reference.replace(/^media:/, "").replace(/^site:\/\/media\//, "");
}

export function siteMediaReference(reference: string) {
  const id = mediaReferenceId(reference);
  return id ? `site://media/${id}` : "";
}

export function parseSiteMediaReference(reference: string) {
  const match =
    /^site:\/\/media\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i.exec(
      reference.trim(),
    );
  return match?.[1].toLowerCase() ?? null;
}
