/* eslint-disable */
import {
  Writeables,
  Readables,
  SelectorsArr,
  Snapshots,
  Setters,
  SelectorFamilyArr,
} from './types/types';

/* eslint-enable */

const output = (
  writeables: Writeables<any>,
  readables: Readables<any>,
  snapshots: Snapshots,
  initialRender: SelectorsArr,
  initialRenderFamilies: SelectorFamilyArr,
  setters: Setters,
  settables: Array<string>,
  //TODO:FIX TYPING
  atomFamilies: any,
  selectorFamilies: any,
): string =>
  `import { renderRecoilHook, act } from 'react-recoil-hooks-testing-library';
import { useRecoilValue, useRecoilState } from 'recoil';
import {
${
  writeables.reduce((importStr, { key }) => `${importStr}\t${key},\n`, '') +
  readables.reduce((importStr, { key }) => `${importStr}\t${key},\n`, '') +
  Object.keys(atomFamilies).reduce(
    (importStr, familyName) => `${importStr}\t${familyName},\n`,
    '',
  ) +
  Object.keys(selectorFamilies).reduce(
    (importStr, familyName) => `${importStr}\t${familyName},\n`,
    '',
  )
}
} from '<ADD STORE FILEPATH>';

// Suppress 'Batcher' warnings from React / Recoil conflict
console.error = jest.fn();

// Hook to return atom/selector values and/or modifiers for react-recoil-hooks-testing-library
const useStoreHook = () => {
  // atoms
${writeables.reduce(
  (str, { key }) => `${str}\tconst [${key}Value, set${key}] = useRecoilState(${key});\n`,
  '',
)}
  // writeable selectors
${settables.reduce(
  (str, key) => `${str}\tconst [${key}Value, set${key}] = useRecoilState(${key});\n`,
  '',
)}
  // read-only selectors
${readables
  .filter(({ key }) => !settables.includes(key))
  .reduce((str, { key }) => `${str}\tconst ${key}Value = useRecoilValue(${key});\n`, '')}

  //atom families
${snapshots[snapshots.length - 1].atomFamilyState.reduce((str, atomState) => {
  const { family, key } = atomState;
  const params = key.substring(family.length + 2);
  return `${str}\tconst [${family + '__' + params + '__Value'}, ${
    'set' + family + '__' + params
  }] = useRecoilState(${family}(${params}));\n`;
}, '')}

//selector families
${Object.entries(selectorFamilies).reduce((str: string, familyArr: any): string => {
  const familyName = familyArr[0];
  const { prevParams } = familyArr[1];

  return `${str}${prevParams.reduce((innerStr: string, param: any) => {
    return `${innerStr}\tconst [${familyName + '__' + param + '__Value'}, ${
      'set' + familyName + '__' + param
    }] = useRecoilState(${familyName}(${param}));\n`;
  }, '')}`;
}, '')}




  return {
${
  writeables.reduce((value, { key }) => `${value}\t\t${key}Value,\n\t\tset${key},\n`, '') +
  settables.reduce((value, key) => `${value}\t\t${key}Value,\n\t\tset${key},\n`, '') +
  readables
    .filter(({ key }) => !settables.includes(key))
    .reduce((value, { key }) => `${value}\t\t${key}Value,\n`, '') +
  snapshots[snapshots.length - 1].atomFamilyState.reduce((value, atomState) => {
    const { family, key } = atomState;
    const params = key.substring(family.length + 2);
    return `${value}\t\t${family + '__' + params + '__Value'},
      \t\t${'set' + family + '__' + params},\n`;
  }, '') +
  Object.entries(selectorFamilies).reduce((str: string, familyArr: any): string => {
    const familyName = familyArr[0];
    const { prevParams } = familyArr[1];

    return `${str}${prevParams.reduce((innerStr: string, param: any) => {
      return `${innerStr}\t\t${familyName + '__' + param + '__Value'},
      \t\t${'set' + familyName + '__' + param},\n`;
    }, '')}`;
  }, '')
}\t};
};

describe('INITIAL RENDER', () => { 
  const { result } = renderRecoilHook(useStoreHook); 
//Selectors
${initialRender.reduce(
  (
    initialTests,
    { key, newValue },
  ) => `${initialTests}\tit('${key} should initialize correctly', () => {
\t\texpect(result.current.${key}Value).toStrictEqual(${JSON.stringify(newValue)});
\t});\n`,
  '',
)}
//Selector Families
${initialRenderFamilies.reduce(
  (initialTests, { key, params, newValue }) =>
    `${initialTests}\tit('${key}__${params} should initialize correctly', () => {
  \t\texpect(result.current.${key}__${params}Value).toStrictEqual(${JSON.stringify(newValue)});
  \t});\n`,
  '',
)}

});

describe('SELECTORS', () => {
${snapshots.reduce((tests, { state, selectors, atomFamilyState, selectorFamilies }) => {
  const allUpdatedAtoms = [
    ...state.filter(({ updated }) => updated),
    ...atomFamilyState.filter(({ updated }) => updated),
  ];
  const allUpdatedSelectors = [...selectors, ...selectorFamilies];
  const selectorLen = allUpdatedSelectors.length;
  const atomLen = allUpdatedAtoms.length;

  return atomLen !== 0 && selectorLen !== 0
    ? `${tests}\tit('${
        selectorLen > 1
          ? allUpdatedSelectors.reduce((list, selectorState, i) => {
              const { key } = selectorState;
              const params = selectorState?.params;
              const last = i === selectorLen - 1;
              //if params exist, then we are looking at a selectorFamily
              if (params !== undefined)
                return `${list}${last ? 'and ' : ''}${key}__${params}${last ? '' : ', '}`;
              else return `${list}${last ? 'and ' : ''}${key}${last ? '' : ', '}`;
            }, '')
          : `${
              allUpdatedSelectors[0].params !== undefined
                ? `${allUpdatedSelectors[0].key}__${allUpdatedSelectors[0].params}`
                : allUpdatedSelectors[0].key
            }`
      } should properly derive state when ${
        atomLen > 1
          ? allUpdatedAtoms.reduce((list, { key }, i) => {
              const last = i === atomLen - 1;
              return `${list}${last ? 'and ' : ''}${key}${last ? ' update' : ', '}`;
            }, '')
          : `${allUpdatedAtoms[0].key} updates`
      }', () => {
\t\tconst { result } = renderRecoilHook(useStoreHook);

\t\tact(() => {
  ${state.reduce(
    (initializers, { key, value }) =>
      `${initializers}\t\t\tresult.current.set${key}(${JSON.stringify(value)});\n\n`,
    '',
  )}
  ${atomFamilyState.reduce(
    (initializers, { key, value }) =>
      `${initializers}\t\t\tresult.current.set${key}(${JSON.stringify(value)});\n\n`,
    '',
  )}
\t\t});
${
  selectorLen !== 0
    ? allUpdatedSelectors.reduce((assertions, selectorState) => {
        const { key, newValue } = selectorState;
        const params = selectorState?.params;
        if (params !== undefined)
          return `${assertions}\t\texpect(result.current.${key}__${params}__Value).toStrictEqual(${JSON.stringify(
            newValue,
          )});\n\n`;
        else
          return `${assertions}\t\texpect(result.current.${key}Value).toStrictEqual(${JSON.stringify(
            newValue,
          )});\n\n`;
      }, '')
    : ''
}\t});\n\n`
    : tests;
}, '')}});

describe('SETTERS', () => {
${setters.reduce((setterTests, { state, setter }) => {
  const updatedAtoms = state.filter(({ updated }) => updated);

  return setter
    ? `${setterTests}\tit('${setter.key} should properly set state', () => {
\t\tconst { result } = renderRecoilHook(useStoreHook);

\t\tact(() => {
${state.reduce(
  (setterInitializers, { key, previous }) =>
    `${setterInitializers}\t\t\tresult.current.set${key}(${JSON.stringify(previous)});\n\n`,
  '',
)}\t\t});

\t\tact(() => { 
\t\t\tresult.current.set${setter.key}(${JSON.stringify(setter.newValue)});
\t\t});

${updatedAtoms.reduce(
  (setterAssertions, { key, value }) =>
    `${setterAssertions}\t\texpect(result.current.${key}Value).toStrictEqual(${JSON.stringify(
      value,
    )});\n\n`,
  '',
)}\t});\n\n`
    : `${setterTests}`;
}, '')}});`;

export default output;
