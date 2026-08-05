// ---------------------------------------------------------------------------
// Donation / "We Need Your Support" listings. A listing type inside the Products
// module (no separate sidebar module). Creators define FIXED support amounts —
// no donor-entered custom amount, no stock, no fulfilment/delivery.
// Donation transactions feed the shared Transactions view (source: 'donation').
// ---------------------------------------------------------------------------

export interface DonationListing {
  id: string;
  creatorUserId: string;
  creatorName: string;
  creatorIicaId?: string;
  title: string;            // support-option title
  amount: number;           // fixed amount, must be > 0
  currency: string;
  description?: string;
  active: boolean;          // Active / Inactive
  portfolioVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DonationPaymentStatus = 'initiated' | 'pending' | 'paid' | 'failed' | 'cancelled';

// A single support attempt. Only becomes 'paid' after explicit Mobile prototype
// payment confirmation. No shipping / fulfilment fields ever.
export interface DonationOrder {
  id: string;
  listingId: string;
  listingTitle: string;
  creatorUserId: string;
  creatorName: string;
  donorName: string;
  donorUserId?: string | null;
  donorType: 'guest' | 'registered' | 'creator';
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentMasked: string; // never a full card / CVV / bank credential
  paymentRef: string;
  status: DonationPaymentStatus;
  date: string;
}
