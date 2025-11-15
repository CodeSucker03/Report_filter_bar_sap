/* eslint-disable no-console */
import Label from "sap/m/Label";
import MultiComboBox from "sap/m/MultiComboBox";

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
import type { LeaveRequestForm, LeaveRequestItem, ValueHelpItem } from "../types/pages/maint";
import type { ODataError, ODataResponse } from "../types/odata";

import MessageToast from "sap/m/MessageToast";
import Dialog, { type Dialog$AfterCloseEvent } from "sap/m/Dialog";
import { ValueState } from "sap/ui/core/library";
import Spreadsheet from "sap/ui/export/Spreadsheet";
import { EdmType } from "sap/ui/export/library";
import type { Column } from "../types/utils";

import Table from "sap/ui/table/Table";
import type { FilterBar$FilterChangeEventParameters } from "sap/ui/comp/filterbar/FilterBar";
import FilterGroupItem from "sap/ui/comp/filterbar/FilterGroupItem";
import FilterBar from "sap/ui/comp/filterbar/FilterBar";
import type { RadioButtonGroup$SelectEvent } from "sap/m/RadioButtonGroup";
import type Button from "sap/m/Button";
import MessageBox from "sap/m/MessageBox";
import type Context from "sap/ui/model/Context";
import type { Button$PressEvent } from "sap/m/Button";
import type Router from "sap/ui/core/routing/Router";
import type { Route$MatchedEvent } from "sap/ui/core/routing/Route";

interface IFilterData {
  fieldName: string;
  groupName: string;
  fieldData: string | string[];
}

export default class DynamicPageListReport extends Base {
   // Filters
  private SmartVariantManagement: SmartVariantManagement | null;
  private ExpandedLabel: Label | null;
  private SnappedLabel: Label | null;
  private filterBar: FilterBar | null;

  private table: Table;
  private router: Router;

    // Fragments
  private editRequestDialog: Dialog;
  private createRequestDialog: Dialog;
  

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

    // Filters
    this.SmartVariantManagement = this.getControlById("svm");
    this.ExpandedLabel = this.getControlById<Label>("expandedLabel");
    this.SnappedLabel = this.getControlById<Label>("snappedLabel");
    this.filterBar = this.getControlById<FilterBar>("filterBar");

    this.table = this.getControlById<Table>("table");
    this.router = this.getRouter();

     // Filter initialize
    this.filterBar?.registerFetchData(this.fetchData);
    this.filterBar?.registerApplyData(
      this.applyData as unknown as (p1: string, p2: string) => void
    );
    this.filterBar?.registerGetFiltersWithValues(this.getFiltersWithValues);


    let PersInfo = new PersonalizableInfo({
      type: "filterBar",
      keyName: "persistencyKey",
      dataSource: "",
      control: this.filterBar,
    });
    this.SmartVariantManagement?.addPersonalizableControl(PersInfo);
    this.SmartVariantManagement?.initialise(() => {}, this.filterBar);

     // Router
    this.router.getRoute("DynamicPageListReportRoute")?.attachMatched(this.onObjectMatched);
  }

  // #region Lifecycle hook
  public override onAfterRendering(): void | undefined {
   let sGoButtonId = this.byId("filterBar")?.getId() + "-btnGo";
    
    let oGoButton = this.byId(sGoButtonId) as Button; 

    if (oGoButton) {
        // 1. Change the text
        oGoButton.setText("Tìm kiếm");
        
        // 2. Add an icon
        oGoButton.setIcon("sap-icon://search");
    }
  }

  public override onExit(): void | undefined {
    this.router.getRoute("DynamicPageListReportRoute")?.detachMatched(this.onObjectMatched);
  }
  // #endregion Lifecycle hook


  // #region Router
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onObjectMatched = (event: Route$MatchedEvent) => {
    this.getMetadataLoaded()
      .then(() => this.onGetMasterData())
      .then(() => {
        this.filterBar?.fireSearch();
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        // loading off
      });
  };
  // #endregion Router


  public applyData = (aData: IFilterData[]): void => {
    aData.forEach((DataObject) => {
      let control = this.filterBar?.determineControlByName(
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
    return this.filterBar
      ?.getAllFilterItems(true)
      .reduce<IFilterData[]>((acc, item: FilterGroupItem) => {
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
      }, []);
  };

  private getFiltersWithValues = (): FilterGroupItem[] | undefined => {
    return this.filterBar
      ?.getFilterGroupItems()
      .reduce((acc: FilterGroupItem[], oFilterGroupItem: FilterGroupItem) => {
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
      }, []);
  };

  public onSelectionChange(
    oEvent: FilterBar$FilterChangeEventParameters
  ): void {
    this.SmartVariantManagement?.currentVariantSetModified(true);
    this.filterBar?.fireFilterChange(oEvent);
  }

  public onFilterChange(): void {
    this.updateLabelsAndtable();
  }

  public onAfterVariantLoad(): void {
    this.updateLabelsAndtable();
  }

  private updateLabelsAndtable(): void {
    this.table?.setShowOverlay(true);

    const expandedLabel =
      this.filterBar?.retrieveFiltersWithValuesAsTextExpanded();
    const snappedLabel = this.filterBar?.retrieveFiltersWithValuesAsText();

    this.ExpandedLabel?.setText(expandedLabel);
    this.SnappedLabel?.setText(snappedLabel);
  }

  // #region Listener for change in row selection
  public onRowChange(): void {
    const SelectedIndices = this.table.getSelectedIndices();

    const tableModel = this.getModel("table");
    tableModel.setProperty("/selectedIndices", [...SelectedIndices]);

    // exactly one row is selected
    const SingleSelection = SelectedIndices.length === 1;

    if (SingleSelection) {
      const ContextRow =  this.table.getContextByIndex(SelectedIndices[0]);

      const path = ContextRow?.getPath() || "unknown";

      const SelectedData = ContextRow?.getObject();

      const oEditModel = new JSONModel(Object.assign({}, SelectedData));

      this.setModel(oEditModel, "edit");

      MessageToast.show(`Selected row: ${path}`);

    } else if (SelectedIndices.length === 0) {
      MessageToast.show("No item selected");
    } else {
      MessageToast.show(`${SelectedIndices.length} rows selected`);
    }
  }

  // #Local data search function
  // public onSearch() {
  //   let atableFilters = this.ofilterBar
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
  //   console.log("talbe", atableFilters);

  //   // Apply filter to the table binding
  //   const oBinding = this.otable?.getBinding("rows") as ListBinding;
  //   oBinding.filter(atableFilters);

  //   this.otable?.setShowOverlay(false);
  // }
  // end local

  private getFilters(): Filter[] {
    return (this.filterBar?.getFilterGroupItems() ?? []).reduce(
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
    const DataModel = this.getModel<ODataModel>();
    const tableModel = this.getModel("table");

    this.table?.setBusy(true);
    console.log(this.getFilters());

    DataModel.read("/LeaveRequestSet", {
      filters: this.getFilters(),
      urlParameters: {},
      success: (response: ODataResponse<LeaveRequestItem[]>) => {
        this.table?.setBusy(false);

        tableModel.setProperty("/rows", response.results);
      },
      error: (error: ODataError) => {
        this.table?.setBusy(false);

        console.error("OData read error:", error);
      },
    });
    this.table?.setShowOverlay(false);
  }

 

  // #region get MasterData
  private async onGetMasterData(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const DataModel = this.getModel<ODataModel>();
      const masterModel = this.getModel("master");

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

  // async onOpencreateRequestDialog(): Promise<void> {
  //   this.createRequestDialog ??= await this.loadView("createRequestDialog");
  //   this.createRequestDialog.open();
  // }

  // onClosecreateRequestDialog(): void {
  //   (this.byId("createRequestDialog") as Dialog)?.close();
  // }

  // async onOpenEdit(): Promise<void> {
  //   this.editRequestDialog ??= await this.loadView("editRequestDialog");
  //   this.editRequestDialog.open();
  // }

  // onCloseeditRequestDialog(): void {
  //   // note: We don't need to chain to the pDialog promise, since this event-handler
  //   // is only called from within the loaded dialog itself.
  //   (this.byId("editRequestDialog") as Dialog)?.close();
  // }

   private onRefresh() {
    this.filterBar?.fireSearch();
  }


  // #region Open Edit Dialog
  public async onOpenEditRequest() {
   
    try {
      if (!this.editRequestDialog) {
        this.editRequestDialog = await this.loadView<Dialog>("EditRequest");
      }
        const indices = this.table?.getSelectedIndices();

        const SelectedItem = <LeaveRequestForm>this.table.getContextByIndex(indices[0])?.getObject();

        const form = {
          ...SelectedItem,
          StartDate: this.formatter.formatDate(SelectedItem.StartDate),
          EndDate: this.formatter.formatDate(SelectedItem.EndDate),
          TimeSlotIndex: this.timeSlotToIndex(SelectedItem.TimeSlot)
        };

        this.editRequestDialog.setModel(new JSONModel(form),"form");

        this.editRequestDialog.open();
    } catch (error) {
      console.log(error);
    }
  }

  public onCloseEditRequest(){
    this.editRequestDialog?.close();
  }

  public onSubmitEditRequest(event : Button$PressEvent) {
    const control = event.getSource();
    const dialog = <Dialog>control.getParent();

    const formModel = <JSONModel>dialog.getModel("form");
    const formData = <LeaveRequestForm>formModel.getData();

    const oDataModel = this.getModel<ODataModel>();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { LeaveType, StartDate, EndDate, Reason, TimeSlot } = formData;

    dialog.setBusy(true);
    oDataModel.update(
      "/LeaveRequestSet",
      {
        LeaveType,
        StartDate: this.formatter.toUTCDate(StartDate),
        EndDate: this.formatter.toUTCDate(EndDate),
        Reason,
        TimeSlot
      },
      {
        success: (response: ODataResponse<LeaveRequestItem>) => {
          dialog.setBusy(false);
          console.log(response);

          MessageToast.show("Leave request updated successfully.");

          this.onCloseCreateRequest();

          this.onRefresh();
        },
        error: (error: ODataError) => {
          console.log(error);

          dialog.setBusy(false);
        },
      }
    );
 }
  
  // #region Create request dialog
  public async onOpenCreateRequest() {
    try {
      if (!this.createRequestDialog) {
        this.createRequestDialog = await this.loadView<Dialog>("CreateRequest");
      }

      this.createRequestDialog.setModel(
        new JSONModel({
          LeaveType: "",
          StartDate: "",
          EndDate: "",
          Reason: "",
          TimeSlot: "",
          TimeSlotIndex: 0
        } satisfies LeaveRequestForm),
        "form"
      );

      this.createRequestDialog.open();
    } catch (error) {
      console.log(error);
    }
  }


  public onCloseCreateRequest() {
    this.createRequestDialog?.close();
  }

  public onAfterCloseCreateRequest(event: Dialog$AfterCloseEvent) {
    const dialog = event.getSource();

    dialog.setModel(null, "form");
  }

  public onSubmitCreateRequest(event: Button$PressEvent) {
    const control = event.getSource();
    const dialog = <Dialog>control.getParent();

    const formModel = <JSONModel>dialog.getModel("form");
    const formData = <LeaveRequestForm>formModel.getData();

    const oDataModel = this.getModel<ODataModel>();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { LeaveType, StartDate, EndDate, Reason, TimeSlot } = formData;

    dialog.setBusy(true);
    oDataModel.create(
      "/LeaveRequestSet",
      {
        LeaveType,
        StartDate: this.formatter.toUTCDate(StartDate),
        EndDate: this.formatter.toUTCDate(EndDate),
        Reason,
        TimeSlot: "01",
        Status: "01", // New
      },
      {
        success: (response: ODataResponse<LeaveRequestItem>) => {
          dialog.setBusy(false);
          console.log(response);

          MessageToast.show("Leave request created successfully.");

          this.onCloseCreateRequest();

          this.onRefresh();
        },
        error: (error: ODataError) => {
          console.log(error);

          dialog.setBusy(false);
        },
      }
    );
  }
  // #endregion Create

  // #region Delete
  public onDeleteRequest() {
    const oDataModel = this.getModel<ODataModel>();

    const indices = this.table?.getSelectedIndices();

    if (!indices?.length) {
      MessageToast.show("Please select at least one request to delete.");
      return;
    }

    const item = <LeaveRequestItem>this.table?.getContextByIndex(indices[0])?.getObject();

    MessageBox.confirm("Do you want to delete this request?", {
      actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
      emphasizedAction: MessageBox.Action.DELETE,
      onClose: (action: unknown) => {
        if (action === MessageBox.Action.DELETE) {
          const key = oDataModel.createKey("/LeaveRequestSet", item);

          oDataModel.remove(key, {
            success: () => {
              MessageToast.show("Leave request deleted successfully.");

              this.onRefresh();
            },
            error: (error: ODataError) => {
              console.log(error);
              MessageBox.error("Failed to delete the leave request.");
            },
          });
        }
      },
    });
  }
  // #endregion Delete
  // #endregion Event handlers

  // #region Validation
  public onRadioSelectionChange(event: RadioButtonGroup$SelectEvent) {
    const control = event.getSource();

    const context = <Context>control.getBindingContext("form");
    const formModel = <JSONModel>context.getModel();
    const path = context.getPath();

    const selectedIndex = control.getSelectedIndex();

    const options = <ValueHelpItem[]>this.getModel("master").getProperty("/TimeSlot");

    const { FieldKey } = options[selectedIndex];

    formModel.setProperty(`${path}/TimeSlot`, FieldKey);
    console.log(path);
  }
  // #endregion Validation


  // Excel export
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
  // end


  // #Convert string to int for timeslot
  public timeSlotToIndex(sValue: string): number {
    if (!sValue) {
      return 0;
    }
    return parseInt(sValue, 10) - 1;
  }

  public indexToTimeSlot(iIndex: number): string {
    return (iIndex + 1).toString().padStart(2, "0");
  }

  public onTimeSlotSelect(event: RadioButtonGroup$SelectEvent): void {
    const selectedIndex = event.getSource().getSelectedIndex();
    const newValue = this.indexToTimeSlot(selectedIndex);

    this.getModel("edit").setProperty("/TimeSlot", newValue);
  }
  // end

   // Format Function
  public formatStatusState(statusKey: string): ValueState {
    const map: Record<string, ValueState> = {
      "01": ValueState.Information,
      "02": ValueState.Success,
      "03": ValueState.Error,
    };
    return map[statusKey] ?? ValueState.None;
  }
}
