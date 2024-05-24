import { Program, BN } from '@project-serum/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

import { CargoType, CARGO_IDL } from '@staratlas/cargo';
import { buildAndSignTransaction, createAssociatedTokenAccountIdempotent, keypairToAsyncSigner, readFromRPCOrError, sendTransaction } from '@staratlas/data-source';
import { UserPoints, POINTS_IDL } from '@staratlas/points';
import { ProfileFactionAccount, PROFILE_FACTION_IDL } from '@staratlas/profile-faction';
import { Fleet, Game, MineItem, Planet, Resource, SagePlayerProfile, Starbase, StarbasePlayer, SAGE_IDL } from '@staratlas/sage';

import { newConnection, newAnchorProvider } from '../../shared/anchor-setup';
import { loadKeypair } from '../../shared/wallet-setup';

const CARGO_PROGRAM_ID = 'Cargo2VNTPPTi9c1vq1Jw5d3BWUNr18MjRtSupAghKEk';
const POINTS_PROGRAM_ID = 'Point2iBvz7j5TMVef8nEgpmz4pDr7tU7v3RjAfkQbM';
const PROFILE_FACTION_PROGRAM_ID = 'pFACSRuobDmvfMKq1bAzwj27t6d2GJhSCHb1VcfnRmq';
const SAGE_PROGRAM_ID = 'SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE';

const GAME_ID = 'GAMEzqJehF8yAnKiTARUuhZMvLvkZVAsCVri5vSfemLr';

const main = async (connection: Connection, myWallet: Keypair) => {
    const args = process.argv.slice(1);
    const fleetId = args[1] || '11111111111111111111111111111111111111111111';
    const planetId = args[2] || '11111111111111111111111111111111111111111111';
    const mineItemId = args[3] || '11111111111111111111111111111111111111111111';

    const fleetPubkey = new PublicKey(fleetId);
    const planetPubkey = new PublicKey(planetId);
    const mineItemPubkey = new PublicKey(mineItemId);

    console.log(`Example 05: Fleet Mine`);
    console.log(`Fleet: ${fleetPubkey}`);
    console.log(`Planet: ${planetPubkey}`)
    console.log(`Mine Item: ${mineItemPubkey}`);

    const provider = newAnchorProvider(connection, myWallet);
    const cargoProgram = new Program(
        CARGO_IDL,
        CARGO_PROGRAM_ID,
        provider,
    );
    const pointsProgram = new Program(
        POINTS_IDL,
        POINTS_PROGRAM_ID,
        provider,
    );
    const profileFactionProgram = new Program(
        PROFILE_FACTION_IDL,
        PROFILE_FACTION_PROGRAM_ID,
        provider,
    );
    const sageProgram = new Program(
        SAGE_IDL,
        SAGE_PROGRAM_ID,
        provider,
    );

    const sagePlayerProfileId = process.env.SAGE_PLAYER_PROFILE_ID || '11111111111111111111111111111111111111111111'
    const playerPofilePubkey = new PublicKey(sagePlayerProfileId);
    const [profileFactionPubkey] = ProfileFactionAccount.findAddress(profileFactionProgram as any, playerPofilePubkey);

    const gamePubkey = new PublicKey(GAME_ID);
    const game = await readFromRPCOrError(
        connection,
        sageProgram as any,
        gamePubkey,
        Game,
    );
    const gameStatePubkey = game.data.gameState;
    const cargoStatsDefinitionPubkey = game.data.cargo.statsDefinition;
    const fuelMintPubkey = game.data.mints.fuel;
    const ammoMintPubkey = game.data.mints.ammo;
    const foodMintPubkey = game.data.mints.food;

    const fleet = await readFromRPCOrError(
        connection,
        sageProgram as any,
        fleetPubkey,
        Fleet,
    );
    const fuelTankPubkey = fleet.data.fuelTank;
    const ammoBankPubkey = fleet.data.ammoBank;
    const cargoHoldPubkey = fleet.data.cargoHold;

    const mineItem = await readFromRPCOrError(
        connection,
        sageProgram as any,
        mineItemPubkey,
        MineItem,
    );
    const mintPubkey = mineItem.data.mint;

    const planet = await readFromRPCOrError(
        connection,
        sageProgram as any,
        planetPubkey,
        Planet,
    );
    const [starbasePubkey] = Starbase.findAddress(sageProgram as any, gamePubkey, planet.data.sector as any);

    // const state = JSON.stringify(fleet.state, null, 2);
    // console.log(`Fleet State: ${state}`);

    if (fleet.state.Idle) {
        // ---------------------
        // Start Mining Asteroid
        // ---------------------
        const [sagePlayerProfilePubkey] = SagePlayerProfile.findAddress(sageProgram as any, playerPofilePubkey, gamePubkey);
        const [starbasePlayerPubkey] = StarbasePlayer.findAddress(sageProgram as any, starbasePubkey, sagePlayerProfilePubkey, 0);
        const [resourcePubkey] = Resource.findAddress(sageProgram as any, mineItemPubkey, planetPubkey);

        const foodTokenFrom = await createAssociatedTokenAccountIdempotent(fuelMintPubkey, fuelTankPubkey);
        const fuelTokenFromPubkey = foodTokenFrom.address;

        let ix = Fleet.startMiningAsteroid(
            sageProgram as any,
            keypairToAsyncSigner(myWallet),
            playerPofilePubkey,
            profileFactionPubkey,
            fleetPubkey,
            starbasePubkey,
            starbasePlayerPubkey,
            mineItemPubkey,
            resourcePubkey,
            planetPubkey,
            gameStatePubkey,
            gamePubkey,
            fuelTokenFromPubkey,
            { keyIndex: 0 }
        );

        let tx = await buildAndSignTransaction(ix, keypairToAsyncSigner(myWallet), { connection: connection });
        let resp = await sendTransaction(tx, connection);
        console.log(resp);
    } else if (fleet.state.MineAsteroid) {
        // ---------------------
        // Asteroid Mining Handler
        // ---------------------
        const planetId = fleet.state.MineAsteroid.asteroid;
        const resourceId = fleet.state.MineAsteroid.resource;

        const planetPubkey = new PublicKey(planetId);
        const resourcePubkey = new PublicKey(resourceId);

        const [ammoCargoTypePubkey] = CargoType.findAddress(cargoProgram as any, cargoStatsDefinitionPubkey, ammoMintPubkey, 0);
        const ammoTokenFrom = await createAssociatedTokenAccountIdempotent(ammoMintPubkey, ammoBankPubkey);
        const ammoTokenFromPubkey = ammoTokenFrom.address;

        const [foodCargoTypePubkey] = CargoType.findAddress(cargoProgram as any, cargoStatsDefinitionPubkey, foodMintPubkey, 0);
        const foodTokenFrom = await createAssociatedTokenAccountIdempotent(foodMintPubkey, cargoHoldPubkey);
        const foodTokenFromPubkey = foodTokenFrom.address;

        const [resourceCargoType] = CargoType.findAddress(cargoProgram as any, cargoStatsDefinitionPubkey, mintPubkey, 0);
        const resourceTokenFrom = await createAssociatedTokenAccountIdempotent(mintPubkey, mineItemPubkey);
        const resourceTokenFromPubkey = resourceTokenFrom.address;
        const resourceTokenTo = await createAssociatedTokenAccountIdempotent(mintPubkey, cargoHoldPubkey);
        const resourceTokenToPubkey = resourceTokenTo.address;

        const [starbasePubkey] = Starbase.findAddress(sageProgram as any, gamePubkey, planet.data.sector as any);

        let ix = Fleet.asteroidMiningHandler(
            sageProgram as any,
            cargoProgram as any,
            fleetPubkey,
            starbasePubkey,
            mineItemPubkey,
            resourcePubkey,
            planetPubkey,
            cargoHoldPubkey,
            ammoBankPubkey,
            foodCargoTypePubkey,
            ammoCargoTypePubkey,
            resourceCargoType,
            cargoStatsDefinitionPubkey,
            gameStatePubkey,
            gamePubkey,
            foodTokenFromPubkey,
            ammoTokenFromPubkey,
            resourceTokenFromPubkey,
            resourceTokenToPubkey,
            foodMintPubkey,
            ammoMintPubkey,
        );

        let tx = await buildAndSignTransaction(ix, keypairToAsyncSigner(myWallet), { connection: connection });
        let resp = await sendTransaction(tx, connection);
        console.log(resp);

        // ---------------------
        // Stop Mining Asteroid
        // ---------------------
        const [fuelCargoTypePubkey] = CargoType.findAddress(cargoProgram as any, cargoStatsDefinitionPubkey, mintPubkey, 0);
        const fuelTokenFrom = await createAssociatedTokenAccountIdempotent(fuelMintPubkey, fuelTankPubkey);
        const fuelTokenFromPubkey = fuelTokenFrom.address;

        const pointsCouncilRankXp = game.data.points.councilRankXpCategory as any;
        const councilRankXpCategoryPubkey = pointsCouncilRankXp.category as PublicKey;
        const councilRankXpModifierPubkey = pointsCouncilRankXp.modifier as PublicKey;
        const [councilRankXpUserAccountPubkey] = UserPoints.findAddress(pointsProgram as any, councilRankXpCategoryPubkey, playerPofilePubkey);

        const pointsMiningXp = game.data.points.miningXpCategory as any;
        const miningXpCategoryPubkey = pointsMiningXp.category as PublicKey;
        const miningXpModifierPubkey = pointsMiningXp.modifier as PublicKey;
        const [miningXpUserAccountPubkey] = UserPoints.findAddress(pointsProgram as any, miningXpCategoryPubkey, playerPofilePubkey);

        const pointsPilotXp = game.data.points.pilotXpCategory as any;
        const pilotXpCategoryPubkey = pointsPilotXp.category as PublicKey;
        const pilotXpModifierPubkey = pointsPilotXp.modifier as PublicKey;
        const [pilotXpUserAccountPubkey] = UserPoints.findAddress(pointsProgram as any, pilotXpCategoryPubkey, playerPofilePubkey);

        // https://solscan.io/tx/xMWgBMpiFHeUPw6hkw2k5be3LUuNWcH6UNBkyRbqpGUAe156NpNnScXw1oMmX9n191AzhP8AQsmyGdLuGHgCPJu
        ix = Fleet.stopMiningAsteroid(
            sageProgram as any,
            cargoProgram as any,
            pointsProgram as any,
            keypairToAsyncSigner(myWallet),
            playerPofilePubkey,
            profileFactionPubkey,
            fleetPubkey,
            mineItemPubkey,
            resourcePubkey,
            planetPubkey,
            fuelTankPubkey,
            fuelCargoTypePubkey,
            cargoStatsDefinitionPubkey,
            miningXpUserAccountPubkey,
            miningXpCategoryPubkey,
            miningXpModifierPubkey,
            pilotXpUserAccountPubkey,
            pilotXpCategoryPubkey,
            pilotXpModifierPubkey,
            councilRankXpUserAccountPubkey,
            councilRankXpCategoryPubkey,
            councilRankXpModifierPubkey,
            gameStatePubkey,
            gamePubkey,
            fuelTokenFromPubkey,
            fuelMintPubkey,
            { keyIndex: 0 }
        );

        tx = await buildAndSignTransaction(ix, keypairToAsyncSigner(myWallet), { connection: connection });
        // console.log(tx.transaction.message.staticAccountKeys.flatMap(k => k.toBase58()));
        resp = await sendTransaction(tx, connection);
        console.log(resp);
    } else {
        throw Error('Fleet is not in valid state to start or stop mining.');
    };
}

// cd examples
// bun run 05-fleet-mine/index.ts 8KKzTJC2HZQ665AEXahqfSSMRUxXASuy4qBQCMGgU5J 7jWrQYjfuHyQXVWfMyLireeukSpva99FvCLLxERCvT4U FpTUZKuviuGaww6ijjXdoeuJtFeEjabEXnzxRYHukhMx
// <fleetId> <LocationId> <mineItemId> <mintId>

const wallet = process.env.WALLET_PATH || '/home/user/.config/solana/id.json'
const rpcEndpoint = process.env.RPC_ENDPOINT || 'https://mainnet.helius-rpc.com/?api-key=';
const rpcWebsocket = process.env.RPC_WEBSOCKET || 'wss://rpc.helius.xyz/?api-key=';

const myWallet = loadKeypair(wallet);
const connection = newConnection(rpcEndpoint, rpcWebsocket);
main(connection, myWallet);