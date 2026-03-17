import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import sharp from "sharp";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const orgId = formData.get("orgId") as string | null;

  if (!file || !orgId) {
    return NextResponse.json(
      { error: "Missing file or orgId" },
      { status: 400 }
    );
  }

  try {
    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resize and crop to 256x256 square
    const resized = await sharp(buffer)
      .resize(256, 256, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();

    // Upload to Supabase Storage
    const admin = createAdminClient();
    const fileName = `org-${orgId}-${Date.now()}.png`;

    const { error: uploadError } = await admin.storage
      .from("logos")
      .upload(fileName, resized, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = admin.storage
      .from("logos")
      .getPublicUrl(fileName);

    const logoUrl = urlData.publicUrl;

    // Update organization
    await admin
      .from("organizations")
      .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
      .eq("id", orgId);

    revalidatePath(`/organizations/${orgId}`);
    revalidatePath("/organizations");
    revalidatePath("/dashboard");
    return NextResponse.json({ url: logoUrl });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process image" },
      { status: 500 }
    );
  }
}
