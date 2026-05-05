import { graphql } from '@/lib/graphql';

export function listPartnersForAnalytics() {
  return graphql(
    `query Partners {
      partners(order_by: {name: asc}) { id name }
    }`
  ).then((res) => res?.partners ?? []);
}

export function getPartnerAnalytics(partnerId: string, startDate: string, endDate: string) {
  return graphql(
    `query PartnerAnalytics($partnerId: uuid!, $start: date!, $end: date!) {
      partner_analytics(where: {partner_id: {_eq: $partnerId}, date: {_gte: $start, _lte: $end}}, order_by: {date: asc}) {
        date
        impressions
        clicks
        conversions
        revenue
      }
    }`,
    { partnerId, start: startDate, end: endDate },
  ).then((res) => res?.partner_analytics ?? []);
}

export function listPartnerFraudAlerts() {
  return graphql(
    `query PartnerFraudAlerts {
      partner_fraud_alerts(order_by: {created_at: desc}) {
        id
        partner_id
        type
        description
        created_at
        resolved
      }
    }`
  ).then((res) => res?.partner_fraud_alerts ?? []);
}

export function resolvePartnerFraudAlert(id: string) {
  return graphql(
    `mutation ResolveAlert($id: uuid!) {
      update_partner_fraud_alerts_by_pk(pk_columns: {id: $id}, _set: {resolved: true}) {
        id
      }
    }`,
    { id },
  );
}

export function getPartnerPayoutInfo() {
  return graphql(
    `query PartnerPayoutInfo {
      partner_payout_info {
        connected
        account_email
      }
      partner_payouts(order_by: {created_at: desc}) {
        id
        amount
        currency
        status
        created_at
      }
    }`
  ).then((res) => ({
    connected: res?.partner_payout_info?.connected ?? false,
    account_email: res?.partner_payout_info?.account_email ?? null,
    history: res?.partner_payouts ?? [],
  }));
}

export function connectPartnerPayoutProvider() {
  return graphql(`mutation ConnectPayoutProvider { partner_connect_payout }`);
}

export function disconnectPartnerPayoutProvider() {
  return graphql(`mutation DisconnectPayoutProvider { partner_disconnect_payout }`);
}

export function listPartnerReferralCodes() {
  return graphql(
    `query PartnerReferralCodes {
      partner_referral_codes(order_by: {created_at: desc}) {
        id
        code
        value
        expires_at
        used_count
        active
      }
    }`
  ).then((res) => res?.partner_referral_codes ?? []);
}

export function createPartnerReferralCode(payload: { code: string; value: number; expiresAt: string | null }) {
  return graphql(
    `mutation CreateReferralCode($code: String!, $value: numeric!, $expiresAt: timestamptz) {
      insert_partner_referral_codes_one(object: { code: $code, value: $value, expires_at: $expiresAt }) {
        id
      }
    }`,
    payload,
  );
}

export function setPartnerReferralCodeActive(id: string, active: boolean) {
  return graphql(
    `mutation ToggleReferralCode($id: uuid!, $active: Boolean!) {
      update_partner_referral_codes_by_pk(pk_columns: {id: $id}, _set: {active: $active}) {
        id
      }
    }`,
    { id, active },
  );
}
