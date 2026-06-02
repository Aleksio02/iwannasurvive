import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const size = 64
const radius = 14
const inputPath = path.join(__dirname, '../src/assets/icons/brand-mark.png')
const outputPath = path.join(__dirname, '../public/favicon.png')

const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`
)

await sharp(inputPath)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(outputPath)

console.log(`Rounded favicon saved to ${outputPath}`)
