/*global QUnit*/
import Controller from "../../../controller/DynamicPageListReport.controller";

QUnit.module("DynamicPageListReport Controller");

QUnit.test("I should test the DynamicPageListReport controller", function (assert: Assert) {
	const oAppController = new Controller("DynamicPageListReport");
	oAppController.onInit();
	assert.ok(oAppController);
});