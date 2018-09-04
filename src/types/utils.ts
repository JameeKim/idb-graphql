export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type Replace<T, K extends keyof T, TNew> = Omit<T, K> & {
  [P in K]: undefined extends T[P] ? TNew | undefined : TNew;
};
