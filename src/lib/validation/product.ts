import {z} from "zod";

const numeric=(message:string)=>z.any().transform(value=>typeof value==="string"&&!value.trim()?Number.NaN:Number(value)).pipe(z.number(message));
const sizeSchema=z.object({
  label:z.string().trim().min(1,"Enter a size label.").max(30,"Keep the size label under 30 characters."),
  stock:numeric("Enter the available quantity for this size.").pipe(z.number().int("Enter a whole-number quantity.").min(0,"Size quantity cannot be negative.")),
});
const sizesSchema=z.array(sizeSchema).max(30,"A product can have at most 30 sizes.").superRefine((sizes,context)=>{
  const seen=new Set<string>();
  sizes.forEach((size,index)=>{const normalized=size.label.toLocaleUpperCase();if(seen.has(normalized))context.addIssue({code:"custom",path:[index,"label"],message:"This size is already listed. Enter each size once."});seen.add(normalized)});
});

export const productSchema=z.object({
  name:z.string().trim().min(1,"Enter a product name."),
  description:z.string().trim().min(1,"Enter a product description."),
  shortDescription:z.string().max(280,"Keep the short description under 280 characters.").optional(),
  categoryId:z.string().min(1,"Choose a category."),
  sku:z.string().optional(),
  price:numeric("Enter a valid price.").pipe(z.number().min(0,"Price cannot be negative.")),
  currency:z.enum(["ETB","USD"]),
  stock:numeric("Enter the available stock quantity.").pipe(z.number().int("Enter a whole-number stock quantity.").min(0,"Stock quantity cannot be negative.")),
  sizes:sizesSchema,
  availability:z.enum(["IN_STOCK","OUT_OF_STOCK"]),
  platforms:z.array(z.enum(["WEBSITE","TELEGRAM","INSTAGRAM","TIKTOK"])).min(1,"Choose at least one publishing destination."),
  platformContent:z.array(z.object({
    platform:z.enum(["TELEGRAM","INSTAGRAM","TIKTOK"]),
    caption:z.string().optional(),
    hashtags:z.string().optional(),
    ctaText:z.string().optional(),
    ctaUrl:z.union([z.literal(""),z.string().url("Enter a complete link beginning with http:// or https://.")]).optional(),
  })).optional(),
});

export type ProductInput=z.infer<typeof productSchema>;
export const publishSchema=z.object({platforms:z.array(z.enum(["website","telegram","instagram","tiktok"])).min(1,"Choose at least one publishing destination.")});
export const scheduleSchema=publishSchema.extend({scheduledAt:z.string().datetime()});
