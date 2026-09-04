import type {Platform} from "@prisma/client";
export type PublishableProduct={id:string;name:string;description:string;shortDescription:string|null;price:unknown;currency:string;stock?:number;availability?:string;media:{type:string;url:string}[]};
export type Content={caption?:string|null;hashtags?:string|null;ctaText?:string|null;ctaUrl?:string|null};
export type PublishResult={externalPostId:string;externalUrl?:string};
export interface PublishingAdapter{platform:Platform;publish(product:PublishableProduct,content:Content):Promise<PublishResult>}
