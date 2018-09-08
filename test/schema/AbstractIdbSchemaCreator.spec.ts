import { expect } from "chai";
import Dexie from "dexie";
import { AbstractIdbSchemaCreator, IdbGraphQLDefaultConfig, IdbGraphQLError } from "../../src";

describe("AbstractIdbSchemaCreator", function() {
  it("should throw error when used to set idb schema", function() {
    const dexie = new Dexie("Error", { indexedDB, IDBKeyRange });
    const schemaCreator = new AbstractIdbSchemaCreator(dexie, [], IdbGraphQLDefaultConfig);
    expect(() => schemaCreator.setSchema())
      .to.throw(IdbGraphQLError, "Use IdbSchemaCreator class, or extend this class to implement your own.");
  });
});
