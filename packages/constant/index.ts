import { z } from "zod";

/**
 * 项目名称
 */
export const PRODUCT_NAME = "Rao Pics";

/**
 * pending type 枚举 Zod
 */
export const PendingTypeEnumZod = z.enum(["create", "update", "delete"]);

/**
 * pending type 枚举
 */
export type PendingTypeEnum = z.infer<typeof PendingTypeEnumZod>;

/**
 * Log type 枚举 Zod
 */

export const LogTypeEnumZod = z.enum([
  "json-error",
  "unsupported-ext",
  "unknown",
]);

/**
 * Log type 枚举
 */
export type LogTypeEnum = z.infer<typeof LogTypeEnumZod>;

/**
 * 支持的视频格式
 */
export const VIDEO_EXT = [
  "mp4",
  "avi",
  "mov",
  "wmv",
  "flv",
  "webm",
  "mkv",
] as const;

/**
 * 支持的音频格式
 */
export const AUDIO_EXT = ["mp3", "wav", "ogg", "m4a", "aac", "ogg"] as const;

/**
 * 支持的图片格式
 */
export const IMG_EXT = [
  "jpg",
  "png",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
  "svg",
] as const;

export const EXT = [...VIDEO_EXT, ...IMG_EXT, ...AUDIO_EXT] as const;
