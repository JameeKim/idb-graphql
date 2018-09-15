import Dexie from "dexie";
import DexieObservable from "dexie-observable";
import { IdbSchemaCreator } from "./schema";
import {
  IdbGraphQLConfig,
  IdbGraphQLConfigInternal,
  IdbGraphQLInterface,
  IdbSchemaCreatorInterface,
  IdbSchemaInput,
  Maybe,
} from "./types";
import { IdbGraphQLSchemaConfig } from "./types/IdbGraphQL";

export const IdbGraphQLDefaultConfig: IdbGraphQLConfigInternal = {
  schemaConfig: {
    upgradeMap: {},
    versionStart: 1,
    schemaCreator: IdbSchemaCreator,
    suppressDuplicateDirectivesWarning: false,
    entityIdTypes: ["ID", "Int", "String"],
  },
};

export class IdbGraphQL implements IdbGraphQLInterface {
  public readonly db: Dexie;
  protected config: IdbGraphQLConfigInternal;
  protected schemaInput: Array<Maybe<IdbSchemaInput>>;
  protected schemaCreator: IdbSchemaCreatorInterface;

  constructor(config: IdbGraphQLConfig) {
    const schemaConfig: Required<IdbGraphQLSchemaConfig>
      = Object.assign({}, IdbGraphQLDefaultConfig.schemaConfig, config.schemaConfig);
    const { schema, idbBridge, ...otherConfig }
      = Object.assign({}, IdbGraphQLDefaultConfig, config, { schemaConfig });
    this.schemaInput = Array.isArray(schema) ? schema : [schema];
    this.config = otherConfig;
    if (idbBridge) {
      this.db = idbBridge;
    } else {
      this.db = new Dexie("IdbGraphQL", {
        addons: [DexieObservable],
      });
    }
    this.schemaCreator
      = new this.config.schemaConfig.schemaCreator(this.db, this.schemaInput, this.config.schemaConfig);
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
