"use client";

import Link from "next/link";
import { ArrowLeft, Check, CreditCard, LoaderCircle, LocateFixed, MapPin } from "lucide-react";
import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CartNotice, useCart } from "./cart";

const LocationPicker = dynamic(() => import("./location-picker"), { ssr: false, loading: () => <div className="sf-location-map" style={{ height: 260, borderRadius: 12, background: "#eef1ef" }}/> });

type LocationState = {
  status: "idle" | "loading" | "success" | "error" | "outside";
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  adjusted?: boolean;
  message?: string;
};

export function CheckoutForm() {
  const { items, ready, validating, reconcile } = useCart();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const requestId = useRef<string | null>(null);
  const watchRef = useRef<number | null>(null);
  const sampleTimer = useRef<number | null>(null);
  useEffect(() => () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); window.clearTimeout(sampleTimer.current ?? undefined); }, []);
  const currency = items[0]?.currency;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    if (ready) void reconcile();
  }, [ready, reconcile]);

  const applyPosition = useCallback((latitude: number, longitude: number, accuracy: number | undefined, adjusted: boolean) => {
    if (distanceFromAddis(latitude, longitude) > 30) {
      setLocation({ status: "outside", latitude, longitude, accuracy, adjusted, message: "We cannot deliver outside Addis Ababa. If your delivery point is inside the city, drag the pin to it — otherwise please contact us." });
      return;
    }
    const vague = accuracy !== undefined && accuracy > 150;
    setLocation({
      status: "success", latitude, longitude, accuracy, adjusted,
      message: adjusted
        ? "Pin set to the spot you chose."
        : vague
          ? `Your device could only place you within about ${Math.round(accuracy)} m. Drag the pin to your exact gate so the driver finds you.`
          : `Location received${accuracy !== undefined ? ` (accurate to about ${Math.round(accuracy)} m)` : ""}. Drag the pin if it is not exact.`,
    });
  }, []);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocation({ status: "error", message: "This browser cannot share your location. Enter the street, building, or a nearby landmark below." });
      return;
    }
    setLocation({ status: "loading" });
    /* A single fix is the worst one: GPS converges over a few seconds, so sample and keep
       the tightest reading rather than whatever arrives first. */
    let best: GeolocationPosition | null = null;
    const settle = () => {
      window.clearTimeout(sampleTimer.current!);
      if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
      if (best) applyPosition(best.coords.latitude, best.coords.longitude, best.coords.accuracy, false);
    };
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!best || position.coords.accuracy < best.coords.accuracy) best = position;
        if (position.coords.accuracy <= 20) settle();
      },
      (locationError) => {
        if (best) { settle(); return; }
        window.clearTimeout(sampleTimer.current!);
        if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
        const message = locationError.code === locationError.PERMISSION_DENIED
          ? "Location access is turned off. Allow it in your browser settings, or enter the delivery address below."
          : locationError.code === locationError.TIMEOUT
            ? "Finding your location took too long. Try again, or enter the delivery address below."
            : "We could not determine your location. Enter the street, building, or a nearby landmark below.";
        setLocation({ status: "error", message });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
    sampleTimer.current = window.setTimeout(settle, 8000);
  }

  async function placeOrder(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (validating) return;
    if (location.status === "outside") {
      setError("We cannot deliver outside Addis Ababa. Please contact us and we will help.");
      return;
    }
    const form = event.currentTarget.form;
    const email = form?.elements.namedItem("email") as HTMLInputElement | null;
    if (!form?.reportValidity()) return;
    const enteredEmail = email?.value.trim().toLowerCase() || "";
    setError("");
    setPlacing(true);
    const data = new FormData(form);
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId.current,
          items: items.map(({ id, sizeId, quantity }) => ({ id, sizeId, quantity })),
          customer: {
            firstName: data.get("firstName"),
            lastName: data.get("lastName"),
            email: enteredEmail || undefined,
            phone: data.get("phone"),
            address: data.get("address") || undefined,
            deliveryNotes: data.get("deliveryNotes") || undefined,
            latitude: location.status === "success" ? location.latitude : undefined,
            longitude: location.status === "success" ? location.longitude : undefined,
            accuracy: location.status === "success" ? location.accuracy : undefined,
            locationAdjusted: location.status === "success" ? location.adjusted ?? false : undefined,
          },
        }),
      });
      const result = await response.json().catch(() => null) as { orderNumber?: string; error?: string; code?: string } | null;
      if (!response.ok) {
        console.error("Order request failed", { status: response.status, detail: result?.error });
        setError(orderErrorMessage(response.status, result?.code, result?.error));
        if (result?.code && cartRefreshCodes.has(result.code)) await reconcile();
        setPlacing(false);
        return;
      }
      if (!result?.orderNumber) {
        console.error("Successful order response did not include an order number");
        setError("Your order may have been received, but we could not open the confirmation page. Please contact Via Nova before placing it again.");
        setPlacing(false);
        return;
      }
      window.location.href = `/checkout/success?order=${encodeURIComponent(result.orderNumber)}`;
    } catch (value) {
      console.error("Order request could not connect", value);
      setError("We could not connect to place your order. Check your internet connection and try again—your bag is still saved.");
      setPlacing(false);
    }
  }

  if (!ready) return <div className="sf-checkout-empty"><LoaderCircle className="spin"/><h1>Loading your bag…</h1></div>;
  if (!items.length) return <div className="sf-checkout-empty"><CartNotice/><h1>Your bag is empty.</h1><Link className="sf-button sf-button-dark" href="/shop">Return to shop</Link></div>;

  const needsManual = location.status !== "success";
  return <>
    <Link href="/shop" className="sf-back"><ArrowLeft size={16}/> Continue shopping</Link>
    {validating && <p className="sf-cart-checking">Checking current availability…</p>}
    <CartNotice/>
    <div className="sf-checkout-layout">
      <form className="sf-checkout-form">
        <span className="sf-kicker">Secure checkout</span>
        <h1>Delivery recipient</h1>
        <div className="sf-form-row"><label>Recipient first name<input name="firstName" required autoComplete="given-name" onInvalid={(event) => event.currentTarget.setCustomValidity("Enter the recipient’s first name.")} onInput={(event) => event.currentTarget.setCustomValidity("")}/></label><label>Recipient last name<input name="lastName" required autoComplete="family-name" onInvalid={(event) => event.currentTarget.setCustomValidity("Enter the recipient’s last name.")} onInput={(event) => event.currentTarget.setCustomValidity("")}/></label></div>
        <label>Recipient phone<input name="phone" type="tel" required inputMode="numeric" autoComplete="tel" placeholder="09XXXXXXXX" pattern="(?:09|07)[0-9]{8}" minLength={10} maxLength={10} title="Enter exactly 10 digits starting with 09 or 07" onInvalid={(event) => event.currentTarget.setCustomValidity(event.currentTarget.validity.valueMissing ? "Enter the recipient’s phone number." : "Use exactly 10 digits starting with 09 or 07.")} onInput={(event) => { event.currentTarget.setCustomValidity(""); event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 10); }}/></label>
        <small className="sf-field-help">Use 10 digits starting with 09 or 07.</small>
        <label>Email <small>optional</small><input name="email" type="email" autoComplete="email" pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$" title="Enter a valid email address" onInvalid={(event) => event.currentTarget.setCustomValidity("Enter a valid email address.")} onInput={(event) => event.currentTarget.setCustomValidity("")}/></label>

        <div className="sf-form-section"><span className="sf-kicker">Delivery · Addis Ababa only</span><h2>Delivery location</h2></div>
        <div className="sf-location-box"><MapPin/><div><strong>Share your current location</strong><p>Turn on location so we can confirm that your delivery point is within Addis Ababa.</p></div><button type="button" onClick={requestLocation} disabled={location.status === "loading"}>{location.status === "loading" ? <LoaderCircle className="spin"/> : location.status === "success" ? <Check/> : <LocateFixed/>}{location.status === "loading" ? "Locating…" : location.status === "success" ? "Location added" : "Use my location"}</button></div>
        {location.message && <p className={`sf-location-message ${location.status}`} role={location.status === "error" || location.status === "outside" ? "alert" : "status"}>{location.message}</p>}
        {location.status === "outside" && <Link className="sf-button" href="/contact">Contact Via Nova</Link>}
        {location.latitude !== undefined && location.longitude !== undefined && <><LocationPicker latitude={location.latitude} longitude={location.longitude} onChange={(latitude, longitude) => applyPosition(latitude, longitude, undefined, true)}/><small className="sf-field-help">Drag the pin (or tap the map) to mark your exact gate.</small></>}
        <label>Street and delivery address {location.status === "success" && <small>optional when location is shared</small>}<input name="address" required={needsManual} autoComplete="street-address" placeholder="Street, building, house number or nearby landmark" onInvalid={(event) => event.currentTarget.setCustomValidity("Enter the street, building, or a nearby landmark for delivery.")} onInput={(event) => event.currentTarget.setCustomValidity("")}/></label>
        <label>Delivery notes <small>optional</small><textarea name="deliveryNotes" rows={3} placeholder="Floor, gate instructions or preferred delivery time"/></label>

        {error && <p className="sf-payment-error" role="alert" aria-live="assertive">{error}</p>}
        <div className="sf-form-section"><span className="sf-kicker">Payment</span><h2>Online payments</h2></div>
        <div className="sf-payment-options sf-payment-coming"><button type="button" disabled><CreditCard/><span><strong>Chapa</strong><small>Under construction · Coming soon</small></span></button><button type="button" disabled><CreditCard/><span><strong>Stripe</strong><small>Under construction · Coming soon</small></span></button></div>
        <p className="sf-secure">Place the order now. Via Nova will contact the recipient to confirm delivery and payment.</p>
        <button type="button" className="sf-button sf-button-dark sf-place-order" disabled={placing || validating || location.status === "outside"} onClick={placeOrder}>{location.status === "outside" ? "Outside our delivery area" : validating ? <><LoaderCircle className="spin"/> Checking bag…</> : placing ? <><LoaderCircle className="spin"/> Saving order…</> : "Place order"}</button>
      </form>
      <aside className="sf-order-summary"><h2>Order summary</h2>{items.map((item) => <div className="sf-summary-item" key={item.lineId}>{item.image ? <img src={item.image} alt=""/> : <span/>}<div><strong>{item.name}</strong>{item.sizeLabel&&<small>Size {item.sizeLabel}</small>}<small>Quantity {item.quantity}</small></div><b>{money(item.price * item.quantity, item.currency)}</b></div>)}<div className="sf-summary-total"><span>Total</span><strong>{money(total, currency)}</strong></div></aside>
    </div>
  </>;
}

function distanceFromAddis(latitude: number, longitude: number) { const toRad = (value: number) => value * Math.PI / 180; const dLat = toRad(latitude - 9.03), dLon = toRad(longitude - 38.74); const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(9.03)) * Math.cos(toRad(latitude)) * Math.sin(dLon / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }
function money(value: number, currency: string | undefined) { if (!currency) return ""; return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "ETB" ? 0 : 2 }).format(value); }

function orderErrorMessage(status: number, code?: string, detail?: string) {
  if (status === 429) return "Too many order attempts were made. Wait a few minutes, then try again—your bag is still saved.";
  if (status >= 500) return "Ordering is temporarily unavailable. Your bag is saved, so please try again in a few minutes.";
  const safeOrderCodes = new Set(["CART_CHANGED","SIZE_REQUIRED","SIZE_UNAVAILABLE","INSUFFICIENT_STOCK","MIXED_CURRENCIES"]);
  if (code && safeOrderCodes.has(code) && detail) return detail;

  return "We could not place your order. Review the recipient phone, delivery address, and bag, then try again. If it keeps happening, contact Via Nova.";
}

const cartRefreshCodes = new Set(["CART_CHANGED", "SIZE_REQUIRED", "SIZE_UNAVAILABLE", "INSUFFICIENT_STOCK"]);
