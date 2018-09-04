import Dexie from "dexie";
import { AbstractIdbSchemaCreator } from "../schema";
import { IdbSchemaInput, UpgradeMap } from "./IdbSchema";
import { Omit } from "./utils";

export interface IdbGraphQLInterface {
  query(): any;
  mutation(): any;
}

export interface IdbGraphQLConfig {
  schema: IdbSchemaInput | IdbSchemaInput[];
  upgradeMap?: UpgradeMap;
  versionStart?: number;
  idbBridge?: Dexie;
  schemaCreator?: typeof AbstractIdbSchemaCreator;
  suppressDuplicateDirectivesWarning?: boolean;
}

export type IdbGraphQLConfigInternal = Required<Omit<IdbGraphQLConfig, "schema" | "idbBridge">>;
