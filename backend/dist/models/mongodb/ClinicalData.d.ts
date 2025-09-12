import mongoose, { Document } from 'mongoose';
export interface IClinicalData extends Document {
    patient_id: string;
    data_type: 'lab_result' | 'imaging' | 'vital_signs' | 'symptoms' | 'diagnosis' | 'treatment_plan';
    data: Record<string, any>;
    metadata?: {
        source?: string;
        device?: string;
        location?: string;
        notes?: string;
        [key: string]: any;
    };
    created_at: Date;
    updated_at: Date;
    created_by: string;
}
export declare const ClinicalData: mongoose.Model<IClinicalData, {}, {}, {}, mongoose.Document<unknown, {}, IClinicalData, {}, {}> & IClinicalData & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default ClinicalData;
//# sourceMappingURL=ClinicalData.d.ts.map