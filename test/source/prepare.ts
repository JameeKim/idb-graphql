/// <reference path="./dexie-observable.d.ts"/>
/// <reference path="./indexeddbshim.d.ts"/>
import setGlobalVars = require("indexeddbshim");
global.window = global;
global.self = global;
setGlobalVars();
