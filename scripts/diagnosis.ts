import { romaniaGraph } from '@/data/graph'
import {
  parseDiagnosisCommandArgs,
  runDiagnosisCommand,
} from '@/search/evaluation/cli/diagnosisCommand'
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
