// ---------------------------------------------------------------------------
// Platform-level configuration shared with the Mobile App. Single shared record
// (no Settings module). API-ready shape for future backend integration.
// ---------------------------------------------------------------------------

export interface MembershipPurchaseConfig {
  membershipPurchaseEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
}
