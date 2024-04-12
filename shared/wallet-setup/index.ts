import { Keypair } from "@solana/web3.js";
import fs from "fs";

/**
 * Generate a new Keypair (but cannot be used to sign transactions)
 * @returns a new Keypair
 */
export function generateKeypair(): Keypair {
    const newWallet = Keypair.generate();
    return newWallet;
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