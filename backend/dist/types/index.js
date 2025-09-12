"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["RECEPTIONIST"] = "RECEPTIONIST";
    UserRole["NURSE"] = "NURSE";
    UserRole["CLINICAL_OFFICER"] = "CLINICAL_OFFICER";
    UserRole["PHARMACIST"] = "PHARMACIST";
    UserRole["INVENTORY_MANAGER"] = "INVENTORY_MANAGER";
    UserRole["CLAIMS_MANAGER"] = "CLAIMS_MANAGER";
    UserRole["LAB_TECHNICIAN"] = "LAB_TECHNICIAN";
    UserRole["CASHIER"] = "CASHIER";
})(UserRole || (exports.UserRole = UserRole = {}));
// Visit types
var VisitStatus;
(function (VisitStatus) {
    VisitStatus["SCHEDULED"] = "SCHEDULED";
    VisitStatus["IN_PROGRESS"] = "IN_PROGRESS";
    VisitStatus["COMPLETED"] = "COMPLETED";
    VisitStatus["CANCELLED"] = "CANCELLED";
    VisitStatus["NO_SHOW"] = "NO_SHOW";
    VisitStatus["TRIAGED"] = "TRIAGED";
    VisitStatus["REGISTERED"] = "REGISTERED";
    VisitStatus["WAITING_CONSULTATION"] = "WAITING_CONSULTATION";
    VisitStatus["IN_CONSULTATION"] = "IN_CONSULTATION";
    VisitStatus["WAITING_PHARMACY"] = "WAITING_PHARMACY";
    VisitStatus["WAITING_LAB"] = "WAITING_LAB";
    VisitStatus["LAB_RESULTS_READY"] = "LAB_RESULTS_READY";
})(VisitStatus || (exports.VisitStatus = VisitStatus = {}));
