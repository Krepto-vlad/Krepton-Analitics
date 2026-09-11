import { createApiClient, assertSuccess } from './apiClient';
import { API_BASE_URL } from '../constants';
import type {
  AdminEntitlementGrant,
  BillingCheckoutResult,
  BillingPortalResult,
} from '../types/billing.types';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';
import type { PaidCheckoutInterval } from '../constants/pricingPlans';

const billingClient = createApiClient(`${API_BASE_URL}/api/billing`);
const adminClient = createApiClient(`${API_BASE_URL}/api/admin`);

export async function apiCreateBillingCheckout(
  interval: PaidCheckoutInterval
): Promise<BillingCheckoutResult> {
  const { data } = await billingClient.post<
    ApiSuccessResponse<BillingCheckoutResult> | ApiErrorResponse
  >('/checkout', { interval });
  return assertSuccess(data);
}

export async function apiCreateBillingPortal(): Promise<BillingPortalResult> {
  const { data } = await billingClient.post<
    ApiSuccessResponse<BillingPortalResult> | ApiErrorResponse
  >('/portal');
  return assertSuccess(data);
}

export async function apiGrantAdminEntitlement(
  email: string,
  expiresAt: string
): Promise<AdminEntitlementGrant> {
  const { data } = await adminClient.post<
    ApiSuccessResponse<AdminEntitlementGrant> | ApiErrorResponse
  >('/entitlements', { email, expiresAt });
  return assertSuccess(data);
}

export async function apiLookupAdminEntitlement(email: string): Promise<AdminEntitlementGrant> {
  const { data } = await adminClient.get<
    ApiSuccessResponse<AdminEntitlementGrant> | ApiErrorResponse
  >('/entitlements', { params: { email } });
  return assertSuccess(data);
}
