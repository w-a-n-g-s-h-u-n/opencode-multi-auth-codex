import * as crypto from 'node:crypto';
const DEFAULT_ORIGIN = 'https://chatgpt.com';
const DEFAULT_REFERER = `${DEFAULT_ORIGIN}/`;
const DISABLE_ENV = 'OPENCODE_MULTI_AUTH_DISABLE_USAGE_FINGERPRINT_SIMULATION';
// Keep these profiles aligned with a recent stable browser baseline and refresh them when
// the upstream request shape changes.
const FINGERPRINTS = [
    {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        acceptLanguage: 'en-US,en;q=0.9',
        secChUa: '"Chromium";v="124", "Google Chrome";v="124", ";Not A Brand";v="99"',
        secChUaMobile: '?0',
        secChUaPlatform: '"Windows"',
        secFetchSite: 'same-site',
        secFetchMode: 'cors',
        secFetchDest: 'empty',
        dnt: '1'
    },
    {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        acceptLanguage: 'en-US,en;q=0.8',
        secChUa: '"Chromium";v="124", "Google Chrome";v="124", "Not A(Brand)";v="99"',
        secChUaMobile: '?0',
        secChUaPlatform: '"macOS"',
        secFetchSite: 'same-site',
        secFetchMode: 'cors',
        secFetchDest: 'empty',
        dnt: '1'
    },
    {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        acceptLanguage: 'en-US,en;q=0.9',
        secChUa: '"Chromium";v="124", "Google Chrome";v="124", "Not.A/Brand";v="8"',
        secChUaMobile: '?0',
        secChUaPlatform: '"Linux"',
        secFetchSite: 'same-site',
        secFetchMode: 'cors',
        secFetchDest: 'empty',
        dnt: '1'
    }
];
function shouldDisableSimulation() {
    const raw = process.env[DISABLE_ENV]?.trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes';
}
function fingerprintSeed(account) {
    return [
        account.alias,
        account.accountId,
        account.accountUserId,
        account.userId,
        account.email,
        account.accessToken?.slice(0, 16)
    ]
        .filter(Boolean)
        .join(':');
}
function pickFingerprint(account) {
    const seed = fingerprintSeed(account) || account.alias;
    const digest = crypto.createHash('sha256').update(seed).digest();
    const index = digest.readUInt32BE(0) % FINGERPRINTS.length;
    return FINGERPRINTS[index];
}
export function buildUsageRequestHeaders(account) {
    const headers = {
        Authorization: `Bearer ${account.accessToken?.trim() || ''}`,
        'User-Agent': 'codex-cli'
    };
    if (account.accountId) {
        headers['ChatGPT-Account-Id'] = account.accountId;
    }
    if (shouldDisableSimulation()) {
        return headers;
    }
    const fingerprint = pickFingerprint(account);
    return {
        ...headers,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': fingerprint.acceptLanguage,
        Origin: DEFAULT_ORIGIN,
        Referer: DEFAULT_REFERER,
        'Sec-CH-UA': fingerprint.secChUa,
        'Sec-CH-UA-Mobile': fingerprint.secChUaMobile,
        'Sec-CH-UA-Platform': fingerprint.secChUaPlatform,
        'Sec-Fetch-Dest': fingerprint.secFetchDest,
        'Sec-Fetch-Mode': fingerprint.secFetchMode,
        'Sec-Fetch-Site': fingerprint.secFetchSite,
        'User-Agent': fingerprint.userAgent,
        DNT: fingerprint.dnt,
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache'
    };
}
export function isCloudflareWafResponse(status, rawText) {
    const normalized = rawText.toLowerCase();
    return ((status === 403 || status === 429 || status === 503) &&
        (normalized.includes('cloudflare') ||
            normalized.includes('waf') ||
            normalized.includes('challenge-platform') ||
            normalized.includes('attention required') ||
            normalized.includes('verify you are human') ||
            normalized.includes('cf-ray')));
}
//# sourceMappingURL=fingerprint.js.map