/* eslint-disable no-console */
import Label from "sap/m/Label";
import MultiComboBox from "sap/m/MultiComboBox";
import Table from "sap/m/Table";
import FilterBar, {
  FilterBar$FilterChangeEventParameters,
} from "sap/ui/comp/filterbar/FilterBar";
import FilterGroupItem from "sap/ui/comp/filterbar/FilterGroupItem";
import PersonalizableInfo from "sap/ui/comp/smartvariants/PersonalizableInfo";
import SmartVariantManagement from "sap/ui/comp/smartvariants/SmartVariantManagement";
// import Controller from "sap/ui/core/mvc/Controller";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import JSONModel from "sap/ui/model/json/JSONModel";
import ListBinding from "sap/ui/model/ListBinding";
import Base from "./Base.controller";
import Input from "sap/m/Input";
import TextArea from "sap/m/TextArea";
import MultiInput from "sap/m/MultiInput";
import DatePicker from "sap/m/DatePicker";
import TimePicker from "sap/m/TimePicker";
import ComboBox from "sap/m/ComboBox";
import Select from "sap/m/Select";
import Token from "sap/m/Token";

interface IFilterData {
  fieldName: string;
  groupName: string;
  fieldData: string | string[];
}

export default class DynamicPageListReport extends Base {
  private oModel: JSONModel | null;
  private oSmartVariantManagement: SmartVariantManagement | null;
  private oExpandedLabel: Label | null;
  private oSnappedLabel: Label | null;
  private oFilterBar: FilterBar | null;
  private oTable: Table | null;

  private async logLoadedData(jsonModel: JSONModel): Promise<void> {
    await jsonModel.loadData(
      sap.ui.require.toUrl("ui5/app/model/model.json"),
      undefined,
      false
    );
  }

  public onExit(): void | undefined {
    this.oModel = null;
    this.oSmartVariantManagement = null;
    this.oExpandedLabel = null;
    this.oSnappedLabel = null;
    this.oFilterBar = null;
    this.oTable = null;
  }

  public onInit(): void {
    this.oModel = new JSONModel();
    this.logLoadedData(this.oModel)
      .then(() => console.log(this.oModel))
      .catch((err) => console.error(err));

    this.getView()?.setModel(this.oModel);

    this.applyData = this.applyData.bind(this);
    this.fetchData = this.fetchData.bind(this);
    this.getFiltersWithValues = this.getFiltersWithValues.bind(this);

    this.oSmartVariantManagement = this.getView()?.byId(
      "svm"
    ) as SmartVariantManagement;
    this.oExpandedLabel = this.getView()?.byId("expandedLabel") as Label;
    this.oSnappedLabel = this.getView()?.byId("snappedLabel") as Label;
    this.oFilterBar = this.getView()?.byId("filterbar") as FilterBar;
    this.oTable = this.getView()?.byId("table") as Table;

    this.oFilterBar.registerFetchData(this.fetchData);
    this.oFilterBar.registerApplyData(
      this.applyData as unknown as (p1: string, p2: string) => void
    );
    this.oFilterBar.registerGetFiltersWithValues(this.getFiltersWithValues);

    let oPersInfo = new PersonalizableInfo({
      type: "filterBar",
      keyName: "persistencyKey",
      dataSource: "",
      control: this.oFilterBar,
    });
    this.oSmartVariantManagement.addPersonalizableControl(oPersInfo);
    this.oSmartVariantManagement.initialise(() => {}, this.oFilterBar);
  }

  public applyData = (aData: IFilterData[]): void => {
    aData.forEach((oDataObject) => {
      let control = this.oFilterBar?.determineControlByName(
        oDataObject.fieldName,
        oDataObject.groupName
      );

      switch (true) {
        case this.isControl<Input>(control, "sap.m.Input"):
        case this.isControl<TextArea>(control, "sap.m.TextArea"): {
          control.setValue(<string>oDataObject.fieldData);

          break;
        }
        case this.isControl<MultiInput>(control, "sap.m.MultiInput"): {
          const tokens = (<string[]>oDataObject.fieldData).map(
            (key) => new Token({ key, text: key })
          );

          control.setTokens(tokens);

          break;
        }
        case this.isControl<DatePicker>(control, "sap.m.DatePicker"):
        case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
          control.setValue(<string>oDataObject.fieldData);

          break;
        }
        case this.isControl<Select>(control, "sap.m.Select"):
        case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
          control.setSelectedKey(<string>oDataObject.fieldData);

          break;
        }
        case this.isControl<MultiComboBox>(control, "sap.m.MultiComboBox"): {
          control.setSelectedKeys(<string[]>oDataObject.fieldData);

          break;
        }
        default:
          break;
      }
    });
  };

  public fetchData = () => {
    return this.oFilterBar
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
    return this.oFilterBar
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
    this.oSmartVariantManagement?.currentVariantSetModified(true);
    this.oFilterBar?.fireFilterChange(oEvent);
  }

  public onSearch() {
    let aTableFilters = this.oFilterBar
      ?.getFilterGroupItems()
      .reduce((aResult: Filter[], oFilterGroupItem: FilterGroupItem) => {
        let oControl = oFilterGroupItem.getControl() as MultiComboBox,
          aSelectedKeys = oControl.getSelectedKeys(),
          aFilters = aSelectedKeys.map((sSelectedKey) => {
            return new Filter({
              path: oFilterGroupItem.getName(),
              operator: FilterOperator.Contains,
              value1: sSelectedKey,
            });
          });

        if (aSelectedKeys.length > 0) {
          aResult.push(
            new Filter({
              filters: aFilters,
              and: false,
            })
          );
        }

        return aResult;
      }, []);
    console.log("talbe", aTableFilters);

    // Apply filter to the table binding
    const oBinding = this.oTable?.getBinding("rows") as ListBinding;
    oBinding.filter(aTableFilters);

    this.oTable?.setShowOverlay(false);
  }

  public onFilterChange(): void {
    this.updateLabelsAndTable();
  }

  public onAfterVariantLoad(): void {
    this.updateLabelsAndTable();
  }

  // public getFormattedSummaryText(): string {
  //   let aFiltersWithValues = this.oFilterBar?.retrieveFiltersWithValues();
  //   console.log(aFiltersWithValues);

  //   if (aFiltersWithValues?.length === 0) {
  //     return "No filters active";
  //   }

  //   if (aFiltersWithValues?.length === 1) {
  //     return (
  //       aFiltersWithValues?.length +
  //       " filter active: " +
  //       aFiltersWithValues?.join(", ")
  //     );
  //   }
  //   return (
  //     aFiltersWithValues?.length +
  //     " filters active: " +
  //     aFiltersWithValues?.join(", ")
  //   );
  // }

  // public getFormattedSummaryTextExpanded(): string {
  //   let aFiltersWithValues = this.oFilterBar?.retrieveFiltersWithValues();

  //   if (aFiltersWithValues?.length === 0) {
  //     return "No filters active";
  //   }

  //   let sText = aFiltersWithValues?.length + " filters active";
  //   //   ,aNonVisibleFiltersWithValues =
  //   //     this.oFilterBar.retrieveNonVisibleFiltersWithValues();

  //   // if (aFiltersWithValues.length === 1) {
  //   //   sText = aFiltersWithValues.length + " filter active";
  //   // }

  //   // if (
  //   //   aNonVisibleFiltersWithValues &&
  //   //   aNonVisibleFiltersWithValues.length > 0
  //   // ) {
  //   //   sText += " (" + aNonVisibleFiltersWithValues.length + " hidden)";
  //   // }

  //   return sText;
  // }

  private updateLabelsAndTable(): void {
    this.oTable?.setShowOverlay(true);
    const expandedLabel =
      this.oFilterBar?.retrieveFiltersWithValuesAsTextExpanded();
    const snappedLabel = this.oFilterBar?.retrieveFiltersWithValuesAsText();
    this.oExpandedLabel?.setText(expandedLabel);
    this.oSnappedLabel?.setText(snappedLabel);
  }
}
