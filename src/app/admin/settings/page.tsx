import {db} from "@/lib/db";import {SettingsForm} from "./settings-form";
export const dynamic="force-dynamic";
export default async function Settings(){const settings=await db.storeSettings.upsert({where:{id:"default"},update:{},create:{id:"default"}});return <SettingsForm initial={{storeName:settings.storeName,defaultCurrency:settings.defaultCurrency,timezone:settings.timezone,defaultPlatforms:settings.defaultPlatforms}}/>}
