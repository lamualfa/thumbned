export enum ThumbnailSourceType {
  Manual = 'manual',
  Timestamp = 'timestamp',
  Random = 'random',
}

export type DeleteThumbnailPathOptions = {
  thumbnailSourceType: ThumbnailSourceType
  thumbnailPath: string
}

export type AskOutputPathOptions = {
  inputPath: string
}

export type AskThumbnailPathOptions = {
  inputPath: string
  thumbnailSourceType: ThumbnailSourceType
}

export type SaveVideoScreenshotOptions = {
  inputPath: string
  outputPath: string
  timestamp: string
}

export type SaveRandomVideoScreenshotOptions = Omit<
  SaveVideoScreenshotOptions,
  'timestamp'
>

export type SetThumbnailOptions = {
  inputPath: string
  thumbnailPath: string
  outputPath: string
}

export type AskInputPathOptions = {
  inputDir: string
}

export type GetVideoDurationOptions = {
  inputPath: string
}
