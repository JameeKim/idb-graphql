import { expect } from "chai";
import Dexie from "dexie";
import { parse } from "graphql";
import { EntityMap, IdbGraphQLDefaultConfig, IdbSchemaCreator } from "../../../dist/cjs";

describe("IdbSchemaCreator", function() {
  const dexie = new Dexie("Test", { indexedDB, IDBKeyRange });
  const schemaCreator = new IdbSchemaCreator(dexie, [], IdbGraphQLDefaultConfig);
  const gql = (str: TemplateStringsArray): string => str.join("");
  const noLocation: boolean = true;

  describe("#IdbSchemaFromEntityInfo(entityMap)", function() {
    const entityMap: EntityMap = new Map();

    afterEach(function() {
      entityMap.clear();
    });

    describe("- When there are no entities", function() {
      it("should return empty object", function() {
        const schema = schemaCreator.IdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.be.an("object").that.is.empty;
      });
    });

    describe("- Primary key", function() {
      it("should process plain", function() {
        entityMap.set("MyEntity", {
          name: "MyEntity",
          fields: [{
            name: "id",
            index: "primary",
          }],
        });
        const schema = schemaCreator.IdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.deep.eq({
          MyEntity: "id",
        });
      });

      it("should process auto-increment", function() {
        entityMap.set("MyEntity", {
          name: "MyEntity",
          fields: [{
            name: "id",
            index: "auto",
          }],
        });
        const schema = schemaCreator.IdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.deep.eq({
          MyEntity: "++id",
        });
      });

      it("should process uuid", function() {
        entityMap.set("MyEntity", {
          name: "MyEntity",
          fields: [{
            name: "id",
            index: "uuid",
          }],
        });
        const schema = schemaCreator.IdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.deep.eq({
          MyEntity: "$$id",
        });
      });
    });

    describe("- Other index", function() {
      it("should append \"&\" to unique key", function() {
        entityMap.set("User", {
          name: "User",
          fields: [{
            name: "id",
            index: "primary",
          }, {
            name: "email",
            index: ["unique"],
          }],
        });
        const schema = schemaCreator.IdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.deep.eq({
          User: "id,&email",
        });
      });

      it("should append \"*\" to multi key", function() {
        entityMap.set("User", {
          name: "User",
          fields: [{
            name: "id",
            index: "auto",
          }, {
            name: "email",
            index: ["multi"],
          }],
        });
        const schema = schemaCreator.IdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.deep.eq({
          User: "++id,*email",
        });
      });

      it("should process plain key", function() {
        entityMap.set("Todo", {
          name: "Todo",
          fields: [{
            name: "id",
            index: "auto",
          }, {
            name: "title",
            index: ["plain"],
          }, {
            name: "done",
            index: [],
          }],
        });
        const schema = schemaCreator.IdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.deep.eq({
          Todo: "++id,title,done",
        });
      });

      it("should append both \"&\" and \"*\" if both unique and multi", function() {
        entityMap.set("User", {
          name: "User",
          fields: [{
            name: "id",
            index: "uuid",
          }, {
            name: "email",
            index: ["unique", "multi"],
          }],
        });
        const schema = schemaCreator.IdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.deep.eq({
          User: "$$id,*&email",
        });
      });
    });

    describe("- Field info with index value null", function() {
      it("should not be considered as an index", function() {
        entityMap.set("MyEntity", {
          name: "MyEntity",
          fields: [{
            name: "id",
            index: "uuid",
          }, {
            name: "email",
            index: ["unique"],
          }, {
            name: "name",
            index: null,
          }],
        });
        const schema = schemaCreator.IdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.deep.eq({
          MyEntity: "$$id,&email",
        });
      });
    });

    describe("- Multiple entities", function() {
      it("should set all schema", function() {
        entityMap.set("User", {
          name: "User",
          fields: [{
            name: "id",
            index: "uuid",
          }, {
            name: "username",
            index: ["unique"],
          }, {
            name: "password",
            index: null,
          }, {
            name: "todo",
            index: ["unique", "multi"],
          }],
        });
        entityMap.set("Todo", {
          name: "Todo",
          fields: [{
            name: "id",
            index: "auto",
          }, {
            name: "title",
            index: [],
          }, {
            name: "finished",
            index: [],
          }, {
            name: "userId",
            index: [],
          }],
        });
        const schema = schemaCreator.IdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.deep.eq({
          User: "$$id,&username,*&todo",
          Todo: "++id,title,finished,userId",
        });
      });
    });
  });

  describe("#parseSchemaWithoutDirectivies(schemaAST)", function() {
    describe("- When there are no entities", function() {
      it("should return empty object", function() {
        const schemaStr = gql`
          schema {
            query: Query
          }
          type Query {
            hello: String!
          }
        `;
        const schema = schemaCreator.parseSchemaWithOutDirectives(parse(schemaStr, { noLocation }));
        expect(schema).to.be.an("object").that.is.empty;
      });
    });

    describe("- Object types with and without id field", function() {
      it("should only pick the objects with id fields with ID, Int, or String type as entities", function() {
        const schemaStr = gql`
          schema {
            query: Query
          }
          type Query {
            fake: [FakeEntity!]
          }
          type User {
            id: ID!
            email: [String!]!
          }
          type AuthOutput {
            token: String
            status: Boolean!
          }
          type FakeEntity {
            id: Float!
          }
          type Todo {
            id: Int!
            title: String!
          }
          type Post {
            id: String!
            title: String!
            author: User!
          }
        `;
        const schema = schemaCreator.parseSchemaWithOutDirectives(parse(schemaStr, { noLocation }));
        expect(Object.keys(schema)).to.be.lengthOf(3);
        expect(schema).to.have.all.keys("User", "Todo", "Post");
      });

      it("should only consider objects as candidates for entities", function() {
        const schemaStr = gql`
          schema {
            query: Query
            mutation: Mutation
          }
          type Query {
            hello: String!
          }
          type Mutation {
            authenticate(input: AuthInput): String
          }
          input AuthInput {
            id: String!
            password: String!
          }
          type User {
            id: ID!
            username: String!
          }
          enum AmIAnEntity {
            id
            and
            more
            values
          }
        `;
        const schema = schemaCreator.parseSchemaWithOutDirectives(parse(schemaStr, { noLocation }));
        expect(Object.keys(schema)).to.be.lengthOf(1);
        expect(schema).to.have.key("User");
      });
    });
  });
});
