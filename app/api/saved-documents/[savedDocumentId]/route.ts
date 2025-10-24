import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE - Remove a saved document
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ savedDocumentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { savedDocumentId } = await params;

    const savedDocument = await db.savedDocument.findUnique({
      where: {
        id: savedDocumentId,
      },
    });

    if (!savedDocument) {
      return new NextResponse("Not found", { status: 404 });
    }

    if (savedDocument.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await db.savedDocument.delete({
      where: {
        id: savedDocumentId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[SAVED_DOCUMENT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

