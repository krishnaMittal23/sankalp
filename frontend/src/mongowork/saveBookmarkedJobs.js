
import clientPromise from "@/lib/mongodb.js";

export async function saveBookmarkedJob({ jobId, title, company, link, uniquePresence, user }) {
  try {
    const client = await clientPromise;
    const db = client.db("AI_Interview");
    const collection = db.collection("BookmarkedJobs");

    const data = {
      userId: user.id,
      name: user.name,
      email: user.email,
      uniquePresence,
      jobId,
      title,
      company,
      link,
      createdAt: new Date(),
    };

  
    const existing = await collection.findOne({ userId: user.id, jobId });
    if (existing) {
      return { success: false, message: "Job already bookmarked" };
    }

    const result = await collection.insertOne(data);
    return { success: true, insertedId: result.insertedId };
  } catch (error) {
    console.error("MongoDB saveBookmarkedJob error:", error);
    return { success: false, error: error.message };
  }
}
