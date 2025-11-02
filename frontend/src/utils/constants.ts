/**
 * Application-wide constants.
 */

/**
 * Maximum number of files that can be uploaded in a single batch.
 * This limit helps prevent accidental selection of entire photo libraries
 * and keeps the progress tracking UI manageable.
 */
export const MAX_UPLOAD_BATCH_SIZE = 1000;

/**
 * Number of concurrent file uploads to process at once.
 * Our current approach keeps the HTTPRequest open until _both_ upload and processing
 * are complete, so too many concurrent uploads means connections might time out during
 * many parallel processing tasks.
 *
 * This was the convenient way to provide user feedback without implementing
 * a more complex system involving background processing and status polling.
 */
export const CONCURRENT_UPLOAD_COUNT = 8;

/**
 * Upload timeout in milliseconds (10 minutes).
 * This matches the server's ReadTimeout to allow large files to upload on slow connections.
 */
export const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;
