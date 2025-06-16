const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const certDir = path.join(__dirname, 'certs');

if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir);
}

console.log('自己署名証明書を生成しています...');

try {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = 'localhost';
    
    Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(interface => {
            if (interface.family === 'IPv4' && !interface.internal) {
                ipAddress = interface.address;
            }
        });
    });
    
    execSync(`openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 \
        -keyout ${certDir}/key.pem \
        -out ${certDir}/cert.pem \
        -subj "/C=JP/ST=Tokyo/L=Tokyo/O=Test/CN=${ipAddress}" \
        -addext "subjectAltName=IP:${ipAddress},DNS:localhost"`, 
        { stdio: 'inherit' }
    );
    
    console.log('\n証明書が生成されました:');
    console.log(`  - ${certDir}/cert.pem`);
    console.log(`  - ${certDir}/key.pem`);
    console.log('\nHTTPSサーバーを起動できます。');
} catch (error) {
    console.error('証明書の生成に失敗しました:', error.message);
}