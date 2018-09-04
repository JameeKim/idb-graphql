import { Kind, NamedTypeNode, TypeNode } from "graphql";

export function getNamedType(typeNode: TypeNode): NamedTypeNode {
  if (typeNode.kind === Kind.NAMED_TYPE) {
    return typeNode;
  }
  return getNamedType(typeNode.type);
}

export function isListType(typeNode: TypeNode): boolean {
  if (typeNode.kind === Kind.LIST_TYPE) {
    return true;
  } else if (typeNode.kind === Kind.NAMED_TYPE) {
    return false;
  } else {
    return isListType(typeNode.type);
  }
}
