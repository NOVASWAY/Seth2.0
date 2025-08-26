import type { MPesaTransaction } from "../models/Financial";
export declare class MPesaService {
    private consumerKey;
    private consumerSecret;
    private shortcode;
    private passkey;
    private baseUrl;
    private callbackUrl;
    constructor();
    private getAccessToken;
    private generatePassword;
    private getTimestamp;
    initiateSTKPush(phoneNumber: string, amount: number, accountReference: string, transactionDesc: string): Promise<MPesaTransaction>;
    handleCallback(callbackData: any): Promise<void>;
    private updateInvoicePaymentStatus;
}
//# sourceMappingURL=MPesaService.d.ts.map