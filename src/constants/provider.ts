export const SSO_PROVIDERS = ['google', 'facebook', 'apple'] as const;
export type SsoProvider = (typeof SSO_PROVIDERS)[number];
