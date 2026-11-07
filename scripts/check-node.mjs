#!/usr/bin/env node
// Refuses to start when the Node.js version is not supported by Nuxt
// (see `engines` in package.json). Run automatically before `npm run dev`.

const [major, minor] = process.versions.node.split('.').map(Number)

// Mirrors package.json engines: ^22.22.3 || ^24.15.0 || >=26.0.0 (minor-level check).
const supported =
  (major === 22 && minor >= 22) || (major === 24 && minor >= 15) || major >= 26

if (!supported) {
  console.error(
    `\nNode.js ${process.versions.node} is not supported by this project ` +
      `(Nuxt needs ^22.22.3, ^24.15.0 or >=26).\n` +
      `Run \`nvm use\` (reads .nvmrc: Node 24) and try again.\n`
  )
  process.exit(1)
}
