import { parseDiagnosisCommandArgs, runDiagnosisCommand } from '@/cli/diagnosisCommand'
import { romaniaGraph } from '@/data/graph'
import { searchVariantRegistry } from '@/search/registry'

try {
  const options = parseDiagnosisCommandArgs(process.argv.slice(2))
  const output = runDiagnosisCommand(options, searchVariantRegistry, romaniaGraph)
  process.stdout.write(`${output}\n`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`Diagnosis failed: ${message}\n`)
  process.exitCode = 1
}
