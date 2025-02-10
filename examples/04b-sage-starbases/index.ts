import { Program } from '@project-serum/anchor';
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from 'bs58';

import { byteArrayToString, readAllFromRPC } from "@staratlas/data-source";
import { Starbase, SAGE_IDL } from "@staratlas/sage";

import { newAnchorProvider } from '../../shared/anchor-setup';

import { Table } from 'console-table-printer';

const SAGE_PROGRAM_ID = 'SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE';

// cd examples
// # Mud (1) Oni (2) Ustur (3)
// bun run runner 04b-sage-starbases/index.ts 1
export async function main(connection: Connection, wallet: Keypair) {
    const args = process.argv.slice(2);
    const faction = args[1] || '1'; // default to 'Mud' faction

    console.log(`Example 04b: Sage Starbases`);

    const provider = newAnchorProvider(connection, wallet);
    const sageProgram = new Program(
        SAGE_IDL,
        SAGE_PROGRAM_ID,
        provider,
    );

    const factionBuffer = Buffer.from([parseInt(faction)]);
    const faction58 = bs58.encode(factionBuffer);

    const starbases = await readAllFromRPC(
        connection,
        sageProgram as any,
        Starbase,
        'processed',
        [
            {
                memcmp: {
                    offset: 201,
                    bytes: faction58,
                },
            },
        ],
    );

    if (starbases.length === 0) {
        throw Error('no starbases found');
    }

    const starbasesTable = new Table({
        columns: [
            { name: 'col1', title: 'Address', alignment: 'left' },
            { name: 'col2', title: 'Starbase Name', alignment: 'left' },
            { name: 'col3', title: 'Lvl' },
            { name: 'col4', title: 'HP' },
            { name: 'col5', title: 'SP' },
            { name: 'col6', title: 'Sector'},
        ]
    });
    const starbasesRows: any[] = [];

    for (const starbase of starbases) {
        if (starbase.type !== 'ok') continue;
        const data = starbase.data.data;

        // console.log(data);

        starbasesRows.push({
            col1: starbase.key.toBase58(),
            col2: byteArrayToString(data.name),
            col3: data.level,
            col4: data.hp.toString(),
            col5: data.sp.toString(),
            col6: data.sector.toString(),
        });
    }

    starbasesTable.addRows(starbasesRows);
    starbasesTable.printTable();
}