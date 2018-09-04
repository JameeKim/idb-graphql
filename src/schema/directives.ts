import {
  DefinitionNode,
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLNonNull,
  GraphQLString,
  parse,
} from "graphql";

const gql = (strings: TemplateStringsArray) => strings.join("");

export const directiveStrings = {
  IdbEntity: gql`directive @IdbEntity(name: String) on OBJECT`,
  IdbPrimary: gql`directive @IdbPrimary on FIELD_DEFINITION`,
  IdbUnique: gql`directive @IdbUnique(multi: Boolean = false) on FIELD_DEFINITION`,
  IdbRelation: gql`directive @IdbRelation(type: String!) on FIELD_DEFINITION`,
  IdbIndex: gql`directive @IdbIndex(multi: Boolean = false) on FIELD_DEFINITION`,
};

export const directiveASTs: { [k in keyof typeof directiveStrings]: DefinitionNode } = {
  IdbEntity: parse(directiveStrings.IdbEntity, { noLocation: true }).definitions[0],
  IdbPrimary: parse(directiveStrings.IdbPrimary, { noLocation: true }).definitions[0],
  IdbUnique: parse(directiveStrings.IdbUnique, { noLocation: true }).definitions[0],
  IdbRelation: parse(directiveStrings.IdbRelation, { noLocation: true }).definitions[0],
  IdbIndex: parse(directiveStrings.IdbIndex, { noLocation: true }).definitions[0],
};

export const directiveTypes: { [k in keyof typeof directiveStrings]: GraphQLDirective } = {
  IdbEntity: new GraphQLDirective({
    name: "Entity",
    description: "Mark this object type as an entity to create an object store in db",
    locations: [
      DirectiveLocation.OBJECT,
    ],
    args: {
      name: {
        type: GraphQLString,
        description: "Table name to use",
      },
    },
  }),
  IdbPrimary: new GraphQLDirective({
    name: "Primary",
    description: "Mark this field as the primary key for this entity",
    locations: [
      DirectiveLocation.FIELD_DEFINITION,
    ],
  }),
  IdbUnique: new GraphQLDirective({
    name: "Unique",
    description: "Set a unique index on this field",
    locations: [
      DirectiveLocation.FIELD_DEFINITION,
    ],
    args: {
      multi: {
        type: GraphQLBoolean,
        description: "",
      },
    },
  }),
  IdbRelation: new GraphQLDirective({
    name: "Relation",
    description: "",
    locations: [
      DirectiveLocation.FIELD_DEFINITION,
    ],
    args: {
      type: {
        type: new GraphQLNonNull(GraphQLString),
        description: "",
      },
    },
  }),
  IdbIndex: new GraphQLDirective({
    name: "Index",
    description: "",
    locations: [
      DirectiveLocation.FIELD_DEFINITION,
    ],
    args: {
      multi: {
        type: GraphQLBoolean,
        description: "",
      },
    },
  }),
};
