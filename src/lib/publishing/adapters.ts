import {readFile} from "node:fs/promises";
import path from "node:path";
import {Platform} from "@prisma/client";
import type {Content,PublishableProduct,PublishingAdapter,PublishResult} from "./types";

type ApiJson={ok?:boolean;description?:string;result?:{message_id:number};id?:string;error?:{message?:string;code?:string};data?:{publish_id?:string;upload_url?:string}};

/** A publishing failure whose message is safe to display in the admin UI. */
export class PublishingError extends Error {
  constructor(message:string){super(message);this.name="PublishingError"}
}

function captionFor(product:PublishableProduct,content:Content){
  const description=content.caption||product.shortDescription||product.description;
  const price=new Intl.NumberFormat("en",{style:"currency",currency:product.currency}).format(Number(product.price));
  const inventory=product.availability==="OUT_OF_STOCK"||product.stock===0?"Out of stock":product.stock===undefined?"In stock":`In stock: ${product.stock}`;
  const hashtags=content.hashtags?.trim();
  const cta=[content.ctaText,content.ctaUrl].filter(Boolean).join(" ");
  return [product.name,description,`Price: ${price}\n${inventory}`,hashtags,cta].filter(Boolean).join("\n\n");
}

function localUploadPath(url:string){
  if(!url.startsWith("/uploads/"))return null;
  const uploads=path.resolve(process.cwd(),"public","uploads");
  const file=path.resolve(process.cwd(),"public",url.slice(1));
  if(!file.startsWith(`${uploads}${path.sep}`)){
    console.error("[publishing:media] Rejected a media path outside the uploads directory",{url,file});
    throw new PublishingError("This media file could not be read. Remove it from the product and upload it again.");
  }
  return file;
}

function mediaMime(url:string){
  const extension=path.extname(url).toLowerCase();
  return extension===".png"?"image/png":extension===".webp"?"image/webp":extension===".mp4"?"video/mp4":extension===".webm"?"video/webm":"image/jpeg";
}

async function apiJson(response:Response,provider:string){
  const json=await response.json().catch(error=>{
    console.error(`[publishing:${provider}] Provider returned an unreadable response`,{status:response.status,error});
    return {};
  }) as ApiJson;
  const apiError=json.error&&(json.error.code===undefined||json.error.code!=="ok");
  if(!response.ok||apiError){
    console.error(`[publishing:${provider}] Provider rejected the publication`,{status:response.status,response:json});
    throw new PublishingError(`${provider} could not publish this product. Check the connection under Integrations and try again.`);
  }
  return json;
}

export class WebsitePublisher implements PublishingAdapter{
  platform=Platform.WEBSITE;
  async publish(product:PublishableProduct,_content:Content):Promise<PublishResult>{return{externalPostId:product.id,externalUrl:`/products/${product.id}`}}
}

export class TelegramPublisher implements PublishingAdapter{
  platform=Platform.TELEGRAM;
  async publish(product:PublishableProduct,content:Content){
    const token=process.env.TELEGRAM_BOT_TOKEN,channel=process.env.TELEGRAM_CHANNEL_ID;
    if(!token||!channel)throw new PublishingError("Telegram is not configured. Connect it under Integrations before publishing.");
    const image=product.media.find(media=>media.type==="IMAGE");
    const caption=captionFor(product,content);
    let response:Response;
    if(image){
      const form=new FormData();form.set("chat_id",channel);form.set("caption",caption.slice(0,1024));
      const localPath=localUploadPath(image.url);
      if(localPath){const bytes=await readFile(localPath);form.set("photo",new Blob([bytes],{type:mediaMime(image.url)}),path.basename(localPath))}
      else form.set("photo",image.url);
      response=await fetch(`https://api.telegram.org/bot${token}/sendPhoto`,{method:"POST",body:form});
    }else response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:channel,text:caption.slice(0,4096)})});
    const json=await apiJson(response,"Telegram");
    if(!json.ok||!json.result)throw new PublishingError("Telegram accepted the request but did not create the post. Check the connection and try again.");
    return{externalPostId:String(json.result.message_id),externalUrl:`https://t.me/${channel.replace(/^@/,"")}/${json.result.message_id}`};
  }
}

export class InstagramPublisher implements PublishingAdapter{
  platform=Platform.INSTAGRAM;
  async publish(product:PublishableProduct,content:Content):Promise<PublishResult>{
    const token=process.env.INSTAGRAM_ACCESS_TOKEN,account=process.env.INSTAGRAM_ACCOUNT_ID;
    if(!token||!account)throw new PublishingError("Instagram is not configured. Connect it under Integrations before publishing.");
    const media=product.media.find(item=>item.type==="IMAGE")??product.media.find(item=>item.type==="VIDEO");
    if(!media)throw new PublishingError("Instagram needs an image or video. Add media to this product before publishing.");
    const appUrl=process.env.NEXT_PUBLIC_APP_URL;
    const mediaUrl=media.url.startsWith("http://")||media.url.startsWith("https://")?media.url:appUrl?new URL(media.url,appUrl).toString():"";
    if(!mediaUrl.startsWith("https://"))throw new PublishingError("Instagram needs a public HTTPS website address to access product media. Add one in Settings before publishing.");
    const version=process.env.META_GRAPH_API_VERSION||"v23.0";const base=`https://graph.facebook.com/${version}`;
    const createBody:Record<string,string>={access_token:token,caption:captionFor(product,content)};
    if(media.type==="VIDEO"){createBody.media_type="REELS";createBody.video_url=mediaUrl}else createBody.image_url=mediaUrl;
    const container=await apiJson(await fetch(`${base}/${account}/media`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(createBody)}),"Instagram");
    if(!container.id)throw new PublishingError("Instagram accepted the media but could not prepare the post. Try again.");
    if(media.type==="VIDEO")await waitForInstagramContainer(base,container.id,token);
    const published=await apiJson(await fetch(`${base}/${account}/media_publish`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({creation_id:container.id,access_token:token})}),"Instagram");
    if(!published.id)throw new PublishingError("Instagram accepted the post but could not confirm that it was published. Check Instagram before retrying.");
    return{externalPostId:published.id};
  }
}

async function waitForInstagramContainer(base:string,id:string,token:string){
  for(let attempt=0;attempt<20;attempt++){
    const response=await fetch(`${base}/${id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`);
    const json=await response.json() as {status_code?:string;status?:string;error?:{message?:string}};
    if(!response.ok||json.error){console.error("[publishing:Instagram] Media status check failed",{status:response.status,response:json});throw new PublishingError("Instagram could not finish processing this media. Check the file and try again.")}
    if(json.status_code==="FINISHED")return;
    if(json.status_code==="ERROR"||json.status_code==="EXPIRED"){console.error("[publishing:Instagram] Media processing ended unsuccessfully",json);throw new PublishingError("Instagram could not process this media. Check the image or video and try again.")}
    await new Promise(resolve=>setTimeout(resolve,3000));
  }
  throw new PublishingError("Instagram is taking too long to process this media. Wait a few minutes, then try again.");
}

export class TikTokPublisher implements PublishingAdapter{
  platform=Platform.TIKTOK;
  async publish(product:PublishableProduct,_content:Content):Promise<PublishResult>{
    const video=product.media.find(media=>media.type==="VIDEO");
    if(!video)throw new PublishingError("TikTok publishing requires a compatible video. Add an MP4 or WebM video to this product first.");
    const token=process.env.TIKTOK_ACCESS_TOKEN;if(!token)throw new PublishingError("TikTok is not configured. Connect it under Integrations before publishing.");
    const localPath=localUploadPath(video.url);if(!localPath)throw new PublishingError("TikTok needs a video uploaded directly to this product. Remove the current video link and upload the file again.");
    const bytes=await readFile(localPath);const size=bytes.byteLength;
    const initialized=await apiJson(await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({source_info:{source:"FILE_UPLOAD",video_size:size,chunk_size:size,total_chunk_count:1}})}),"TikTok");
    const publishId=initialized.data?.publish_id,uploadUrl=initialized.data?.upload_url;
    if(!publishId||!uploadUrl)throw new PublishingError("TikTok could not prepare the video upload. Check the connection and try again.");
    const uploaded=await fetch(uploadUrl,{method:"PUT",headers:{"Content-Type":mediaMime(video.url),"Content-Length":String(size),"Content-Range":`bytes 0-${size-1}/${size}`},body:bytes});
    if(!uploaded.ok){console.error("[publishing:TikTok] Video upload failed",{status:uploaded.status,statusText:uploaded.statusText});throw new PublishingError("TikTok could not receive the video. Check the file and try again.")}
    return{externalPostId:publishId};
  }
}

export const adapters:Record<Platform,PublishingAdapter>={[Platform.WEBSITE]:new WebsitePublisher(),[Platform.TELEGRAM]:new TelegramPublisher(),[Platform.INSTAGRAM]:new InstagramPublisher(),[Platform.TIKTOK]:new TikTokPublisher()};
