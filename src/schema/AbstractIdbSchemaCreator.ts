import Dexie from "dexie";
import { IdbGraphQLError } from "../errors/IdbGraphQLError";
import { IdbGraphQLConfigInternal } from "../types/IdbGraphQL";
import { IdbSchemaCreatorInterface, IdbSchemaInput } from "../types/IdbSchema";

export class AbstractIdbSchemaCreator implements IdbSchemaCreatorInterface {
  protected readonly db: Dexie;
  protected readonly schemaArr: IdbSchemaInput[];
  protected readonly config: IdbGraphQLConfigInternal;

  constructor(db: Dexie, schema: IdbSchemaInput[], config: IdbGraphQLConfigInternal) {
    this.db = db;
    this.schemaArr = schema;
    this.config = config;
  }

  /**
   * Execute the idb schema setup process
   * @return {void}
   */
  public setSchema(): void {
    throw new IdbGraphQLError("[IdbGraphQL] AbstractIdbSchemaCreator should not be used as is. "
      + "Use IdbSchemaCreator class, or extend this class to implement your own.");
  }
}
