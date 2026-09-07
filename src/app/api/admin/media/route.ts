import {NextRequest,NextResponse} from "next/server";import {MediaType} from "@prisma/client";import {apiError} from "@/lib/api";import {db} from "@/lib/db";import {MEDIA_BUCKET} from "@/lib/storage";import {supabaseServer} from "@/lib/supabase/server";
const allowed=new Set(["image/jpeg","image/png","image/webp","video/mp4","video/webm"]);
export async function POST(req:NextRequest){try{const data=await req.formData(),file=data.get("file"),productId=data.get("productId");if(!(file instanceof File))return NextResponse.json({error:"Choose an image or video before uploading."},{status:400});if(typeof productId!=="string"||!productId)return NextResponse.json({error:"Save the product before uploading its media."},{status:400});if(!allowed.has(file.type))return NextResponse.json({error:"This file format is not supported. Use JPG, PNG, WebP, MP4, or WebM."},{status:415});
const filename=`${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;const objectPath=`${productId}/${filename}`;const supabase=await supabaseServer();
/* Object storage rather than the filesystem: serverless disks are read-only and wiped between
   invocations, and Instagram needs a durable public HTTPS URL it can fetch the media from. */
const {error}=await supabase.storage.from(MEDIA_BUCKET).upload(objectPath,file,{contentType:file.type,upsert:false});
if(error){console.error("[upload-product-media] storage rejected the file",{objectPath,error:error.message});return NextResponse.json({error:"We couldn’t store this file. Try again in a moment."},{status:502})}
const {data:{publicUrl}}=supabase.storage.from(MEDIA_BUCKET).getPublicUrl(objectPath);
const media=await db.productMedia.create({data:{productId,type:file.type.startsWith("video/")?MediaType.VIDEO:MediaType.IMAGE,url:publicUrl,filename,isPrimary:data.get("isPrimary")==="true"}});
return NextResponse.json(media,{status:201})}catch(e){return apiError(e,{context:"upload-product-media",defaultMessage:"We couldn’t upload this file. Check the format and try again."})}}
