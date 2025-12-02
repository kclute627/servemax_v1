import { entities } from './database';
import { StatsManager } from './stats';

/**
 * InvoiceManager - Enhanced invoice management with automatic financial stats tracking
 * Wraps the base Invoice and Payment entities to include business intelligence tracking
 */
export class InvoiceManager {

  /**
   * Create a new invoice with automatic stats tracking
   */
  static async createInvoice(invoiceData) {
    try {
      // Validate required fields
      if (!invoiceData.company_id) {
        throw new Error('company_id is required for invoice creation');
      }
      if (!invoiceData.client_id) {
        throw new Error('client_id is required for invoice creation');
      }
      if (!invoiceData.total_amount || invoiceData.total_amount <= 0) {
        throw new Error('total_amount must be greater than 0');
      }

      // Create the invoice using the base entity
      const invoice = await entities.Invoice.create({
        ...invoiceData,
        status: invoiceData.status || 'sent',
        amount_paid: 0,
        amount_outstanding: invoiceData.total_amount,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Update financial stats asynchronously
      this.updateStatsAsync('invoice_created', {
        companyId: invoiceData.company_id,
        clientId: invoiceData.client_id,
        amount: invoiceData.total_amount,
        invoiceId: invoice.id
      });

      console.log(`Invoice ${invoice.id} created for $${invoiceData.total_amount}`);
      return invoice;

    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  /**
   * Record a payment against an invoice with automatic stats tracking
   */
  static async recordPayment(invoiceId, paymentData) {
    try {
      // Get the current invoice
      const invoice = await entities.Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      if (!paymentData.amount || paymentData.amount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      // Calculate new amounts
      const newAmountPaid = (invoice.amount_paid || 0) + paymentData.amount;
      const newAmountOutstanding = invoice.total_amount - newAmountPaid;

      // Determine new status
      let newStatus = invoice.status;
      if (newAmountOutstanding <= 0) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partially_paid';
      }

      // Create payment record
      const payment = await entities.Payment.create({
        invoice_id: invoiceId,
        company_id: invoice.company_id,
        client_id: invoice.client_id,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method || 'unknown',
        payment_date: paymentData.payment_date || new Date(),
        notes: paymentData.notes || '',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Update invoice with new amounts and status
      const updatedInvoice = await entities.Invoice.update(invoiceId, {
        amount_paid: newAmountPaid,
        amount_outstanding: newAmountOutstanding,
        status: newStatus,
        last_payment_date: paymentData.payment_date || new Date(),
        updated_at: new Date()
      });

      // Update financial stats
      this.updateStatsAsync('payment_received', {
        companyId: invoice.company_id,
        clientId: invoice.client_id,
        amount: paymentData.amount,
        paymentId: payment.id,
        invoiceId: invoiceId
      });

      console.log(`Payment of $${paymentData.amount} recorded for invoice ${invoiceId}`);
      return { payment, invoice: updatedInvoice };

    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoiceById(invoiceId) {
    return await entities.Invoice.findById(invoiceId);
  }

  /**
   * Get invoices with filtering
   */
  static async getInvoices(queryOptions = {}) {
    return await entities.Invoice.find(queryOptions);
  }

  /**
   * Get payments for an invoice
   */
  static async getInvoicePayments(invoiceId) {
    return await entities.Payment.find({
      where: [['invoice_id', '==', invoiceId]],
      orderBy: ['payment_date', 'desc']
    });
  }

  /**
   * Get all payments with filtering
   */
  static async getPayments(queryOptions = {}) {
    return await entities.Payment.find(queryOptions);
  }

  /**
   * Update invoice status (for manual status changes)
   */
  static async updateInvoiceStatus(invoiceId, newStatus, updateData = {}) {
    try {
      const updatedInvoice = await entities.Invoice.update(invoiceId, {
        ...updateData,
        status: newStatus,
        updated_at: new Date()
      });

      console.log(`Invoice ${invoiceId} status updated to ${newStatus}`);
      return updatedInvoice;

    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }

  /**
   * Cancel an invoice
   */
  static async cancelInvoice(invoiceId, cancellationReason = '') {
    try {
      const invoice = await entities.Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      const cancelledInvoice = await this.updateInvoiceStatus(invoiceId, 'cancelled', {
        cancellation_reason: cancellationReason,
        cancelled_at: new Date()
      });

      // Note: We don't reverse stats for cancelled invoices as they were validly created
      // This maintains historical accuracy of billing activity

      console.log(`Invoice ${invoiceId} cancelled: ${cancellationReason}`);
      return cancelledInvoice;

    } catch (error) {
      console.error('Error cancelling invoice:', error);
      throw error;
    }
  }

  /**
   * Get financial summary for a company
   */
  static async getFinancialSummary(companyId, year = null, month = null) {
    try {
      const currentYear = year || new Date().getFullYear();
      const currentMonth = month || (new Date().getMonth() + 1);

      return await StatsManager.getCurrentMonthStats(companyId);
    } catch (error) {
      console.error('Error getting financial summary:', error);
      throw error;
    }
  }

  /**
   * Get top clients by billing amount
   */
  static async getTopClientsByBilling(companyId, year = null, month = null, limit = 10) {
    try {
      const currentYear = year || new Date().getFullYear();

      return await StatsManager.getTopClients(companyId, currentYear, month, limit);
    } catch (error) {
      console.error('Error getting top clients by billing:', error);
      throw error;
    }
  }

  /**
   * Get outstanding invoices summary
   */
  static async getOutstandingInvoices(companyId) {
    try {
      const outstandingInvoices = await entities.Invoice.find({
        where: [
          ['company_id', '==', companyId],
          ['status', 'in', ['sent', 'partially_paid']],
          ['amount_outstanding', '>', 0]
        ],
        orderBy: ['created_at', 'desc']
      });

      const totalOutstanding = outstandingInvoices.reduce((sum, invoice) =>
        sum + (invoice.amount_outstanding || 0), 0
      );

      return {
        invoices: outstandingInvoices,
        totalAmount: totalOutstanding,
        count: outstandingInvoices.length
      };
    } catch (error) {
      console.error('Error getting outstanding invoices:', error);
      throw error;
    }
  }

  /**
   * Update stats asynchronously to avoid blocking invoice operations
   */
  static async updateStatsAsync(eventType, data) {
    try {
      switch (eventType) {
        case 'invoice_created':
          await StatsManager.recordInvoiceCreated(
            data.companyId,
            data.clientId,
            data.amount
          );
          break;

        case 'payment_received':
          await StatsManager.recordPaymentReceived(
            data.companyId,
            data.clientId,
            data.amount
          );
          break;
      }
    } catch (error) {
      // Log error but don't throw - stats shouldn't break invoice operations
      console.error(`Error updating stats for ${eventType}:`, error);
    }
  }

  /**
   * Generate invoice number (helper method)
   */
  static generateInvoiceNumber(companyId, sequence = null) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const seq = String(sequence || Date.now()).padStart(4, '0');

    return `INV-${year}${month}-${seq}`;
  }

  /**
   * Send invoice email to client
   * STUB: Placeholder for future SendGrid integration
   *
   * @param {string} invoiceId - The ID of the invoice to send
   * @param {string} clientEmail - The email address to send the invoice to
   * @param {object} invoiceData - Optional invoice data for email content
   * @returns {Promise<object>} - Result object with success status
   */
  static async sendInvoiceEmail(invoiceId, clientEmail, invoiceData = {}) {
    console.log('[sendInvoiceEmail] TODO: Implement SendGrid integration');
    console.log('[sendInvoiceEmail] Would send invoice', invoiceId, 'to', clientEmail);
    console.log('[sendInvoiceEmail] Invoice data:', {
      invoiceNumber: invoiceData.invoice_number,
      total: invoiceData.total,
      dueDate: invoiceData.due_date
    });

    // For now, just return success - actual email sending to be added later with SendGrid
    return {
      success: true,
      message: 'Email queued (SendGrid integration pending)',
      invoiceId,
      recipientEmail: clientEmail
    };
  }
}