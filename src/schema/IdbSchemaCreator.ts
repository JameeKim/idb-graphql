import Dexie from "dexie";
import {
  BREAK,
  buildASTSchema,
  DefinitionNode,
  DirectiveDefinitionNode,
  DocumentNode,
  getNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  isListType,
  isNamedType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isSchema,
  Kind,
  parse,
  visit,
} from "graphql";
import { IdbGraphQLError } from "../errors";
import {
  EntityMap,
  FieldInfo,
  IdbGraphQLConfigInternal,
  IdbSchema,
  IdbSchemaInput,
  Maybe,
  UpgradeMapFunction,
} from "../types";
import { IdbGraphQLSchemaConfig } from "../types/IdbGraphQL";
import { AbstractIdbSchemaCreator } from "./AbstractIdbSchemaCreator";
import { getDirectiveValueInfo } from "./ASTUtils";
import { directiveASTs, directiveTypes } from "./directives";

export class IdbSchemaCreator extends AbstractIdbSchemaCreator {
  constructor(db: Dexie, schema: Array<Maybe<IdbSchemaInput>>, config: Required<IdbGraphQLSchemaConfig>) {
    super(db, schema, config);
    // TODO create upgrade map here?
  }

  public setConfig(config: IdbGraphQLSchemaConfig): void {
    Object.assign(this.config, config);
  }

  /**
   * Execute the idb schema setup process
   */
  public setSchema(): void {
    let i: number = this.config.versionStart;
    for (const schema of this.getIdbSchemaArr(this.schemaInputArr)) {
      if (!schema) {
        continue;
      }
      const version: Dexie.Version = this.db.version(i / 10).stores(schema);
      if (this.config.upgradeMap[i]) {
        this.processUpgrade(version, this.config.upgradeMap[i]);
      }
      i++;
    }
  }

  /**
   */
  public getIdbSchemaArr(schemaArr: Array<Maybe<IdbSchemaInput>>): Array<Maybe<IdbSchema>> {
    return schemaArr.map((schemaInput) => schemaInput ? this.getIdbSchema(schemaInput) : null);
  }

  /**
   * Get single idb schema from single graphql schema input
   */
  public getIdbSchema(schema: IdbSchemaInput): IdbSchema {
    let entityMap: EntityMap;
    if (typeof schema === "string") {
      entityMap = this.getEntityMapFromString(schema);
    } else if (isSchema(schema)) {
      entityMap = this.getEntityMapFromSchemaObject(schema);
    } else if (schema && schema.kind === Kind.DOCUMENT) {
      entityMap = this.getEntityMapFromAst(schema);
    } else {
      throw new IdbGraphQLError("[IdbGraphQL] The provided schema should be a schema graphql string,"
        + " an AST of the string, or a GraphQLSchema object");
    }
    return this.getIdbSchemaFromEntityInfo(entityMap);
  }

  /**
   * Get idb schema from graphql schema string
   */
  protected getEntityMapFromString(schemaStr: string): EntityMap {
    return this.getEntityMapFromAst(parse(schemaStr, { noLocation: true }));
  }

  /**
   * Get idb schema from graphql schema ast
   */
  protected getEntityMapFromAst(schemaAST: DocumentNode): EntityMap {
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

    let entityMap: EntityMap;

    // in case the directives are not found
    if (!directives) {
      entityMap = this.getEntityMapFromSchemaObjectWithoutDirectives(buildASTSchema(schemaAST));
    } else {
      // in case any of the directive definitions are found
      if (schemaAST.definitions.some(
        (d) => d.kind === Kind.DIRECTIVE_DEFINITION && Object.keys(directiveASTs).includes(d.name.value),
      )) {
        /* istanbul ignore next */
        if (process.env.NODE_ENV !== "production" && !this.config.suppressDuplicateDirectivesWarning) {
          console.warn("[IdbGraphQL] If using IdbGraphQL-defined directives, "
            + "it is not recommended to define any directives with same name "
            + "unless they are the same ones to those defined in this library.");
        }
      }

      const definitions: DefinitionNode[] = schemaAST.definitions.slice(0);
      const directiveDefinitions: DirectiveDefinitionNode[] = definitions
        .filter((def): def is DirectiveDefinitionNode => def.kind === Kind.DIRECTIVE_DEFINITION);
      for (const directive of Object.values(directiveASTs)) {
        if (!directiveDefinitions.some((def) => def.name.value === directive.name.value)) {
          definitions.push(directive);
        }
      }
      schemaAST = Object.assign({}, schemaAST, { definitions });
      entityMap = this.getEntityMapFromSchemaObjectWithDirectives(buildASTSchema(schemaAST));
    }

    return entityMap;
  }

  /**
   * Get idb schema from graphql schema object
   */
  protected getEntityMapFromSchemaObject(schemaObject: GraphQLSchema): EntityMap {
    const directivesUsed: boolean = schemaObject
      .getDirectives()
      .some((directive) => Object.keys(directiveASTs).includes(directive.name));
    return directivesUsed
      ? this.getEntityMapFromSchemaObjectWithDirectives(schemaObject)
      : this.getEntityMapFromSchemaObjectWithoutDirectives(schemaObject);
  }

  protected getEntityMapFromSchemaObjectWithDirectives(schema: GraphQLSchema): EntityMap {
    const entityList: Map<string, GraphQLObjectType> = new Map();
    const entityMap: EntityMap = new Map();

    // get a list of entities
    for (const objectType of Object.values(schema.getTypeMap())) {
      // check if this type is an object type
      if (!isObjectType(objectType)) {
        continue;
      }

      // only pick user-defined objects
      if (objectType.name.startsWith("_")) {
        continue;
      }

      // ensure if the object type has ast
      if (!objectType.astNode) {
        throw new IdbGraphQLError(`[IdbGraphQL] AstNodes should be provided to process applied directives, `
          + `but could not find astNode for object type ${objectType.name}`);
      }

      // skip if no directives are used for this object type
      /* istanbul ignore if */
      if (!objectType.astNode.directives) {
        continue;
      }

      // check if @IdbEntity is used for this object type
      if (objectType.astNode.directives.some((dir) => dir.name.value === "IdbEntity")) {
        // add this object type to the entityList
        entityList.set(objectType.name, objectType);
      }
    }

    // for all entities in entityList
    for (const [name, entity] of entityList) {
      const fields: FieldInfo[] = [];
      const fieldsArr = Object.values(entity.getFields());

      // check if all fields have ast
      if (!fieldsArr.every((field) => !!field.astNode)) {
        throw new IdbGraphQLError(`[IdbGraphQL] AstNodes should be provided to process applied directives, `
          + `but could not find astNode for some fields in entity ${name}`);
      }

      // check if @IdbPrimary is used at least and only once
      const primary = fieldsArr.filter(
        (field) => !!field.astNode!.directives
          && field.astNode!.directives!.some((directive) => directive.name.value === "IdbPrimary"),
      );
      if (primary.length === 0) {
        // @IdbPrimary not used
        throw new IdbGraphQLError(`[IdbGraphQL] A field for primary key should be specified `
          + `with @IdbPrimary directive, but it is not found for entity ${name}`);
      } else if (primary.length > 1) {
        // @IdbPrimary used more than once
        throw new IdbGraphQLError(`[IdbGraphQL] Composite index for primary key is not supported, `
          + `but multiple primary keys detected for entity ${name}`);
      }

      // for all fields of the entity
      for (const field of fieldsArr) {
        // check if this field has any directives
        /* istanbul ignore if */
        if (!field.astNode!.directives) {
          continue;
        }

        // check how many Idb directives are used for this field, and ensure there is only one if any
        const directiveTypeNames = Object.keys(directiveTypes);
        const directives = field.astNode!.directives!.filter(
          (directive) => directiveTypeNames.includes(directive.name.value) && directive.name.value !== "IdbEntity",
        );
        if (directives.length === 0) {
          // just skip the field if none is used
          continue;
        } else if (directives.length > 1) {
          // throw if multiple type are used for one field
          throw new IdbGraphQLError(`[IdbGraphQL] Only one type of index-indicating directives can be used on `
            + `one field, but multiple of them used for field ${field.name} in entity ${name}`);
        }

        // get argument values
        const directiveInfo = getDirectiveValueInfo(
          directives[0],
          directiveTypes[directives[0].name.value as Exclude<keyof typeof directiveTypes, "IdbEntity">],
        );

        // decide what index to use
        let fieldName: string = field.name;
        let fieldIndex: FieldInfo["index"] = null;
        switch (directiveInfo.name) {
          case "IdbPrimary":
            fieldIndex = !!directiveInfo.args.auto.value && directiveInfo.args.auto.value !== "none"
              ? directiveInfo.args.auto.value
              : "primary";
            break;
          case "IdbUnique":
          case "IdbIndex":
            fieldIndex = [directiveInfo.name === "IdbUnique" ? "unique" : "plain"];
            if (directiveInfo.args.multi.value) {
              fieldIndex.push("multi");
            }
            // TODO composite group
            break;
          case "IdbRelation":
            // check if the return type is an entity
            const refEntity = getNamedType(field.type);
            if (!entityList.has(refEntity.name)) {
              throw new IdbGraphQLError(`[IdbGraphQL] @IdbRelation should be used on a field `
                + `that returns an entity or an array of an entity, but field ${field.name} of entity ${name} `
                + `does not satisfy the constraint`);
            }
            // set the index
            fieldIndex = [checkIfRelationIsMany(field.type) ? "multi" : "plain"];
            if (directiveInfo.args.unique.value) {
              fieldIndex.push("unique");
            }
            fieldName += "Id";
            break;
            /* istanbul ignore next */
          default:
            break;
        }

        // add the index info
        fields.push({ name: fieldName, index: fieldIndex });
      }

      // add the entity info
      entityMap.set(name, { name, fields });
    }
    return entityMap;
  }

  protected getEntityMapFromSchemaObjectWithoutDirectives(schema: GraphQLSchema): EntityMap {
    const entityList: Map<string, GraphQLObjectType> = new Map();
    const entityMap: EntityMap = new Map();
    const operationTypes: string[] = ["Query", "Mutation", "Subscription"];

    const query = schema.getQueryType();
    if (query) {
      operationTypes[0] = query.name;
    }
    const mutation = schema.getMutationType();
    if (mutation) {
      operationTypes[1] = mutation.name;
    }
    const subscription = schema.getSubscriptionType();
    if (subscription) {
      operationTypes[2] = subscription.name;
    }

    for (const objectType of Object.values(schema.getTypeMap())) {
      if (
        !isObjectType(objectType)
        || operationTypes.includes(objectType.name)
        || !Object.keys(objectType.getFields()).includes("id")
      ) {
        continue;
      }
      const idType = objectType.getFields().id.type;
      if (
        !isNonNullType(idType)
        || !isScalarType(idType.ofType)
        || !this.config.entityIdTypes.includes(idType.ofType.name)
      ) {
        continue;
      }
      entityList.set(objectType.name, objectType);
    }

    for (const [name, entity] of entityList) {
      const fields: FieldInfo[] = [];
      for (const field of Object.values(entity.getFields())) {
        if (field.name === "id") {
          fields.push({
            name: "id",
            index: "primary",
          });
        } else if (entityList.has(getNamedType(field.type).name)) {
          fields.push({
            name: field.name + "Id",
            index: checkIfRelationIsMany(field.type) ? ["multi"] : ["plain"],
          });
        }
      }
      entityMap.set(name, { name, fields });
    }

    return entityMap;
  }

  /**
   * Get final idb schema from the list of entities and their info
   */
  protected getIdbSchemaFromEntityInfo(entityMap: EntityMap): IdbSchema {
    const schema: IdbSchema = {};

    for (const [entityName, entityInfo] of entityMap) {
      let primaryIndex: string = "";
      const indexNames: string[] = [];

      for (const field of entityInfo.fields) {
        if (!field.index) {
          continue;
        } else if (typeof field.index === "string") {
          if (primaryIndex) {
            throw new IdbGraphQLError(`[IdbGraphQL] Entity should have only one primary key, `
              + `but found duplicate primary keys ${primaryIndex} and ${field.name} for entity ${entityName}`);
          }
          switch (field.index) {
            case "primary":
              primaryIndex = field.name;
              break;
            case "auto":
              primaryIndex = "++" + field.name;
              break;
            case "uuid":
              primaryIndex = "$$" + field.name;
              break;
            default:
              throw new IdbGraphQLError(`[IdbGraphQL] Unsupported primary key type ${field.index} `
                + `for entity ${entityName}`);
          }
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
              throw new IdbGraphQLError(`[IdbGraphQL] Unsupported index type ${index} for entity ${entityName}`);
          }
        }
        indexNames.push(schemaIndex);
      }

      if (!primaryIndex) {
        throw new IdbGraphQLError(`[IdbGraphQL] Entity ${entityName} does not have a primary key`);
      }
      indexNames.unshift(primaryIndex);
      schema[entityName] = indexNames.join(",");
    }

    return schema;
  }

  /**
   * Apply upgrade function
   */
  protected processUpgrade(version: Dexie.Version, upgrade: UpgradeMapFunction): void {
    version.upgrade(upgrade);
  }
}

function checkIfRelationIsMany(type: GraphQLOutputType): boolean {
  if (isNamedType(type)) {
    return false;
  }
  if (isListType(type)) {
    return true;
  }
  return checkIfRelationIsMany((type as GraphQLNonNull<any>).ofType);
}
