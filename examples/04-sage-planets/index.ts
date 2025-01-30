import { Program, BN } from '@project-serum/anchor';
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from 'bs58';

import { byteArrayToString, readAllFromRPC, readFromRPC } from "@staratlas/data-source";
import { MineItem, Planet, Resource, SAGE_IDL } from "@staratlas/sage";

import { newAnchorProvider } from '../../shared/anchor-setup';

import { Table } from 'console-table-printer';

const SAGE_PROGRAM_ID = 'SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE';

// cd examples
// bun run runner 04-sage-planets/index.ts 49 20
export async function main(connection: Connection, wallet: Keypair) {
    const args = process.argv.slice(2);
    const x = args[1] || '0';
    const y = args[2] || '0';

    console.log(`Example 04: Sage Planets [x: ${x}, y: ${y}]`);

    const provider = newAnchorProvider(connection, wallet);
    const sageProgram = new Program(
        SAGE_IDL,
        SAGE_PROGRAM_ID,
        provider,
    );

    const sageGameId = process.env.SAGE_GAME_ID || '11111111111111111111111111111111111111111111';
    const gamePubkey = new PublicKey(sageGameId);

    const xBN = new BN(parseInt(x));
    const yBN = new BN(parseInt(y));

    const xArr = xBN.toTwos(64).toArrayLike(Buffer, 'le', 8);
    const yArr = yBN.toTwos(64).toArrayLike(Buffer, 'le', 8);

    const x58 = bs58.encode(xArr);
    const y58 = bs58.encode(yArr);

    const planets = await readAllFromRPC(
        connection,
        sageProgram as any,
        Planet,
        'processed',
        [
            {
                memcmp: {
                    offset: 73,
                    bytes: gamePubkey.toBase58(),
                },
            },
            {
                memcmp: {
                    offset: 105,
                    bytes: x58,
                },
            },
            {
                memcmp: {
                    offset: 113,
                    bytes: y58,
                },
            },
        ],
    );

    if (planets.length === 0) {
        throw Error('no planet found');
    }

    const planetsTable = new Table({
        columns: [
            { name: 'col1', title: 'Planet Name' },
            { name: 'col2', title: 'Location', alignment: 'left' },
            { name: 'col3', title: 'Number of Miners' },
            { name: 'col4', title: 'Number of Resources' },
        ]
    });
    const planetsRows: any[] = [];

    const resourcesTable = new Table({
        columns: [
            { name: 'col1', title: 'Mine Item', alignment: 'left' },
            { name: 'col2', title: 'Mint', alignment: 'left' },
            { name: 'col3', title: 'Resource Name' },
            { name: 'col4', title: 'System Richness' },
            { name: 'col5', title: 'Resources Hardness' },
            { name: 'col6', title: 'Miners' },
        ]
    });
    const resourcesRows: any[] = [];

    for (const planet of planets) {
        if (planet.type !== 'ok') continue;
        const data = planet.data.data;

        if (data.numResources >= 1) {
            const location = planet.key.toString();
            const planetName = byteArrayToString(data.name);
            const numMiners = data.numMiners;
            const numResources = data.numResources;

            const resources = await readAllFromRPC(
                connection,
                sageProgram as any,
                Resource,
                'processed',
                [
                    {
                        memcmp: {
                            offset: 9,
                            bytes: gamePubkey.toBase58(),
                        },
                    },
                    {
                        memcmp: {
                            offset: 41,
                            bytes: planet.key.toBase58(),
                        },
                    },
                ],
            );

            for (const resource of resources) {
                if (resource.type !== 'ok') continue;
                const resouceData = resource.data.data;

                const mineItem = await readFromRPC(
                    connection,
                    sageProgram as any,
                    resouceData.mineItem,
                    MineItem,
                    'processed',
                );

                if (mineItem.type !== 'ok') continue;
                const mineItemData = mineItem.data.data;

                const systemRichness = resouceData.systemRichness;
                const resourceHardness = mineItemData.resourceHardness;
                const numMiners = resouceData.numMiners;

                resourcesRows.push({
                    col1: mineItem.key.toString(),
                    col2: mineItemData.mint.toString(),
                    col3: byteArrayToString(mineItemData.name),
                    col4: systemRichness,
                    col5: resourceHardness,
                    col6: numMiners,
                });
            }

            resourcesTable.addRows(resourcesRows);
            planetsRows.push({
                col1: planetName,
                col2: location,
                col3: numMiners,
                col4: numResources,
            });
        }
    }

    planetsTable.addRows(planetsRows);
    planetsTable.printTable();
    resourcesTable.printTable();
}