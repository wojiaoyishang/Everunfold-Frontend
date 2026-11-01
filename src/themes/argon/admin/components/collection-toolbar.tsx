import { Icon } from "../../components/icon";
import { Button, TextField } from "../../components/ui/primitives";
/** No editable business values until the backend has published its management contract. */
export function CollectionToolbar({
  filters,
  searchLabel,
}: {
  filters: readonly string[];
  searchLabel: string;
}) {
  return (
    <div className="admin-collection-toolbar" aria-label="列表工具栏（准备中）">
      <div className="admin-segmented" role="group" aria-label="内容分类">
        {filters.map((label, i) => (
          <Button key={label} disabled aria-pressed={i === 0}>
            {label}
          </Button>
        ))}
      </div>
      <div className="admin-search">
        <Icon name="search" />
        <TextField
          type="search"
          aria-label={searchLabel}
          placeholder={searchLabel}
          disabled
        />
      </div>
    </div>
  );
}
