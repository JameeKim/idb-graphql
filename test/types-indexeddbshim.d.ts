declare module "indexeddbshim" {
  function setGlobalVars(): void;
  export = setGlobalVars;
}

declare namespace NodeJS {
  interface Global {
    window: Global;
  }
}
