/* eslint-disable no-console */
import Label from "sap/m/Label";
import MultiComboBox from "sap/m/MultiComboBox";
 import type {
  FilterBar$FilterChangeEventParameters
} from "sap/ui/comp/filterbar/FilterBar";
import FilterBar from "sap/ui/comp/filterbar/FilterBar";
import FilterGroupItem from "sap/ui/comp/filterbar/FilterGroupItem";
import PersonalizableInfo from "sap/ui/comp/smartvariants/PersonalizableInfo";
import SmartVariantManagement from "sap/ui/comp/smartvariants/SmartVariantManagement";
// import Controller from "sap/ui/core/mvc/Controller";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import JSONModel from "sap/ui/model/json/JSONModel";
// import ListBinding from "sap/ui/model/ListBinding";
import Base from "./Base.controller";
import Input from "sap/m/Input";
import TextArea from "sap/m/TextArea";
import MultiInput from "sap/m/MultiInput";
import DatePicker from "sap/m/DatePicker";
import TimePicker from "sap/m/TimePicker";
import ComboBox from "sap/m/ComboBox";
import Select from "sap/m/Select";
import Token from "sap/m/Token";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import type { LeaveRequestItem, ValueHelpItem } from "../types/pages/maint";
import type { ODataError, ODataResponse } from "../types/odata";
import Table from "sap/ui/table/Table";
import MessageToast from "sap/m/MessageToast";
import Button from "sap/m/Button";
import Dialog from "sap/m/Dialog";
import { ValueState } from "sap/ui/core/library";
import Spreadsheet from "sap/ui/export/Spreadsheet";
import { EdmType } from "sap/ui/export/library";
import type { Column } from "../types/utils";

interface IFilterData {
  fieldName: string;
  groupName: string;
  fieldData: string | string[];
}

export default class DynamicPageListReport extends Base {
  private Model: JSONModel | null;
  private SmartVariantManagement: SmartVariantManagement | null;
  private ExpandedLabel: Label | null;
  private SnappedLabel: Label | null;
  private FilterBar: FilterBar | null;
  private Table: Table | null;
  private editDialog: Dialog;
  private addDialog: Dialog;

  private async logLoadedData(jsonModel: JSONModel): Promise<void> {
    await jsonModel.loadData(
      sap.ui.require.toUrl("ui5/app/model/model.json"),
      undefined,
      false
    );
  }

  public override onExit(): void | undefined {
    this.Model = null;
    this.SmartVariantManagement = null;
    this.ExpandedLabel = null;
    this.SnappedLabel = null;
    this.FilterBar = null;
    this.Table = null;
  }

  public override onInit(): void {

    this.setModel(
      new JSONModel({
        Status: [],
        LeaveType: [],
        TimeSlot: [],
      }),
      "master"
    );

    this.setModel(
      new JSONModel({
        rows: [],
        selectedIndices: [],
      }),
      "table"
    );

    this.applyData = this.applyData.bind(this);
    this.fetchData = this.fetchData.bind(this);
    this.getFiltersWithValues = this.getFiltersWithValues.bind(this);

    this.SmartVariantManagement = this.getView()?.byId(
      "svm"
    ) as SmartVariantManagement;
    this.ExpandedLabel = this.getControlById<Label>("expandedLabel");
    this.SnappedLabel = this.getControlById<Label>("snappedLabel");
    this.FilterBar = this.getControlById<FilterBar>("filterBar");
    console.log("FilterBar:", this.FilterBar);
    this.Table = this.getView()?.byId("table") as Table;

    this.FilterBar.registerFetchData(this.fetchData);
    this.FilterBar.registerApplyData(
      this.applyData as unknown as (p1: string, p2: string) => void
    );
    this.FilterBar.registerGetFiltersWithValues(this.getFiltersWithValues);

    let PersInfo = new PersonalizableInfo({
      type: "filterBar",
      keyName: "persistencyKey",
      dataSource: "",
      control: this.FilterBar,
    });
    this.SmartVariantManagement.addPersonalizableControl(PersInfo);
    this.SmartVariantManagement.initialise(() => {}, this.FilterBar);
  }

  // #region Lifecycle hook
  public override onAfterRendering(): void | undefined {
    this.FilterBar?.fireSearch();
    this.onGetMasterData()
      .then(() => {
        console.log("Master data loaded successfully onInit");
      })
      .catch((err) => {
        console.error("Error loading master data:", err);
      });
  }
  // #endregion Lifecycle hook

  public applyData = (aData: IFilterData[]): void => {
    aData.forEach((DataObject) => {
      let control = this.FilterBar?.determineControlByName(
        DataObject.fieldName,
        DataObject.groupName
      );

      switch (true) {
        case this.isControl<Input>(control, "sap.m.Input"):
        case this.isControl<TextArea>(control, "sap.m.TextArea"): {
          control.setValue(<string>DataObject.fieldData);

          break;
        }
        case this.isControl<MultiInput>(control, "sap.m.MultiInput"): {
          const tokens = (<string[]>DataObject.fieldData).map(
            (key) => new Token({ key, text: key })
          );

          control.setTokens(tokens);

          break;
        }
        case this.isControl<DatePicker>(control, "sap.m.DatePicker"):
        case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
          control.setValue(<string>DataObject.fieldData);

          break;
        }
        case this.isControl<Select>(control, "sap.m.Select"):
        case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
          control.setSelectedKey(<string>DataObject.fieldData);

          break;
        }
        case this.isControl<MultiComboBox>(control, "sap.m.MultiComboBox"): {
          control.setSelectedKeys(<string[]>DataObject.fieldData);

          break;
        }
        default:
          break;
      }
    });
  };

  public fetchData = () => {
    return this.FilterBar?.getAllFilterItems(true).reduce<IFilterData[]>(
      (acc, item: FilterGroupItem) => {
        let control = item.getControl();
        let groupName = item.getGroupName();
        let fieldName = item.getName();

        if (control) {
          let fieldData: string | string[] = "";
          switch (true) {
            case this.isControl<Input>(control, "sap.m.Input"):
            case this.isControl<TextArea>(control, "sap.m.TextArea"): {
              fieldData = control.getValue();

              break;
            }
            case this.isControl<MultiInput>(control, "sap.m.MultiInput"): {
              fieldData = control.getTokens().map((token) => token.getKey());

              break;
            }
            case this.isControl<DatePicker>(control, "sap.m.DatePicker"):
            case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
              fieldData = control.getValue();

              break;
            }
            case this.isControl<Select>(control, "sap.m.Select"):
            case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
              fieldData = control.getSelectedKey();

              break;
            }
            case this.isControl<MultiComboBox>(
              control,
              "sap.m.MultiComboBox"
            ): {
              fieldData = control.getSelectedKeys();

              break;
            }
            default:
              break;
          }
          acc.push({
            groupName,
            fieldName,
            fieldData,
          });
        }

        return acc;
      },
      []
    );
  };

  private getFiltersWithValues = (): FilterGroupItem[] | undefined => {
    return this.FilterBar?.getFilterGroupItems().reduce(
      (acc: FilterGroupItem[], oFilterGroupItem: FilterGroupItem) => {
        let control = oFilterGroupItem.getControl();
        if (control) {
          switch (true) {
            case this.isControl<Input>(control, "sap.m.Input"):
            case this.isControl<TextArea>(control, "sap.m.TextArea"): {
              const value = control.getValue();

              if (value) {
                acc.push(oFilterGroupItem);
              }
              break;
            }
            case this.isControl<MultiInput>(control, "sap.m.MultiInput"): {
              const tokens = control.getTokens();

              if (tokens.length) {
                acc.push(oFilterGroupItem);
              }

              break;
            }
            case this.isControl<DatePicker>(control, "sap.m.DatePicker"):
            case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
              const value = control.getValue();

              if (value) {
                acc.push(oFilterGroupItem);
              }

              break;
            }
            case this.isControl<Select>(control, "sap.m.Select"):
            case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
              const value = control.getSelectedKey();

              if (value) {
                acc.push(oFilterGroupItem);
              }

              break;
            }
            case this.isControl<MultiComboBox>(
              control,
              "sap.m.MultiComboBox"
            ): {
              const keys = control.getSelectedKeys();

              if (keys.length) {
                acc.push(oFilterGroupItem);
              }

              break;
            }
            default:
              break;
          }
        }
        return acc;
      },
      []
    );
  };

  public onSelectionChange(
    oEvent: FilterBar$FilterChangeEventParameters
  ): void {
    this.SmartVariantManagement?.currentVariantSetModified(true);
    this.FilterBar?.fireFilterChange(oEvent);
  }

  public onFilterChange(): void {
    this.updateLabelsAndTable();
  }

  public onAfterVariantLoad(): void {
    this.updateLabelsAndTable();
  }

  private updateLabelsAndTable(): void {
    this.Table?.setShowOverlay(true);
    const expandedLabel =
      this.FilterBar?.retrieveFiltersWithValuesAsTextExpanded();
    const snappedLabel = this.FilterBar?.retrieveFiltersWithValuesAsText();
    this.ExpandedLabel?.setText(expandedLabel);
    this.SnappedLabel?.setText(snappedLabel);
  }

  // # listener for change in row selection
  public onRowChange(): void {
    const table = this.byId("table") as Table;
    const SelectedIndices = table.getSelectedIndices();

    const tableModel = this.getView()?.getModel("table") as JSONModel;
    tableModel.setProperty("/selectedIndices", SelectedIndices);
    
    const oEditButton = this.byId("editButton") as Button;
    const oDeleteButton = this.byId("deleteButton") as Button;

    // exactly one row is selected
    const bSingleSelection = SelectedIndices.length === 1;

    oEditButton.setEnabled(bSingleSelection);
    oDeleteButton.setEnabled(bSingleSelection);

    if (bSingleSelection) {
      const Context = table.getContextByIndex(SelectedIndices[0]);
      const path = Context?.getPath() || "unknown";
      console.log(Context?.getObject());
      const SelectedData = Context?.getObject();
      const oEditModel = new JSONModel(Object.assign({}, SelectedData));
      this.getView()?.setModel(oEditModel, "edit");
      MessageToast.show(`Selected row: ${path}`);
    } else if (SelectedIndices.length === 0) {
      MessageToast.show("No item selected");
    } else {
      MessageToast.show(`${SelectedIndices.length} rows selected`);
    }
  }
  // #Local data search function
  // public onSearch() {
  //   let aTableFilters = this.oFilterBar
  //     ?.getFilterGroupItems()
  //     .reduce((aResult: Filter[], oFilterGroupItem: FilterGroupItem) => {
  //       let oControl = oFilterGroupItem.getControl() as MultiComboBox,
  //         aSelectedKeys = oControl.getSelectedKeys(),
  //         aFilters = aSelectedKeys.map((sSelectedKey) => {
  //           return new Filter({
  //             path: oFilterGroupItem.getName(),
  //             operator: FilterOperator.Contains,
  //             value1: sSelectedKey,
  //           });
  //         });

  //       if (aSelectedKeys.length > 0) {
  //         aResult.push(
  //           new Filter({
  //             filters: aFilters,
  //             and: false,
  //           })
  //         );
  //       }

  //       return aResult;
  //     }, []);
  //   console.log("talbe", aTableFilters);

  //   // Apply filter to the table binding
  //   const oBinding = this.oTable?.getBinding("rows") as ListBinding;
  //   oBinding.filter(aTableFilters);

  //   this.oTable?.setShowOverlay(false);
  // }
  // end local
  private getFilters(): Filter[] {
    return (this.FilterBar?.getFilterGroupItems() ?? []).reduce(
      (aResult: Filter[], item: FilterGroupItem) => {
        let control = item.getControl();
        let fieldName = item.getName();

        let fieldData: string | string[] = "";
        if (control) {
          switch (true) {
            case this.isControl<Input>(control, "sap.m.Input"):
            case this.isControl<TextArea>(control, "sap.m.TextArea"): {
              fieldData = control.getValue();

              break;
            }
            case this.isControl<MultiInput>(control, "sap.m.MultiInput"): {
              fieldData = control.getTokens().map((token) => token.getKey());

              break;
            }
            case this.isControl<DatePicker>(control, "sap.m.DatePicker"):
            case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
              fieldData = control.getValue();

              break;
            }
            case this.isControl<Select>(control, "sap.m.Select"):
            case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
              fieldData = control.getSelectedKey();

              break;
            }
            case this.isControl<MultiComboBox>(
              control,
              "sap.m.MultiComboBox"
            ): {
              fieldData = control.getSelectedKeys();

              break;
            }
            default:
              break;
          }
        }
        let aFilters: Filter[] = [];
        if (Array.isArray(fieldData)) {
          // selected is string[]
          aFilters = fieldData.map((sSelectedKey) => {
            return new Filter({
              path: fieldName,
              operator: FilterOperator.Contains,
              value1: sSelectedKey,
            });
          });
        } else if (typeof fieldData === "string" && fieldData !== "") {
          aFilters.push(
            new Filter({
              path: fieldName,
              operator: FilterOperator.EQ,
              value1: fieldData,
            })
          );
        }
        if (fieldData.length > 0) {
          aResult.push(
            new Filter({
              filters: aFilters,
              and: false,
            })
          );
        }
        return aResult;
      },
      []
    );
  }

  // #region Search
  public onSearch() {
    const DataModel = this.getView()?.getModel() as ODataModel;
    const tableModel = this.getView()?.getModel("table") as JSONModel;

    this.Table?.setBusy(true);
    console.log(this.getFilters());

    DataModel.read("/LeaveRequestSet", {
      filters: this.getFilters(),
      urlParameters: {},
      success: (response: ODataResponse<LeaveRequestItem[]>) => {
        this.Table?.setBusy(false);

        tableModel.setProperty("/rows", response.results);
      },
      error: (error: ODataError) => {
        this.Table?.setBusy(false);

        console.error("OData read error:", error);
      },
    });
    this.Table?.setShowOverlay(false);
  }
  public formatStatusState(statusKey: string): ValueState {
    const map: Record<string, ValueState> = {
      "01": ValueState.Information,
      "02": ValueState.Success,
      "03": ValueState.Error,
    };
    return map[statusKey] ?? ValueState.None;
  }

  // #region get MasterData
  private async onGetMasterData(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const DataModel = this.getView()?.getModel() as ODataModel;
      const masterModel = this.getView()?.getModel("master") as JSONModel;

      if (!DataModel) {
        reject("OData model not found");
        return;
      }

      DataModel.read("/FieldValueHelpSet", {
        success: (response: ODataResponse<ValueHelpItem[]>) => {
          const status: ValueHelpItem[] = [];
          const leaveType: ValueHelpItem[] = [];
          const timeSlot: ValueHelpItem[] = [];
          console.log("OData read success:", response.results);
          response.results.forEach((item: ValueHelpItem) => {
            switch (item.FieldName) {
              case "Status":
                status.push(item);
                break;
              case "LeaveType":
                leaveType.push(item);
                break;
              case "TimeSlot":
                timeSlot.push(item);
                break;
              default:
                break;
            }
          });

          masterModel.setProperty("/Status", status);
          masterModel.setProperty("/LeaveType", leaveType);
          masterModel.setProperty("/TimeSlot", timeSlot);

          console.log(" Master data loaded:", masterModel.getData());
          resolve(true);
        },
        error: (error: ODataError) => {
          console.error("Failed to load master data:", error);
          reject(error);
        },
      });
    });
  }

  // # open dialog
  async onOpenAddDialog(): Promise<void> {
    this.addDialog ??= (await this.loadFragment({
      name: "ui5.app.view.AddDialog",
    })) as Dialog;
    this.addDialog.open();
  }
  onCloseAddDialog(): void {
    // note: We don't need to chain to the pDialog promise, since this event-handler
    // is only called from within the loaded dialog itself.
    (this.byId("addDialog") as Dialog)?.close();
  }

  async onOpenEdit(): Promise<void> {
    this.editDialog ??= (await this.loadFragment({
      name: "ui5.app.view.editDialog",
    })) as Dialog;
    this.editDialog.open();
  }
  onCloseEditDialog(): void {
    // note: We don't need to chain to the pDialog promise, since this event-handler
    // is only called from within the loaded dialog itself.
    (this.byId("editDialog") as Dialog)?.close();
  }

  public onExportExcel(): void {
    const Cols: Column[] = [
      { label: "Mã đơn nghỉ", property: "RequestId", type: EdmType.String },
      { label: "Loại phép", property: "LeaveType", type: EdmType.String },
      {
        label: "Ngày bắt đầu",
        property: "StartDate",
        type: EdmType.Date,
        format: "dd.MM.yyyy",
      },
      {
        label: "Ngày kết thúc",
        property: "EndDate",
        type: EdmType.Date,
        format: "dd.MM.yyyy",
      },
      { label: "TimeSlot", property: "TimeSlot", type: EdmType.String },
      { label: "Lý do xin nghỉ", property: "Reason", type: EdmType.String },
      { label: "Trạng thái", property: "Status", type: EdmType.String },
    ];

    const settings = {
      workbook: { columns: Cols },
      dataSource: this.getModel<JSONModel>("table").getProperty("/rows"),
      fileName: "LeaveRequests.xlsx",
      Worker: false,
    };

    const spreadsheet = new Spreadsheet(settings);
    spreadsheet
      .build()
      .then(() => {
        console.log("Spreadsheet export successful");
      })
      .catch((err) => {
        console.error("Spreadsheet export error:", err);
      });
  }
}
