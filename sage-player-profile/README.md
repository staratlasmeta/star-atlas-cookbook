<a name="readme-top"></a>


<div align="center">
<h3 align="center">Sage Player Profile</h3>
  <p align="center">
    This example bootstraps your environment and prints your Solana Wallet address and Sage Player Profile address. 
  </p>
</div>

### Install Solana
https://docs.solanalabs.com/cli/install
- `sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"`
- `solana --version`

### Install Bun (a TypeScript runtime)
https://bun.sh/
- `curl -fsSL https://bun.sh/install | bash`
- `bun install`

### Get a free RPC account with Helius
https://www.helius.dev/

### Edit index.ts 
- `nano index.ts`
- update `'const wallet = "/home/user/.config/solana/id.json"`
- update `const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key="`
- update `const RPC_WEBSOCKET = "wss://rpc.helius.xyz/?api-key="`
### Run the app
`bun run index.ts`
