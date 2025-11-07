/* eslint-disable no-console */
import Controller from "sap/ui/core/mvc/Controller";

/**
 * @namespace ui5.app.controller
 */
export default class App extends Controller {
  /*eslint-disable @typescript-eslint/no-empty-function*/
  public onInit(): void {
    sap.ui.require(
      ["sap/ui/export/Spreadsheet"],
      function (Spreadsheet: unknown) {
        console.log("sap.ui.export loaded ✅", Spreadsheet);
      },
      function (err) {
        console.error("sap.ui.export NOT loaded ❌", err);
      }
    );
    sap.ui.require(
      ["sap/ui/comp/smarttable/SmartTable"],
      function (SmartTable: unknown) {
        console.log("Loaded", SmartTable);
      },
      function (err) {
        console.error("Cannot load sap.ui.comp", err);
      }
    );
  }
}
