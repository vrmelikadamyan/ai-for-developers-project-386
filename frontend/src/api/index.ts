import { client } from './generated/client.gen'

client.setConfig({ baseUrl: window.location.origin })

export * from './generated'
