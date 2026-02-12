import "dotenv/config";
import { db } from "../lib/db";
import * as fs from "fs";
import * as path from "path";

interface MappingEntry {
  oldUrl: string;
  newUrl: string;
}

async function migrateDatabaseUrls() {
  try {
    // Load mapping file
    const mappingPath = path.join(process.cwd(), "uploadthing-to-r2-mapping.json");
    
    if (!fs.existsSync(mappingPath)) {
      console.error("❌ Mapping file not found:", mappingPath);
      console.log("💡 Run 'npm run upload-to-r2' first to create the mapping file");
      process.exit(1);
    }

    const mappingContent = fs.readFileSync(mappingPath, "utf-8");
    const mapping: Record<string, string> = JSON.parse(mappingContent);

    console.log(`📋 Loaded ${Object.keys(mapping).length} URL mappings`);

    let updatedCount = 0;

    // Update User.image
    console.log("\n🔄 Updating User.image...");
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

    for (const user of users) {
      if (user.image && mapping[user.image]) {
        await db.user.update({
          where: { id: user.id },
          data: { image: mapping[user.image] },
        });
        updatedCount++;
        console.log(`  ✓ Updated user ${user.id}`);
      }
    }

    // Update Course.imageUrl
    console.log("\n🔄 Updating Course.imageUrl...");
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

    for (const course of courses) {
      if (course.imageUrl && mapping[course.imageUrl]) {
        await db.course.update({
          where: { id: course.id },
          data: { imageUrl: mapping[course.imageUrl] },
        });
        updatedCount++;
        console.log(`  ✓ Updated course ${course.id}`);
      }
    }

    // Update Chapter.videoUrl
    console.log("\n🔄 Updating Chapter.videoUrl...");
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

    for (const chapter of chapters) {
      if (chapter.videoUrl && mapping[chapter.videoUrl]) {
        await db.chapter.update({
          where: { id: chapter.id },
          data: { videoUrl: mapping[chapter.videoUrl] },
        });
        updatedCount++;
        console.log(`  ✓ Updated chapter ${chapter.id}`);
      }
    }

    // Update Attachment.url
    console.log("\n🔄 Updating Attachment.url...");
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

    for (const attachment of attachments) {
      if (attachment.url && mapping[attachment.url]) {
        await db.attachment.update({
          where: { id: attachment.id },
          data: { url: mapping[attachment.url] },
        });
        updatedCount++;
        console.log(`  ✓ Updated attachment ${attachment.id}`);
      }
    }

    // Update ChapterAttachment.url
    console.log("\n🔄 Updating ChapterAttachment.url...");
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

    for (const attachment of chapterAttachments) {
      if (attachment.url && mapping[attachment.url]) {
        await db.chapterAttachment.update({
          where: { id: attachment.id },
          data: { url: mapping[attachment.url] },
        });
        updatedCount++;
        console.log(`  ✓ Updated chapter attachment ${attachment.id}`);
      }
    }

    console.log(`\n✅ Migration complete! Updated ${updatedCount} records`);
  } catch (error: any) {
    console.error("❌ Error during migration:", error.message);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

migrateDatabaseUrls();

