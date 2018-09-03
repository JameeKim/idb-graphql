import { IdbSchemaInput, UpgradeMap } from "./IdbSchema";

export interface IdbGraphQLConfig {
  schema: IdbSchemaInput | IdbSchemaInput[];
  upgradeMap?: UpgradeMap;
  versionStart?: number;
}
