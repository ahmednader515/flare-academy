import "dotenv/config";
import { db } from "../lib/db";
import * as fs from "fs";
import * as path from "path";

async function backupDatabaseUrls() {
  try {
    console.log("📦 Backing up database URLs...");

    const backup: any = {
      timestamp: new Date().toISOString(),
      users: [],
      courses: [],
      chapters: [],
      attachments: [],
      chapterAttachments: [],
    };

    // Backup User.image
    const users = await db.user.findMany({
      where: {
        image: {
          not: null,
        },
      },
      select: {
        id: true,
        image: true,
      },
    });
    backup.users = users;

    // Backup Course.imageUrl
    const courses = await db.course.findMany({
      where: {
        imageUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });
    backup.courses = courses;

    // Backup Chapter.videoUrl
    const chapters = await db.chapter.findMany({
      where: {
        videoUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        videoUrl: true,
      },
    });
    backup.chapters = chapters;

    // Backup Attachment.url
    const attachments = await db.attachment.findMany({
      where: {
        url: {
          not: null,
        },
      },
      select: {
        id: true,
        url: true,
      },
    });
    backup.attachments = attachments;

    // Backup ChapterAttachment.url
    const chapterAttachments = await db.chapterAttachment.findMany({
      where: {
        url: {
          not: null,
        },
      },
      select: {
        id: true,
        url: true,
      },
    });
    backup.chapterAttachments = chapterAttachments;

    // Save backup
    const backupPath = path.join(
      process.cwd(),
      `db-urls-backup-${Date.now()}.json`
    );
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    console.log(`✅ Backup saved to: ${backupPath}`);
    console.log(`📊 Backed up:`);
    console.log(`   - ${users.length} user images`);
    console.log(`   - ${courses.length} course images`);
    console.log(`   - ${chapters.length} chapter videos`);
    console.log(`   - ${attachments.length} attachments`);
    console.log(`   - ${chapterAttachments.length} chapter attachments`);
  } catch (error: any) {
    console.error("❌ Error backing up URLs:", error.message);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

backupDatabaseUrls();

