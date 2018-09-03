import {
  BREAK,
  DefinitionNode,
  DocumentNode,
  GraphQLSchema,
  isSchema,
  Kind,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  parse,
  TypeNode,
  visit,
} from "graphql";
import { IdbGraphQLError } from "../../errors/IdbGraphQLError";
import { EntityMap, FieldInfo } from "../../types/EntityMap";
import { IdbSchema, IdbSchemaInput } from "../../types/IdbSchema";
import { directiveASTs } from "./directives";

export function getIdbSchema(schema: IdbSchemaInput): IdbSchema {
  if (typeof schema === "string") {
    return getIdbSchemaFromString(schema);
  } else if (isSchema(schema)) {
    return getIdbSchemaFromSchemaObject(schema);
  } else if (schema && schema.kind && schema.kind === Kind.DOCUMENT) {
    return getIdbSchemaFromAst(schema);
  } else {
    throw new IdbGraphQLError("[IdbGraphQL] The provided schema should be a schema graphql string,"
      + " an AST of the string, or a GraphQLSchema object");
  }
}

function getIdbSchemaFromString(schemaStr: string): IdbSchema {
  return getIdbSchemaFromAst(parse(schemaStr, { noLocation: true }));
}

function getIdbSchemaFromAst(schemaAST: DocumentNode): IdbSchema {
  let directives: boolean = false;
  visit(schemaAST, {
    [Kind.DIRECTIVE]: (node) => {
      if (Object.keys(directiveASTs).includes(node.name.value)) {
        directives = true;
        return BREAK;
      }
    },
  });
  if (!directives) {
    return parseSchemaWithOutDirectives(schemaAST);
  }

  // TODO remove duplicate directive definitions
  const definitions: DefinitionNode[] = schemaAST.definitions.concat(...Object.values(directiveASTs));
  schemaAST = Object.assign({}, schemaAST, { definitions });
  return parseSchemaWithDirectives(schemaAST);
}

function getIdbSchemaFromSchemaObject(schemaObject: GraphQLSchema): IdbSchema {
  const entityMap: EntityMap = new Map();

  return IdbSchemaFromEntityInfo(entityMap);
}

function parseSchemaWithDirectives(schema: DocumentNode): IdbSchema {
  const entityMap: EntityMap = new Map();

  return IdbSchemaFromEntityInfo(entityMap);
}

function parseSchemaWithOutDirectives(schema: DocumentNode): IdbSchema {
  const entityList: Map<string, ObjectTypeDefinitionNode> = new Map();
  const entityMap: EntityMap = new Map();

  for (const entity of schema.definitions) {
    if (
      entity.kind === Kind.OBJECT_TYPE_DEFINITION
      && entity.fields
      && entity.fields.some((f) => {
        return f.name.value === "id"
          && f.type.kind === Kind.NON_NULL_TYPE
          && f.type.type.kind === Kind.NAMED_TYPE
          && ["ID", "String", "Int"].includes(f.type.type.name.value);
      })
    ) {
      entityList.set(entity.name.value, entity);
    }
  }

  for (const [name, entityNode] of entityList) {
    const fields: FieldInfo[] = [];
    for (const field of entityNode.fields!) {
      if (field.name.value === "id") {
        fields.push({
          name: "id",
          index: "primary",
        });
      } else if (entityList.has(getNamedType(field.type).name.value)) {
        fields.push({
          name: field.name.value + "Id",
          index: isListType(field.type) ? ["multi"] : [],
        });
      }
    }
    entityMap.set(name, { name, fields });
  }

  return IdbSchemaFromEntityInfo(entityMap);
}

function IdbSchemaFromEntityInfo(entityMap: EntityMap): IdbSchema {
  const schema: IdbSchema = {};

  for (const [entityName, entityInfo] of entityMap) {
    const indexNames: string[] = [];

    for (const field of entityInfo.fields) {
      if (!field.index) {
        continue;
      } else if (field.index === "primary") {
        indexNames.unshift(field.name);
        continue;
      }

      let schemaIndex: string = field.name;
      for (const index of field.index) {
        switch (index) {
          case "unique":
            schemaIndex = "&" + schemaIndex;
            break;
          case "multi":
            schemaIndex = "*" + schemaIndex;
            break;
          case "plain":
            break;
          default:
            throw new IdbGraphQLError(`[IdbGraphQL] Unsupported index type ${index}`);
        }
      }
      indexNames.push(schemaIndex);
    }

    schema[entityName] = indexNames.join(",");
  }

  return schema;
}

function getNamedType(typeNode: TypeNode): NamedTypeNode {
  if (typeNode.kind === Kind.NAMED_TYPE) {
    return typeNode;
  }
  return getNamedType(typeNode.type);
}

function isListType(typeNode: TypeNode): boolean {
  if (typeNode.kind === Kind.LIST_TYPE) {
    return true;
  } else if (typeNode.kind === Kind.NAMED_TYPE) {
    return false;
  } else {
    return isListType(typeNode.type);
  }
}
