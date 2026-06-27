/**
 * Cloudinary image upload service.
 * Reads VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET from env.
 * Falls back to a stub response when env vars are not set (dev mode).
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined

export interface CloudinaryUploadResult {
  url: string
  publicId: string
  format: string
  width: number
  height: number
  bytes: number
}

export const cloudinaryService = {
  isConfigured(): boolean {
    return !!(CLOUD_NAME && UPLOAD_PRESET)
  },

  async upload(file: File, folder = 'control-tower'): Promise<CloudinaryUploadResult> {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      // Stub for development — returns the file as a local object URL
      return {
        url: URL.createObjectURL(file),
        publicId: `stub/${file.name}`,
        format: file.type.split('/')[1] ?? 'jpg',
        width: 0,
        height: 0,
        bytes: file.size,
      }
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', folder)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      throw new Error(`Cloudinary upload failed: ${res.statusText}`)
    }

    const data = await res.json()
    return {
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format,
      width: data.width,
      height: data.height,
      bytes: data.bytes,
    }
  },
}
