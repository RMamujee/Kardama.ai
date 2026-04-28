// Turbopack doesn't generate middleware.js.nft.json but Vercel's builder
// requires it. Since Turbopack bundles all deps into middleware.js inline,
// an empty file list is correct.
const fs = require('fs')
const path = require('path')

const nftPath = path.join(process.cwd(), '.next/server/middleware.js.nft.json')
if (!fs.existsSync(nftPath)) {
  fs.writeFileSync(nftPath, JSON.stringify({ version: 2, files: [] }))
  console.log('  Created missing middleware.js.nft.json (Turbopack workaround)')
}
