# Token logos

Each token has `<name>-64` and `<name>-128` in PNG and WebP (square, fixed
sizes, shown at up to 64 CSS px). `originals/` keeps the file each was made
from. Logos are the projects' trademarks, used only to identify the token a
report covers.

| Token | Files | Source |
|---|---|---|
| Bitcoin (BTC) | `bitcoin-*` | added with the dashboards (item 395) |
| Ethereum (ETH) | `ethereum-*` | added with the dashboards (item 395) |
| Aave (AAVE) | `aave-*` | Trust Wallet assets, `blockchains/ethereum/assets/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9/logo.png` |
| Polkadot (DOT) | `polkadot-*` | Trust Wallet assets, `blockchains/polkadot/info/logo.png` |
| EigenLayer (EIGEN) | `eigenlayer-*` | Trust Wallet assets, `blockchains/ethereum/assets/0xec53bF9167f50cDEB3Ae105f56099aaaB9061F83/logo.png` |
| MegaETH (MEGA) | `megaeth-*` | Trust Wallet assets, `blockchains/megaeth/assets/0x28B7E77f82B25B95953825F1E3eA0E36c1c29861/logo.png` |
| LayerZero (ZRO) | `layerzero-*` | Trust Wallet assets, `blockchains/ethereum/assets/0x6985884C4392D348587B19cb9eAAf157F13271cd/logo.png` |
| Aztec (AZTEC) | `aztec-*` | supplied by Clinton, 2026-11-06 (`originals/aztec-logo.png`); the mark on white |
| Succinct (PROVE) | `succinct-*` | supplied by Clinton, 2026-11-06 (`originals/succinct-logo.png`, the full logo); the "S" mark only, on white |
| Ethereum STRATO (STRATO) | `strato-*` | supplied by Clinton, 2026-11-06 (`originals/strato-logo.png`, the full logo); the hexagon mark only, on white |

Trust Wallet assets: https://github.com/trustwallet/assets (MIT License;
logos are submitted by each project for its own token). Downloaded
2026-11-04, resized only (no other change).

Every report has a logo. Logos are shown in a circle, so a supplied logo
that includes a wordmark is cut down to its symbol, centred on white with
room to fit the circle. To add one, put the file in `originals/`, make the
four sizes the same way, and add it to `LOGOS` in `api/_lib/logos.js`; a
report with no entry shows a ticker monogram.
