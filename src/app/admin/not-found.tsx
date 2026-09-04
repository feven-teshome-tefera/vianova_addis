import Link from "next/link";

export default function AdminNotFound() {
  return <div className="card p-8 text-center">
    <h1 className="page-title">This admin record could not be found.</h1>
    <p className="muted mx-auto my-3 max-w-xl text-sm">It may have been removed or changed in another browser window. Return to the dashboard and choose an existing product or order.</p>
    <div className="mt-5 flex justify-center gap-2">
      <Link className="btn btn-primary" href="/admin">Return to dashboard</Link>
      <Link className="btn" href="/admin/products">View products</Link>
      <Link className="btn" href="/admin/orders">View orders</Link>
    </div>
  </div>;
}
