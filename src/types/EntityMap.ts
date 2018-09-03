export interface EntityMap {
  [entityName: string]: EntityInfo;
}

export interface EntityInfo {
  name: string;
  fields: FieldInfo[];
}

export interface FieldInfo {
  name: string;
  index: "primary" | "unique" | RelationTypes | null;
}

export enum RelationTypes {
  MapToOne = "MapToOne",
  MapToMany = "MapToMany",
}
