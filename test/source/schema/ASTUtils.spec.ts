import { expect } from "chai";
import { ListTypeNode, NamedTypeNode, NonNullTypeNode } from "graphql";
import { getNamedType, isListType } from "../../../dist/cjs";

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
});
