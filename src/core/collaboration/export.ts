import type { DraftBlock, DraftFields } from "@/core/contracts/content-admin";
export function serializeDraftExport(
  fields: DraftFields,
  removedBlocks: DraftBlock[] = [],
  unappliedHtml: Record<string, string> = {},
) {
  const { access_password: _password, ...safe } = fields;
  void _password;
  return JSON.stringify(
    {
      format: "everunfold-draft-export-1",
      ...safe,
      removed_blocks: removedBlocks,
      unapplied_html: unappliedHtml,
    },
    null,
    2,
  );
}
