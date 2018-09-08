/// <reference path="./types-dexie-observable.d.ts"/>
/// <reference path="./types-indexeddbshim.d.ts"/>
import setGlobalVars = require("indexeddbshim");
global.window = global;
global.self = global;
setGlobalVars();
