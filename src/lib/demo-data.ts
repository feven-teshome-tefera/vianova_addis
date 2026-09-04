export type DemoProduct={id:string;name:string;category:string;price:string;stock:number;status:"Published"|"Draft"|"Scheduled"|"Archived";updated:string;emoji:string;platforms:string[]};
export const products:DemoProduct[]=[
{id:"linen-blazer",name:"Italian Linen Blazer",category:"Men's",price:"ETB 8,500.00",stock:12,status:"Published",updated:"8 min ago",emoji:"🧥",platforms:["W","T","I"]},
{id:"silk-dress",name:"Silk Midi Dress",category:"Women's",price:"ETB 9,800.00",stock:8,status:"Published",updated:"2 hours ago",emoji:"👗",platforms:["W","T","I","Tk"]},
{id:"oxford-shirt",name:"Classic Oxford Shirt",category:"Men's",price:"ETB 4,200.00",stock:20,status:"Scheduled",updated:"Yesterday",emoji:"👕",platforms:["W","I"]},
{id:"child-cardigan",name:"Children's Cotton Cardigan",category:"Children",price:"ETB 3,200.00",stock:15,status:"Draft",updated:"Yesterday",emoji:"🧶",platforms:[]},
{id:"leather-bag",name:"Italian Leather Handbag",category:"Accessories",price:"ETB 11,800.00",stock:7,status:"Published",updated:"Aug 21",emoji:"👜",platforms:["W","T"]},
{id:"silk-scarf",name:"Printed Silk Scarf",category:"Accessories",price:"ETB 2,800.00",stock:18,status:"Draft",updated:"Aug 20",emoji:"🧣",platforms:[]},
];
export const publicationRows=[
{product:"Italian Linen Blazer",website:"Published",telegram:"Published",instagram:"Failed",tiktok:"—"},
{product:"Silk Midi Dress",website:"Published",telegram:"Processing",instagram:"Published",tiktok:"Scheduled"},
{product:"Classic Oxford Shirt",website:"Scheduled",telegram:"—",instagram:"Scheduled",tiktok:"—"},
];
