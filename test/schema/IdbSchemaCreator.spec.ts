import { expect } from "chai";
import Dexie from "dexie";
import { buildSchema, GraphQLObjectType, parse } from "graphql";
import {
  directiveStrings,
  EntityMap,
  IdbGraphQLDefaultConfig,
  IdbGraphQLError,
  IdbSchemaCreator,
} from "../../src";

describe("IdbSchemaCreator#getIdbSchema", function() {
  const dexie = new Dexie("Test", { indexedDB, IDBKeyRange });
  const schemaCreator = new IdbSchemaCreator(dexie, [], IdbGraphQLDefaultConfig.schemaConfig);
  schemaCreator.setConfig({ suppressDuplicateDirectivesWarning: true });
  const gql = (str: TemplateStringsArray): string => str.join("");

  describe("#getIdbSchemaFromEntityInfo(entityMap)", function() {
    const entityMap: EntityMap = new Map();

    afterEach(function() {
      entityMap.clear();
    });

    describe("- When there are no entities", function() {
      it("should return empty object", function() {
        // @ts-ignore: access to protected method
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
        // @ts-ignore: access to protected method
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
        // @ts-ignore: access to protected method
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
        // @ts-ignore: access to protected method
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
        // @ts-ignore: access to protected method
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
        // @ts-ignore: access to protected method
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
        // @ts-ignore: access to protected method
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
        // @ts-ignore: access to protected method
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
        // @ts-ignore: access to protected method
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
        // @ts-ignore: access to protected method
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
        // @ts-ignore: access to protected method
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
        // @ts-ignore: access to protected method
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
        // @ts-ignore: access to protected method
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
        // @ts-ignore: access to protected method
        const schema = schemaCreator.getIdbSchemaFromEntityInfo(entityMap);
        expect(schema).to.deep.eq({
          User: "$$id,&username,*&todo",
          Todo: "++id,title,finished,userId",
        });
      });
    });
  });

  describe("## Schema Object Without Directives", function() {
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
        const schema = schemaCreator.getIdbSchema(buildSchema(schemaStr));
        expect(Object.keys(schema)).to.be.lengthOf(0);
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
          const schema = schemaCreator.getIdbSchema(buildSchema(schemaStr));
          expect(Object.keys(schema)).to.be.lengthOf(3).and.have.members(["User", "Todo", "Post"]);
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
        const schema = schemaCreator.getIdbSchema(buildSchema(schemaStr));
        expect(Object.keys(schema)).to.be.lengthOf(1).and.include("User");
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
          const schema = schemaCreator.getIdbSchema(buildSchema(schemaStr));
          expect(schema).to.deep.eq({
            User: "id,*postsId,*commentsId",
            Post: "id,authorId,*commentsId",
            Comment: "id,authorId,postId",
          });
        },
      );
    });
  });

  describe("## Schema Object With Directives", function() {
    const directiveDefs: string = Object.values(directiveStrings).join("\n");

    describe("- @IdbEntity", function() {
      it("should only pick object type with @IdbEntity directive", function() {
        const schemaStr = gql`
          type Entity @IdbEntity {
            id: ID! @IdbPrimary
          }
          type NotEntity {
            id: ID!
          }
        `;
        const schema = schemaCreator.getIdbSchema(buildSchema(schemaStr + directiveDefs));
        expect(Object.keys(schema)).to.be.lengthOf(1).and.include("Entity");
      });
    });

    describe("- @IdbPrimary", function() {
      it("should set auto-generation if argument \"auto\" is provided", function() {
        const schemaStr = gql`
          type Entity @IdbEntity {
            id: String! @IdbPrimary
          }
          type AutoIncrement @IdbEntity {
            id: Int! @IdbPrimary(auto: "auto")
          }
          type UuidEntity @IdbEntity {
            id: String! @IdbPrimary(auto: "uuid")
          }
        `;
        const schema = schemaCreator.getIdbSchema(buildSchema(schemaStr + directiveDefs));
        expect(schema).to.deep.eq({
          Entity: "id",
          AutoIncrement: "++id",
          UuidEntity: "$$id",
        });
      });

      it("should throw if @IdbPrimary is not used", function() {
        const schemaStr = gql`
          type NoPrimary @IdbEntity {
            id: ID!
            uuid: String! @IdbUnique
          }
        `;
        expect(() => schemaCreator.getIdbSchema(buildSchema(schemaStr + directiveDefs)))
          .to.throw(IdbGraphQLError, "with @IdbPrimary directive, but it is not found for entity NoPrimary");
      });

      it("should throw if @IdbPrimary is used multiple times", function() {
        const schemaStr = gql`
          type MultiplePrimary @IdbEntity {
            id: ID! @IdbPrimary
            uuid: String! @IdbPrimary
          }
        `;
        expect(() => schemaCreator.getIdbSchema(buildSchema(schemaStr + directiveDefs)))
          .to.throw(IdbGraphQLError, "multiple primary keys detected for entity MultiplePrimary");
      });
    });

    describe("- @IdbUnique", function() {
      it("should set unique index", function() {
        const schemaStr = gql`
          type Entity @IdbEntity {
            id: ID! @IdbPrimary
            uuid: String! @IdbUnique
          }
          type MultiUniqueEntity @IdbEntity {
            id: ID! @IdbPrimary
            uids: [String!]! @IdbUnique(multi: true)
          }
        `;
        const schema = schemaCreator.getIdbSchema(buildSchema(schemaStr + directiveDefs));
        expect(schema).to.deep.eq({
          Entity: "id,&uuid",
          MultiUniqueEntity: "id,*&uids",
        });
      });
    });

    describe("- @IdbIndex", function() {
      it("should set plain or multi index", function() {
        const schemaStr = gql`
          type User @IdbEntity {
            id: ID! @IdbPrimary
            city: String @IdbIndex
            phones: [String!]! @IdbIndex(multi: true)
          }
        `;
        const schema = schemaCreator.getIdbSchema(buildSchema(schemaStr + directiveDefs));
        expect(schema).to.deep.eq({
          User: "id,city,*phones",
        });
      });
    });

    describe("- @IdbRelation", function() {
      it("should set right index based on the output type of the field", function() {
        const schemaStr = gql`
          type User @IdbEntity {
            id: ID! @IdbPrimary(auto: "uuid")
            todoLists: [TodoList!]! @IdbRelation
          }
          type TodoList @IdbEntity {
            id: ID! @IdbPrimary(auto: "uuid")
            owner: User! @IdbRelation
            todos: [Todo!]! @IdbRelation
          }
          type Todo @IdbEntity {
            id: Int! @IdbPrimary(auto: "auto")
            title: String! @IdbIndex
            list: TodoList @IdbRelation
            done: Boolean!
          }
        `;
        const schema = schemaCreator.getIdbSchema(buildSchema(schemaStr + directiveDefs));
        expect(schema).to.deep.eq({
          User: "$$id,*todoListsId",
          TodoList: "$$id,ownerId,*todosId",
          Todo: "++id,title,listId",
        });
      });

      it("should set unique index if specified so", function() {
        const schemaStr = gql`
          type User @IdbEntity {
            id: ID! @IdbPrimary(auto: "uuid")
            info: UserInfo! @IdbRelation(unique: true)
          }
          type UserInfo @IdbEntity {
            id: Int! @IdbPrimary(auto: "auto")
            name: String
            city: String
          }
        `;
        const schema = schemaCreator.getIdbSchema(buildSchema(schemaStr + directiveDefs));
        expect(schema).to.deep.eq({
          User: "$$id,&infoId",
          UserInfo: "++id",
        });
      });

      it("should throw if the output type of the field is not an entity", function() {
        const schemaStr = gql`
          type User @IdbEntity {
            id: ID! @IdbPrimary(auto: "uuid")
            role: UserRole! @IdbRelation
          }
          type UserRole {
            admin: Boolean!
          }
        `;
        const errorMsg = "@IdbRelation should be used on a field that returns an entity "
          + "or an array of an entity, but field role of entity User does not satisfy the constraint";
        expect(() => schemaCreator.getIdbSchema(buildSchema(schemaStr + directiveDefs)))
          .to.throw(IdbGraphQLError, errorMsg);
      });
    });

    describe("- AstNode not given", function() {
      it("should throw if astNode is not provided for an object type", function() {
        const schemaStr = gql`
          type Entity @IdbEntity {
            id: ID! @IdbPrimary
          }
        `;
        const schema = buildSchema(schemaStr + directiveDefs);
        schema.getType("Entity")!.astNode = undefined;
        expect(() => schemaCreator.getIdbSchema(schema))
          .to.throw(IdbGraphQLError, "but could not find astNode for object type Entity");
      });

      it("should throw if astNode is not provided for a field of an entity", function() {
        const schemaStr = gql`
          type GoodEntity @IdbEntity {
            id: ID! @IdbPrimary
          }
          type BadEntity @IdbEntity {
            id: ID! @IdbPrimary
          }
        `;
        const schema = buildSchema(schemaStr + directiveDefs);
        (schema.getType("BadEntity") as GraphQLObjectType).getFields().id.astNode = undefined;
        expect(() => schemaCreator.getIdbSchema(schema))
          .to.throw(IdbGraphQLError, "but could not find astNode for some fields in entity BadEntity");
      });
    });

    describe("- Misuse of index-indicating directives", function() {
      it("should throw if multiple @Idb* directives are used on one field", function() {
        const schemaStr = gql`
          type ErrorEntity @IdbEntity {
            id: ID! @IdbPrimary @IdbUnique
          }
        `;
        expect(() => schemaCreator.getIdbSchema(buildSchema(schemaStr + directiveDefs)))
          .to.throw(IdbGraphQLError, "multiple of them used for field id in entity ErrorEntity");
      });
    });
  });

  describe("## Schema AST and String", function() {
    describe("- With @Idb* directives", function() {
      const schemaStr = gql`
        type User @IdbEntity {
          id: ID! @IdbPrimary(auto: "uuid")
          todoLists: [TodoList!]! @IdbRelation
        }
        type TodoList @IdbEntity {
          id: ID! @IdbPrimary(auto: "uuid")
          owner: User! @IdbRelation
          todos: [Todo!]! @IdbRelation
        }
        type Todo @IdbEntity {
          id: Int! @IdbPrimary(auto: "auto")
          title: String! @IdbIndex
          list: TodoList @IdbRelation
          done: Boolean!
        }
      `;

      it("should parse the schema (directive definitions not provided)", function() {
        const schema = schemaCreator.getIdbSchema(schemaStr);
        expect(schema).to.deep.eq(schemaCreator.getIdbSchema(parse(schemaStr, { noLocation: true })));
        expect(schema).to.deep.eq({
          User: "$$id,*todoListsId",
          TodoList: "$$id,ownerId,*todosId",
          Todo: "++id,title,listId",
        });
      });

      it("should parse the schema (directive definitions all provided)", function() {
        const schemaStrWithDirectives = schemaStr + Object.values(directiveStrings).join("\n");
        const schema = schemaCreator.getIdbSchema(schemaStrWithDirectives);
        expect(schema)
          .to.deep.eq(schemaCreator.getIdbSchema(parse(schemaStrWithDirectives, { noLocation: true })));
        expect(schema).to.deep.eq({
          User: "$$id,*todoListsId",
          TodoList: "$$id,ownerId,*todosId",
          Todo: "++id,title,listId",
        });
      });
    });

    describe("- Without @Idb* directives", function() {
      it("should parse the schema", function() {
        const schemaStr = gql`
          type User {
            id: ID!
            email: String! @deprecated(reason: "Use username")
            username: String!
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
        const schema = schemaCreator.getIdbSchema(schemaStr);
        expect(schema).to.deep.eq(schemaCreator.getIdbSchema(parse(schemaStr, { noLocation: true })));
        expect(schema).to.deep.eq({
          User: "id,*postsId,*commentsId",
          Post: "id,authorId,*commentsId",
          Comment: "id,authorId,postId",
        });
      });
    });
  });

  describe("## Wrong input type", function() {
    it("should throw", function() {
      const schemaStr = gql`
        type User {
          id: ID!
          email: String!
        }
      `;
      const ast = parse(schemaStr, { noLocation: true });
      // @ts-ignore: schema input type is not a full ast
      expect(() => schemaCreator.getIdbSchema(ast.definitions))
        .to.throw(IdbGraphQLError, "The provided schema should be a schema graphql string, "
          + "an AST of the string, or a GraphQLSchema object");
    });
  });
});
