import { NextResponse } from "next/server";
import { Client } from "basic-ftp";
import { Readable } from "stream";
import path from "path";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("logo");

    if (!file) {
      return NextResponse.json(
        { error: "No se recibió archivo" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `logo-${Date.now()}-${file.name.replace(/\s+/g, "")}`;

    const client = new Client();
    client.ftp.verbose = true;

    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
      port: Number(process.env.FTP_PORT),
      secure: false 
    });

    const remotePath = path.posix.join(
      process.env.FTP_BASE_PATH,
      fileName
    );

    await client.uploadFrom(
      Readable.from(buffer),
      remotePath
    );

    client.close();

    const publicUrl = `${process.env.NEXT_PUBLIC_HOSTING_URL}/uploads/logos/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl
    });

  } catch (error) {
    console.error("❌ FTP ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Error subiendo archivo" },
      { status: 500 }
    );
  }
}
