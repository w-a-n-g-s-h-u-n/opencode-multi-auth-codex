import type { AccountCredentials } from './types.js';
export declare function buildUsageRequestHeaders(account: AccountCredentials): Record<string, string>;
export declare function isCloudflareWafResponse(status: number, rawText: string, contentType?: string | null): boolean;
//# sourceMappingURL=fingerprint.d.ts.map