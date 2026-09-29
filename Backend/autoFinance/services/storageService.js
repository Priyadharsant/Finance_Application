import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local fallback storage directory: Backend/uploads/loans/:loanId
const LOCAL_UPLOADS_ROOT = path.join(__dirname, "../../../uploads/loans");

function getSupabaseConfig() {
  const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  // Extract project ref ID if user entered dashboard URL or S3 endpoint
  let url = rawUrl;
  const projectRefMatch = rawUrl.match(/([a-z0-9]{15,30})/i);
  if (rawUrl.includes("supabase.co") && projectRefMatch) {
    url = `https://${projectRefMatch[1]}.supabase.co`;
  }

  const key = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  ).trim();

  const bucket = (process.env.SUPABASE_BUCKET || "Finance App").trim();
  return { url, key, bucket };
}

let supabaseClient = null;
let lastKey = null;
let lastUrl = null;
let bucketVerified = false;

/**
 * Checks if Supabase storage credentials are configured
 */
export function isSupabaseConfigured() {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key);
}

/**
 * Returns an initialized Supabase client or null if unconfigured
 */
function getClient() {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;

  if (!supabaseClient || lastKey !== key || lastUrl !== url) {
    try {
      supabaseClient = createClient(url, key, {
        auth: { persistSession: false },
      });
      lastKey = key;
      lastUrl = url;
      bucketVerified = false;
      console.log(`[Storage] Initialized Supabase client for ${url}`);
    } catch (err) {
      console.warn("[Storage] Failed to initialize Supabase client:", err.message);
      return null;
    }
  }
  return supabaseClient;
}

function getBucketName() {
  return getSupabaseConfig().bucket;
}
const getBucket = () => getBucketName();

/**
 * Ensures the target bucket exists in Supabase, creating it if needed.
 */
async function ensureBucket() {
  const client = getClient();
  if (!client || bucketVerified) return;

  try {
    const { data: buckets, error } = await client.storage.listBuckets();
    if (error) {
      console.warn("[Storage] Note checking Supabase buckets:", error.message);
      return;
    }

    const exists = buckets?.some((b) => b.name === getBucket());
    if (!exists) {
      const { error: createErr } = await client.storage.createBucket(getBucket(), {
        public: true,
        fileSizeLimit: 25 * 1024 * 1024, // 25 MB limit
      });
      if (createErr) {
        console.warn("[Storage] Note creating bucket:", createErr.message);
      } else {
        console.log(`[Storage] Created Supabase bucket '${getBucket()}' with public access.`);
      }
    }
    bucketVerified = true;
  } catch (err) {
    console.warn("[Storage] Could not verify bucket:", err.message);
  }
}

/**
 * Ensures local upload directory exists for fallback or local files
 */
function getLocalDir(loanId) {
  const dir = path.join(LOCAL_UPLOADS_ROOT, String(loanId));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Helper to derive docType from a filename
 */
function parseDocType(filename) {
  const parts = filename.split("_");
  return parts.slice(0, parts.length - 1).join("_").replace(/_\d+$/, "") || "other";
}

/**
 * Upload a document (Supabase Storage with local disk fallback)
 */
export async function uploadDocumentFile({ loanId, file, docType }) {
  const safeType = (docType || "other").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
  const ext = path.extname(file.originalname || "").toLowerCase();
  const filename = `${safeType}_${Date.now()}${ext}`;
  const client = getClient();

  // Try uploading to Supabase if configured
  if (client) {
    try {
      await ensureBucket();
      const storagePath = `${loanId}/${filename}`;
      const fileBuffer = fs.readFileSync(file.path);

      const { data, error } = await client.storage
        .from(getBucket())
        .upload(storagePath, fileBuffer, {
          contentType: file.mimetype || "application/octet-stream",
          upsert: true,
        });

      if (error) {
        console.warn(`[Storage] Supabase upload failed, falling back to local:`, error.message);
      } else {
        // Remove temporary file from multer tmpdir
        try {
          fs.unlinkSync(file.path);
        } catch (_) {}

        // Obtain public URL
        const { data: urlData } = client.storage.from(getBucket()).getPublicUrl(storagePath);

        return {
          success: true,
          storage: "supabase",
          filename,
          originalName: file.originalname,
          docType: safeType,
          size: file.size,
          url: urlData?.publicUrl || null,
          uploadedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn("[Storage] Error during Supabase upload attempt:", err.message);
    }
  }

  // Local fallback: save to Backend/uploads/loans/:loanId
  const localDir = getLocalDir(loanId);
  const destPath = path.join(localDir, filename);

  try {
    fs.renameSync(file.path, destPath);
  } catch (renameErr) {
    // If cross-device move, copy and delete
    fs.copyFileSync(file.path, destPath);
    try {
      fs.unlinkSync(file.path);
    } catch (_) {}
  }

  return {
    success: true,
    storage: "local",
    filename,
    originalName: file.originalname,
    docType: safeType,
    size: file.size,
    url: null,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * List all documents for a loan (combining Supabase files and legacy local files)
 */
export async function listDocumentFiles(loanId) {
  const documentsMap = new Map();
  const client = getClient();

  // 1. Fetch from Supabase if configured
  if (client) {
    try {
      const { data: files, error } = await client.storage
        .from(getBucket())
        .list(String(loanId), {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (!error && Array.isArray(files)) {
        for (const f of files) {
          if (!f.name || f.name === ".emptyFolderPlaceholder") continue;
          const storagePath = `${loanId}/${f.name}`;
          const { data: urlData } = client.storage.from(getBucket()).getPublicUrl(storagePath);

          documentsMap.set(f.name, {
            filename: f.name,
            docType: parseDocType(f.name),
            size: f.metadata?.size || 0,
            uploadedAt: f.created_at || new Date().toISOString(),
            url: urlData?.publicUrl || null,
            storage: "supabase",
          });
        }
      }
    } catch (err) {
      console.warn("[Storage] Could not list Supabase documents:", err.message);
    }
  }

  // 2. Fetch from local filesystem and merge (covers offline/legacy files)
  const localDir = path.join(LOCAL_UPLOADS_ROOT, String(loanId));
  if (fs.existsSync(localDir)) {
    try {
      const localFiles = fs.readdirSync(localDir);
      for (const filename of localFiles) {
        if (!documentsMap.has(filename)) {
          const filePath = path.join(localDir, filename);
          const stat = fs.statSync(filePath);
          documentsMap.set(filename, {
            filename,
            docType: parseDocType(filename),
            size: stat.size,
            uploadedAt: stat.mtime.toISOString(),
            url: null,
            storage: "local",
          });
        }
      }
    } catch (err) {
      console.warn("[Storage] Could not read local documents directory:", err.message);
    }
  }

  return Array.from(documentsMap.values()).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}

/**
 * Get a direct download URL or local file path for serving/streaming
 */
export async function getDocumentLocation(loanId, filename) {
  const safe = path.basename(filename);
  const client = getClient();

  // Check Supabase first if configured
  if (client) {
    try {
      const storagePath = `${loanId}/${safe}`;
      // Generate a signed URL valid for 1 hour
      const { data, error } = await client.storage
        .from(getBucket())
        .createSignedUrl(storagePath, 3600);

      if (!error && data?.signedUrl) {
        return { type: "redirect", url: data.signedUrl };
      }

      // Check public URL
      const { data: pubData } = client.storage.from(getBucket()).getPublicUrl(storagePath);
      if (pubData?.publicUrl) {
        return { type: "redirect", url: pubData.publicUrl };
      }
    } catch (err) {
      console.warn("[Storage] Supabase URL lookup error:", err.message);
    }
  }

  // Check local file
  const localFilePath = path.join(LOCAL_UPLOADS_ROOT, String(loanId), safe);
  if (fs.existsSync(localFilePath)) {
    return { type: "file", path: localFilePath, filename: safe };
  }

  return null;
}

/**
 * Delete a document from Supabase and/or local storage
 */
export async function deleteDocumentFile(loanId, filename) {
  const safe = path.basename(filename);
  let deletedFromSupabase = false;
  let deletedFromLocal = false;

  const client = getClient();
  if (client) {
    try {
      const storagePath = `${loanId}/${safe}`;
      const { error } = await client.storage.from(getBucket()).remove([storagePath]);
      if (!error) deletedFromSupabase = true;
    } catch (err) {
      console.warn("[Storage] Error deleting from Supabase:", err.message);
    }
  }

  const localFilePath = path.join(LOCAL_UPLOADS_ROOT, String(loanId), safe);
  if (fs.existsSync(localFilePath)) {
    try {
      fs.unlinkSync(localFilePath);
      deletedFromLocal = true;
    } catch (_) {}
  }

  return { success: true, deletedFromSupabase, deletedFromLocal };
}
