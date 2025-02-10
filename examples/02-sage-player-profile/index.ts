import { Program } from "@project-serum/anchor";
import { Connection, Keypair } from "@solana/web3.js";

import { readAllFromRPC } from "@staratlas/data-source";
import { PLAYER_PROFILE_IDL, PlayerProfile } from "@staratlas/player-profile";

import { newAnchorProvider } from "../../shared/anchor-setup";

const PLAYER_PROFILE_PROGRAM_ID = "pprofELXjL5Kck7Jn5hCpwAL82DpTkSYBENzahVtbc9"

// cd examples
// bun run runner 02-sage-player-profile/index.ts
export async function main(connection: Connection, wallet: Keypair) {
    console.log("Example 02: Sage Player Profile");

    const provider = newAnchorProvider(connection, wallet);
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
                    bytes: wallet.publicKey.toBase58(),
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
}