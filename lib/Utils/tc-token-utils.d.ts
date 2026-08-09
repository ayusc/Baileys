import type { ILogger } from './logger.js';
import type { SignalKeyStoreWithTransaction } from '../Types/index.js';
import type { BinaryNode } from '../WABinary/index.js';
/** Sentinel key under `tctoken` store holding a JSON array of tracked storage JIDs for cross-session pruning. */
export declare const TC_TOKEN_INDEX_KEY = "__index";
/** Read the persisted tctoken JID index and return its entries (never contains the sentinel key itself). */
export declare function readTcTokenIndex(keys: SignalKeyStoreWithTransaction): Promise<string[]>;
/** Build a SignalDataSet fragment that writes the merged index (persisted ∪ added) under the sentinel key. */
export declare function buildMergedTcTokenIndexWrite(keys: SignalKeyStoreWithTransaction, addedJids: Iterable<string>): Promise<{
    [TC_TOKEN_INDEX_KEY]: {
        token: Buffer;
    };
}>;
export declare function isTcTokenExpired(timestamp: number | string | null | undefined): boolean;
export declare function shouldSendNewTcToken(senderTimestamp: number | undefined): boolean;
/** Resolve JID to LID for tctoken storage (WA Web stores under LID) */
export declare function resolveTcTokenJid(jid: string, getLIDForPN: (pn: string) => Promise<string | null>, logger?: ILogger): Promise<string>;
/** Resolve target JID for issuing privacy token based on AB prop 14303 */
export declare function resolveIssuanceJid(jid: string, issueToLid: boolean, getLIDForPN: (pn: string) => Promise<string | null>, getPNForLID?: (lid: string) => Promise<string | null>, logger?: ILogger): Promise<string>;
type TcTokenParams = {
    jid: string;
    baseContent?: BinaryNode[];
    authState: {
        keys: SignalKeyStoreWithTransaction;
    };
    getLIDForPN: (pn: string) => Promise<string | null>;
    logger?: ILogger;
};
export declare function buildTcTokenFromJid({ authState, jid, baseContent, getLIDForPN, logger }: TcTokenParams): Promise<BinaryNode[] | undefined>;
type StoreTcTokensParams = {
    result: BinaryNode;
    fallbackJid: string;
    keys: SignalKeyStoreWithTransaction;
    getLIDForPN: (pn: string) => Promise<string | null>;
    onNewJidStored?: (jid: string) => void;
    logger?: ILogger;
};
export declare function storeTcTokensFromIqResult({ result, fallbackJid, keys, getLIDForPN, onNewJidStored, logger }: StoreTcTokensParams): Promise<void>;
type StoreTcTokenFromMessageParams = {
    node: BinaryNode;
    keys: SignalKeyStoreWithTransaction;
    getLIDForPN: (pn: string) => Promise<string | null>;
    logger?: ILogger;
};
/**
 * Opportunistically captures a `<tctoken>` child riding along on an incoming `<message>`
 * stanza — mirrors WA Web's `WAWebSetTcTokenChatAction.handleIncomingTcToken`. Distinct from
 * `storeTcTokensFromIqResult` (which handles `<tokens>` wrappers from IQ results / privacy_token
 * notifications): this is the proactive path, so a later reply to an already-warm contact
 * doesn't need to hit a 463 and reactively recover a token we should already have had.
 *
 * Returns the storage JID written, or `undefined` if nothing was stored (no token present,
 * stale timestamp, or the sender isn't a regular user).
 */
export declare function storeTcTokenFromMessageNode({ node, keys, getLIDForPN, logger }: StoreTcTokenFromMessageParams): Promise<string | undefined>;
export {};
//# sourceMappingURL=tc-token-utils.d.ts.map