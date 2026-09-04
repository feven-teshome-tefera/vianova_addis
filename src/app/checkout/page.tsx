import { CheckoutForm } from "@/components/storefront/checkout-form-v2";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront/site-chrome";
export const metadata={title:"Checkout"};
export default function CheckoutPage(){return <div className="storefront"><StorefrontHeader/><main className="sf-shell sf-checkout"><CheckoutForm/></main><StorefrontFooter/></div>}
