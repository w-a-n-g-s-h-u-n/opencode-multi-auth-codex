import { classifyUsageApiFailure } from '../../src/usage-limits.js'

describe('usage API failure classification', () => {
  it('treats 401 auth failures as terminal and skips probe fallback', () => {
    const result = classifyUsageApiFailure(
      401,
      JSON.stringify({
        error: {
          message: 'Provided authentication token is expired. Please try signing in again.',
          code: 'token_expired'
        },
        status: 401
      })
    )

    expect(result).toEqual({
      shouldProbeFallback: false,
      authInvalid: true
    })
  })

  it('treats deactivated workspace failures as terminal and skips probe fallback', () => {
    const result = classifyUsageApiFailure(
      402,
      JSON.stringify({
        detail: {
          code: 'deactivated_workspace',
          message: 'Workspace is deactivated'
        }
      })
    )

    expect(result).toEqual({
      shouldProbeFallback: false,
      workspaceDeactivated: true,
      workspaceDeactivatedReason: 'Workspace is deactivated'
    })
  })

  it('treats Cloudflare WAF HTML blocks as probe-fallback cases', () => {
    const result = classifyUsageApiFailure(
      403,
      '<html><body>Attention Required! | Cloudflare</body></html>',
      'text/html; charset=UTF-8'
    )

    expect(result).toEqual({
      shouldProbeFallback: true
    })
  })
})
