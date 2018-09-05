import Dexie from "dexie";
import DexieObservable from "dexie-observable";
import { IdbSchemaCreator } from "./schema";
import { IdbGraphQLConfig, IdbGraphQLConfigInternal, IdbGraphQLInterface } from "./types/IdbGraphQL";
import { IdbSchemaCreatorInterface, IdbSchemaInput } from "./types/IdbSchema";
import { Maybe } from "./types/utils";

export const IdbGraphQLDefaultConfig: IdbGraphQLConfigInternal = {
  upgradeMap: {},
  versionStart: 1,
  schemaCreator: IdbSchemaCreator,
  suppressDuplicateDirectivesWarning: false,
};

export class IdbGraphQL implements IdbGraphQLInterface {
  public readonly db: Dexie;
  protected config: IdbGraphQLConfigInternal;
  protected schemaInput: Array<Maybe<IdbSchemaInput>>;
  protected schemaCreator: IdbSchemaCreatorInterface;

  constructor(config: IdbGraphQLConfig) {
    const { schema, idbBridge, ...otherConfig } = Object.assign({}, IdbGraphQLDefaultConfig, config);
    this.schemaInput = Array.isArray(schema) ? schema : [schema];
    this.config = otherConfig;
    if (idbBridge) {
      this.db = idbBridge;
    } else {
      this.db = new Dexie("IdbGraphQL", {
        addons: [DexieObservable],
      });
    }
    this.schemaCreator = new this.config.schemaCreator(this.db, this.schemaInput, this.config);
  }

  public query() {
    return;
  }

  public mutation() {
    return;
  }

  protected init(): void {
    this.schemaCreator.setSchema();
  }
}
