"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoModels = exports.SyncEvent = exports.DocumentMetadata = exports.AuditLog = exports.Analytics = exports.ClinicalData = void 0;
// MongoDB Models Export
var ClinicalData_1 = require("./ClinicalData");
Object.defineProperty(exports, "ClinicalData", { enumerable: true, get: function () { return ClinicalData_1.ClinicalData; } });
var Analytics_1 = require("./Analytics");
Object.defineProperty(exports, "Analytics", { enumerable: true, get: function () { return Analytics_1.Analytics; } });
var AuditLog_1 = require("./AuditLog");
Object.defineProperty(exports, "AuditLog", { enumerable: true, get: function () { return AuditLog_1.AuditLog; } });
var DocumentMetadata_1 = require("./DocumentMetadata");
Object.defineProperty(exports, "DocumentMetadata", { enumerable: true, get: function () { return DocumentMetadata_1.DocumentMetadata; } });
var SyncEvent_1 = require("./SyncEvent");
Object.defineProperty(exports, "SyncEvent", { enumerable: true, get: function () { return SyncEvent_1.SyncEvent; } });
// Re-export all models for convenience
const ClinicalData_2 = require("./ClinicalData");
const Analytics_2 = require("./Analytics");
const AuditLog_2 = require("./AuditLog");
const DocumentMetadata_2 = require("./DocumentMetadata");
const SyncEvent_2 = require("./SyncEvent");
exports.mongoModels = {
    ClinicalData: ClinicalData_2.ClinicalData,
    Analytics: Analytics_2.Analytics,
    AuditLog: AuditLog_2.AuditLog,
    DocumentMetadata: DocumentMetadata_2.DocumentMetadata,
    SyncEvent: SyncEvent_2.SyncEvent
};
exports.default = exports.mongoModels;
