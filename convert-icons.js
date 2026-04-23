const sharp = require('sharp');
const path = require('path');

const icons = [
  { src: 'home.svg', dest: 'home.png' },
  { src: 'home-active.svg', dest: 'home-active.png' },
  { src: 'products.svg', dest: 'products.png' },
  { src: 'products-active.svg', dest: 'products-active.png' },
  { src: 'user.svg', dest: 'user.png' },
  { src: 'user-active.svg', dest: 'user-active.png' }
];

async function convertIcons() {
  for (const icon of icons) {
    const srcPath = path.join(__dirname, 'src/assets', icon.src);
    const destPath = path.join(__dirname, 'src/assets', icon.dest);
    await sharp(srcPath)
      .resize(81, 81, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(destPath);
    console.log(`✅ 转换完成: ${icon.dest}`);
  }
}

convertIcons().catch(console.error);