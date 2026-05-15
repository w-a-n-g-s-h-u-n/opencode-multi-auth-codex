import * as os from 'node:os'
import type { AccountCredentials } from './types.js'

interface CodexFingerprint {
  userAgent: string
  clientUserAgent: string
}

const DEFAULT_ORIGINATOR = 'codex_cli_rs'
const DISABLE_ENV = 'OPENCODE_MULTI_AUTH_DISABLE_USAGE_FINGERPRINT_SIMULATION'
const PACKAGE_VERSION = process.env.npm_package_version || '1.2.0'

function shouldDisableSimulation(): boolean {
  const raw = process.env[DISABLE_ENV]?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

function getPlatformLabel(): string {
  switch (os.platform()) {
    case 'win32':
      return `Windows ${os.release()}`
    case 'darwin':
      return `macOS ${os.release()}`
    default:
      return `Linux ${os.release()}`
  }
}

function getTerminalToken(): string | undefined {
  const program = process.env.TERM_PROGRAM?.trim()
  if (!program) return undefined
  const version = process.env.TERM_PROGRAM_VERSION?.trim()
  return version ? `${program}/${version}` : program
}

function buildFingerprint(account: AccountCredentials): CodexFingerprint {
  const terminalToken = getTerminalToken()
  const arch = os.arch()
  const userAgent = `${DEFAULT_ORIGINATOR}/${PACKAGE_VERSION} (${getPlatformLabel()}; ${arch})${terminalToken ? ` ${terminalToken}` : ''}`
  const clientUserAgent = JSON.stringify({
    platform: 'cli',
    version: PACKAGE_VERSION,
    lang: 'rust',
    http_library: 'reqwest',
    os: os.platform(),
    arch,
    account_id: account.accountId
  })

  return { userAgent, clientUserAgent }
}

export function buildUsageRequestHeaders(account: AccountCredentials): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${account.accessToken?.trim() || ''}`,
    originator: DEFAULT_ORIGINATOR,
    'User-Agent': `${DEFAULT_ORIGINATOR}/${PACKAGE_VERSION}`,
    Accept: 'application/json, text/plain, */*'
  }

  if (account.accountId) {
    headers['ChatGPT-Account-ID'] = account.accountId
  }

  if (shouldDisableSimulation()) {
    return headers
  }

  const fingerprint = buildFingerprint(account)
  return {
    ...headers,
    'User-Agent': fingerprint.userAgent,
    'x-openai-client-user-agent': fingerprint.clientUserAgent,
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache'
  }
}

export function isCloudflareWafResponse(status: number, rawText: string): boolean {
  const normalized = rawText.toLowerCase()
  return (
    (status === 403 || status === 429 || status === 503) &&
    (
      normalized.includes('cloudflare') ||
      normalized.includes('waf') ||
      normalized.includes('challenge-platform') ||
      normalized.includes('attention required') ||
      normalized.includes('verify you are human') ||
      normalized.includes('cf-ray')
    )
  )
}
