import {
  Abort,
  abortUndefined,
  askInputDir,
  askInputPath,
  askOutputPath,
  askThumbnailPath,
  askThumbnailSourceType,
  clearThumbnailPath,
  formatPathForLog,
  setThumbnail,
} from './lib.js'
import ora from 'ora'

main().catch((error) => {
  if (error instanceof Abort) {
    console.log(error.message)
    return process.exit(0)
  }

  console.error(error)
})

async function main() {
  const inputDir = abortUndefined(await askInputDir())
  const inputPath = abortUndefined(
    await askInputPath({
      inputDir,
    })
  )
  const thumbnailSourceType = abortUndefined(await askThumbnailSourceType())
  const thumbnailPath = abortUndefined(
    await askThumbnailPath({
      inputPath,
      thumbnailSourceType,
    })
  )
  const outputPath = abortUndefined(
    await askOutputPath({
      inputPath,
    })
  )

  const spinner = ora()
  spinner.start('Adding the thumbnail to the video...')

  await setThumbnail({
    inputPath,
    outputPath,
    thumbnailPath,
  })

  spinner.text = 'Cleaning the post-process waste...'

  await clearThumbnailPath({
    thumbnailSourceType,
    thumbnailPath,
  })

  spinner.succeed(
    `The video has been thumbned (thumbnail added) into ${formatPathForLog(
      outputPath
    )}.`
  )
}
