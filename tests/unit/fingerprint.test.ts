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

  it('builds browser-like headers for usage requests', () => {
    const headers = buildUsageRequestHeaders({
      alias: 'personal',
      accessToken: 'token-123',
      refreshToken: 'refresh-123',
      expiresAt: Date.now() + 60_000,
      usageCount: 0
    })

    expect(headers.Authorization).toBe('Bearer token-123')
    expect(headers['User-Agent']).not.toBe('codex-cli')
    expect(headers['Sec-CH-UA']).toBeDefined()
    expect(headers['Sec-Fetch-Mode']).toBe('cors')
    expect(headers.Origin).toBe('https://chatgpt.com')
    expect(headers.Referer).toBe('https://chatgpt.com/')
  })

  it('falls back to the plain request shape when simulation is disabled', () => {
    process.env.OPENCODE_MULTI_AUTH_DISABLE_USAGE_FINGERPRINT_SIMULATION = '1'

    const headers = buildUsageRequestHeaders({
      alias: 'personal',
      accessToken: 'token-123',
      refreshToken: 'refresh-123',
      expiresAt: Date.now() + 60_000,
      usageCount: 0
    })

    expect(headers).toEqual({
      Authorization: 'Bearer token-123',
      'User-Agent': 'codex-cli'
    })
  })

  it('detects Cloudflare WAF blocks', () => {
    expect(
      isCloudflareWafResponse(
        503,
        '<html><body>Cloudflare challenge-platform blocked the request</body></html>',
        'text/html; charset=utf-8'
      )
    ).toBe(true)
  })

  it('does not treat generic HTML error pages as Cloudflare WAF blocks', () => {
    expect(
      isCloudflareWafResponse(
        403,
        '<html><body>Forbidden</body></html>',
        'text/html; charset=utf-8'
      )
    ).toBe(false)
  })

  it('still detects Cloudflare text when the response is not HTML', () => {
    expect(
      isCloudflareWafResponse(
        429,
        '{"message":"Cloudflare challenge-platform blocked the request"}',
        'application/json'
      )
    ).toBe(true)
  })

  it('ignores Cloudflare-like text for unrelated status codes', () => {
    expect(
      isCloudflareWafResponse(
        401,
        '<html><body>Cloudflare challenge</body></html>',
        'text/html; charset=utf-8'
      )
    ).toBe(false)
  })
})
