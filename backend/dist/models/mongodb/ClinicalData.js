"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicalData = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ClinicalDataSchema = new mongoose_1.Schema({
    patient_id: {
        type: String,
        required: true,
        index: true
    },
    data_type: {
        type: String,
        required: true,
        enum: ['lab_result', 'imaging', 'vital_signs', 'symptoms', 'diagnosis', 'treatment_plan'],
        index: true
    },
    data: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    created_at: {
        type: Date,
        default: Date.now,
        index: true
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    created_by: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'clinical_data'
});
// Compound indexes for better query performance
ClinicalDataSchema.index({ patient_id: 1, data_type: 1 });
ClinicalDataSchema.index({ patient_id: 1, created_at: -1 });
ClinicalDataSchema.index({ data_type: 1, created_at: -1 });
// Pre-save middleware to update updated_at
ClinicalDataSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});
exports.ClinicalData = mongoose_1.default.model('ClinicalData', ClinicalDataSchema);
exports.default = exports.ClinicalData;
