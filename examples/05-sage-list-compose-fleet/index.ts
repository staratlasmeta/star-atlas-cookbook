import { Program, BN } from '@project-serum/anchor';
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from 'bs58';

import { byteArrayToString, readAllFromRPC, readFromRPCOrError } from "@staratlas/data-source";
import { Ship, Starbase, StarbasePlayer, SAGE_IDL } from "@staratlas/sage";

import { newConnection, newAnchorProvider } from "../../shared/anchor-setup";
import { loadKeypair } from "../../shared/wallet-setup";

const SAGE_PROGRAM_ID = "SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE";

const main = async (connection: Connection, myWallet: Keypair) => {
    const args = process.argv.slice(2);
    const x = args[0] || '0';
    const y = args[1] || '0';

    console.log('Example 05: Sage Ships available to compose this fleet');

    const provider = newAnchorProvider(connection, myWallet);
    const sageProgram = new Program(
        SAGE_IDL,
        SAGE_PROGRAM_ID,
        provider,
    );

    const sageGameId = process.env.SAGE_GAME_ID || "11111111111111111111111111111111111111111111";
    const sageGameIdPubkey = new PublicKey(sageGameId);

    const sagePlayerProfileId = process.env.SAGE_PLAYER_PROFILE_ID || "11111111111111111111111111111111111111111111"
    const playerPofilePubkey = new PublicKey(sagePlayerProfileId);

    const xBN = new BN(parseInt(x));
    const yBN = new BN(parseInt(y));

    const xArr = xBN.toTwos(64).toArrayLike(Buffer, 'le', 8);
    const yArr = yBN.toTwos(64).toArrayLike(Buffer, 'le', 8);

    const x58 = bs58.encode(xArr);
    const y58 = bs58.encode(yArr);

    const [starbase] = await readAllFromRPC(
        connection,
        sageProgram as any,
        Starbase,
        'confirmed',
        [
            {
                memcmp: {
                    offset: 8 + 1,
                    bytes: sageGameIdPubkey.toBase58(),
                },
            },
            {
                memcmp: {
                    offset: 8 + 1 + 32,
                    bytes: x58,
                },
            },
            {
                memcmp: {
                    offset: 8 + 1 + 32 + 8,
                    bytes: y58,
                },
            },
        ],
    );

    if (starbase === undefined || starbase.type !== 'ok') {
        throw Error('no starbase found');
    }

    const [starbasePlayer] = await readAllFromRPC(
        connection,
        sageProgram as any,
        StarbasePlayer,
        'confirmed',
        [
            {
                memcmp: {
                    offset: 8 + 1,
                    bytes: playerPofilePubkey.toBase58(),
                },
            },
            {
                memcmp: {
                    offset: 8 + 1 + 32,
                    bytes: sageGameIdPubkey.toBase58(),
                },
            },
            {
                memcmp: {
                    offset: 8 + 1 + 32 + 32,
                    bytes: starbase.key.toBase58(),
                },
            },
        ],
    );

    if (starbasePlayer === undefined || starbasePlayer.type !== 'ok') {
        throw Error('no starbase player found');
    }

    // console.log(JSON.stringify(starbase, null, 2));
    const starbaseData = starbase.data.data;
    const starbaseName = byteArrayToString(starbaseData.name);

    // console.log(JSON.stringify(starbasePlayer, null, 2));
    const starbasePlayerData = starbasePlayer.data.data;
    const shipEscrowCount = starbasePlayerData.shipEscrowCount;

    console.log(`Starbase: ${starbaseName} (${starbase.key.toBase58()})`);
    console.log(`Player: ${playerPofilePubkey.toBase58()}`);
    console.log(`Ship Escrow Count: ${shipEscrowCount}`);

    for (let i = 0; i < starbasePlayer.data.wrappedShipEscrows.length; i++) {
        const entry = starbasePlayer.data.wrappedShipEscrows[i];

        const ship = await readFromRPCOrError(
            connection,
            sageProgram as any,
            entry.ship,
            Ship,
            'confirmed'
        );

        const shipData = ship.data;
        const shipName = byteArrayToString(shipData.name);

        console.log(`Ship: ${shipName} (${entry.amount}) Mint: ${shipData.mint.toBase58()}`); 5
    }
}

// cd examples
// bun run 05-sage-list-compose-fleet/index.ts 40 30
const wallet = process.env.WALLET_PATH || "/home/user/.config/solana/id.json"
const rpcEndpoint = process.env.RPC_ENDPOINT || "https://mainnet.helius-rpc.com/?api-key=";
const rpcWebsocket = process.env.RPC_WEBSOCKET || "wss://rpc.helius.xyz/?api-key=";

const myWallet = loadKeypair(wallet);
const connection = newConnection(rpcEndpoint, rpcWebsocket);
main(connection, myWallet);