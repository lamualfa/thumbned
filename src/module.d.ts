declare module '@ffmpeg-installer/ffmpeg' {
  export const path: string
  export const version: string
  export const url: string
}

declare module '@ffprobe-installer/ffprobe' {
  export const path: string
  export const version: string
  export const url: string
}

declare module 'seconds-to-timestamp' {
  export default (seconds: number) => string
}

declare module 'unquote' {
  export default (text: string) => string
}
