import {db} from "@/lib/db";import {MediaClient} from "./media-client";
export const dynamic="force-dynamic";
export default async function Media(){const media=await db.productMedia.findMany({include:{product:{select:{name:true}}},orderBy:{createdAt:"desc"}});return <MediaClient media={media.map(m=>({id:m.id,file:m.filename??m.url.split("/").at(-1)??"Media",product:m.product.name,type:m.type==="IMAGE"?"Image":"Video",date:new Intl.DateTimeFormat("en",{dateStyle:"medium"}).format(m.createdAt),url:m.url}))}/>}
