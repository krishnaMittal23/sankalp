import clientPromise from "@/lib/mongodb.js";

export async function saveProfile({
  user,
  uniquePresence,
  name,
  email,
  phone,
  location,
  title,
  bio,
  linkedin,
  github,
  website,
  joinDate,
}) {
  try {
    const client = await clientPromise;
    const db = client.db("AI_Interview");
    const collection = db.collection("Profiles");

    const existing = await collection.findOne({ uniquePresence });

    console.log("Checking for existing profile:", existing);

    const profileData = {
      userId: user.id,
      uniquePresence,
      name,
      email,
      phone,
      location,
      title,
      bio,
      linkedin,
      github,
      website,
      joinDate,
      updatedAt: new Date(),
    };

    let result;
    if (existing) {
  
      console.log("Updating existing profile with uniquePresence:", uniquePresence);
      
     
      const updateResult = await collection.updateOne(
        { uniquePresence }, 
        { $set: profileData }, 
        { upsert: true } 
      );
      
      console.log("Update result:", updateResult);
      result = { updated: true, matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount };

    } else {
 
      console.log("Inserting new profileData:", profileData);
      
      profileData.createdAt = new Date(); 
      const insertResult = await collection.insertOne(profileData);
      
      console.log("Insert result:", insertResult);
      result = { insertedId: insertResult.insertedId };
    }

    return { success: true, ...result };
  } catch (error) {
    console.error("MongoDB saveProfile error:", error);
    return { success: false, error: error.message };
  }
}