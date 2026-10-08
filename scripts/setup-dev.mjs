// Crée .dev.vars (secret du serveur local) s'il n'existe pas, avec un code du garage de test.
import { webcrypto as crypto } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'

if (existsSync('.dev.vars')) {
  console.log('.dev.vars existe déjà, rien à faire.')
} else {
  const code = 'local-' + Buffer.from(crypto.getRandomValues(new Uint8Array(4))).toString('hex')
  writeFileSync('.dev.vars', `GARAGE_CODE=${code}\n`)
  console.log(`.dev.vars créé. Code du garage de test : ${code}`)
}
