import { resolveURL } from 'ufo'

import type { FetchOptions } from 'ofetch'
import { FetchError, ofetch } from 'ofetch'

/**
 * Represents the options for the GatewayAPI REST API client.
 */
export interface GatewayAPIClientOptions {
  apiToken: string
}

/**
 * Represents an error from the GatewayAPI REST API client.
 */
export class GatewayAPIClientError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GatewayAPIClientError'
  }
}

/**
 * Represents the error data from the GatewayAPI REST API client.
 */
export interface GatewayAPIUnauthorizedErrorData {
  code: string
  incident_uuid: string
  message: string
  variables: any
}

export class GatewayAPIUnauthorizedError extends GatewayAPIClientError {
  data: GatewayAPIUnauthorizedErrorData

  constructor(data: GatewayAPIUnauthorizedErrorData) {
    super(data.message)
    this.name = 'GatewayAPIUnauthorizedError'
    this.data = data
  }
}

export interface Balance {
  /**
   * The ID of your account, as an integer.
   */
  id: number

  /**
   * The remaining credit, as a float.
   */
  credit: number

  /**
   * The currency of your credit, `EUR`.
   */
  currency: string
}

export interface Recipient {
  /**
   * The full mobile phone number of the recipient.
   *
   * **Required**
   *
   * Mobile Station International Subscriber Directory Number, but you may think of this as the full mobile number, including area code if available and the country code, but without prefixed zeros or +.
   *
   * ### Examples:
   * - 4510203040 (typical Danish format: 10 20 30 40)
   * - 46735551020 (typical Swedish format: 073-555 10 20)
   * - 17325551020 (typical US format: (732) 555-1020)
   *
   * When our APIs parse the MSISDN, we allow for some slack. Whitespace and leading + is discarded before it is parsed to an integer and then checked that it is not above an certainly unreasonable maximum.
   *
   * The MSISDN is easily interchangeable with E.164 numbers, you simply remove or add the leading + in E.164. It can contain up to 15 digits, so we use an unsigned 64-bit integer.
   */
  msisdn: number | string
}

export interface SendSMS {
  /**
   * The content of the SMS.
   * Always specified in UTF-8 encoding, which we transcode depending on the “encoding” field. The default is the usual GSM-7 encoding.
   *
   * **Required**
   */
  message: string

  /**
   * Array of recipients, described below.
   * The number of recipients in a single message is limited to 10 000.
   *
   * **Required**
   */
  recipients: Recipient[]

  /**
   * Up to 11 alphanumeric characters, or 15 digits, that will be shown as the sender of the SMS
   */
  sender?: string

  /**
   * A opaque string reference, you may set to keep track of the message in your own systems.
   * Returned to you when you receive Delivery Statuses.
   */
  userref?: string
}

export interface SendSMSResponse {
  ids: number[]
  usage: {
    total_cost: number
    currency: string
    countries: {
      DK: number
    }
  }
}

/**
 * The GatewayAPI REST API client.
 */
export class GatewayAPIClient {
  private _authorizationHeader: string

  /**
   * Create a new GatewayAPI REST API client instance.
   *
   * @param options The options for the GatewayAPI REST API client.
   */
  constructor(options: GatewayAPIClientOptions) {
    this._authorizationHeader = Buffer.from(`${options.apiToken}:`).toString('base64')
  }

  /**
   * You can use the /me endpoint to check your account balance, and what currency your account is set to.
   *
   * See: https://gatewayapi.com/docs/apis/prices-balance/
   */
  balance = async () => {
    return await this._fetch<Balance>('/rest/me')
  }

  /**
   * see: https://gatewayapi.com/docs/apis/rest/
   */
  sendSMS = async (options: SendSMS) => {
    return await this._fetch<SendSMSResponse>('/rest/mtsms', {
      method: 'POST',
      body: options,
    })
  }

  /**
   * Run a request.
   *
   * The base URL is `https://gatewayapi.com/`, use a relative path.
   */
  _fetch = async <T = any>(path: string, options?: FetchOptions<'json'>) => {
    const url = resolveURL('https://gatewayapi.com/', path)

    try {
      return await ofetch<T>(url, {
        responseType: 'json',
        ...options,
        headers: {
          ...options?.headers,
          Authorization: `Basic ${this._authorizationHeader}`,
        },
      })
    }
    catch (e: unknown) {
      // 200 OK: Returns an object with an array of message IDs and an object with usage information on succes
      // 400 Bad Request: Ie. invalid arguments, details in the JSON body
      // 401 Unauthorized: Ie. invalid API key or signature
      // 403 Forbidden: Ie. unauthorized IP address
      // 422 Unprocessable Entity: Invalid JSON request body
      // 500 Internal Server Error: If the request cannot be processed due to an exception. The exception details is returned in the JSON body

      if (e instanceof FetchError) {
        if (e.statusCode === 401) {
          throw new GatewayAPIUnauthorizedError(e.data)
        }
      }

      throw e
    }
  }
}
