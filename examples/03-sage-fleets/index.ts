import { Program } from "@project-serum/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import { byteArrayToString, readAllFromRPC } from "@staratlas/data-source";
import { Fleet, SAGE_IDL } from "@staratlas/sage";

import { newConnection, newAnchorProvider } from "../../shared/anchor-setup";
import { loadKeypair } from "../../shared/wallet-setup";

const SAGE_PROGRAM_ID = "SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE"

const main = async (connection: Connection, myWallet: Keypair) => {
    console.log('Example 03: Sage Fleet');

    const provider = newAnchorProvider(connection, myWallet);
    const sageProgram = new Program(
        SAGE_IDL,
        SAGE_PROGRAM_ID,
        provider,
    );

    const sagePlayerProfileId = process.env.SAGE_PLAYER_PROFILE_ID || "11111111111111111111111111111111111111111111"
    const playerPofilePubkey = new PublicKey(sagePlayerProfileId);

    const fleets = await readAllFromRPC(
        connection,
        sageProgram as any,
        Fleet,
        'processed',
        [{
            memcmp: {
                offset: 8 + 1 + 32,
                bytes: playerPofilePubkey.toBase58(),
            },
        }],
    );

    if (fleets.length === 0) {
        throw Error('no fleet found');
    }

    for (const fleet of fleets) {
        if (fleet.type !== 'ok') continue;
        const data = fleet.data.data;
        const fleetLabel = data.fleetLabel;

        console.log(`Fleet Callsign: ${byteArrayToString(fleetLabel)}`);
        console.log(`Fleet Pubkey: ${fleet.key.toBase58()}`)
        console.log(JSON.stringify(data, null, 2));
    }
};

// cd examples
// bun run 03-sage-fleet/index.ts

const wallet = process.env.WALLET_PATH || "/home/user/.config/solana/id.json"
const rpcEndpoint = process.env.RPC_ENDPOINT || "https://mainnet.helius-rpc.com/?api-key=";
const rpcWebsocket = process.env.RPC_WEBSOCKET || "wss://rpc.helius.xyz/?api-key=";

const myWallet = loadKeypair(wallet);
const connection = newConnection(rpcEndpoint, rpcWebsocket);
main(connection, myWallet);