import { AnchorProvider, Wallet } from "@project-serum/anchor";
import { Commitment, Connection, Keypair } from "@solana/web3.js";

const confirmTransactionInitialTimeout = 60000

const providerOptions = {
    preflightCommitment: 'confirmed' as Commitment,
    commitment: 'confirmed' as Commitment,
};

/**
 * Creates a new Connection to the Solana blockchain
 * @param rpcEndpoint - the uri for an rpc endpoint
 * @param rpcWebsocket - the uri for an rpc websocket
 * @returns the Connection
 */
export function newConnection(rpcEndpoint: string, rpcWebsocket: string): Connection {
    const connection = new Connection(rpcEndpoint, {
        commitment: providerOptions.commitment,
        confirmTransactionInitialTimeout,
        wsEndpoint: rpcWebsocket,
    })

    return connection;
}

/**
 * Creates a new Anchor Client for the Solana programs
 * @param connection - the Solana connection
 * @param wallet - the provider wallet
 * @returns the AnchorProvider
 */
export function newAnchorProvider(connection: Connection, wallet: Keypair): AnchorProvider {
    const provider = new AnchorProvider(
        connection,
        new Wallet(wallet),
        AnchorProvider.defaultOptions(),
    );

    return provider;
}