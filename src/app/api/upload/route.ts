import { NextRequest, NextResponse } from "next/server";
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from "cloudinary";
// import { writeFile, mkdir } from "fs/promises";
// import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only images allowed" },
        { status: 400 },
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    // const ext = file.name.split(".").pop() ?? "jpg";
    // const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    // const uploadDir = path.join(process.cwd(), "public", "uploads");

    // await mkdir(uploadDir, { recursive: true });
    // await writeFile(path.join(uploadDir, filename), buffer);
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "payments",
            resource_type: "image",
            quality: "auto",
            fetch_format: "auto",
          },
          (
            error: UploadApiErrorResponse | undefined,
            result: UploadApiResponse | undefined,
          ) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error("Unknown Cloudinary error"));
          },
        )
        .end(buffer);
    });
    // const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    // const url = `${baseUrl}/uploads/${filename}`;

    // return NextResponse.json({ url });
    return NextResponse.json({
      url: result.secure_url,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 },
    );
  }
}
