import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Check if a document is saved
export async function GET(
  req: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { attachmentId } = await params;

    const savedDocument = await db.savedDocument.findUnique({
      where: {
        userId_attachmentId: {
          userId: session.user.id,
          attachmentId: attachmentId,
        },
      },
    });

    return NextResponse.json({ 
      isSaved: !!savedDocument,
      savedDocument: savedDocument || null
    });
  } catch (error) {
    console.error("[SAVED_DOCUMENT_CHECK]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Remove a saved document by attachment ID
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { attachmentId } = await params;

    const savedDocument = await db.savedDocument.findUnique({
      where: {
        userId_attachmentId: {
          userId: session.user.id,
          attachmentId: attachmentId,
        },
      },
    });

    if (!savedDocument) {
      return new NextResponse("Not found", { status: 404 });
    }

    await db.savedDocument.delete({
      where: {
        id: savedDocument.id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[SAVED_DOCUMENT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

