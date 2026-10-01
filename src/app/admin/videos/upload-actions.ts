"use server"

import {
  randomUUID,
} from "node:crypto"

import {
  revalidatePath,
} from "next/cache"

import {
  requireAdmin,
} from "@/lib/auth/require-admin"
import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

const VIDEO_BUCKET =
  "vip-videos"

const THUMBNAIL_BUCKET =
  "vip-thumbnails"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const FALLBACK_MAXIMUM_VIDEO_SIZE =
  5 * 1024 * 1024 * 1024

const MAXIMUM_THUMBNAIL_SIZE =
  5 * 1024 * 1024

const MAXIMUM_DURATION_SECONDS =
  24 * 60 * 60

const VIDEO_EXTENSIONS = {
  "video/mp4": "mp4",
  "video/webm": "webm",
} as const

type SupportedVideoType =
  keyof typeof VIDEO_EXTENSIONS

type StorageObjectMetadata = {
  size?: unknown
  mimetype?: unknown
}

type StorageObjectListItem = {
  id?: string | null
  name: string
  metadata?:
    | StorageObjectMetadata
    | null
}

export type AdminVideoUploadSession = {
  videoId: string
  videoPath: string
  thumbnailPath: string
}

export type PrepareAdminVideoUploadInput = {
  fileName: string
  fileType: string
  fileSize: number
  session?:
    | AdminVideoUploadSession
    | null
}

export type PreparedAdminVideoUpload = {
  session:
    AdminVideoUploadSession

  storageEndpoint: string
  videoUploadToken: string
  thumbnailUploadToken: string
  maximumVideoSize: number
}

export type FinalizeAdminVideoUploadInput = {
  session:
    AdminVideoUploadSession

  durationSeconds: number
}

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null
  )
}

function isSupportedVideoType(
  value: string
): value is SupportedVideoType {
  return Object.prototype
    .hasOwnProperty
    .call(
      VIDEO_EXTENSIONS,
      value
    )
}

function getVideoRoot(
  userId: string,
  videoId: string
) {
  return (
    `admin/${userId}/` +
    videoId
  )
}

function readUploadSession(
  value:
    | AdminVideoUploadSession
    | null
    | undefined,
  userId: string,
  requiredExtension?:
    string
):
  | AdminVideoUploadSession
  | null {
  if (
    !value ||
    !UUID_PATTERN.test(
      value.videoId
    )
  ) {
    return null
  }

  const root =
    getVideoRoot(
      userId,
      value.videoId
    )

  const videoPrefix =
    `${root}/video.`

  const expectedThumbnailPath =
    `${root}/thumbnail.jpg`

  if (
    value.thumbnailPath !==
      expectedThumbnailPath ||
    !value.videoPath
      .startsWith(
        videoPrefix
      )
  ) {
    return null
  }

  const extension =
    value.videoPath.slice(
      videoPrefix.length
    )

  if (
    extension !== "mp4" &&
    extension !== "webm"
  ) {
    return null
  }

  if (
    requiredExtension &&
    extension !==
      requiredExtension
  ) {
    return null
  }

  return {
    videoId:
      value.videoId,

    videoPath:
      value.videoPath,

    thumbnailPath:
      value.thumbnailPath,
  }
}

/*
 * Los tokens creados mediante
 * createSignedUploadUrl deben utilizar
 * el endpoint TUS firmado terminado
 * en /resumable/sign.
 */
function getStorageEndpoint() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrl) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL."
    )
  }

  const url =
    new URL(supabaseUrl)

  /*
   * En proyectos alojados por Supabase
   * se utiliza el dominio directo de
   * Storage para cargas grandes.
   */
  if (
    url.hostname.endsWith(
      ".supabase.co"
    )
  ) {
    const projectRef =
      url.hostname.split(
        "."
      )[0]

    if (!projectRef) {
      throw new Error(
        "La URL de Supabase no es válida."
      )
    }

    return (
      `https://${projectRef}` +
      ".storage.supabase.co" +
      "/storage/v1/upload/resumable/sign"
    )
  }

  /*
   * Compatibilidad con Supabase local
   * o instalaciones personalizadas.
   */
  return (
    `${url.origin}` +
    "/storage/v1/upload/resumable/sign"
  )
}

function readBucketFileSizeLimit(
  value: unknown
) {
  if (!isRecord(value)) {
    return null
  }

  const rawLimit =
    value.file_size_limit

  const parsedLimit =
    typeof rawLimit ===
      "number"
      ? rawLimit
      : typeof rawLimit ===
          "string"
        ? Number(rawLimit)
        : Number.NaN

  if (
    !Number.isFinite(
      parsedLimit
    ) ||
    parsedLimit <= 0
  ) {
    return null
  }

  return Math.floor(
    parsedLimit
  )
}

async function getMaximumVideoSize() {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .storage
      .getBucket(
        VIDEO_BUCKET
      )

  if (error) {
    console.error(
      "No se pudo consultar el límite del bucket de videos:",
      error
    )

    return FALLBACK_MAXIMUM_VIDEO_SIZE
  }

  return (
    readBucketFileSizeLimit(
      data
    ) ??
    FALLBACK_MAXIMUM_VIDEO_SIZE
  )
}

async function findStorageObject(
  bucketName: string,
  objectPath: string
):
  Promise<
    | StorageObjectListItem
    | null
  > {
  const pathParts =
    objectPath.split("/")

  const fileName =
    pathParts.pop()

  if (!fileName) {
    return null
  }

  const folder =
    pathParts.join("/")

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .storage
      .from(bucketName)
      .list(
        folder,
        {
          limit: 20,
          search: fileName,
        }
      )

  if (error) {
    throw error
  }

  const items =
    (
      data ?? []
    ) as StorageObjectListItem[]

  return (
    items.find(
      (item) =>
        item.name ===
          fileName &&
        Boolean(item.id)
    ) ??
    null
  )
}

function readObjectSize(
  item:
    StorageObjectListItem
) {
  const rawSize =
    item.metadata?.size

  const parsedSize =
    typeof rawSize ===
      "number"
      ? rawSize
      : typeof rawSize ===
          "string"
        ? Number(rawSize)
        : Number.NaN

  if (
    !Number.isFinite(
      parsedSize
    )
  ) {
    return null
  }

  return parsedSize
}

function readObjectMimeType(
  item:
    StorageObjectListItem
) {
  const value =
    item.metadata?.mimetype

  return typeof value ===
    "string"
    ? value.toLowerCase()
    : null
}

async function removeUploadFiles(
  session:
    AdminVideoUploadSession
) {
  const [
    videoResult,
    thumbnailResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .storage
        .from(
          VIDEO_BUCKET
        )
        .remove([
          session.videoPath,
        ]),

      supabaseAdmin
        .storage
        .from(
          THUMBNAIL_BUCKET
        )
        .remove([
          session.thumbnailPath,
        ]),
    ])

  if (
    videoResult.error
  ) {
    console.error(
      "No se pudo limpiar el video administrativo incompleto:",
      videoResult.error
    )
  }

  if (
    thumbnailResult.error
  ) {
    console.error(
      "No se pudo limpiar la miniatura administrativa incompleta:",
      thumbnailResult.error
    )
  }
}

function revalidateVideoPages() {
  revalidatePath(
    "/admin"
  )

  revalidatePath(
    "/admin/videos"
  )

  revalidatePath(
    "/admin/trash"
  )

  revalidatePath(
    "/vip"
  )
}

export async function prepareAdminVideoUpload(
  input:
    PrepareAdminVideoUploadInput
):
  Promise<PreparedAdminVideoUpload> {
  const admin =
    await requireAdmin()

  const fileName =
    input.fileName.trim()

  const fileType =
    input.fileType
      .trim()
      .toLowerCase()

  if (
    !fileName ||
    fileName.length > 255
  ) {
    throw new Error(
      "Selecciona un archivo de video válido."
    )
  }

  if (
    !isSupportedVideoType(
      fileType
    )
  ) {
    throw new Error(
      "Solo se permiten videos MP4 o WebM."
    )
  }

  if (
    !Number.isSafeInteger(
      input.fileSize
    ) ||
    input.fileSize <= 0
  ) {
    throw new Error(
      "El archivo de video está vacío o no es válido."
    )
  }

  const maximumVideoSize =
    await getMaximumVideoSize()

  if (
    input.fileSize >
    maximumVideoSize
  ) {
    throw new Error(
      "El video supera el tamaño máximo permitido por el bucket."
    )
  }

  const extension =
    VIDEO_EXTENSIONS[
      fileType
    ]

  let session =
    readUploadSession(
      input.session,
      admin.userId,
      extension
    )

  if (session) {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("vip_videos")
        .select("id")
        .eq(
          "id",
          session.videoId
        )
        .maybeSingle()

    if (error) {
      console.error(
        "No se pudo comprobar la carga administrativa:",
        error
      )

      throw new Error(
        "No se pudo preparar la carga."
      )
    }

    /*
     * Una sesión correspondiente a un
     * video ya publicado no se reutiliza.
     */
    if (data) {
      session = null
    }
  }

  if (!session) {
    const videoId =
      randomUUID()

    const root =
      getVideoRoot(
        admin.userId,
        videoId
      )

    session = {
      videoId,

      videoPath:
        `${root}/video.${extension}`,

      thumbnailPath:
        `${root}/thumbnail.jpg`,
    }
  }

  /*
   * Se generan tokens independientes:
   *
   * - uno para el video;
   * - otro para la miniatura.
   *
   * Nunca se expone la clave de servicio.
   */
  const [
    videoUploadResult,
    thumbnailUploadResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .storage
        .from(
          VIDEO_BUCKET
        )
        .createSignedUploadUrl(
          session.videoPath,
          {
            upsert: true,
          }
        ),

      supabaseAdmin
        .storage
        .from(
          THUMBNAIL_BUCKET
        )
        .createSignedUploadUrl(
          session.thumbnailPath,
          {
            upsert: true,
          }
        ),
    ])

  if (
    videoUploadResult.error ||
    !videoUploadResult
      .data?.token
  ) {
    console.error(
      "No se pudo firmar la carga del video:",
      videoUploadResult.error
    )

    throw new Error(
      "No se pudo preparar la carga del video."
    )
  }

  if (
    thumbnailUploadResult.error ||
    !thumbnailUploadResult
      .data?.token
  ) {
    console.error(
      "No se pudo firmar la carga de la miniatura:",
      thumbnailUploadResult.error
    )

    throw new Error(
      "No se pudo preparar la carga de la miniatura."
    )
  }

  return {
    session,

    storageEndpoint:
      getStorageEndpoint(),

    videoUploadToken:
      videoUploadResult
        .data.token,

    thumbnailUploadToken:
      thumbnailUploadResult
        .data.token,

    maximumVideoSize,
  }
}

export async function finalizeAdminVideoUpload(
  input:
    FinalizeAdminVideoUploadInput
) {
  const admin =
    await requireAdmin()

  const session =
    readUploadSession(
      input.session,
      admin.userId
    )

  if (!session) {
    throw new Error(
      "La sesión de carga no es válida."
    )
  }

  if (
    !Number.isFinite(
      input.durationSeconds
    ) ||
    input.durationSeconds <= 0 ||
    input.durationSeconds >
      MAXIMUM_DURATION_SECONDS
  ) {
    throw new Error(
      "No se pudo validar la duración del video."
    )
  }

  const {
    data: existingVideo,
    error:
      existingVideoError,
  } =
    await supabaseAdmin
      .from("vip_videos")
      .select(
        `
          id,
          video_path,
          thumbnail_path
        `
      )
      .eq(
        "id",
        session.videoId
      )
      .maybeSingle()

  if (
    existingVideoError
  ) {
    console.error(
      "No se pudo comprobar el video publicado:",
      existingVideoError
    )

    throw new Error(
      "No se pudo publicar el video."
    )
  }

  /*
   * Permite completar nuevamente la acción
   * sin crear registros duplicados.
   */
  if (existingVideo) {
    if (
      existingVideo.video_path !==
        session.videoPath ||
      existingVideo.thumbnail_path !==
        session.thumbnailPath
    ) {
      throw new Error(
        "La sesión de carga no corresponde al video publicado."
      )
    }

    return {
      success: true,

      videoId:
        existingVideo.id as string,
    }
  }

  let videoObject:
    StorageObjectListItem |
    null = null

  let thumbnailObject:
    StorageObjectListItem |
    null = null

  try {
    ;[
      videoObject,
      thumbnailObject,
    ] =
      await Promise.all([
        findStorageObject(
          VIDEO_BUCKET,
          session.videoPath
        ),

        findStorageObject(
          THUMBNAIL_BUCKET,
          session.thumbnailPath
        ),
      ])
  } catch (error) {
    console.error(
      "No se pudieron comprobar los archivos subidos:",
      error
    )

    throw new Error(
      "No se pudieron comprobar los archivos subidos."
    )
  }

  if (!videoObject) {
    throw new Error(
      "El archivo del video todavía no está disponible."
    )
  }

  if (
    !thumbnailObject
  ) {
    throw new Error(
      "La miniatura todavía no está disponible."
    )
  }

  const videoSize =
    readObjectSize(
      videoObject
    )

  const videoMimeType =
    readObjectMimeType(
      videoObject
    )

  if (
    videoSize === null ||
    videoSize <= 0 ||
    (
      videoMimeType !== null &&
      !isSupportedVideoType(
        videoMimeType
      )
    )
  ) {
    throw new Error(
      "El archivo de video almacenado no es válido."
    )
  }

  const thumbnailSize =
    readObjectSize(
      thumbnailObject
    )

  const thumbnailMimeType =
    readObjectMimeType(
      thumbnailObject
    )

  if (
    thumbnailSize === null ||
    thumbnailSize <= 0 ||
    thumbnailSize >
      MAXIMUM_THUMBNAIL_SIZE ||
    (
      thumbnailMimeType !== null &&
      thumbnailMimeType !==
        "image/jpeg"
    )
  ) {
    throw new Error(
      "La miniatura almacenada no es válida."
    )
  }

  const now =
    new Date().toISOString()

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("vip_videos")
      .insert({
        id:
          session.videoId,

        video_path:
          session.videoPath,

        thumbnail_path:
          session.thumbnailPath,

        duration_seconds:
          Math.round(
            input.durationSeconds
          ),

        status:
          "approved",

        reviewed_by:
          admin.userId,

        reviewed_at:
          now,

        rejection_reason:
          null,

        deleted_at:
          null,

        deleted_by:
          null,

        published_at:
          now,

        is_visible:
          true,

        is_featured:
          false,

        featured_order:
          null,

        upload_source:
          "admin",

        uploaded_by:
          admin.userId,
      })
      .select("id")
      .maybeSingle()

  if (
    error ||
    !data
  ) {
    console.error(
      "No se pudo registrar el video administrativo:",
      error
    )

    throw new Error(
      "Los archivos se subieron, pero el video no pudo publicarse. Reintenta para completar el registro."
    )
  }

  revalidateVideoPages()

  return {
    success: true,

    videoId:
      data.id as string,
  }
}

export async function cleanupAdminVideoUpload(
  input:
    AdminVideoUploadSession
) {
  const admin =
    await requireAdmin()

  const session =
    readUploadSession(
      input,
      admin.userId
    )

  if (!session) {
    throw new Error(
      "La sesión de carga no es válida."
    )
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("vip_videos")
      .select("id")
      .eq(
        "id",
        session.videoId
      )
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo comprobar la carga antes de limpiarla:",
      error
    )

    throw new Error(
      "No se pudo descartar la carga."
    )
  }

  /*
   * Nunca elimina archivos que ya
   * pertenecen a un video publicado.
   */
  if (data) {
    return {
      success: true,

      keptPublishedVideo:
        true,
    }
  }

  await removeUploadFiles(
    session
  )

  return {
    success: true,

    keptPublishedVideo:
      false,
  }
}