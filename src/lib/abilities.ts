import type { AdminRole } from '../types';

// Fine-grained action abilities layered on top of the coarse route permissions
// in config/roles.ts. Route visibility comes from permissions; these gate the
// mutations available inside a module (e.g. read-only vs. can-edit).
export interface Abilities {
  editUsers: boolean;
  suspendUsers: boolean;
  viewPurchases: boolean;
  editPricing: boolean;
  simulate: boolean;
  addNotes: boolean;
  readOnly: boolean;
  manageCategories: boolean;
  manageCatalogue: boolean;
  correctLocation: boolean;
  moderatePortfolio: boolean;
  publishPortfolio: boolean;
  manageArchive: boolean;
  manageEvents: boolean;
  manageTickets: boolean;
  refundReview: boolean;
  resendTickets: boolean;
  contactBuyer: boolean;
  reviewProposals: boolean;
  manageEventSettings: boolean;
  viewOrders: boolean;
  manageProducts: boolean;
  collabView: boolean;
  collabReminders: boolean;
  collabReschedule: boolean;
  collabReports: boolean;
  collabBlock: boolean;
  collabCancelMeeting: boolean;
  collabSettings: boolean;
  reviewsView: boolean;
  reviewsModerate: boolean;
  txnView: boolean;
  txnFinancials: boolean;
  payoutsView: boolean;
  payoutsProcess: boolean;
  commissionsEdit: boolean;
  manageBanners: boolean; // create/edit/reorder home banners
  manageAdmins: boolean; // manage Admin Users
}

const MAP: Record<AdminRole, Abilities> = {
  super_admin: {
    editUsers: true, suspendUsers: true, viewPurchases: true, editPricing: true, simulate: true, addNotes: true, readOnly: false,
    manageCategories: true, manageCatalogue: true, correctLocation: true, moderatePortfolio: true, publishPortfolio: true,
    manageArchive: true, manageEvents: true, manageTickets: true, refundReview: true, resendTickets: true, contactBuyer: true,
    reviewProposals: true, manageEventSettings: true, viewOrders: true, manageProducts: true,
    collabView: true, collabReminders: true, collabReschedule: true, collabReports: true, collabBlock: true, collabCancelMeeting: true, collabSettings: true,
    reviewsView: true, reviewsModerate: true, txnView: true, txnFinancials: true,
    payoutsView: true, payoutsProcess: true, commissionsEdit: true, manageBanners: true, manageAdmins: true,
  },
  operations_manager: {
    editUsers: true, suspendUsers: true, viewPurchases: true, editPricing: false, simulate: false, addNotes: true, readOnly: false,
    manageCategories: false, manageCatalogue: true, correctLocation: true, moderatePortfolio: true, publishPortfolio: true,
    manageArchive: false, manageEvents: true, manageTickets: true, refundReview: false, resendTickets: true, contactBuyer: true,
    reviewProposals: true, manageEventSettings: false, viewOrders: true, manageProducts: true,
    collabView: true, collabReminders: true, collabReschedule: true, collabReports: false, collabBlock: false, collabCancelMeeting: false, collabSettings: false,
    reviewsView: true, reviewsModerate: true, txnView: false, txnFinancials: false,
    payoutsView: false, payoutsProcess: false, commissionsEdit: false, manageBanners: true, manageAdmins: false,
  },
  finance_manager: {
    editUsers: false, suspendUsers: false, viewPurchases: true, editPricing: false, simulate: false, addNotes: true, readOnly: false,
    manageCategories: false, manageCatalogue: false, correctLocation: false, moderatePortfolio: false, publishPortfolio: false,
    manageArchive: false, manageEvents: false, manageTickets: false, refundReview: true, resendTickets: false, contactBuyer: false,
    reviewProposals: false, manageEventSettings: false, viewOrders: true, manageProducts: false,
    collabView: false, collabReminders: false, collabReschedule: false, collabReports: false, collabBlock: false, collabCancelMeeting: false, collabSettings: false,
    reviewsView: false, reviewsModerate: false, txnView: true, txnFinancials: true,
    payoutsView: true, payoutsProcess: true, commissionsEdit: false, manageBanners: false, manageAdmins: false,
  },
  content_moderator: {
    editUsers: false, suspendUsers: false, viewPurchases: false, editPricing: false, simulate: false, addNotes: true, readOnly: false,
    manageCategories: false, manageCatalogue: false, correctLocation: false, moderatePortfolio: true, publishPortfolio: false,
    manageArchive: true, manageEvents: false, manageTickets: false, refundReview: false, resendTickets: false, contactBuyer: false,
    reviewProposals: false, manageEventSettings: false, viewOrders: false, manageProducts: false,
    collabView: true, collabReminders: false, collabReschedule: false, collabReports: false, collabBlock: false, collabCancelMeeting: false, collabSettings: false,
    reviewsView: true, reviewsModerate: true, txnView: false, txnFinancials: false,
    payoutsView: false, payoutsProcess: false, commissionsEdit: false, manageBanners: true, manageAdmins: false,
  },
};

export function abilitiesFor(role: AdminRole): Abilities {
  return MAP[role];
}

export const RESTRICTED_HINT =
  'Your role does not permit this action. Contact a Super Admin if you need access.';
