import { atomFamily } from 'recoil';

const atomFamilyStr = atomFamily.toString();

const newFuncStr =
  atomFamilyStr.slice(0, 3127) + 'atomFamilyTracker[key].push(params);' + atomFamilyStr.slice(3127);

const newFunc = new Function(newFuncStr);

console.log(newFunc.toString());
