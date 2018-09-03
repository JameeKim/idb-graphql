import { BREAK, DefinitionNode, DocumentNode, GraphQLSchema, isSchema, Kind, parse, visit } from "graphql";
import { IdbGraphQLError } from "../../errors/IdbGraphQLError";
import { EntityMap } from "../../types/EntityMap";
import { IdbSchema, IdbSchemaInput } from "../../types/IdbSchema";
import { directiveASTs, notEntityDirectiveAST } from "./directives";

export function getIdbSchema(schema: IdbSchemaInput): IdbSchema {
  if (typeof schema === "string") {
    return getIdbSchemaFromString(schema);
  } else if (isSchema(schema)) {
    return getIdbSchemaFromSchemaObject(schema);
  } else if (schema && schema.kind && schema.kind === Kind.DOCUMENT) {
    return getIdbSchemaFromAst(schema);
  } else {
    throw new IdbGraphQLError("[DexieQL] The provided schema should be a schema graphql string,"
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
      // TODO warn that NotEntity will not work when other directives are present
      if (Object.keys(directiveASTs).includes(node.name.value) && node.name.value !== "NotEntity") {
        directives = true;
        return BREAK;
      }
    },
  });
  let definitions: DefinitionNode[];
  if (directives) {
    definitions = schemaAST.definitions.concat(...Object.values(directiveASTs));
  } else {
    definitions = schemaAST.definitions.concat(notEntityDirectiveAST);
  }
  schemaAST = Object.assign({}, schemaAST, { definitions });
  return directives
    ? parseSchemaWithDirectives(schemaAST)
    : parseSchemaWithOutDirectives(schemaAST);
}

function getIdbSchemaFromSchemaObject(schemaObject: GraphQLSchema): IdbSchema {}

function parseSchemaWithDirectives(schema: DocumentNode): IdbSchema {}

function parseSchemaWithOutDirectives(schema: DocumentNode): IdbSchema {}

function IdbSchemaFromEntityInfo(entityMap: EntityMap): IdbSchema {}
