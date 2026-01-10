const fs = require('fs');
const QRCode = require('qrcode'); // User needs to install: npm install qrcode
const path = require('path');
const { parse } = require('csv-parse/sync'); // npm install csv-parse

// CONFIG
const MOCK_DATA_DIR = path.join(__dirname, '../mock-data');
const OUTPUT_DIR = path.join(__dirname, 'output');
const ORGS = ['CAPEC', 'ITECPEC'];

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

async function generate() {
    let allBadges = [];

    for (const org of ORGS) {
        const file = path.join(MOCK_DATA_DIR, `volunteers-${org.toLowerCase()}.csv`);
        if (!fs.existsSync(file)) {
            console.warn(`File not found: ${file}`);
            continue;
        }

        const content = fs.readFileSync(file, 'utf8');
        const records = parse(content, { columns: true, skip_empty_lines: true });

        for (const vol of records) {
            // QR Format: "VOL|ORG|CODE"
            const qrData = `VOL|${org}|${vol.code}`;
            const fileName = `${vol.code}.png`;
            const filePath = path.join(OUTPUT_DIR, fileName);

            await QRCode.toFile(filePath, qrData, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            
            allBadges.push({ ...vol, org, qr_file: fileName });
            console.log(`Generated QR for ${vol.name} (${org})`);
        }
    }

    // Write manifest
    const header = Object.keys(allBadges[0]).join(',') + '\n';
    const rows = allBadges.map(b => Object.values(b).join(',')).join('\n');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'badges_manifest.csv'), header + rows);
    console.log("Done! Check qr-generator/output folder.");
}

generate().catch(console.error);
