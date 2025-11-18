import { entities, FirebaseAuth } from '../firebase';
import { SecureClientAccess, SecureEmployeeAccess, SecureCompanyAccess, SecurePaymentAccess } from '../firebase/multiTenantAccess';

// Export Firebase entities to maintain compatibility with existing code
// Client now uses Company entity through SecureClientAccess
export const Client = SecureClientAccess;

export const Job = entities.Job;

export const Employee = SecureEmployeeAccess;

export const Invoice = entities.Invoice;

export const Payment = SecurePaymentAccess;

export const StripeCustomer = entities.StripeCustomer;

export const CourtCase = entities.CourtCase;

export const Document = entities.Document;

export const Attempt = entities.Attempt;

export const Court = entities.Court;

export const CompanySettings = entities.CompanySettings;

export const ServerPayRecord = entities.ServerPayRecord;

// New multi-tenant entities
export const Company = SecureCompanyAccess;

export const Invitation = entities.Invitation;

export const Subscription = entities.Subscription;

// Affidavit template entities
export const AffidavitTemplate = entities.AffidavitTemplate;
export const SystemAffidavitTemplate = entities.SystemAffidavitTemplate;

// Firebase Auth replaces Base44 auth
export const User = FirebaseAuth;