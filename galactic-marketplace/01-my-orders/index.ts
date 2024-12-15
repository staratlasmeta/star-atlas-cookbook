import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import { readAllFromRPC } from "@staratlas/data-source";
import { Order, GalacticMarketplaceProgram } from "@staratlas/galactic-marketplace";

import { Table } from 'console-table-printer';

import { newConnection, newAnchorProvider } from "../../shared/anchor-setup";
import { loadKeypair } from "../../shared/wallet-setup";

import { getOrderSide } from "../utils";

const GALACTIC_MARKETPLACE_PROGRAM_ID = "traderDnaR5w6Tcoi3NFm53i48FTDNbGjBSZwWXDRrg"

const main = async (connection: Connection, myWallet: Keypair) => {
    const args = process.argv.slice(1);
    const orderInitializerAddress = args[1] || myWallet.publicKey.toBase58();
    const orderInitializerPubkey = new PublicKey(orderInitializerAddress);

    const provider = newAnchorProvider(connection, myWallet);
    const marketplaceProgram = GalacticMarketplaceProgram.buildProgram(
        GALACTIC_MARKETPLACE_PROGRAM_ID as any,
        provider as any,
    );

    let orders = await readAllFromRPC(
        connection,
        marketplaceProgram as any,
        Order,
        'processed',
        [
            {
                memcmp: {
                    offset: 8, // discriminator (8)
                    bytes: orderInitializerPubkey.toBase58(),
                },
            },
        ],
    );

    console.log(`Orders Found: ${orders.length}`);

    const ordersTable = new Table({
        columns: [
            { name: 'col1', title: 'Account', alignment: 'left' },
            { name: 'col2', title: 'Side', alignment: 'left' },
            { name: 'col3', title: 'Asset Mint', alignment: 'left' },
            { name: 'col4', title: 'Origination Qty', alignment: 'right' },
            { name: 'col5', title: 'Remaining Qty', alignment: 'right' },
            { name: 'col6', title: 'Price', alignment: 'right' },
            { name: 'col7', title: 'Currency Mint', alignment: 'center' },
            { name: 'col8', title: 'Created At', alignment: 'left' },
        ]
    });

    orders.forEach((order, _) => {
        if (order.type === 'ok') {
            const account = order.key.toBase58();
            const orderAccount = order.data;
            const accountData = orderAccount.data;
            
            const orderSide = getOrderSide(orderAccount);
            const price = (parseInt(accountData.price.toString()) / 1e8).toFixed(8);
            const curreny = accountData.currencyMint.toBase58().substring(0, 5);
            const createdAt = new Date(parseInt(accountData.createdAtTimestamp.toString()) * 1000).toISOString();

            ordersTable.addRow({
                col1: account,
                col2: orderSide,
                col3: accountData.assetMint.toBase58(),
                col4: accountData.orderOriginationQty.toString(),
                col5: accountData.orderRemainingQty.toString(),
                col6: price,
                col7: curreny,
                col8: createdAt,
            });
        };
    });

    ordersTable.printTable();
}

// cd galactic-marketplace
// bun run 01-my-orders/index.ts <sellersWalletAddress>
const wallet = process.env.WALLET_PATH || "/home/user/.config/solana/id.json"
const rpcEndpoint = process.env.RPC_ENDPOINT || "https://mainnet.helius-rpc.com/?api-key=";
const rpcWebsocket = process.env.RPC_WEBSOCKET || "wss://rpc.helius.xyz/?api-key=";

const myWallet = loadKeypair(wallet);
const connection = newConnection(rpcEndpoint, rpcWebsocket);
main(connection, myWallet);