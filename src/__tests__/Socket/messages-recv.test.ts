import { jest } from '@jest/globals'
import { DEFAULT_CONNECTION_CONFIG } from '../../Defaults'
import type { AuthenticationState } from '../../Types'
import { type BinaryNode } from '../../WABinary'

const sendNode = jest.fn(async () => undefined)
const authState = {
	creds: {},
	keys: {
		get: jest.fn(async () => ({})),
		set: jest.fn(async () => undefined)
	}
}

jest.unstable_mockModule('../../Socket/messages-send', () => ({
	makeMessagesSocket: jest.fn(() => ({
		authState,
		sendNode,
		ws: { on: jest.fn(), isOpen: true },
		ev: { on: jest.fn(), buffer: jest.fn(), flush: jest.fn(), emit: jest.fn() },
		registerSocketEndHandler: jest.fn(),
		onUnexpectedError: jest.fn(),
		signalRepository: {
			lidMapping: {
				getLIDForPN: jest.fn()
			}
		}
	}))
}))

const { makeMessagesRecvSocket, extractLinkCodeCompanionRegBuffers } = await import('../../Socket/messages-recv')

const linkCodeCompanionRegNode = (content?: BinaryNode[]): BinaryNode => ({
	tag: 'notification',
	attrs: {
		from: '@s.whatsapp.net',
		type: 'link_code_companion_reg',
		id: '3728034975'
	},
	content
})

describe('sendMessageAck', () => {
	it('acknowledges notifications before credentials identify the device', async () => {
		const sock = makeMessagesRecvSocket({
			...DEFAULT_CONNECTION_CONFIG,
			auth: authState as unknown as AuthenticationState
		})
		const node: BinaryNode = {
			tag: 'notification',
			attrs: {
				id: 'pre-login-notification',
				from: 's.whatsapp.net',
				type: 'companion_reg_refresh'
			}
		}

		await expect(sock.sendMessageAck(node)).resolves.toBeUndefined()
		expect(sendNode).toHaveBeenCalledWith({
			tag: 'ack',
			attrs: {
				id: 'pre-login-notification',
				to: 's.whatsapp.net',
				class: 'notification',
				type: 'companion_reg_refresh'
			}
		})
	})
})

describe('incoming message tctoken capture (Baileys#2698/#2707)', () => {
	beforeEach(() => {
		authState.keys.get.mockClear()
		authState.keys.set.mockClear()
		sendNode.mockClear()
	})

	it('stores a tctoken riding along on an incoming message, wired through the real CB:message handler', async () => {
		const sock = makeMessagesRecvSocket({
			...DEFAULT_CONNECTION_CONFIG,
			auth: authState as unknown as AuthenticationState
		})

		const onCalls = (sock.ws.on as jest.Mock).mock.calls as [string, (node: BinaryNode) => Promise<void>][]
		const messageHandler = onCalls.find(([tag]) => tag === 'CB:message')?.[1]
		expect(messageHandler).toBeDefined()

		const node: BinaryNode = {
			tag: 'message',
			attrs: { from: 'contact@s.whatsapp.net', id: 'msg-1' },
			content: [
				{
					tag: 'tctoken',
					attrs: { t: '1700000000' },
					content: new Uint8Array([1, 2, 3, 4])
				}
			]
		}

		await messageHandler!(node)
		await new Promise(resolve => setTimeout(resolve, 0))

		expect(authState.keys.set).toHaveBeenCalledWith({
			tctoken: {
				'contact@s.whatsapp.net': {
					token: Buffer.from([1, 2, 3, 4]),
					timestamp: '1700000000'
				}
			}
		})
	})
})

describe('extractLinkCodeCompanionRegBuffers', () => {
	it('returns undefined for notification without pairing data', () => {
		expect(extractLinkCodeCompanionRegBuffers(linkCodeCompanionRegNode())).toBeUndefined()
	})

	it('returns undefined when a required pairing field is missing', () => {
		const node = linkCodeCompanionRegNode([
			{
				tag: 'link_code_companion_reg',
				attrs: {},
				content: [
					{ tag: 'link_code_pairing_ref', attrs: {}, content: Buffer.from('ref') },
					{ tag: 'primary_identity_pub', attrs: {}, content: Buffer.from('identity') }
				]
			}
		])

		expect(extractLinkCodeCompanionRegBuffers(node)).toBeUndefined()
	})

	it('extracts required pairing buffers', () => {
		const ref = Buffer.from('ref')
		const primaryIdentityPublicKey = Buffer.from('identity')
		const primaryEphemeralPublicKeyWrapped = new Uint8Array([1, 2, 3])
		const node = linkCodeCompanionRegNode([
			{
				tag: 'link_code_companion_reg',
				attrs: {},
				content: [
					{ tag: 'link_code_pairing_ref', attrs: {}, content: ref },
					{ tag: 'primary_identity_pub', attrs: {}, content: primaryIdentityPublicKey },
					{
						tag: 'link_code_pairing_wrapped_primary_ephemeral_pub',
						attrs: {},
						content: primaryEphemeralPublicKeyWrapped
					}
				]
			}
		])

		const result = extractLinkCodeCompanionRegBuffers(node)

		expect(result).toEqual({
			ref,
			primaryIdentityPublicKey,
			primaryEphemeralPublicKeyWrapped: Buffer.from(primaryEphemeralPublicKeyWrapped)
		})
	})
})
