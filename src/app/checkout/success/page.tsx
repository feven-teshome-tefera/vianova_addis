import { PaymentSuccess } from "@/components/storefront/payment-success";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront/site-chrome";
export const metadata={title:"Order received"};
export default async function SuccessPage({searchParams}:{searchParams:Promise<{order?:string}>}){return <div className="storefront"><StorefrontHeader/><main className="sf-shell"><PaymentSuccess orderNumber={(await searchParams).order}/></main><StorefrontFooter/></div>}
