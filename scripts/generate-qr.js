const { PrismaClient } = require('@prisma/client')
const QRCode = require('qrcode')
const fs = require('fs').promises
const path = require('path')

const prisma = new PrismaClient()

async function generateQRCodes() {
  try {
    const exhibits = await prisma.exhibit.findMany()

    console.log(`Найдено экспонатов: ${exhibits.length}`)

    const qrCodesDir = path.join(process.cwd(), 'qr-codes')
    await fs.mkdir(qrCodesDir, { recursive: true })

    for (const exhibit of exhibits) {
      const url = `https://your-domain.com/exhibit/${exhibit.id}`
      const qrCodePath = path.join(qrCodesDir, `qr-${exhibit.id}.png`)

      try {
        await QRCode.toFile(qrCodePath, url, {
          width: 300,
          margin: 2,
        })
        console.log(`✓ QR-код создан для: ${exhibit.title} (${exhibit.id})`)
      } catch (error) {
        console.error(`✗ Ошибка при создании QR-кода для ${exhibit.id}:`, error)
      }
    }

    console.log('\n✅ Генерация QR-кодов завершена!')
  } catch (error) {
    console.error('Ошибка при генерации QR-кодов:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

generateQRCodes()
