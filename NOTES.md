# Notes

## Development Setup

### Install Solana

https://docs.solanalabs.com/cli/install

- `sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"`
- `solana --version`

### Install Bun (a TypeScript runtime)

https://bun.sh/

- `curl -fsSL https://bun.sh/install | bash`
- `bun --version`

### Get a free RPC account with Helius

https://www.helius.dev/

### Edit index.ts, update your wallet id.json file and install your RPC key

- `cd path/to/example`
- `nano index.ts`
- update `'const wallet = "/home/user/.config/solana/id.json"`
- update `const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key="`
- update `const RPC_WEBSOCKET = "wss://rpc.helius.xyz/?api-key="`

Alternatively, set environment variables in `.env` file:

```
cp .env.sample examples/.env
# update .env file with your configuration
```

### Run the example

- `cd examples`
- `bun install`
- `bun run path/to/example/index.ts`
