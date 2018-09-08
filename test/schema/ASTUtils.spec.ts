import { expect } from "chai";
import {
  DirectiveNode,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLFloat,
  GraphQLString,
  ListTypeNode,
  NamedTypeNode,
  NonNullTypeNode,
} from "graphql";
import {
  DirectiveValueInfo,
  getDirectiveValueInfo,
  getNamedType,
  IdbGraphQLError,
  isListType,
} from "../../src";

describe("ASTUtils", function() {
  describe("#getNamedType", function() {
    const namedType: NamedTypeNode = {
      kind: "NamedType",
      name: {
        kind: "Name",
        value: "Boolean",
      },
    };

    it("should return itself if namedType", function() {
      expect(getNamedType(namedType)).to.eq(namedType);
    });

    it("should extract namedType from nonNullType", function() {
      const ast: NonNullTypeNode = {
        kind: "NonNullType",
        type: namedType,
      };
      expect(getNamedType(ast)).to.eq(namedType);
    });

    it("should extract namedType from listType", function() {
      const ast: ListTypeNode = {
        kind: "ListType",
        type: namedType,
      };
      expect(getNamedType(ast)).to.eq(namedType);
    });

    it("should extract namedType from nested nonNullType and listType", function() {
      const ast: NonNullTypeNode = {
        kind: "NonNullType",
        type: {
          kind: "ListType",
          type: {
            kind: "NonNullType",
            type: namedType,
          },
        },
      };
      expect(getNamedType(ast)).to.eq(namedType);
    });
  });

  describe("#isListType", function() {
    it("should return false to namedType", function() {
      const ast: NamedTypeNode = {
        kind: "NamedType",
        name: {
          kind: "Name",
          value: "String",
        },
      };
      expect(isListType(ast)).to.be.false;
    });

    it("should return true if at least one in the chain is listType", function() {
      const ast: NonNullTypeNode = {
        kind: "NonNullType",
        type: {
          kind: "ListType",
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: "ID",
              },
            },
          },
        },
      };
      expect(isListType(ast)).to.be.true;
    });
  });

  describe("#getDirectiveValueInfo(usage, definition)", function() {
    it("should throw error if the usage ast and definition type have different names", function() {
      const ast: DirectiveNode = {
        kind: "Directive",
        name: {
          kind: "Name",
          value: "directive",
        },
      };
      const def = new GraphQLDirective({
        name: "Directive",
        locations: [],
      });
      expect(() => getDirectiveValueInfo(ast, def))
        .to.throw(IdbGraphQLError, "wrong directive definition");
    });

    it("should return info with empty object as arguments if no arguments", function() {
      const ast: DirectiveNode = {
        kind: "Directive",
        name: {
          kind: "Name",
          value: "directive",
        },
      };
      const def = new GraphQLDirective({
        name: "directive",
        locations: [],
      });
      const expected: DirectiveValueInfo = {
        name: "directive",
        args: {},
      };
      expect(getDirectiveValueInfo(ast, def)).to.deep.eq(expected);
    });

    it("should set default values for arguments even if no arguments are specified", function() {
      const ast: DirectiveNode = {
        kind: "Directive",
        name: {
          kind: "Name",
          value: "directive",
        },
      };
      const def = new GraphQLDirective({
        name: "directive",
        locations: [],
        args: {
          arg: {
            type: GraphQLBoolean,
            defaultValue: false,
          },
          nullArg: {
            type: GraphQLString,
          },
        },
      });
      const expected: DirectiveValueInfo = {
        name: "directive",
        args: {
          arg: {
            type: GraphQLBoolean,
            value: false,
          },
          nullArg: {
            type: GraphQLString,
            value: null,
          },
        },
      };
      expect(getDirectiveValueInfo(ast, def)).to.deep.eq(expected);
    });

    it("should throw error if provided argument is not defined in definition", function() {
      const ast: DirectiveNode = {
        kind: "Directive",
        name: {
          kind: "Name",
          value: "directive",
        },
        arguments: [{
          kind: "Argument",
          name: {
            kind: "Name",
            value: "notDefined",
          },
          value: {
            kind: "IntValue",
            value: "1",
          },
        }],
      };
      const def = new GraphQLDirective({
        name: "directive",
        locations: [],
      });
      expect(() => getDirectiveValueInfo(ast, def))
        .to.throw(IdbGraphQLError, "is not defined for directive");
    });

    it("should set the default value or null for arguments which values are not provided", function() {
      const ast: DirectiveNode = {
        kind: "Directive",
        name: {
          kind: "Name",
          value: "directive",
        },
        arguments: [{
          kind: "Argument",
          name: {
            kind: "Name",
            value: "someArg",
          },
          value: {
            kind: "NullValue",
          },
        }, {
          kind: "Argument",
          name: {
            kind: "Name",
            value: "otherArg",
          },
          value: {
            kind: "NullValue",
          },
        }],
      };
      const def = new GraphQLDirective({
        name: "directive",
        locations: [],
        args: {
          someArg: {
            type: GraphQLFloat,
            defaultValue: 1,
          },
          otherArg: {
            type: GraphQLString,
          },
        },
      });
      const expected: DirectiveValueInfo = {
        name: "directive",
        args: {
          someArg: {
            type: GraphQLFloat,
            value: 1,
          },
          otherArg: {
            type: GraphQLString,
            value: null,
          },
        },
      };
      expect(getDirectiveValueInfo(ast, def)).to.deep.eq(expected);
    });
  });
});
