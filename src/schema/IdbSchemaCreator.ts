import Dexie from "dexie";
import {
  BREAK,
  DefinitionNode,
  DocumentNode,
  GraphQLSchema,
  isSchema,
  Kind,
  ObjectTypeDefinitionNode,
  parse,
  visit,
} from "graphql";
import { IdbGraphQLError } from "../errors/IdbGraphQLError";
import { EntityMap, FieldInfo } from "../types/EntityMap";
import { IdbGraphQLConfigInternal } from "../types/IdbGraphQL";
import { IdbSchema, IdbSchemaInput, UpgradeMapFunction } from "../types/IdbSchema";
import { AbstractIdbSchemaCreator } from "./AbstractIdbSchemaCreator";
import { getNamedType, isListType } from "./ASTUtils";
import { directiveASTs } from "./directives";

export class IdbSchemaCreator extends AbstractIdbSchemaCreator {
  constructor(db: Dexie, schema: IdbSchemaInput[], config: IdbGraphQLConfigInternal) {
    super(db, schema, config);
    // TODO create upgrade map here?
  }

  /**
   * Execute the idb schema setup process
   * @return {void}
   */
  public setSchema(): void {
    let i: number = this.config.versionStart;
    for (const schema of this.schemaArr) {
      const version: Dexie.Version = this.db.version(++i / 10).stores(this.getIdbSchema(schema));
      if (this.config.upgradeMap[i]) {
        this.processUpgrade(version, this.config.upgradeMap[i]);
      }
    }
  }

  /**
   * Get single idb schema from single graphql schema input
   * @param schema {IdbSchemaInput}
   * @return {IdbSchema}
   */
  public getIdbSchema(schema: IdbSchemaInput): IdbSchema {
    if (typeof schema === "string") {
      return this.getIdbSchemaFromString(schema);
    } else if (isSchema(schema)) {
      return this.getIdbSchemaFromSchemaObject(schema);
    } else if (schema && schema.kind && schema.kind === Kind.DOCUMENT) {
      return this.getIdbSchemaFromAst(schema);
    } else {
      throw new IdbGraphQLError("[IdbGraphQL] The provided schema should be a schema graphql string,"
        + " an AST of the string, or a GraphQLSchema object");
    }
  }

  /**
   * Get idb schema from graphql schema string
   * @param schemaStr {string}
   * @return {IdbSchema}
   */
  public getIdbSchemaFromString(schemaStr: string): IdbSchema {
    return this.getIdbSchemaFromAst(parse(schemaStr, { noLocation: true }));
  }

  /**
   * Get idb schema from graphql schema ast
   * @param schemaAST {DocumentNode}
   * @return {IdbSchema}
   */
  public getIdbSchemaFromAst(schemaAST: DocumentNode): IdbSchema {
    let directives: boolean = false;

    // check if the ast contains any of the IdbGraphQL-defined directives
    visit(schemaAST, {
      [Kind.DIRECTIVE]: (node) => {
        if (Object.keys(directiveASTs).includes(node.name.value)) {
          directives = true;
          return BREAK;
        }
      },
    });

    // in case the directives are not found
    if (!directives) {
      return this.parseSchemaWithOutDirectives(schemaAST);
    }

    // in case any of the directive definitions are found
    if (schemaAST.definitions.some(
      (d) => d.kind === Kind.FRAGMENT_DEFINITION && Object.keys(directiveASTs).includes(d.name.value),
    )) {
      if (process.env.NODE_ENV !== "production" && !this.config.suppressDuplicateDirectivesWarning) {
        console.warn("[IdbGraphQL] If using IdbGraphQL-defined directives, "
          + "it is not recommended to define any directives with same name "
          + "unless they are the same ones to those defined in this library.");
      }
    }
    // TODO remove duplicate directive definitions
    const definitions: DefinitionNode[] = schemaAST.definitions.concat(...Object.values(directiveASTs));
    schemaAST = Object.assign({}, schemaAST, { definitions });
    return this.parseSchemaWithDirectives(schemaAST);
  }

  /**
   * Get idb schema from graphql schema object
   * @param schemaObject {GraphQLSchema}
   * @return {IdbSchema}
   */
  public getIdbSchemaFromSchemaObject(schemaObject: GraphQLSchema): IdbSchema {
    const entityMap: EntityMap = new Map();

    return this.IdbSchemaFromEntityInfo(entityMap);
  }

  /**
   * Get idb schema from grphaql ast containing IdbGraphQL-defined directives
   * @param schema {DocumentNode}
   * @return {IdbSchema}
   */
  public parseSchemaWithDirectives(schema: DocumentNode): IdbSchema {
    const entityMap: EntityMap = new Map();

    return this.IdbSchemaFromEntityInfo(entityMap);
  }

  /**
   * Get idb schema from graphql ast without any IdbGraphQL-defined directives
   * @param schema {DocumentNode}
   * @return {IdbSchema}
   */
  public parseSchemaWithOutDirectives(schema: DocumentNode): IdbSchema {
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

    return this.IdbSchemaFromEntityInfo(entityMap);
  }

  /**
   * Get final idb schema from the list of entities and their info
   * @param entityMap {EntityMap}
   * @return {IdbSchema}
   */
  public IdbSchemaFromEntityInfo(entityMap: EntityMap): IdbSchema {
    const schema: IdbSchema = {};

    for (const [entityName, entityInfo] of entityMap) {
      const indexNames: string[] = [];

      for (const field of entityInfo.fields) {
        if (!field.index) {
          continue;
        } else if (field.index === "primary") {
          indexNames.unshift(field.name);
          continue;
        } else if (field.index === "auto") {
          indexNames.unshift("++" + field.name);
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

  /**
   * Apply upgrade function
   * @param version {Dexie.Version}
   * @param upgrade {UpgradeMapFunction}
   * @return {void}
   */
  protected processUpgrade(version: Dexie.Version, upgrade: UpgradeMapFunction): void {
    version.upgrade(upgrade);
  }
}
