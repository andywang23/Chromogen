import {
  RecoilState,
  RecoilValueReadOnly,
  RecoilValue,
  DefaultValue,
  SerializableParam,
} from 'recoil';

// ----- INITIALIZING NON-IMPORTABLE RECOIL TYPES -----
type SetRecoilState = <T>(
  recoilVal: RecoilState<T>,
  newVal: T | DefaultValue | ((prevValue: T) => T | DefaultValue),
) => void;
type ResetRecoilState = (recoilVal: RecoilState<any>) => void;
interface AtomFamilyMembers {
  [atomName: string]: RecoilState<any>;
}
interface SelectorFamilyMembers<T, P> {
  generator: (param: P) => RecoilState<T> | RecoilValueReadOnly<T>;
  prevParams: Array<any>;
}

// ----- EXPORTING TYPES TO BE USED IN SRC/.TSX FILES -----
export type GetRecoilValue = <T>(recoilVal: RecoilValue<T>) => T;
export type Writeables<T> = Array<RecoilState<T>>;
export type Readables<T> = Array<RecoilValueReadOnly<T> | RecoilState<T>>;
export type SelectorsArr = Array<{ key: string; newValue: any }>;
export type Snapshots = Array<{
  state: { key: string; value: any; updated: boolean }[];
  selectors: SelectorsArr;
  atomFamilyState: any[];
  selectorFamilies: any[];
}>;
export interface SelectorConfig<T> {
  key: string;
  get: (opts: { get: GetRecoilValue }) => T | Promise<T> | RecoilValue<T>;
  set?: (
    opts: { get: GetRecoilValue; set: SetRecoilState; reset: ResetRecoilState },
    newValue: T | DefaultValue,
  ) => void;
  dangerouslyAllowMutability?: boolean;
}
export interface AtomFamilies {
  [familyName: string]: AtomFamilyMembers;
}
export interface SelectorFamilyConfig<T, P extends SerializableParam> {
  key: string;
  get: (param: P) => (opts: { get: GetRecoilValue }) => Promise<T> | RecoilValue<T> | T;
  set?: (
    param: P,
  ) => (
    opts: { set: SetRecoilState; get: GetRecoilValue; reset: ResetRecoilState },
    newValue: T | DefaultValue,
  ) => void;
  // cacheImplementation_UNSTABLE?: () => CacheImplementation<Loadable<T>>,
  // cacheImplementationForParams_UNSTABLE?: () => CacheImplementation<
  //   RecoilValue<T>,
  // >,
  dangerouslyAllowMutability?: boolean;
}

export interface SelectorFamilies<T, P> {
  [familyName: string]: SelectorFamilyMembers<T, P>;
}
