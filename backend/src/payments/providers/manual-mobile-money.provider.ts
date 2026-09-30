import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { CollectRequest, CollectResult, MobileMoneyProvider, RefundResult } from './mobile-money.provider';

/**
 * Default adapter for the Cameroonian market: no card is involved and no third party is called.
 * The promoter sends the licence fee from their MTN MoMo or Orange Money wallet to the platform's
 * merchant wallet (admin-managed numbers), submits the transaction ID, and an administrator — who
 * holds the merchant wallet — confirms that the money arrived.
 */
@Injectable()
export class ManualMobileMoneyProvider extends MobileMoneyProvider {
  readonly name = 'manual';
  readonly automatic = false;
  readonly supportedMethods = [PaymentMethod.MTN_MOMO, PaymentMethod.ORANGE_MONEY];

  async collect(_request: CollectRequest): Promise<CollectResult> {
    // Nothing to charge automatically: the transfer happens on the promoter's phone with USSD.
    // The reference is recorded so administrators can trace the submission.
    return { status: 'PENDING', providerRef: `tc_mm_${randomBytes(6).toString('hex')}` };
  }

  async refund(providerRef: string): Promise<RefundResult> {
    // Reimbursements are made from the MTN MoMo / Orange Money merchant portal by the administrator.
    return { success: true, providerRef: `tc_mm_re_${providerRef.slice(-8)}` };
  }
}
