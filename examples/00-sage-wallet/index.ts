import { Connection, Keypair } from '@solana/web3.js';

// cd examples
// bun run runner 00-sage-wallet/index.ts
export async function main(_connection: Connection, wallet: Keypair) {
    console.log('Example 00: Sage Wallet');
    console.log('Running example with wallet:', wallet.publicKey.toBase58());
}