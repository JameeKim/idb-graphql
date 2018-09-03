import Dexie from "dexie";
import DexieObservable from "dexie-observable";
import { setIdbSchema } from "./db/schema/setIdbSchema";
import { IdbGraphQLConfig } from "./types/IdbGraphQL";
import { IdbSchemaInput } from "./types/IdbSchema";
import { Omit } from "./types/utils";

export const IdbGraphQLDefaultConfig: Required<Omit<IdbGraphQLConfig, "schema">> = {
  upgradeMap: {},
  versionStart: 1,
};

export class IdbGraphQL {
  public readonly db: Dexie;
  protected config: Required<Omit<IdbGraphQLConfig, "schema">>;
  protected schemaInput: IdbSchemaInput[];

  constructor(config: IdbGraphQLConfig) {
    const { schema, ...otherConfig } = Object.assign({}, IdbGraphQLDefaultConfig, config);
    this.schemaInput = Array.isArray(schema) ? schema : [schema];
    this.config = otherConfig;
    this.db = new Dexie("IdbGraphQL", {
      addons: [DexieObservable],
    });
  }

  protected init(): void {
    const { versionStart, upgradeMap } = this.config;
    setIdbSchema(this.db, this.schemaInput, { versionStart, upgradeMap });
  }
}
