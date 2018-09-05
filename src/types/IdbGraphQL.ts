import Dexie from "dexie";
import { AbstractIdbSchemaCreator } from "../schema";
import { IdbSchemaInput, UpgradeMap } from "./IdbSchema";
import { Maybe, Omit } from "./utils";

export interface IdbGraphQLInterface {
  query(): any;
  mutation(): any;
}

export interface IdbGraphQLConfig {
  schema: IdbSchemaInput | Array<Maybe<IdbSchemaInput>>;
  upgradeMap?: UpgradeMap;
  versionStart?: number;
  idbBridge?: Dexie;
  schemaCreator?: typeof AbstractIdbSchemaCreator;
  suppressDuplicateDirectivesWarning?: boolean;
}

export type IdbGraphQLConfigInternal = Required<Omit<IdbGraphQLConfig, "schema" | "idbBridge">>;
