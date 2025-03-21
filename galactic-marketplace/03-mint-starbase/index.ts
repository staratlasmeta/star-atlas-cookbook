import { BN } from '@project-serum/anchor';
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import { byteArrayToString, readAllFromRPC, readFromRPCOrError } from "@staratlas/data-source";
import { Order, GalacticMarketplaceProgram } from "@staratlas/galactic-marketplace";
import { findCertificateMintAddress, Game, Starbase, SageProgram } from "@staratlas/sage";

import { newConnection, newAnchorProvider } from "../../shared/anchor-setup";
import { loadKeypair } from "../../shared/wallet-setup";

const GALACTIC_MARKETPLACE_PROGRAM_ID = "traderDnaR5w6Tcoi3NFm53i48FTDNbGjBSZwWXDRrg"
const SAGE_PROGRAM_ID = 'SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE';

const main = async (connection: Connection, myWallet: Keypair) => {
    const args = process.argv.slice(1);

    // default to 'MRZ-22' if nothing is provided
    const x = args[1] || '35';
    const y = args[2] || '16';

    // default to 'Fuel' mint if nothing is provided
    const cargoMintAddress = args[3] || 'fueL3hBZjLLLJHiFH9cqZoozTG3XQZ53diwFPwbzNim';
    const cargoMint = new PublicKey(cargoMintAddress);

    const provider = newAnchorProvider(connection, myWallet);

    const marketplaceProgram = GalacticMarketplaceProgram.buildProgram(
        GALACTIC_MARKETPLACE_PROGRAM_ID as any,
        provider as any,
    );

    const sageProgram = SageProgram.buildProgram(
        SAGE_PROGRAM_ID as any,
        provider as any,
    );

    const [game] = await readAllFromRPC(
        connection,
        sageProgram as any,
        Game,
    );

    // find the starbase at the given coordinates
    const xBN = new BN(parseInt(x));
    const yBN = new BN(parseInt(y));

    const [starbasePubkey] = Starbase.findAddress(sageProgram, game.key, [xBN, yBN]);

    const starbase = await readFromRPCOrError(
        connection,
        sageProgram as any,
        starbasePubkey,
        Starbase,
    );

    const starbaseAccount = starbase.data;
    const starbaseName = byteArrayToString(starbaseAccount.name);

    // note each starbase will have it's own mint address for each cargo type
    const [mintAddress] = findCertificateMintAddress(sageProgram, starbasePubkey, cargoMint, starbaseAccount.seqId);
    console.log(`Search: '${starbaseName}' for mint address: ${mintAddress.toBase58()}`);

    // use the certificate mint address to find orders at the starbase (local marketplace)
    let orders = await readAllFromRPC(
        connection,
        marketplaceProgram as any,
        Order,
        'processed',
        [
            {
                memcmp: {
                    offset: 72, // discriminator (8) + orderInitializerPubkey (32) + currencyMint (32)
                    bytes: mintAddress.toBase58(),
                },
            },
        ],
    );

    console.log(`Orders: ${cargoMintAddress} (${mintAddress}) (total: ${orders.length})`);
}

// cd galactic-marketplace
// bun run 03-mint-starbase/index.ts 35 16 ammoK8AkX2wnebQb35cDAZtTkvsXQbi82cGeTnUvvfK
const wallet = process.env.WALLET_PATH || "/home/user/.config/solana/id.json"
const rpcEndpoint = process.env.RPC_ENDPOINT || "https://mainnet.helius-rpc.com/?api-key=";
const rpcWebsocket = process.env.RPC_WEBSOCKET || "wss://rpc.helius.xyz/?api-key=";

const myWallet = loadKeypair(wallet);
const connection = newConnection(rpcEndpoint, rpcWebsocket);
main(connection, myWallet);