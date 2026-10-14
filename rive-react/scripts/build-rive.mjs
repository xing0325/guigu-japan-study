import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const project = fileURLToPath(new URL('../../rive-character', import.meta.url));
const installed = `${homedir()}/.rive/bin/rive`;
const cli = process.env.RIVE_BIN || (existsSync(installed) ? installed : 'rive');
for (const args of [[project, '--verify'], ['inspect', project, '--summary'], [project, '--once']]) {
  execFileSync(cli, args, { stdio: 'inherit' });
}
copyFileSync(`${project}/build/rive-character.riv`, new URL('../public/guigu.riv', import.meta.url));
console.log('Copied verified Rive asset to public/guigu.riv');
