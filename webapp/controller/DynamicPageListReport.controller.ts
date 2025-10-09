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
import Controller from "sap/ui/core/mvc/Controller";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import JSONModel from "sap/ui/model/json/JSONModel";
import ListBinding from "sap/ui/model/ListBinding";

/**
 * @namespace ui5.app.controller
 */
interface IFilterData {
  fieldName: string;
  groupName: string;
  fieldData: string[]; 
}

export default class DynamicPageListReport extends Controller {
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

  public onExit(): void {
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
    this.oSmartVariantManagement.initialise(function () {}, this.oFilterBar);
  }

  public applyData = (aData: IFilterData[]): void => {
  	aData.forEach((oDataObject) => {
				let oControl = this.oFilterBar
        ?.determineControlByName(oDataObject.fieldName, oDataObject.groupName) as MultiComboBox;
				oControl.setSelectedKeys(oDataObject.fieldData);
			}, this);
  };

public fetchData = (): IFilterData[] => {
  const aData: IFilterData[] = this.oFilterBar?.getAllFilterItems(true)
  .map((oFilterItem: FilterGroupItem) => {
    const oControl = oFilterItem.getControl() as MultiComboBox;
    return {
      groupName: oFilterItem.getGroupName(),
      fieldName: oFilterItem.getName(),
      fieldData: oControl.getSelectedKeys()  
    };
  }) ?? [];

  console.log("fetch data", aData);
  return aData;
};

  public getFiltersWithValues = (): FilterGroupItem[] | undefined => {
   	let aFiltersWithValue = this.oFilterBar?.getFilterGroupItems()
    .reduce((aResult : FilterGroupItem[], oFilterGroupItem : FilterGroupItem) => {
				let oControl = oFilterGroupItem.getControl() as MultiComboBox;

				if (oControl && oControl.getSelectedKeys && oControl.getSelectedKeys().length > 0) {
					aResult.push(oFilterGroupItem);
				}

				return aResult;
			}, []);
      console.log("filters with value", aFiltersWithValue);
			return aFiltersWithValue;
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
    const oBinding = this.oTable?.getBinding("items") as ListBinding;
    oBinding.filter(aTableFilters);

    this.oTable?.setShowOverlay(false);
  }

  public onFilterChange(): void {
    this._updateLabelsAndTable();
  }

  public onAfterVariantLoad(): void {
    this._updateLabelsAndTable();
  }

  public getFormattedSummaryText(): string {
    let aFiltersWithValues = this.oFilterBar?.retrieveFiltersWithValues();
    console.log(aFiltersWithValues);

    if (aFiltersWithValues?.length === 0) {
      return "No filters active";
    }

    if (aFiltersWithValues?.length === 1) {
      return (
        aFiltersWithValues?.length +
        " filter active: " +
        aFiltersWithValues?.join(", ")
      );
    }
    return (
      aFiltersWithValues?.length +
      " filters active: " +
      aFiltersWithValues?.join(", ")
    );
  }

  public getFormattedSummaryTextExpanded(): string {
    let aFiltersWithValues = this.oFilterBar?.retrieveFiltersWithValues();

    if (aFiltersWithValues?.length === 0) {
      return "No filters active";
    }

    let sText = aFiltersWithValues?.length + " filters active";
    //   ,aNonVisibleFiltersWithValues =
    //     this.oFilterBar.retrieveNonVisibleFiltersWithValues();

    // if (aFiltersWithValues.length === 1) {
    //   sText = aFiltersWithValues.length + " filter active";
    // }

    // if (
    //   aNonVisibleFiltersWithValues &&
    //   aNonVisibleFiltersWithValues.length > 0
    // ) {
    //   sText += " (" + aNonVisibleFiltersWithValues.length + " hidden)";
    // }

    return sText;
  }

  public _updateLabelsAndTable(): void {
    this.oTable?.setShowOverlay(true);
    this.oExpandedLabel?.setText(this.getFormattedSummaryTextExpanded());
    this.oSnappedLabel?.setText(this.getFormattedSummaryText());
  }
}
