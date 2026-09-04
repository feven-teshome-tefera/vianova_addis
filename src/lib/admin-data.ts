import type {ProductRow} from "@/components/admin/common";

export function productRow(product:{id:string;name:string;sku:string|null;price:{toString():string}|number|string;currency:string;stock:number;status:string;updatedAt:Date;category:{name:string};media:{url:string}[];publications:{platform:string;status:string}[]}):ProductRow{
  const latest=new Map<string,string>();
  for(const publication of product.publications)if(!latest.has(publication.platform))latest.set(publication.platform,publication.status);
  return{id:product.id,name:product.name,sku:product.sku,category:product.category.name,price:new Intl.NumberFormat("en",{style:"currency",currency:product.currency}).format(Number(product.price)),stock:product.stock,status:title(product.status),updated:formatDate(product.updatedAt),mediaUrl:product.media[0]?.url??null,platforms:[...latest.keys()].map(title)};
}
export function title(value:string){return value.toLowerCase().replaceAll("_"," ").replace(/^./,x=>x.toUpperCase())}
export function formatDate(value:Date|null){return value?new Intl.DateTimeFormat("en",{dateStyle:"medium",timeStyle:"short"}).format(value):"—"}
