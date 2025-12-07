import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Fetch all saved documents for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const savedDocuments = await db.savedDocument.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(savedDocuments);
  } catch (error) {
    console.error("[SAVED_DOCUMENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Save a document
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { attachmentId, courseId, chapterId, attachmentName, attachmentUrl } = await req.json();

    if (!attachmentId || !courseId || !chapterId || !attachmentName || !attachmentUrl) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Check if document is already saved
    const existingSave = await db.savedDocument.findUnique({
      where: {
        userId_attachmentId: {
          userId: session.user.id,
          attachmentId: attachmentId,
        },
      },
    });

    if (existingSave) {
      return new NextResponse("Document already saved", { status: 400 });
    }

    const savedDocument = await db.savedDocument.create({
      data: {
        userId: session.user.id,
        attachmentId,
        courseId,
        chapterId,
        attachmentName,
        attachmentUrl,
      },
    });

    return NextResponse.json(savedDocument);
  } catch (error) {
    console.error("[SAVED_DOCUMENTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

