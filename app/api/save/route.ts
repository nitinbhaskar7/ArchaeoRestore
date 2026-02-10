import { createClient } from "@/lib/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    console.log("Received OCR Save Request");
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const coords_xy = JSON.parse(formData.get('coords_xy') as string);
    const before_char = formData.get('before_char') as string;
    const predicted_char = formData.get('predicted_char') as string;
    const after_char = formData.get('after_char') as string;

    // Save image in storage and OCR text in DB logic here
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    try {
        // Upload Image
        const { data, error } = await supabase.storage
            .from('Images')
            .upload(`original/image${Date.now()}.png`, image)
        if (error) {
            throw error;
        }
        // Save image and OCR text in DB
        const imageInsert = await supabase.from("image").insert({
            userid: user.id,
            id: data.id,
            originalurl: data.path,
        })
        if (imageInsert.error) {
            throw imageInsert.error;
        }
        const ocrInsert = await supabase.from("ocr_result").insert({
            userid: user.id,
            imageid: data.id,
            before_char: before_char,
            predicted_char: predicted_char,
            after_char: after_char,
            x1 : coords_xy ? coords_xy.x1 : null,
            y1 : coords_xy ? coords_xy.y1 : null,
            x2 : coords_xy ? coords_xy.x2 : null,
            y2 : coords_xy ? coords_xy.y2 : null,
        })
        if (ocrInsert.error) {
            throw ocrInsert.error;
        }

        return NextResponse.json({ message: "OCR Data Saved Successfully", }, {
            status: 200
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Error saving OCR Data", error: (error as Error).message }, { status: 500 });

    }
}