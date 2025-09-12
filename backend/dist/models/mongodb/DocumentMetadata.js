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
exports.DocumentMetadata = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const DocumentMetadataSchema = new mongoose_1.Schema({
    filename: {
        type: String,
        required: true
    },
    file_type: {
        type: String,
        required: true,
        index: true
    },
    file_size: {
        type: Number,
        required: true
    },
    file_path: {
        type: String,
        required: true,
        unique: true
    },
    patient_id: {
        type: String,
        index: true
    },
    visit_id: {
        type: String,
        index: true
    },
    created_at: {
        type: Date,
        default: Date.now,
        index: true
    },
    created_by: {
        type: String,
        required: true,
        index: true
    },
    tags: {
        type: [String],
        default: [],
        index: true
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    }
}, {
    collection: 'document_metadata'
});
// Compound indexes for better query performance
DocumentMetadataSchema.index({ patient_id: 1, created_at: -1 });
DocumentMetadataSchema.index({ visit_id: 1, created_at: -1 });
DocumentMetadataSchema.index({ file_type: 1, created_at: -1 });
DocumentMetadataSchema.index({ tags: 1 });
exports.DocumentMetadata = mongoose_1.default.model('DocumentMetadata', DocumentMetadataSchema);
exports.default = exports.DocumentMetadata;
