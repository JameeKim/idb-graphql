import { GraphQLInputType } from "graphql";

export interface DirectiveValueInfo {
  name: string;
  args: { [argName: string]: DirectiveValueArgInfo };
}

export interface DirectiveValueArgInfo {
  type: GraphQLInputType;
  value: any;
}
