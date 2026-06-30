async function drawScaled(file: Blob, maxDim: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', quality),
  )
}

export function compressImage(file: Blob, maxDim = 1600, quality = 0.7): Promise<Blob> {
  return drawScaled(file, maxDim, quality)
}

export function makeThumb(file: Blob, size = 200): Promise<Blob> {
  return drawScaled(file, size, 0.6)
}
