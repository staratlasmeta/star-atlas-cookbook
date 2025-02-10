import { Program } from "@project-serum/anchor";
import { Connection, Keypair } from "@solana/web3.js";

import { readAllFromRPC } from "@staratlas/data-source";
import { Game, SAGE_IDL } from "@staratlas/sage";

import { newAnchorProvider } from "../../shared/anchor-setup";

const SAGE_PROGRAM_ID = "SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE"

// cd examples
// bun run runner 01-sage-game/index.ts
export async function main(connection: Connection, wallet: Keypair) {
    console.log("Example 01: Sage Game");

    const provider = newAnchorProvider(connection, wallet);
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
        throw Error('no game found');
    }

    const [game] = games;
    console.log("SAGE_GAME_ID: ", game.key.toString());
    console.log("Game: ", JSON.stringify(game, null, 2));
}