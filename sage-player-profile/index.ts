import { AnchorProvider, Program, Wallet } from "@project-serum/anchor";
import { Commitment, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { byteArrayToString, readAllFromRPC } from "@staratlas/data-source";
import { PLAYER_PROFILE_IDL, PlayerProfile } from "@staratlas/player-profile";
import { Fleet, SAGE_IDL } from "@staratlas/sage";
import fs from "fs";

// Configure wallet and RPC's before starting. Can be either a JSON file or a public key string.
const wallet = "/home/user/.config/solana/id.json"
const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key="
const RPC_WEBSOCKET = "wss://rpc.helius.xyz/?api-key="
const confirmTransactionInitialTimeout = 60000
const PLAYER_PROFILE_PROGRAM_ID = "pprofELXjL5Kck7Jn5hCpwAL82DpTkSYBENzahVtbc9"
const SAGE_PROGRAM_ID = "SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE"

/**
 * Get a public key from either a JSON file or a string
 * @param input - Either a path to a JSON keypair file or a public key string
 * @returns The public key as a string
 */
function getPublicKey(input: string): string {
    try {
        // First try to load as a JSON file
        const keypair = loadKeypair(input);
        return keypair.publicKey.toBase58();
    } catch (error) {
        // If that fails, try to use the input as a public key string
        try {
            // Validate that it's a valid Solana public key
            new PublicKey(input);
            return input;
        } catch (e) {
            throw new Error('Input must be either a valid JSON keypair file path or a valid Solana public key');
        }
    }
}

/**
 * Load a Keypair from a file path
 * @param keypairPath - the path to the Keypair
 * @returns the loaded Keypair
 */
export function loadKeypair(keypairPath: string): Keypair {
    const loaded = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, 'utf8'))),
    );
  
    return loaded;
}

// Get the target profile key from either the wallet file or a direct public key
const targetProfileKey = getPublicKey(wallet);
console.log("Using target profile key:", targetProfileKey);

const providerOptions = {
    preflightCommitment: 'confirmed' as Commitment,
    commitment: 'confirmed' as Commitment,
};

const connection = new Connection(RPC_ENDPOINT, {
    commitment: providerOptions.commitment,
    confirmTransactionInitialTimeout,
    wsEndpoint: RPC_WEBSOCKET,
});

// Create a dummy wallet for the provider (since we're only reading data)
const dummyWallet = Keypair.generate();
const provider = new AnchorProvider(
    connection,
    new Wallet(dummyWallet),
    AnchorProvider.defaultOptions(),
);

const playerProfileProgram = new Program(
    PLAYER_PROFILE_IDL,
    PLAYER_PROFILE_PROGRAM_ID,
    provider,
);

const sageProgram = new Program(
    SAGE_IDL,
    SAGE_PROGRAM_ID,
    provider,
);

const mainFunction = async() => {
    // Look up all profiles
    const myProfiles = await readAllFromRPC(
        connection,
        playerProfileProgram as any,
        PlayerProfile,
        'processed',
        []  // Get all profiles and filter in code
    );
    console.log("Query completed. Found profiles:", myProfiles.length);
    
    // Filter profiles that have our key in their profileKeys
    const myFilteredProfiles = myProfiles.filter(profile => {
        if (profile.type === 'error') return false;
        return profile.data.profileKeys.some(pk => pk.key.toBase58() === targetProfileKey);
    });
    
    console.log("Found matching profiles:", myFilteredProfiles.length);
    if (myFilteredProfiles.length === 0) {
        throw 'no player profile found';
    }
    
    // Use the first matching profile's key for fleet queries
    const targetProfile = myFilteredProfiles[0].key;
    console.log("Using profile:", targetProfile.toBase58());
    
    const fleets = await readAllFromRPC(
        connection,
        sageProgram as any,
        Fleet as any,
        'processed',
        [
            {
            memcmp: {
                offset: 8 + 1 + 32,
                bytes: targetProfile.toBase58(),
            },
            },
        ],
    );
    
    console.log(`Found ${fleets.length} fleets for profile ${targetProfile.toBase58()}`);
    for (let index2 = 0; index2 < fleets.length; index2++) {
        const thisFleet = fleets[index2];
        if (thisFleet.type === 'error') throw new Error('Error reading fleets');
        
        // Access the fleet data correctly
        const fleetData = thisFleet.data.data;
        console.log('\nFleet:', fleetData.fleetLabel ? byteArrayToString(fleetData.fleetLabel) : 'Unnamed Fleet');
        console.log('Fleet key:', thisFleet.key.toBase58());
        console.log('Ship counts:', JSON.stringify(fleetData.shipCounts, null, 2));
        
        // Check fleet state based on cooldowns
        const now = Math.floor(Date.now() / 1000);
        const warpCooldown = fleetData.warpCooldownExpiresAt === '00' ? 0 : parseInt(fleetData.warpCooldownExpiresAt, 16);
        const scanCooldown = fleetData.scanCooldownExpiresAt === '00' ? 0 : parseInt(fleetData.scanCooldownExpiresAt, 16);
        
        const isWarping = warpCooldown > 0 && warpCooldown > now;
        const isScanning = scanCooldown > 0 && scanCooldown > now;
        
        let state = 'IDLE';
        if (isWarping) state = 'WARPING';
        if (isScanning) state = 'SCANNING';
        
        console.log('State:', state);
        
        // Display cooldown information
        if (isWarping && warpCooldown > now) {
            const remainingTime = Math.max(0, warpCooldown - now);
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            if (minutes > 0) {
                console.log('Warp cooldown remaining:', minutes, 'minutes,', seconds, 'seconds');
            } else {
                console.log('Warp cooldown remaining:', seconds, 'seconds');
            }
        }
        if (isScanning && scanCooldown > now) {
            const remainingTime = Math.max(0, scanCooldown - now);
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            if (minutes > 0) {
                console.log('Scan cooldown remaining:', minutes, 'minutes,', seconds, 'seconds');
            } else {
                console.log('Scan cooldown remaining:', seconds, 'seconds');
            }
        }

        // Display fleet movement and mining information
        if (fleetData.state && fleetData.state.name === 'MoveOrder') {
            console.log('Moving to:', fleetData.state.moveOrder.destination.toBase58());
            console.log('Movement speed:', fleetData.state.moveOrder.speed);
            console.log('Distance remaining:', fleetData.state.moveOrder.distanceRemaining);
        }
        if (fleetData.state && fleetData.state.name === 'MiningOrder') {
            console.log('Mining at:', fleetData.state.miningOrder.resource.toBase58());
            console.log('Mining rate:', fleetData.state.miningOrder.miningRate);
            console.log('Resource type:', fleetData.state.miningOrder.resourceType);
        }

        // Display fleet resources and cargo
        if (fleetData.resources) {
            console.log('Resources:', JSON.stringify(fleetData.resources, null, 2));
        }
        if (fleetData.cargo) {
            console.log('Cargo:', JSON.stringify(fleetData.cargo, null, 2));
        }

        // Display fleet health and fuel
        if (fleetData.health) {
            console.log('Health:', fleetData.health);
        }
        if (fleetData.fuel) {
            console.log('Fuel:', fleetData.fuel);
        }

        // Display fleet sector information
        if (fleetData.sector) {
            console.log('Current sector:', fleetData.sector.toBase58());
        }
    }
}

mainFunction()
