"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Users, BookOpen, Award, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { ScrollProgress } from "@/components/scroll-progress";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/contexts/language-context";
import { RecaptchaGate } from "@/components/recaptcha-gate";

// Define types based on Prisma schema
type Course = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  isPublished: boolean;
  targetFaculty?: string | null;
  targetLevel?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Purchase = {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type CourseWithProgress = Course & {
  chapters: { id: string }[];
  quizzes: { id: string }[];
  purchases: Purchase[];
  progress: number;
};

export default function HomePage() {
  const { t } = useLanguage();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        // Fetch courses from public API endpoint
        const response = await fetch("/api/courses/public");
        
        if (!response.ok) {
          console.error("Failed to fetch courses:", response.status, response.statusText);
          return;
        }
        
        const data = await response.json();
        console.log("Fetched courses:", data); // Debug log
        setCourses(data);

      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollIndicator(entry.isIntersecting);
      },
      {
        threshold: 0.5, // Trigger when 50% of the hero section is visible
      }
    );

    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
      observer.observe(heroSection);
    }

    return () => {
      if (heroSection) {
        observer.unobserve(heroSection);
      }
    };
  }, []);

  const scrollToCourses = () => {
    const coursesSection = document.getElementById('courses-section');
    if (coursesSection) {
      const offset = coursesSection.offsetTop - 112; // Adjust for navbar height
      window.scrollTo({
        top: offset,
        behavior: 'smooth'
      });
    }
  };

  return (
    <RecaptchaGate>
      <div className="h-full w-full bg-background">
        <Navbar />
        <ScrollProgress />
      {/* Hero Section */}
      <section id="hero-section" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28 md:pt-0">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8 items-center">
          {/* Image Section - First on mobile */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative flex justify-center items-center order-1 md:order-2"
          >
            <div className="relative w-64 h-64 md:w-80 md:h-80">
              <Image
                src="/hero-img.jpg"
                alt="Flare Academy"
                fill
                priority
                className="object-cover rounded-full border-4 border-[#FF6B35]/20 shadow-lg"
                sizes="(max-width: 768px) 256px, 320px"
              />
            </div>
            
            {/* Floating Stationery Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: [0, -15, 0],
                rotate: [0, 5, 0]
              }}
              transition={{ 
                duration: 0.5, 
                delay: 0.5,
                y: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                rotate: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              className="absolute top-1 -right-2"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Image
                src="/stethoscope.png"
                alt="ستيتوسكوب"
                width={50}
                height={50}
                className="object-contain"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: [0, -12, 0],
                rotate: [0, -5, 0]
              }}
              transition={{ 
                duration: 0.5, 
                delay: 0.7,
                y: {
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                rotate: {
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              className="absolute bottom-1/3 left-6"
              whileHover={{ scale: 1.1, rotate: -5 }}
            >
              <Image
                src="/syringe.png"
                alt="سرنجة"
                width={50}
                height={50}
                className="object-contain"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: [0, -18, 0],
                rotate: [0, 10, 0]
              }}
              transition={{ 
                duration: 0.5, 
                delay: 0.9,
                y: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                rotate: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              className="absolute top-1/2 -right-6"
              whileHover={{ scale: 1.1, rotate: 10 }}
            >
              <Image
                src="/doctor-bag.png"
                alt="صندوق الطبيب"
                width={55}
                height={55}
                className="object-contain"
              />
            </motion.div>
          </motion.div>

          {/* Text Section - Second on mobile */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mt-0 md:mt-0 order-2 md:order-1"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4 font-pt-serif">
              <span className="text-[#003d6c]">Fla</span>
              <span className="text-[#ff8710]">Re</span>
              <span className="text-cyan-500"> Academy</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              {t('home.subtitle')}
            </p>
            <Button size="lg" asChild className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white">
              <Link href="/sign-up">
                {t('home.getStarted')} <ArrowRight className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        {showScrollIndicator && (
          <motion.div 
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex-col items-center gap-2 cursor-pointer hidden md:flex"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 1, duration: 0.5 }}
            onClick={scrollToCourses}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            >
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            >
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </motion.div>
          </motion.div>
        )}
      </section>

      {/* Courses Section */}
      <section id="courses-section" className="py-20 bg-muted/50">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">{t('home.availableCourses')}</h2>
            <p className="text-muted-foreground">{t('home.discoverCourses')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-6"
          >
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="w-full sm:w-80 md:w-72 lg:w-80 bg-card rounded-xl overflow-hidden border shadow-sm animate-pulse"
                >
                  <div className="w-full aspect-video bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : (
              courses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t('home.noCoursesAvailable')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('home.noCoursesDescription')}
                    </p>
                    <Button 
                      variant="outline" 
                      asChild
                      className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white border-[#FF6B35]"
                    >
                      <Link href="/sign-up">
                        {t('home.signUpForEarlyAccess')}
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                courses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group w-full sm:w-80 md:w-72 lg:w-80 bg-card rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="relative w-full aspect-video">
                      <Image
                        src={course.imageUrl || "/placeholder.png"}
                        alt={course.title}
                        fill
                        className="object-cover rounded-t-xl"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      
                      {/* Target Audience Info */}
                      {(course.targetCollege || course.targetFaculty || course.targetLevel) && (
                        <div className="mb-3 flex flex-wrap gap-1">
                          {course.targetCollege && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {course.targetCollege}
                            </span>
                          )}
                          {course.targetFaculty && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {course.targetFaculty}
                            </span>
                          )}
                          {course.targetLevel && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {course.targetLevel}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <BookOpen className="h-4 w-4" />
                        <span>
                          {course.chapters?.length || 0} {course.chapters?.length === 1 ? t('home.chapter') : t('home.chapters')}
                          {course.quizzes && course.quizzes.length > 0 && (
                            <span className="mr-2">، {course.quizzes.length} {course.quizzes.length === 1 ? t('home.quiz') : t('home.quizzes')}</span>
                          )}
                        </span>
                      </div>
                      <Button 
                        className="w-full bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white" 
                        variant="default"
                        asChild
                      >
                        <Link href={course.chapters && course.chapters.length > 0 ? `/courses/${course.id}/chapters/${course.chapters[0].id}` : `/courses/${course.id}`}>
                          {t('home.viewCourse')}
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                ))
              )
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">{t('home.platformFeatures')}</h2>
            <p className="text-muted-foreground">{t('home.featuresSubtitle')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-6 w-6 text-[#FF6B35]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('home.highQuality')}</h3>
              <p className="text-muted-foreground">{t('home.highQualityDesc')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-[#FF6B35]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('home.activeCommunity')}</h3>
              <p className="text-muted-foreground">{t('home.activeCommunityDesc')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-6 w-6 text-[#FF6B35]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('home.certificates')}</h3>
              <p className="text-muted-foreground">{t('home.certificatesDesc')}</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('home.startLearningJourney')}</h2>
            <p className="text-muted-foreground mb-8">
              {t('home.joinToday')}
            </p>
            <Button size="lg" asChild className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white">
              <Link href="/sign-up">
                {t('home.signUpNow')} <ArrowRight className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
      </div>
    </RecaptchaGate>
  );
} 