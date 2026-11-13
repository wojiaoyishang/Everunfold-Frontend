import { randomUUID } from "@/core/browser/crypto";
import type {
  BuilderComponentDefinition,
  BuilderDocument,
  BuilderNode,
  BuilderValues,
} from "./types";

export const emptyBuilderDocument: BuilderDocument = { version: 1, nodes: [] };

export function builderId() {
  return randomUUID();
}

export function createBuilderNode(
  definition: BuilderComponentDefinition,
): BuilderNode {
  return {
    id: builderId(),
    type: definition.type,
    props: Object.fromEntries(
      (definition.fields ?? []).flatMap((field) =>
        field.default === undefined ? [] : [[field.key, field.default]],
      ),
    ),
    ...(definition.container ? { children: [] } : {}),
  };
}

export function findBuilderNode(
  nodes: readonly BuilderNode[],
  id: string,
): BuilderNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = node.children && findBuilderNode(node.children, id);
    if (nested) return nested;
  }
}

export function updateBuilderNode(
  nodes: readonly BuilderNode[],
  id: string,
  update: (node: BuilderNode) => BuilderNode,
): BuilderNode[] {
  return nodes.map((node) => {
    if (node.id === id) return update(node);
    return node.children?.length
      ? { ...node, children: updateBuilderNode(node.children, id, update) }
      : node;
  });
}

export function removeBuilderNode(
  nodes: readonly BuilderNode[],
  id: string,
): BuilderNode[] {
  return nodes.flatMap((node) =>
    node.id === id
      ? []
      : [
          node.children?.length
            ? { ...node, children: removeBuilderNode(node.children, id) }
            : node,
        ],
  );
}

export type BuilderPosition = {
  parentId: string | null;
  beforeId: string | null;
};

export function insertBuilderNode(
  nodes: readonly BuilderNode[],
  position: BuilderPosition,
  node: BuilderNode,
): BuilderNode[] {
  const insert = (siblings: readonly BuilderNode[]) => {
    const at = position.beforeId
      ? siblings.findIndex((item) => item.id === position.beforeId)
      : -1;
    return at === -1
      ? [...siblings, node]
      : [...siblings.slice(0, at), node, ...siblings.slice(at)];
  };
  return position.parentId
    ? updateBuilderNode(nodes, position.parentId, (parent) => ({
        ...parent,
        children: insert(parent.children ?? []),
      }))
    : insert(nodes);
}

export function moveBuilderNode(
  nodes: readonly BuilderNode[],
  id: string,
  position: BuilderPosition,
): BuilderNode[] | undefined {
  const node = findBuilderNode(nodes, id);
  if (
    !node ||
    position.beforeId === id ||
    position.parentId === id ||
    (position.parentId &&
      findBuilderNode(node.children ?? [], position.parentId))
  )
    return;
  if (position.parentId && !findBuilderNode(nodes, position.parentId)) return;
  return insertBuilderNode(removeBuilderNode(nodes, id), position, node);
}

export function cloneBuilderNode(node: BuilderNode): BuilderNode {
  return {
    ...node,
    id: builderId(),
    ...(node.children ? { children: node.children.map(cloneBuilderNode) } : {}),
    ...(node.parameters
      ? {
          parameters: Object.fromEntries(
            Object.entries(node.parameters).map(([key, parameter]) => [
              key,
              { ...parameter, id: builderId() },
            ]),
          ),
        }
      : {}),
  };
}

export function builderEntries(nodes: readonly BuilderNode[]): BuilderNode[] {
  return nodes.flatMap((node) => [
    node,
    ...builderEntries(node.children ?? []),
  ]);
}

export function resolvedBuilderProps(
  node: BuilderNode,
  values?: BuilderValues,
): BuilderValues {
  if (!values || !node.parameters) return node.props;
  const props = { ...node.props };
  for (const [key, parameter] of Object.entries(node.parameters)) {
    const incoming = values[parameter.id];
    const previous = props[key];
    const compatible =
      previous == null ||
      (typeof incoming === typeof previous &&
        Array.isArray(incoming) === Array.isArray(previous) &&
        (incoming === null) === (previous === null));
    if (Object.hasOwn(values, parameter.id) && compatible)
      props[key] = incoming;
    else if (parameter.keep_default === false) delete props[key];
  }
  return props;
}
