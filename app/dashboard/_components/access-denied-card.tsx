"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/contexts/language-context";

interface AccessDeniedCardProps {
  titleKey?: string;
  descriptionKey?: string;
  backHref: string;
  backLabelKey?: string;
}

export const AccessDeniedCard = ({
  titleKey = "teacher.noCourseAccessTitle",
  descriptionKey = "teacher.noCourseAccessDescription",
  backHref,
  backLabelKey = "teacher.backToCourses",
}: AccessDeniedCardProps) => {
  const { t, isRTL } = useLanguage();

  return (
    <div className="p-6">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className={isRTL ? "text-right" : "text-left"}>
            {t(titleKey)}
          </CardTitle>
        </CardHeader>
        <CardContent className={isRTL ? "text-right" : "text-left"}>
          <p className="text-muted-foreground mb-6">{t(descriptionKey)}</p>
          <Link href={backHref}>
            <Button variant="outline">{t(backLabelKey)}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};


