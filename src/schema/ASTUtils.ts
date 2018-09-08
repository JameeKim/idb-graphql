import {
  DirectiveNode,
  GraphQLDirective,
  Kind,
  NamedTypeNode,
  TypeNode,
  valueFromAST,
} from "graphql";
import { IdbGraphQLError } from "../errors";
import { DirectiveValueArgInfo, DirectiveValueInfo } from "../types";

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

export function getDirectiveValueInfo(usage: DirectiveNode, definition: GraphQLDirective): DirectiveValueInfo {
  if (usage.name.value !== definition.name) {
    throw new IdbGraphQLError(`[IdbGraphQL] Provided wrong directive definition ${definition.name} `
      + `for ${usage.name.value}`);
  }

  const name = definition.name;
  const args: { [argName: string]: DirectiveValueArgInfo } = {};

  if (usage.arguments) {
    for (const argument of usage.arguments) {
      const defArg = definition.args.find((ar) => ar.name === argument.name.value);
      if (!defArg) {
        throw new IdbGraphQLError(`[IdbGraphQL] Argument of name ${argument.name.value} is not defined `
          + `for directive ${definition.name}`);
      }
      const value = valueFromAST(argument.value, defArg.type);
      args[defArg.name] = {
        type: defArg.type,
        value: value === null || value === undefined
          ? defArg.defaultValue === undefined ? null : defArg.defaultValue
          : value,
      };
    }
  }

  for (const defArg of definition.args.filter((ar) => !Object.keys(args).includes(ar.name))) {
    args[defArg.name] = {
      type: defArg.type,
      value: defArg.defaultValue === undefined ? null : defArg.defaultValue,
    };
  }

  return { name, args };
}
