rm -rf node_modules
rm -rf build
javascript-obfuscator ./ --output build --compact=false
cp package.json build
cp config/index.js build/config
cp ecosystem.config.js build/
cp -r templates build/
mkdir build/public

cd build
npm install
