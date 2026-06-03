import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const { uid, imageBase64 } = await req.json();

    if (!uid || !imageBase64) {
      return NextResponse.json(
        { error: "Missing uid or imageBase64" },
        { status: 400 }
      );
    }

    const admin = getFirebaseAdmin();
    const bucket = admin.storage().bucket();
    const db = admin.firestore();

    // Extract base64 data
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const filePath = `face-references/${uid}.jpg`;
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: "image/jpeg",
      },
    });

    // Make the file signed url or keep it restricted. 
    // The requirement is: "Restricted to authenticated users only."
    // If it's restricted, client needs a way to fetch it. They can either get a signed URL 
    // or we can just save the path and let the client use firebase/storage SDK to download it.
    // The client SDK can download it if they are authenticated and storage rules allow it.
    // Let's save the storage path in Firestore so the client can resolve it via getDownloadURL()
    
    await db.collection("users").doc(uid).update({
      faceImageStoragePath: filePath,
    });

    return NextResponse.json({ success: true, filePath });
  } catch (error: any) {
    console.error("Error uploading reference:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
