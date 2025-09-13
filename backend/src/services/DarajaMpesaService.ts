import axios from 'axios'

export interface MpesaConfig {
  consumerKey: string
  consumerSecret: string
  businessShortCode: string
  tillNumber?: string
  paybillNumber?: string
  passkey: string
  environment: 'sandbox' | 'production'
  callbackUrl: string
  accountReference: string
  transactionDesc: string
}

export interface MpesaPaymentRequest {
  amount: number
  phoneNumber: string
  accountReference: string
  transactionDesc: string
  invoiceId?: string
  patientId?: string
}

export interface MpesaPaymentResponse {
  merchantRequestId: string
  checkoutRequestId: string
  responseCode: string
  responseDescription: string
  customerMessage: string
}

export interface MpesaCallbackData {
  merchantRequestId: string
  checkoutRequestId: string
  resultCode: number
  resultDesc: string
  amount?: number
  mpesaReceiptNumber?: string
  transactionDate?: string
  phoneNumber?: string
}

export class DarajaMpesaService {
  private config: MpesaConfig
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor() {
    this.config = this.loadMpesaConfig()
  }

  private loadMpesaConfig(): MpesaConfig {
    return {
      consumerKey: process.env.MPESA_CONSUMER_KEY || '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
      businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE || '174379',
      tillNumber: process.env.MPESA_TILL_NUMBER || '123456',
      paybillNumber: process.env.MPESA_PAYBILL_NUMBER || '',
      passkey: process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
      environment: (process.env.MPESA_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
      callbackUrl: process.env.MPESA_CALLBACK_URL || 'http://localhost:5000/api/payments/mpesa/callback',
      accountReference: process.env.MPESA_ACCOUNT_REFERENCE || 'SETH_CLINIC',
      transactionDesc: process.env.MPESA_TRANSACTION_DESC || 'Medical Services Payment'
    }
  }

  private getBaseUrl(): string {
    return this.config.environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'
  }

  // Get OAuth access token
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64')
      
      const response = await axios.get(`${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      })

      this.accessToken = response.data.access_token
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000))
      
      console.log('✅ M-Pesa access token obtained')
      return this.accessToken
    } catch (error) {
      console.error('❌ Failed to get M-Pesa access token:', error)
      throw new Error('Failed to authenticate with M-Pesa API')
    }
  }

  // Generate timestamp for M-Pesa
  private generateTimestamp(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    const second = String(now.getSeconds()).padStart(2, '0')
    
    return `${year}${month}${day}${hour}${minute}${second}`
  }

  // Generate password for M-Pesa STK Push
  private generatePassword(): string {
    const timestamp = this.generateTimestamp()
    const password = Buffer.from(`${this.config.businessShortCode}${this.config.passkey}${timestamp}`).toString('base64')
    return password
  }

  // Initiate STK Push payment
  async initiatePayment(paymentRequest: MpesaPaymentRequest): Promise<MpesaPaymentResponse> {
    try {
      const accessToken = await this.getAccessToken()
      const timestamp = this.generateTimestamp()
      const password = this.generatePassword()

      // Format phone number to international format
      let phoneNumber = paymentRequest.phoneNumber.replace(/\D/g, '')
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '254' + phoneNumber.substring(1)
      } else if (phoneNumber.startsWith('7') || phoneNumber.startsWith('1')) {
        phoneNumber = '254' + phoneNumber
      }

      const stkPushData = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: this.config.tillNumber ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
        Amount: Math.round(paymentRequest.amount),
        PartyA: phoneNumber,
        PartyB: this.config.tillNumber || this.config.paybillNumber || this.config.businessShortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: this.config.callbackUrl,
        AccountReference: paymentRequest.accountReference || this.config.accountReference,
        TransactionDesc: paymentRequest.transactionDesc || this.config.transactionDesc
      }

      console.log('📱 Initiating M-Pesa STK Push:', {
        amount: stkPushData.Amount,
        phone: phoneNumber,
        reference: stkPushData.AccountReference
      })

      const response = await axios.post(
        `${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
        stkPushData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('✅ M-Pesa STK Push initiated:', response.data)

      return {
        merchantRequestId: response.data.MerchantRequestID,
        checkoutRequestId: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        customerMessage: response.data.CustomerMessage
      }
    } catch (error: any) {
      console.error('❌ M-Pesa STK Push failed:', error.response?.data || error.message)
      throw new Error(`M-Pesa payment failed: ${error.response?.data?.errorMessage || error.message}`)
    }
  }

  // Query STK Push status
  async queryPaymentStatus(checkoutRequestId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()
      const timestamp = this.generateTimestamp()
      const password = this.generatePassword()

      const queryData = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      }

      const response = await axios.post(
        `${this.getBaseUrl()}/mpesa/stkpushquery/v1/query`,
        queryData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (error: any) {
      console.error('❌ M-Pesa query failed:', error.response?.data || error.message)
      throw new Error(`Failed to query M-Pesa payment: ${error.response?.data?.errorMessage || error.message}`)
    }
  }

  // Process M-Pesa callback
  async processCallback(callbackData: any): Promise<MpesaCallbackData> {
    try {
      const stkCallback = callbackData.Body?.stkCallback
      if (!stkCallback) {
        throw new Error('Invalid callback data structure')
      }

      const result: MpesaCallbackData = {
        merchantRequestId: stkCallback.MerchantRequestID,
        checkoutRequestId: stkCallback.CheckoutRequestID,
        resultCode: stkCallback.ResultCode,
        resultDesc: stkCallback.ResultDesc
      }

      // If payment was successful, extract additional details
      if (stkCallback.ResultCode === 0 && stkCallback.CallbackMetadata) {
        const metadata = stkCallback.CallbackMetadata.Item || []
        
        for (const item of metadata) {
          switch (item.Name) {
            case 'Amount':
              result.amount = item.Value
              break
            case 'MpesaReceiptNumber':
              result.mpesaReceiptNumber = item.Value
              break
            case 'TransactionDate':
              result.transactionDate = item.Value
              break
            case 'PhoneNumber':
              result.phoneNumber = item.Value
              break
          }
        }
      }

      console.log('📨 M-Pesa callback processed:', result)
      return result
    } catch (error: any) {
      console.error('❌ Failed to process M-Pesa callback:', error)
      throw new Error(`Failed to process M-Pesa callback: ${error.message}`)
    }
  }

  // Validate M-Pesa configuration
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.config.consumerKey) errors.push('Consumer Key is required')
    if (!this.config.consumerSecret) errors.push('Consumer Secret is required')
    if (!this.config.businessShortCode) errors.push('Business Short Code is required')
    if (!this.config.tillNumber && !this.config.paybillNumber) {
      errors.push('Either Till Number or Paybill Number is required')
    }
    if (!this.config.passkey) errors.push('Passkey is required')
    if (!this.config.callbackUrl) errors.push('Callback URL is required')

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Update M-Pesa configuration (for clinic setup)
  updateConfig(newConfig: Partial<MpesaConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Clear cached token to force re-authentication with new config
    this.accessToken = null
    this.tokenExpiry = null
    
    console.log('✅ M-Pesa configuration updated')
  }

  // Get current configuration (without sensitive data)
  getConfigSummary() {
    return {
      businessShortCode: this.config.businessShortCode,
      tillNumber: this.config.tillNumber,
      paybillNumber: this.config.paybillNumber,
      environment: this.config.environment,
      accountReference: this.config.accountReference,
      transactionDesc: this.config.transactionDesc,
      isConfigured: this.validateConfig().isValid
    }
  }
}
