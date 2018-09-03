import Dexie from "dexie";
import { IdbSchemaInput, SetIdbSchemaConfig, UpgradeMapFunction } from "../../types/IdbSchema";
import { getIdbSchema } from "./getIdbSchema";

export function setIdbSchema(
  db: Dexie,
  schemaArr: IdbSchemaInput[],
  { versionStart, upgradeMap }: SetIdbSchemaConfig,
): void {
  let i: number = versionStart;
  for (const schema of schemaArr) {
    const version: Dexie.Version = db.version(++i / 10).stores(getIdbSchema(schema));
    if (upgradeMap[i]) {
      processUpgrade(version, upgradeMap[i]);
    }
  }
}

// TODO
function processUpgrade(version: Dexie.Version, upgrade: UpgradeMapFunction): void {
  version.upgrade(upgrade);
}
