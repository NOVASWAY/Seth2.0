"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHAWorkflowService = void 0;
const database_1 = require("../config/database");
const SHAService_1 = require("./SHAService");
const crypto_1 = __importDefault(require("crypto"));
class SHAWorkflowService {
    constructor() {
        this.shaService = new SHAService_1.SHAService();
    }
    async initializeSHAWorkflow(claimId, initiatedBy) {
        const client = await database_1.pool.connect();
        try {
            await client.query("BEGIN");
            const workflowId = crypto_1.default.randomUUID();
            await client.query(`INSERT INTO sha_workflow_instances (
          id, claim_id, workflow_type, current_step, overall_status,
          initiated_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                workflowId,
                claimId,
                'SHA_CLAIM_PROCESSING',
                'claim_creation',
                'in_progress',
                initiatedBy,
                new Date(),
                new Date()
            ]);
            const steps = this.getDefaultSHAWorkflowSteps();
            for (const step of steps) {
                await client.query(`INSERT INTO sha_workflow_steps (
            id, workflow_id, step_name, step_order, status, required,
            automated, estimated_duration_minutes, prerequisites, next_steps,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
                    crypto_1.default.randomUUID(),
                    workflowId,
                    step.step_name,
                    step.step_order,
                    step.status,
                    step.required,
                    step.automated,
                    step.estimated_duration_minutes,
                    JSON.stringify(step.prerequisites),
                    JSON.stringify(step.next_steps),
                    new Date(),
                    new Date()
                ]);
            }
            await this.startWorkflowStep(workflowId, 'claim_creation', initiatedBy, client);
            await client.query("COMMIT");
            return await this.getWorkflowInstance(workflowId);
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    async completeWorkflowStep(workflowId, stepName, completedBy, notes, autoAdvance = true) {
        const client = await database_1.pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(`UPDATE sha_workflow_steps 
         SET status = 'completed',
             completed_by = $1,
             completed_at = CURRENT_TIMESTAMP,
             actual_duration_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) / 60,
             notes = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE workflow_id = $3 AND step_name = $4`, [completedBy, notes, workflowId, stepName]);
            await this.logWorkflowActivity(workflowId, stepName, 'STEP_COMPLETED', completedBy, {
                notes,
                completed_at: new Date()
            }, client);
            if (autoAdvance) {
                const nextStep = await this.getNextWorkflowStep(workflowId, stepName, client);
                if (nextStep) {
                    await this.startWorkflowStep(workflowId, nextStep.step_name, completedBy, client);
                    await client.query(`UPDATE sha_workflow_instances 
             SET current_step = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`, [nextStep.step_name, workflowId]);
                }
                else {
                    await client.query(`UPDATE sha_workflow_instances 
             SET overall_status = 'completed',
                 completed_at = CURRENT_TIMESTAMP,
                 completed_by = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`, [completedBy, workflowId]);
                    await this.logWorkflowActivity(workflowId, null, 'WORKFLOW_COMPLETED', completedBy, {
                        completion_time: new Date()
                    }, client);
                }
            }
            await client.query("COMMIT");
            return await this.getWorkflowInstance(workflowId);
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    async processAutomatedSteps(workflowId, triggeredBy) {
        const workflow = await this.getWorkflowInstance(workflowId);
        for (const step of workflow.steps) {
            if (step.status === 'pending' && step.automated) {
                try {
                    await this.executeAutomatedStep(workflowId, step, triggeredBy);
                }
                catch (error) {
                    console.error(`Failed to execute automated step ${step.step_name}:`, error);
                    await database_1.pool.query(`UPDATE sha_workflow_steps 
             SET status = 'failed',
                 notes = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE workflow_id = $2 AND step_name = $3`, [error instanceof Error ? error.message : 'Unknown error', workflowId, step.step_name]);
                    break;
                }
            }
        }
    }
    async getWorkflowInstance(workflowId) {
        const workflowResult = await database_1.pool.query(`SELECT wi.*, c.claim_number, p.first_name || ' ' || p.last_name as patient_name
       FROM sha_workflow_instances wi
       JOIN sha_claims c ON wi.claim_id = c.id
       JOIN patients p ON c.patient_id = p.id
       WHERE wi.id = $1`, [workflowId]);
        if (workflowResult.rows.length === 0) {
            throw new Error("Workflow instance not found");
        }
        const workflow = workflowResult.rows[0];
        const stepsResult = await database_1.pool.query(`SELECT ws.*, u1.username as assigned_to_name, u2.username as completed_by_name
       FROM sha_workflow_steps ws
       LEFT JOIN users u1 ON ws.assigned_to = u1.id
       LEFT JOIN users u2 ON ws.completed_by = u2.id
       WHERE ws.workflow_id = $1
       ORDER BY ws.step_order`, [workflowId]);
        workflow.steps = stepsResult.rows.map(row => ({
            ...row,
            prerequisites: JSON.parse(row.prerequisites || '[]'),
            next_steps: JSON.parse(row.next_steps || '[]')
        }));
        return workflow;
    }
    async getWorkflows(filters) {
        let whereClause = "WHERE 1=1";
        const params = [];
        let paramCount = 1;
        if (filters.status) {
            whereClause += ` AND wi.overall_status = $${paramCount++}`;
            params.push(filters.status);
        }
        if (filters.claimId) {
            whereClause += ` AND wi.claim_id = $${paramCount++}`;
            params.push(filters.claimId);
        }
        if (filters.dateFrom) {
            whereClause += ` AND wi.created_at >= $${paramCount++}`;
            params.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            whereClause += ` AND wi.created_at <= $${paramCount++}`;
            params.push(filters.dateTo);
        }
        const result = await database_1.pool.query(`
      SELECT wi.*, 
             c.claim_number,
             p.first_name || ' ' || p.last_name as patient_name,
             u.username as initiated_by_name
      FROM sha_workflow_instances wi
      JOIN sha_claims c ON wi.claim_id = c.id
      JOIN patients p ON c.patient_id = p.id
      JOIN users u ON wi.initiated_by = u.id
      ${whereClause}
      ORDER BY wi.created_at DESC
    `, params);
        for (const workflow of result.rows) {
            const stepsResult = await database_1.pool.query(`SELECT step_name, status, step_order FROM sha_workflow_steps 
         WHERE workflow_id = $1 ORDER BY step_order`, [workflow.id]);
            workflow.steps = stepsResult.rows;
        }
        return result.rows;
    }
    async getWorkflowStatistics(dateFrom, dateTo) {
        let dateFilter = "";
        const params = [];
        if (dateFrom && dateTo) {
            dateFilter = "WHERE created_at BETWEEN $1 AND $2";
            params.push(dateFrom, dateTo);
        }
        const stats = await database_1.pool.query(`
      SELECT 
        overall_status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, CURRENT_TIMESTAMP) - created_at)) / 3600) as avg_duration_hours
      FROM sha_workflow_instances
      ${dateFilter}
      GROUP BY overall_status
    `, params);
        const stepStats = await database_1.pool.query(`
      SELECT 
        ws.step_name,
        ws.status,
        COUNT(*) as count,
        AVG(ws.actual_duration_minutes) as avg_duration_minutes,
        AVG(ws.estimated_duration_minutes) as estimated_duration_minutes
      FROM sha_workflow_steps ws
      JOIN sha_workflow_instances wi ON ws.workflow_id = wi.id
      ${dateFilter.replace('created_at', 'wi.created_at')}
      GROUP BY ws.step_name, ws.status
      ORDER BY ws.step_name
    `, params);
        return {
            overall: stats.rows,
            step_breakdown: stepStats.rows,
            summary: {
                total_workflows: stats.rows.reduce((sum, row) => sum + Number.parseInt(row.count), 0),
                completed_workflows: stats.rows.find(row => row.overall_status === 'completed')?.count || 0,
                in_progress_workflows: stats.rows.find(row => row.overall_status === 'in_progress')?.count || 0,
                failed_workflows: stats.rows.find(row => row.overall_status === 'failed')?.count || 0
            }
        };
    }
    getDefaultSHAWorkflowSteps() {
        return [
            {
                step_name: 'claim_creation',
                step_order: 1,
                status: 'pending',
                required: true,
                automated: false,
                estimated_duration_minutes: 15,
                prerequisites: [],
                next_steps: ['clinical_review']
            },
            {
                step_name: 'clinical_review',
                step_order: 2,
                status: 'pending',
                required: true,
                automated: false,
                estimated_duration_minutes: 30,
                prerequisites: ['claim_creation'],
                next_steps: ['document_collection']
            },
            {
                step_name: 'document_collection',
                step_order: 3,
                status: 'pending',
                required: true,
                automated: false,
                estimated_duration_minutes: 20,
                prerequisites: ['clinical_review'],
                next_steps: ['compliance_verification']
            },
            {
                step_name: 'compliance_verification',
                step_order: 4,
                status: 'pending',
                required: true,
                automated: true,
                estimated_duration_minutes: 5,
                prerequisites: ['document_collection'],
                next_steps: ['invoice_generation']
            },
            {
                step_name: 'invoice_generation',
                step_order: 5,
                status: 'pending',
                required: true,
                automated: true,
                estimated_duration_minutes: 2,
                prerequisites: ['compliance_verification'],
                next_steps: ['invoice_review']
            },
            {
                step_name: 'invoice_review',
                step_order: 6,
                status: 'pending',
                required: true,
                automated: false,
                estimated_duration_minutes: 15,
                prerequisites: ['invoice_generation'],
                next_steps: ['invoice_printing']
            },
            {
                step_name: 'invoice_printing',
                step_order: 7,
                status: 'pending',
                required: true,
                automated: false,
                estimated_duration_minutes: 5,
                prerequisites: ['invoice_review'],
                next_steps: ['claim_submission']
            },
            {
                step_name: 'claim_submission',
                step_order: 8,
                status: 'pending',
                required: true,
                automated: false,
                estimated_duration_minutes: 10,
                prerequisites: ['invoice_printing'],
                next_steps: ['payment_tracking']
            },
            {
                step_name: 'payment_tracking',
                step_order: 9,
                status: 'pending',
                required: false,
                automated: true,
                estimated_duration_minutes: 1,
                prerequisites: ['claim_submission'],
                next_steps: []
            }
        ];
    }
    async startWorkflowStep(workflowId, stepName, assignedTo, client) {
        await client.query(`UPDATE sha_workflow_steps 
       SET status = 'in_progress',
           assigned_to = $1,
           started_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE workflow_id = $2 AND step_name = $3`, [assignedTo, workflowId, stepName]);
        await this.logWorkflowActivity(workflowId, stepName, 'STEP_STARTED', assignedTo, {
            started_at: new Date()
        }, client);
    }
    async getNextWorkflowStep(workflowId, completedStepName, client) {
        const result = await client.query(`SELECT ws.*, 
              (SELECT COUNT(*) FROM sha_workflow_steps ws2 
               WHERE ws2.workflow_id = ws.workflow_id 
               AND ws2.step_name = ANY(string_to_array(ws.prerequisites::text, ','))
               AND ws2.status != 'completed') as unmet_prerequisites
       FROM sha_workflow_steps ws
       WHERE ws.workflow_id = $1 
       AND ws.status = 'pending'
       AND ws.step_order > (
         SELECT step_order FROM sha_workflow_steps 
         WHERE workflow_id = $1 AND step_name = $2
       )
       ORDER BY ws.step_order
       LIMIT 1`, [workflowId, completedStepName]);
        if (result.rows.length === 0 || result.rows[0].unmet_prerequisites > 0) {
            return null;
        }
        return result.rows[0];
    }
    async executeAutomatedStep(workflowId, step, triggeredBy) {
        await this.startWorkflowStep(workflowId, step.step_name, triggeredBy, database_1.pool);
        switch (step.step_name) {
            case 'compliance_verification':
                await this.executeComplianceVerification(workflowId);
                break;
            case 'invoice_generation':
                await this.executeInvoiceGeneration(workflowId);
                break;
            case 'payment_tracking':
                await this.executePaymentTracking(workflowId);
                break;
            default:
                throw new Error(`Unknown automated step: ${step.step_name}`);
        }
        await this.completeWorkflowStep(workflowId, step.step_name, 'system', 'Automated execution completed');
    }
    async executeComplianceVerification(workflowId) {
        const workflow = await this.getWorkflowInstance(workflowId);
        const docResult = await database_1.pool.query(`SELECT COUNT(*) as required_docs,
              COUNT(CASE WHEN compliance_verified THEN 1 END) as verified_docs
       FROM sha_document_attachments 
       WHERE claim_id = $1 AND is_required = true`, [workflow.claim_id]);
        const { required_docs, verified_docs } = docResult.rows[0];
        if (Number.parseInt(required_docs) === 0 || Number.parseInt(verified_docs) < Number.parseInt(required_docs)) {
            throw new Error("Not all required documents are uploaded and verified");
        }
        await database_1.pool.query(`UPDATE sha_claims 
       SET compliance_status = 'verified',
           last_reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $1`, [workflow.claim_id]);
    }
    async executeInvoiceGeneration(workflowId) {
        const workflow = await this.getWorkflowInstance(workflowId);
        const result = await this.shaService.generateInvoiceForClaim(workflow.claim_id, 'system');
        await database_1.pool.query(`UPDATE sha_workflow_instances 
       SET invoice_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`, [result.invoice.id, workflowId]);
    }
    async executePaymentTracking(workflowId) {
        const workflow = await this.getWorkflowInstance(workflowId);
        await database_1.pool.query(`INSERT INTO sha_payment_tracking (
        id, claim_id, invoice_id, tracking_started_at, 
        auto_check_enabled, next_check_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            crypto_1.default.randomUUID(),
            workflow.claim_id,
            workflow.invoice_id,
            new Date(),
            true,
            new Date(Date.now() + 24 * 60 * 60 * 1000),
            new Date()
        ]);
    }
    async logWorkflowActivity(workflowId, stepName, action, performedBy, details, client) {
        await client.query(`INSERT INTO sha_workflow_activity_log (
        id, workflow_id, step_name, action, performed_by,
        performed_at, details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            crypto_1.default.randomUUID(),
            workflowId,
            stepName,
            action,
            performedBy,
            new Date(),
            JSON.stringify(details),
            new Date()
        ]);
    }
}
exports.SHAWorkflowService = SHAWorkflowService;
//# sourceMappingURL=SHAWorkflowService.js.map