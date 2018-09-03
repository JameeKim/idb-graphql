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
  Entity: gql`directive @Entity(name: String) on OBJECT`,
  Primary: gql`directive @Primary on FIELD_DEFINITION`,
  Unique: gql`directive @Unique on FIELD_DEFINITION`,
  Relation: gql`directive @Relation(type: String!) on FIELD_DEFINITION`,
  Index: gql`directive @Index(multi: Boolean = false) on FIELD_DEFINITION`,
};

export const directiveASTs: { [k in keyof typeof directiveStrings]: DefinitionNode } = {
  Entity: parse(directiveStrings.Entity, { noLocation: true }).definitions[0],
  Primary: parse(directiveStrings.Primary, { noLocation: true }).definitions[0],
  Unique: parse(directiveStrings.Unique, { noLocation: true }).definitions[0],
  Relation: parse(directiveStrings.Relation, { noLocation: true }).definitions[0],
  Index: parse(directiveStrings.Index, { noLocation: true }).definitions[0],
};

export const directiveTypes: { [k in keyof typeof directiveStrings]: GraphQLDirective } = {
  Entity: new GraphQLDirective({
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
  Primary: new GraphQLDirective({
    name: "Primary",
    description: "Mark this field as the primary key for this entity",
    locations: [
      DirectiveLocation.FIELD_DEFINITION,
    ],
  }),
  Unique: new GraphQLDirective({
    name: "Unique",
    description: "Set a unique index on this field",
    locations: [
      DirectiveLocation.FIELD_DEFINITION,
    ],
  }),
  Relation: new GraphQLDirective({
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
  Index: new GraphQLDirective({
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
