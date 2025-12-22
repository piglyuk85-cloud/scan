const QRCode = require('qrcode')
const fs = require('fs')
const path = require('path')
const exhibits = require('../data/exhibits.json')

// Создаем папку для QR-кодов, если её нет
const qrCodesDir = path.join(__dirname, '..', 'qr-codes')
if (!fs.existsSync(qrCodesDir)) {
  fs.mkdirSync(qrCodesDir, { recursive: true })
}

// URL для генерации (можно изменить на продакшн URL)
const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

async function generateQRCode(exhibit) {
  const url = `${baseUrl}/exhibit/${exhibit.id}`
  const filename = path.join(qrCodesDir, `qr-${exhibit.id}.png`)

  try {
    await QRCode.toFile(filename, url, {
      width: 1000,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
    console.log(`✓ Сгенерирован QR-код для: ${exhibit.title} (${filename})`)
    return filename
  } catch (error) {
    console.error(`✗ Ошибка при генерации QR-кода для ${exhibit.title}:`, error)
    return null
  }
}

async function generateAllQRCodes() {
  console.log(`Генерация QR-кодов для ${exhibits.length} экспонатов...`)
  console.log(`Базовый URL: ${baseUrl}\n`)

  const results = []
  for (const exhibit of exhibits) {
    const filename = await generateQRCode(exhibit)
    results.push({ exhibit: exhibit.title, filename })
  }

  console.log(`\n✓ Готово! Сгенерировано ${results.length} QR-кодов`)
  console.log(`QR-коды сохранены в папку: ${qrCodesDir}`)
}

// Запускаем генерацию
generateAllQRCodes().catch(console.error)


