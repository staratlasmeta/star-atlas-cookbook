import { Connection, Keypair } from '@solana/web3.js';
import { loadKeypair } from '../shared/wallet-setup';
import { newConnection } from '../shared/anchor-setup';

interface Example {
    main: (connection: Connection, wallet: Keypair) => Promise<void>;
}

async function runExample(examplePath: string) {
    const wallet = process.env.WALLET_PATH || '/home/user/.config/solana/id.json';
    const rpcEndpoint = process.env.RPC_ENDPOINT || 'https://mainnet.helius-rpc.com/?api-key=';
    const rpcWebsocket = process.env.RPC_WEBSOCKET || 'wss://rpc.helius.xyz/?api-key=';

    const myWallet = loadKeypair(wallet);
    const connection = newConnection(rpcEndpoint, rpcWebsocket);

    try {
        const example: Example = await import(examplePath);
        await example.main(connection, myWallet);
    } catch (error) {
        console.error('Failed to run example:', error);
    }
}

// Get example path from command line
const examplePath = process.argv[2];
if (!examplePath) {
    console.error('Please provide an example path');
    process.exit(1);
}

runExample(examplePath);