export function GET() {
  return new Response(null, {
    status: 307,
    headers: { Location: "/admin/settings/nodes", "Cache-Control": "no-store" },
  });
}
