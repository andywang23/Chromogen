/* eslint-disable */
import React, { useState, useEffect, CSSProperties } from 'react';
import {
  selector as recoilSelector,
  atom as recoilAtom,
  atomFamily as recoilAtomFamily,
  selectorFamily as recoilSelectorFamily,
  // eslint-disable-next-line camelcase
  useRecoilTransactionObserver_UNSTABLE,
  useRecoilState,
  RecoilState,
  RecoilValueReadOnly,
  AtomOptions,
  Snapshot,
  ReadWriteSelectorOptions,
  ReadOnlySelectorOptions,
  SerializableParam,
  AtomFamilyOptions,
  ReadWriteSelectorFamilyOptions,
  ReadOnlySelectorFamilyOptions,
} from 'recoil';
import output from './testString';
import {
  Writeables,
  Readables,
  SelectorsArr,
  Snapshots,
  SelectorConfig,
  AtomFamilies,
  SelectorFamilyConfig,
  SelectorFamilies,
  Setters,
  SelectorFamilyArr,
} from './types/types';
/* eslint-enable */

// ----- TESTING -----
// Arrays used to compose test string
const writeables: Writeables<any> = [];
const settables: Array<string> = [];
const snapshots: Snapshots = [];
const initialRender: SelectorsArr = [];
const initialRenderFamilies: SelectorFamilyArr = [];
const setters: Setters = [];
let readables: Readables<any> = [];
/* Object used to store families and their respective members (values are nested objects
that are tracking each atom family member created) */
const atomFamilies: AtomFamilies = {};
//Track all selector families and all params that were passed in for import
let selectorFamilies: SelectorFamilies<any, SerializableParam> = {};

// State for recording toggle
const recordingState: RecoilState<boolean> = recoilAtom<boolean>({
  key: 'recordingState',
  default: true,
});

// ----- SHADOW CONSTRUCTORS for SELECTOR / ATOM -----
//Switching to function declaration for TS (easiest workaround for <T> generic tag being recognized as JSX)
//Hardcoding function overloads as correct function types were not being recognized on import
export function selector<T>(options: ReadWriteSelectorOptions<T>): RecoilState<T>;
export function selector<T>(options: ReadOnlySelectorOptions<T>): RecoilValueReadOnly<T>;
export function selector(config: ReadWriteSelectorOptions<any> | ReadOnlySelectorOptions<any>) {
  const { key, get } = config;

  let returnedPromise = false;

  /**
   * If get is undefined, native Async, or transpiled generator-based async from Babel (id'd via RegEx),
   * we don't do any injecting or tracking. It just gets created & returned back out.
   
   * If snapshots.length is greater than 1, the selector is being created following the initial render
   * (i.e. a dynamically generated selector) and will not be tracked - otherwise 
   * will break the imports within test file output. Same logic is being applied to 
   * new atoms as well.
   *
   * Otherwise, we attempt to wrap it with a custom getter that logs the return
   * value on each update to the corresponding snapshot in the snapshots array.
   *
   * If get returns a promise on page load, we delete it from the readables array
   * and do not track it on subsequent calls (via "returnedPromise" flag).
   * 
   */

  if (
    !get ||
    get.constructor.name === 'AsyncFunction' ||
    get.toString().match(/^\s*return\s*_.*\.apply\(this, arguments\);$/m) ||
    snapshots.length > 0
  ) {
    return recoilSelector(config);
  }
  // Wrap get method with tracking logic
  const getter = (arg: any) => {
    // Run user-defined get method & capture its return value
    const newValue = get(arg);
    // Only capture selector data if currently recording
    if (arg.get(recordingState)) {
      if (snapshots.length === 0) {
        // Promise-validation is expensive, so we only do it once, on initial load
        if (
          typeof newValue === 'object' &&
          newValue !== null &&
          newValue.constructor.name === 'Promise'
        ) {
          readables = readables.filter((el) => el.key !== key);
          returnedPromise = true;
        } else {
          initialRender.push({ key, newValue });
        }
      } else if (!returnedPromise) {
        setTimeout(() => snapshots[snapshots.length - 1].selectors.push({ key, newValue }), 0);
      }
    }

    // Return out value from original get method
    return newValue;
  };

  // Create a new config object with updated properties
  const newConfig: SelectorConfig<any> = { key, get: getter };
  if ('set' in config) {
    const { set } = config;
    const setter = (...args: any[]) => {
      // TYPESCRIPT HACK => should be refactored
      const [utils, setValue] = args;
      if (utils.get(recordingState) && setters.length > 0) {
        const newValue = args[1];
        // setTimeout is required to attribute setter to correct state
        setTimeout(() => {
          setters[setters.length - 1].setter = { key, newValue };
        }, 0);
      }
      // TYPESCRIPT HACK pt. 2
      return set(utils, setValue);
    };
    newConfig.set = setter;
    settables.push(key);
  }

  // Create selector & add to readables for test setup
  const trackedSelector = recoilSelector(newConfig);
  readables.push(trackedSelector);
  return trackedSelector;
}

// switching to function declaration
export function atom<T>(config: AtomOptions<T>): RecoilState<T> {
  const newAtom = recoilAtom<any>(config);

  if (snapshots.length > 0) return newAtom;
  writeables.push(newAtom);
  return newAtom;
}

/* atomFamily returns a function that takes in a parameter; when called, the returned function will
 * return a specific atom based on the family template and that can only be accessed by calling the
 * function again with the same parameter
 */

export function atomFamily<T, P extends SerializableParam>(config: AtomFamilyOptions<T, P>) {
  const { key } = config;
  atomFamilies[key] = {};

  return (params: P) => {
    const newAtomFamilyMember = recoilAtomFamily(config)(params);
    const strParams = JSON.stringify(params);
    if (!(strParams in atomFamilies[key])) atomFamilies[key][strParams] = newAtomFamilyMember;
    return newAtomFamilyMember;
  };
}

export function selectorFamily<T, P extends SerializableParam>(
  options: ReadWriteSelectorFamilyOptions<T, P>,
): (param: P) => RecoilState<T>;

export function selectorFamily<T, P extends SerializableParam>(
  options: ReadOnlySelectorFamilyOptions<T, P>,
): (param: P) => RecoilValueReadOnly<T>;

export function selectorFamily(
  config:
    | ReadWriteSelectorFamilyOptions<any, SerializableParam>
    | ReadOnlySelectorFamilyOptions<any, SerializableParam>,
) {
  const { key } = config;
  const configGet = config.get;
  let returnedPromise = false;

  //HIGH PRIORITY: should be checking the returned function from get
  if (
    !configGet ||
    configGet.constructor.name === 'AsyncFunction' ||
    configGet.toString().match(/^\s*return\s*_.*\.apply\(this, arguments\);$/m) ||
    snapshots.length > 0
  ) {
    return recoilSelectorFamily(config);
  }

  const getter = (params: SerializableParam) => (arg: any) => {
    // Run user-defined get method & capture its return value
    const { get } = arg;
    const newValue = configGet(params)(arg);
    // Only capture selector data if currently recording
    if (get(recordingState)) {
      if (snapshots.length === 0) {
        // Promise-validation is expensive, so we only do it once, on initial load
        if (
          typeof newValue === 'object' &&
          newValue !== null &&
          Object.prototype.toString.call(newValue) === '[object Promise]'
        ) {
          delete selectorFamilies[key];
          returnedPromise = true;
        } else {
          initialRenderFamilies.push({ key, params, newValue });
        }
      } else if (!returnedPromise) {
        if (!(params! in selectorFamilies[key].prevParams))
          selectorFamilies[key].prevParams.push(params);
        setTimeout(
          () => snapshots[snapshots.length - 1].selectorFamilies.push({ key, params, newValue }),
          0,
        );
      }
    }
    // Return out value from original get method
    return newValue;
  };

  // Create a new config object with updated properties
  const newConfig: SelectorFamilyConfig<any, SerializableParam> = { key, get: getter };
  if ('set' in config) {
    newConfig.set = (params: SerializableParam) => config.set(params);
  }

  // Create selector generator & add to selectorFamily for test setup
  const trackedSelectorFamily = recoilSelectorFamily(newConfig);
  selectorFamilies[key] = { trackedSelectorFamily, prevParams: [] };
  return trackedSelectorFamily;
}

// ----- TRANSACTION PROVIDER -----
const buttonStyle: CSSProperties = {
  display: 'inline-block',
  margin: '10px',
  padding: '0px',
  height: '10px',
  width: '10px',
};

// Used to ensure appropriate button contrast for varying page backgrounds
const divStyle: CSSProperties = {
  display: 'inline-block',
  position: 'absolute',
  top: '10px',
  left: '10px',
  backgroundColor: 'grey',
  margin: 0,
  padding: 0,
  zIndex: 999999,
};

export const ChromogenObserver: React.FC = () => {
  // File stores URL for generated test file Blob containing output() string
  // Initializing file as undefined over null to match typing for AnchorHTML attributes from React
  const [file, setFile] = useState<undefined | string>(undefined);
  const [recording, setRecording] = useRecoilState<boolean>(recordingState);

  // Auto-click download link when a new file is generated (via button click)
  //! to get around strict null check in tsconfig
  useEffect(() => document.getElementById('chromogen-download')!.click(), [file]);

  useRecoilTransactionObserver_UNSTABLE(
    ({ previousSnapshot, snapshot }: { previousSnapshot: Snapshot; snapshot: Snapshot }): void => {
      // Map current snapshot to array of atom states
      // Can't directly check recording hook b/c TransactionObserver runs before state update
      if (snapshot.getLoadable(recordingState).contents) {
        const state = writeables.map((item) => {
          const { key } = item;
          const value = snapshot.getLoadable(item).contents;
          const previous = previousSnapshot.getLoadable(item).contents;
          const updated = value !== previous;
          return { key, value, previous, updated };
        });

        //TODO: FIX TYPE
        const atomFamilyState: any[] = [];
        for (const family in atomFamilies) {
          const familyMembers = atomFamilies[family];
          for (const member in familyMembers) {
            const memberRecoilState = familyMembers[member];
            let { key } = memberRecoilState;
            /**key will be auto-generated by recoil in the format of
             * [atomFamilyName] + "__" + [params] + "__withFallback"
             * Removing the "__withFallback" suffix to enhance readability
             **/
            key = key.substring(0, key.length - 14);
            const value = snapshot.getLoadable(memberRecoilState).contents;
            const previous = previousSnapshot.getLoadable(memberRecoilState).contents;
            const updated = value !== previous;
            atomFamilyState.push({ family, key, value, updated });
          }
        }
        // Add current transaction snapshot to snapshots array
        snapshots.push({ state, selectors: [], atomFamilyState, selectorFamilies: [] });
        setters.push({ state, setter: null });
      }
    },
  );

  // Render button to DOM for capturing test output, and creates invisible download link for test file
  return (
    <div style={divStyle}>
      <button
        aria-label="capture test"
        style={{ ...buttonStyle, backgroundColor: 'limegreen' }}
        type="button"
        onClick={() =>
          setFile(
            URL.createObjectURL(
              new Blob([
                output(
                  writeables,
                  readables,
                  snapshots,
                  initialRender,
                  initialRenderFamilies,
                  setters,
                  settables,
                  atomFamilies,
                  selectorFamilies,
                ),
              ]),
            ),
          )
        }
      />
      <button
        aria-label={recording ? 'pause' : 'record'}
        style={{ ...buttonStyle, backgroundColor: recording ? 'red' : 'yellow' }}
        type="button"
        onClick={() => {
          setRecording(!recording);
        }}
      />
      <a
        download="chromogen.test.js"
        href={file}
        id="chromogen-download"
        style={{ display: 'none' }}
      >
        Download Test
      </a>
    </div>
  );
};
