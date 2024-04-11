import { AnchorProvider, Program, Wallet } from "@project-serum/anchor";
import { Commitment, Connection, Keypair } from "@solana/web3.js";
import { byteArrayToString, readAllFromRPC } from "@staratlas/data-source";
import { PLAYER_PROFILE_IDL, PlayerProfile } from "@staratlas/player-profile";
import { Fleet, SAGE_IDL } from "@staratlas/sage";
import fs from "fs";

// Configure wallet and RPC's before starting
const wallet = "/home/user/.config/solana/id.json"
const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key="
const RPC_WEBSOCKET = "wss://rpc.helius.xyz/?api-key="
const confirmTransactionInitialTimeout = 60000
const PLAYER_PROFILE_PROGRAM_ID = "pprofELXjL5Kck7Jn5hCpwAL82DpTkSYBENzahVtbc9"
const SAGE_PROGRAM_ID = "SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE"


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

const myWallet = loadKeypair(wallet)
// Print the wallet public key
console.log("Wallet Public Key: " + myWallet.publicKey.toBase58())


const providerOptions = {
    preflightCommitment: 'confirmed' as Commitment,
    commitment: 'confirmed' as Commitment,
  };


const connection = new Connection(RPC_ENDPOINT, {
    commitment: providerOptions.commitment,
    confirmTransactionInitialTimeout,
    wsEndpoint: RPC_WEBSOCKET,
  });


const provider = new AnchorProvider(
    connection,
    new Wallet(myWallet),
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
        const fleets = await readAllFromRPC(
            connection,
            sageProgram as any,
            Fleet,
            'processed',
            [
                {
                memcmp: {
                    offset: 8 + 1 + 32,
                    bytes: thisProfile.key.toBase58(),
                },
                },
            ],
        );
        // console.log(fleets.map((it)=>it.key.toBase58()))
        // console.log(fleets[0])
        for (let index2 = 0; index2 < fleets.length; index2++) {
            const thisFleet = fleets[index2];
            if (thisFleet.type === 'error') throw new Error('Error reading fleets');
            console.log(thisFleet.data);
            console.log(byteArrayToString(thisFleet.data.data.fleetLabel));
        }
        
    }
    // Print Player Profile keys
    console.log("SAGE Player Profile: " + myProfiles.map((it)=>it.key.toBase58()))
}


mainFunction()
