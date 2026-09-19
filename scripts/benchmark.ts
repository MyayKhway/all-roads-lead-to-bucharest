import { writeFileSync } from 'node:fs'
import { romaniaGraph } from '@/data/graph'
import {
  parseBenchmarkCommandArgs,
  runBenchmarkCommand,
} from '@/search/evaluation/cli/benchmarkCommand'
import { searchVariantRegistry } from '@/search/registry'

try {
  const options = parseBenchmarkCommandArgs(process.argv.slice(2))
  const output = runBenchmarkCommand(options, searchVariantRegistry, romaniaGraph)

  if (options.outputFile === null) {
    process.stdout.write(`${output}\n`)
  } else {
    writeFileSync(options.outputFile, `${output}\n`, 'utf8')
    process.stdout.write(`Benchmark report written to ${options.outputFile}\n`)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`Benchmark failed: ${message}\n`)
  process.exitCode = 1
}
