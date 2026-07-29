import type { AdminRole } from '../types';

// Fine-grained action abilities for the Users & Memberships modules.
// These sit on top of the coarse route permissions in config/roles.ts.
export interface Abilities {
  editUsers: boolean; // add user, edit profile fields
  suspendUsers: boolean; // suspend / reactivate accounts & memberships
  viewPurchases: boolean; // see payment / receipt / refund detail
  editPricing: boolean; // edit proposed regional pricing
  simulate: boolean; // prototype purchase-simulation tools
  addNotes: boolean; // add internal admin notes
  readOnly: boolean; // purely read access (no mutations)
  // Phase 3
  manageCategories: boolean; // add / edit / (de)activate / reorder categories
  manageCatalogue: boolean; // hide / restore profiles in catalogue
  correctLocation: boolean; // location correction flow
  moderatePortfolio: boolean; // request changes, hide / restore content
  publishPortfolio: boolean; // publish / unpublish portfolios
  // Phase 4
  manageArchive: boolean; // moderate archive videos
  manageEvents: boolean; // publish / hide / cancel / edit events
  manageTickets: boolean; // check-in, cancel booking
  refundReview: boolean; // initiate refund review
  resendTickets: boolean; // resend ticket to buyer
  contactBuyer: boolean; // contact ticket buyer
  reviewProposals: boolean; // review custom event-category proposals
  manageEventSettings: boolean; // edit controlled event settings
  viewOrders: boolean; // view ticket orders / payment records
  manageProducts: boolean; // add / publish / hide / archive products & categories
  // Collaborations & Meetings
  collabView: boolean; // view collaborations, matches and meetings
  collabReminders: boolean; // send request / meeting reminders & admin notices
  collabReschedule: boolean; // review reschedule requests
  collabReports: boolean; // review / note / dismiss collaboration reports
  collabBlock: boolean; // block / restore collaborations for safety
  collabCancelMeeting: boolean; // cancel a meeting for a safety reason
  collabSettings: boolean; // edit matching weights & access settings
  // Reviews
  reviewsView: boolean; // view reviews
  reviewsModerate: boolean; // delete reviews
}

const MAP: Record<AdminRole, Abilities> = {
  super_admin: {
    editUsers: true,
    suspendUsers: true,
    viewPurchases: true,
    editPricing: true,
    simulate: true,
    addNotes: true,
    readOnly: false,
    manageCategories: true,
    manageCatalogue: true,
    correctLocation: true,
    moderatePortfolio: true,
    publishPortfolio: true,
    manageArchive: true,
    manageEvents: true,
    manageTickets: true,
    refundReview: true,
    resendTickets: true,
    contactBuyer: true,
    reviewProposals: true,
    manageEventSettings: true,
    viewOrders: true,
    manageProducts: true,
    collabView: true,
    collabReminders: true,
    collabReschedule: true,
    collabReports: true,
    collabBlock: true,
    collabCancelMeeting: true,
    collabSettings: true,
    reviewsView: true,
    reviewsModerate: true,
  },
  operations_manager: {
    editUsers: true,
    suspendUsers: true,
    viewPurchases: true,
    editPricing: false,
    simulate: false,
    addNotes: true,
    readOnly: false,
    manageCategories: false,
    manageCatalogue: true,
    correctLocation: true,
    moderatePortfolio: true,
    publishPortfolio: true,
    manageArchive: false,
    manageEvents: true,
    manageTickets: true,
    refundReview: false,
    resendTickets: true,
    contactBuyer: true,
    reviewProposals: true,
    manageEventSettings: false,
    viewOrders: true,
    manageProducts: true,
    collabView: true,
    collabReminders: true,
    collabReschedule: true,
    collabReports: false,
    collabBlock: false,
    collabCancelMeeting: false,
    collabSettings: false,
    reviewsView: true,
    reviewsModerate: true,
  },
  finance_manager: {
    editUsers: false,
    suspendUsers: false,
    viewPurchases: true,
    editPricing: false,
    simulate: false,
    addNotes: true,
    readOnly: false,
    manageCategories: false,
    manageCatalogue: false,
    correctLocation: false,
    moderatePortfolio: false,
    publishPortfolio: false,
    manageArchive: false,
    manageEvents: false,
    manageTickets: false,
    refundReview: true,
    resendTickets: false,
    contactBuyer: false,
    reviewProposals: false,
    manageEventSettings: false,
    viewOrders: true,
    manageProducts: false,
    collabView: true,
    collabReminders: false,
    collabReschedule: false,
    collabReports: false,
    collabBlock: false,
    collabCancelMeeting: false,
    collabSettings: false,
    reviewsView: true,
    reviewsModerate: false,
  },
  portfolio_moderator: {
    editUsers: false,
    suspendUsers: false,
    viewPurchases: false,
    editPricing: false,
    simulate: false,
    addNotes: true,
    readOnly: false,
    manageCategories: false,
    manageCatalogue: false,
    correctLocation: false,
    moderatePortfolio: true,
    publishPortfolio: false,
    manageArchive: true,
    manageEvents: false,
    manageTickets: false,
    refundReview: false,
    resendTickets: false,
    contactBuyer: false,
    reviewProposals: false,
    manageEventSettings: false,
    viewOrders: true,
    manageProducts: false,
    collabView: true,
    collabReminders: false,
    collabReschedule: false,
    collabReports: true,
    collabBlock: true,
    collabCancelMeeting: false,
    collabSettings: false,
    reviewsView: true,
    reviewsModerate: true,
  },
};

export function abilitiesFor(role: AdminRole): Abilities {
  return MAP[role];
}

// Human-friendly explanation shown in a tooltip when an action is disabled.
export const RESTRICTED_HINT =
  'Your role does not permit this action. Contact a Super Admin if you need access.';
