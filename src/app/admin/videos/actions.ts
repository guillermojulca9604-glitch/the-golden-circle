"use server"

import {
  revalidatePath,
} from "next/cache"

import {
  requireAdmin,
} from "@/lib/auth/require-admin"
import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const MAXIMUM_REJECTION_REASON_LENGTH =
  500

type DeletedVideoRow = {
  id: string
  video_path: string | null
  thumbnail_path: string | null
}

function getRequiredUuid(
  formData: FormData,
  fieldName: string
) {
  const value =
    formData.get(fieldName)

  if (
    typeof value !== "string" ||
    !UUID_PATTERN.test(
      value.trim()
    )
  ) {
    throw new Error(
      "El identificador del video no es válido."
    )
  }

  return value.trim()
}

function getRejectionReason(
  formData: FormData
) {
  const value =
    formData.get(
      "rejectionReason"
    )

  if (
    typeof value !== "string"
  ) {
    throw new Error(
      "Ingresa el motivo de desaprobación."
    )
  }

  const reason =
    value.trim()

  if (!reason) {
    throw new Error(
      "Ingresa el motivo de desaprobación."
    )
  }

  if (
    reason.length >
    MAXIMUM_REJECTION_REASON_LENGTH
  ) {
    throw new Error(
      "El motivo no puede superar los 500 caracteres."
    )
  }

  return reason
}

function revalidateVideoPages() {
  revalidatePath("/admin")
  revalidatePath("/admin/videos")
  revalidatePath("/admin/trash")
  revalidatePath("/vip")
}

export async function approveVideo(
  formData: FormData
) {
  const admin =
    await requireAdmin()

  const videoId =
    getRequiredUuid(
      formData,
      "videoId"
    )

  const now =
    new Date().toISOString()

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("vip_videos")
      .update({
        status:
          "approved",

        reviewed_by:
          admin.userId,

        reviewed_at:
          now,

        rejection_reason:
          null,

        published_at:
          now,

        deleted_at:
          null,

        deleted_by:
          null,
      })
      .eq(
        "id",
        videoId
      )
      .in(
        "status",
        [
          "pending",
          "rejected",
        ]
      )
      .select("id")
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo aprobar el video:",
      error
    )

    throw new Error(
      "No se pudo aprobar el video."
    )
  }

  if (!data) {
    throw new Error(
      "El video ya no está disponible para aprobarse."
    )
  }

  revalidateVideoPages()
}

export async function rejectVideo(
  formData: FormData
) {
  const admin =
    await requireAdmin()

  const videoId =
    getRequiredUuid(
      formData,
      "videoId"
    )

  const rejectionReason =
    getRejectionReason(
      formData
    )

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("vip_videos")
      .update({
        status:
          "rejected",

        reviewed_by:
          admin.userId,

        reviewed_at:
          new Date()
            .toISOString(),

        rejection_reason:
          rejectionReason,

        published_at:
          null,

        deleted_at:
          null,

        deleted_by:
          null,
      })
      .eq(
        "id",
        videoId
      )
      .eq(
        "status",
        "pending"
      )
      .select("id")
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo desaprobar el video:",
      error
    )

    throw new Error(
      "No se pudo desaprobar el video."
    )
  }

  if (!data) {
    throw new Error(
      "El video ya no está pendiente de revisión."
    )
  }

  revalidateVideoPages()
}

export async function moveVideoToTrash(
  formData: FormData
) {
  const admin =
    await requireAdmin()

  const videoId =
    getRequiredUuid(
      formData,
      "videoId"
    )

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("vip_videos")
      .update({
        status:
          "deleted",

        deleted_at:
          new Date()
            .toISOString(),

        deleted_by:
          admin.userId,
      })
      .eq(
        "id",
        videoId
      )
      .eq(
        "status",
        "approved"
      )
      .select("id")
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo mover el video a la Papelera:",
      error
    )

    throw new Error(
      "No se pudo mover el video a la Papelera."
    )
  }

  if (!data) {
    throw new Error(
      "Solo los videos aprobados pueden enviarse a la Papelera."
    )
  }

  revalidateVideoPages()
}

export async function restoreVideo(
  formData: FormData
) {
  await requireAdmin()

  const videoId =
    getRequiredUuid(
      formData,
      "videoId"
    )

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("vip_videos")
      .update({
        status:
          "approved",

        deleted_at:
          null,

        deleted_by:
          null,
      })
      .eq(
        "id",
        videoId
      )
      .eq(
        "status",
        "deleted"
      )
      .not(
        "deleted_at",
        "is",
        null
      )
      .select("id")
      .maybeSingle()

  if (error) {
    console.error(
      "No se pudo restaurar el video:",
      error
    )

    throw new Error(
      "No se pudo restaurar el video."
    )
  }

  if (!data) {
    throw new Error(
      "El video ya no se encuentra en la Papelera."
    )
  }

  revalidateVideoPages()
}

export async function deleteVideoForever(
  formData: FormData
) {
  await requireAdmin()

  const videoId =
    getRequiredUuid(
      formData,
      "videoId"
    )

  const {
    data,
    error: videoError,
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
        videoId
      )
      .eq(
        "status",
        "deleted"
      )
      .not(
        "deleted_at",
        "is",
        null
      )
      .maybeSingle()

  if (videoError) {
    console.error(
      "No se pudo consultar el video eliminado:",
      videoError
    )

    throw new Error(
      "No se pudo consultar el video eliminado."
    )
  }

  if (!data) {
    throw new Error(
      "El video ya no se encuentra en la Papelera."
    )
  }

  const video =
    data as DeletedVideoRow

  /*
   * Primero elimina los archivos privados.
   * Si una operación falla, el registro
   * permanece en la Papelera para poder
   * intentar nuevamente.
   */
  if (video.video_path) {
    const {
      error:
        videoStorageError,
    } =
      await supabaseAdmin
        .storage
        .from("vip-videos")
        .remove([
          video.video_path,
        ])

    if (videoStorageError) {
      console.error(
        "No se pudo eliminar el archivo del video:",
        videoStorageError
      )

      throw new Error(
        "No se pudo eliminar permanentemente el archivo del video."
      )
    }
  }

  if (
    video.thumbnail_path
  ) {
    const {
      error:
        thumbnailStorageError,
    } =
      await supabaseAdmin
        .storage
        .from(
          "vip-thumbnails"
        )
        .remove([
          video.thumbnail_path,
        ])

    if (
      thumbnailStorageError
    ) {
      console.error(
        "No se pudo eliminar la miniatura:",
        thumbnailStorageError
      )

      throw new Error(
        "No se pudo eliminar permanentemente la miniatura."
      )
    }
  }

  const {
    error: progressError,
  } =
    await supabaseAdmin
      .from(
        "vip_video_progress"
      )
      .delete()
      .eq(
        "video_id",
        videoId
      )

  if (progressError) {
    console.error(
      "No se pudo eliminar el progreso del video:",
      progressError
    )

    throw new Error(
      "No se pudo eliminar la información asociada al video."
    )
  }

  const {
    data: deletedVideo,
    error: deleteError,
  } =
    await supabaseAdmin
      .from("vip_videos")
      .delete()
      .eq(
        "id",
        videoId
      )
      .eq(
        "status",
        "deleted"
      )
      .not(
        "deleted_at",
        "is",
        null
      )
      .select("id")
      .maybeSingle()

  if (deleteError) {
    console.error(
      "No se pudo eliminar permanentemente el video:",
      deleteError
    )

    throw new Error(
      "No se pudo eliminar permanentemente el video."
    )
  }

  if (!deletedVideo) {
    throw new Error(
      "El video ya no se encuentra en la Papelera."
    )
  }

  revalidateVideoPages()
}