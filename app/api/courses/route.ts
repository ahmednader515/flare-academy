import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        const { title, isFree } = await req.json();

        if(!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.create({
            data: {
                userId,
                title,
                isFree: isFree || false,
            }
        });

        return NextResponse.json(course);

    } catch (error) {
        console.log("[Courses]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeProgress = searchParams.get('includeProgress') === 'true';
    
    // Try to get user, but don't fail if not authenticated
    let userId = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (error) {
      // User is not authenticated, which is fine for the home page
      console.log("User not authenticated, showing courses without progress");
    }

    const courses = await db.course.findMany({
      where: {
        isPublished: true,
      },
      include: {
        user: true,
        chapters: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          }
        },
        quizzes: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          }
        },
        purchases: includeProgress && userId ? {
          where: {
            userId: userId,
            status: "ACTIVE"
          }
        } : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
      cacheStrategy: { ttl: userId ? 60 : 300 }, // Cache for 1 min if user-specific, 5 min if public
    });

    if (includeProgress && userId) {
      // Batch fetch all progress data in ONE query instead of N queries
      const purchasedCourses = courses.filter(course => course.purchases && course.purchases.length > 0);
      const allChapterIds = purchasedCourses.flatMap(course => course.chapters.map(chapter => chapter.id));
      const allQuizIds = purchasedCourses.flatMap(course => course.quizzes.map(quiz => quiz.id));

      // Fetch all userProgress and quizResults in parallel (2 queries total instead of 2N)
      const [allUserProgress, allQuizResults] = await Promise.all([
        allChapterIds.length > 0 ? db.userProgress.findMany({
          where: {
            userId,
            chapterId: {
              in: allChapterIds
            },
            isCompleted: true
          },
          select: {
            chapterId: true
          },
          cacheStrategy: { ttl: 60 }, // Cache for 1 minute
        }) : Promise.resolve([]),
        allQuizIds.length > 0 ? db.quizResult.findMany({
          where: {
            studentId: userId,
            quizId: {
              in: allQuizIds
            }
          },
          select: {
            quizId: true
          },
          cacheStrategy: { ttl: 60 }, // Cache for 1 minute
        }) : Promise.resolve([])
      ]);

      // Create lookup maps for O(1) access
      const completedChapterIds = new Set(allUserProgress.map(up => up.chapterId));
      const completedQuizIds = new Set(allQuizResults.map(qr => qr.quizId));

      // Process courses in memory (no more queries!)
      const coursesWithProgress = courses.map((course) => {
        const totalChapters = course.chapters.length;
        const totalQuizzes = course.quizzes.length;
        const totalContent = totalChapters + totalQuizzes;

        let completedChapters = 0;
        let completedQuizzes = 0;

        if (course.purchases && course.purchases.length > 0) {
          // Count completed chapters for this course using the lookup set
          completedChapters = course.chapters.filter(ch => completedChapterIds.has(ch.id)).length;
          // Count completed quizzes for this course using the lookup set
          completedQuizzes = course.quizzes.filter(q => completedQuizIds.has(q.id)).length;
        }

        const completedContent = completedChapters + completedQuizzes;
        const progress = totalContent > 0 ? (completedContent / totalContent) * 100 : 0;

        return {
          ...course,
          progress
        };
      });

      return NextResponse.json(coursesWithProgress);
    }

    // For unauthenticated users, return courses without progress
    const coursesWithoutProgress = courses.map(course => ({
      ...course,
      progress: 0
    }));

    return NextResponse.json(coursesWithoutProgress);
  } catch (error) {
    console.log("[COURSES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}