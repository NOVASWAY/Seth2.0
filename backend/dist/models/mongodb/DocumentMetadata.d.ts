import mongoose, { Document } from 'mongoose';
export interface IDocumentMetadata extends Document {
    filename: string;
    file_type: string;
    file_size: number;
    file_path: string;
    patient_id?: string;
    visit_id?: string;
    created_at: Date;
    created_by: string;
    tags: string[];
    metadata?: {
        original_name?: string;
        mime_type?: string;
        checksum?: string;
        dimensions?: {
            width?: number;
            height?: number;
        };
        [key: string]: any;
    };
}
export declare const DocumentMetadata: mongoose.Model<IDocumentMetadata, {}, {}, {}, mongoose.Document<unknown, {}, IDocumentMetadata, {}, {}> & IDocumentMetadata & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default DocumentMetadata;
//# sourceMappingURL=DocumentMetadata.d.ts.map