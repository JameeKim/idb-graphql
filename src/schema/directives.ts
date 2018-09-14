import {
  DirectiveDefinitionNode,
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLNonNull,
  GraphQLString,
  parse,
} from "graphql";

const gql = (strings: TemplateStringsArray) => strings.join("");

export const directiveStrings = {
  IdbEntity: gql`directive @IdbEntity on OBJECT`,
  IdbPrimary: gql`directive @IdbPrimary(auto: String = "", forceInt: Boolean = false) on FIELD_DEFINITION`,
  IdbUnique: gql`directive @IdbUnique(multi: Boolean = false, compositeGroup: String) on FIELD_DEFINITION`,
  IdbRelation: gql`directive @IdbRelation(unique: Boolean = false) on FIELD_DEFINITION`,
  IdbIndex: gql`directive @IdbIndex(multi: Boolean = false, compositeGroup: String) on FIELD_DEFINITION`,
};

export const directiveASTs: { [k in keyof typeof directiveStrings]: DirectiveDefinitionNode } = {
  IdbEntity: parse(directiveStrings.IdbEntity, { noLocation: true }).definitions[0] as DirectiveDefinitionNode,
  IdbPrimary: parse(directiveStrings.IdbPrimary, { noLocation: true }).definitions[0] as DirectiveDefinitionNode,
  IdbUnique: parse(directiveStrings.IdbUnique, { noLocation: true }).definitions[0] as DirectiveDefinitionNode,
  IdbRelation: parse(directiveStrings.IdbRelation, { noLocation: true }).definitions[0] as DirectiveDefinitionNode,
  IdbIndex: parse(directiveStrings.IdbIndex, { noLocation: true }).definitions[0] as DirectiveDefinitionNode,
};

// TODO descriptions
export const directiveTypes: { [k in keyof typeof directiveStrings]: GraphQLDirective } = {
  IdbEntity: new GraphQLDirective({
    name: "IdbEntity",
    description: "Mark this object type as an entity to create an object store in db",
    locations: [
      DirectiveLocation.OBJECT,
    ],
  }),
  IdbPrimary: new GraphQLDirective({
    name: "IdbPrimary",
    description: "Mark this field as the primary key for this entity",
    locations: [
      DirectiveLocation.FIELD_DEFINITION,
    ],
    args: {
      auto: {
        type: GraphQLString,
        defaultValue: "",
        description: "",
      },
      forceInt: {
        type: GraphQLBoolean,
        defaultValue: false,
        description: "",
      },
    },
  }),
  IdbUnique: new GraphQLDirective({
    name: "IdbUnique",
    description: "Set a unique index on this field",
    locations: [
      DirectiveLocation.FIELD_DEFINITION,
    ],
    args: {
      multi: {
        type: GraphQLBoolean,
        defaultValue: false,
        description: "",
      },
      compositeGroup: {
        type: GraphQLString,
        description: "",
      },
    },
  }),
  IdbRelation: new GraphQLDirective({
    name: "IdbRelation",
    description: "",
    locations: [
      DirectiveLocation.FIELD_DEFINITION,
    ],
    args: {
      unique: {
        type: GraphQLBoolean,
        defaultValue: false,
        description: "",
      },
    },
  }),
  IdbIndex: new GraphQLDirective({
    name: "IdbIndex",
    description: "",
    locations: [
      DirectiveLocation.FIELD_DEFINITION,
    ],
    args: {
      multi: {
        type: GraphQLBoolean,
        defaultValue: false,
        description: "",
      },
      compositeGroup: {
        type: GraphQLString,
        description: "",
      },
    },
  }),
};
