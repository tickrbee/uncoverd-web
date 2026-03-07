import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const htmlPath = join(process.cwd(), "public", "auth", "email-confirmed.html");
    const htmlContent = await readFile(htmlPath, "utf-8");
    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    return new NextResponse("Page not found", { status: 404 });
  }
}

