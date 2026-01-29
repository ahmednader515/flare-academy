"use client";

import { CourseNavbar } from "./_components/course-navbar";
import { CourseSidebar } from "./_components/course-sidebar";
import { CourseChat } from "./_components/course-chat";
import { useParams } from "next/navigation";

const CourseLayout = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const params = useParams();
    const courseId = params?.courseId as string;

    return (
        <div className="min-h-screen flex flex-col course-layout">
            <div className="h-[112px] fixed inset-x-0 top-0 w-full z-50">
                <CourseNavbar />
            </div>
            <div className="hidden md:flex h-[calc(100vh-112px)] w-64 md:w-80 flex-col fixed inset-y-0 top-[112px] right-0 z-40 border-l">
                <CourseSidebar />
            </div>
            <main className="pt-[112px] flex-1 md:pr-64 md:lg:pr-80">
                {children}
            </main>
            {courseId && <CourseChat courseId={courseId} />}
        </div>
    );
}

export default CourseLayout; 