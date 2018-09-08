import Dexie from "dexie";
import { IdbGraphQLError } from "../errors";
import { IdbGraphQLConfigInternal, IdbSchemaCreatorInterface, IdbSchemaInput, Maybe } from "../types";

export class AbstractIdbSchemaCreator implements IdbSchemaCreatorInterface {
  protected readonly db: Dexie;
  protected readonly schemaInputArr: Array<Maybe<IdbSchemaInput>>;
  protected readonly config: IdbGraphQLConfigInternal;

  constructor(db: Dexie, schema: Array<Maybe<IdbSchemaInput>>, config: IdbGraphQLConfigInternal) {
    this.db = db;
    this.schemaInputArr = schema;
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
