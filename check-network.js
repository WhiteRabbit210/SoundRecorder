const os = require('os');
const { exec } = require('child_process');
const https = require('https');
const fs = require('fs');

console.log('=== ネットワーク診断ツール ===\n');

// 1. ネットワークインターフェースの確認
function getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const results = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                results.push({
                    name: name,
                    address: interface.address,
                    netmask: interface.netmask,
                    mac: interface.mac
                });
            }
        }
    }
    return results;
}

console.log('1. 利用可能なネットワークインターフェース:');
const interfaces = getNetworkInterfaces();
interfaces.forEach(iface => {
    console.log(`   ${iface.name}: ${iface.address} (${iface.netmask})`);
});

// 2. 現在のHTTPSサーバーの状態確認
console.log('\n2. HTTPSサーバーの状態確認:');
exec('ps aux | grep "https-server.js" | grep -v grep', (error, stdout, stderr) => {
    if (stdout) {
        console.log('   HTTPSサーバーは起動中です');
        const lines = stdout.trim().split('\n');
        lines.forEach(line => {
            if (line.includes('https-server.js')) {
                const parts = line.split(/\s+/);
                console.log(`   PID: ${parts[1]}`);
            }
        });
    } else {
        console.log('   HTTPSサーバーは起動していません');
    }
    
    // 3. ポートの使用状況確認
    console.log('\n3. ポート使用状況の確認:');
    const portsToCheck = [3443, 8443, 443];
    let checkedPorts = 0;
    
    portsToCheck.forEach(port => {
        const server = https.createServer();
        server.listen(port, '0.0.0.0', () => {
            console.log(`   ポート ${port}: 利用可能`);
            server.close();
            checkedPorts++;
            if (checkedPorts === portsToCheck.length) {
                checkFirewall();
            }
        });
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`   ポート ${port}: 使用中`);
            } else if (err.code === 'EACCES') {
                console.log(`   ポート ${port}: 権限が必要`);
            } else {
                console.log(`   ポート ${port}: エラー (${err.code})`);
            }
            checkedPorts++;
            if (checkedPorts === portsToCheck.length) {
                checkFirewall();
            }
        });
    });
});

// 4. ファイアウォールの確認
function checkFirewall() {
    console.log('\n4. macOSファイアウォールの状態:');
    exec('sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate', (error, stdout, stderr) => {
        if (error) {
            console.log('   ファイアウォールの状態を確認できません（sudo権限が必要です）');
        } else {
            console.log('   ' + stdout.trim());
        }
        
        // 5. 推奨事項
        console.log('\n=== 推奨事項 ===');
        console.log('\niPhoneから接続できない場合の対処法:');
        console.log('\n1. ネットワークの確認:');
        console.log('   - iPhoneとMacが同じWi-Fiに接続されていることを確認');
        console.log('   - ルーターのアイソレーション機能が無効になっていることを確認');
        
        console.log('\n2. サーバーの再起動:');
        console.log('   現在のサーバーを停止:');
        console.log('   $ pkill -f "https-server.js"');
        console.log('\n   新しいサーバーを起動（ポート8443）:');
        console.log('   $ node server/alternative-https-server.js');
        
        console.log('\n3. 証明書の再生成:');
        console.log('   $ node generate-cert.js');
        
        console.log('\n4. アクセス方法:');
        interfaces.forEach(iface => {
            console.log(`   https://${iface.address}:8443`);
        });
        
        console.log('\n5. Safariでの手順:');
        console.log('   a) 上記URLにアクセス');
        console.log('   b) 「詳細を表示」をタップ');
        console.log('   c) 「このWebサイトにアクセス」をタップ');
        console.log('   d) パスワードを入力して続行');
        
        console.log('\n6. それでも接続できない場合:');
        console.log('   - Macのシステム環境設定 > セキュリティとプライバシー > ファイアウォール を確認');
        console.log('   - ルーターの設定でポートフォワーディングやファイアウォール設定を確認');
        console.log('   - iPhoneの設定 > Wi-Fi > 使用中のネットワーク > プライベートアドレス をオフにしてみる');
        console.log('\n===================\n');
    });
}