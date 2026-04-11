import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesRoot = join(__dirname, '..', 'fixtures')

export async function readFixtureText(relativePath: string): Promise<string> {
  return readFile(join(fixturesRoot, relativePath), 'utf8')
}

export async function readJsonFixture<T>(relativePath: string): Promise<T> {
  const content = await readFixtureText(relativePath)
  return JSON.parse(content) as T
}
