/* eslint-disable linebreak-style */
import { EdmType } from "sap/ui/export/library";
/* eslint-disable linebreak-style */
export type Dict<T = unknown> = { [key: string]: T };
export interface ComponentData {
  startupParameters: Dict<string>;
}

export type Column = {
  label?: string | undefined;
  property?: string | string[] | undefined;
  type?:
    | EdmType
    | "Currency"
    | "BigNumber"
    | "Boolean"
    | "Date"
    | "DateTime"
    | "Enumeration"
    | "Number"
    | "Percentage"
    | "String"
    | "Time"
    | "Timezone"
    | undefined;
  width?: number;
  textAlign?: string;
  scale?: number;
  autoScale?: boolean;
  delimiter?: boolean;
  unit?: string;
  unitProperty?: string;
  displayUnit?: boolean;
  trueValue?: string;
  falseValue?: string;
  template?: string;
  format?: string;
  inputFormat?: string;
  utc?: boolean;
  timezone?: string;
  timezoneProperty?: string;
  displayTimezone?: boolean;
  valueMap?: object;
  wrap?: boolean;
};