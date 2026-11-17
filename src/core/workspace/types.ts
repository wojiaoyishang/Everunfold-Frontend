import type {
  WorkspaceSummary,
  WorkspaceAnalytics,
} from "@/core/contracts/operations";
import type { IconName } from "@/themes/argon/components/icon";
export interface WorkspaceCardDefinition {
  id: string;
  label: string;
  component: string;
  permission: string;
  icon?: IconName;
  width?: 1 | 2 | 3 | 6;
  defaultVisible?: boolean;
}
export type RegisteredWorkspaceCard = WorkspaceCardDefinition & {
  pluginId: string;
};
export interface WorkspaceCardProps {
  cardId: string;
  days: 7 | 30 | 90;
  data: WorkspaceSummary | null;
  analytics: WorkspaceAnalytics | null;
  refreshing: boolean;
}
