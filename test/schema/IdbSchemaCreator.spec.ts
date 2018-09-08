import { expect } from "chai";
import Dexie from "dexie";
import { buildSchema } from "graphql";
import { EntityMap, IdbGraphQLDefaultConfig, IdbGraphQLError, IdbSchemaCreator } from "../../src";

describe("IdbSchemaCreator", function() {
  const dexie = new Dexie("Test", { indexedDB, IDBKeyRange });
  const schemaCreator = new IdbSchemaCreator(dexie, [], IdbGraphQLDefaultConfig);
  const gql = (str: TemplateStringsArray): string => str.join("");

  describe("#getIdbSchemaFromEntityInfo(entityMap)", function() {
    const entityMap: EntityMap = new Map();

    afterEach(function() {
      entityMap.clear();
    });

    describe("- When there are no entities", function() {
      it("should return empty object", function() {
        const schema = schemaCreator.getIdbSchemaFromEntityInfo(entityMap);
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
        const schema = schemaCreator.getIdbSchemaFromEntityInfo(entityMap);
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
        const schema = schemaCreator.getIdbSchemaFromEntityInfo(entityMap);
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
        const schema = schemaCreator.getIdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.deep.eq({
          MyEntity: "$$id",
        });
      });

      it("should throw error if unknown type of index", function() {
        // @ts-ignore
        entityMap.set("ErrorEntity", {
          name: "ErrorEntity",
          fields: [{
            name: "id",
            index: "unknown",
          }],
        });
        expect(() => schemaCreator.getIdbSchemaFromEntityInfo(entityMap))
          .to.throw(IdbGraphQLError, "Unsupported primary key type unknown");
      });

      it("should throw error if multiple primary keys are given", function() {
        entityMap.set("MultiplePrimaryKeysEntity", {
          name: "MultiplePrimaryKeysEntity",
          fields: [{
            name: "primary",
            index: "auto",
          }, {
            name: "another",
            index: "uuid",
          }],
        });
        expect(() => schemaCreator.getIdbSchemaFromEntityInfo(entityMap))
          .to.throw(IdbGraphQLError, "duplicate primary keys ++primary and another");
      });

      it("should throw error if primary key is not given", function() {
        entityMap.set("NoPrimaryKeyEntity", {
          name: "NoPrimaryKeyEntity",
          fields: [{
            name: "justIndex",
            index: ["plain"],
          }],
        });
        expect(() => schemaCreator.getIdbSchemaFromEntityInfo(entityMap))
          .to.throw(IdbGraphQLError, "Entity NoPrimaryKeyEntity does not have a primary key");
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
        const schema = schemaCreator.getIdbSchemaFromEntityInfo(entityMap);
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
        const schema = schemaCreator.getIdbSchemaFromEntityInfo(entityMap);
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
        const schema = schemaCreator.getIdbSchemaFromEntityInfo(entityMap);
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
        const schema = schemaCreator.getIdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.deep.eq({
          User: "$$id,*&email",
        });
      });

      it("should throw error if unknown type of index", function() {
        // @ts-ignore
        entityMap.set("Unknown", {
          name: "Unknown",
          fields: [{
            name: "id",
            index: "primary",
          }, {
            name: "unknownIndex",
            index: ["unknown"],
          }],
        });
        expect(() => schemaCreator.getIdbSchemaFromEntityInfo(entityMap))
          .to.throw(IdbGraphQLError, "Unsupported index type unknown");
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
        const schema = schemaCreator.getIdbSchemaFromEntityInfo(entityMap);
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
        const schema = schemaCreator.getIdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.deep.eq({
          User: "$$id,&username,*&todo",
          Todo: "++id,title,finished,userId",
        });
      });
    });
  });

  describe("#getEntityMapFromSchemaObjectWithoutDirectives(schema)", function() {
    describe("- When there are no entities", function() {
      it("should return empty map", function() {
        const schemaStr = gql`
          schema {
            query: Query
          }
          type Query {
            hello: String!
          }
        `;
        const map = schemaCreator.getEntityMapFromSchemaObjectWithoutDirectives(buildSchema(schemaStr));
        expect(map.size).to.eq(0);
      });
    });

    describe("- Picking entities", function() {
      it(
        "should only pick the non-operation objects with id fields with non-null ID, Int, or String type as entities",
        function() {
          const schemaStr = gql`
            schema {
              query: Query
            }
            type Query {
              id: Int!
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
            type AnotherFake {
              id: Boolean!
            }
            type IdNotRequired {
              id: ID
            }
          `;
          const map: EntityMap = schemaCreator.getEntityMapFromSchemaObjectWithoutDirectives(buildSchema(schemaStr));
          expect(map.size).to.eq(3);
          expect(Array.from(map.keys())).to.have.members(["User", "Todo", "Post"]);
        },
      );

      it("should only consider non-operation objects as candidates for entities", function() {
        const schemaStr = gql`
          schema {
            query: MyQuery
            mutation: MyMutation
            subscription: MySubscription
          }
          type MyQuery {
            id: String!
            hello: String!
          }
          type MyMutation {
            id: String!
            authenticate(input: AuthInput): String
          }
          type MySubscription {
            id: ID!
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
        const map: EntityMap = schemaCreator.getEntityMapFromSchemaObjectWithoutDirectives(buildSchema(schemaStr));
        expect(map.size).to.eq(1);
        expect(map.has("User")).to.be.true;
      });
    });

    describe("- Picking indexes", function() {
      it(
        "should pick primary keys and indexes for entity relations, multi for hasMany and plain for hasOne",
        function() {
          const schemaStr = gql`
            type User {
              id: ID!
              email: String!
              posts: [Post!]!
              comments: [Comment!]!
            }
            type Post {
              id: ID!
              title: String!
              content: String!
              author: User!
              comments: [Comment!]!
            }
            type Comment {
              id: ID!
              content: String!
              author: User!
              post: Post!
            }
          `;
          const map: EntityMap = schemaCreator.getEntityMapFromSchemaObjectWithoutDirectives(buildSchema(schemaStr));
          expect(Array.from(map.keys())).to.have.lengthOf(3).and.have.members(["User", "Post", "Comment"]);
          expect(map.get("User")).to.deep.eq({
            name: "User",
            fields: [{
              name: "id",
              index: "primary",
            }, {
              name: "postsId",
              index: ["multi"],
            }, {
              name: "commentsId",
              index: ["multi"],
            }],
          });
          expect(map.get("Post")).to.deep.eq({
            name: "Post",
            fields: [{
              name: "id",
              index: "primary",
            }, {
              name: "authorId",
              index: ["plain"],
            }, {
              name: "commentsId",
              index: ["multi"],
            }],
          });
          expect(map.get("Comment")).to.deep.eq({
            name: "Comment",
            fields: [{
              name: "id",
              index: "primary",
            }, {
              name: "authorId",
              index: ["plain"],
            }, {
              name: "postId",
              index: ["plain"],
            }],
          });
        },
      );
    });
  });

  describe("#getEntityMapFromSchemaObjectWithDirectives(schema)", function() {
    describe("- @IdbEntity", function() {
      it("should", function() {
        const schemaStr = gql``;
        // TODO
      });
    });

    describe("- Errors", function() {
      it("should throw if astNode is not provided for an object type", function() {
        const schemaStr = gql`
          directive @IdbEntity on OBJECT
          type Entity @IdbEntity {
            id: ID!
          }
        `;
        const schema = buildSchema(schemaStr);
        schema.getType("Entity")!.astNode = undefined;
        expect(() => schemaCreator.getEntityMapFromSchemaObjectWithDirectives(schema))
          .to.throw(IdbGraphQLError, "but could not find astNode for object type Entity");
      });
    });
  });
});
