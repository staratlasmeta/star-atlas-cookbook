import { Program } from "@project-serum/anchor";
import { Connection, Keypair } from "@solana/web3.js";

import { readAllFromRPC } from "@staratlas/data-source";
import { PLAYER_PROFILE_IDL, PlayerProfile } from "@staratlas/player-profile";

import { newConnection, newAnchorProvider } from "../../shared/anchor-setup";
import { loadKeypair } from "../../shared/wallet-setup";

const PLAYER_PROFILE_PROGRAM_ID = "pprofELXjL5Kck7Jn5hCpwAL82DpTkSYBENzahVtbc9"

const main = async (connection: Connection, myWallet: Keypair) => {
    console.log("Example 02: Sage Player Profile");

    const provider = newAnchorProvider(connection, myWallet);
    const playerProfileProgram = new Program(
        PLAYER_PROFILE_IDL,
        PLAYER_PROFILE_PROGRAM_ID,
        provider,
    );

    const myProfiles = await readAllFromRPC(
        connection,
        playerProfileProgram as any,
        PlayerProfile,
        'processed',
        [
            {
                memcmp: {
                    offset: PlayerProfile.MIN_DATA_SIZE + 2,
                    bytes: myWallet.publicKey.toBase58(),
                },
            },
        ],
    );

    if (myProfiles.length === 0) {
        throw 'no player profile found';
    }

    for (let index = 0; index < myProfiles.length; index++) {
        const thisProfile = myProfiles[index];
        if (thisProfile.type === 'error') throw new Error('Error reading account');

        console.log(JSON.stringify(thisProfile, null, 2));
    }
};

// cd examples/02-sage-player-profile
// bun run index.ts
const wallet = process.env.WALLET_PATH || "/home/user/.config/solana/id.json"
const rpcEndpoint = process.env.RPC_ENDPOINT || "https://mainnet.helius-rpc.com/?api-key=";
const rpcWebsocket = process.env.RPC_WEBSOCKET || "wss://rpc.helius.xyz/?api-key=";

const myWallet = loadKeypair(wallet);
const connection = newConnection(rpcEndpoint, rpcWebsocket);
main(connection, myWallet);