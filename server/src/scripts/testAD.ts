/**
 * Diagnóstico da integração com Active Directory
 * Uso: npm run ad:test -- utilizador@dominio.lan senha
 */
import dotenv from 'dotenv';
import { Socket } from 'net';
import { createADAuthService } from '../services/adAuthService.js';

dotenv.config();

const [username, password] = process.argv.slice(2);

function testTcp(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    socket.setTimeout(5000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(false));
    socket.connect(port, host);
  });
}

async function main() {
  const host = process.env.AD_SERVER || 'localhost';
  const port = parseInt(process.env.AD_PORT || '389');

  console.log('Configuração AD:');
  console.log(`  AD_URL     = ${process.env.AD_URL || '(derivado de AD_SERVER/AD_PORT)'}`);
  console.log(`  AD_SERVER  = ${host}:${port}`);
  console.log(`  AD_DOMAIN  = ${process.env.AD_DOMAIN}`);
  console.log(`  AD_BASE_DN = ${process.env.AD_BASE_DN}`);

  const tcp = await testTcp(host, port);
  console.log(`\n1) Ligação TCP ${host}:${port}: ${tcp ? 'OK' : 'FALHOU'}`);
  if (!tcp) process.exit(1);

  if (!username || !password) {
    console.log('\nPara testar bind e pesquisa: npm run ad:test -- utilizador@dominio senha');
    return;
  }

  const result = await createADAuthService().authenticateUser(username, password);
  console.log(`\n2) Bind + pesquisa: ${result.status}`);
  if (result.status === 'ok') {
    console.log(JSON.stringify(result.user, null, 2));
    if (!result.user.dn) {
      console.log('\n⚠️  Bind OK mas o utilizador não foi encontrado em AD_BASE_DN. Use a raiz do domínio (ex.: DC=sdbd,DC=lan).');
    }
  } else if (result.status === 'unavailable') {
    console.log(`   Erro: ${result.error}`);
    process.exit(1);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
