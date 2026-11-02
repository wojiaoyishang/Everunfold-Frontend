import type {
  DraftBlock,
  DraftFields,
} from "@/generated/content-admin-contract";
export function serializeDraftExport(
  fields: DraftFields,
  removedBlocks: DraftBlock[] = [],
) {
  const { access_password: _password, ...safe } = fields;
  void _password;
  return JSON.stringify(
    {
      format: "everunfold-draft-export-1",
      ...safe,
      removed_blocks: removedBlocks,
    },
    null,
    2,
  );
}
