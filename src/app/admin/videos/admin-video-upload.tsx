"use client"

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  useRouter,
} from "next/navigation"
import * as tus from "tus-js-client"

import {
  cleanupAdminVideoUpload,
  finalizeAdminVideoUpload,
  prepareAdminVideoUpload,
  type AdminVideoUploadSession,
} from "./upload-actions"

const STORAGE_KEY =
  "tgc-admin-video-upload-queue-v2"

const LEGACY_STORAGE_KEY =
  "tgc-admin-video-upload-v1"

/*
 * Se seleccionan varios videos,
 * pero se procesa solamente uno
 * a la vez.
 */
const MAX_PARALLEL_UPLOADS =
  1

const MAX_QUEUE_ITEMS =
  20

const TUS_CHUNK_SIZE =
  6 * 1024 * 1024

const MAX_THUMBNAIL_WIDTH =
  1280

const MAX_THUMBNAIL_HEIGHT =
  720

type SupportedVideoType =
  | "video/mp4"
  | "video/webm"

type UploadPhase =
  | "waiting"
  | "needs-file"
  | "analyzing"
  | "preparing"
  | "uploading"
  | "paused"
  | "finalizing"
  | "success"
  | "error"

type UploadPart =
  | "thumbnail"
  | "video"
  | null

type QueueItem = {
  localId: string

  file: File | null

  fileName: string
  fileType: SupportedVideoType
  fileSize: number
  fileLastModified: number

  durationSeconds: number | null

  thumbnailBlob: Blob | null
  thumbnailUrl: string | null

  session:
    | AdminVideoUploadSession
    | null

  filesUploaded: boolean

  phase: UploadPhase
  uploadPart: UploadPart

  progress: number

  maximumVideoSize:
    | number
    | null

  errorMessage:
    | string
    | null
}

type StoredQueueItem = {
  localId: string

  fileName: string
  fileType: SupportedVideoType
  fileSize: number
  fileLastModified: number

  durationSeconds:
    | number
    | null

  session:
    | AdminVideoUploadSession
    | null

  filesUploaded: boolean
}

type LegacyStoredUpload = {
  session:
    AdminVideoUploadSession

  fileName: string
  fileType: SupportedVideoType
  fileSize: number
  fileLastModified: number
  durationSeconds: number
  filesUploaded: boolean
}

type TusUploadInput = {
  blob:
    | Blob
    | File

  endpoint: string
  bucketName: string
  objectPath: string
  contentType: string
  signature: string
  fingerprint: string

  onProgress: (
    uploadedBytes: number,
    totalBytes: number
  ) => void
}

type ActiveTransfer = {
  upload:
    tus.Upload

  reject: (
    error: Error
  ) => void
}

class PauseUploadError
  extends Error {
  constructor() {
    super(
      "La carga fue pausada."
    )

    this.name =
      "PauseUploadError"
  }
}

class CancelUploadError
  extends Error {
  constructor() {
    super(
      "La carga fue descartada."
    )

    this.name =
      "CancelUploadError"
  }
}

/*
 * Identificador compatible con:
 *
 * - localhost;
 * - dirección Network por HTTP;
 * - navegadores sin crypto.randomUUID.
 *
 * El identificador solo se utiliza
 * internamente para administrar la cola.
 */
function createLocalId() {
  const cryptoObject =
    globalThis.crypto

  if (
    cryptoObject &&
    typeof cryptoObject
      .randomUUID ===
      "function"
  ) {
    return cryptoObject
      .randomUUID()
  }

  if (
    cryptoObject &&
    typeof cryptoObject
      .getRandomValues ===
      "function"
  ) {
    const bytes =
      new Uint8Array(16)

    cryptoObject
      .getRandomValues(
        bytes
      )

    /*
     * Versión 4 y variante RFC 4122.
     */
    bytes[6] =
      (
        bytes[6] &
        0x0f
      ) |
      0x40

    bytes[8] =
      (
        bytes[8] &
        0x3f
      ) |
      0x80

    const hexadecimal =
      Array.from(
        bytes,
        (value) =>
          value
            .toString(16)
            .padStart(2, "0")
      )
      .join("")

    return [
      hexadecimal.slice(
        0,
        8
      ),
      hexadecimal.slice(
        8,
        12
      ),
      hexadecimal.slice(
        12,
        16
      ),
      hexadecimal.slice(
        16,
        20
      ),
      hexadecimal.slice(
        20
      ),
    ].join("-")
  }

  /*
   * Último respaldo para entornos
   * donde Web Crypto no está disponible.
   *
   * No se utiliza como identificador
   * de seguridad ni como ID de Supabase.
   */
  return [
    "upload",
    Date.now()
      .toString(36),
    Math.random()
      .toString(36)
      .slice(2),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-")
}

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message
  }

  return "Ocurrió un error inesperado."
}

function getVideoType(
  file: File
):
  | SupportedVideoType
  | null {
  const type =
    file.type
      .trim()
      .toLowerCase()

  if (
    type === "video/mp4" ||
    type === "video/webm"
  ) {
    return type
  }

  const name =
    file.name
      .trim()
      .toLowerCase()

  if (
    name.endsWith(".mp4")
  ) {
    return "video/mp4"
  }

  if (
    name.endsWith(".webm")
  ) {
    return "video/webm"
  }

  return null
}

function formatBytes(
  value: number
) {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "0 MB"
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ]

  let current =
    value

  let unitIndex =
    0

  while (
    current >= 1024 &&
    unitIndex <
      units.length - 1
  ) {
    current /= 1024
    unitIndex += 1
  }

  return `${current.toFixed(
    unitIndex >= 2
      ? 1
      : 0
  )} ${units[unitIndex]}`
}

function formatDuration(
  value:
    | number
    | null
) {
  if (
    value === null ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return "--:--"
  }

  const totalSeconds =
    Math.floor(value)

  const hours =
    Math.floor(
      totalSeconds / 3600
    )

  const minutes =
    Math.floor(
      (
        totalSeconds % 3600
      ) / 60
    )

  const seconds =
    totalSeconds % 60

  const paddedMinutes =
    String(minutes)
      .padStart(2, "0")

  const paddedSeconds =
    String(seconds)
      .padStart(2, "0")

  if (hours > 0) {
    return (
      `${hours}:` +
      `${paddedMinutes}:` +
      paddedSeconds
    )
  }

  return (
    `${paddedMinutes}:` +
    paddedSeconds
  )
}

function getPhaseLabel(
  item: QueueItem
) {
  if (
    item.phase ===
    "waiting"
  ) {
    return "En espera"
  }

  if (
    item.phase ===
    "needs-file"
  ) {
    return "Falta seleccionar"
  }

  if (
    item.phase ===
    "analyzing"
  ) {
    return "Analizando"
  }

  if (
    item.phase ===
    "preparing"
  ) {
    return "Preparando"
  }

  if (
    item.phase ===
    "uploading"
  ) {
    return item.uploadPart ===
      "thumbnail"
      ? "Subiendo miniatura"
      : "Subiendo video"
  }

  if (
    item.phase ===
    "paused"
  ) {
    return "Pausado"
  }

  if (
    item.phase ===
    "finalizing"
  ) {
    return "Publicando"
  }

  if (
    item.phase ===
    "success"
  ) {
    return "Publicado"
  }

  return "Error"
}

function waitForEvent(
  target: EventTarget,
  eventName: string
) {
  return new Promise<void>(
    (
      resolve,
      reject
    ) => {
      const cleanup =
        () => {
          target
            .removeEventListener(
              eventName,
              handleSuccess
            )

          target
            .removeEventListener(
              "error",
              handleError
            )
        }

      const handleSuccess =
        () => {
          cleanup()
          resolve()
        }

      const handleError =
        () => {
          cleanup()

          reject(
            new Error(
              "El navegador no pudo leer el video."
            )
          )
        }

      target
        .addEventListener(
          eventName,
          handleSuccess,
          {
            once: true,
          }
        )

      target
        .addEventListener(
          "error",
          handleError,
          {
            once: true,
          }
        )
    }
  )
}

function canvasToBlob(
  canvas:
    HTMLCanvasElement
) {
  return new Promise<Blob>(
    (
      resolve,
      reject
    ) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "No se pudo generar la miniatura."
              )
            )

            return
          }

          resolve(blob)
        },
        "image/jpeg",
        0.84
      )
    }
  )
}

async function analyzeVideo(
  file: File
) {
  const objectUrl =
    URL.createObjectURL(
      file
    )

  const video =
    document.createElement(
      "video"
    )

  video.preload =
    "metadata"

  video.muted =
    true

  video.playsInline =
    true

  video.src =
    objectUrl

  try {
    await waitForEvent(
      video,
      "loadedmetadata"
    )

    if (
      !Number.isFinite(
        video.duration
      ) ||
      video.duration <= 0 ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    ) {
      throw new Error(
        "El archivo no contiene un video válido."
      )
    }

    /*
     * Captura el fotograma inicial.
     * No salta al segundo 1.
     */
    const initialFrameTime =
      Math.min(
        0.05,
        Math.max(
          0.001,
          video.duration -
            0.001
        )
      )

    const seekPromise =
      waitForEvent(
        video,
        "seeked"
      )

    video.currentTime =
      initialFrameTime

    await seekPromise

    const widthScale =
      MAX_THUMBNAIL_WIDTH /
      video.videoWidth

    const heightScale =
      MAX_THUMBNAIL_HEIGHT /
      video.videoHeight

    const scale =
      Math.min(
        1,
        widthScale,
        heightScale
      )

    const width =
      Math.max(
        1,
        Math.round(
          video.videoWidth *
            scale
        )
      )

    const height =
      Math.max(
        1,
        Math.round(
          video.videoHeight *
            scale
        )
      )

    const canvas =
      document.createElement(
        "canvas"
      )

    canvas.width =
      width

    canvas.height =
      height

    const context =
      canvas.getContext(
        "2d"
      )

    if (!context) {
      throw new Error(
        "El navegador no pudo generar la miniatura."
      )
    }

    context.drawImage(
      video,
      0,
      0,
      width,
      height
    )

    const thumbnailBlob =
      await canvasToBlob(
        canvas
      )

    return {
      durationSeconds:
        video.duration,

      thumbnailBlob,

      thumbnailUrl:
        URL.createObjectURL(
          thumbnailBlob
        ),
    }
  } finally {
    video.removeAttribute(
      "src"
    )

    video.load()

    URL.revokeObjectURL(
      objectUrl
    )
  }
}

function isUploadSession(
  value: unknown
): value is AdminVideoUploadSession {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return false
  }

  const session =
    value as Partial<
      AdminVideoUploadSession
    >

  return (
    typeof session.videoId ===
      "string" &&
    typeof session.videoPath ===
      "string" &&
    typeof session.thumbnailPath ===
      "string"
  )
}

function isStoredQueueItem(
  value: unknown
): value is StoredQueueItem {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return false
  }

  const item =
    value as Partial<
      StoredQueueItem
    >

  const validDuration =
    item.durationSeconds ===
      null ||
    (
      typeof item.durationSeconds ===
        "number" &&
      Number.isFinite(
        item.durationSeconds
      ) &&
      item.durationSeconds > 0
    )

  const validSession =
    item.session ===
      null ||
    isUploadSession(
      item.session
    )

  return (
    typeof item.localId ===
      "string" &&
    typeof item.fileName ===
      "string" &&
    (
      item.fileType ===
        "video/mp4" ||
      item.fileType ===
        "video/webm"
    ) &&
    typeof item.fileSize ===
      "number" &&
    item.fileSize > 0 &&
    typeof item
      .fileLastModified ===
      "number" &&
    typeof item
      .filesUploaded ===
      "boolean" &&
    validDuration &&
    validSession
  )
}

function readStoredQueue():
  StoredQueueItem[] {
  try {
    const raw =
      window.localStorage
        .getItem(
          STORAGE_KEY
        )

    if (raw) {
      const parsed =
        JSON.parse(
          raw
        ) as unknown

      if (
        Array.isArray(
          parsed
        )
      ) {
        return parsed.filter(
          isStoredQueueItem
        )
      }
    }

    const legacyRaw =
      window.localStorage
        .getItem(
          LEGACY_STORAGE_KEY
        )

    if (!legacyRaw) {
      return []
    }

    const legacy =
      JSON.parse(
        legacyRaw
      ) as LegacyStoredUpload

    if (
      !isUploadSession(
        legacy.session
      ) ||
      typeof legacy.fileName !==
        "string" ||
      (
        legacy.fileType !==
          "video/mp4" &&
        legacy.fileType !==
          "video/webm"
      ) ||
      typeof legacy.fileSize !==
        "number" ||
      typeof legacy.fileLastModified !==
        "number" ||
      typeof legacy.durationSeconds !==
        "number" ||
      typeof legacy.filesUploaded !==
        "boolean"
    ) {
      return []
    }

    window.localStorage
      .removeItem(
        LEGACY_STORAGE_KEY
      )

    return [
      {
        localId:
          createLocalId(),

        fileName:
          legacy.fileName,

        fileType:
          legacy.fileType,

        fileSize:
          legacy.fileSize,

        fileLastModified:
          legacy.fileLastModified,

        durationSeconds:
          legacy.durationSeconds,

        session:
          legacy.session,

        filesUploaded:
          legacy.filesUploaded,
      },
    ]
  } catch {
    return []
  }
}

function writeStoredQueue(
  items: QueueItem[]
) {
  try {
    const storedItems:
      StoredQueueItem[] =
      items
        .filter(
          (item) =>
            item.phase !==
            "success"
        )
        .map(
          (item) => ({
            localId:
              item.localId,

            fileName:
              item.fileName,

            fileType:
              item.fileType,

            fileSize:
              item.fileSize,

            fileLastModified:
              item.fileLastModified,

            durationSeconds:
              item.durationSeconds,

            session:
              item.session,

            filesUploaded:
              item.filesUploaded,
          })
        )

    if (
      storedItems.length ===
      0
    ) {
      window.localStorage
        .removeItem(
          STORAGE_KEY
        )

      return
    }

    window.localStorage
      .setItem(
        STORAGE_KEY,
        JSON.stringify(
          storedItems
        )
      )
  } catch {
    /*
     * La cola continúa aunque
     * localStorage esté bloqueado.
     */
  }
}

function isSameFile(
  file: File,
  item: QueueItem
) {
  return (
    file.name ===
      item.fileName &&
    file.size ===
      item.fileSize &&
    file.lastModified ===
      item.fileLastModified &&
    getVideoType(file) ===
      item.fileType
  )
}

function createTusUpload(
  input:
    TusUploadInput,
  onSuccess:
    () => void,
  onError:
    (
      error: Error
    ) => void
) {
  return new tus.Upload(
    input.blob,
    {
      endpoint:
        input.endpoint,

      retryDelays: [
        0,
        3000,
        5000,
        10000,
        20000,
      ],

      headers: {
        "x-signature":
          input.signature,

        "x-upsert":
          "true",
      },

      metadata: {
        bucketName:
          input.bucketName,

        objectName:
          input.objectPath,

        contentType:
          input.contentType,

        cacheControl:
          "3600",
      },

      uploadDataDuringCreation:
        true,

      removeFingerprintOnSuccess:
        true,

      chunkSize:
        TUS_CHUNK_SIZE,

      fingerprint:
        async () =>
          input.fingerprint,

      onProgress:
        input.onProgress,

      onSuccess,

      onError,
    }
  )
}

async function beginTusUpload(
  upload:
    tus.Upload,
  objectPath: string
) {
  const previousUploads =
    await upload
      .findPreviousUploads()

  const previousUpload =
    previousUploads.find(
      (item) =>
        item.metadata
          ?.objectName ===
        objectPath
    )

  if (previousUpload) {
    upload
      .resumeFromPreviousUpload(
        previousUpload
      )
  }

  upload.start()
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M12 16V4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="m7.5 8.5 4.5-4.5 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M5 14v5h14v-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function AdminVideoUpload() {
  const router =
    useRouter()

  const fileInputRef =
    useRef<
      HTMLInputElement |
      null
    >(null)

  const itemsRef =
    useRef<
      QueueItem[]
    >([])

  const hydratedRef =
    useRef(false)

  const runningRef =
    useRef<
      Set<string>
    >(
      new Set()
    )

  const cancelledRef =
    useRef<
      Set<string>
    >(
      new Set()
    )

  const activeTransfersRef =
    useRef<
      Map<
        string,
        ActiveTransfer
      >
    >(
      new Map()
    )

  const [
    isOpen,
    setIsOpen,
  ] =
    useState(false)

  const [
    hydrated,
    setHydrated,
  ] =
    useState(false)

  const [
    items,
    setItems,
  ] =
    useState<
      QueueItem[]
    >([])

  const [
    globalMessage,
    setGlobalMessage,
  ] =
    useState<
      string |
      null
    >(null)

  const updateQueue =
    useCallback(
      (
        updater: (
          current:
            QueueItem[]
        ) => QueueItem[]
      ) => {
        setItems(
          (current) => {
            const next =
              updater(
                current
              )

            itemsRef.current =
              next

            if (
              hydratedRef
                .current
            ) {
              writeStoredQueue(
                next
              )
            }

            return next
          }
        )
      },
      []
    )

  const updateItem =
    useCallback(
      (
        localId: string,
        updater: (
          current:
            QueueItem
        ) => QueueItem
      ) => {
        updateQueue(
          (current) =>
            current.map(
              (item) =>
                item.localId ===
                localId
                  ? updater(
                      item
                    )
                  : item
            )
        )
      },
      [
        updateQueue,
      ]
    )

  const assertNotCancelled =
    useCallback(
      (
        localId: string
      ) => {
        if (
          cancelledRef.current
            .has(localId)
        ) {
          throw new CancelUploadError()
        }
      },
      []
    )

  const runTusUpload =
    useCallback(
      (
        localId: string,
        input:
          TusUploadInput
      ) => {
        return new Promise<void>(
          (
            resolve,
            reject
          ) => {
            const upload =
              createTusUpload(
                input,

                () => {
                  activeTransfersRef
                    .current
                    .delete(
                      localId
                    )

                  resolve()
                },

                (error) => {
                  activeTransfersRef
                    .current
                    .delete(
                      localId
                    )

                  reject(
                    error
                  )
                }
              )

            activeTransfersRef
              .current
              .set(
                localId,
                {
                  upload,
                  reject,
                }
              )

            beginTusUpload(
              upload,
              input.objectPath
            ).catch(
              (error) => {
                activeTransfersRef
                  .current
                  .delete(
                    localId
                  )

                reject(
                  error
                )
              }
            )
          }
        )
      },
      []
    )

  const processItem =
    useCallback(
      async (
        localId: string
      ) => {
        if (
          runningRef.current
            .has(localId)
        ) {
          return
        }

        const startingItem =
          itemsRef.current
            .find(
              (item) =>
                item.localId ===
                localId
            )

        if (
          !startingItem ||
          startingItem.phase !==
            "waiting"
        ) {
          return
        }

        runningRef.current
          .add(localId)

        cancelledRef.current
          .delete(localId)

        try {
          const file =
            startingItem.file

          let durationSeconds =
            startingItem
              .durationSeconds

          let thumbnailBlob =
            startingItem
              .thumbnailBlob

          let thumbnailUrl =
            startingItem
              .thumbnailUrl

          const session =
            startingItem
              .session

          if (
            startingItem
              .filesUploaded
          ) {
            if (
              !session ||
              durationSeconds ===
                null
            ) {
              throw new Error(
                "La carga guardada está incompleta."
              )
            }

            updateItem(
              localId,
              (item) => ({
                ...item,

                phase:
                  "finalizing",

                progress:
                  100,

                errorMessage:
                  null,
              })
            )

            await finalizeAdminVideoUpload({
              session,

              durationSeconds,
            })

            assertNotCancelled(
              localId
            )

            updateItem(
              localId,
              (item) => ({
                ...item,

                phase:
                  "success",

                progress:
                  100,

                uploadPart:
                  null,

                errorMessage:
                  null,
              })
            )

            router.refresh()

            return
          }

          if (!file) {
            updateItem(
              localId,
              (item) => ({
                ...item,

                phase:
                  "needs-file",

                errorMessage:
                  "Selecciona nuevamente este archivo para continuar.",
              })
            )

            return
          }

          if (
            durationSeconds ===
              null ||
            !thumbnailBlob
          ) {
            updateItem(
              localId,
              (item) => ({
                ...item,

                phase:
                  "analyzing",

                progress:
                  0,

                errorMessage:
                  null,
              })
            )

            const analyzed =
              await analyzeVideo(
                file
              )

            if (
              cancelledRef.current
                .has(localId)
            ) {
              URL.revokeObjectURL(
                analyzed.thumbnailUrl
              )

              throw new CancelUploadError()
            }

            durationSeconds =
              analyzed
                .durationSeconds

            thumbnailBlob =
              analyzed
                .thumbnailBlob

            thumbnailUrl =
              analyzed
                .thumbnailUrl

            updateItem(
              localId,
              (item) => {
                if (
                  item.thumbnailUrl &&
                  item.thumbnailUrl !==
                    thumbnailUrl
                ) {
                  URL.revokeObjectURL(
                    item.thumbnailUrl
                  )
                }

                return {
                  ...item,

                  durationSeconds,

                  thumbnailBlob,

                  thumbnailUrl,

                  phase:
                    "preparing",

                  errorMessage:
                    null,
                }
              }
            )
          } else {
            updateItem(
              localId,
              (item) => ({
                ...item,

                phase:
                  "preparing",

                errorMessage:
                  null,
              })
            )
          }

          assertNotCancelled(
            localId
          )

          if (
            durationSeconds ===
              null ||
            !thumbnailBlob
          ) {
            throw new Error(
              "No se pudo preparar el video."
            )
          }

          const prepared =
            await prepareAdminVideoUpload({
              fileName:
                file.name,

              fileType:
                startingItem
                  .fileType,

              fileSize:
                file.size,

              session,
            })

          assertNotCancelled(
            localId
          )

          const uploadSession =
            prepared.session

          updateItem(
            localId,
            (item) => ({
              ...item,

              session:
                uploadSession,

              maximumVideoSize:
                prepared
                  .maximumVideoSize,

              phase:
                "uploading",

              uploadPart:
                "thumbnail",

              progress:
                Math.max(
                  0,
                  item.progress
                ),

              errorMessage:
                null,
            })
          )

          await runTusUpload(
            localId,
            {
              blob:
                thumbnailBlob,

              endpoint:
                prepared
                  .storageEndpoint,

              bucketName:
                "vip-thumbnails",

              objectPath:
                uploadSession
                  .thumbnailPath,

              contentType:
                "image/jpeg",

              signature:
                prepared
                  .thumbnailUploadToken,

              fingerprint:
                `tgc-thumbnail:${uploadSession.thumbnailPath}:${thumbnailBlob.size}`,

              onProgress:
                (
                  uploaded,
                  total
                ) => {
                  const ratio =
                    total > 0
                      ? uploaded /
                        total
                      : 0

                  updateItem(
                    localId,
                    (item) => ({
                      ...item,

                      phase:
                        "uploading",

                      uploadPart:
                        "thumbnail",

                      progress:
                        Math.min(
                          3,
                          ratio * 3
                        ),
                    })
                  )
                },
            }
          )

          assertNotCancelled(
            localId
          )

          updateItem(
            localId,
            (item) => ({
              ...item,

              phase:
                "uploading",

              uploadPart:
                "video",

              progress:
                Math.max(
                  3,
                  item.progress
                ),
            })
          )

          await runTusUpload(
            localId,
            {
              blob:
                file,

              endpoint:
                prepared
                  .storageEndpoint,

              bucketName:
                "vip-videos",

              objectPath:
                uploadSession
                  .videoPath,

              contentType:
                startingItem
                  .fileType,

              signature:
                prepared
                  .videoUploadToken,

              fingerprint:
                `tgc-video:${uploadSession.videoPath}:${file.size}:${file.lastModified}`,

              onProgress:
                (
                  uploaded,
                  total
                ) => {
                  const ratio =
                    total > 0
                      ? uploaded /
                        total
                      : 0

                  updateItem(
                    localId,
                    (item) => ({
                      ...item,

                      phase:
                        "uploading",

                      uploadPart:
                        "video",

                      progress:
                        Math.min(
                          99,
                          3 +
                            ratio *
                              96
                        ),
                    })
                  )
                },
            }
          )

          assertNotCancelled(
            localId
          )

          updateItem(
            localId,
            (item) => ({
              ...item,

              filesUploaded:
                true,

              phase:
                "finalizing",

              uploadPart:
                null,

              progress:
                100,

              errorMessage:
                null,
            })
          )

          await finalizeAdminVideoUpload({
            session:
              uploadSession,

            durationSeconds,
          })

          assertNotCancelled(
            localId
          )

          updateItem(
            localId,
            (item) => ({
              ...item,

              phase:
                "success",

              progress:
                100,

              uploadPart:
                null,

              errorMessage:
                null,
            })
          )

          router.refresh()
        } catch (error) {
          if (
            error instanceof
              CancelUploadError ||
            cancelledRef.current
              .has(localId)
          ) {
            return
          }

          if (
            error instanceof
            PauseUploadError
          ) {
            updateItem(
              localId,
              (item) => ({
                ...item,

                phase:
                  "paused",

                errorMessage:
                  null,
              })
            )

            return
          }

          updateItem(
            localId,
            (item) => ({
              ...item,

              phase:
                item.file
                  ? "error"
                  : "needs-file",

              uploadPart:
                null,

              errorMessage:
                getErrorMessage(
                  error
                ),
            })
          )
        } finally {
          runningRef.current
            .delete(localId)

          activeTransfersRef
            .current
            .delete(localId)

          updateQueue(
            (current) => [
              ...current,
            ]
          )
        }
      },
      [
        assertNotCancelled,
        router,
        runTusUpload,
        updateItem,
        updateQueue,
      ]
    )

  useEffect(() => {
    const storedItems =
      readStoredQueue()

    const restoredItems:
      QueueItem[] =
      storedItems.map(
        (item) => ({
          ...item,

          file:
            null,

          thumbnailBlob:
            null,

          thumbnailUrl:
            null,

          phase:
            item.filesUploaded &&
            item.session &&
            item.durationSeconds !==
              null
              ? "waiting"
              : "needs-file",

          uploadPart:
            null,

          progress:
            item.filesUploaded
              ? 100
              : 0,

          maximumVideoSize:
            null,

          errorMessage:
            item.filesUploaded
              ? null
              : "Selecciona nuevamente este archivo para reanudar la carga.",
        })
      )

    itemsRef.current =
      restoredItems

    setItems(
      restoredItems
    )

    hydratedRef.current =
      true

    setHydrated(true)

    if (
      restoredItems.length >
      0
    ) {
      setIsOpen(true)
    }

    return () => {
      for (
        const item of
        itemsRef.current
      ) {
        if (
          item.thumbnailUrl
        ) {
          URL.revokeObjectURL(
            item.thumbnailUrl
          )
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    const availableSlots =
      MAX_PARALLEL_UPLOADS -
      runningRef.current
        .size

    if (
      availableSlots <= 0
    ) {
      return
    }

    const candidates =
      items
        .filter(
          (item) =>
            item.phase ===
              "waiting" &&
            !runningRef.current
              .has(
                item.localId
              )
        )
        .slice(
          0,
          availableSlots
        )

    for (
      const candidate of
      candidates
    ) {
      void processItem(
        candidate.localId
      )
    }
  }, [
    hydrated,
    items,
    processItem,
  ])

  function handleFileChange(
    event:
      ChangeEvent<
        HTMLInputElement
      >
  ) {
    const selectedFiles =
      Array.from(
        event.target.files ??
          []
      )

    event.target.value =
      ""

    if (
      selectedFiles.length ===
      0
    ) {
      return
    }

    setGlobalMessage(null)

    const currentItems =
      itemsRef.current

    const activeCount =
      currentItems.filter(
        (item) =>
          item.phase !==
          "success"
      ).length

    const availablePlaces =
      Math.max(
        0,
        MAX_QUEUE_ITEMS -
          activeCount
      )

    if (
      availablePlaces === 0
    ) {
      setGlobalMessage(
        "La cola admite un máximo de 20 videos pendientes."
      )

      return
    }

    const filesToProcess =
      selectedFiles.slice(
        0,
        availablePlaces
      )

    const invalidNames:
      string[] = []

    const duplicatedNames:
      string[] = []

    updateQueue(
      (current) => {
        const next = [
          ...current,
        ]

        for (
          const file of
          filesToProcess
        ) {
          const fileType =
            getVideoType(
              file
            )

          if (
            !fileType ||
            file.size <= 0
          ) {
            invalidNames.push(
              file.name
            )

            continue
          }

          const matchingItem =
            next.find(
              (item) =>
                item.phase !==
                  "success" &&
                isSameFile(
                  file,
                  item
                )
            )

          if (
            matchingItem
          ) {
            if (
              matchingItem.file
            ) {
              duplicatedNames.push(
                file.name
              )

              continue
            }

            const index =
              next.findIndex(
                (item) =>
                  item.localId ===
                  matchingItem.localId
              )

            next[index] = {
              ...matchingItem,

              file,

              phase:
                "waiting",

              errorMessage:
                null,
            }

            continue
          }

          next.push({
            localId:
              createLocalId(),

            file,

            fileName:
              file.name,

            fileType,

            fileSize:
              file.size,

            fileLastModified:
              file.lastModified,

            durationSeconds:
              null,

            thumbnailBlob:
              null,

            thumbnailUrl:
              null,

            session:
              null,

            filesUploaded:
              false,

            phase:
              "waiting",

            uploadPart:
              null,

            progress:
              0,

            maximumVideoSize:
              null,

            errorMessage:
              null,
          })
        }

        return next
      }
    )

    const messages:
      string[] = []

    if (
      selectedFiles.length >
      availablePlaces
    ) {
      messages.push(
        `Solo se añadieron ${availablePlaces} videos porque la cola admite un máximo de ${MAX_QUEUE_ITEMS}.`
      )
    }

    if (
      invalidNames.length >
      0
    ) {
      messages.push(
        `No se añadieron archivos incompatibles: ${invalidNames.join(
          ", "
        )}.`
      )
    }

    if (
      duplicatedNames.length >
      0
    ) {
      messages.push(
        `Ya estaban en la cola: ${duplicatedNames.join(
          ", "
        )}.`
      )
    }

    if (
      messages.length > 0
    ) {
      setGlobalMessage(
        messages.join(" ")
      )
    }
  }

  async function handlePause(
    localId: string
  ) {
    const transfer =
      activeTransfersRef
        .current
        .get(localId)

    if (!transfer) {
      return
    }

    try {
      await transfer.upload
        .abort(false)
    } finally {
      activeTransfersRef
        .current
        .delete(localId)

      transfer.reject(
        new PauseUploadError()
      )
    }
  }

  function handleResume(
    localId: string
  ) {
    updateItem(
      localId,
      (item) => ({
        ...item,

        phase:
          item.file ||
          item.filesUploaded
            ? "waiting"
            : "needs-file",

        errorMessage:
          item.file ||
          item.filesUploaded
            ? null
            : "Selecciona nuevamente este archivo para continuar.",
      })
    )
  }

  async function handleDiscard(
    localId: string
  ) {
    const item =
      itemsRef.current
        .find(
          (current) =>
            current.localId ===
            localId
        )

    if (!item) {
      return
    }

    cancelledRef.current
      .add(localId)

    const transfer =
      activeTransfersRef
        .current
        .get(localId)

    if (transfer) {
      try {
        await transfer.upload
          .abort(false)
      } catch {
        /*
         * La limpieza continúa.
         */
      }

      activeTransfersRef
        .current
        .delete(localId)

      transfer.reject(
        new CancelUploadError()
      )
    }

    if (
      item.session &&
      item.phase !==
        "success"
    ) {
      try {
        await cleanupAdminVideoUpload(
          item.session
        )
      } catch (error) {
        cancelledRef.current
          .delete(localId)

        updateItem(
          localId,
          (current) => ({
            ...current,

            phase:
              "error",

            errorMessage:
              getErrorMessage(
                error
              ),
          })
        )

        return
      }
    }

    if (
      item.thumbnailUrl
    ) {
      URL.revokeObjectURL(
        item.thumbnailUrl
      )
    }

    updateQueue(
      (current) =>
        current.filter(
          (queueItem) =>
            queueItem.localId !==
            localId
        )
    )

    cancelledRef.current
      .delete(localId)
  }

  function handleRetry(
    localId: string
  ) {
    updateItem(
      localId,
      (item) => ({
        ...item,

        phase:
          item.file ||
          item.filesUploaded
            ? "waiting"
            : "needs-file",

        errorMessage:
          item.file ||
          item.filesUploaded
            ? null
            : "Selecciona nuevamente este archivo para continuar.",
      })
    )
  }

  function removeCompleted(
    localId: string
  ) {
    const item =
      itemsRef.current
        .find(
          (current) =>
            current.localId ===
            localId
        )

    if (
      item?.thumbnailUrl
    ) {
      URL.revokeObjectURL(
        item.thumbnailUrl
      )
    }

    updateQueue(
      (current) =>
        current.filter(
          (queueItem) =>
            queueItem.localId !==
            localId
        )
    )
  }

  function clearCompleted() {
    for (
      const item of
      itemsRef.current
    ) {
      if (
        item.phase ===
          "success" &&
        item.thumbnailUrl
      ) {
        URL.revokeObjectURL(
          item.thumbnailUrl
        )
      }
    }

    updateQueue(
      (current) =>
        current.filter(
          (item) =>
            item.phase !==
            "success"
        )
    )
  }

  const pendingCount =
    items.filter(
      (item) =>
        item.phase !==
        "success"
    ).length

  const successCount =
    items.filter(
      (item) =>
        item.phase ===
        "success"
    ).length

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/[0.07] px-4 text-sm text-gold transition-colors hover:border-gold/65 hover:bg-gold/[0.12] focus-visible:border-gold/75 focus-visible:outline-none"
      >
        <UploadIcon />

        Añadir videos

        {pendingCount > 0 && (
          <span className="ml-1 min-w-[1ch] text-xs tabular-nums text-gold/75">
            {pendingCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-video-upload-title"
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gold/25 bg-[#060605] shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-gold/15 px-5 py-5 sm:px-6">
              <div>
                <h2
                  id="admin-video-upload-title"
                  className="font-serif text-2xl text-foreground"
                >
                  Añadir videos
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Los videos se publicarán automáticamente en el orden seleccionado.
                </p>
              </div>

              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => {
                  setIsOpen(false)
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/15 text-muted-foreground transition-colors hover:border-gold/35 hover:text-foreground focus-visible:border-gold/50 focus-visible:outline-none"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-gold/65">
                  Archivos de video
                </span>

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  multiple
                  accept="video/mp4,video/webm,.mp4,.webm"
                  onChange={
                    handleFileChange
                  }
                  className="block w-full cursor-pointer rounded-xl border border-gold/20 bg-black px-3 py-3 text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-gold/[0.1] file:px-3 file:py-2 file:text-xs file:text-gold hover:border-gold/40 focus:border-gold/55 focus:outline-none"
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <p>
                  MP4 y WebM · Carga secuencial
                </p>

                {items.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <p>
                      {pendingCount} pendientes
                      {" · "}
                      {successCount} publicados
                    </p>

                    {successCount > 0 && (
                      <button
                        type="button"
                        onClick={
                          clearCompleted
                        }
                        className="min-h-9 rounded-lg border border-gold/20 bg-black px-3 text-xs text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground focus-visible:border-gold/55 focus-visible:outline-none"
                      >
                        Limpiar publicados
                      </button>
                    )}
                  </div>
                )}
              </div>

              {globalMessage && (
                <div className="rounded-xl border border-gold/25 bg-gold/[0.05] px-4 py-4 text-sm leading-6 text-gold/85">
                  {globalMessage}
                </div>
              )}

              {!hydrated && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Recuperando cargas pendientes…
                </p>
              )}

              {items.length > 0 && (
                <div className="space-y-4">
                  {items.map(
                    (item) => (
                      <article
                        key={
                          item.localId
                        }
                        className="overflow-hidden rounded-2xl border border-gold/20 bg-black"
                      >
                        <div className="grid gap-4 p-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                          <div
                            role="img"
                            aria-label="Miniatura del video"
                            className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-gold/10 bg-[#050504] bg-cover bg-center text-xs text-muted-foreground sm:aspect-auto sm:h-[100px]"
                            style={{
                              backgroundImage:
                                item.thumbnailUrl
                                  ? `url("${item.thumbnailUrl}")`
                                  : undefined,
                            }}
                          >
                            {!item.thumbnailUrl && (
                              <span>
                                {item.phase ===
                                "analyzing"
                                  ? "Generando…"
                                  : "Sin miniatura"}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p
                                  title={
                                    item.fileName
                                  }
                                  className="truncate text-sm text-foreground"
                                >
                                  {
                                    item.fileName
                                  }
                                </p>

                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatBytes(
                                    item.fileSize
                                  )}
                                  {" · "}
                                  {formatDuration(
                                    item.durationSeconds
                                  )}
                                </p>
                              </div>

                              <span
                                className={`shrink-0 text-xs ${
                                  item.phase ===
                                  "success"
                                    ? "text-emerald-300"
                                    : item.phase ===
                                          "error" ||
                                        item.phase ===
                                          "needs-file"
                                      ? "text-red-300"
                                      : item.phase ===
                                          "paused"
                                        ? "text-gold"
                                        : "text-muted-foreground"
                                }`}
                              >
                                {getPhaseLabel(
                                  item
                                )}
                              </span>
                            </div>

                            <div className="mt-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                                  <div
                                    className="h-full rounded-full bg-gold transition-[width] duration-200"
                                    style={{
                                      width:
                                        `${Math.max(
                                          0,
                                          Math.min(
                                            100,
                                            item.progress
                                          )
                                        )}%`,
                                    }}
                                  />
                                </div>

                                <span className="w-10 text-right text-xs tabular-nums text-gold/80">
                                  {Math.round(
                                    item.progress
                                  )}
                                  %
                                </span>
                              </div>
                            </div>

                            {item.maximumVideoSize && (
                              <p className="mt-3 text-[11px] text-muted-foreground">
                                Límite del bucket:{" "}
                                {formatBytes(
                                  item.maximumVideoSize
                                )}
                              </p>
                            )}

                            {item.errorMessage && (
                              <p className="mt-3 text-xs leading-5 text-red-300">
                                {
                                  item.errorMessage
                                }
                              </p>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2">
                              {item.phase ===
                                "uploading" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handlePause(
                                      item.localId
                                    )
                                  }}
                                  className="min-h-9 rounded-lg border border-gold/25 bg-black px-3 text-xs text-muted-foreground transition-colors hover:border-gold/45 hover:text-foreground focus-visible:border-gold/60 focus-visible:outline-none"
                                >
                                  Pausar
                                </button>
                              )}

                              {item.phase ===
                                "paused" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleResume(
                                      item.localId
                                    )
                                  }}
                                  className="min-h-9 rounded-lg border border-gold/40 bg-gold/[0.07] px-3 text-xs text-gold transition-colors hover:border-gold/60 hover:bg-gold/[0.12] focus-visible:border-gold/70 focus-visible:outline-none"
                                >
                                  Continuar
                                </button>
                              )}

                              {(item.phase ===
                                "error" ||
                                item.phase ===
                                  "needs-file") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      item.file ||
                                      item.filesUploaded
                                    ) {
                                      handleRetry(
                                        item.localId
                                      )

                                      return
                                    }

                                    fileInputRef
                                      .current
                                      ?.click()
                                  }}
                                  className="min-h-9 rounded-lg border border-gold/40 bg-gold/[0.07] px-3 text-xs text-gold transition-colors hover:border-gold/60 hover:bg-gold/[0.12] focus-visible:border-gold/70 focus-visible:outline-none"
                                >
                                  {item.file ||
                                  item.filesUploaded
                                    ? "Reintentar"
                                    : "Seleccionar archivo"}
                                </button>
                              )}

                              {item.phase ===
                                "success" ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    removeCompleted(
                                      item.localId
                                    )
                                  }}
                                  className="min-h-9 rounded-lg border border-gold/20 bg-black px-3 text-xs text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground focus-visible:border-gold/55 focus-visible:outline-none"
                                >
                                  Quitar de la lista
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={
                                    item.phase ===
                                    "finalizing"
                                  }
                                  onClick={() => {
                                    void handleDiscard(
                                      item.localId
                                    )
                                  }}
                                  className="min-h-9 rounded-lg border border-red-500/25 bg-red-500/[0.04] px-3 text-xs text-red-300 transition-colors hover:border-red-500/45 hover:bg-red-500/[0.08] focus-visible:border-red-500/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Descartar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}