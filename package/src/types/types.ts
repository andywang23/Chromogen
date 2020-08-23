import { RecoilState, RecoilValueReadOnly, RecoilValue, DefaultValue } from 'recoil';

// ----- INITIALIZING NON-IMPORTABLE RECOIL TYPES -----
type GetRecoilValue = <T>(recoilVal: RecoilValue<T>) => T;
type SetRecoilState = <T>(
  recoilVal: RecoilState<T>,
  newVal: T | DefaultValue | ((prevValue: T) => T | DefaultValue),
) => void;
type ResetRecoilState = (recoilVal: RecoilState<any>) => void;
interface atomFamilyMembers {
  [atomName: string]: RecoilState<any>;
}

// ----- EXPORTING TYPES TO BE USED IN SRC/.TSX FILES -----
export type Writeables<T> = Array<RecoilState<T>>;
export type Readables<T> = Array<RecoilValueReadOnly<T> | RecoilState<T>>;
export type SelectorsArr = Array<{ key: string; newValue: any }>;
export type Snapshots = Array<{
  state: { key: string; value: any; updated: boolean }[];
  selectors: SelectorsArr;
  atomFamilyState: any[];
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
export interface atomFamilies {
  [familyName: string]: atomFamilyMembers;
}
