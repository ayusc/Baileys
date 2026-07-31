import type { proto, WAMessage, WAMessageKey, WAMessageUpdate } from '../../src'
import { isJidBroadcast, isJidNewsletter } from '../../src'

export interface MessageUpsert {
	messages: WAMessage[]
	type: 'append' | 'notify'
}

const innerMessage = (message: proto.IMessage): proto.IMessage | undefined =>
	message.ephemeralMessage?.message ||
	message.viewOnceMessage?.message ||
	message.documentWithCaptionMessage?.message ||
	message.viewOnceMessageV2?.message ||
	message.viewOnceMessageV2Extension?.message ||
	undefined

export const extractText = (message: proto.IMessage | null | undefined): string | undefined => {
	let content = message
	for (let depth = 0; content && depth < 5; depth++) {
		if (typeof content.conversation === 'string') {
			return content.conversation
		}

		if (typeof content.extendedTextMessage?.text === 'string') {
			return content.extendedTextMessage.text
		}

		content = innerMessage(content)
	}

	return undefined
}

const isSupportedIncomingMessage = (message: WAMessage): boolean => {
	const remoteJid = message.key.remoteJid
	return !!remoteJid && !message.key.fromMe && !isJidBroadcast(remoteJid) && !isJidNewsletter(remoteJid)
}

export const findOriginalMessage = (upsert: MessageUpsert, expectedText: string): WAMessage | undefined => {
	if (upsert.type !== 'notify') {
		return undefined
	}

	return upsert.messages.find(
		message => isSupportedIncomingMessage(message) && !!message.key.id && extractText(message.message) === expectedText
	)
}

export const hasUsableMessageSecret = (message: WAMessage): boolean => {
	const secret = message.message?.messageContextInfo?.messageSecret
	return secret instanceof Uint8Array && secret.byteLength === 32
}

export const extractEditedText = (update: WAMessageUpdate, originalMessageId: string): string | undefined => {
	if (update.key.id !== originalMessageId) {
		return undefined
	}

	return extractText(update.update.message?.editedMessage?.message)
}

export class OriginalMessageLookup {
	private original: { id: string; message: proto.IMessage } | undefined
	private matchingLookups = 0

	record(original: WAMessage): void {
		if (!original.key.id || !original.message) {
			throw new Error('Original message is missing its key or content')
		}

		this.original = { id: original.key.id, message: original.message }
	}

	async getMessage(key: WAMessageKey): Promise<proto.IMessage | undefined> {
		if (!key.id || key.id !== this.original?.id) {
			return undefined
		}

		this.matchingLookups++
		return this.original.message
	}

	get matchingLookupCount(): number {
		return this.matchingLookups
	}
}
