import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { SearchInput } from "./_components/search-input";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Course, Purchase } from "@prisma/client";
import { SearchPageContent } from "./_components/search-page-content";

type CourseWithDetails = Course & {
    chapters: { id: string }[];
    purchases: Purchase[];
    progress: number;
}

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return redirect("/");
    }

    const resolvedParams = await searchParams;
    const title = typeof resolvedParams.title === 'string' ? resolvedParams.title : '';

    // Get user information to filter courses based on their college, faculty and level
    const user = await db.user.findUnique({
        where: {
            id: session.user.id,
        },
        select: {
            college: true,
            faculty: true,
            level: true,
        }
    });

    // Build the where clause for course filtering
    const whereClause: any = {
        isPublished: true,
    };

    // Add title search if provided
    if (title) {
        whereClause.title = {
            contains: title,
        };
    }

    // Add college, faculty and level filtering if user has this information
    if (user?.college || user?.faculty || user?.level) {
        whereClause.OR = [];
        
        // Add courses with no targeting (available to all)
        whereClause.OR.push({
            AND: [
                { targetCollege: null },
                { targetFaculty: null },
                { targetLevel: null }
            ]
        });
        
        // Add courses with "جميع الجامعات", "جميع الكليات" or "جميع المستويات"
        whereClause.OR.push({
            targetCollege: "جميع الجامعات"
        });
        whereClause.OR.push({
            targetFaculty: "جميع الكليات"
        });
        whereClause.OR.push({
            targetLevel: "جميع المستويات"
        });
        
        // Add courses that match user's college, faculty and level
        if (user.college && user.faculty && user.level) {
            whereClause.OR.push({
                AND: [
                    { targetCollege: user.college },
                    { targetFaculty: user.faculty },
                    { targetLevel: user.level }
                ]
            });
        }
        
        // Add courses that match user's college and faculty only
        if (user.college && user.faculty) {
            whereClause.OR.push({
                AND: [
                    { targetCollege: user.college },
                    { targetFaculty: user.faculty },
                    { targetLevel: null }
                ]
            });
        }
        
        // Add courses that match user's college and level only
        if (user.college && user.level) {
            whereClause.OR.push({
                AND: [
                    { targetCollege: user.college },
                    { targetFaculty: null },
                    { targetLevel: user.level }
                ]
            });
        }
        
        // Add courses that match user's faculty and level only
        if (user.faculty && user.level) {
            whereClause.OR.push({
                AND: [
                    { targetCollege: null },
                    { targetFaculty: user.faculty },
                    { targetLevel: user.level }
                ]
            });
        }
        
        // Add courses that match user's college only
        if (user.college) {
            whereClause.OR.push({
                AND: [
                    { targetCollege: user.college },
                    { targetFaculty: null },
                    { targetLevel: null }
                ]
            });
        }
        
        // Add courses that match user's faculty only
        if (user.faculty) {
            whereClause.OR.push({
                AND: [
                    { targetCollege: null },
                    { targetFaculty: user.faculty },
                    { targetLevel: null }
                ]
            });
        }
        
        // Add courses that match user's level only
        if (user.level) {
            whereClause.OR.push({
                AND: [
                    { targetCollege: null },
                    { targetFaculty: null },
                    { targetLevel: user.level }
                ]
            });
        }
    }

    const courses = await db.course.findMany({
        where: whereClause,
        include: {
            chapters: {
                where: {
                    isPublished: true,
                },
                select: {
                    id: true,
                }
            },
            purchases: {
                where: {
                    userId: session.user.id,
                }
            }
        },
        orderBy: {
            createdAt: "desc",
        }
    });

    const coursesWithProgress = await Promise.all(
        courses.map(async (course) => {
            const totalChapters = course.chapters.length;
            const completedChapters = await db.userProgress.count({
                where: {
                    userId: session.user.id,
                    chapterId: {
                        in: course.chapters.map(chapter => chapter.id)
                    },
                    isCompleted: true
                }
            });

            const progress = totalChapters > 0 
                ? (completedChapters / totalChapters) * 100 
                : 0;

            return {
                ...course,
                progress
            } as CourseWithDetails;
        })
    );

    return (
        <SearchPageContent 
            coursesWithProgress={coursesWithProgress}
            title={title}
        />
    );
}