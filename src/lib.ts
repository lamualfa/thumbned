import ffmpegBin from '@ffmpeg-installer/ffmpeg'
import ffprobeBin from '@ffprobe-installer/ffprobe'
import { randomInt } from 'node:crypto'
import secondsToTimestamp from 'seconds-to-timestamp'
import { getVideoDurationInSeconds } from 'get-video-duration'
import { execa } from 'execa'
import path from 'path'
import prompts from 'prompts'
import fs from 'fs-extra'
import kleur from 'kleur'
import { temporaryFile } from 'tempy'
import unquote from 'unquote'
import {
  AskInputPathOptions,
  AskOutputPathOptions,
  AskThumbnailPathOptions,
  DeleteThumbnailPathOptions,
  GetVideoDurationOptions,
  SaveRandomVideoScreenshotOptions,
  SaveVideoScreenshotOptions,
  SetThumbnailOptions,
  ThumbnailSourceType,
} from './type.js'

const DEFAULT_THUMBNAIL_EXTENSION = 'png'

export async function clearThumbnailPath(options: DeleteThumbnailPathOptions) {
  if (options.thumbnailSourceType === ThumbnailSourceType.Manual) {
    return
  }

  await fs.remove(options.thumbnailPath)
}

function formatPathAnswer(answer: any) {
  return answer ? path.resolve(unquote(answer)) : answer
}

export async function askOutputPath(options: AskOutputPathOptions) {
  const parsedInputPath = path.parse(options.inputPath)
  let defaultOutputPath: string
  let isExists: boolean
  let attempt = 0
  do {
    attempt++

    const outputName = `[THUMBNED${attempt > 1 ? ` ${attempt}` : ''}] ${
      parsedInputPath.name
    }${parsedInputPath.ext}`
    defaultOutputPath = path.join(parsedInputPath.dir, outputName)
    isExists = await fs.exists(defaultOutputPath)
  } while (isExists)

  const { outputPath } = await prompts({
    type: 'text',
    name: 'outputPath',
    message: `Enter the output video name:`,
    initial: defaultOutputPath,
    validate(value) {
      if (!value || typeof value !== 'string') {
        return false
      }

      const parsedValue = path.parse(value)
      const isSameExtension = parsedValue.ext === parsedInputPath.ext
      if (!isSameExtension) {
        return 'The output name must have the same extension as the input name.'
      }

      return true
    },
    format: formatPathAnswer,
  })

  return outputPath
}

export async function askThumbnailSourceType(): Promise<ThumbnailSourceType> {
  const { sourceType } = await prompts({
    type: 'select',
    name: 'sourceType',
    message: 'Select the thumbnail source:',
    choices: [
      {
        title: 'Manual',
        description: 'Use your own image for the thumbnail.',
        value: ThumbnailSourceType.Manual,
      },
      {
        title: 'Timestamp',
        description: 'Use specific timestamp in the video for the thumbnail.',
        value: ThumbnailSourceType.Timestamp,
      },
      {
        title: 'Random',
        description: 'Randomly picking a frame in the video for the thumbnail.',
        value: ThumbnailSourceType.Random,
      },
    ],
  })

  return sourceType
}

export async function askThumbnailPath(options: AskThumbnailPathOptions) {
  if (options.thumbnailSourceType === ThumbnailSourceType.Manual) {
    return await askThumbnailPathManual()
  }

  if (options.thumbnailSourceType === ThumbnailSourceType.Timestamp) {
    return await askThumbnailPathTimestamp(options)
  }

  return await askThumbnailPathRandom(options)
}

async function askThumbnailPathManual() {
  const { thumbnailPath } = await prompts({
    type: 'text',
    name: 'thumbnailPath',
    message: 'Enter the thumbnail image path:',
    async validate(value) {
      if (isNonStringAnswer(value)) {
        return false
      }

      const sanitizedValue = unquote(value)
      const isImage = checkIsImageFileName(unquote(sanitizedValue))
      if (!isImage) {
        return 'The entered path is not an image file.'
      }

      const thumbnailPath = path.resolve(sanitizedValue)
      const isExists = await fs.exists(thumbnailPath)
      if (!isExists) {
        return `Can't find an image in ${formatPathForLog(thumbnailPath)}.`
      }

      return true
    },
    format: formatPathAnswer,
  })

  return thumbnailPath
}

async function askThumbnailPathTimestamp(options: AskThumbnailPathOptions) {
  const { timestamp } = await prompts({
    type: 'text',
    name: 'timestamp',
    message:
      'Enter the timestamp on the video you want to make as a thumbnail: (format: hh:mm:ss)',
    validate(value) {
      if (isNonStringAnswer(value)) {
        return false
      }

      const isValid = /^\d{2}:\d{2}:\d{2}/.test(value)
      if (!isValid) {
        return 'Invalid timestamp format. Please use hh:mm:ss format.'
      }

      return true
    },
  })

  const thumbnailPath = temporaryFile({
    extension: DEFAULT_THUMBNAIL_EXTENSION,
  })
  await saveVideoScreenshot({
    inputPath: options.inputPath,
    timestamp,
    outputPath: thumbnailPath,
  })

  return thumbnailPath
}

async function askThumbnailPathRandom(options: AskThumbnailPathOptions) {
  let thumbnailPath: string
  let isThumbnailApproved = false
  let totalAttempt = 0
  do {
    thumbnailPath = temporaryFile({
      extension: DEFAULT_THUMBNAIL_EXTENSION,
    })

    await saveRandomVideoScreenshot({
      inputPath: options.inputPath,
      outputPath: thumbnailPath,
    })

    totalAttempt++

    const { isApproved } = await prompts({
      type: 'confirm',
      name: 'isApproved',
      message: `Do you want to use this ${formatPathForLog(
        thumbnailPath
      )} image as the thumbnail? (attempt: ${totalAttempt})`,
    })

    if (!isApproved) {
      await fs.remove(thumbnailPath)
    }

    isThumbnailApproved = isApproved
  } while (isThumbnailApproved === false)

  return thumbnailPath
}

function checkIsImageFileName(fileName: string) {
  return (
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.png')
  )
}

function checkIsVideoFileName(fileName: string) {
  return (
    fileName.endsWith('.mp4') ||
    fileName.endsWith('.mov') ||
    fileName.endsWith('.mkv')
  )
}

export async function askInputPath(options: AskInputPathOptions) {
  const fileNames = await fs.readdir(options.inputDir)
  const videoNames = fileNames.filter(checkIsVideoFileName)
  if (videoNames.length === 0) {
    throw `There's no videos on ${formatPathForLog(options.inputDir)} folder.`
  }

  const { inputPath } = await prompts({
    type: 'select',
    name: 'inputPath',
    message: 'Select a video you want to process:',
    choices: videoNames.map((videoName) => ({
      title: videoName,
      value: videoName,
    })),
    format: formatPathAnswer,
  })

  return inputPath
}

function isNonStringAnswer(answer: any) {
  return !answer || typeof answer !== 'string'
}

export async function askInputDir() {
  const { inputDir } = await prompts({
    type: 'text',
    name: 'inputDir',
    message: 'Enter the directory where the video is located:',
    initial: '.',
    async validate(value) {
      if (isNonStringAnswer(value)) {
        return false
      }

      const dir = path.resolve(value)
      const isExists = await fs.exists(dir)
      if (!isExists) {
        return `The directory doesn't exists.`
      }

      const dirStat = await fs.stat(dir)
      const isDir = dirStat.isDirectory()
      if (!isDir) {
        return `The entered path is not a directory.`
      }

      return true
    },
    format: formatPathAnswer,
  })

  return inputDir
}

export function formatPathForLog(path: string) {
  return `"${kleur.italic(path)}"`
}

async function getVideoDuration(options: GetVideoDurationOptions) {
  return Math.floor(
    await getVideoDurationInSeconds(options.inputPath, ffprobeBin.path)
  )
}

async function saveVideoScreenshot(options: SaveVideoScreenshotOptions) {
  await execa(ffmpegBin.path, [
    '-ss',
    options.timestamp,
    '-i',
    options.inputPath,
    '-frames:v',
    '1',
    options.outputPath,
  ])
}

async function saveRandomVideoScreenshot(
  options: SaveRandomVideoScreenshotOptions
) {
  const duration = await getVideoDuration(options)
  const timestamp = secondsToTimestamp(randomInt(duration))
  await saveVideoScreenshot({
    ...options,
    timestamp,
  })
}

export async function setThumbnail(options: SetThumbnailOptions) {
  await execa(ffmpegBin.path, [
    '-i',
    options.inputPath,
    '-i',
    options.thumbnailPath,
    '-map',
    '1',
    '-map',
    '0',
    '-c',
    'copy',
    '-disposition:0',
    'attached_pic',
    options.outputPath,
  ])
}

export class Abort extends Error {}

export function abortUndefined<V>(value: undefined | V): V {
  if (value === undefined) {
    throw new Abort('Aborted.')
  }

  return value
}
