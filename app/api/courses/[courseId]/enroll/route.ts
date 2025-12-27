import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const resolvedParams = await params;
  const { courseId } = resolvedParams;
  
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to enroll in courses" },
        { status: 401 }
      );
    }

    // Check if course exists and is free
    const course = await db.course.findUnique({
      where: {
        id: courseId,
        isPublished: true,
        isFree: true
      }
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found", message: "Course not found or is not available for free enrollment" },
        { status: 404 }
      );
    }

    // Check if user is already enrolled
    const existingPurchase = await db.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      }
    });

    if (existingPurchase) {
      // If purchase exists and is already ACTIVE, return appropriate message
      if (existingPurchase.status === "ACTIVE") {
        return NextResponse.json(
          { error: "Already enrolled", message: "You are already enrolled in this course" },
          { status: 400 }
        );
      } else {
        // If purchase exists but is not ACTIVE, reactivate it
        const reactivatedPurchase = await db.purchase.update({
          where: {
            userId_courseId: {
              userId,
              courseId
            }
          },
          data: {
            status: "ACTIVE"
          }
        });

        return NextResponse.json({ 
          message: "Successfully re-enrolled in free course",
          enrollment: reactivatedPurchase 
        });
      }
    }

    // Create enrollment (purchase record for free course)
    const enrollment = await db.purchase.create({
      data: {
        userId,
        courseId,
        status: "ACTIVE"
      }
    });

    return NextResponse.json({ 
      message: "Successfully enrolled in free course",
      enrollment 
    });

  } catch (error: any) {
    console.error("[COURSE_ENROLLMENT]", error);
    
    // Handle unique constraint violation (in case of race condition)
    if (error.code === 'P2002') {
      // Purchase already exists, try to fetch and reactivate
      try {
        const authResult = await auth();
        const userId = authResult.userId;
        
        if (userId) {
          const existingPurchase = await db.purchase.findUnique({
            where: {
              userId_courseId: {
                userId,
                courseId
              }
            }
          });

          if (existingPurchase) {
            if (existingPurchase.status === "ACTIVE") {
              return NextResponse.json(
                { error: "Already enrolled", message: "You are already enrolled in this course" },
                { status: 400 }
              );
            } else {
              const reactivatedPurchase = await db.purchase.update({
                where: {
                  userId_courseId: {
                    userId,
                    courseId
                  }
                },
                data: {
                  status: "ACTIVE"
                }
              });

              return NextResponse.json({ 
                message: "Successfully re-enrolled in free course",
                enrollment: reactivatedPurchase 
              });
            }
          }
        }
      } catch (retryError) {
        console.error("[COURSE_ENROLLMENT_RETRY]", retryError);
      }
    }

    return NextResponse.json(
      { error: "Internal server error", message: "An error occurred while enrolling in the course. Please try again." },
      { status: 500 }
    );
  }
}
