import { Program } from "@project-serum/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import { byteArrayToString, readAllFromRPC } from "@staratlas/data-source";
import { Fleet, SAGE_IDL } from "@staratlas/sage";

import { newAnchorProvider } from "../../shared/anchor-setup";

const SAGE_PROGRAM_ID = "SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE"

// cd examples
// bun run runner 03-sage-fleets/index.ts
export async function main(connection: Connection, wallet: Keypair) {
    console.log('Example 03: Sage Fleet');

    const provider = newAnchorProvider(connection, wallet);
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
        console.log(JSON.stringify(data, null, 2));
    }
}