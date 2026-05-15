import { buildUsageRequestHeaders, isCloudflareWafResponse } from '../../src/fingerprint.js'

describe('usage fingerprint simulation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.OPENCODE_MULTI_AUTH_DISABLE_USAGE_FINGERPRINT_SIMULATION
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('builds Codex-native headers for usage requests', () => {
    const headers = buildUsageRequestHeaders({
      alias: 'personal',
      accessToken: 'token-123',
      refreshToken: 'refresh-123',
      accountId: 'acct-123',
      expiresAt: Date.now() + 60_000,
      usageCount: 0
    })

    expect(headers.Authorization).toBe('Bearer token-123')
    expect(headers.originator).toBe('codex_cli_rs')
    expect(headers['User-Agent']).toContain('codex_cli_rs/')
    expect(headers['x-openai-client-user-agent']).toContain('"platform":"cli"')
    expect(headers['ChatGPT-Account-ID']).toBe('acct-123')
  })

  it('falls back to the plain request shape when simulation is disabled', () => {
    process.env.OPENCODE_MULTI_AUTH_DISABLE_USAGE_FINGERPRINT_SIMULATION = '1'

    const headers = buildUsageRequestHeaders({
      alias: 'personal',
      accessToken: 'token-123',
      refreshToken: 'refresh-123',
      accountId: 'acct-123',
      expiresAt: Date.now() + 60_000,
      usageCount: 0
    })

    expect(headers).toEqual({
      Authorization: 'Bearer token-123',
      originator: 'codex_cli_rs',
      'User-Agent': 'codex_cli_rs/1.2.0',
      Accept: 'application/json, text/plain, */*',
      'ChatGPT-Account-ID': 'acct-123'
    })
  })

  it('detects Cloudflare WAF blocks', () => {
    expect(
      isCloudflareWafResponse(
        503,
        '<html><body>Cloudflare challenge-platform blocked the request</body></html>'
      )
    ).toBe(true)
  })

  it('does not treat generic HTML error pages as Cloudflare WAF blocks', () => {
    expect(
      isCloudflareWafResponse(
        403,
        '<html><body>Forbidden</body></html>'
      )
    ).toBe(false)
  })

  it('still detects Cloudflare text when the response is not HTML', () => {
    expect(
      isCloudflareWafResponse(
        429,
        '{"message":"Cloudflare challenge-platform blocked the request"}'
      )
    ).toBe(true)
  })

  it('ignores Cloudflare-like text for unrelated status codes', () => {
    expect(
      isCloudflareWafResponse(
        401,
        '<html><body>Cloudflare challenge</body></html>'
      )
    ).toBe(false)
  })
})
