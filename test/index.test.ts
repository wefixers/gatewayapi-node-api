import { expect, it } from 'vitest'

import { GatewayAPIClient } from '../src'

// @ts-expect-error, i am too lazy to fix this
const GATEWAYAPI_CLIENT_SECRET = import.meta.env.VITE_GATEWAYAPI_CLIENT_SECRET

/**
 * The GatewayAPI stream client.
 */
const gatewayapi = new GatewayAPIClient({
  apiToken: GATEWAYAPI_CLIENT_SECRET,
})

// behold the magic of testing on live services!
it('should list all lists', async () => {
  await expect(gatewayapi.balance()).resolves.toBeTypeOf('object')
})
