export type CcpaLocationResult = {
  regionCode?: string;
  countryCode?: string;
  shouldShowBanner: boolean;
};

export async function detectCcpaBannerEligibility(): Promise<CcpaLocationResult> {
  const response = await fetch('https://ipapi.co/json/');
  if (!response.ok) {
    throw new Error(`Location check failed (${response.status})`);
  }

  const data = await response.json();
  const regionCode = String(data?.region_code ?? '');
  const countryCode = String(data?.country_code ?? '');

  return {
    regionCode,
    countryCode,
    shouldShowBanner: regionCode === 'CA' || countryCode === 'US',
  };
}
