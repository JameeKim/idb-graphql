export type EntityMap = Map<string, EntityInfo>;

export interface EntityInfo {
  name: string;
  fields: FieldInfo[];
}

export interface FieldInfo {
  name: string;
  index: "primary" | "auto" | Array<"unique" | "multi" | "plain"> | null;
}
