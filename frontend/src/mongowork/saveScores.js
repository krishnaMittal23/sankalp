import clientPromise from "@/lib/mongodb.js";

export async function saveScores({ topic, tags, score, total, uniquePresence, user }) {
  try {
    const client = await clientPromise;
    const db = client.db("AI_Interview");
    const collection = db.collection("Scores");
    console.log(tags);
    
    const data = {
      userId: user.id,
      name: user.name,
      email: user.email,
      uniquePresence,
      topic,
      tags,
      score,
      total,
      percentage: ((score / total) * 100).toFixed(2),
      createdAt: new Date(),
    };

    const result = await collection.insertOne(data);
    return { success: true, insertedId: result.insertedId };
  } catch (error) {
    console.error("MongoDB saveScores error:", error);
    return { success: false, error: error.message };
  }
}
