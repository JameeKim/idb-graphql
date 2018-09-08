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
  schemaConfig?: IdbGraphQLSchemaConfig;
}

export interface IdbGraphQLSchemaConfig {
  schemaCreator?: typeof AbstractIdbSchemaCreator;
  suppressDuplicateDirectivesWarning?: boolean;
  entityIdTypes?: string[];
}

type KeysToOmit = "schema" | "idbBridge" | "schemaConfig";

export type IdbGraphQLConfigInternal = Required<Omit<IdbGraphQLConfig, KeysToOmit>> & {
  schemaConfig: Required<IdbGraphQLSchemaConfig>;
};
