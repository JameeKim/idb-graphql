import { expect } from "chai";
import Dexie from "dexie";
import { IdbGraphQLDefaultConfig } from "idb-graphql";
import { IdbSchemaCreator } from "idb-graphql";
import { EntityMap } from "../../src/types/EntityMap";

describe("IdbSchemaCreator", function() {
  const schemaCreator = new IdbSchemaCreator(new Dexie("Test"), [], IdbGraphQLDefaultConfig);

  it("should process entityMap correctly", function() {
    const entityMap: EntityMap = new Map();
    // entityMap.set();
  });
});
