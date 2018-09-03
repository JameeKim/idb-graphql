import { DefinitionNode, DirectiveLocation, GraphQLDirective, GraphQLString, parse } from "graphql";

const gql = (strings: TemplateStringsArray) => strings.join("");

export const directiveStrings: { [k: string]: string } = {
  Entity: gql`directive @Entity(name: String) on OBJECT`,
  Primary: gql`directive @Primary on FIELD_DEFINITION`,
  Unique: gql`directive @Unique on FIELD_DEFINITION`,
  Relation: gql`directive @Relation(type: String!) on FIELD_DEFINITION`,
};
export const notEntityDirectiveString = gql`directive @NotEntity on OBJECT`;

export const directiveASTs: { [k: string]: DefinitionNode } = {
  Entity: parse(directiveStrings.Entity, { noLocation: true }).definitions[0],
  Primary: parse(directiveStrings.Primary, { noLocation: true }).definitions[0],
  Unique: parse(directiveStrings.Unique, { noLocation: true }).definitions[0],
  Relation: parse(directiveStrings.Relation, { noLocation: true }).definitions[0],
};
export const notEntityDirectiveAST = parse(notEntityDirectiveString, { noLocation: true }).definitions[0];

export const directiveTypes = {
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
};
export const notEntityDirectiveType = new GraphQLDirective({
  name: "NotEntity",
  description: "Mark this object type as not an entity, thus indicate not to create an object store in db",
  locations: [
    DirectiveLocation.OBJECT,
  ],
});
