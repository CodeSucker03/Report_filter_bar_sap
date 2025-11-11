/* eslint-disable linebreak-style */
export type Dict<T = unknown> = { [key: string]: T };
export interface ComponentData {
  startupParameters: Dict<string>;
}