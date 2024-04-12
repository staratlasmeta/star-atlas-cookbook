import { Program } from "@project-serum/anchor";
import { Connection, Keypair } from "@solana/web3.js";

import { readAllFromRPC } from "@staratlas/data-source";
import { Game, SAGE_IDL } from "@staratlas/sage";

import { newConnection, newAnchorProvider } from "../../shared/anchor-setup";
import { loadKeypair } from "../../shared/wallet-setup";

const SAGE_PROGRAM_ID = "SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE"

const mainFunction = async (connection: Connection, myWallet: Keypair) => {
    console.log("Example 01: Sage Game");

    const provider = newAnchorProvider(connection, myWallet);
    const sageProgram = new Program(
        SAGE_IDL,
        SAGE_PROGRAM_ID,
        provider,
    );

    const games = await readAllFromRPC(
        connection,
        sageProgram as any,
        Game,
        'processed',
        [],
    );

    if (games.length === 0) {
        throw 'no game found';
    }

    const [game] = games;
    console.log("SAGE_GAME_ID: ", game.key.toString());
    console.log("Game: ", JSON.stringify(game, null, 2));
};

// cd examples/01-sage-game
// bun run index.ts
const wallet = process.env.WALLET_PATH || "/home/user/.config/solana/id.json"
const rpcEndpoint = process.env.RPC_ENDPOINT || "https://mainnet.helius-rpc.com/?api-key=";
const rpcWebsocket = process.env.RPC_WEBSOCKET || "wss://rpc.helius.xyz/?api-key=";

const myWallet = loadKeypair(wallet);
const connection = newConnection(rpcEndpoint, rpcWebsocket);
mainFunction(connection, myWallet);