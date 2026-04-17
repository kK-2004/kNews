'use strict';

class PaymentService {
  /**
   * Simulate a payment with a 3-second delay.
   * Replace this with a real payment gateway integration later.
   *
   * @param {Object} params
   * @param {number} params.userId
   * @param {string} params.plan
   * @param {number} params.amount
   * @returns {Promise<{ success: boolean, transactionId: string }>}
   */
  async processPayment({ userId, plan, amount }) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          transactionId: `mock_${Date.now()}`,
        });
      }, 3000);
    });
  }
}

module.exports = PaymentService;
