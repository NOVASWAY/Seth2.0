"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const MPesaService_1 = require("../services/MPesaService");
const express_validator_1 = require("express-validator");
const types_1 = require("../types");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const mpesaService = new MPesaService_1.MPesaService();
router.post("/invoices", auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.ADMIN]), [
    (0, express_validator_1.body)("items").isArray().withMessage("Items must be an array"),
    (0, express_validator_1.body)("items.*.description").notEmpty().withMessage("Item description is required"),
    (0, express_validator_1.body)("items.*.quantity").isNumeric().withMessage("Quantity must be a number"),
    (0, express_validator_1.body)("items.*.unit_price").isNumeric().withMessage("Unit price must be a number"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { op_number, patient_id, buyer_name, buyer_phone, items, discount_amount = 0, payment_terms = "immediate", notes, } = req.body;
        const client = await database_1.pool.connect();
        try {
            await client.query("BEGIN");
            const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
            const taxAmount = subtotal * 0.16;
            const totalAmount = subtotal + taxAmount - discount_amount;
            const invoiceNumber = `INV-${Date.now()}`;
            const invoiceResult = await client.query(`
          INSERT INTO invoices (
            id, invoice_number, op_number, patient_id, buyer_name, buyer_phone,
            invoice_date, due_date, subtotal, tax_amount, discount_amount,
            total_amount, amount_paid, balance, status, payment_terms, notes,
            created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING *
        `, [
                crypto_1.default.randomUUID(),
                invoiceNumber,
                op_number,
                patient_id,
                buyer_name,
                buyer_phone,
                new Date(),
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                subtotal,
                taxAmount,
                discount_amount,
                totalAmount,
                0,
                totalAmount,
                "unpaid",
                payment_terms,
                notes,
                req.user.id,
                new Date(),
                new Date(),
            ]);
            const invoice = invoiceResult.rows[0];
            for (const item of items) {
                await client.query(`
            INSERT INTO invoice_items (
              id, invoice_id, item_type, item_id, description,
              quantity, unit_price, total_price, batch_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
                    crypto_1.default.randomUUID(),
                    invoice.id,
                    item.item_type || "other",
                    item.item_id,
                    item.description,
                    item.quantity,
                    item.unit_price,
                    item.quantity * item.unit_price,
                    item.batch_id,
                    new Date(),
                ]);
            }
            if (totalAmount > 0) {
                await client.query(`
            INSERT INTO accounts_receivable (
              id, invoice_id, op_number, patient_id, amount, due_date,
              days_overdue, aging_bucket, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
                    crypto_1.default.randomUUID(),
                    invoice.id,
                    op_number,
                    patient_id,
                    totalAmount,
                    invoice.due_date,
                    0,
                    "0-30",
                    "current",
                    new Date(),
                    new Date(),
                ]);
            }
            await client.query("COMMIT");
            res.status(201).json({
                success: true,
                data: invoice,
            });
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error("Error creating invoice:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create invoice",
        });
    }
});
router.post("/payments", auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.ADMIN]), [
    (0, express_validator_1.body)("invoice_id").notEmpty().withMessage("Invoice ID is required"),
    (0, express_validator_1.body)("amount").isNumeric().withMessage("Amount must be a number"),
    (0, express_validator_1.body)("payment_method")
        .isIn(["cash", "mpesa", "bank_transfer", "insurance", "other"])
        .withMessage("Invalid payment method"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { invoice_id, amount, payment_method, mpesa_receipt, notes } = req.body;
        const client = await database_1.pool.connect();
        try {
            await client.query("BEGIN");
            const paymentId = crypto_1.default.randomUUID();
            const paymentReference = `PAY-${Date.now()}`;
            await client.query(`
          INSERT INTO payments (
            id, invoice_id, payment_reference, payment_method, amount,
            mpesa_receipt, payment_date, received_by, notes, reconciled, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
                paymentId,
                invoice_id,
                paymentReference,
                payment_method,
                amount,
                mpesa_receipt,
                new Date(),
                req.user.id,
                notes,
                payment_method === "cash" ? false : true,
                new Date(),
            ]);
            const paymentsResult = await client.query(`
          SELECT COALESCE(SUM(amount), 0) as total_paid
          FROM payments 
          WHERE invoice_id = $1
        `, [invoice_id]);
            const totalPaid = Number.parseFloat(paymentsResult.rows[0].total_paid);
            const invoiceResult = await client.query(`
          SELECT total_amount FROM invoices WHERE id = $1
        `, [invoice_id]);
            if (invoiceResult.rows.length > 0) {
                const totalAmount = Number.parseFloat(invoiceResult.rows[0].total_amount);
                const balance = totalAmount - totalPaid;
                let status = "unpaid";
                if (balance <= 0) {
                    status = "paid";
                }
                else if (totalPaid > 0) {
                    status = "partial";
                }
                await client.query(`
            UPDATE invoices 
            SET amount_paid = $1, balance = $2, status = $3, updated_at = $4
            WHERE id = $5
          `, [totalPaid, Math.max(0, balance), status, new Date(), invoice_id]);
                if (status === "paid") {
                    await client.query(`
              UPDATE accounts_receivable 
              SET status = 'paid', updated_at = $1
              WHERE invoice_id = $2
            `, [new Date(), invoice_id]);
                }
            }
            await client.query("COMMIT");
            res.json({
                success: true,
                data: {
                    payment_id: paymentId,
                    payment_reference: paymentReference,
                },
            });
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process payment",
        });
    }
});
router.post("/mpesa/stk-push", auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.UserRole.PHARMACIST, types_1.UserRole.CASHIER, types_1.UserRole.ADMIN]), [
    (0, express_validator_1.body)("phone_number").isMobilePhone("any").withMessage("Valid phone number is required"),
    (0, express_validator_1.body)("amount").isNumeric().withMessage("Amount must be a number"),
    (0, express_validator_1.body)("invoice_id").notEmpty().withMessage("Invoice ID is required"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { phone_number, amount, invoice_id } = req.body;
        await database_1.pool.query(`
        UPDATE mpesa_transactions 
        SET invoice_id = $1 
        WHERE id = (
          SELECT id FROM mpesa_transactions 
          WHERE phone_number = $2 AND amount = $3 AND status = 'pending'
          ORDER BY created_at DESC LIMIT 1
        )
      `, [invoice_id, phone_number, amount]);
        const transaction = await mpesaService.initiateSTKPush(phone_number, amount, `INV-${invoice_id}`, "Seth Medical Clinic Payment");
        res.json({
            success: true,
            data: {
                checkout_request_id: transaction.checkout_request_id,
                merchant_request_id: transaction.merchant_request_id,
            },
        });
    }
    catch (error) {
        console.error("Error initiating M-Pesa payment:", error);
        res.status(500).json({
            success: false,
            message: "Failed to initiate M-Pesa payment",
        });
    }
});
router.post("/mpesa/callback", async (req, res) => {
    try {
        await mpesaService.handleCallback(req.body);
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error handling M-Pesa callback:", error);
        res.status(500).json({ success: false });
    }
});
router.get("/dashboard", auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.UserRole.ADMIN, types_1.UserRole.CASHIER, types_1.UserRole.PHARMACIST]), async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        const revenueResult = await database_1.pool.query(`
        SELECT COALESCE(SUM(amount), 0) as today_revenue
        FROM payments 
        WHERE received_at >= $1 AND received_at < $2
      `, [startOfDay, endOfDay]);
        const receivablesResult = await database_1.pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN aging_bucket = '0-30' THEN remaining_amount ELSE 0 END), 0) as current,
          COALESCE(SUM(CASE WHEN aging_bucket = '31-60' THEN remaining_amount ELSE 0 END), 0) as thirty_days,
          COALESCE(SUM(CASE WHEN aging_bucket = '61-90' THEN remaining_amount ELSE 0 END), 0) as sixty_days,
          COALESCE(SUM(CASE WHEN aging_bucket = '90+' THEN remaining_amount ELSE 0 END), 0) as ninety_plus
        FROM accounts_receivable 
        WHERE status != 'SETTLED'
      `);
        const transactionsResult = await database_1.pool.query(`
        SELECT p.*, i.invoice_number, i.op_number
        FROM payments p
        LEFT JOIN invoices i ON p.invoice_id = i.id
        ORDER BY p.received_at DESC
        LIMIT 10
      `);
        res.json({
            success: true,
            data: {
                today_revenue: Number.parseFloat(revenueResult.rows[0].today_revenue),
                receivables: receivablesResult.rows[0],
                recent_transactions: transactionsResult.rows,
            },
        });
    }
    catch (error) {
        console.error("Error fetching financial dashboard:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch financial data",
        });
    }
});
exports.default = router;
//# sourceMappingURL=financial.js.map