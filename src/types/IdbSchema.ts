import Dexie from "dexie";
import { DocumentNode, GraphQLSchema } from "graphql";
import { IdbGraphQLConfig } from "./IdbGraphQL";

export interface IdbSchemaCreatorInterface {
  setSchema(): void;
}

export interface IdbSchema {
  [key: string]: string | null;
}

export type IdbSchemaInput = string | DocumentNode | GraphQLSchema;

export interface UpgradeMap {
  [key: number]: UpgradeMapFunction;
}
export type UpgradeMapFunction = (trans: Dexie.Transaction) => void;

export type SetIdbSchemaConfig = Required<Pick<IdbGraphQLConfig, "upgradeMap" | "versionStart">>;
