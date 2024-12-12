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
    const assetMintAddress = args[1] || 'fueL3hBZjLLLJHiFH9cqZoozTG3XQZ53diwFPwbzNim'; // default to 'Fuel' mint if nothing is provided
    const assetMint = new PublicKey(assetMintAddress);

    const provider = newAnchorProvider(connection, myWallet);
    const marketplaceProgram = GalacticMarketplaceProgram.buildProgram(
        GALACTIC_MARKETPLACE_PROGRAM_ID as any,
        provider as any,
    );

    // Note: these are orders that can be found on the Galactic Marketplace (faction's Central Space Station)
    let orders = await readAllFromRPC(
        connection,
        marketplaceProgram as any,
        Order,
        'processed',
        [
            {
                memcmp: {
                    offset: 72, // discriminator (8) + orderInitializerPubkey (32) + currencyMint (32)
                    bytes: assetMint.toBase58(),
                },
            },
        ],
    );

    console.log(`Orders: ${assetMintAddress} (total: ${orders.length})`);

    let buyerRows: any[] = [];
    let sellerRows: any[] = [];

    orders.forEach((order, _) => {
        if (order.type === 'ok') {
            const orderAccount = order.data;
            const accountData = orderAccount.data;

            const orderSide = getOrderSide(orderAccount);

            const row = {
                col2: accountData.orderInitializerPubkey.toBase58(),
                col3: accountData.orderRemainingQty.toString(),
                col4: (parseInt(accountData.price.toString()) / 1e8).toFixed(8),
                priceU64: accountData.price,
            }

            if (orderSide == 'BuySide') {
                buyerRows.push(row);
            } else {
                sellerRows.push(row);
            }
        };
    });

    // sort buyer's price (ascending)
    buyerRows.sort((a, b) => parseInt(b.priceU64) - parseInt(a.priceU64));
    const totalBuyers = buyerRows.length;
    buyerRows = buyerRows.slice(0, 5);

    // sort seller's price (descending)
    sellerRows.sort((a, b) => parseInt(a.priceU64) - parseInt(b.priceU64));
    const totalSellers = sellerRows.length;
    sellerRows = sellerRows.slice(0, 5);

    const buyerOrdersTable = new Table({
        columns: [
            { name: 'col2', title: 'Buyers', alignment: 'left' },
            { name: 'col3', title: 'Quantity', alignment: 'right' },
            { name: 'col4', title: 'Price', alignment: 'right' },
        ]
    });

    const sellerOrdersTable = new Table({
        columns: [
            { name: 'col2', title: 'Sellers', alignment: 'left' },
            { name: 'col3', title: 'Quantity', alignment: 'right' },
            { name: 'col4', title: 'Price', alignment: 'right' },
        ]
    });

    console.log(`Top 5 Buyers (total: ${totalBuyers})`);
    buyerOrdersTable.addRows(buyerRows);
    buyerOrdersTable.printTable();

    console.log(`Top 5 Sellers (total: ${totalSellers})`);
    sellerOrdersTable.addRows(sellerRows);
    sellerOrdersTable.printTable();
}

// cd galactic-marketplace
// bun run 02-mint-orderbook/index.ts foodQJAztMzX1DKpLaiounNe2BDMds5RNuPC6jsNrDG
const wallet = process.env.WALLET_PATH || "/home/user/.config/solana/id.json"
const rpcEndpoint = process.env.RPC_ENDPOINT || "https://mainnet.helius-rpc.com/?api-key=";
const rpcWebsocket = process.env.RPC_WEBSOCKET || "wss://rpc.helius.xyz/?api-key=";

const myWallet = loadKeypair(wallet);
const connection = newConnection(rpcEndpoint, rpcWebsocket);
main(connection, myWallet);